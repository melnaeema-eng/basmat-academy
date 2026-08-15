-- ============================================================
-- SCHOOL ACCESS CONTROL UI FINAL
-- Academy login remains /login
-- School login becomes /school/login
-- ============================================================

-- Ensure staff-role table exists from previous step.
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

-- Canonical admin check:
-- preserves old Academy Admin / profiles.school_role behavior,
-- and adds new school_staff_roles school_admin.
create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select
    public.is_admin()
    or exists(
      select 1
      from public.profiles p
      where p.id=auth.uid()
        and lower(trim(coalesce(p.school_role,'')))='school_admin'
    )
    or exists(
      select 1
      from public.school_staff_roles r
      where r.auth_user_id=auth.uid()
        and r.role='school_admin'
        and r.is_active=true
    );
$$;

grant execute on function public.is_school_admin() to authenticated;

create or replace function public.school_has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
select case lower(trim(p_role))
 when 'school_admin' then public.is_school_admin()
 when 'student' then exists(
   select 1 from school_students s
   where s.auth_user_id=auth.uid() and s.status='active'
 )
 when 'parent' then exists(
   select 1 from school_parents p
   where p.auth_user_id=auth.uid() and p.is_active=true
 )
 when 'teacher' then exists(
   select 1 from school_teachers t
   where t.auth_user_id=auth.uid() and t.status='active'
 )
 else exists(
   select 1 from school_staff_roles r
   where r.auth_user_id=auth.uid()
     and r.role=lower(trim(p_role))
     and r.is_active=true
 )
end;
$$;
grant execute on function public.school_has_role(text) to authenticated;

create or replace function public.school_my_roles()
returns text[]
language sql
stable
security definer
set search_path=public,auth
as $$
select coalesce(array_agg(distinct role order by role),'{}'::text[])
from (
  select 'school_admin'::text role where public.is_school_admin()
  union all
  select r.role from school_staff_roles r
   where r.auth_user_id=auth.uid()
     and r.is_active=true
     and r.role<>'school_admin'
  union all
  select 'student' where exists(
    select 1 from school_students s where s.auth_user_id=auth.uid() and s.status='active'
  )
  union all
  select 'parent' where exists(
    select 1 from school_parents p where p.auth_user_id=auth.uid() and p.is_active=true
  )
  union all
  select 'teacher' where exists(
    select 1 from school_teachers t where t.auth_user_id=auth.uid() and t.status='active'
  )
) x;
$$;
grant execute on function public.school_my_roles() to authenticated;

create or replace function public.school_can_access_area(p_area text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
select case lower(trim(p_area))
 when 'admin' then public.school_has_role('school_admin')
 when 'finance' then public.school_has_role('school_admin') or public.school_has_role('finance')
 when 'hr' then public.school_has_role('school_admin') or public.school_has_role('hr')
 when 'admissions' then public.school_has_role('school_admin') or public.school_has_role('admissions')
 when 'student_affairs' then public.school_has_role('school_admin') or public.school_has_role('student_affairs')
 when 'teacher' then public.school_has_role('teacher')
 when 'parent' then public.school_has_role('parent')
 when 'student' then public.school_has_role('student')
 when 'employee' then public.school_has_role('employee')
 else false
end;
$$;
grant execute on function public.school_can_access_area(text) to authenticated;

-- Admin-facing list of Auth users.
create or replace function public.school_access_users()
returns table(
  auth_user_id uuid,
  email text,
  display_name text,
  identity_roles text[],
  staff_roles text[]
)
language sql
stable
security definer
set search_path=public,auth
as $$
select
 u.id,
 u.email::text,
 coalesce(
   (select e.full_name_ar from school_employees e where e.auth_user_id=u.id order by e.created_at limit 1),
   (select t.full_name_ar from school_teachers t where t.auth_user_id=u.id order by t.created_at limit 1),
   (select p.full_name from school_parents p where p.auth_user_id=u.id order by p.created_at limit 1),
   (select s.full_name_ar from school_students s where s.auth_user_id=u.id order by s.created_at limit 1),
   u.email::text
 ) as display_name,
 array_remove(array[
   case when exists(select 1 from school_teachers t where t.auth_user_id=u.id and t.status='active') then 'teacher' end,
   case when exists(select 1 from school_parents p where p.auth_user_id=u.id and p.is_active=true) then 'parent' end,
   case when exists(select 1 from school_students s where s.auth_user_id=u.id and s.status='active') then 'student' end
 ],null) as identity_roles,
 coalesce((
   select array_agg(r.role order by r.role)
   from school_staff_roles r
   where r.auth_user_id=u.id and r.is_active=true
 ),'{}'::text[]) as staff_roles
from auth.users u
where public.is_school_admin()
order by lower(coalesce(u.email,''));
$$;
grant execute on function public.school_access_users() to authenticated;

-- Replace all administrative staff roles for one user atomically.
create or replace function public.school_set_staff_roles(
  p_auth_user_id uuid,
  p_roles text[]
)
returns text[]
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  allowed constant text[]:=array[
    'school_admin','finance','hr','admissions','student_affairs','employee'
  ];
  r text;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  if p_auth_user_id is null then
    raise exception 'Auth user is required';
  end if;

  foreach r in array coalesce(p_roles,'{}'::text[])
  loop
    if not (r=any(allowed)) then
      raise exception 'Invalid school staff role: %',r;
    end if;
  end loop;

  -- Prevent current admin from accidentally removing their own final admin role.
  if p_auth_user_id=auth.uid()
     and public.school_has_role('school_admin')
     and not ('school_admin'=any(coalesce(p_roles,'{}'::text[])))
     and (select count(*) from school_staff_roles where role='school_admin' and is_active=true)<=1
  then
    raise exception 'Cannot remove the last School Admin role';
  end if;

  update school_staff_roles
  set is_active=false
  where auth_user_id=p_auth_user_id;

  foreach r in array coalesce(p_roles,'{}'::text[])
  loop
    insert into school_staff_roles(auth_user_id,role,is_active,granted_by,granted_at)
    values(p_auth_user_id,r,true,auth.uid(),now())
    on conflict(auth_user_id,role)
    do update set
      is_active=true,
      granted_by=auth.uid(),
      granted_at=now();
  end loop;

  return coalesce(p_roles,'{}'::text[]);
end $$;
grant execute on function public.school_set_staff_roles(uuid,text[]) to authenticated;

create or replace function public.school_access_ui_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'school_admins',(select count(*) from school_staff_roles where role='school_admin' and is_active=true),
  'finance_users',(select count(*) from school_staff_roles where role='finance' and is_active=true),
  'hr_users',(select count(*) from school_staff_roles where role='hr' and is_active=true),
  'admissions_users',(select count(*) from school_staff_roles where role='admissions' and is_active=true),
  'student_affairs_users',(select count(*) from school_staff_roles where role='student_affairs' and is_active=true),
  'employee_users',(select count(*) from school_staff_roles where role='employee' and is_active=true),
  'teachers',(select count(*) from school_teachers where auth_user_id is not null and status='active'),
  'parents',(select count(*) from school_parents where auth_user_id is not null and is_active=true),
  'students',(select count(*) from school_students where auth_user_id is not null and status='active')
);
$$;
grant execute on function public.school_access_ui_health() to authenticated;

select public.school_access_ui_health();
