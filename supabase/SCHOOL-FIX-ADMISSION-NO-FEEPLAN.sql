-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — BLOCKING HOTFIX
-- Admission must NOT fail when Fee Plan is missing.
-- Sibling discount remains 10% as a policy percentage.
-- Amount is calculated later when a Fee Plan exists.
-- ============================================================

create or replace function public.school_refresh_sibling_discount(p_enrollment_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  pct numeric;
  fp school_fee_plans%rowtype;
  e school_enrollments%rowtype;
  disc_amount numeric:=0;
  plan_found boolean:=false;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 select * into e from school_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment not found'; end if;

 pct:=public.school_sibling_discount_percent(e.id);

 select * into fp from school_fee_plans
 where academic_year_id=e.academic_year_id
   and grade_level_id=e.grade_level_id
   and curriculum_id=e.curriculum_id
   and is_active=true
 limit 1;

 plan_found:=found;

 if plan_found then
   disc_amount:=round(fp.annual_tuition*pct/100,2);
 else
   disc_amount:=0;
 end if;

 if pct>0 then
   insert into school_enrollment_discounts(
     enrollment_id,discount_type,percent,amount,applies_to,reason,created_by
   )
   values(
     e.id,'sibling',pct,disc_amount,'tuition',
     case when plan_found
       then 'خصم أشقاء 10% على الرسوم الدراسية'
       else 'خصم أشقاء 10% — بانتظار إنشاء خطة الرسوم'
     end,
     auth.uid()
   )
   on conflict(enrollment_id,discount_type) do update
   set percent=excluded.percent,
       amount=excluded.amount,
       applies_to='tuition',
       reason=excluded.reason,
       is_active=true,
       updated_at=now();
 else
   update school_enrollment_discounts
   set is_active=false,percent=0,amount=0,updated_at=now()
   where enrollment_id=e.id and discount_type='sibling';
 end if;

 return jsonb_build_object(
   'discount_percent',pct,
   'discount_amount',disc_amount,
   'fee_plan_found',plan_found,
   'gross_tuition',case when plan_found then fp.annual_tuition else null end,
   'net_tuition',case when plan_found then round(fp.annual_tuition-disc_amount,2) else null end
 );
end $$;

grant execute on function public.school_refresh_sibling_discount(uuid) to authenticated;


create or replace function public.school_enroll_admission(p_application_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  a school_admission_applications%rowtype;
  pid uuid;
  sid uuid;
  eid uuid;
  discount_pct numeric;
  discount_info jsonb;
  parent_was_reused boolean:=false;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 select * into a
 from school_admission_applications
 where id=p_application_id
 for update;

 if not found then raise exception 'Application not found'; end if;
 if a.status<>'accepted' then raise exception 'Application must be accepted first'; end if;

 if a.academic_year_id is null or a.curriculum_id is null or a.grade_level_id is null then
   raise exception 'Academic year, curriculum and grade are required';
 end if;

 if nullif(trim(coalesce(a.parent_email,'')),'') is null then
   raise exception 'Parent email is required before enrollment';
 end if;

 pid:=a.parent_id;

 if pid is null then
   select p.id into pid
   from school_parents p
   where p.is_active=true
     and (
       lower(trim(coalesce(p.email,'')))=lower(trim(a.parent_email))
       or (
         nullif(trim(coalesce(a.parent_phone,'')),'') is not null
         and regexp_replace(coalesce(p.phone,''),'\D','','g')=
             regexp_replace(a.parent_phone,'\D','','g')
       )
       or (
         nullif(trim(coalesce(a.parent_national_id,'')),'') is not null
         and trim(coalesce(p.national_id,''))=trim(a.parent_national_id)
       )
     )
   order by created_at
   limit 1;
 end if;

 if pid is null then
   insert into school_parents(
     full_name,national_id,phone,whatsapp,email,address,is_active
   )
   values(
     a.parent_name,a.parent_national_id,a.parent_phone,a.parent_phone,
     a.parent_email,a.address,true
   )
   returning id into pid;
 else
   parent_was_reused:=true;

   update school_parents
   set full_name=coalesce(nullif(trim(a.parent_name),''),full_name),
       phone=coalesce(nullif(trim(a.parent_phone),''),phone),
       email=coalesce(nullif(trim(a.parent_email),''),email),
       national_id=coalesce(nullif(trim(a.parent_national_id),''),national_id),
       updated_at=now()
   where id=pid;
 end if;

 insert into school_students(
   full_name_ar,full_name_en,gender,date_of_birth,nationality,
   email,status,admission_date,notes
 )
 values(
   a.student_name_ar,a.student_name_en,a.gender,a.birth_date,
   coalesce(a.nationality,'Sudanese'),
   null,'active',current_date,
   'Created from admission '||a.application_no
 )
 returning id into sid;

 insert into school_parent_students(
   parent_id,student_id,relation,is_primary
 )
 values(pid,sid,'ولي أمر',true)
 on conflict(parent_id,student_id)
 do update set is_primary=true;

 insert into school_enrollments(
   student_id,academic_year_id,grade_level_id,curriculum_id,status,enrolled_on
 )
 values(
   sid,a.academic_year_id,a.grade_level_id,a.curriculum_id,'active',current_date
 )
 returning id into eid;

 discount_pct:=public.school_sibling_discount_percent(eid);

 -- IMPORTANT:
 -- This function now NEVER blocks enrollment when Fee Plan is missing.
 discount_info:=public.school_refresh_sibling_discount(eid);

 update school_admission_applications
 set parent_id=pid,
     sibling_detected=(discount_pct>0),
     sibling_discount_percent=discount_pct,
     status='enrolled',
     updated_at=now()
 where id=a.id;

 return jsonb_build_object(
   'student_id',sid,
   'parent_id',pid,
   'enrollment_id',eid,
   'parent_reused',parent_was_reused,
   'sibling_discount_percent',discount_pct,
   'fee_plan_found',coalesce((discount_info->>'fee_plan_found')::boolean,false),
   'discount_amount',coalesce((discount_info->>'discount_amount')::numeric,0)
 );
end $$;

grant execute on function public.school_enroll_admission(uuid) to authenticated;


-- When installments are generated later, sibling discount amount
-- is recalculated from the now-existing fee plan.
create or replace function public.school_generate_installments(
  p_enrollment_id uuid,
  p_first_due_date date
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  e public.school_enrollments%rowtype;
  fp public.school_fee_plans%rowtype;
  i integer;
  each_amount numeric;
  created_count integer:=0;
  discount_total numeric:=0;
  net_tuition numeric:=0;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 select * into e from public.school_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment not found'; end if;

 select * into fp
 from public.school_fee_plans
 where academic_year_id=e.academic_year_id
   and grade_level_id=e.grade_level_id
   and curriculum_id=e.curriculum_id
   and is_active=true
 limit 1;

 if not found then
   raise exception 'Fee plan not found for this grade/curriculum';
 end if;

 -- Now that plan exists, calculate the real 10% sibling amount.
 perform public.school_refresh_sibling_discount(e.id);

 select coalesce(sum(amount),0)
 into discount_total
 from public.school_enrollment_discounts
 where enrollment_id=e.id
   and is_active=true
   and applies_to in('tuition','all');

 net_tuition:=greatest(fp.annual_tuition-discount_total,0);
 each_amount:=round(net_tuition/fp.installments_count,2);

 for i in 1..fp.installments_count loop
   insert into public.school_installments(
     enrollment_id,installment_no,title,due_date,amount,status
   )
   values(
     e.id,i,'Installment '||i,
     (p_first_due_date+make_interval(months=>i-1))::date,
     case
       when i=fp.installments_count
       then net_tuition-each_amount*(fp.installments_count-1)
       else each_amount
     end,
     'unpaid'
   )
   on conflict(enrollment_id,installment_no) do nothing;

   if found then created_count:=created_count+1; end if;
 end loop;

 return created_count;
end $$;

grant execute on function public.school_generate_installments(uuid,date) to authenticated;


select jsonb_build_object(
 'hotfix','OK',
 'rule','Admission no longer requires Fee Plan',
 'sibling_discount','10% tuition when plan exists'
);
