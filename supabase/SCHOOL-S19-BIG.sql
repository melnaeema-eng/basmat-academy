-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S19 BIG
-- HOMEWORK + EXAMS + UNIFIED GRADEBOOK
-- ============================================================

-- Existing homework is now term-aware.
alter table public.school_assignments
  add column if not exists term_no integer not null default 1
    check(term_no between 1 and 3);

-- Weight configuration by year / grade / curriculum / subject / term.
create table if not exists public.school_gradebook_settings (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete cascade,
  curriculum_id uuid not null references public.school_curricula(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete cascade,
  term_no integer not null check(term_no between 1 and 3),
  assignments_weight numeric(5,2) not null default 20 check(assignments_weight between 0 and 100),
  exams_weight numeric(5,2) not null default 80 check(exams_weight between 0 and 100),
  pass_mark numeric(5,2) not null default 50 check(pass_mark between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academic_year_id,grade_level_id,curriculum_id,subject_id,term_no),
  check(assignments_weight+exams_weight=100)
);

create table if not exists public.school_subject_term_grades (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete cascade,
  term_no integer not null check(term_no between 1 and 3),
  assignment_average numeric(8,2),
  exam_average numeric(8,2),
  final_score numeric(8,2),
  result_status text not null default 'draft' check(result_status in('draft','pass','fail','withheld')),
  calculated_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id,subject_id,term_no)
);

create table if not exists public.school_subject_annual_grades (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete cascade,
  annual_average numeric(8,2),
  result_status text not null default 'draft' check(result_status in('draft','pass','fail','withheld')),
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id,subject_id)
);

alter table public.school_gradebook_settings enable row level security;
alter table public.school_subject_term_grades enable row level security;
alter table public.school_subject_annual_grades enable row level security;

drop policy if exists school_gradebook_settings_admin_all on public.school_gradebook_settings;
create policy school_gradebook_settings_admin_all
on public.school_gradebook_settings for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_subject_term_grades_admin_all on public.school_subject_term_grades;
create policy school_subject_term_grades_admin_all
on public.school_subject_term_grades for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_subject_annual_grades_admin_all on public.school_subject_annual_grades;
create policy school_subject_annual_grades_admin_all
on public.school_subject_annual_grades for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_subject_term_grades_student_read on public.school_subject_term_grades;
create policy school_subject_term_grades_student_read
on public.school_subject_term_grades for select to authenticated
using(
  published_at is not null
  and public.school_can_access_enrollment(enrollment_id)
);

drop policy if exists school_subject_annual_grades_student_read on public.school_subject_annual_grades;
create policy school_subject_annual_grades_student_read
on public.school_subject_annual_grades for select to authenticated
using(public.school_can_access_enrollment(enrollment_id));

create or replace function public.school_save_gradebook_setting(
  p_academic_year_id uuid,
  p_grade_level_id uuid,
  p_curriculum_id uuid,
  p_subject_id uuid,
  p_term_no integer,
  p_assignments_weight numeric,
  p_exams_weight numeric,
  p_pass_mark numeric
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  if p_term_no not between 1 and 3 then raise exception 'Invalid term'; end if;
  if coalesce(p_assignments_weight,0)+coalesce(p_exams_weight,0)<>100 then
    raise exception 'Assignments + Exams weights must equal 100';
  end if;

  insert into school_gradebook_settings(
    academic_year_id,grade_level_id,curriculum_id,subject_id,term_no,
    assignments_weight,exams_weight,pass_mark
  )
  values(
    p_academic_year_id,p_grade_level_id,p_curriculum_id,p_subject_id,p_term_no,
    p_assignments_weight,p_exams_weight,p_pass_mark
  )
  on conflict(academic_year_id,grade_level_id,curriculum_id,subject_id,term_no)
  do update set
    assignments_weight=excluded.assignments_weight,
    exams_weight=excluded.exams_weight,
    pass_mark=excluded.pass_mark,
    updated_at=now()
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_save_gradebook_setting(uuid,uuid,uuid,uuid,integer,numeric,numeric,numeric) to authenticated;

create or replace function public.school_rebuild_subject_gradebook(
  p_class_section_id uuid,
  p_subject_id uuid,
  p_term_no integer
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  cs school_class_sections%rowtype;
  gs school_gradebook_settings%rowtype;
  e record;
  aavg numeric;
  eavg numeric;
  finalv numeric;
  denom numeric;
  n integer:=0;
begin
  if not public.is_school_admin()
     and not public.school_teacher_can_manage_class(p_class_section_id,p_subject_id)
  then raise exception 'Not allowed'; end if;

  if p_term_no not between 1 and 3 then raise exception 'Invalid term'; end if;

  select * into cs from school_class_sections where id=p_class_section_id;
  if not found then raise exception 'Class section not found'; end if;

  select * into gs
  from school_gradebook_settings
  where academic_year_id=cs.academic_year_id
    and grade_level_id=cs.grade_level_id
    and curriculum_id=cs.curriculum_id
    and subject_id=p_subject_id
    and term_no=p_term_no;

  if not found then
    insert into school_gradebook_settings(
      academic_year_id,grade_level_id,curriculum_id,subject_id,term_no,
      assignments_weight,exams_weight,pass_mark
    )
    values(cs.academic_year_id,cs.grade_level_id,cs.curriculum_id,p_subject_id,p_term_no,20,80,50)
    returning * into gs;
  end if;

  for e in
    select en.id
    from school_enrollments en
    where en.class_section_id=cs.id
      and en.status in('active','completed')
  loop
    select round(avg((ss.score/nullif(a.max_score,0))*100),2)
    into aavg
    from school_assignments a
    join school_assignment_submissions ss on ss.assignment_id=a.id
    where a.class_section_id=cs.id
      and a.subject_id=p_subject_id
      and a.term_no=p_term_no
      and ss.enrollment_id=e.id
      and ss.graded_at is not null
      and ss.score is not null
      and a.max_score>0;

    select round(avg((r.score/nullif(ex.max_score,0))*100),2)
    into eavg
    from school_exam_results r
    join school_exams ex on ex.id=r.exam_id
    join school_exam_periods ep on ep.id=ex.exam_period_id
    where r.enrollment_id=e.id
      and ex.class_section_id=cs.id
      and ex.subject_id=p_subject_id
      and ep.term_no=p_term_no
      and r.status='present'
      and r.score is not null
      and ex.max_score>0;

    denom :=
      (case when aavg is not null then gs.assignments_weight else 0 end)
      +(case when eavg is not null then gs.exams_weight else 0 end);

    if denom=0 then
      finalv:=null;
    else
      finalv:=round(
        (
          coalesce(aavg*gs.assignments_weight,0)
          +coalesce(eavg*gs.exams_weight,0)
        )/denom,2
      );
    end if;

    insert into school_subject_term_grades(
      enrollment_id,academic_year_id,subject_id,term_no,
      assignment_average,exam_average,final_score,result_status,calculated_at
    )
    values(
      e.id,cs.academic_year_id,p_subject_id,p_term_no,
      aavg,eavg,finalv,
      case when finalv is null then 'draft'
           when finalv>=gs.pass_mark then 'pass'
           else 'fail' end,
      now()
    )
    on conflict(enrollment_id,subject_id,term_no)
    do update set
      assignment_average=excluded.assignment_average,
      exam_average=excluded.exam_average,
      final_score=excluded.final_score,
      result_status=excluded.result_status,
      calculated_at=now(),
      updated_at=now();

    n:=n+1;
  end loop;

  return n;
end $$;
grant execute on function public.school_rebuild_subject_gradebook(uuid,uuid,integer) to authenticated;

create or replace function public.school_gradebook_class(
  p_class_section_id uuid,
  p_subject_id uuid,
  p_term_no integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare cs school_class_sections%rowtype;
begin
  if not public.is_school_admin()
     and not public.school_teacher_can_manage_class(p_class_section_id,p_subject_id)
  then raise exception 'Not allowed'; end if;

  select * into cs from school_class_sections where id=p_class_section_id;

  return jsonb_build_object(
    'setting',coalesce((
      select to_jsonb(g)
      from school_gradebook_settings g
      where g.academic_year_id=cs.academic_year_id
        and g.grade_level_id=cs.grade_level_id
        and g.curriculum_id=cs.curriculum_id
        and g.subject_id=p_subject_id
        and g.term_no=p_term_no
      limit 1
    ),jsonb_build_object(
      'assignments_weight',20,'exams_weight',80,'pass_mark',50
    )),
    'rows',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enrollment_id',e.id,
          'student_id',s.id,
          'student_no',s.student_no,
          'student_name',s.full_name_ar,
          'assignment_average',g.assignment_average,
          'exam_average',g.exam_average,
          'final_score',g.final_score,
          'result_status',coalesce(g.result_status,'draft'),
          'published_at',g.published_at
        )
        order by s.full_name_ar
      )
      from school_enrollments e
      join school_students s on s.id=e.student_id
      left join school_subject_term_grades g
        on g.enrollment_id=e.id
       and g.subject_id=p_subject_id
       and g.term_no=p_term_no
      where e.class_section_id=p_class_section_id
        and e.status in('active','completed')
    ),'[]'::jsonb)
  );
end $$;
grant execute on function public.school_gradebook_class(uuid,uuid,integer) to authenticated;

create or replace function public.school_publish_term_gradebook(
  p_class_section_id uuid,
  p_term_no integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e record;
  avgscore numeric;
  totalv numeric;
  maxv numeric;
  rid uuid;
  pub integer:=0;
  blocked integer:=0;
  fin jsonb;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  for e in
    select id,academic_year_id
    from school_enrollments
    where class_section_id=p_class_section_id
      and status in('active','completed')
  loop
    select round(avg(final_score),2),sum(final_score),count(*)*100
    into avgscore,totalv,maxv
    from school_subject_term_grades
    where enrollment_id=e.id
      and term_no=p_term_no
      and final_score is not null;

    insert into school_report_cards(
      enrollment_id,academic_year_id,term_no,average_score,total_score,max_total_score,
      result_status,attendance_present,attendance_absent
    )
    values(
      e.id,e.academic_year_id,p_term_no,avgscore,totalv,maxv,
      case when avgscore is null then 'draft'
           when exists(
             select 1 from school_subject_term_grades tg
             join school_gradebook_settings s
               on s.academic_year_id=tg.academic_year_id
              and s.subject_id=tg.subject_id
              and s.term_no=tg.term_no
             join school_enrollments en on en.id=tg.enrollment_id
             where tg.enrollment_id=e.id
               and tg.term_no=p_term_no
               and tg.final_score<s.pass_mark
           ) then 'fail'
           else 'pass' end,
      0,0
    )
    on conflict(enrollment_id,academic_year_id,term_no)
    do update set
      average_score=excluded.average_score,
      total_score=excluded.total_score,
      max_total_score=excluded.max_total_score,
      result_status=excluded.result_status,
      updated_at=now()
    returning id into rid;

    fin:=public.school_enrollment_financial_clear(e.id);
    if coalesce((fin->>'clear')::boolean,false) then
      update school_report_cards
      set is_published=true,published_at=now(),updated_at=now()
      where id=rid;

      update school_subject_term_grades
      set published_at=now(),updated_at=now()
      where enrollment_id=e.id and term_no=p_term_no;

      pub:=pub+1;
    else
      blocked:=blocked+1;
    end if;
  end loop;

  return jsonb_build_object('published',pub,'financially_blocked',blocked);
end $$;
grant execute on function public.school_publish_term_gradebook(uuid,integer) to authenticated;

create or replace function public.school_rebuild_annual_gradebook(
  p_class_section_id uuid
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  cs school_class_sections%rowtype;
  e record;
  sub record;
  avgv numeric;
  pm numeric;
  failed integer;
  overall numeric;
  n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  select * into cs from school_class_sections where id=p_class_section_id;
  if not found then raise exception 'Class section not found'; end if;

  for e in
    select en.*,st.id student_id
    from school_enrollments en
    join school_students st on st.id=en.student_id
    where en.class_section_id=cs.id
      and en.status in('active','completed')
  loop
    for sub in
      select gs.subject_id,gs.pass_mark
      from school_grade_subjects gs
      where gs.academic_year_id=cs.academic_year_id
        and gs.grade_level_id=cs.grade_level_id
        and gs.curriculum_id=cs.curriculum_id
        and gs.is_active=true
    loop
      select round(avg(final_score),2)
      into avgv
      from school_subject_term_grades
      where enrollment_id=e.id
        and subject_id=sub.subject_id
        and final_score is not null;

      insert into school_subject_annual_grades(
        enrollment_id,academic_year_id,subject_id,annual_average,result_status,calculated_at
      )
      values(
        e.id,cs.academic_year_id,sub.subject_id,avgv,
        case when avgv is null then 'draft'
             when avgv>=sub.pass_mark then 'pass'
             else 'fail' end,
        now()
      )
      on conflict(enrollment_id,subject_id)
      do update set
        annual_average=excluded.annual_average,
        result_status=excluded.result_status,
        calculated_at=now(),
        updated_at=now();
    end loop;

    select count(*) filter(where result_status='fail'),round(avg(annual_average),2)
    into failed,overall
    from school_subject_annual_grades
    where enrollment_id=e.id
      and annual_average is not null;

    insert into school_annual_results(
      enrollment_id,academic_year_id,student_id,grade_level_id,curriculum_id,
      average_score,total_score,max_total_score,failed_subjects,result_status,built_at
    )
    values(
      e.id,e.academic_year_id,e.student_id,e.grade_level_id,e.curriculum_id,
      overall,
      coalesce((select sum(annual_average) from school_subject_annual_grades where enrollment_id=e.id),0),
      coalesce((select count(*)*100 from school_subject_annual_grades where enrollment_id=e.id and annual_average is not null),0),
      coalesce(failed,0),
      case when overall is null then 'draft'
           when coalesce(failed,0)=0 and overall>=50 then 'pass'
           else 'fail' end,
      now()
    )
    on conflict(enrollment_id)
    do update set
      average_score=excluded.average_score,
      total_score=excluded.total_score,
      max_total_score=excluded.max_total_score,
      failed_subjects=excluded.failed_subjects,
      result_status=excluded.result_status,
      built_at=now(),
      updated_at=now();

    n:=n+1;
  end loop;

  return n;
end $$;
grant execute on function public.school_rebuild_annual_gradebook(uuid) to authenticated;

create or replace function public.school_s19_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'assignments',(select count(*) from school_assignments),
  'graded_submissions',(select count(*) from school_assignment_submissions where graded_at is not null),
  'exams',(select count(*) from school_exams),
  'exam_results',(select count(*) from school_exam_results),
  'question_bank',(select count(*) from school_question_bank where is_active=true),
  'online_attempts',(select count(*) from school_exam_attempts),
  'gradebook_settings',(select count(*) from school_gradebook_settings),
  'subject_term_grades',(select count(*) from school_subject_term_grades),
  'subject_annual_grades',(select count(*) from school_subject_annual_grades)
);
$$;
grant execute on function public.school_s19_health() to authenticated;

select public.school_s19_health();
