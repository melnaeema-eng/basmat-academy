-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S5 BIG
-- FINANCE + HR + PAYROLL + EXPENSES + INCOME
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Departments
create table if not exists public.school_departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Employees
create table if not exists public.school_employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  teacher_id uuid references public.school_teachers(id) on delete set null,
  department_id uuid references public.school_departments(id) on delete set null,
  employee_no text unique,
  full_name_ar text not null,
  full_name_en text,
  job_title_ar text not null,
  job_title_en text,
  phone text,
  email text,
  national_id text,
  bank_name text,
  bank_iban text,
  hire_date date default current_date,
  employment_type text not null default 'full_time'
    check(employment_type in('full_time','part_time','contract')),
  base_salary numeric(12,2) not null default 0 check(base_salary>=0),
  housing_allowance numeric(12,2) not null default 0,
  transport_allowance numeric(12,2) not null default 0,
  other_allowances numeric(12,2) not null default 0,
  fixed_deduction numeric(12,2) not null default 0,
  status text not null default 'active'
    check(status in('active','inactive','terminated','on_leave')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.school_employee_no_seq start 1001;
create or replace function public.school_set_employee_no()
returns trigger language plpgsql as $$
begin
 if new.employee_no is null or trim(new.employee_no)='' then
  new.employee_no:='EMP-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_employee_no_seq')::text,5,'0');
 end if;
 return new;
end $$;
drop trigger if exists trg_school_employee_no on public.school_employees;
create trigger trg_school_employee_no
before insert on public.school_employees
for each row execute function public.school_set_employee_no();

-- 3) Finance accounts
create table if not exists public.school_finance_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  account_type text not null
    check(account_type in('cash','bank','wallet','receivable','payable','income','expense')),
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'SAR',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) Ledger
create table if not exists public.school_finance_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null default current_date,
  transaction_type text not null
    check(transaction_type in('fee_collection','income','expense','salary','refund','reversal','adjustment')),
  account_id uuid references public.school_finance_accounts(id) on delete set null,
  amount numeric(14,2) not null check(amount>0),
  direction text not null check(direction in('in','out')),
  reference_type text,
  reference_id uuid,
  reference_no text,
  description text not null,
  student_id uuid references public.school_students(id) on delete set null,
  employee_id uuid references public.school_employees(id) on delete set null,
  reverses_transaction_id uuid references public.school_finance_transactions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5) Income / Expense source documents
create table if not exists public.school_income_entries (
  id uuid primary key default gen_random_uuid(),
  income_date date not null default current_date,
  category text not null,
  amount numeric(14,2) not null check(amount>0),
  account_id uuid references public.school_finance_accounts(id) on delete set null,
  reference_no text,
  source text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.school_expense_entries (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  vendor text,
  amount numeric(14,2) not null check(amount>0),
  account_id uuid references public.school_finance_accounts(id) on delete set null,
  reference_no text,
  description text,
  attachment_url text,
  status text not null default 'paid'
    check(status in('draft','approved','paid','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6) Payroll
create table if not exists public.school_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  payroll_month date not null unique,
  status text not null default 'draft'
    check(status in('draft','approved','paid','cancelled')),
  notes text,
  approved_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.school_payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.school_payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.school_employees(id) on delete restrict,
  base_salary numeric(12,2) not null default 0,
  allowances numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  status text not null default 'pending'
    check(status in('pending','paid','held')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(payroll_run_id,employee_id)
);

-- 7) Payroll generation/payment
create or replace function public.school_generate_payroll(p_payroll_month date)
returns integer
language plpgsql security definer set search_path=public
as $$
declare rid uuid; n integer;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 insert into school_payroll_runs(payroll_month)
 values(date_trunc('month',p_payroll_month)::date)
 on conflict(payroll_month) do update set payroll_month=excluded.payroll_month
 returning id into rid;

 insert into school_payroll_items(payroll_run_id,employee_id,base_salary,allowances,deductions,net_salary)
 select rid,e.id,e.base_salary,
        e.housing_allowance+e.transport_allowance+e.other_allowances,
        e.fixed_deduction,
        e.base_salary+e.housing_allowance+e.transport_allowance+e.other_allowances-e.fixed_deduction
 from school_employees e
 where e.status='active'
 on conflict(payroll_run_id,employee_id) do nothing;

 get diagnostics n=row_count;
 return n;
end $$;
grant execute on function public.school_generate_payroll(date) to authenticated;

create or replace function public.school_mark_payroll_paid(p_payroll_run_id uuid,p_account_id uuid)
returns integer
language plpgsql security definer set search_path=public
as $$
declare r record; n integer:=0;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 for r in
  select pi.*,e.full_name_ar
  from school_payroll_items pi
  join school_employees e on e.id=pi.employee_id
  where pi.payroll_run_id=p_payroll_run_id and pi.status='pending'
 loop
  update school_payroll_items set status='paid',paid_at=now() where id=r.id;
  insert into school_finance_transactions(
   transaction_type,account_id,amount,direction,reference_type,reference_id,
   description,employee_id,created_by
  ) values(
   'salary',p_account_id,r.net_salary,'out','payroll_item',r.id,
   'راتب '||r.full_name_ar,r.employee_id,auth.uid()
  );
  n:=n+1;
 end loop;
 update school_payroll_runs set status='paid',paid_at=now() where id=p_payroll_run_id;
 return n;
end $$;
grant execute on function public.school_mark_payroll_paid(uuid,uuid) to authenticated;

-- 8) Post fee collections to ledger
create or replace function public.school_finance_post_payment()
returns trigger
language plpgsql security definer set search_path=public
as $$
declare sid uuid;
begin
 select student_id into sid from school_enrollments where id=new.enrollment_id;
 insert into school_finance_transactions(
  transaction_date,transaction_type,amount,direction,reference_type,reference_id,
  reference_no,description,student_id,created_by
 ) values(
  new.paid_at::date,'fee_collection',new.amount,'in','school_payment',new.id,
  new.reference_no,'تحصيل رسوم دراسية',sid,new.received_by
 );
 return new;
end $$;
drop trigger if exists trg_school_finance_post_payment on public.school_payments;
create trigger trg_school_finance_post_payment
after insert on public.school_payments
for each row execute function public.school_finance_post_payment();

-- 9) Post income/expense
create or replace function public.school_post_income()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into school_finance_transactions(
  transaction_date,transaction_type,account_id,amount,direction,reference_type,
  reference_id,reference_no,description,created_by
 ) values(
  new.income_date,'income',new.account_id,new.amount,'in','income_entry',
  new.id,new.reference_no,coalesce(new.description,new.category),new.created_by
 );
 return new;
end $$;
drop trigger if exists trg_school_post_income on school_income_entries;
create trigger trg_school_post_income after insert on school_income_entries
for each row execute function public.school_post_income();

create or replace function public.school_post_expense()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='paid' then
  insert into school_finance_transactions(
   transaction_date,transaction_type,account_id,amount,direction,reference_type,
   reference_id,reference_no,description,created_by
  ) values(
   new.expense_date,'expense',new.account_id,new.amount,'out','expense_entry',
   new.id,new.reference_no,coalesce(new.description,new.category),new.created_by
  );
 end if;
 return new;
end $$;
drop trigger if exists trg_school_post_expense on school_expense_entries;
create trigger trg_school_post_expense after insert on school_expense_entries
for each row execute function public.school_post_expense();

-- 10) Reversal / Refund / Adjustment
create or replace function public.school_finance_reverse_transaction(
 p_transaction_id uuid,p_reason text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare t school_finance_transactions%rowtype; rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 select * into t from school_finance_transactions where id=p_transaction_id;
 if not found then raise exception 'Transaction not found'; end if;
 if exists(select 1 from school_finance_transactions where reverses_transaction_id=t.id) then
  raise exception 'Transaction already reversed';
 end if;
 insert into school_finance_transactions(
  transaction_date,transaction_type,account_id,amount,direction,reference_type,
  reference_id,description,student_id,employee_id,reverses_transaction_id,created_by
 ) values(
  current_date,'reversal',t.account_id,t.amount,
  case when t.direction='in' then 'out' else 'in' end,
  'reversal',t.id,coalesce(nullif(trim(p_reason),''),'عكس قيد'),
  t.student_id,t.employee_id,t.id,auth.uid()
 ) returning id into rid;
 return rid;
end $$;
grant execute on function public.school_finance_reverse_transaction(uuid,text) to authenticated;

create or replace function public.school_finance_adjust(
 p_account_id uuid,p_amount numeric,p_direction text,p_description text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_amount<=0 then raise exception 'Amount must be positive'; end if;
 if p_direction not in ('in','out') then raise exception 'Invalid direction'; end if;
 insert into school_finance_transactions(
  transaction_type,account_id,amount,direction,description,created_by
 ) values('adjustment',p_account_id,p_amount,p_direction,p_description,auth.uid())
 returning id into rid;
 return rid;
end $$;
grant execute on function public.school_finance_adjust(uuid,numeric,text,text) to authenticated;

-- 11) Summary
create or replace function public.school_finance_summary(p_from date,p_to date)
returns jsonb
language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
  'collections',coalesce((select sum(amount) from school_finance_transactions where direction='in' and transaction_type='fee_collection' and transaction_date between p_from and p_to),0),
  'other_income',coalesce((select sum(amount) from school_finance_transactions where direction='in' and transaction_type='income' and transaction_date between p_from and p_to),0),
  'expenses',coalesce((select sum(amount) from school_finance_transactions where direction='out' and transaction_type='expense' and transaction_date between p_from and p_to),0),
  'salaries',coalesce((select sum(amount) from school_finance_transactions where direction='out' and transaction_type='salary' and transaction_date between p_from and p_to),0),
  'refunds_reversals',coalesce((select sum(amount) from school_finance_transactions where transaction_type in('refund','reversal') and transaction_date between p_from and p_to),0),
  'net',coalesce((select sum(case when direction='in' then amount else -amount end) from school_finance_transactions where transaction_date between p_from and p_to),0)
 );
$$;
grant execute on function public.school_finance_summary(date,date) to authenticated;

-- 12) RLS
do $$
declare t text;
begin
 foreach t in array array[
  'school_departments','school_employees','school_finance_accounts',
  'school_finance_transactions','school_income_entries','school_expense_entries',
  'school_payroll_runs','school_payroll_items'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_admin_all',t);
  execute format(
   'create policy %I on public.%I for all to authenticated
    using(public.is_school_admin()) with check(public.is_school_admin())',
   t||'_admin_all',t
  );
 end loop;
end $$;

-- 13) Seed
insert into school_departments(code,name_ar,name_en) values
('ADMIN','الإدارة','Administration'),
('ACADEMIC','الشؤون الأكاديمية','Academic Affairs'),
('FINANCE','المالية','Finance'),
('HR','الموارد البشرية','Human Resources'),
('IT','تقنية المعلومات','IT')
on conflict(code) do nothing;

insert into school_finance_accounts(code,name_ar,name_en,account_type,currency) values
('CASH','الصندوق','Cash','cash','SAR'),
('BANK','الحساب البنكي','Bank Account','bank','SAR')
on conflict(code) do nothing;

create or replace function public.school_s5_health()
returns jsonb language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
  'employees',(select count(*) from school_employees),
  'departments',(select count(*) from school_departments),
  'payroll_runs',(select count(*) from school_payroll_runs),
  'finance_transactions',(select count(*) from school_finance_transactions),
  'expenses',(select count(*) from school_expense_entries),
  'income_entries',(select count(*) from school_income_entries),
  'finance_accounts',(select count(*) from school_finance_accounts)
 );
$$;
grant execute on function public.school_s5_health() to authenticated;

select public.school_s5_health();
