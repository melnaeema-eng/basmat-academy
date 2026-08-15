-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S15 BIG
-- CORE SECURITY + PERMISSIONS + HEALTH CONSOLIDATION
-- ============================================================
-- This sprint intentionally consolidates the security model.
-- It does not remove valid multi-role users (e.g. Parent + Teacher).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) CANONICAL AUTH/ROLE HELPERS
-- ------------------------------------------------------------

create or replace function public.current_school_teacher_id()
returns uuid
language sql stable security definer
set search_path=public
as $$
  select id
  from school_teachers
  where auth_user_id=auth.uid()
    and status='active'
  order by created_at
  limit 1;
$$;

create or replace function public.current_school_student_id()
returns uuid
language sql stable security definer
set search_path=public
as $$
  select id
  from school_students
  where auth_user_id=auth.uid()
    and status='active'
  order by created_at
  limit 1;
$$;

create or replace function public.current_school_parent_id()
returns uuid
language sql stable security definer
set search_path=public
as $$
  select id
  from school_parents
  where auth_user_id=auth.uid()
    and is_active=true
  order by created_at
  limit 1;
$$;

create or replace function public.current_school_employee_id()
returns uuid
language sql stable security definer
set search_path=public
as $$
  select id
  from school_employees
  where auth_user_id=auth.uid()
    and status='active'
  order by created_at
  limit 1;
$$;

grant execute on function public.current_school_teacher_id() to authenticated;
grant execute on function public.current_school_student_id() to authenticated;
grant execute on function public.current_school_parent_id() to authenticated;
grant execute on function public.current_school_employee_id() to authenticated;

create or replace function public.is_school_teacher()
returns boolean
language sql stable security definer
set search_path=public
as $$ select public.current_school_teacher_id() is not null; $$;

create or replace function public.is_school_student()
returns boolean
language sql stable security definer
set search_path=public
as $$ select public.current_school_student_id() is not null; $$;

create or replace function public.is_school_parent()
returns boolean
language sql stable security definer
set search_path=public
as $$ select public.current_school_parent_id() is not null; $$;

create or replace function public.is_school_employee()
returns boolean
language sql stable security definer
set search_path=public
as $$ select public.current_school_employee_id() is not null; $$;

grant execute on function public.is_school_teacher() to authenticated;
grant execute on function public.is_school_student() to authenticated;
grant execute on function public.is_school_parent() to authenticated;
grant execute on function public.is_school_employee() to authenticated;

-- ------------------------------------------------------------
-- 2) MULTI-ROLE MAP (MULTI-ROLE IS VALID)
-- ------------------------------------------------------------

drop function if exists public.school_my_roles();

create function public.school_my_roles()
returns text[]
language sql stable security definer
set search_path=public
as $$
  select array_remove(array[
    case when public.is_school_admin() then 'school_admin' end,
    case when public.is_school_teacher() then 'teacher' end,
    case when public.is_school_parent() then 'parent' end,
    case when public.is_school_student() then 'student' end,
    case when public.is_school_employee() then 'employee' end
  ],null);
$$;

grant execute on function public.school_my_roles() to authenticated;

create or replace function public.school_has_role(p_role text)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select lower(trim(p_role))=any(public.school_my_roles());
$$;

grant execute on function public.school_has_role(text) to authenticated;

-- ------------------------------------------------------------
-- 3) CANONICAL TEACHER AUTHORIZATION
-- ------------------------------------------------------------

create or replace function public.school_teacher_can_manage_class(
  p_class_section_id uuid,
  p_subject_id uuid default null
)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select public.is_school_admin()
  or exists(
    select 1
    from school_teacher_assignments ta
    join school_class_sections cs on cs.id=p_class_section_id
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

-- Official compatibility name used by existing S4/S9/S14 code.
-- Both names intentionally resolve to ONE canonical authorization function.
create or replace function public.school_teacher_can_manage(
  p_class_section_id uuid,
  p_subject_id uuid default null
)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select public.school_teacher_can_manage_class(p_class_section_id,p_subject_id);
$$;

grant execute on function public.school_teacher_can_manage(uuid,uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) STUDENT ACCESS AUTHORIZATION
-- ------------------------------------------------------------

create or replace function public.school_can_access_student(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select
    public.is_school_admin()
    or p_student_id=public.current_school_student_id()
    or exists(
      select 1
      from school_parent_students ps
      where ps.parent_id=public.current_school_parent_id()
        and ps.student_id=p_student_id
    )
    or exists(
      select 1
      from school_enrollments e
      where e.student_id=p_student_id
        and e.status='active'
        and public.school_teacher_can_manage_class(e.class_section_id,null)
    );
$$;

grant execute on function public.school_can_access_student(uuid) to authenticated;

create or replace function public.school_can_access_enrollment(p_enrollment_id uuid)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select exists(
    select 1
    from school_enrollments e
    where e.id=p_enrollment_id
      and public.school_can_access_student(e.student_id)
  );
$$;

grant execute on function public.school_can_access_enrollment(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) AUTOMATIC AUTH LINKING — CONSOLIDATED
-- ------------------------------------------------------------

create or replace function public.school_auth_user_id_by_email(p_email text)
returns uuid
language sql stable security definer
set search_path=public,auth
as $$
  select u.id
  from auth.users u
  where nullif(trim(coalesce(p_email,'')),'') is not null
    and lower(trim(u.email))=lower(trim(p_email))
  order by u.created_at
  limit 1;
$$;

grant execute on function public.school_auth_user_id_by_email(text) to authenticated;

create or replace function public.school_auto_link_auth_user()
returns trigger
language plpgsql security definer
set search_path=public,auth
as $$
declare resolved_id uuid;
begin
  if nullif(trim(coalesce(new.email,'')),'') is null then
    return new;
  end if;

  resolved_id:=public.school_auth_user_id_by_email(new.email);
  if resolved_id is not null then
    new.auth_user_id:=resolved_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_school_students_auto_auth on school_students;
create trigger trg_school_students_auto_auth
before insert or update of email on school_students
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_parents_auto_auth on school_parents;
create trigger trg_school_parents_auto_auth
before insert or update of email on school_parents
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_teachers_auto_auth on school_teachers;
create trigger trg_school_teachers_auto_auth
before insert or update of email on school_teachers
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_employees_auto_auth on school_employees;
create trigger trg_school_employees_auto_auth
before insert or update of email on school_employees
for each row execute function public.school_auto_link_auth_user();

-- Repair existing matching records once.
update school_students s
set auth_user_id=u.id,updated_at=now()
from auth.users u
where s.auth_user_id is null
  and s.email is not null
  and lower(trim(s.email))=lower(trim(u.email));

update school_parents p
set auth_user_id=u.id,updated_at=now()
from auth.users u
where p.auth_user_id is null
  and p.email is not null
  and lower(trim(p.email))=lower(trim(u.email));

update school_teachers t
set auth_user_id=u.id,updated_at=now()
from auth.users u
where t.auth_user_id is null
  and t.email is not null
  and lower(trim(t.email))=lower(trim(u.email));

update school_employees e
set auth_user_id=u.id,updated_at=now()
from auth.users u
where e.auth_user_id is null
  and e.email is not null
  and lower(trim(e.email))=lower(trim(u.email));

-- ------------------------------------------------------------
-- 6) ROLE-AWARE CONFLICT DIAGNOSTICS
-- ------------------------------------------------------------

drop function if exists public.school_s14_1_health();
drop function if exists public.school_s14_2_health();
drop function if exists public.school_auth_link_conflicts();

create function public.school_auth_link_conflicts()
returns table(
  auth_user_id uuid,
  auth_email text,
  entity_type text,
  linked_records bigint,
  linked_entities jsonb
)
language sql stable security definer
set search_path=public,auth
as $$
  with links as (
    select s.auth_user_id,'student'::text entity_type,s.id entity_id,s.full_name_ar entity_name
    from school_students s where s.auth_user_id is not null
    union all
    select p.auth_user_id,'parent',p.id,p.full_name
    from school_parents p where p.auth_user_id is not null
    union all
    select t.auth_user_id,'teacher',t.id,t.full_name_ar
    from school_teachers t where t.auth_user_id is not null
    union all
    select e.auth_user_id,'employee',e.id,e.full_name_ar
    from school_employees e where e.auth_user_id is not null
  )
  select
    l.auth_user_id,u.email,l.entity_type,count(*)::bigint,
    jsonb_agg(jsonb_build_object(
      'entity_id',l.entity_id,
      'entity_name',l.entity_name
    ) order by l.entity_name)
  from links l
  join auth.users u on u.id=l.auth_user_id
  group by l.auth_user_id,u.email,l.entity_type
  having count(*)>1
  order by u.email,l.entity_type;
$$;

grant execute on function public.school_auth_link_conflicts() to authenticated;

create or replace function public.school_unlinked_accounts()
returns table(
  entity_type text,
  entity_id uuid,
  display_name text,
  email text,
  status text,
  auth_user_exists boolean
)
language sql stable security definer
set search_path=public,auth
as $$
  with unlinked as (
    select 'student'::text entity_type,s.id entity_id,s.full_name_ar display_name,
           s.email,s.status::text status,
           exists(select 1 from auth.users u where s.email is not null and lower(trim(u.email))=lower(trim(s.email))) auth_user_exists
    from school_students s
    where s.auth_user_id is null and s.status='active'

    union all

    select 'parent',p.id,p.full_name,p.email,
           case when p.is_active then 'active' else 'inactive' end,
           exists(select 1 from auth.users u where p.email is not null and lower(trim(u.email))=lower(trim(p.email)))
    from school_parents p
    where p.auth_user_id is null and p.is_active=true

    union all

    select 'teacher',t.id,t.full_name_ar,t.email,t.status::text,
           exists(select 1 from auth.users u where t.email is not null and lower(trim(u.email))=lower(trim(t.email)))
    from school_teachers t
    where t.auth_user_id is null and t.status='active'

    union all

    select 'employee',e.id,e.full_name_ar,e.email,e.status::text,
           exists(select 1 from auth.users u where e.email is not null and lower(trim(u.email))=lower(trim(e.email)))
    from school_employees e
    where e.auth_user_id is null and e.status='active'
  )
  select * from unlinked
  order by entity_type,display_name;
$$;

grant execute on function public.school_unlinked_accounts() to authenticated;

-- ------------------------------------------------------------
-- 7) SECURITY AUDIT / HEALTH CHECK
-- ------------------------------------------------------------

create table if not exists public.school_security_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.school_security_audit_log enable row level security;

drop policy if exists school_security_audit_admin_read on school_security_audit_log;
create policy school_security_audit_admin_read
on school_security_audit_log for select to authenticated
using(public.is_school_admin());

drop policy if exists school_security_audit_admin_insert on school_security_audit_log;
create policy school_security_audit_admin_insert
on school_security_audit_log for insert to authenticated
with check(public.is_school_admin());

create or replace function public.school_security_health()
returns jsonb
language plpgsql stable security definer
set search_path=public,auth
as $$
declare
  v_missing_functions integer:=0;
  v_rls_disabled integer:=0;
begin
  select count(*) into v_missing_functions
  from (
    values
      ('is_school_admin'),
      ('current_school_teacher_id'),
      ('current_school_student_id'),
      ('current_school_parent_id'),
      ('current_school_employee_id'),
      ('school_teacher_can_manage_class'),
      ('school_teacher_can_manage'),
      ('school_can_access_student'),
      ('school_can_access_enrollment')
  ) required(name)
  where not exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname=required.name
  );

  select count(*) into v_rls_disabled
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and c.relname like 'school_%'
    and c.relrowsecurity=false
    and c.relname not in('school_security_audit_log');

  return jsonb_build_object(
    'status',case
      when v_missing_functions=0
       and (select count(*) from public.school_auth_link_conflicts())=0
       and (select count(*) from school_teachers where status='active' and auth_user_id is null)=0
      then 'OK'
      else 'CHECK'
    end,
    'missing_core_functions',v_missing_functions,
    'same_role_auth_conflicts',(select count(*) from public.school_auth_link_conflicts()),
    'active_teachers_unlinked',(select count(*) from school_teachers where status='active' and auth_user_id is null),
    'active_parents_unlinked',(select count(*) from school_parents where is_active=true and auth_user_id is null),
    'active_students_without_login',(select count(*) from school_students where status='active' and auth_user_id is null),
    'active_employees_unlinked',(select count(*) from school_employees where status='active' and auth_user_id is null),
    'teachers_without_assignments',(
      select count(*)
      from school_teachers t
      where t.status='active'
        and not exists(
          select 1 from school_teacher_assignments ta
          where ta.teacher_id=t.id and ta.is_active=true
        )
    ),
    'active_enrollments_without_class',(
      select count(*)
      from school_enrollments
      where status='active' and class_section_id is null
    ),
    'school_tables_rls_disabled',v_rls_disabled
  );
end $$;

grant execute on function public.school_security_health() to authenticated;

create or replace function public.school_security_diagnostics()
returns jsonb
language plpgsql stable security definer
set search_path=public,auth
as $$
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  return jsonb_build_object(
    'health',public.school_security_health(),
    'my_roles',public.school_my_roles(),
    'unlinked_accounts',coalesce((select jsonb_agg(to_jsonb(x)) from public.school_unlinked_accounts() x),'[]'::jsonb),
    'same_role_conflicts',coalesce((select jsonb_agg(to_jsonb(x)) from public.school_auth_link_conflicts() x),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_security_diagnostics() to authenticated;

-- ------------------------------------------------------------
-- 8) S15 HEALTH
-- ------------------------------------------------------------

create or replace function public.school_s15_health()
returns jsonb
language sql stable security definer
set search_path=public
as $$
  select jsonb_build_object(
    'security',public.school_security_health(),
    'teacher_function_test',public.school_teacher_can_manage(null::uuid,null::uuid),
    'multi_role_supported',true
  );
$$;

grant execute on function public.school_s15_health() to authenticated;

select public.school_s15_health();
