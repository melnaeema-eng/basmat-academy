-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S16 BIG
-- OPERATIONAL SETUP
-- Class Placement + Teacher Subject/Class Assignment
-- ============================================================

-- ------------------------------------------------------------
-- 1) OPERATIONAL SNAPSHOT
-- ------------------------------------------------------------

create or replace function public.school_operational_setup()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  return jsonb_build_object(
    'current_year',(
      select jsonb_build_object(
        'id',y.id,'name',y.name,'starts_on',y.starts_on,'ends_on',y.ends_on
      )
      from school_academic_years y
      where y.is_current=true
      limit 1
    ),

    'sections',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',cs.id,
          'academic_year_id',cs.academic_year_id,
          'academic_year',y.name,
          'grade_level_id',cs.grade_level_id,
          'grade_code',g.code,
          'grade_ar',g.name_ar,
          'grade_en',g.name_en,
          'curriculum_id',cs.curriculum_id,
          'curriculum_code',c.code,
          'curriculum_ar',c.name_ar,
          'section_name',cs.section_name,
          'capacity',cs.capacity,
          'enrolled_count',(
            select count(*)
            from school_enrollments e
            where e.class_section_id=cs.id and e.status='active'
          ),
          'available_places',case
            when cs.capacity is null then null
            else greatest(
              cs.capacity-(
                select count(*)
                from school_enrollments e
                where e.class_section_id=cs.id and e.status='active'
              ),0
            )
          end
        )
        order by y.starts_on desc,g.sort_order,c.code,cs.section_name
      )
      from school_class_sections cs
      join school_academic_years y on y.id=cs.academic_year_id
      join school_grade_levels g on g.id=cs.grade_level_id
      join school_curricula c on c.id=cs.curriculum_id
      where cs.is_active=true
    ),'[]'::jsonb),

    'unassigned_enrollments',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enrollment_id',e.id,
          'student_id',s.id,
          'student_no',s.student_no,
          'student_name',s.full_name_ar,
          'academic_year_id',e.academic_year_id,
          'academic_year',y.name,
          'grade_level_id',e.grade_level_id,
          'grade_code',g.code,
          'grade_ar',g.name_ar,
          'curriculum_id',e.curriculum_id,
          'curriculum_code',c.code,
          'curriculum_ar',c.name_ar
        )
        order by g.sort_order,s.full_name_ar
      )
      from school_enrollments e
      join school_students s on s.id=e.student_id
      join school_academic_years y on y.id=e.academic_year_id
      join school_grade_levels g on g.id=e.grade_level_id
      join school_curricula c on c.id=e.curriculum_id
      where e.status='active'
        and e.class_section_id is null
    ),'[]'::jsonb),

    'active_enrollments',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enrollment_id',e.id,
          'student_id',s.id,
          'student_no',s.student_no,
          'student_name',s.full_name_ar,
          'academic_year_id',e.academic_year_id,
          'grade_level_id',e.grade_level_id,
          'curriculum_id',e.curriculum_id,
          'class_section_id',e.class_section_id
        )
        order by s.full_name_ar
      )
      from school_enrollments e
      join school_students s on s.id=e.student_id
      where e.status='active'
    ),'[]'::jsonb),

    'teachers',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',t.id,
          'employee_no',t.employee_no,
          'full_name_ar',t.full_name_ar,
          'email',t.email,
          'auth_linked',(t.auth_user_id is not null),
          'specialization',t.specialization,
          'assignment_count',(
            select count(*) from school_teacher_assignments ta
            where ta.teacher_id=t.id and ta.is_active=true
          )
        )
        order by t.full_name_ar
      )
      from school_teachers t
      where t.status='active'
    ),'[]'::jsonb),

    'teacher_assignments',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',ta.id,
          'teacher_id',ta.teacher_id,
          'teacher_name',t.full_name_ar,
          'academic_year_id',ta.academic_year_id,
          'academic_year',y.name,
          'grade_level_id',ta.grade_level_id,
          'grade_ar',g.name_ar,
          'curriculum_id',ta.curriculum_id,
          'curriculum_ar',c.name_ar,
          'subject_id',ta.subject_id,
          'subject_ar',s.name_ar,
          'class_section_id',ta.class_section_id,
          'section_name',cs.section_name,
          'is_primary_teacher',ta.is_primary_teacher
        )
        order by t.full_name_ar,g.sort_order,s.name_ar,cs.section_name
      )
      from school_teacher_assignments ta
      join school_teachers t on t.id=ta.teacher_id
      join school_academic_years y on y.id=ta.academic_year_id
      join school_grade_levels g on g.id=ta.grade_level_id
      join school_curricula c on c.id=ta.curriculum_id
      join school_subjects s on s.id=ta.subject_id
      left join school_class_sections cs on cs.id=ta.class_section_id
      where ta.is_active=true
    ),'[]'::jsonb),

    'grade_subjects',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'academic_year_id',gs.academic_year_id,
          'grade_level_id',gs.grade_level_id,
          'curriculum_id',gs.curriculum_id,
          'subject_id',gs.subject_id,
          'subject_code',s.code,
          'subject_ar',s.name_ar,
          'subject_en',s.name_en,
          'weekly_periods',gs.weekly_periods
        )
        order by gs.sort_order,s.name_ar
      )
      from school_grade_subjects gs
      join school_subjects s on s.id=gs.subject_id
      where gs.is_active=true and s.is_active=true
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_operational_setup() to authenticated;


-- ------------------------------------------------------------
-- 2) PLACE / MOVE ONE ACTIVE ENROLLMENT INTO A SECTION
-- ------------------------------------------------------------

create or replace function public.school_assign_enrollment_to_section(
  p_enrollment_id uuid,
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  cs school_class_sections%rowtype;
  current_count integer;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  select * into e
  from school_enrollments
  where id=p_enrollment_id
  for update;

  if not found then raise exception 'Enrollment not found'; end if;
  if e.status<>'active' then raise exception 'Only active enrollment can be placed'; end if;

  select * into cs
  from school_class_sections
  where id=p_section_id and is_active=true;

  if not found then raise exception 'Active class section not found'; end if;

  if e.academic_year_id<>cs.academic_year_id then
    raise exception 'Academic year mismatch';
  end if;

  if e.grade_level_id<>cs.grade_level_id then
    raise exception 'Grade mismatch';
  end if;

  if e.curriculum_id<>cs.curriculum_id then
    raise exception 'Curriculum mismatch';
  end if;

  if e.class_section_id=cs.id then
    return jsonb_build_object(
      'enrollment_id',e.id,
      'section_id',cs.id,
      'changed',false
    );
  end if;

  select count(*) into current_count
  from school_enrollments
  where class_section_id=cs.id
    and status='active'
    and id<>e.id;

  if cs.capacity is not null and current_count>=cs.capacity then
    raise exception 'Class section is full (%/%).',current_count,cs.capacity;
  end if;

  update school_enrollments
  set class_section_id=cs.id,
      updated_at=now()
  where id=e.id;

  insert into school_security_audit_log(
    actor_user_id,action,entity_type,entity_id,details
  )
  values(
    auth.uid(),'ASSIGN_ENROLLMENT_TO_SECTION','school_enrollment',e.id,
    jsonb_build_object(
      'old_section_id',e.class_section_id,
      'new_section_id',cs.id
    )
  );

  return jsonb_build_object(
    'enrollment_id',e.id,
    'section_id',cs.id,
    'changed',true
  );
end $$;

grant execute on function public.school_assign_enrollment_to_section(uuid,uuid) to authenticated;


-- ------------------------------------------------------------
-- 3) BULK CLASS PLACEMENT
-- ------------------------------------------------------------

create or replace function public.school_bulk_assign_enrollments_to_section(
  p_enrollment_ids uuid[],
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  rid uuid;
  success_count integer:=0;
  failed_count integer:=0;
  errors jsonb:='[]'::jsonb;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  foreach rid in array coalesce(p_enrollment_ids,array[]::uuid[])
  loop
    begin
      perform public.school_assign_enrollment_to_section(rid,p_section_id);
      success_count:=success_count+1;
    exception when others then
      failed_count:=failed_count+1;
      errors:=errors||jsonb_build_array(
        jsonb_build_object(
          'enrollment_id',rid,
          'error',sqlerrm
        )
      );
    end;
  end loop;

  return jsonb_build_object(
    'success',success_count,
    'failed',failed_count,
    'errors',errors
  );
end $$;

grant execute on function public.school_bulk_assign_enrollments_to_section(uuid[],uuid) to authenticated;


-- ------------------------------------------------------------
-- 4) ASSIGN TEACHER TO SUBJECT + CLASS
-- ------------------------------------------------------------

create or replace function public.school_assign_teacher_to_class_subject(
  p_teacher_id uuid,
  p_section_id uuid,
  p_subject_id uuid,
  p_is_primary boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  t school_teachers%rowtype;
  cs school_class_sections%rowtype;
  rid uuid;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  select * into t
  from school_teachers
  where id=p_teacher_id and status='active';

  if not found then raise exception 'Active teacher not found'; end if;

  select * into cs
  from school_class_sections
  where id=p_section_id and is_active=true;

  if not found then raise exception 'Active class section not found'; end if;

  if not exists(
    select 1
    from school_grade_subjects gs
    where gs.academic_year_id=cs.academic_year_id
      and gs.grade_level_id=cs.grade_level_id
      and gs.curriculum_id=cs.curriculum_id
      and gs.subject_id=p_subject_id
      and gs.is_active=true
  ) then
    raise exception 'Subject is not configured for this year/grade/curriculum';
  end if;

  select id into rid
  from school_teacher_assignments
  where teacher_id=t.id
    and academic_year_id=cs.academic_year_id
    and grade_level_id=cs.grade_level_id
    and curriculum_id=cs.curriculum_id
    and subject_id=p_subject_id
    and class_section_id=cs.id
  limit 1;

  if rid is null then
    insert into school_teacher_assignments(
      teacher_id,academic_year_id,grade_level_id,curriculum_id,
      subject_id,class_section_id,is_primary_teacher,is_active
    )
    values(
      t.id,cs.academic_year_id,cs.grade_level_id,cs.curriculum_id,
      p_subject_id,cs.id,coalesce(p_is_primary,true),true
    )
    returning id into rid;
  else
    update school_teacher_assignments
    set is_primary_teacher=coalesce(p_is_primary,true),
        is_active=true
    where id=rid;
  end if;

  insert into school_security_audit_log(
    actor_user_id,action,entity_type,entity_id,details
  )
  values(
    auth.uid(),'ASSIGN_TEACHER_TO_CLASS_SUBJECT','school_teacher_assignment',rid,
    jsonb_build_object(
      'teacher_id',t.id,
      'section_id',cs.id,
      'subject_id',p_subject_id
    )
  );

  return rid;
end $$;

grant execute on function public.school_assign_teacher_to_class_subject(uuid,uuid,uuid,boolean) to authenticated;


-- ------------------------------------------------------------
-- 5) DEACTIVATE TEACHER ASSIGNMENT (NO HARD DELETE)
-- ------------------------------------------------------------

create or replace function public.school_deactivate_teacher_assignment(
  p_assignment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  update school_teacher_assignments
  set is_active=false
  where id=p_assignment_id
  returning id into rid;

  if rid is null then raise exception 'Teacher assignment not found'; end if;

  insert into school_security_audit_log(
    actor_user_id,action,entity_type,entity_id
  )
  values(
    auth.uid(),'DEACTIVATE_TEACHER_ASSIGNMENT','school_teacher_assignment',rid
  );

  return rid;
end $$;

grant execute on function public.school_deactivate_teacher_assignment(uuid) to authenticated;


-- ------------------------------------------------------------
-- 6) S16 HEALTH
-- ------------------------------------------------------------

create or replace function public.school_s16_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'active_sections',(
      select count(*) from school_class_sections where is_active=true
    ),
    'active_enrollments',(
      select count(*) from school_enrollments where status='active'
    ),
    'unassigned_enrollments',(
      select count(*) from school_enrollments
      where status='active' and class_section_id is null
    ),
    'active_teachers',(
      select count(*) from school_teachers where status='active'
    ),
    'teachers_without_assignments',(
      select count(*)
      from school_teachers t
      where t.status='active'
        and not exists(
          select 1 from school_teacher_assignments ta
          where ta.teacher_id=t.id and ta.is_active=true
        )
    ),
    'active_teacher_assignments',(
      select count(*) from school_teacher_assignments where is_active=true
    ),
    'over_capacity_sections',(
      select count(*)
      from school_class_sections cs
      where cs.is_active=true
        and cs.capacity is not null
        and (
          select count(*)
          from school_enrollments e
          where e.class_section_id=cs.id and e.status='active'
        )>cs.capacity
    )
  );
$$;

grant execute on function public.school_s16_health() to authenticated;

select public.school_s16_health();
