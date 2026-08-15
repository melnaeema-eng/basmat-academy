-- ============================================================
-- SCHOOL S20.1 — FINANCE COMPLETE (CORRECTED TO ACTUAL SCHEMA)
-- ============================================================

-- Existing schema used:
-- school_fee_plans.annual_tuition
-- school_payments
-- school_finance_accounts
-- school_finance_transactions(transaction_type,direction)
-- school_income_entries
-- school_expense_entries
-- school_payroll_runs
-- school_payroll_items(status)
-- school_parent_students
-- school_enrollment_discounts (existing sibling discount layer)

create table if not exists public.school_fee_adjustments (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
 adjustment_type text not null
   check(adjustment_type in('sibling_discount','discount','scholarship','waiver','penalty','other')),
 amount numeric(12,2) not null default 0 check(amount>=0),
 percentage numeric(5,2) check(percentage between 0 and 100),
 reason text not null,
 status text not null default 'approved'
   check(status in('pending','approved','rejected','cancelled')),
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.school_fee_receipts (
 id uuid primary key default gen_random_uuid(),
 receipt_no text not null unique,
 enrollment_id uuid not null references public.school_enrollments(id) on delete restrict,
 payment_id uuid references public.school_payments(id) on delete set null,
 amount numeric(12,2) not null check(amount>0),
 currency text not null default 'SAR',
 payment_method text not null default 'cash',
 reference_no text,
 paid_at timestamptz not null default now(),
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

alter table public.school_fee_adjustments enable row level security;
alter table public.school_fee_receipts enable row level security;

drop policy if exists s20_adjustments_admin_all on public.school_fee_adjustments;
create policy s20_adjustments_admin_all
on public.school_fee_adjustments for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists s20_receipts_admin_all on public.school_fee_receipts;
create policy s20_receipts_admin_all
on public.school_fee_receipts for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists s20_receipts_family_read on public.school_fee_receipts;
create policy s20_receipts_family_read
on public.school_fee_receipts for select to authenticated
using(public.school_can_access_enrollment(enrollment_id));

create sequence if not exists public.school_receipt_seq start 1001;

-- ------------------------------------------------------------
-- SIBLING DISCOUNT — 10%
-- ------------------------------------------------------------
create or replace function public.school_apply_sibling_discount(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  parentid uuid;
  sibling_count integer:=0;
  tuition numeric:=0;
  discount numeric:=0;
  existing_id uuid;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  select * into e
  from school_enrollments
  where id=p_enrollment_id;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  select ps.parent_id
  into parentid
  from school_parent_students ps
  where ps.student_id=e.student_id
  order by ps.is_primary desc,ps.created_at
  limit 1;

  if parentid is null then
    return jsonb_build_object('applied',false,'reason','No parent link');
  end if;

  select count(distinct en.student_id)
  into sibling_count
  from school_parent_students ps
  join school_enrollments en
    on en.student_id=ps.student_id
   and en.status='active'
  where ps.parent_id=parentid;

  if sibling_count<2 then
    return jsonb_build_object('applied',false,'reason','No active sibling');
  end if;

  select coalesce(fp.annual_tuition,0)
  into tuition
  from school_fee_plans fp
  where fp.academic_year_id=e.academic_year_id
    and fp.grade_level_id=e.grade_level_id
    and fp.curriculum_id=e.curriculum_id
    and fp.is_active=true
  order by fp.created_at desc
  limit 1;

  if tuition<=0 then
    return jsonb_build_object('applied',false,'reason','Fee plan not found');
  end if;

  discount:=round(tuition*0.10,2);

  select id
  into existing_id
  from school_fee_adjustments
  where enrollment_id=p_enrollment_id
    and adjustment_type='sibling_discount'
    and status='approved'
  order by created_at desc
  limit 1;

  if existing_id is null then
    insert into school_fee_adjustments(
      enrollment_id,adjustment_type,amount,percentage,
      reason,status,created_by,approved_by
    )
    values(
      p_enrollment_id,'sibling_discount',discount,10,
      'Automatic 10% sibling tuition discount',
      'approved',auth.uid(),auth.uid()
    );
  else
    update school_fee_adjustments
    set amount=discount,
        percentage=10,
        reason='Automatic 10% sibling tuition discount',
        updated_at=now()
    where id=existing_id;
  end if;

  return jsonb_build_object(
    'applied',true,
    'siblings',sibling_count,
    'annual_tuition',tuition,
    'percentage',10,
    'amount',discount
  );
end $$;

grant execute on function public.school_apply_sibling_discount(uuid) to authenticated;

-- ------------------------------------------------------------
-- STUDENT FINANCE SUMMARY
-- ------------------------------------------------------------
create or replace function public.school_enrollment_finance_summary(
  p_enrollment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  e school_enrollments%rowtype;
  tuition numeric:=0;
  registration numeric:=0;
  otherfees numeric:=0;
  discount_total numeric:=0;
  penalty_total numeric:=0;
  paid numeric:=0;
  gross numeric:=0;
  netdue numeric:=0;
  balance numeric:=0;
begin
  if not public.school_can_access_enrollment(p_enrollment_id) then
    raise exception 'Not allowed';
  end if;

  select * into e
  from school_enrollments
  where id=p_enrollment_id;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  select
    coalesce(fp.annual_tuition,0),
    coalesce(fp.registration_fee,0),
    coalesce(fp.other_fees,0)
  into tuition,registration,otherfees
  from school_fee_plans fp
  where fp.academic_year_id=e.academic_year_id
    and fp.grade_level_id=e.grade_level_id
    and fp.curriculum_id=e.curriculum_id
    and fp.is_active=true
  order by fp.created_at desc
  limit 1;

  gross:=coalesce(tuition,0)+coalesce(registration,0)+coalesce(otherfees,0);

  select
    coalesce(sum(amount) filter(where adjustment_type<>'penalty' and status='approved'),0),
    coalesce(sum(amount) filter(where adjustment_type='penalty' and status='approved'),0)
  into discount_total,penalty_total
  from school_fee_adjustments
  where enrollment_id=p_enrollment_id;

  select coalesce(sum(amount),0)
  into paid
  from school_payments
  where enrollment_id=p_enrollment_id;

  netdue:=greatest(gross-discount_total+penalty_total,0);
  balance:=greatest(netdue-paid,0);

  return jsonb_build_object(
    'annual_tuition',tuition,
    'registration_fee',registration,
    'other_fees',otherfees,
    'gross_due',gross,
    'discounts',discount_total,
    'penalties',penalty_total,
    'net_due',netdue,
    'paid',paid,
    'balance',balance,
    'clear',balance<=0
  );
end $$;

grant execute on function public.school_enrollment_finance_summary(uuid) to authenticated;

-- ------------------------------------------------------------
-- RECEIPT CREATION
-- Creates school_payments row + receipt row
-- ------------------------------------------------------------
create or replace function public.school_create_fee_receipt(
  p_enrollment_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_reference_no text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  paymentid uuid;
  receiptid uuid;
  rn text;
begin
  if not public.is_school_admin() then
    raise exception 'School Admin required';
  end if;

  if p_amount<=0 then
    raise exception 'Amount must be greater than zero';
  end if;

  insert into school_payments(
    enrollment_id,installment_id,amount,currency,method,
    reference_no,paid_at,received_by,notes
  )
  values(
    p_enrollment_id,p_installment_id,p_amount,
    coalesce(nullif(trim(p_currency),''),'SAR'),
    coalesce(nullif(trim(p_payment_method),''),'cash'),
    nullif(trim(coalesce(p_reference_no,'')),''),
    now(),auth.uid(),
    nullif(trim(coalesce(p_notes,'')),'')
  )
  returning id into paymentid;

  rn:='RCPT-'||to_char(current_date,'YYYY')||'-'
      ||lpad(nextval('school_receipt_seq')::text,6,'0');

  insert into school_fee_receipts(
    receipt_no,enrollment_id,payment_id,amount,currency,
    payment_method,reference_no,paid_at,notes,created_by
  )
  values(
    rn,p_enrollment_id,paymentid,p_amount,
    coalesce(nullif(trim(p_currency),''),'SAR'),
    coalesce(nullif(trim(p_payment_method),''),'cash'),
    nullif(trim(coalesce(p_reference_no,'')),''),
    now(),
    nullif(trim(coalesce(p_notes,'')),''),
    auth.uid()
  )
  returning id into receiptid;

  if p_installment_id is not null then
    update school_installments
    set paid_amount=least(amount,paid_amount+p_amount),
        status=case
          when paid_amount+p_amount>=amount then 'paid'
          when paid_amount+p_amount>0 then 'partial'
          else status
        end,
        updated_at=now()
    where id=p_installment_id;
  end if;

  return jsonb_build_object(
    'payment_id',paymentid,
    'receipt_id',receiptid,
    'receipt_no',rn
  );
end $$;

grant execute on function public.school_create_fee_receipt(uuid,uuid,numeric,text,text,text,text)
to authenticated;

-- ------------------------------------------------------------
-- FINANCE DASHBOARD
-- ------------------------------------------------------------
create or replace function public.school_finance_dashboard()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'accounts',(
    select count(*) from school_finance_accounts where is_active=true
  ),
  'finance_transactions',(
    select count(*) from school_finance_transactions
  ),
  'cash_in_total',(
    select coalesce(sum(amount),0)
    from school_finance_transactions
    where direction='in'
  ),
  'cash_out_total',(
    select coalesce(sum(amount),0)
    from school_finance_transactions
    where direction='out'
  ),
  'income_entries',(
    select count(*) from school_income_entries
  ),
  'income_total',(
    select coalesce(sum(amount),0) from school_income_entries
  ),
  'expense_entries',(
    select count(*) from school_expense_entries
  ),
  'expense_total',(
    select coalesce(sum(amount),0)
    from school_expense_entries
    where status<>'cancelled'
  ),
  'student_payments',(
    select count(*) from school_payments
  ),
  'student_payments_total',(
    select coalesce(sum(amount),0) from school_payments
  ),
  'receipts',(
    select count(*) from school_fee_receipts
  ),
  'receipts_total',(
    select coalesce(sum(amount),0) from school_fee_receipts
  ),
  'payroll_runs',(
    select count(*) from school_payroll_runs
  ),
  'payroll_pending',(
    select coalesce(sum(net_salary),0)
    from school_payroll_items
    where status='pending'
  ),
  'payroll_paid',(
    select coalesce(sum(net_salary),0)
    from school_payroll_items
    where status='paid'
  )
);
$$;

grant execute on function public.school_finance_dashboard() to authenticated;

-- ------------------------------------------------------------
-- HEALTH
-- ------------------------------------------------------------
create or replace function public.school_s20_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'finance_accounts',(select count(*) from school_finance_accounts),
  'finance_transactions',(select count(*) from school_finance_transactions),
  'income_entries',(select count(*) from school_income_entries),
  'expense_entries',(select count(*) from school_expense_entries),
  'fee_plans',(select count(*) from school_fee_plans where is_active=true),
  'installments',(select count(*) from school_installments),
  'payments',(select count(*) from school_payments),
  'fee_adjustments',(select count(*) from school_fee_adjustments),
  'sibling_discounts',(
    select count(*)
    from school_fee_adjustments
    where adjustment_type='sibling_discount'
      and status='approved'
  ),
  'receipts',(select count(*) from school_fee_receipts),
  'payroll_runs',(select count(*) from school_payroll_runs),
  'payroll_items',(select count(*) from school_payroll_items),
  'payroll_pending',(
    select count(*) from school_payroll_items where status='pending'
  )
);
$$;

grant execute on function public.school_s20_health() to authenticated;

select public.school_s20_health();
