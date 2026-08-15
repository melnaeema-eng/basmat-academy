-- SCHOOL ACCESS CONTROL FINAL
-- Additive RBAC layer; does not replace existing parent/student/teacher identity tables.

create table if not exists public.school_staff_roles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in(
    'school_admin','finance','hr','admissions','student_affairs','employee'
  )),
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique(auth_user_id,role)
);

alter table public.school_staff_roles enable row level security;

create or replace function public.school_has_role(p_role text)
returns boolean
language sql stable security definer
set search_path=public,auth
as $$
select
  case p_role
    when 'student' then exists(select 1 from school_students s where s.auth_user_id=auth.uid() and s.status='active')
    when 'parent' then exists(select 1 from school_parents p where p.auth_user_id=auth.uid() and p.is_active=true)
    when 'teacher' then exists(select 1 from school_teachers t where t.auth_user_id=auth.uid() and t.status='active')
    else exists(
      select 1 from school_staff_roles r
      where r.auth_user_id=auth.uid() and r.role=p_role and r.is_active=true
    )
  end
$$;

grant execute on function public.school_has_role(text) to authenticated;

create or replace function public.school_my_roles()
returns text[]
language sql stable security definer
set search_path=public,auth
as $$
select coalesce(array_agg(distinct x.role order by x.role),'{}'::text[])
from (
  select r.role from school_staff_roles r
   where r.auth_user_id=auth.uid() and r.is_active=true
  union all
  select 'student' where exists(select 1 from school_students s where s.auth_user_id=auth.uid() and s.status='active')
  union all
  select 'parent' where exists(select 1 from school_parents p where p.auth_user_id=auth.uid() and p.is_active=true)
  union all
  select 'teacher' where exists(select 1 from school_teachers t where t.auth_user_id=auth.uid() and t.status='active')
) x
$$;
grant execute on function public.school_my_roles() to authenticated;

create or replace function public.school_role_home(p_role text)
returns text
language sql immutable
as $$
select case p_role
 when 'school_admin' then '/school/admin'
 when 'finance' then '/school/admin/finance'
 when 'hr' then '/school/admin/hr-center'
 when 'admissions' then '/school/admin/admissions'
 when 'student_affairs' then '/school/admin/student-affairs'
 when 'teacher' then '/school/teacher'
 when 'parent' then '/school/parent'
 when 'student' then '/school/student'
 when 'employee' then '/school/employee'
 else '/school/login'
end
$$;
grant execute on function public.school_role_home(text) to authenticated;

create or replace function public.school_can_access_area(p_area text)
returns boolean
language sql stable security definer
set search_path=public,auth
as $$
select case p_area
 when 'admin' then school_has_role('school_admin')
 when 'finance' then school_has_role('school_admin') or school_has_role('finance')
 when 'hr' then school_has_role('school_admin') or school_has_role('hr')
 when 'admissions' then school_has_role('school_admin') or school_has_role('admissions')
 when 'student_affairs' then school_has_role('school_admin') or school_has_role('student_affairs')
 when 'teacher' then school_has_role('teacher')
 when 'parent' then school_has_role('parent')
 when 'student' then school_has_role('student')
 when 'employee' then school_has_role('employee')
 else false
end
$$;
grant execute on function public.school_can_access_area(text) to authenticated;

-- Admin manages staff roles.
drop policy if exists school_staff_roles_admin_all on public.school_staff_roles;
create policy school_staff_roles_admin_all
on public.school_staff_roles for all to authenticated
using(public.school_has_role('school_admin') or public.is_school_admin())
with check(public.school_has_role('school_admin') or public.is_school_admin());

drop policy if exists school_staff_roles_self_read on public.school_staff_roles;
create policy school_staff_roles_self_read
on public.school_staff_roles for select to authenticated
using(auth_user_id=auth.uid());

-- Bootstrap existing legacy school admins into the new role table where discoverable.
do $$
begin
  if to_regclass('public.school_user_roles') is not null then
    begin
      execute $q$
        insert into public.school_staff_roles(auth_user_id,role)
        select distinct auth_user_id,'school_admin'
        from public.school_user_roles
        where role in ('admin','school_admin') and auth_user_id is not null
        on conflict(auth_user_id,role) do nothing
      $q$;
    exception when undefined_column then null;
    end;
  end if;
end $$;

create or replace function public.school_access_health()
returns jsonb
language sql stable security definer
set search_path=public
as $$
select jsonb_build_object(
 'staff_role_assignments',(select count(*) from school_staff_roles where is_active=true),
 'school_admins',(select count(*) from school_staff_roles where role='school_admin' and is_active=true),
 'finance_users',(select count(*) from school_staff_roles where role='finance' and is_active=true),
 'hr_users',(select count(*) from school_staff_roles where role='hr' and is_active=true),
 'admissions_users',(select count(*) from school_staff_roles where role='admissions' and is_active=true),
 'student_affairs_users',(select count(*) from school_staff_roles where role='student_affairs' and is_active=true),
 'employee_users',(select count(*) from school_staff_roles where role='employee' and is_active=true),
 'teachers',(select count(*) from school_teachers where status='active' and auth_user_id is not null),
 'parents',(select count(*) from school_parents where is_active=true and auth_user_id is not null),
 'students',(select count(*) from school_students where status='active' and auth_user_id is not null)
)
$$;
grant execute on function public.school_access_health() to authenticated;

select public.school_access_health();
