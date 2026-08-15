-- ============================================================
-- SCHOOL SPRINT S3 BIG
-- Nawabigh Aljazeera School
-- Teachers + Subject Allocation + Timetable + Attendance
-- + Assignments + Teacher Portal + Student/Parent Portal Foundation
-- ============================================================

-- ------------------------------------------------------------
-- 0) FINAL SCHOOL ADMIN FOUNDATION
-- ------------------------------------------------------------
alter table public.profiles
add column if not exists school_role text;

create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles
    where id=auth.uid()
      and (
        lower(trim(coalesce(role,'')))='admin'
        or lower(trim(coalesce(school_role,'')))='school_admin'
      )
  );
$$;

grant execute on function public.is_school_admin() to authenticated;

-- Formalize current shared-admin setup:
update public.profiles
set school_role='school_admin'
where lower(trim(coalesce(role,'')))='admin'
  and lower(trim(coalesce(school_role,''))) is distinct from 'school_admin';


-- ------------------------------------------------------------
-- 1) SCHOOL TEACHERS
-- ------------------------------------------------------------
create table if not exists public.school_teachers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  employee_no text unique,
  full_name_ar text not null,
  full_name_en text,
  gender text check(gender in('male','female')),
  phone text,
  email text,
  qualification text,
  specialization text,
  hire_date date default current_date,
  status text not null default 'active'
    check(status in('active','inactive','on_leave','terminated')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.school_teacher_no_seq start 1001;

create or replace function public.school_set_teacher_no()
returns trigger
language plpgsql
as $$
begin
  if new.employee_no is null or trim(new.employee_no)='' then
    new.employee_no := 'TCH-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_teacher_no_seq')::text,5,'0');
  end if;
  return new;
end $$;

drop trigger if exists trg_school_set_teacher_no on public.school_teachers;
create trigger trg_school_set_teacher_no
before insert on public.school_teachers
for each row execute function public.school_set_teacher_no();

-- ------------------------------------------------------------
-- 2) SUBJECT ALLOCATION
-- teacher + year + grade + curriculum + subject + optional class
-- ------------------------------------------------------------
create table if not exists public.school_teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.school_teachers(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  subject_id uuid not null references public.school_subjects(id) on delete restrict,
  class_section_id uuid references public.school_class_sections(id) on delete cascade,
  is_primary_teacher boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(teacher_id,academic_year_id,grade_level_id,curriculum_id,subject_id,class_section_id)
);

-- ------------------------------------------------------------
-- 3) TIMETABLE
-- ------------------------------------------------------------
create table if not exists public.school_timetable (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  class_section_id uuid not null references public.school_class_sections(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete restrict,
  teacher_id uuid not null references public.school_teachers(id) on delete restrict,
  weekday integer not null check(weekday between 0 and 6),
  period_no integer not null check(period_no > 0),
  starts_at time not null,
  ends_at time not null,
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at > starts_at),
  unique(academic_year_id,class_section_id,weekday,period_no)
);

-- ------------------------------------------------------------
-- 4) ATTENDANCE
-- ------------------------------------------------------------
create table if not exists public.school_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  class_section_id uuid not null references public.school_class_sections(id) on delete cascade,
  subject_id uuid references public.school_subjects(id) on delete set null,
  teacher_id uuid references public.school_teachers(id) on delete set null,
  attendance_date date not null default current_date,
  period_no integer,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(class_section_id,attendance_date,period_no,subject_id)
);

create table if not exists public.school_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.school_attendance_sessions(id) on delete cascade,
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  status text not null default 'present'
    check(status in('present','absent','late','excused')),
  note text,
  marked_at timestamptz not null default now(),
  unique(session_id,enrollment_id)
);

-- ------------------------------------------------------------
-- 5) ASSIGNMENTS / HOMEWORK
-- ------------------------------------------------------------
create table if not exists public.school_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  class_section_id uuid not null references public.school_class_sections(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete restrict,
  teacher_id uuid not null references public.school_teachers(id) on delete restrict,
  title text not null,
  description text,
  due_at timestamptz,
  max_score numeric(7,2) not null default 10 check(max_score >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.school_assignments(id) on delete cascade,
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  submission_text text,
  attachment_url text,
  submitted_at timestamptz not null default now(),
  score numeric(7,2),
  teacher_feedback text,
  graded_at timestamptz,
  graded_by uuid references auth.users(id) on delete set null,
  unique(assignment_id,enrollment_id)
);

-- ------------------------------------------------------------
-- 6) ROLE HELPERS
-- ------------------------------------------------------------
create or replace function public.current_school_teacher_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id
  from public.school_teachers
  where auth_user_id=auth.uid()
    and status='active'
  limit 1;
$$;

grant execute on function public.current_school_teacher_id() to authenticated;

create or replace function public.is_school_teacher()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.current_school_teacher_id() is not null;
$$;

grant execute on function public.is_school_teacher() to authenticated;

create or replace function public.current_school_student_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id
  from public.school_students
  where auth_user_id=auth.uid()
    and status='active'
  limit 1;
$$;

grant execute on function public.current_school_student_id() to authenticated;

create or replace function public.current_school_parent_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id
  from public.school_parents
  where auth_user_id=auth.uid()
    and is_active=true
  limit 1;
$$;

grant execute on function public.current_school_parent_id() to authenticated;

-- ------------------------------------------------------------
-- 7) TEACHER PERMISSION HELPERS
-- ------------------------------------------------------------
create or replace function public.school_teacher_can_manage_class(
  p_class_section_id uuid,
  p_subject_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_school_admin()
  or exists(
    select 1
    from public.school_teacher_assignments ta
    join public.school_class_sections cs on cs.id=p_class_section_id
    where ta.teacher_id=public.current_school_teacher_id()
      and ta.is_active=true
      and (
        ta.class_section_id=p_class_section_id
        or (
          ta.class_section_id is null
          and ta.grade_level_id=cs.grade_level_id
          and ta.curriculum_id=cs.curriculum_id
        )
      )
      and (p_subject_id is null or ta.subject_id=p_subject_id)
  );
$$;

grant execute on function public.school_teacher_can_manage_class(uuid,uuid) to authenticated;

-- ------------------------------------------------------------
-- 8) ATTENDANCE RPC
-- Creates session then upserts all records received as JSON:
-- [{enrollment_id,status,note}]
-- ------------------------------------------------------------
create or replace function public.school_save_attendance(
  p_class_section_id uuid,
  p_subject_id uuid,
  p_attendance_date date,
  p_period_no integer,
  p_notes text,
  p_records jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session_id uuid;
  v_year_id uuid;
  v_teacher_id uuid;
  r jsonb;
begin
  if not public.school_teacher_can_manage_class(p_class_section_id,p_subject_id) then
    raise exception 'Teacher/Admin permission required';
  end if;

  select academic_year_id into v_year_id
  from public.school_class_sections
  where id=p_class_section_id;

  v_teacher_id := public.current_school_teacher_id();

  insert into public.school_attendance_sessions(
    academic_year_id,class_section_id,subject_id,teacher_id,
    attendance_date,period_no,notes,created_by
  )
  values(
    v_year_id,p_class_section_id,p_subject_id,v_teacher_id,
    p_attendance_date,p_period_no,nullif(trim(coalesce(p_notes,'')),''),
    auth.uid()
  )
  on conflict(class_section_id,attendance_date,period_no,subject_id)
  do update set
    teacher_id=excluded.teacher_id,
    notes=excluded.notes
  returning id into v_session_id;

  for r in select * from jsonb_array_elements(coalesce(p_records,'[]'::jsonb))
  loop
    insert into public.school_attendance_records(
      session_id,enrollment_id,status,note
    )
    values(
      v_session_id,
      (r->>'enrollment_id')::uuid,
      coalesce(r->>'status','present'),
      nullif(trim(coalesce(r->>'note','')),'')
    )
    on conflict(session_id,enrollment_id)
    do update set
      status=excluded.status,
      note=excluded.note,
      marked_at=now();
  end loop;

  return v_session_id;
end $$;

grant execute on function public.school_save_attendance(uuid,uuid,date,integer,text,jsonb) to authenticated;

-- ------------------------------------------------------------
-- 9) PORTAL VIEWS/RPCS
-- ------------------------------------------------------------

-- Teacher dashboard data
create or replace function public.school_teacher_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare tid uuid;
begin
  tid:=public.current_school_teacher_id();
  if tid is null and not public.is_school_admin() then
    raise exception 'Teacher access required';
  end if;

  return jsonb_build_object(
    'teacher_id',tid,
    'assignments',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select ta.id,ta.class_section_id,ta.subject_id,
               s.name_ar as subject_name_ar,s.name_en as subject_name_en,
               c.section_name,g.name_ar as grade_name_ar,g.name_en as grade_name_en,
               cu.name_ar as curriculum_name_ar,cu.name_en as curriculum_name_en
        from school_teacher_assignments ta
        join school_subjects s on s.id=ta.subject_id
        left join school_class_sections c on c.id=ta.class_section_id
        join school_grade_levels g on g.id=ta.grade_level_id
        join school_curricula cu on cu.id=ta.curriculum_id
        where ta.is_active=true
          and (tid is null or ta.teacher_id=tid)
        order by g.sort_order,s.name_en
      ) x
    ),'[]'::jsonb),
    'upcoming_homework',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select a.id,a.title,a.due_at,a.class_section_id,a.subject_id,
               s.name_ar as subject_name_ar,s.name_en as subject_name_en,
               c.section_name
        from school_assignments a
        join school_subjects s on s.id=a.subject_id
        join school_class_sections c on c.id=a.class_section_id
        where a.is_published=true
          and (tid is null or a.teacher_id=tid)
          and (a.due_at is null or a.due_at>=now())
        order by a.due_at nulls last
        limit 20
      ) x
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_teacher_dashboard() to authenticated;

-- Student portal foundation
create or replace function public.school_student_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare sid uuid; eid uuid;
begin
  sid:=public.current_school_student_id();
  if sid is null then raise exception 'Student access required'; end if;

  select id into eid
  from school_enrollments
  where student_id=sid and status='active'
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'student_id',sid,
    'enrollment_id',eid,
    'attendance',coalesce((
      select jsonb_build_object(
        'present',count(*) filter(where ar.status='present'),
        'absent',count(*) filter(where ar.status='absent'),
        'late',count(*) filter(where ar.status='late'),
        'excused',count(*) filter(where ar.status='excused')
      )
      from school_attendance_records ar
      where ar.enrollment_id=eid
    ),'{}'::jsonb),
    'homework',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select a.id,a.title,a.description,a.due_at,a.max_score,
               s.name_ar as subject_name_ar,s.name_en as subject_name_en,
               sub.submitted_at,sub.score,sub.teacher_feedback
        from school_assignments a
        join school_enrollments e on e.id=eid and e.class_section_id=a.class_section_id
        join school_subjects s on s.id=a.subject_id
        left join school_assignment_submissions sub
          on sub.assignment_id=a.id and sub.enrollment_id=eid
        where a.is_published=true
        order by a.due_at nulls last
      ) x
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_student_dashboard() to authenticated;

-- Parent dashboard foundation
create or replace function public.school_parent_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare pid uuid;
begin
  pid:=public.current_school_parent_id();
  if pid is null then raise exception 'Parent access required'; end if;

  return jsonb_build_object(
    'parent_id',pid,
    'children',coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select st.id as student_id,st.student_no,st.full_name_ar,st.full_name_en,
               e.id as enrollment_id,e.status as enrollment_status,
               g.name_ar as grade_name_ar,g.name_en as grade_name_en,
               cu.name_ar as curriculum_name_ar,cu.name_en as curriculum_name_en,
               cs.section_name,
               coalesce((select sum(greatest(i.amount-i.paid_amount,0))
                         from school_installments i
                         where i.enrollment_id=e.id
                           and i.status not in('paid','waived')),0) as outstanding_fees
        from school_parent_students ps
        join school_students st on st.id=ps.student_id
        left join school_enrollments e on e.student_id=st.id and e.status='active'
        left join school_grade_levels g on g.id=e.grade_level_id
        left join school_curricula cu on cu.id=e.curriculum_id
        left join school_class_sections cs on cs.id=e.class_section_id
        where ps.parent_id=pid
        order by st.full_name_ar
      ) x
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_parent_dashboard() to authenticated;

-- ------------------------------------------------------------
-- 10) RLS
-- ------------------------------------------------------------
alter table public.school_teachers enable row level security;
alter table public.school_teacher_assignments enable row level security;
alter table public.school_timetable enable row level security;
alter table public.school_attendance_sessions enable row level security;
alter table public.school_attendance_records enable row level security;
alter table public.school_assignments enable row level security;
alter table public.school_assignment_submissions enable row level security;

-- School Admin full control for S3 tables.
do $$
declare t text;
begin
  foreach t in array array[
    'school_teachers','school_teacher_assignments','school_timetable',
    'school_attendance_sessions','school_attendance_records',
    'school_assignments','school_assignment_submissions'
  ] loop
    execute format('drop policy if exists %I on public.%I',t||'_school_admin_all',t);
    execute format(
      'create policy %I on public.%I for all to authenticated
       using(public.is_school_admin()) with check(public.is_school_admin())',
       t||'_school_admin_all',t
    );
  end loop;
end $$;

-- Teacher own profile read.
drop policy if exists school_teachers_self_read on public.school_teachers;
create policy school_teachers_self_read
on public.school_teachers for select to authenticated
using(auth_user_id=auth.uid());

-- Teacher assignment read.
drop policy if exists school_teacher_assignments_teacher_read on public.school_teacher_assignments;
create policy school_teacher_assignments_teacher_read
on public.school_teacher_assignments for select to authenticated
using(teacher_id=public.current_school_teacher_id());

-- Timetable: teachers can read their timetable; students/parents via class.
drop policy if exists school_timetable_authenticated_read on public.school_timetable;
create policy school_timetable_authenticated_read
on public.school_timetable for select to authenticated
using(
  public.is_school_admin()
  or teacher_id=public.current_school_teacher_id()
  or class_section_id in (
    select e.class_section_id
    from school_enrollments e
    where e.student_id=public.current_school_student_id()
      and e.status='active'
  )
  or class_section_id in (
    select e.class_section_id
    from school_enrollments e
    join school_parent_students ps on ps.student_id=e.student_id
    where ps.parent_id=public.current_school_parent_id()
      and e.status='active'
  )
);

-- Attendance sessions/records:
drop policy if exists school_attendance_sessions_teacher_read on public.school_attendance_sessions;
create policy school_attendance_sessions_teacher_read
on public.school_attendance_sessions for select to authenticated
using(
  teacher_id=public.current_school_teacher_id()
  or public.is_school_admin()
  or public.school_teacher_can_manage_class(class_section_id,subject_id)
);

drop policy if exists school_attendance_records_student_parent_read on public.school_attendance_records;
create policy school_attendance_records_student_parent_read
on public.school_attendance_records for select to authenticated
using(
  public.is_school_admin()
  or enrollment_id in (
    select e.id from school_enrollments e
    where e.student_id=public.current_school_student_id()
  )
  or enrollment_id in (
    select e.id
    from school_enrollments e
    join school_parent_students ps on ps.student_id=e.student_id
    where ps.parent_id=public.current_school_parent_id()
  )
  or exists(
    select 1
    from school_attendance_sessions s
    where s.id=session_id
      and public.school_teacher_can_manage_class(s.class_section_id,s.subject_id)
  )
);

-- Assignments readable by class users; teachers can manage via admin RPC/UI policies.
drop policy if exists school_assignments_authenticated_read on public.school_assignments;
create policy school_assignments_authenticated_read
on public.school_assignments for select to authenticated
using(
  public.is_school_admin()
  or teacher_id=public.current_school_teacher_id()
  or class_section_id in (
    select e.class_section_id
    from school_enrollments e
    where e.student_id=public.current_school_student_id()
      and e.status='active'
  )
  or class_section_id in (
    select e.class_section_id
    from school_enrollments e
    join school_parent_students ps on ps.student_id=e.student_id
    where ps.parent_id=public.current_school_parent_id()
      and e.status='active'
  )
);

drop policy if exists school_assignments_teacher_manage on public.school_assignments;
create policy school_assignments_teacher_manage
on public.school_assignments for all to authenticated
using(
  public.is_school_admin()
  or (
    teacher_id=public.current_school_teacher_id()
    and public.school_teacher_can_manage_class(class_section_id,subject_id)
  )
)
with check(
  public.is_school_admin()
  or (
    teacher_id=public.current_school_teacher_id()
    and public.school_teacher_can_manage_class(class_section_id,subject_id)
  )
);

drop policy if exists school_assignment_submissions_own_read on public.school_assignment_submissions;
create policy school_assignment_submissions_own_read
on public.school_assignment_submissions for select to authenticated
using(
  public.is_school_admin()
  or enrollment_id in (
    select e.id from school_enrollments e
    where e.student_id=public.current_school_student_id()
  )
  or enrollment_id in (
    select e.id
    from school_enrollments e
    join school_parent_students ps on ps.student_id=e.student_id
    where ps.parent_id=public.current_school_parent_id()
  )
  or exists(
    select 1 from school_assignments a
    where a.id=assignment_id
      and a.teacher_id=public.current_school_teacher_id()
  )
);

drop policy if exists school_assignment_submissions_student_insert on public.school_assignment_submissions;
create policy school_assignment_submissions_student_insert
on public.school_assignment_submissions for insert to authenticated
with check(
  enrollment_id in (
    select e.id from school_enrollments e
    where e.student_id=public.current_school_student_id()
      and e.status='active'
  )
);

drop policy if exists school_assignment_submissions_teacher_update on public.school_assignment_submissions;
create policy school_assignment_submissions_teacher_update
on public.school_assignment_submissions for update to authenticated
using(
  public.is_school_admin()
  or exists(
    select 1 from school_assignments a
    where a.id=assignment_id
      and a.teacher_id=public.current_school_teacher_id()
  )
)
with check(
  public.is_school_admin()
  or exists(
    select 1 from school_assignments a
    where a.id=assignment_id
      and a.teacher_id=public.current_school_teacher_id()
  )
);

-- ------------------------------------------------------------
-- 11) S3 HEALTH
-- ------------------------------------------------------------
create or replace function public.school_s3_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'teachers',(select count(*) from school_teachers where status='active'),
  'teacher_assignments',(select count(*) from school_teacher_assignments where is_active),
  'timetable_entries',(select count(*) from school_timetable where is_active),
  'attendance_sessions',(select count(*) from school_attendance_sessions),
  'attendance_records',(select count(*) from school_attendance_records),
  'assignments',(select count(*) from school_assignments where is_published),
  'submissions',(select count(*) from school_assignment_submissions)
);
$$;

grant execute on function public.school_s3_health() to authenticated;
