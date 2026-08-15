-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S14 BIG
-- COMPLETE TEACHER PORTAL
-- ============================================================

create or replace function public.school_teacher_full_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare tid uuid; t school_teachers%rowtype;
begin
  tid:=public.current_school_teacher_id();
  if tid is null then raise exception 'Teacher access required'; end if;
  select * into t from school_teachers where id=tid;

  return jsonb_build_object(
    'teacher',jsonb_build_object(
      'id',t.id,'employee_no',t.employee_no,'full_name_ar',t.full_name_ar,
      'full_name_en',t.full_name_en,'email',t.email,'phone',t.phone,
      'specialization',t.specialization,'qualification',t.qualification
    ),

    'assignments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ta.id,'class_section_id',ta.class_section_id,'subject_id',ta.subject_id,
        'subject_ar',s.name_ar,'subject_en',s.name_en,
        'grade_ar',g.name_ar,'grade_en',g.name_en,
        'curriculum_ar',cu.name_ar,'curriculum_en',cu.name_en,
        'section_name',cs.section_name,'academic_year',y.name
      ) order by g.sort_order,s.name_ar)
      from school_teacher_assignments ta
      join school_subjects s on s.id=ta.subject_id
      join school_grade_levels g on g.id=ta.grade_level_id
      join school_curricula cu on cu.id=ta.curriculum_id
      join school_academic_years y on y.id=ta.academic_year_id
      left join school_class_sections cs on cs.id=ta.class_section_id
      where ta.teacher_id=tid and ta.is_active=true
    ),'[]'::jsonb),

    'timetable',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',tt.id,'weekday',tt.weekday,'period_no',tt.period_no,
        'starts_at',tt.starts_at,'ends_at',tt.ends_at,'room',tt.room,
        'subject_ar',s.name_ar,'section_name',cs.section_name,'grade_ar',g.name_ar
      ) order by tt.weekday,tt.period_no)
      from school_timetable tt
      join school_subjects s on s.id=tt.subject_id
      join school_class_sections cs on cs.id=tt.class_section_id
      join school_grade_levels g on g.id=cs.grade_level_id
      where tt.teacher_id=tid and tt.is_active=true
    ),'[]'::jsonb),

    'students',coalesce((
      select jsonb_agg(jsonb_build_object(
        'enrollment_id',e.id,'student_id',st.id,'student_no',st.student_no,
        'full_name_ar',st.full_name_ar,'full_name_en',st.full_name_en,
        'class_section_id',e.class_section_id,'section_name',cs.section_name,
        'grade_ar',g.name_ar,'curriculum_ar',cu.name_ar
      ) order by st.full_name_ar)
      from school_enrollments e
      join school_students st on st.id=e.student_id
      join school_class_sections cs on cs.id=e.class_section_id
      join school_grade_levels g on g.id=e.grade_level_id
      join school_curricula cu on cu.id=e.curriculum_id
      where e.status='active'
        and exists(
          select 1 from school_teacher_assignments ta
          where ta.teacher_id=tid and ta.is_active=true
            and (
              ta.class_section_id=e.class_section_id
              or (
                ta.class_section_id is null
                and ta.grade_level_id=e.grade_level_id
                and ta.curriculum_id=e.curriculum_id
              )
            )
        )
    ),'[]'::jsonb),

    'homework',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'title',a.title,'description',a.description,'due_at',a.due_at,
        'max_score',a.max_score,'class_section_id',a.class_section_id,
        'subject_id',a.subject_id,'subject_ar',s.name_ar,'section_name',cs.section_name,
        'submitted_count',(select count(*) from school_assignment_submissions ss where ss.assignment_id=a.id),
        'graded_count',(select count(*) from school_assignment_submissions ss where ss.assignment_id=a.id and ss.graded_at is not null)
      ) order by a.created_at desc)
      from school_assignments a
      join school_subjects s on s.id=a.subject_id
      join school_class_sections cs on cs.id=a.class_section_id
      where a.teacher_id=tid
    ),'[]'::jsonb),

    'pending_submissions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ss.id,'assignment_id',a.id,'assignment_title',a.title,
        'submission_text',ss.submission_text,'attachment_url',ss.attachment_url,
        'submitted_at',ss.submitted_at,'max_score',a.max_score,
        'student_name',st.full_name_ar,'student_no',st.student_no
      ) order by ss.submitted_at)
      from school_assignment_submissions ss
      join school_assignments a on a.id=ss.assignment_id
      join school_enrollments e on e.id=ss.enrollment_id
      join school_students st on st.id=e.student_id
      where a.teacher_id=tid and ss.graded_at is null
    ),'[]'::jsonb),

    'exams',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ex.id,'title',ex.title,'exam_date',ex.exam_date,
        'class_section_id',ex.class_section_id,'subject_id',ex.subject_id,
        'subject_ar',s.name_ar,'section_name',cs.section_name,
        'max_score',ex.max_score,'pass_score',ex.pass_score,
        'delivery_mode',ex.delivery_mode,'is_published',ex.is_published
      ) order by ex.exam_date desc)
      from school_exams ex
      join school_subjects s on s.id=ex.subject_id
      join school_class_sections cs on cs.id=ex.class_section_id
      where ex.teacher_id=tid
         or public.school_teacher_can_manage(ex.class_section_id,ex.subject_id)
    ),'[]'::jsonb),

    'question_count',(
      select count(*) from school_question_bank qb
      where qb.teacher_id=tid and qb.is_active=true
    )
  );
end $$;
grant execute on function public.school_teacher_full_portal() to authenticated;

create or replace function public.school_teacher_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare tid uuid; t school_teachers%rowtype;
begin
  tid:=public.current_school_teacher_id();
  if tid is null then raise exception 'Teacher access required'; end if;
  select * into t from school_teachers where id=tid;
  return jsonb_build_object(
    'id',t.id,'employee_no',t.employee_no,'full_name_ar',t.full_name_ar,
    'full_name_en',t.full_name_en,'email',t.email,'phone',t.phone,
    'qualification',t.qualification,'specialization',t.specialization,'status',t.status
  );
end $$;
grant execute on function public.school_teacher_profile() to authenticated;

create or replace function public.school_update_my_teacher_contact(p_phone text,p_email text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare tid uuid;
begin
  tid:=public.current_school_teacher_id();
  if tid is null then raise exception 'Teacher access required'; end if;
  update school_teachers
  set phone=nullif(trim(p_phone),''),
      email=lower(nullif(trim(p_email),'')),
      updated_at=now()
  where id=tid;
  return tid;
end $$;
grant execute on function public.school_update_my_teacher_contact(text,text) to authenticated;

create or replace function public.school_teacher_student_snapshot(p_enrollment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare tid uuid; e school_enrollments%rowtype;
begin
 tid:=public.current_school_teacher_id();
 if tid is null then raise exception 'Teacher access required'; end if;
 select * into e from school_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment not found'; end if;
 if not public.school_teacher_can_manage(e.class_section_id,null) then
   raise exception 'Teacher cannot access this student';
 end if;

 return jsonb_build_object(
  'attendance',coalesce((
   select jsonb_build_object(
    'present',count(*) filter(where r.status='present'),
    'absent',count(*) filter(where r.status='absent'),
    'late',count(*) filter(where r.status='late'),
    'excused',count(*) filter(where r.status='excused')
   ) from school_attendance_records r where r.enrollment_id=e.id
  ),'{}'::jsonb),
  'assignments',coalesce((
   select jsonb_agg(jsonb_build_object(
    'title',a.title,'score',ss.score,'max_score',a.max_score,'submitted_at',ss.submitted_at
   ) order by a.due_at)
   from school_assignments a
   left join school_assignment_submissions ss
     on ss.assignment_id=a.id and ss.enrollment_id=e.id
   where a.class_section_id=e.class_section_id
  ),'[]'::jsonb),
  'results',coalesce((
   select jsonb_agg(jsonb_build_object(
    'exam',ex.title,'subject',s.name_ar,'score',r.score,'max_score',ex.max_score,'status',r.status
   ) order by ex.exam_date desc)
   from school_exam_results r
   join school_exams ex on ex.id=r.exam_id
   join school_subjects s on s.id=ex.subject_id
   where r.enrollment_id=e.id
     and public.school_teacher_can_manage(ex.class_section_id,ex.subject_id)
  ),'[]'::jsonb)
 );
end $$;
grant execute on function public.school_teacher_student_snapshot(uuid) to authenticated;

create or replace function public.school_s14_health()
returns jsonb
language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
  'active_teachers',(select count(*) from school_teachers where status='active'),
  'teachers_with_auth',(select count(*) from school_teachers where status='active' and auth_user_id is not null),
  'teacher_assignments',(select count(*) from school_teacher_assignments where is_active=true),
  'pending_homework_grading',(select count(*) from school_assignment_submissions where graded_at is null)
 );
$$;
grant execute on function public.school_s14_health() to authenticated;
select public.school_s14_health();
