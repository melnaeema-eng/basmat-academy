-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S8 FAMILY REVISION
-- Parent Reuse + Sibling Detection + 10% Tuition Discount
-- Run AFTER SCHOOL-S8-BIG.sql
-- ============================================================

-- 1) Admission family fields
alter table public.school_admission_applications
  add column if not exists parent_id uuid references public.school_parents(id) on delete set null,
  add column if not exists parent_national_id text,
  add column if not exists sibling_detected boolean not null default false,
  add column if not exists sibling_discount_percent numeric(5,2) not null default 0
    check(sibling_discount_percent between 0 and 100);

-- 2) Transparent enrollment discounts
create table if not exists public.school_enrollment_discounts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  discount_type text not null check(discount_type in('sibling','manual','scholarship','staff')),
  percent numeric(5,2) not null default 0 check(percent between 0 and 100),
  amount numeric(12,2) not null default 0 check(amount >= 0),
  applies_to text not null default 'tuition'
    check(applies_to in('tuition','registration','other','all')),
  reason text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id,discount_type)
);

alter table public.school_enrollment_discounts enable row level security;
drop policy if exists school_enrollment_discounts_admin_all on public.school_enrollment_discounts;
create policy school_enrollment_discounts_admin_all
on public.school_enrollment_discounts for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

-- 3) Parent lookup — exact email / phone / national ID
create or replace function public.school_find_parent(
  p_email text,
  p_phone text,
  p_national_id text
)
returns table(
  parent_id uuid,
  full_name text,
  email text,
  phone text,
  national_id text,
  children_count bigint,
  active_children_count bigint
)
language sql stable security definer set search_path=public
as $$
 select
   p.id,
   p.full_name,
   p.email,
   p.phone,
   p.national_id,
   count(distinct ps.student_id),
   count(distinct ps.student_id) filter(
     where exists(
       select 1 from school_enrollments e
       where e.student_id=ps.student_id and e.status='active'
     )
   )
 from school_parents p
 left join school_parent_students ps on ps.parent_id=p.id
 where p.is_active=true
   and (
     (nullif(trim(coalesce(p_email,'')),'') is not null
       and lower(trim(coalesce(p.email,'')))=lower(trim(p_email)))
     or
     (nullif(trim(coalesce(p_phone,'')),'') is not null
       and regexp_replace(coalesce(p.phone,''),'\D','','g')=
           regexp_replace(p_phone,'\D','','g'))
     or
     (nullif(trim(coalesce(p_national_id,'')),'') is not null
       and trim(coalesce(p.national_id,''))=trim(p_national_id))
   )
 group by p.id,p.full_name,p.email,p.phone,p.national_id
 order by count(distinct ps.student_id) desc
 limit 10;
$$;
grant execute on function public.school_find_parent(text,text,text) to authenticated;

-- 4) Deterministic sibling discount:
-- first enrolled child in family/year = no sibling discount.
-- every later enrolled child sharing same parent = 10% tuition discount.
create or replace function public.school_sibling_discount_percent(p_enrollment_id uuid)
returns numeric
language plpgsql stable security definer set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  v_parent uuid;
  v_has_earlier boolean;
begin
 select * into e from school_enrollments where id=p_enrollment_id;
 if not found then return 0; end if;

 select ps.parent_id into v_parent
 from school_parent_students ps
 where ps.student_id=e.student_id
 order by ps.is_primary desc,ps.created_at
 limit 1;

 if v_parent is null then return 0; end if;

 select exists(
   select 1
   from school_parent_students ps2
   join school_enrollments e2 on e2.student_id=ps2.student_id
   where ps2.parent_id=v_parent
     and e2.academic_year_id=e.academic_year_id
     and e2.status in('active','completed')
     and e2.id<>e.id
     and (
       e2.created_at < e.created_at
       or (e2.created_at=e.created_at and e2.id::text < e.id::text)
     )
 ) into v_has_earlier;

 return case when v_has_earlier then 10 else 0 end;
end $$;
grant execute on function public.school_sibling_discount_percent(uuid) to authenticated;

-- 5) Register/update sibling discount record
create or replace function public.school_refresh_sibling_discount(p_enrollment_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  pct numeric;
  fp school_fee_plans%rowtype;
  e school_enrollments%rowtype;
  disc_amount numeric;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 select * into e from school_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment not found'; end if;

 select * into fp from school_fee_plans
 where academic_year_id=e.academic_year_id
   and grade_level_id=e.grade_level_id
   and curriculum_id=e.curriculum_id
   and is_active=true
 limit 1;

 if not found then raise exception 'Fee plan not found'; end if;

 pct:=public.school_sibling_discount_percent(e.id);
 disc_amount:=round(fp.annual_tuition*pct/100,2);

 if pct>0 then
   insert into school_enrollment_discounts(
     enrollment_id,discount_type,percent,amount,applies_to,reason,created_by
   )
   values(e.id,'sibling',pct,disc_amount,'tuition','خصم أشقاء 10% على الرسوم الدراسية',auth.uid())
   on conflict(enrollment_id,discount_type) do update
   set percent=excluded.percent,amount=excluded.amount,applies_to='tuition',
       reason=excluded.reason,is_active=true,updated_at=now();
 else
   update school_enrollment_discounts
   set is_active=false,percent=0,amount=0,updated_at=now()
   where enrollment_id=e.id and discount_type='sibling';
 end if;

 return jsonb_build_object(
   'discount_percent',pct,
   'discount_amount',disc_amount,
   'gross_tuition',fp.annual_tuition,
   'net_tuition',round(fp.annual_tuition-disc_amount,2)
 );
end $$;
grant execute on function public.school_refresh_sibling_discount(uuid) to authenticated;

-- 6) Upgrade installment generation to apply active TUITION discounts.
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
  created_count integer := 0;
  discount_total numeric := 0;
  net_tuition numeric := 0;
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
  if not found then raise exception 'Fee plan not found for this grade/curriculum'; end if;

  perform public.school_refresh_sibling_discount(e.id);

  select coalesce(sum(amount),0) into discount_total
  from public.school_enrollment_discounts
  where enrollment_id=e.id and is_active=true and applies_to in('tuition','all');

  net_tuition:=greatest(fp.annual_tuition-discount_total,0);
  each_amount:=round(net_tuition/fp.installments_count,2);

  for i in 1..fp.installments_count loop
    insert into public.school_installments(
      enrollment_id,installment_no,title,due_date,amount,status
    )
    values(
      e.id,i,'Installment '||i,
      (p_first_due_date + make_interval(months => i-1))::date,
      case when i=fp.installments_count
        then net_tuition-each_amount*(fp.installments_count-1)
        else each_amount end,
      'unpaid'
    )
    on conflict(enrollment_id,installment_no) do nothing;
    if found then created_count:=created_count+1; end if;
  end loop;

  return created_count;
end $$;

-- 7) Convert accepted admission to actual School records.
-- Reuses existing parent when parent_id is set/found.
create or replace function public.school_enroll_admission(p_application_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  a school_admission_applications%rowtype;
  pid uuid;
  sid uuid;
  eid uuid;
  existing_parent school_parents%rowtype;
  discount_pct numeric;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 select * into a from school_admission_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 if a.status<>'accepted' then raise exception 'Application must be accepted first'; end if;
 if a.academic_year_id is null or a.curriculum_id is null or a.grade_level_id is null then
   raise exception 'Academic year, curriculum and grade are required';
 end if;
 if nullif(trim(coalesce(a.parent_email,'')),'') is null then
   raise exception 'Parent email is required before enrollment';
 end if;

 pid:=a.parent_id;

 -- fallback exact lookup if no parent selected
 if pid is null then
   select p.id into pid
   from school_parents p
   where p.is_active=true and (
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
   insert into school_parents(full_name,national_id,phone,whatsapp,email,address,is_active)
   values(a.parent_name,a.parent_national_id,a.parent_phone,a.parent_phone,a.parent_email,a.address,true)
   returning id into pid;
 else
   update school_parents
   set full_name=coalesce(nullif(trim(a.parent_name),''),full_name),
       phone=coalesce(nullif(trim(a.parent_phone),''),phone),
       email=coalesce(nullif(trim(a.parent_email),''),email),
       national_id=coalesce(nullif(trim(a.parent_national_id),''),national_id),
       updated_at=now()
   where id=pid;
 end if;

 insert into school_students(
   full_name_ar,full_name_en,gender,date_of_birth,nationality,email,status,admission_date,notes
 )
 values(
   a.student_name_ar,a.student_name_en,a.gender,a.birth_date,
   coalesce(a.nationality,'Sudanese'),null,'active',current_date,
   'Created from admission '||a.application_no
 )
 returning id into sid;

 insert into school_parent_students(parent_id,student_id,relation,is_primary)
 values(pid,sid,'ولي أمر',true)
 on conflict(parent_id,student_id) do update set is_primary=true;

 insert into school_enrollments(
   student_id,academic_year_id,grade_level_id,curriculum_id,status,enrolled_on
 )
 values(sid,a.academic_year_id,a.grade_level_id,a.curriculum_id,'active',current_date)
 returning id into eid;

 discount_pct:=public.school_sibling_discount_percent(eid);
 perform public.school_refresh_sibling_discount(eid);

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
   'parent_reused',(a.parent_id is not null),
   'sibling_discount_percent',discount_pct
 );
end $$;
grant execute on function public.school_enroll_admission(uuid) to authenticated;

create or replace function public.school_s8_family_health()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
   'applications_with_existing_parent',(select count(*) from school_admission_applications where parent_id is not null),
   'sibling_discount_applications',(select count(*) from school_admission_applications where sibling_discount_percent=10),
   'active_sibling_discounts',(select count(*) from school_enrollment_discounts where discount_type='sibling' and is_active=true)
 );
$$;
grant execute on function public.school_s8_family_health() to authenticated;

select public.school_s8_family_health();
