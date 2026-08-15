-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S10 BIG
-- REPORT CARDS + ANNUAL RESULTS + PROMOTION + CERTIFICATES
-- TRANSCRIPT + CERTIFICATE VERIFICATION
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Annual result / promotion decision
create table if not exists public.school_annual_results (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  student_id uuid not null references public.school_students(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  average_score numeric(8,2),
  total_score numeric(12,2),
  max_total_score numeric(12,2),
  failed_subjects integer not null default 0,
  result_status text not null default 'draft'
    check(result_status in('draft','pass','fail','withheld')),
  promotion_status text not null default 'pending'
    check(promotion_status in('pending','promoted','repeated','graduated','transferred')),
  rank_in_class integer,
  teacher_comment text,
  principal_comment text,
  is_published boolean not null default false,
  published_at timestamptz,
  built_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id)
);

-- 2) Promotion history / academic lifecycle
create table if not exists public.school_promotion_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.school_students(id) on delete cascade,
  from_enrollment_id uuid not null references public.school_enrollments(id) on delete restrict,
  to_enrollment_id uuid references public.school_enrollments(id) on delete set null,
  from_academic_year_id uuid not null references public.school_academic_years(id) on delete restrict,
  to_academic_year_id uuid references public.school_academic_years(id) on delete set null,
  from_grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  to_grade_level_id uuid references public.school_grade_levels(id) on delete set null,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  action text not null check(action in('promote','repeat','graduate','transfer')),
  reason text,
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz not null default now()
);

-- 3) Enhance existing certificates
alter table public.school_certificates
  add column if not exists student_id uuid references public.school_students(id) on delete cascade,
  add column if not exists grade_level_id uuid references public.school_grade_levels(id) on delete set null,
  add column if not exists curriculum_id uuid references public.school_curricula(id) on delete set null,
  add column if not exists average_score numeric(8,2),
  add column if not exists verification_code text,
  add column if not exists is_valid boolean not null default true,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

create unique index if not exists school_certificates_verification_code_uidx
on public.school_certificates(verification_code)
where verification_code is not null;

create sequence if not exists public.school_certificate_no_seq start 1001;

create or replace function public.school_set_certificate_identity()
returns trigger
language plpgsql
as $$
begin
  if new.certificate_no is null or trim(new.certificate_no)='' then
    new.certificate_no :=
      'NAJ-CERT-'||to_char(current_date,'YYYY')||'-'||
      lpad(nextval('public.school_certificate_no_seq')::text,6,'0');
  end if;

  if new.verification_code is null or trim(new.verification_code)='' then
    new.verification_code :=
      upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
  end if;

  return new;
end $$;

drop trigger if exists trg_school_certificate_identity on public.school_certificates;
create trigger trg_school_certificate_identity
before insert on public.school_certificates
for each row execute function public.school_set_certificate_identity();

-- Existing table originally required certificate_no.
-- Trigger can now generate it if callers supply an empty string.


-- 4A) Build term report cards for a whole class
create or replace function public.school_build_section_report_cards(
  p_class_section_id uuid,
  p_term_no integer
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare r record; n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  if p_term_no not between 1 and 3 then raise exception 'Invalid term'; end if;

  for r in
    select id
    from school_enrollments
    where class_section_id=p_class_section_id
      and status in('active','completed')
  loop
    perform public.school_build_report_card(r.id,p_term_no);
    n:=n+1;
  end loop;

  return n;
end $$;
grant execute on function public.school_build_section_report_cards(uuid,integer) to authenticated;

-- Financial clearance for publishing results/certificates.
create or replace function public.school_enrollment_financial_clear(p_enrollment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_due numeric:=0; v_clearance boolean:=false;
begin
  select exists(
    select 1 from school_financial_clearance fc
    where fc.enrollment_id=p_enrollment_id
      and fc.is_active=true
      and fc.valid_from<=current_date
      and (fc.valid_until is null or fc.valid_until>=current_date)
  ) into v_clearance;

  if v_clearance then
    return jsonb_build_object('clear',true,'reason','financial_clearance','outstanding',0);
  end if;

  select coalesce(sum(greatest(amount-paid_amount,0)),0)
  into v_due
  from school_installments
  where enrollment_id=p_enrollment_id
    and status not in('paid','waived');

  return jsonb_build_object(
    'clear',v_due<=0,
    'reason',case when v_due<=0 then 'paid' else 'outstanding_fees' end,
    'outstanding',v_due
  );
end $$;
grant execute on function public.school_enrollment_financial_clear(uuid) to authenticated;

create or replace function public.school_publish_report_card(p_report_card_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rc school_report_cards%rowtype; fin jsonb; rid uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  select * into rc from school_report_cards where id=p_report_card_id;
  if not found then raise exception 'Report card not found'; end if;

  fin:=public.school_enrollment_financial_clear(rc.enrollment_id);
  if coalesce((fin->>'clear')::boolean,false)=false then
    raise exception 'Outstanding fees prevent report card publication. Outstanding: %',fin->>'outstanding';
  end if;

  update school_report_cards
  set is_published=true,published_at=now(),updated_at=now()
  where id=p_report_card_id
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_publish_report_card(uuid) to authenticated;

create or replace function public.school_publish_annual_result(p_annual_result_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare ar school_annual_results%rowtype; fin jsonb; rid uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  select * into ar from school_annual_results where id=p_annual_result_id;
  if not found then raise exception 'Annual result not found'; end if;

  fin:=public.school_enrollment_financial_clear(ar.enrollment_id);
  if coalesce((fin->>'clear')::boolean,false)=false then
    raise exception 'Outstanding fees prevent annual result publication. Outstanding: %',fin->>'outstanding';
  end if;

  update school_annual_results
  set is_published=true,published_at=now(),updated_at=now()
  where id=p_annual_result_id
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_publish_annual_result(uuid) to authenticated;


-- 4) Annual result calculation
create or replace function public.school_build_annual_result(p_enrollment_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  v_total numeric:=0;
  v_max numeric:=0;
  v_avg numeric;
  v_failed integer:=0;
  v_result text:='draft';
  rid uuid;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  select * into e from school_enrollments where id=p_enrollment_id;
  if not found then raise exception 'Enrollment not found'; end if;

  select
    coalesce(sum(r.score),0),
    coalesce(sum(ex.max_score),0)
  into v_total,v_max
  from school_exam_results r
  join school_exams ex on ex.id=r.exam_id
  join school_exam_periods ep on ep.id=ex.exam_period_id
  where r.enrollment_id=e.id
    and ep.academic_year_id=e.academic_year_id
    and r.status='present'
    and r.score is not null;

  if v_max>0 then
    v_avg:=round((v_total/v_max)*100,2);

    select count(*) into v_failed
    from (
      select
        ex.subject_id,
        case
          when sum(ex.max_score)>0
          then (sum(r.score)/sum(ex.max_score))*100
          else 0
        end subject_pct,
        coalesce(gs.pass_mark,50) pass_mark
      from school_exam_results r
      join school_exams ex on ex.id=r.exam_id
      join school_exam_periods ep on ep.id=ex.exam_period_id
      left join school_grade_subjects gs
        on gs.academic_year_id=e.academic_year_id
       and gs.grade_level_id=e.grade_level_id
       and gs.curriculum_id=e.curriculum_id
       and gs.subject_id=ex.subject_id
       and gs.is_active=true
      where r.enrollment_id=e.id
        and ep.academic_year_id=e.academic_year_id
        and r.status='present'
        and r.score is not null
      group by ex.subject_id,gs.pass_mark
    ) q
    where q.subject_pct<q.pass_mark;

    v_result:=case
      when v_avg>=50 and v_failed=0 then 'pass'
      else 'fail'
    end;
  end if;

  insert into school_annual_results(
    enrollment_id,academic_year_id,student_id,grade_level_id,curriculum_id,
    average_score,total_score,max_total_score,failed_subjects,result_status,built_at
  )
  values(
    e.id,e.academic_year_id,e.student_id,e.grade_level_id,e.curriculum_id,
    v_avg,v_total,v_max,v_failed,v_result,now()
  )
  on conflict(enrollment_id) do update
  set average_score=excluded.average_score,
      total_score=excluded.total_score,
      max_total_score=excluded.max_total_score,
      failed_subjects=excluded.failed_subjects,
      result_status=excluded.result_status,
      built_at=now(),
      updated_at=now()
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_build_annual_result(uuid) to authenticated;

-- 5) Build all annual results for a section
create or replace function public.school_build_section_annual_results(p_class_section_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  for r in
    select id
    from school_enrollments
    where class_section_id=p_class_section_id
      and status='active'
  loop
    perform public.school_build_annual_result(r.id);
    n:=n+1;
  end loop;

  -- Rank by annual average inside the class.
  with ranked as (
    select
      ar.id,
      row_number() over(order by ar.average_score desc nulls last) rk
    from school_annual_results ar
    join school_enrollments e on e.id=ar.enrollment_id
    where e.class_section_id=p_class_section_id
      and ar.result_status in('pass','fail')
  )
  update school_annual_results ar
  set rank_in_class=ranked.rk::integer,updated_at=now()
  from ranked
  where ar.id=ranked.id;

  return n;
end $$;
grant execute on function public.school_build_section_annual_results(uuid) to authenticated;

-- 6) Promotion / repeat / graduation
create or replace function public.school_process_promotion(
  p_enrollment_id uuid,
  p_action text,
  p_next_academic_year_id uuid,
  p_next_class_section_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  current_grade school_grade_levels%rowtype;
  next_grade school_grade_levels%rowtype;
  target_section school_class_sections%rowtype;
  new_enrollment_id uuid;
  ar school_annual_results%rowtype;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  if p_action not in('promote','repeat','graduate','transfer') then
    raise exception 'Invalid promotion action';
  end if;

  select * into e from school_enrollments where id=p_enrollment_id for update;
  if not found then raise exception 'Enrollment not found'; end if;

  select * into current_grade from school_grade_levels where id=e.grade_level_id;

  perform public.school_build_annual_result(e.id);
  select * into ar from school_annual_results where enrollment_id=e.id;

  if p_action='promote' and ar.result_status<>'pass' then
    raise exception 'Student annual result is not PASS';
  end if;

  if p_action in('promote','repeat') and p_next_academic_year_id is null then
    raise exception 'Next academic year is required';
  end if;

  if p_action in('promote','repeat') and p_next_academic_year_id=e.academic_year_id then
    raise exception 'Next academic year must be different from current year';
  end if;

  if p_action='graduate' and exists(
    select 1 from school_grade_levels g
    where g.is_active=true and g.sort_order>current_grade.sort_order
  ) then
    raise exception 'Graduation is allowed only from the final grade';
  end if;

  if p_action='promote' then
    select * into next_grade
    from school_grade_levels
    where is_active=true
      and sort_order>current_grade.sort_order
    order by sort_order
    limit 1;

    if not found then
      raise exception 'No next grade. Use graduate action';
    end if;
  elsif p_action='repeat' then
    next_grade:=current_grade;
  end if;

  if p_action in('promote','repeat') and p_next_class_section_id is not null then
    select * into target_section
    from school_class_sections
    where id=p_next_class_section_id;

    if not found then raise exception 'Target class section not found'; end if;
    if target_section.academic_year_id<>p_next_academic_year_id then
      raise exception 'Target section is not in next academic year';
    end if;
    if target_section.curriculum_id<>e.curriculum_id then
      raise exception 'Target section curriculum mismatch';
    end if;
    if target_section.grade_level_id<>next_grade.id then
      raise exception 'Target section grade mismatch';
    end if;
  end if;

  update school_enrollments
  set status=case
      when p_action='transfer' then 'transferred'
      else 'completed'
    end,
    updated_at=now()
  where id=e.id;

  if p_action in('promote','repeat') then
    insert into school_enrollments(
      student_id,academic_year_id,grade_level_id,curriculum_id,class_section_id,status,enrolled_on
    )
    values(
      e.student_id,p_next_academic_year_id,next_grade.id,e.curriculum_id,
      p_next_class_section_id,'active',current_date
    )
    on conflict(student_id,academic_year_id) do update
    set grade_level_id=excluded.grade_level_id,
        curriculum_id=excluded.curriculum_id,
        class_section_id=excluded.class_section_id,
        status='active',
        updated_at=now()
    returning id into new_enrollment_id;

    update school_annual_results
    set promotion_status=case when p_action='promote' then 'promoted' else 'repeated' end,
        updated_at=now()
    where enrollment_id=e.id;
  elsif p_action='graduate' then
    update school_students
    set status='graduated',updated_at=now()
    where id=e.student_id;

    update school_annual_results
    set promotion_status='graduated',updated_at=now()
    where enrollment_id=e.id;
  else
    update school_annual_results
    set promotion_status='transferred',updated_at=now()
    where enrollment_id=e.id;
  end if;

  insert into school_promotion_history(
    student_id,from_enrollment_id,to_enrollment_id,
    from_academic_year_id,to_academic_year_id,
    from_grade_level_id,to_grade_level_id,curriculum_id,
    action,reason,processed_by
  )
  values(
    e.student_id,e.id,new_enrollment_id,
    e.academic_year_id,
    case when p_action in('promote','repeat') then p_next_academic_year_id else null end,
    e.grade_level_id,
    case when p_action in('promote','repeat') then next_grade.id else null end,
    e.curriculum_id,p_action,nullif(trim(coalesce(p_reason,'')),''),auth.uid()
  );

  return jsonb_build_object(
    'student_id',e.student_id,
    'action',p_action,
    'old_enrollment_id',e.id,
    'new_enrollment_id',new_enrollment_id,
    'new_grade_level_id',case when p_action in('promote','repeat') then next_grade.id else null end
  );
end $$;
grant execute on function public.school_process_promotion(uuid,text,uuid,uuid,text) to authenticated;

-- 7) Bulk promote PASS students from one section.
create or replace function public.school_bulk_promote_section(
  p_from_class_section_id uuid,
  p_next_academic_year_id uuid,
  p_next_class_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  passed_count integer:=0;
  failed_count integer:=0;
  promoted_count integer:=0;
  source_section school_class_sections%rowtype;
  current_grade school_grade_levels%rowtype;
  next_grade school_grade_levels%rowtype;
  curriculum_code text;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  select * into source_section
  from school_class_sections
  where id=p_from_class_section_id;

  if not found then raise exception 'Source section not found'; end if;

  select * into current_grade from school_grade_levels where id=source_section.grade_level_id;
  select code into curriculum_code from school_curricula where id=source_section.curriculum_id;

  select * into next_grade
  from school_grade_levels
  where is_active=true and sort_order>current_grade.sort_order
  order by sort_order
  limit 1;

  if not found then raise exception 'No next grade. Graduating class must use graduate action'; end if;

  perform public.school_build_section_annual_results(p_from_class_section_id);

  for r in
    select e.id,ar.result_status
    from school_enrollments e
    join school_annual_results ar on ar.enrollment_id=e.id
    where e.class_section_id=p_from_class_section_id
      and e.status='active'
  loop
    if r.result_status='pass' then
      perform public.school_process_promotion(
        r.id,'promote',p_next_academic_year_id,p_next_class_section_id,'Bulk class promotion'
      );
      passed_count:=passed_count+1;
      promoted_count:=promoted_count+1;
    else
      failed_count:=failed_count+1;
    end if;
  end loop;

  -- Arabic P1 -> P2 -> P3 class teacher follows the cohort.
  if curriculum_code='AR' and current_grade.code in('P1','P2') then
    update school_class_teacher_cycles
    set current_academic_year_id=p_next_academic_year_id,
        current_grade_level_id=next_grade.id,
        current_class_section_id=p_next_class_section_id,
        cycle_year=least(cycle_year+1,3),
        updated_at=now()
    where curriculum_id=source_section.curriculum_id
      and current_academic_year_id=source_section.academic_year_id
      and current_grade_level_id=source_section.grade_level_id
      and status='active';
  elsif curriculum_code='AR' and current_grade.code='P3' then
    update school_class_teacher_cycles
    set status='completed',updated_at=now()
    where curriculum_id=source_section.curriculum_id
      and current_academic_year_id=source_section.academic_year_id
      and current_grade_level_id=source_section.grade_level_id
      and status='active';
  end if;

  return jsonb_build_object(
    'passed',passed_count,
    'failed_or_draft',failed_count,
    'promoted',promoted_count
  );
end $$;
grant execute on function public.school_bulk_promote_section(uuid,uuid,uuid) to authenticated;

-- 8) Issue certificate
create or replace function public.school_issue_certificate(
  p_enrollment_id uuid,
  p_certificate_type text,
  p_title_ar text,
  p_title_en text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  s school_students%rowtype;
  ar school_annual_results%rowtype;
  cid uuid;
  cno text;
  vcode text;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  select * into e from school_enrollments where id=p_enrollment_id;
  if not found then raise exception 'Enrollment not found'; end if;

  select * into s from school_students where id=e.student_id;

  perform public.school_build_annual_result(e.id);
  select * into ar from school_annual_results where enrollment_id=e.id;

  if coalesce((public.school_enrollment_financial_clear(e.id)->>'clear')::boolean,false)=false then
    raise exception 'Outstanding fees prevent certificate issuance';
  end if;

  if p_certificate_type in('completion','promotion','graduation')
     and ar.result_status<>'pass' then
    raise exception 'Certificate requires PASS annual result';
  end if;

  insert into school_certificates(
    enrollment_id,academic_year_id,certificate_no,certificate_type,
    title_ar,title_en,issued_by,student_id,grade_level_id,curriculum_id,
    average_score,verification_code
  )
  values(
    e.id,e.academic_year_id,'',coalesce(nullif(trim(p_certificate_type),''),'completion'),
    coalesce(nullif(trim(p_title_ar),''),'شهادة إتمام'),
    nullif(trim(coalesce(p_title_en,'')),''),
    auth.uid(),e.student_id,e.grade_level_id,e.curriculum_id,
    ar.average_score,null
  )
  returning id,certificate_no,verification_code into cid,cno,vcode;

  return jsonb_build_object(
    'certificate_id',cid,
    'certificate_no',cno,
    'verification_code',vcode
  );
end $$;
grant execute on function public.school_issue_certificate(uuid,text,text,text) to authenticated;

-- 9) Revoke certificate without deleting audit history
create or replace function public.school_revoke_certificate(p_certificate_id uuid,p_reason text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  update school_certificates
  set is_valid=false,revoked_at=now(),revoked_reason=p_reason
  where id=p_certificate_id
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_revoke_certificate(uuid,text) to authenticated;

-- 10) Public certificate verification
create or replace function public.school_verify_certificate(p_code text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((
    select jsonb_build_object(
      'valid',c.is_valid,
      'certificate_no',c.certificate_no,
      'certificate_type',c.certificate_type,
      'title_ar',c.title_ar,
      'title_en',c.title_en,
      'issued_on',c.issued_on,
      'student_name_ar',s.full_name_ar,
      'student_name_en',s.full_name_en,
      'student_no',s.student_no,
      'academic_year',y.name,
      'grade_ar',g.name_ar,
      'grade_en',g.name_en,
      'curriculum_ar',cu.name_ar,
      'curriculum_en',cu.name_en,
      'average_score',c.average_score,
      'revoked_reason',case when c.is_valid then null else c.revoked_reason end
    )
    from school_certificates c
    join school_students s on s.id=coalesce(c.student_id,(select e.student_id from school_enrollments e where e.id=c.enrollment_id))
    join school_academic_years y on y.id=c.academic_year_id
    left join school_grade_levels g on g.id=c.grade_level_id
    left join school_curricula cu on cu.id=c.curriculum_id
    where upper(c.verification_code)=upper(trim(p_code))
    limit 1
  ),jsonb_build_object('valid',false,'not_found',true));
$$;
grant execute on function public.school_verify_certificate(text) to anon,authenticated;

-- 11) Transcript RPC. Accessible by admin, student self, or linked parent.
create or replace function public.school_student_transcript(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  allowed boolean:=false;
  payload jsonb;
begin
  allowed:=public.is_school_admin()
    or exists(select 1 from school_students s where s.id=p_student_id and s.auth_user_id=auth.uid())
    or exists(
      select 1
      from school_parent_students ps
      join school_parents p on p.id=ps.parent_id
      where ps.student_id=p_student_id
        and p.auth_user_id=auth.uid()
        and ps.can_receive_results=true
    );

  if not allowed then raise exception 'Not allowed'; end if;

  select jsonb_build_object(
    'student',jsonb_build_object(
      'id',s.id,'student_no',s.student_no,'full_name_ar',s.full_name_ar,
      'full_name_en',s.full_name_en,'status',s.status
    ),
    'years',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enrollment_id',e.id,
          'academic_year',y.name,
          'grade_ar',g.name_ar,
          'grade_en',g.name_en,
          'curriculum_ar',c.name_ar,
          'curriculum_en',c.name_en,
          'enrollment_status',e.status,
          'annual_average',ar.average_score,
          'annual_result',ar.result_status,
          'promotion_status',ar.promotion_status,
          'rank',ar.rank_in_class,
          'subjects',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'subject_ar',sub.name_ar,
                'subject_en',sub.name_en,
                'score',q.score,
                'max_score',q.max_score,
                'percentage',q.percentage
              ) order by sub.name_ar
            )
            from (
              select
                ex.subject_id,
                round(sum(r.score),2) score,
                round(sum(ex.max_score),2) max_score,
                round(case when sum(ex.max_score)>0 then (sum(r.score)/sum(ex.max_score))*100 else 0 end,2) percentage
              from school_exam_results r
              join school_exams ex on ex.id=r.exam_id
              join school_exam_periods ep on ep.id=ex.exam_period_id
              where r.enrollment_id=e.id
                and ep.academic_year_id=e.academic_year_id
                and r.status='present'
                and r.score is not null
              group by ex.subject_id
            ) q
            join school_subjects sub on sub.id=q.subject_id
          ),'[]'::jsonb)
        )
        order by y.starts_on
      )
      from school_enrollments e
      join school_academic_years y on y.id=e.academic_year_id
      join school_grade_levels g on g.id=e.grade_level_id
      join school_curricula c on c.id=e.curriculum_id
      left join school_annual_results ar on ar.enrollment_id=e.id
      where e.student_id=s.id
    ),'[]'::jsonb)
  )
  into payload
  from school_students s
  where s.id=p_student_id;

  return payload;
end $$;
grant execute on function public.school_student_transcript(uuid) to authenticated;

-- 12) RLS
alter table public.school_annual_results enable row level security;
alter table public.school_promotion_history enable row level security;

drop policy if exists school_annual_results_admin_all on school_annual_results;
create policy school_annual_results_admin_all
on school_annual_results for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists school_promotion_history_admin_all on school_promotion_history;
create policy school_promotion_history_admin_all
on school_promotion_history for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists school_annual_results_student_read on school_annual_results;
create policy school_annual_results_student_read
on school_annual_results for select to authenticated
using(
  is_published=true
  and student_id in(select id from school_students where auth_user_id=auth.uid())
);

drop policy if exists school_annual_results_parent_read on school_annual_results;
create policy school_annual_results_parent_read
on school_annual_results for select to authenticated
using(
  is_published=true
  and student_id in(
    select ps.student_id
    from school_parent_students ps
    join school_parents p on p.id=ps.parent_id
    where p.auth_user_id=auth.uid()
      and ps.can_receive_results=true
  )
);

-- Student certificate read
drop policy if exists school_certificates_student_read on school_certificates;
create policy school_certificates_student_read
on school_certificates for select to authenticated
using(
  student_id in(select id from school_students where auth_user_id=auth.uid())
);

drop policy if exists school_certificates_parent_read on school_certificates;
create policy school_certificates_parent_read
on school_certificates for select to authenticated
using(
  student_id in(
    select ps.student_id
    from school_parent_students ps
    join school_parents p on p.id=ps.parent_id
    where p.auth_user_id=auth.uid()
      and ps.can_receive_results=true
  )
);

-- 13) Health
create or replace function public.school_s10_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'annual_results',(select count(*) from school_annual_results),
    'passed',(select count(*) from school_annual_results where result_status='pass'),
    'failed',(select count(*) from school_annual_results where result_status='fail'),
    'promotions',(select count(*) from school_promotion_history where action='promote'),
    'graduates',(select count(*) from school_promotion_history where action='graduate'),
    'certificates',(select count(*) from school_certificates),
    'valid_certificates',(select count(*) from school_certificates where is_valid=true)
  );
$$;
grant execute on function public.school_s10_health() to authenticated;

select public.school_s10_health();
