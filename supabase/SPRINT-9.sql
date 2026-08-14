-- ============================================================
-- SPRINT 9 — PROFESSIONAL ACADEMY FINAL LAYER
-- Instructor Dashboard + Q&A + Notes/Bookmarks + Advanced Exams
-- Coupons (bank transfer) + Advanced Analytics
-- Safe additive migration.
-- ============================================================

-- ---------- Instructor account link ----------
alter table public.instructors
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create or replace function public.is_course_instructor(p_course_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1
    from public.courses c
    join public.instructors i on i.id=c.instructor_id
    where c.id=p_course_id and i.user_id=auth.uid()
  );
$$;
grant execute on function public.is_course_instructor(uuid) to authenticated;

-- Instructor can read own linked course enrollments/reviews/questions later via RPCs.
create or replace function public.instructor_dashboard_data()
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_instructor uuid; v jsonb;
begin
  select id into v_instructor from instructors where user_id=auth.uid() and is_active=true limit 1;
  if v_instructor is null then raise exception 'Instructor account not linked'; end if;

  select jsonb_build_object(
    'instructor', (select to_jsonb(i) from instructors i where i.id=v_instructor),
    'courses', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select c.id,c.title,c.image,c.course_type,c.price,c.status,
        (select count(*) from enrollments e where e.course_id=c.id and coalesce(e.status,'active')<>'cancelled') as enrollments_count,
        (select count(*) from course_reviews r where r.course_id=c.id and r.is_published=true) as reviews_count,
        (select coalesce(avg(r.rating),0) from course_reviews r where r.course_id=c.id and r.is_published=true) as rating_average,
        (select count(*) from course_questions q where q.course_id=c.id and q.status='open') as open_questions
      from courses c where c.instructor_id=v_instructor
    ) x),'[]'::jsonb),
    'recent_questions', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select q.id,q.course_id,q.user_id,q.title,q.body,q.status,q.created_at,c.title as course_title,
             coalesce(p.full_name,p.email,'Student') as student_name
      from course_questions q
      join courses c on c.id=q.course_id
      left join profiles p on p.id=q.user_id
      where c.instructor_id=v_instructor
      order by q.created_at desc limit 20
    ) x),'[]'::jsonb)
  ) into v;
  return v;
end $$;
grant execute on function public.instructor_dashboard_data() to authenticated;

-- ---------- Course Q&A ----------
create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'open' check(status in('open','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_course_questions_course on public.course_questions(course_id,created_at desc);

create table if not exists public.course_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.course_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_course_answers_question on public.course_answers(question_id,created_at);

alter table public.course_questions enable row level security;
alter table public.course_answers enable row level security;

drop policy if exists "course_questions_read" on public.course_questions;
drop policy if exists "course_questions_insert" on public.course_questions;
drop policy if exists "course_questions_update_own_or_staff" on public.course_questions;
create policy "course_questions_read"
on public.course_questions for select to authenticated
using (
  public.is_admin()
  or public.is_course_instructor(course_id)
  or exists(select 1 from enrollments e where e.user_id=auth.uid() and e.course_id=course_questions.course_id and coalesce(e.status,'active')<>'cancelled')
);
create policy "course_questions_insert"
on public.course_questions for insert to authenticated
with check (
  user_id=auth.uid()
  and exists(select 1 from enrollments e where e.user_id=auth.uid() and e.course_id=course_questions.course_id and coalesce(e.status,'active')<>'cancelled')
);
create policy "course_questions_update_own_or_staff"
on public.course_questions for update to authenticated
using (user_id=auth.uid() or public.is_admin() or public.is_course_instructor(course_id))
with check (user_id=auth.uid() or public.is_admin() or public.is_course_instructor(course_id));

drop policy if exists "course_answers_read" on public.course_answers;
drop policy if exists "course_answers_insert" on public.course_answers;
create policy "course_answers_read"
on public.course_answers for select to authenticated
using (
  exists(
    select 1 from course_questions q
    where q.id=question_id and (
      public.is_admin()
      or public.is_course_instructor(q.course_id)
      or exists(select 1 from enrollments e where e.user_id=auth.uid() and e.course_id=q.course_id and coalesce(e.status,'active')<>'cancelled')
    )
  )
);
create policy "course_answers_insert"
on public.course_answers for insert to authenticated
with check (
  user_id=auth.uid()
  and exists(
    select 1 from course_questions q
    where q.id=question_id and (
      public.is_admin()
      or public.is_course_instructor(q.course_id)
      or exists(select 1 from enrollments e where e.user_id=auth.uid() and e.course_id=q.course_id and coalesce(e.status,'active')<>'cancelled')
    )
  )
);

create or replace function public.add_course_answer(p_question_id uuid,p_body text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare q course_questions%rowtype; v_id uuid; v_staff boolean;
begin
  select * into q from course_questions where id=p_question_id;
  if not found then raise exception 'Question not found'; end if;
  v_staff := public.is_admin() or public.is_course_instructor(q.course_id);
  if not v_staff and not exists(select 1 from enrollments e where e.user_id=auth.uid() and e.course_id=q.course_id and coalesce(e.status,'active')<>'cancelled') then
    raise exception 'Enrollment required';
  end if;
  insert into course_answers(question_id,user_id,body,is_instructor)
  values(p_question_id,auth.uid(),trim(p_body),v_staff)
  returning id into v_id;
  if v_staff then update course_questions set status='answered',updated_at=now() where id=p_question_id; end if;
  return v_id;
end $$;
grant execute on function public.add_course_answer(uuid,text) to authenticated;

-- ---------- Notes + Bookmarks ----------
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  note_text text not null,
  timestamp_seconds integer check(timestamp_seconds is null or timestamp_seconds>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lesson_notes_user_lesson on lesson_notes(user_id,lesson_id,created_at desc);

create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  timestamp_seconds integer check(timestamp_seconds is null or timestamp_seconds>=0),
  created_at timestamptz not null default now(),
  unique(user_id,lesson_id,timestamp_seconds)
);

alter table lesson_notes enable row level security;
alter table lesson_bookmarks enable row level security;
drop policy if exists "lesson_notes_own" on lesson_notes;
create policy "lesson_notes_own" on lesson_notes for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "lesson_bookmarks_own" on lesson_bookmarks;
create policy "lesson_bookmarks_own" on lesson_bookmarks for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

-- ---------- Advanced Exams ----------
alter table public.exams
  add column if not exists duration_minutes integer,
  add column if not exists randomize_questions boolean not null default false,
  add column if not exists show_answers_after_submit boolean not null default true;

-- Keep get_exam_for_student behavior compatible while adding settings.
-- Existing RPC may already exist; add helper for advanced settings only.
create or replace function public.get_exam_settings(p_exam_id uuid)
returns jsonb language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
   'duration_minutes',duration_minutes,
   'randomize_questions',randomize_questions,
   'show_answers_after_submit',show_answers_after_submit
 )
 from exams where id=p_exam_id;
$$;
grant execute on function public.get_exam_settings(uuid) to authenticated;

create or replace function public.get_attempt_review(p_exam_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a exam_attempts%rowtype; result jsonb;
begin
 select * into a from exam_attempts
 where exam_id=p_exam_id and user_id=auth.uid()
 order by submitted_at desc limit 1;
 if not found then return null; end if;
 if not exists(select 1 from exams where id=p_exam_id and show_answers_after_submit=true) then return null; end if;
 select jsonb_build_object(
   'score',a.score,'passed',a.passed,'submitted_at',a.submitted_at,
   'questions',coalesce(jsonb_agg(jsonb_build_object(
     'id',q.id,'question_text',q.question_text,
     'selected_answer',a.answers->>q.id::text,
     'correct_answer',q.correct_answer,
     'correct',(a.answers->>q.id::text)=q.correct_answer
   ) order by q.order_number),'[]'::jsonb)
 ) into result
 from exam_questions q where q.exam_id=p_exam_id;
 return result;
end $$;
grant execute on function public.get_attempt_review(uuid) to authenticated;

-- ---------- Coupons ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check(discount_type in('percent','fixed')),
  discount_value numeric(10,2) not null check(discount_value>0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.coupon_courses (
  coupon_id uuid not null references coupons(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  primary key(coupon_id,course_id)
);
alter table coupons enable row level security;
alter table coupon_courses enable row level security;
drop policy if exists "coupons_admin_all" on coupons;
create policy "coupons_admin_all" on coupons for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "coupon_courses_admin_all" on coupon_courses;
create policy "coupon_courses_admin_all" on coupon_courses for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.validate_coupon(p_code text,p_course_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare c coupons%rowtype; price numeric; discount numeric; final_amount numeric;
begin
 select * into c from coupons where upper(trim(code))=upper(trim(p_code)) and is_active=true;
 if not found then return jsonb_build_object('valid',false,'message','Invalid coupon'); end if;
 if c.starts_at is not null and now()<c.starts_at then return jsonb_build_object('valid',false,'message','Coupon not started'); end if;
 if c.ends_at is not null and now()>c.ends_at then return jsonb_build_object('valid',false,'message','Coupon expired'); end if;
 if c.max_uses is not null and c.used_count>=c.max_uses then return jsonb_build_object('valid',false,'message','Coupon limit reached'); end if;
 if exists(select 1 from coupon_courses where coupon_id=c.id)
    and not exists(select 1 from coupon_courses where coupon_id=c.id and course_id=p_course_id) then
   return jsonb_build_object('valid',false,'message','Coupon not valid for this course');
 end if;
 select coalesce(price,0) into price from courses where id=p_course_id;
 discount:=case when c.discount_type='percent' then round(price*least(c.discount_value,100)/100,2) else least(c.discount_value,price) end;
 final_amount:=greatest(price-discount,0);
 if final_amount<=0 then return jsonb_build_object('valid',false,'message','Coupon cannot reduce a paid course to zero'); end if;
 return jsonb_build_object('valid',true,'coupon_id',c.id,'code',c.code,'original_amount',price,'discount_amount',discount,'final_amount',final_amount);
end $$;
grant execute on function public.validate_coupon(text,uuid) to anon,authenticated;

alter table public.payments
  add column if not exists coupon_id uuid references coupons(id),
  add column if not exists original_amount numeric(10,2),
  add column if not exists discount_amount numeric(10,2) not null default 0;

-- Replace bank-transfer insert policy to permit a validated coupon amount.
drop policy if exists "payments_insert_own_bank_transfer" on public.payments;
create policy "payments_insert_own_bank_transfer"
on public.payments for insert to authenticated
with check (
  user_id=auth.uid() and method='bank_transfer' and status='pending' and currency='SAR' and amount>0
  and (
    (coupon_id is null and amount=(select coalesce(c.price,0) from courses c where c.id=payments.course_id))
    or
    (coupon_id is not null and amount=(
      select greatest(coalesce(crs.price,0) -
        case when cp.discount_type='percent'
          then round(coalesce(crs.price,0)*least(cp.discount_value,100)/100,2)
          else least(cp.discount_value,coalesce(crs.price,0)) end,0)
      from coupons cp join courses crs on crs.id=payments.course_id
      where cp.id=payments.coupon_id and cp.is_active=true
        and (cp.starts_at is null or now()>=cp.starts_at)
        and (cp.ends_at is null or now()<=cp.ends_at)
        and (cp.max_uses is null or cp.used_count<cp.max_uses)
        and (not exists(select 1 from coupon_courses cc where cc.coupon_id=cp.id)
             or exists(select 1 from coupon_courses cc where cc.coupon_id=cp.id and cc.course_id=payments.course_id))
    ))
  )
);

-- Increment coupon usage when bank payment is approved first time.
create or replace function public.consume_coupon_on_paid_payment()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.status='paid' and old.status is distinct from 'paid' and new.coupon_id is not null then
   update coupons set used_count=used_count+1 where id=new.coupon_id;
 end if;
 return new;
end $$;
drop trigger if exists trg_consume_coupon_on_paid_payment on public.payments;
create trigger trg_consume_coupon_on_paid_payment
after update of status on public.payments
for each row execute function public.consume_coupon_on_paid_payment();

-- ---------- Analytics ----------
create or replace function public.admin_advanced_analytics()
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 select jsonb_build_object(
  'students',(select count(*) from profiles where lower(trim(coalesce(role,'student'))) <> 'admin'),
  'courses',(select count(*) from courses),
  'enrollments',(select count(*) from enrollments where coalesce(status,'active')<>'cancelled'),
  'certificates',(select count(*) from certificates),
  'revenue',(select coalesce(sum(amount),0) from payments where status='paid'),
  'completion_rate',(
    select coalesce(round(100.0*count(*) filter(where coalesce(progress,0)>=100)/nullif(count(*),0),1),0)
    from enrollments where coalesce(status,'active')<>'cancelled'
  ),
  'course_metrics',coalesce((select jsonb_agg(to_jsonb(x)) from (
    select c.id,c.title,
      count(distinct e.id) as enrollments,
      coalesce(round(avg(e.progress)::numeric,1),0) as avg_progress,
      count(distinct cert.id) as certificates,
      coalesce(round(avg(r.rating)::numeric,1),0) as rating,
      count(distinct r.id) as reviews,
      coalesce(sum(pay.amount) filter(where pay.status='paid'),0) as revenue
    from courses c
    left join enrollments e on e.course_id=c.id and coalesce(e.status,'active')<>'cancelled'
    left join certificates cert on cert.course_id=c.id
    left join course_reviews r on r.course_id=c.id and r.is_published=true
    left join payments pay on pay.course_id=c.id
    group by c.id,c.title order by enrollments desc
  ) x),'[]'::jsonb)
 ) into v;
 return v;
end $$;
grant execute on function public.admin_advanced_analytics() to authenticated;
