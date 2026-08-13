-- ============================================================
-- BASMAT ALNAWABIGH ACADEMY — SPRINT 4
-- Student Profile + Exams + Certificates + Course Completion
-- Safe additive migration; does not delete existing students/payments/courses.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Safe admin checker (reuse/replace)
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and lower(trim(coalesce(role,''))) = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 1) Student profile fields
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now();

-- Keep existing non-recursive profile policies from Sprint 3R.
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Profile avatars bucket
insert into storage.buckets (id, name, public)
values ('profile-avatars','profile-avatars',true)
on conflict (id) do update set public = true;

drop policy if exists "profile avatar upload own" on storage.objects;
drop policy if exists "profile avatar update own" on storage.objects;
drop policy if exists "profile avatar delete own" on storage.objects;

create policy "profile avatar upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile avatar update own"
on storage.objects for update to authenticated
using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "profile avatar delete own"
on storage.objects for delete to authenticated
using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- ------------------------------------------------------------
-- 2) Exams
-- ------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts > 0),
  is_final boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exams_course on public.exams(course_id);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  points numeric(10,2) not null default 1 check (points > 0),
  order_number integer not null default 1,
  created_at timestamptz not null default now(),
  constraint exam_question_options_array check (jsonb_typeof(options) = 'array')
);
create index if not exists idx_exam_questions_exam on public.exam_questions(exam_id,order_number);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(6,2) not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_exam_attempts_exam_user on public.exam_attempts(exam_id,user_id);

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;

drop policy if exists "exams_student_read" on public.exams;
drop policy if exists "exams_admin_all" on public.exams;
create policy "exams_student_read"
on public.exams for select to authenticated
using (
  public.is_admin()
  or (
    is_published = true
    and exists (
      select 1 from public.enrollments e
      where e.course_id = exams.course_id
        and e.user_id = auth.uid()
        and e.status <> 'cancelled'
    )
  )
);
create policy "exams_admin_all"
on public.exams for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exam_questions_admin_all" on public.exam_questions;
create policy "exam_questions_admin_all"
on public.exam_questions for all to authenticated
using (public.is_admin()) with check (public.is_admin());
-- No student SELECT policy on exam_questions: correct answers remain server-side.

drop policy if exists "exam_attempts_read_own_or_admin" on public.exam_attempts;
create policy "exam_attempts_read_own_or_admin"
on public.exam_attempts for select to authenticated
using (user_id = auth.uid() or public.is_admin());
-- Attempts are inserted only by submit_exam_attempt RPC.

-- Student-safe exam payload (no correct answers)
create or replace function public.get_exam_for_student(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam public.exams%rowtype;
  v_attempts integer;
  v_questions jsonb;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;

  select * into v_exam from public.exams where id = p_exam_id;
  if not found or not v_exam.is_published then raise exception 'Exam not available'; end if;

  if not exists (
    select 1 from public.enrollments e
    where e.user_id=auth.uid() and e.course_id=v_exam.course_id and e.status<>'cancelled'
  ) then raise exception 'Enrollment required'; end if;

  select count(*) into v_attempts
  from public.exam_attempts
  where exam_id=p_exam_id and user_id=auth.uid();

  if v_attempts >= v_exam.max_attempts then raise exception 'Maximum attempts reached'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'question_text', q.question_text,
    'options', q.options,
    'points', q.points,
    'order_number', q.order_number
  ) order by q.order_number), '[]'::jsonb)
  into v_questions
  from public.exam_questions q
  where q.exam_id=p_exam_id;

  return jsonb_build_object(
    'id', v_exam.id,
    'course_id', v_exam.course_id,
    'title', v_exam.title,
    'description', v_exam.description,
    'passing_score', v_exam.passing_score,
    'max_attempts', v_exam.max_attempts,
    'attempts_used', v_attempts,
    'remaining_attempts', greatest(v_exam.max_attempts-v_attempts,0),
    'questions', v_questions
  );
end;
$$;
revoke all on function public.get_exam_for_student(uuid) from public;
grant execute on function public.get_exam_for_student(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) Certificates
-- ------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  verification_code text not null unique,
  issued_at timestamptz not null default now(),
  unique(user_id,course_id)
);
create index if not exists idx_certificates_user on public.certificates(user_id);
create index if not exists idx_certificates_course on public.certificates(course_id);

alter table public.certificates enable row level security;
drop policy if exists "certificates_read_own_or_admin" on public.certificates;
create policy "certificates_read_own_or_admin"
on public.certificates for select to authenticated
using (user_id=auth.uid() or public.is_admin());
-- Certificate creation only through RPC.

create or replace function public.issue_certificate_if_eligible(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_enrollment public.enrollments%rowtype;
  v_final_exam_count integer;
  v_final_passed boolean;
  v_cert public.certificates%rowtype;
  v_number text;
  v_verify text;
begin
  if v_user is null then raise exception 'Login required'; end if;

  select * into v_enrollment
  from public.enrollments
  where user_id=v_user and course_id=p_course_id and status<>'cancelled'
  limit 1;
  if not found then raise exception 'Enrollment required'; end if;

  if coalesce(v_enrollment.progress,0) < 100 then
    return jsonb_build_object('eligible',false,'reason','course_not_complete');
  end if;

  select count(*) into v_final_exam_count
  from public.exams
  where course_id=p_course_id and is_final=true and is_published=true;

  if v_final_exam_count > 0 then
    select exists (
      select 1 from public.exam_attempts a
      join public.exams e on e.id=a.exam_id
      where a.user_id=v_user and e.course_id=p_course_id
        and e.is_final=true and e.is_published=true and a.passed=true
    ) into v_final_passed;
    if not v_final_passed then
      return jsonb_build_object('eligible',false,'reason','final_exam_not_passed');
    end if;
  end if;

  select * into v_cert from public.certificates
  where user_id=v_user and course_id=p_course_id;
  if found then
    return jsonb_build_object('eligible',true,'issued',false,'certificate_id',v_cert.id);
  end if;

  v_number := 'BNA-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_verify := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

  insert into public.certificates(user_id,course_id,certificate_number,verification_code)
  values(v_user,p_course_id,v_number,v_verify)
  returning * into v_cert;

  return jsonb_build_object('eligible',true,'issued',true,'certificate_id',v_cert.id);
end;
$$;
revoke all on function public.issue_certificate_if_eligible(uuid) from public;
grant execute on function public.issue_certificate_if_eligible(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Secure exam submission + scoring
-- ------------------------------------------------------------
create or replace function public.submit_exam_attempt(p_exam_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_attempt_count integer;
  v_total numeric := 0;
  v_earned numeric := 0;
  v_score numeric(6,2) := 0;
  v_passed boolean := false;
  q record;
  v_selected text;
  v_attempt_id uuid;
  v_certificate jsonb;
begin
  if v_user is null then raise exception 'Login required'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Invalid answers'; end if;

  select * into v_exam from public.exams where id=p_exam_id for share;
  if not found or not v_exam.is_published then raise exception 'Exam not available'; end if;

  if not exists (
    select 1 from public.enrollments e
    where e.user_id=v_user and e.course_id=v_exam.course_id and e.status<>'cancelled'
  ) then raise exception 'Enrollment required'; end if;

  select count(*) into v_attempt_count from public.exam_attempts
  where exam_id=p_exam_id and user_id=v_user;
  if v_attempt_count >= v_exam.max_attempts then raise exception 'Maximum attempts reached'; end if;

  for q in select id,correct_answer,points from public.exam_questions where exam_id=p_exam_id loop
    v_total := v_total + q.points;
    v_selected := p_answers ->> q.id::text;
    if v_selected is not null and v_selected = q.correct_answer then
      v_earned := v_earned + q.points;
    end if;
  end loop;

  if v_total > 0 then v_score := round((v_earned/v_total)*100,2); end if;
  v_passed := v_score >= v_exam.passing_score;

  insert into public.exam_attempts(exam_id,user_id,score,passed,answers)
  values(p_exam_id,v_user,v_score,v_passed,p_answers)
  returning id into v_attempt_id;

  if v_passed then
    begin
      v_certificate := public.issue_certificate_if_eligible(v_exam.course_id);
    exception when others then
      v_certificate := null;
    end;
  end if;

  return jsonb_build_object(
    'attempt_id',v_attempt_id,
    'exam_id',v_exam.id,
    'course_id',v_exam.course_id,
    'score',v_score,
    'passed',v_passed,
    'passing_score',v_exam.passing_score,
    'attempt_number',v_attempt_count+1,
    'max_attempts',v_exam.max_attempts,
    'certificate',v_certificate
  );
end;
$$;
revoke all on function public.submit_exam_attempt(uuid,jsonb) from public;
grant execute on function public.submit_exam_attempt(uuid,jsonb) to authenticated;

-- ------------------------------------------------------------
-- 5) Admin certificates read helper policies are already via is_admin()
-- ------------------------------------------------------------

-- Ensure notifications exists for certificate issuance (compatible with Sprint 3R)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  related_payment_id uuid references public.payments(id) on delete set null,
  related_course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Optional notification on certificate issuance
create or replace function public.notify_certificate_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if to_regclass('public.notifications') is not null then
    insert into public.notifications(user_id,title,message,type,related_course_id)
    values(new.user_id,'تم إصدار شهادتك','تم إصدار شهادة إتمام الدورة وأصبحت متاحة في صفحة شهاداتي.','certificate_issued',new.course_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_certificate_created on public.certificates;
create trigger trg_notify_certificate_created
after insert on public.certificates
for each row execute procedure public.notify_certificate_created();
