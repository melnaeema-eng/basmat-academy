-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S13 BIG
-- COMPLETE STUDENT PORTAL
-- ============================================================

create or replace function public.school_student_full_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  sid uuid;
  eid uuid;
  en school_enrollments%rowtype;
  st school_students%rowtype;
begin
  sid:=public.current_school_student_id();
  if sid is null then raise exception 'Student access required'; end if;

  select * into st from school_students where id=sid;
  select * into en
  from school_enrollments
  where student_id=sid and status='active'
  order by created_at desc limit 1;
  eid:=en.id;

  return jsonb_build_object(
    'student',jsonb_build_object(
      'id',st.id,'student_no',st.student_no,'full_name_ar',st.full_name_ar,
      'full_name_en',st.full_name_en,'email',st.email,'phone',st.phone,'status',st.status
    ),
    'enrollment',case when eid is null then null else jsonb_build_object(
      'id',eid,'academic_year_id',en.academic_year_id,'grade_level_id',en.grade_level_id,
      'curriculum_id',en.curriculum_id,'class_section_id',en.class_section_id
    ) end,
    'structure',case when eid is null then null else (
      select jsonb_build_object(
        'academic_year',y.name,'grade_ar',g.name_ar,'grade_en',g.name_en,
        'curriculum_ar',c.name_ar,'curriculum_en',c.name_en,'section_name',cs.section_name
      )
      from school_academic_years y
      join school_grade_levels g on g.id=en.grade_level_id
      join school_curricula c on c.id=en.curriculum_id
      left join school_class_sections cs on cs.id=en.class_section_id
      where y.id=en.academic_year_id
    ) end,
    'attendance_summary',coalesce((
      select jsonb_build_object(
        'present',count(*) filter(where r.status='present'),
        'absent',count(*) filter(where r.status='absent'),
        'late',count(*) filter(where r.status='late'),
        'excused',count(*) filter(where r.status='excused')
      )
      from school_attendance_records r where r.enrollment_id=eid
    ),jsonb_build_object('present',0,'absent',0,'late',0,'excused',0)),
    'attendance',coalesce((
      select jsonb_agg(jsonb_build_object(
        'date',s.attendance_date,'status',r.status,'note',r.note,'period_no',s.period_no,
        'subject_ar',sub.name_ar
      ) order by s.attendance_date desc,s.period_no)
      from school_attendance_records r
      join school_attendance_sessions s on s.id=r.session_id
      left join school_subjects sub on sub.id=s.subject_id
      where r.enrollment_id=eid
    ),'[]'::jsonb),
    'assignments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'title',a.title,'description',a.description,'due_at',a.due_at,
        'max_score',a.max_score,'subject_ar',subj.name_ar,
        'submitted_at',ss.submitted_at,'submission_text',ss.submission_text,
        'score',ss.score,'teacher_feedback',ss.teacher_feedback
      ) order by a.due_at asc nulls last)
      from school_assignments a
      join school_subjects subj on subj.id=a.subject_id
      left join school_assignment_submissions ss
        on ss.assignment_id=a.id and ss.enrollment_id=eid
      where a.class_section_id=en.class_section_id and a.is_published=true
    ),'[]'::jsonb),
    'timetable',coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday',t.weekday,'period_no',t.period_no,'starts_at',t.starts_at,'ends_at',t.ends_at,
        'room',t.room,'subject_ar',subj.name_ar,'teacher_ar',te.full_name_ar
      ) order by t.weekday,t.period_no)
      from school_timetable t
      join school_subjects subj on subj.id=t.subject_id
      join school_teachers te on te.id=t.teacher_id
      where t.class_section_id=en.class_section_id and t.is_active=true
    ),'[]'::jsonb),
    'exams',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ex.id,'title',ex.title,'exam_date',ex.exam_date,'starts_at',ex.starts_at,
        'duration_minutes',ex.duration_minutes,'max_score',ex.max_score,'pass_score',ex.pass_score,
        'subject_ar',subj.name_ar,'period_ar',ep.name_ar,'exam_type',ep.exam_type,
        'delivery_mode',ex.delivery_mode
      ) order by ex.exam_date)
      from school_exams ex
      join school_subjects subj on subj.id=ex.subject_id
      join school_exam_periods ep on ep.id=ex.exam_period_id
      where ex.class_section_id=en.class_section_id and ex.is_published=true
    ),'[]'::jsonb),
    'financial_exam_status',case when eid is null then null else public.school_financial_exam_eligible(eid,current_date) end,
    'fees',jsonb_build_object(
      'outstanding',coalesce((
        select sum(greatest(i.amount-i.paid_amount,0))
        from school_installments i
        where i.enrollment_id=eid and i.status not in('paid','waived')
      ),0)
    )
  );
end $$;
grant execute on function public.school_student_full_portal() to authenticated;

create or replace function public.school_student_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare sid uuid; s school_students%rowtype;
begin
  sid:=public.current_school_student_id();
  if sid is null then raise exception 'Student access required'; end if;
  select * into s from school_students where id=sid;
  return jsonb_build_object(
    'id',s.id,'student_no',s.student_no,'full_name_ar',s.full_name_ar,
    'full_name_en',s.full_name_en,'email',s.email,'phone',s.phone,
    'date_of_birth',s.date_of_birth,'nationality',s.nationality,'status',s.status
  );
end $$;
grant execute on function public.school_student_profile() to authenticated;

create or replace function public.school_update_my_student_contact(p_phone text,p_email text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare sid uuid;
begin
  sid:=public.current_school_student_id();
  if sid is null then raise exception 'Student access required'; end if;
  update school_students
  set phone=nullif(trim(p_phone),''),
      email=lower(nullif(trim(p_email),'')),
      updated_at=now()
  where id=sid;
  return sid;
end $$;
grant execute on function public.school_update_my_student_contact(text,text) to authenticated;

create or replace function public.school_s13_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
 select jsonb_build_object(
   'active_students',(select count(*) from school_students where status='active'),
   'students_with_auth',(select count(*) from school_students where status='active' and auth_user_id is not null),
   'active_enrollments',(select count(*) from school_enrollments where status='active')
 );
$$;
grant execute on function public.school_s13_health() to authenticated;
select public.school_s13_health();
