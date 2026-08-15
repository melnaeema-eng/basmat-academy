-- ============================================================
-- SCHOOL SYSTEM ACCESS FINAL V4
-- Canonical school access model
-- ============================================================

-- Keep the existing tables/functions from previous access sprints.
-- This file adds diagnostics and a single current-user access summary.

create or replace function public.school_current_access()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  roles text[];
begin
  roles:=public.school_my_roles();

  return jsonb_build_object(
    'auth_user_id',auth.uid(),
    'roles',roles,
    'multi_role',coalesce(array_length(roles,1),0)>1,
    'destinations',jsonb_build_object(
      'school_admin',case when 'school_admin'=any(roles) then '/school/admin' else null end,
      'finance',case when ('school_admin'=any(roles) or 'finance'=any(roles)) then '/school/admin/finance' else null end,
      'hr',case when ('school_admin'=any(roles) or 'hr'=any(roles)) then '/school/admin/hr-center' else null end,
      'admissions',case when ('school_admin'=any(roles) or 'admissions'=any(roles)) then '/school/admin/admissions' else null end,
      'student_affairs',case when ('school_admin'=any(roles) or 'student_affairs'=any(roles)) then '/school/admin/student-affairs' else null end,
      'teacher',case when 'teacher'=any(roles) then '/school/teacher' else null end,
      'parent',case when 'parent'=any(roles) then '/school/parent' else null end,
      'student',case when 'student'=any(roles) then '/school/student' else null end,
      'employee',case when 'employee'=any(roles) then '/school/employee' else null end
    )
  );
end $$;

grant execute on function public.school_current_access() to authenticated;

create or replace function public.school_user_access_details(p_auth_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  return jsonb_build_object(
    'auth_user_id',p_auth_user_id,
    'email',(select email from auth.users where id=p_auth_user_id),
    'teacher',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',t.id,'name',t.full_name_ar,'status',t.status
      )),'[]'::jsonb)
      from school_teachers t where t.auth_user_id=p_auth_user_id
    ),
    'parent',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.full_name,'active',p.is_active
      )),'[]'::jsonb)
      from school_parents p where p.auth_user_id=p_auth_user_id
    ),
    'student',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',s.id,'name',s.full_name_ar,'status',s.status
      )),'[]'::jsonb)
      from school_students s where s.auth_user_id=p_auth_user_id
    ),
    'employee',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',e.id,'name',e.full_name_ar,'status',e.status
      )),'[]'::jsonb)
      from school_employees e where e.auth_user_id=p_auth_user_id
    ),
    'staff_roles',coalesce((
      select jsonb_agg(r.role order by r.role)
      from school_staff_roles r
      where r.auth_user_id=p_auth_user_id and r.is_active=true
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_user_access_details(uuid) to authenticated;

create or replace function public.school_access_v4_health()
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
  'teacher_logins',(select count(*) from school_teachers where status='active' and auth_user_id is not null),
  'parent_logins',(select count(*) from school_parents where is_active=true and auth_user_id is not null),
  'student_logins',(select count(*) from school_students where status='active' and auth_user_id is not null),
  'same_role_conflicts',(select count(*) from school_auth_link_conflicts())
);
$$;

grant execute on function public.school_access_v4_health() to authenticated;

select public.school_access_v4_health();
