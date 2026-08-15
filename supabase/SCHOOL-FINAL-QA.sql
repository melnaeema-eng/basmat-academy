-- ============================================================
-- SCHOOL FINAL QA — PRODUCTION CHECK
-- Read-only diagnostics. No business data changes.
-- ============================================================

create or replace function public.school_final_qa()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  duplicate_students integer:=0;
  duplicate_parents integer:=0;
  duplicate_teachers integer:=0;
  duplicate_employees integer:=0;
  broken_parent_links integer:=0;
  broken_enrollments integer:=0;
  broken_teacher_assignments integer:=0;
  active_without_class integer:=0;
  active_teacher_without_assignment integer:=0;
  current_years integer:=0;
  auth_conflicts integer:=0;
  school_rls_off integer:=0;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  select count(*) into duplicate_students
  from (
    select auth_user_id
    from school_students
    where auth_user_id is not null
    group by auth_user_id
    having count(*)>1
  ) x;

  select count(*) into duplicate_parents
  from (
    select auth_user_id
    from school_parents
    where auth_user_id is not null
    group by auth_user_id
    having count(*)>1
  ) x;

  select count(*) into duplicate_teachers
  from (
    select auth_user_id
    from school_teachers
    where auth_user_id is not null
    group by auth_user_id
    having count(*)>1
  ) x;

  select count(*) into duplicate_employees
  from (
    select auth_user_id
    from school_employees
    where auth_user_id is not null
    group by auth_user_id
    having count(*)>1
  ) x;

  select count(*) into broken_parent_links
  from school_parent_students ps
  left join school_parents p on p.id=ps.parent_id
  left join school_students s on s.id=ps.student_id
  where p.id is null or s.id is null;

  select count(*) into broken_enrollments
  from school_enrollments e
  left join school_students s on s.id=e.student_id
  left join school_academic_years y on y.id=e.academic_year_id
  left join school_grade_levels g on g.id=e.grade_level_id
  left join school_curricula c on c.id=e.curriculum_id
  where s.id is null or y.id is null or g.id is null or c.id is null;

  select count(*) into broken_teacher_assignments
  from school_teacher_assignments ta
  left join school_teachers t on t.id=ta.teacher_id
  left join school_subjects s on s.id=ta.subject_id
  left join school_academic_years y on y.id=ta.academic_year_id
  where t.id is null or s.id is null or y.id is null;

  select count(*) into active_without_class
  from school_enrollments
  where status='active' and class_section_id is null;

  select count(*) into active_teacher_without_assignment
  from school_teachers t
  where t.status='active'
    and not exists(
      select 1
      from school_teacher_assignments ta
      where ta.teacher_id=t.id and ta.is_active=true
    );

  select count(*) into current_years
  from school_academic_years
  where is_current=true;

  select count(*) into auth_conflicts
  from public.school_auth_link_conflicts();

  select count(*) into school_rls_off
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and c.relname like 'school_%'
    and c.relrowsecurity=false;

  return jsonb_build_object(
    'status',
      case
        when broken_parent_links=0
         and broken_enrollments=0
         and broken_teacher_assignments=0
         and current_years=1
         and auth_conflicts=0
         and school_rls_off=0
        then 'PASS'
        else 'CHECK'
      end,
    'duplicates',jsonb_build_object(
      'student_auth_duplicates',duplicate_students,
      'parent_auth_duplicates',duplicate_parents,
      'teacher_auth_duplicates',duplicate_teachers,
      'employee_auth_duplicates',duplicate_employees
    ),
    'integrity',jsonb_build_object(
      'broken_parent_links',broken_parent_links,
      'broken_enrollments',broken_enrollments,
      'broken_teacher_assignments',broken_teacher_assignments
    ),
    'operations',jsonb_build_object(
      'active_enrollments_without_class',active_without_class,
      'active_teachers_without_assignment',active_teacher_without_assignment,
      'current_academic_year_count',current_years
    ),
    'security',jsonb_build_object(
      'same_role_auth_conflicts',auth_conflicts,
      'school_tables_rls_disabled',school_rls_off
    )
  );
end $$;

grant execute on function public.school_final_qa() to authenticated;

select public.school_final_qa();
