-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S4 BIG
-- Exams + Financial Lock + Results + Report Cards + Class Teacher Cycle
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Arabic Primary Grade 1-3 Class Teacher Cycle
create table if not exists public.school_class_teacher_cycles (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.school_teachers(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  cohort_key text not null,
  started_academic_year_id uuid not null references public.school_academic_years(id) on delete restrict,
  current_academic_year_id uuid not null references public.school_academic_years(id) on delete restrict,
  current_grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  current_class_section_id uuid references public.school_class_sections(id) on delete set null,
  cycle_year integer not null default 1 check(cycle_year between 1 and 3),
  status text not null default 'active' check(status in('active','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(teacher_id,cohort_key)
);

-- 2) Exam periods
create table if not exists public.school_exam_periods (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  name_ar text not null,
  name_en text,
  exam_type text not null check(exam_type in('monthly','midterm','final')),
  term_no integer not null default 1 check(term_no between 1 and 3),
  starts_on date not null,
  ends_on date not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_on>=starts_on)
);

-- 3) Exams by class/subject
create table if not exists public.school_exams (
  id uuid primary key default gen_random_uuid(),
  exam_period_id uuid not null references public.school_exam_periods(id) on delete cascade,
  class_section_id uuid not null references public.school_class_sections(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete restrict,
  teacher_id uuid references public.school_teachers(id) on delete set null,
  title text not null,
  exam_date date not null,
  starts_at time,
  duration_minutes integer not null default 60 check(duration_minutes>0),
  max_score numeric(8,2) not null default 100 check(max_score>0),
  pass_score numeric(8,2) not null default 50 check(pass_score>=0),
  financial_lock boolean not null default true,
  is_published boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_period_id,class_section_id,subject_id)
);

-- 4) Financial exam access snapshot
create table if not exists public.school_exam_access (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  eligible boolean not null,
  reason text not null,
  outstanding numeric(12,2) not null default 0,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null,
  unique(exam_id,enrollment_id)
);

-- 5) Marks / Gradebook
create table if not exists public.school_exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  score numeric(8,2),
  status text not null default 'pending' check(status in('pending','present','absent','excused','withheld')),
  teacher_note text,
  entered_by uuid references auth.users(id) on delete set null,
  entered_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_id,enrollment_id)
);

-- 6) Term report cards
create table if not exists public.school_report_cards (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  term_no integer not null check(term_no between 1 and 3),
  average_score numeric(8,2),
  total_score numeric(10,2),
  max_total_score numeric(10,2),
  result_status text not null default 'draft' check(result_status in('draft','pass','fail','withheld')),
  rank_in_class integer,
  attendance_present integer not null default 0,
  attendance_absent integer not null default 0,
  teacher_comment text,
  principal_comment text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id,academic_year_id,term_no)
);

-- 7) Completion certificates
create table if not exists public.school_certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  certificate_no text not null unique,
  certificate_type text not null default 'completion',
  issued_on date not null default current_date,
  title_ar text not null,
  title_en text,
  notes text,
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.school_exam_refresh_access(p_exam_id uuid)
returns integer
language plpgsql security definer set search_path=public
as $$
declare e record; x jsonb; n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  for e in
    select en.id enrollment_id, ex.exam_date, ex.financial_lock
    from public.school_exams ex
    join public.school_enrollments en on en.class_section_id=ex.class_section_id and en.status='active'
    where ex.id=p_exam_id
  loop
    if not e.financial_lock then
      x=jsonb_build_object('eligible',true,'reason','financial_lock_disabled','outstanding',0);
    else
      x=public.school_financial_exam_eligible(e.enrollment_id,e.exam_date);
    end if;
    insert into public.school_exam_access(exam_id,enrollment_id,eligible,reason,outstanding,checked_by,checked_at)
    values(p_exam_id,e.enrollment_id,(x->>'eligible')::boolean,x->>'reason',coalesce((x->>'outstanding')::numeric,0),auth.uid(),now())
    on conflict(exam_id,enrollment_id) do update
      set eligible=excluded.eligible,reason=excluded.reason,outstanding=excluded.outstanding,
          checked_by=excluded.checked_by,checked_at=excluded.checked_at;
    n=n+1;
  end loop;
  return n;
end $$;
grant execute on function public.school_exam_refresh_access(uuid) to authenticated;

create or replace function public.school_exam_seed_results(p_exam_id uuid)
returns integer
language plpgsql security definer set search_path=public
as $$
declare n integer;
begin
  if not public.is_school_admin() and not exists(
    select 1 from public.school_exams ex
    where ex.id=p_exam_id and public.school_teacher_can_manage(ex.class_section_id,ex.subject_id)
  ) then raise exception 'Teacher or School Admin required'; end if;

  insert into public.school_exam_results(exam_id,enrollment_id,status)
  select ex.id,en.id,
    case when coalesce(a.eligible,true) then 'pending' else 'withheld' end
  from public.school_exams ex
  join public.school_enrollments en on en.class_section_id=ex.class_section_id and en.status='active'
  left join public.school_exam_access a on a.exam_id=ex.id and a.enrollment_id=en.id
  where ex.id=p_exam_id
  on conflict(exam_id,enrollment_id) do nothing;
  get diagnostics n=row_count;
  return n;
end $$;
grant execute on function public.school_exam_seed_results(uuid) to authenticated;

create or replace function public.school_save_exam_result(
  p_exam_id uuid,p_enrollment_id uuid,p_score numeric,p_status text,p_teacher_note text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare ex public.school_exams%rowtype; rid uuid; allowed boolean;
begin
  select * into ex from public.school_exams where id=p_exam_id;
  if not found then raise exception 'Exam not found'; end if;
  allowed:=public.is_school_admin() or public.school_teacher_can_manage(ex.class_section_id,ex.subject_id);
  if not allowed then raise exception 'Not allowed'; end if;

  if p_status='present' and (p_score is null or p_score<0 or p_score>ex.max_score) then
    raise exception 'Score must be between 0 and exam max score';
  end if;

  insert into public.school_exam_results(exam_id,enrollment_id,score,status,teacher_note,entered_by,entered_at)
  values(p_exam_id,p_enrollment_id,p_score,p_status,nullif(trim(coalesce(p_teacher_note,'')),''),auth.uid(),now())
  on conflict(exam_id,enrollment_id) do update
    set score=excluded.score,status=excluded.status,teacher_note=excluded.teacher_note,
        entered_by=excluded.entered_by,entered_at=excluded.entered_at,updated_at=now()
  returning id into rid;
  return rid;
end $$;
grant execute on function public.school_save_exam_result(uuid,uuid,numeric,text,text) to authenticated;

create or replace function public.school_build_report_card(p_enrollment_id uuid,p_term_no integer)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare en public.school_enrollments%rowtype; rid uuid; avg_score numeric; total numeric; maxt numeric; pres integer; absn integer;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  select * into en from public.school_enrollments where id=p_enrollment_id;
  if not found then raise exception 'Enrollment not found'; end if;

  select round(avg((r.score/ex.max_score)*100),2),sum(r.score),sum(ex.max_score)
  into avg_score,total,maxt
  from public.school_exam_results r
  join public.school_exams ex on ex.id=r.exam_id
  join public.school_exam_periods ep on ep.id=ex.exam_period_id
  where r.enrollment_id=en.id and ep.academic_year_id=en.academic_year_id
    and ep.term_no=p_term_no and r.status='present';

  select count(*) filter(where ar.status='present'),count(*) filter(where ar.status='absent')
  into pres,absn
  from public.school_attendance_records ar
  join public.school_attendance_sessions ses on ses.id=ar.session_id
  where ar.enrollment_id=en.id;

  insert into public.school_report_cards(
    enrollment_id,academic_year_id,term_no,average_score,total_score,max_total_score,
    result_status,attendance_present,attendance_absent
  ) values(
    en.id,en.academic_year_id,p_term_no,avg_score,total,maxt,
    case when avg_score is null then 'draft' when avg_score>=50 then 'pass' else 'fail' end,
    coalesce(pres,0),coalesce(absn,0)
  )
  on conflict(enrollment_id,academic_year_id,term_no) do update
    set average_score=excluded.average_score,total_score=excluded.total_score,
        max_total_score=excluded.max_total_score,result_status=excluded.result_status,
        attendance_present=excluded.attendance_present,attendance_absent=excluded.attendance_absent,updated_at=now()
  returning id into rid;
  return rid;
end $$;
grant execute on function public.school_build_report_card(uuid,integer) to authenticated;

create or replace function public.school_s4_health()
returns jsonb language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
  'exam_periods',(select count(*) from school_exam_periods),
  'exams',(select count(*) from school_exams),
  'results',(select count(*) from school_exam_results),
  'report_cards',(select count(*) from school_report_cards),
  'class_teacher_cycles',(select count(*) from school_class_teacher_cycles)
 );
$$;
grant execute on function public.school_s4_health() to authenticated;

-- RLS
alter table public.school_class_teacher_cycles enable row level security;
alter table public.school_exam_periods enable row level security;
alter table public.school_exams enable row level security;
alter table public.school_exam_access enable row level security;
alter table public.school_exam_results enable row level security;
alter table public.school_report_cards enable row level security;
alter table public.school_certificates enable row level security;

do $$
declare t text;
begin
 foreach t in array array[
  'school_class_teacher_cycles','school_exam_periods','school_exams','school_exam_access',
  'school_exam_results','school_report_cards','school_certificates'
 ] loop
  execute format('drop policy if exists %I on public.%I',t||'_admin_all',t);
  execute format('create policy %I on public.%I for all to authenticated using(public.is_school_admin()) with check(public.is_school_admin())',t||'_admin_all',t);
 end loop;
end $$;

-- Student/parent published results
drop policy if exists school_exam_results_student_read on public.school_exam_results;
create policy school_exam_results_student_read on public.school_exam_results for select to authenticated
using(
 enrollment_id in(select id from school_enrollments where student_id=public.current_school_student_id())
 and published_at is not null
);

drop policy if exists school_report_cards_student_read on public.school_report_cards;
create policy school_report_cards_student_read on public.school_report_cards for select to authenticated
using(
 enrollment_id in(select id from school_enrollments where student_id=public.current_school_student_id())
 and is_published=true
);

drop policy if exists school_report_cards_parent_read on public.school_report_cards;
create policy school_report_cards_parent_read on public.school_report_cards for select to authenticated
using(
 enrollment_id in(
  select e.id from school_enrollments e join school_parent_students ps on ps.student_id=e.student_id
  where ps.parent_id=public.current_school_parent_id()
 ) and is_published=true
);

select public.school_s4_health();
