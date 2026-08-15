-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S12 BIG
-- COMPLETE PARENT PORTAL
-- ============================================================

create or replace function public.school_parent_child_portal(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  pid uuid;
  eid uuid;
  st school_students%rowtype;
  en school_enrollments%rowtype;
begin
  pid:=public.current_school_parent_id();
  if pid is null then raise exception 'Parent access required'; end if;

  if not exists(
    select 1 from school_parent_students ps
    where ps.parent_id=pid and ps.student_id=p_student_id
  ) then raise exception 'Student is not linked to this parent'; end if;

  select * into st from school_students where id=p_student_id;
  select * into en from school_enrollments
  where student_id=p_student_id and status='active'
  order by created_at desc limit 1;
  eid:=en.id;

  return jsonb_build_object(
    'student',jsonb_build_object(
      'id',st.id,'student_no',st.student_no,'full_name_ar',st.full_name_ar,
      'full_name_en',st.full_name_en,'status',st.status,'email',st.email
    ),
    'enrollment',case when eid is null then null else jsonb_build_object(
      'id',eid,'academic_year_id',en.academic_year_id,'grade_level_id',en.grade_level_id,
      'curriculum_id',en.curriculum_id,'class_section_id',en.class_section_id
    ) end,

    'fees',jsonb_build_object(
      'installments',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',i.id,'title',i.title,'installment_no',i.installment_no,'due_date',i.due_date,
          'amount',i.amount,'paid_amount',i.paid_amount,
          'outstanding',greatest(i.amount-i.paid_amount,0),'status',i.status
        ) order by i.due_date)
        from school_installments i where i.enrollment_id=eid
      ),'[]'::jsonb),
      'payments',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',p.id,'amount',p.amount,'currency',p.currency,'method',p.method,
          'reference_no',p.reference_no,'paid_at',p.paid_at,'notes',p.notes
        ) order by p.paid_at desc)
        from school_payments p where p.enrollment_id=eid
      ),'[]'::jsonb),
      'discounts',coalesce((
        select jsonb_agg(jsonb_build_object(
          'type',d.discount_type,'percent',d.percent,'amount',d.amount,
          'applies_to',d.applies_to,'reason',d.reason
        ))
        from school_enrollment_discounts d
        where d.enrollment_id=eid and d.is_active=true
      ),'[]'::jsonb),
      'outstanding',coalesce((
        select sum(greatest(i.amount-i.paid_amount,0))
        from school_installments i
        where i.enrollment_id=eid and i.status not in('paid','waived')
      ),0)
    ),

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

    'attendance_summary',coalesce((
      select jsonb_build_object(
        'present',count(*) filter(where r.status='present'),
        'absent',count(*) filter(where r.status='absent'),
        'late',count(*) filter(where r.status='late'),
        'excused',count(*) filter(where r.status='excused')
      )
      from school_attendance_records r where r.enrollment_id=eid
    ),jsonb_build_object('present',0,'absent',0,'late',0,'excused',0)),

    'assignments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'title',a.title,'description',a.description,'due_at',a.due_at,
        'max_score',a.max_score,'subject_ar',subj.name_ar,
        'submitted_at',ss.submitted_at,'score',ss.score,'teacher_feedback',ss.teacher_feedback
      ) order by a.due_at desc nulls last)
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
        'duration_minutes',ex.duration_minutes,'max_score',ex.max_score,
        'subject_ar',subj.name_ar,'period_ar',ep.name_ar,'exam_type',ep.exam_type,
        'delivery_mode',ex.delivery_mode
      ) order by ex.exam_date)
      from school_exams ex
      join school_subjects subj on subj.id=ex.subject_id
      join school_exam_periods ep on ep.id=ex.exam_period_id
      where ex.class_section_id=en.class_section_id and ex.is_published=true
    ),'[]'::jsonb),

    'results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'score',r.score,'status',r.status,'published_at',r.published_at,
        'exam_title',ex.title,'max_score',ex.max_score,'pass_score',ex.pass_score,
        'exam_date',ex.exam_date,'subject_ar',subj.name_ar,'period_ar',ep.name_ar
      ) order by ex.exam_date desc)
      from school_exam_results r
      join school_exams ex on ex.id=r.exam_id
      join school_subjects subj on subj.id=ex.subject_id
      join school_exam_periods ep on ep.id=ex.exam_period_id
      where r.enrollment_id=eid and r.published_at is not null
    ),'[]'::jsonb),

    'report_cards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',rc.id,'term_no',rc.term_no,'average_score',rc.average_score,
        'result_status',rc.result_status,'rank_in_class',rc.rank_in_class,
        'attendance_present',rc.attendance_present,'attendance_absent',rc.attendance_absent,
        'teacher_comment',rc.teacher_comment,'principal_comment',rc.principal_comment
      ) order by rc.term_no)
      from school_report_cards rc
      where rc.enrollment_id=eid and rc.is_published=true
    ),'[]'::jsonb),

    'annual_results',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',ar.id,'average_score',ar.average_score,'failed_subjects',ar.failed_subjects,
        'result_status',ar.result_status,'promotion_status',ar.promotion_status,
        'rank_in_class',ar.rank_in_class,'teacher_comment',ar.teacher_comment,
        'principal_comment',ar.principal_comment
      ) order by ar.created_at desc)
      from school_annual_results ar
      where ar.student_id=p_student_id and ar.is_published=true
    ),'[]'::jsonb),

    'certificates',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'certificate_no',c.certificate_no,'certificate_type',c.certificate_type,
        'issued_on',c.issued_on,'title_ar',c.title_ar,'title_en',c.title_en,
        'average_score',c.average_score,'verification_code',c.verification_code
      ) order by c.issued_on desc)
      from school_certificates c
      where c.student_id=p_student_id and c.is_valid=true
    ),'[]'::jsonb),

    'books',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'title_ar',b.title_ar,'title_en',b.title_en,'book_type',b.book_type,
        'file_url',b.file_url,'cover_url',b.cover_url,'is_downloadable',b.is_downloadable,
        'subject_ar',subj.name_ar
      ) order by b.title_ar)
      from school_books b
      left join school_subjects subj on subj.id=b.subject_id
      where b.is_published=true
        and b.audience in('student','both')
        and (b.academic_year_id is null or b.academic_year_id=en.academic_year_id)
        and (b.curriculum_id is null or b.curriculum_id=en.curriculum_id)
        and (b.grade_level_id is null or b.grade_level_id=en.grade_level_id)
    ),'[]'::jsonb)
  );
end $$;

grant execute on function public.school_parent_child_portal(uuid) to authenticated;

-- Safe parent profile update
create or replace function public.school_update_my_parent_contact(
  p_phone text,p_whatsapp text,p_email text,p_address text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare pid uuid;
begin
  pid:=public.current_school_parent_id();
  if pid is null then raise exception 'Parent access required'; end if;
  if nullif(trim(coalesce(p_email,'')),'') is null then raise exception 'Parent email is required'; end if;

  update school_parents
  set phone=nullif(trim(p_phone),''),
      whatsapp=nullif(trim(p_whatsapp),''),
      email=lower(trim(p_email)),
      address=nullif(trim(p_address),''),
      updated_at=now()
  where id=pid;

  return pid;
end $$;
grant execute on function public.school_update_my_parent_contact(text,text,text,text) to authenticated;

create or replace function public.school_parent_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare pid uuid; p school_parents%rowtype;
begin
  pid:=public.current_school_parent_id();
  if pid is null then raise exception 'Parent access required'; end if;
  select * into p from school_parents where id=pid;
  return jsonb_build_object(
    'id',p.id,'full_name',p.full_name,'phone',p.phone,'whatsapp',p.whatsapp,
    'email',p.email,'address',p.address,'occupation',p.occupation
  );
end $$;
grant execute on function public.school_parent_profile() to authenticated;

create or replace function public.school_s12_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
 select jsonb_build_object(
   'parents',(select count(*) from school_parents where is_active=true),
   'parent_student_links',(select count(*) from school_parent_students),
   'parents_with_auth',(select count(*) from school_parents where is_active=true and auth_user_id is not null),
   'sibling_families',(
     select count(*) from(
       select parent_id from school_parent_students group by parent_id having count(*)>1
     )x
   )
 );
$$;
grant execute on function public.school_s12_health() to authenticated;

select public.school_s12_health();
