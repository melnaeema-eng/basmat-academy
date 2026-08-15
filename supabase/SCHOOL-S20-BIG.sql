-- SCHOOL S20 BIG — FINANCE COMPLETE
-- Extends the existing school finance model without duplicating prior tables.

create table if not exists public.school_fee_adjustments (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
 adjustment_type text not null check(adjustment_type in('sibling_discount','discount','scholarship','waiver','penalty','other')),
 amount numeric(12,2) not null check(amount>=0),
 percentage numeric(5,2) check(percentage between 0 and 100),
 reason text not null,
 status text not null default 'approved' check(status in('pending','approved','rejected','cancelled')),
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.school_fee_receipts (
 id uuid primary key default gen_random_uuid(),
 receipt_no text unique not null,
 enrollment_id uuid not null references public.school_enrollments(id) on delete restrict,
 transaction_id uuid references public.school_finance_transactions(id) on delete set null,
 amount numeric(12,2) not null check(amount>0),
 payment_method text not null default 'cash',
 reference_no text,
 paid_at timestamptz not null default now(),
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.school_payroll_items (
 id uuid primary key default gen_random_uuid(),
 payroll_run_id uuid not null references public.school_payroll_runs(id) on delete cascade,
 employee_id uuid not null references public.school_employees(id) on delete restrict,
 basic_salary numeric(12,2) not null default 0,
 allowances numeric(12,2) not null default 0,
 deductions numeric(12,2) not null default 0,
 net_salary numeric(12,2) generated always as (basic_salary+allowances-deductions) stored,
 payment_status text not null default 'pending' check(payment_status in('pending','paid','cancelled')),
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 unique(payroll_run_id,employee_id)
);

alter table public.school_fee_adjustments enable row level security;
alter table public.school_fee_receipts enable row level security;
alter table public.school_payroll_items enable row level security;

drop policy if exists s20_adjustments_admin on public.school_fee_adjustments;
create policy s20_adjustments_admin on public.school_fee_adjustments for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());
drop policy if exists s20_receipts_admin on public.school_fee_receipts;
create policy s20_receipts_admin on public.school_fee_receipts for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());
drop policy if exists s20_payroll_admin on public.school_payroll_items;
create policy s20_payroll_admin on public.school_payroll_items for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists s20_receipts_family_read on public.school_fee_receipts;
create policy s20_receipts_family_read on public.school_fee_receipts for select to authenticated
using(public.school_can_access_enrollment(enrollment_id));

create sequence if not exists public.school_receipt_seq start 1001;

create or replace function public.school_apply_sibling_discount(p_enrollment_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 e record; parentid uuid; siblings integer:=0; tuition numeric:=0; discount numeric:=0; exists_id uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 select * into e from school_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment not found'; end if;

 select sp.parent_id into parentid
 from school_student_parents sp where sp.student_id=e.student_id
 order by sp.is_primary desc nulls last limit 1;

 if parentid is null then
   return jsonb_build_object('applied',false,'reason','No parent link');
 end if;

 select count(distinct en.student_id) into siblings
 from school_student_parents sp
 join school_enrollments en on en.student_id=sp.student_id and en.status='active'
 where sp.parent_id=parentid;

 if siblings<2 then
   return jsonb_build_object('applied',false,'reason','No active sibling');
 end if;

 select coalesce(fp.tuition_fee,0) into tuition
 from school_fee_plans fp
 where fp.academic_year_id=e.academic_year_id
   and fp.grade_level_id=e.grade_level_id
   and fp.curriculum_id=e.curriculum_id
   and fp.is_active=true
 order by fp.created_at desc limit 1;

 if tuition<=0 then
   return jsonb_build_object('applied',false,'reason','No tuition plan');
 end if;

 discount:=round(tuition*0.10,2);

 select id into exists_id from school_fee_adjustments
 where enrollment_id=p_enrollment_id and adjustment_type='sibling_discount'
   and status='approved' limit 1;

 if exists_id is null then
   insert into school_fee_adjustments(enrollment_id,adjustment_type,amount,percentage,reason,status,created_by,approved_by)
   values(p_enrollment_id,'sibling_discount',discount,10,'Automatic 10% sibling tuition discount','approved',auth.uid(),auth.uid());
 end if;

 return jsonb_build_object('applied',true,'siblings',siblings,'percentage',10,'amount',discount);
end $$;
grant execute on function public.school_apply_sibling_discount(uuid) to authenticated;

create or replace function public.school_enrollment_finance_summary(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare e record; tuition numeric:=0; adjustments numeric:=0; paid numeric:=0;
begin
 if not public.school_can_access_enrollment(p_enrollment_id) then raise exception 'Not allowed'; end if;
 select * into e from school_enrollments where id=p_enrollment_id;
 select coalesce(fp.tuition_fee,0) into tuition from school_fee_plans fp
 where fp.academic_year_id=e.academic_year_id and fp.grade_level_id=e.grade_level_id
 and fp.curriculum_id=e.curriculum_id and fp.is_active=true order by fp.created_at desc limit 1;

 select coalesce(sum(case when adjustment_type='penalty' then -amount else amount end),0) into adjustments
 from school_fee_adjustments where enrollment_id=p_enrollment_id and status='approved';

 select coalesce(sum(amount),0) into paid from school_fee_receipts where enrollment_id=p_enrollment_id;

 return jsonb_build_object(
  'tuition',tuition,'adjustments',adjustments,'net_due',greatest(tuition-adjustments,0),
  'paid',paid,'balance',greatest(tuition-adjustments-paid,0),
  'clear',greatest(tuition-adjustments-paid,0)<=0
 );
end $$;
grant execute on function public.school_enrollment_finance_summary(uuid) to authenticated;

create or replace function public.school_create_fee_receipt(
 p_enrollment_id uuid,p_amount numeric,p_payment_method text,p_reference_no text,p_notes text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare rn text; rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
 rn:='RCPT-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('school_receipt_seq')::text,6,'0');
 insert into school_fee_receipts(receipt_no,enrollment_id,amount,payment_method,reference_no,notes,created_by)
 values(rn,p_enrollment_id,p_amount,coalesce(nullif(trim(p_payment_method),''),'cash'),
 nullif(trim(coalesce(p_reference_no,'')),''),nullif(trim(coalesce(p_notes,'')),''),auth.uid())
 returning id into rid;
 return jsonb_build_object('id',rid,'receipt_no',rn);
end $$;
grant execute on function public.school_create_fee_receipt(uuid,numeric,text,text,text) to authenticated;

create or replace function public.school_finance_dashboard()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'accounts',(select count(*) from school_finance_accounts where is_active=true),
 'income_transactions',(select count(*) from school_finance_transactions where transaction_type='income'),
 'expense_transactions',(select count(*) from school_finance_transactions where transaction_type='expense'),
 'income_total',(select coalesce(sum(amount),0) from school_finance_transactions where transaction_type='income'),
 'expense_total',(select coalesce(sum(amount),0) from school_finance_transactions where transaction_type='expense'),
 'receipts',(select count(*) from school_fee_receipts),
 'receipts_total',(select coalesce(sum(amount),0) from school_fee_receipts),
 'approved_adjustments',(select count(*) from school_fee_adjustments where status='approved'),
 'payroll_runs',(select count(*) from school_payroll_runs),
 'payroll_pending',(select coalesce(sum(net_salary),0) from school_payroll_items where payment_status='pending'),
 'payroll_paid',(select coalesce(sum(net_salary),0) from school_payroll_items where payment_status='paid')
);
$$;
grant execute on function public.school_finance_dashboard() to authenticated;

create or replace function public.school_s20_health()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'finance_accounts',(select count(*) from school_finance_accounts),
 'finance_transactions',(select count(*) from school_finance_transactions),
 'fee_plans',(select count(*) from school_fee_plans where is_active=true),
 'fee_adjustments',(select count(*) from school_fee_adjustments),
 'sibling_discounts',(select count(*) from school_fee_adjustments where adjustment_type='sibling_discount' and status='approved'),
 'receipts',(select count(*) from school_fee_receipts),
 'payroll_runs',(select count(*) from school_payroll_runs),
 'payroll_items',(select count(*) from school_payroll_items),
 'expenses',(select count(*) from school_expenses)
);
$$;
grant execute on function public.school_s20_health() to authenticated;

select public.school_s20_health();
