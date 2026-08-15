-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S6 BIG
-- HR + CONTRACTS + LEAVE + STAFF ATTENDANCE + OVERTIME
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Employee contracts
create table if not exists public.school_employee_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  contract_no text unique,
  contract_type text not null default 'annual'
    check(contract_type in('annual','permanent','temporary','part_time','consultant')),
  starts_on date not null,
  ends_on date,
  probation_ends_on date,
  basic_salary numeric(12,2) not null default 0,
  housing_allowance numeric(12,2) not null default 0,
  transport_allowance numeric(12,2) not null default 0,
  other_allowances numeric(12,2) not null default 0,
  working_hours_per_day numeric(5,2) not null default 8,
  working_days_per_week integer not null default 5 check(working_days_per_week between 1 and 7),
  status text not null default 'active'
    check(status in('draft','active','expired','terminated')),
  document_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.school_contract_no_seq start 1001;
create or replace function public.school_set_contract_no()
returns trigger language plpgsql as $$
begin
 if new.contract_no is null or trim(new.contract_no)='' then
  new.contract_no:='CON-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_contract_no_seq')::text,5,'0');
 end if;
 return new;
end $$;
drop trigger if exists trg_school_contract_no on public.school_employee_contracts;
create trigger trg_school_contract_no before insert on public.school_employee_contracts
for each row execute function public.school_set_contract_no();

-- 2) Leave types
create table if not exists public.school_leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  annual_days numeric(6,2) not null default 0,
  is_paid boolean not null default true,
  requires_attachment boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Leave requests
create table if not exists public.school_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  leave_type_id uuid not null references public.school_leave_types(id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  days_count numeric(6,2) not null,
  reason text,
  attachment_url text,
  status text not null default 'pending'
    check(status in('pending','approved','rejected','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check(ends_on>=starts_on)
);

-- 4) Staff attendance
create table if not exists public.school_staff_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  attendance_date date not null,
  check_in time,
  check_out time,
  status text not null default 'present'
    check(status in('present','absent','late','leave','holiday','remote')),
  late_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id,attendance_date)
);

-- 5) Overtime requests/approvals
create table if not exists public.school_overtime_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  overtime_date date not null,
  minutes integer not null check(minutes>0),
  rate_per_hour numeric(10,2) not null default 0,
  amount numeric(12,2) generated always as ((minutes::numeric/60)*rate_per_hour) stored,
  status text not null default 'pending'
    check(status in('pending','approved','rejected','paid')),
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6) Payroll adjustments from HR
create table if not exists public.school_payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  adjustment_month date not null,
  adjustment_type text not null check(adjustment_type in('allowance','deduction')),
  source_type text,
  source_id uuid,
  amount numeric(12,2) not null check(amount>0),
  description text not null,
  is_applied boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7) Save staff attendance in bulk
create or replace function public.school_save_staff_attendance(
  p_date date,
  p_records jsonb
)
returns integer
language plpgsql security definer set search_path=public
as $$
declare r jsonb; n integer:=0;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 for r in select * from jsonb_array_elements(p_records)
 loop
  insert into school_staff_attendance(
    employee_id,attendance_date,check_in,check_out,status,late_minutes,overtime_minutes,note,created_by
  ) values(
    (r->>'employee_id')::uuid,p_date,
    nullif(r->>'check_in','')::time,
    nullif(r->>'check_out','')::time,
    coalesce(r->>'status','present'),
    coalesce((r->>'late_minutes')::integer,0),
    coalesce((r->>'overtime_minutes')::integer,0),
    nullif(trim(coalesce(r->>'note','')),''),
    auth.uid()
  )
  on conflict(employee_id,attendance_date) do update
    set check_in=excluded.check_in,check_out=excluded.check_out,status=excluded.status,
        late_minutes=excluded.late_minutes,overtime_minutes=excluded.overtime_minutes,
        note=excluded.note,updated_at=now();
  n:=n+1;
 end loop;
 return n;
end $$;
grant execute on function public.school_save_staff_attendance(date,jsonb) to authenticated;

-- 8) Approve leave
create or replace function public.school_review_leave(
 p_leave_id uuid,p_status text,p_note text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_status not in('approved','rejected') then raise exception 'Invalid status'; end if;
 update school_leave_requests
 set status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note
 where id=p_leave_id returning id into rid;
 return rid;
end $$;
grant execute on function public.school_review_leave(uuid,text,text) to authenticated;

-- 9) Convert lateness/absence to payroll deductions
create or replace function public.school_generate_hr_payroll_adjustments(p_month date)
returns integer
language plpgsql security definer set search_path=public
as $$
declare n integer:=0;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 -- Late deduction: salary / 30 / 8 / 60 * late minutes
 insert into school_payroll_adjustments(
   employee_id,adjustment_month,adjustment_type,source_type,source_id,amount,description
 )
 select a.employee_id,date_trunc('month',p_month)::date,'deduction','late',a.id,
        greatest(round((e.base_salary/30/8/60)*a.late_minutes,2),0.01),
        'خصم تأخير '||a.late_minutes||' دقيقة بتاريخ '||a.attendance_date
 from school_staff_attendance a
 join school_employees e on e.id=a.employee_id
 where date_trunc('month',a.attendance_date)=date_trunc('month',p_month)
   and a.late_minutes>0
   and not exists(
     select 1 from school_payroll_adjustments x
     where x.source_type='late' and x.source_id=a.id
   );
 get diagnostics n=row_count;

 -- Absence deduction: one day basic salary
 insert into school_payroll_adjustments(
   employee_id,adjustment_month,adjustment_type,source_type,source_id,amount,description
 )
 select a.employee_id,date_trunc('month',p_month)::date,'deduction','absence',a.id,
        greatest(round(e.base_salary/30,2),0.01),
        'خصم غياب بتاريخ '||a.attendance_date
 from school_staff_attendance a
 join school_employees e on e.id=a.employee_id
 where date_trunc('month',a.attendance_date)=date_trunc('month',p_month)
   and a.status='absent'
   and not exists(
     select 1 from school_payroll_adjustments x
     where x.source_type='absence' and x.source_id=a.id
   );

 return n;
end $$;
grant execute on function public.school_generate_hr_payroll_adjustments(date) to authenticated;

-- 10) Upgrade payroll generation to include HR adjustments
create or replace function public.school_generate_payroll(p_payroll_month date)
returns integer
language plpgsql security definer set search_path=public
as $$
declare rid uuid; n integer;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 perform public.school_generate_hr_payroll_adjustments(p_payroll_month);

 insert into school_payroll_runs(payroll_month)
 values(date_trunc('month',p_payroll_month)::date)
 on conflict(payroll_month) do update set payroll_month=excluded.payroll_month
 returning id into rid;

 insert into school_payroll_items(
   payroll_run_id,employee_id,base_salary,allowances,deductions,net_salary
 )
 select rid,e.id,e.base_salary,
        e.housing_allowance+e.transport_allowance+e.other_allowances+
        coalesce((select sum(a.amount) from school_payroll_adjustments a
                  where a.employee_id=e.id
                    and a.adjustment_month=date_trunc('month',p_payroll_month)::date
                    and a.adjustment_type='allowance'),0),
        e.fixed_deduction+
        coalesce((select sum(a.amount) from school_payroll_adjustments a
                  where a.employee_id=e.id
                    and a.adjustment_month=date_trunc('month',p_payroll_month)::date
                    and a.adjustment_type='deduction'),0),
        e.base_salary+e.housing_allowance+e.transport_allowance+e.other_allowances+
        coalesce((select sum(a.amount) from school_payroll_adjustments a
                  where a.employee_id=e.id
                    and a.adjustment_month=date_trunc('month',p_payroll_month)::date
                    and a.adjustment_type='allowance'),0)
        -e.fixed_deduction-
        coalesce((select sum(a.amount) from school_payroll_adjustments a
                  where a.employee_id=e.id
                    and a.adjustment_month=date_trunc('month',p_payroll_month)::date
                    and a.adjustment_type='deduction'),0)
 from school_employees e
 where e.status='active'
 on conflict(payroll_run_id,employee_id) do update
 set base_salary=excluded.base_salary,
     allowances=excluded.allowances,
     deductions=excluded.deductions,
     net_salary=excluded.net_salary;

 update school_payroll_adjustments
 set is_applied=true
 where adjustment_month=date_trunc('month',p_payroll_month)::date;

 select count(*) into n from school_payroll_items where payroll_run_id=rid;
 return n;
end $$;

-- 11) RLS
do $$
declare t text;
begin
 foreach t in array array[
  'school_employee_contracts','school_leave_types','school_leave_requests',
  'school_staff_attendance','school_overtime_entries','school_payroll_adjustments'
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

-- Employee self view
drop policy if exists school_leave_requests_self_read on school_leave_requests;
create policy school_leave_requests_self_read
on school_leave_requests for select to authenticated
using(employee_id in(select id from school_employees where auth_user_id=auth.uid()));

drop policy if exists school_staff_attendance_self_read on school_staff_attendance;
create policy school_staff_attendance_self_read
on school_staff_attendance for select to authenticated
using(employee_id in(select id from school_employees where auth_user_id=auth.uid()));

-- 12) Seed leave types
insert into school_leave_types(code,name_ar,name_en,annual_days,is_paid) values
('ANNUAL','إجازة سنوية','Annual Leave',21,true),
('SICK','إجازة مرضية','Sick Leave',15,true),
('UNPAID','إجازة بدون راتب','Unpaid Leave',0,false),
('EMERGENCY','إجازة طارئة','Emergency Leave',5,true)
on conflict(code) do nothing;

create or replace function public.school_s6_health()
returns jsonb language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
  'contracts',(select count(*) from school_employee_contracts),
  'leave_types',(select count(*) from school_leave_types),
  'leave_requests',(select count(*) from school_leave_requests),
  'staff_attendance',(select count(*) from school_staff_attendance),
  'overtime_entries',(select count(*) from school_overtime_entries),
  'payroll_adjustments',(select count(*) from school_payroll_adjustments)
 );
$$;
grant execute on function public.school_s6_health() to authenticated;

select public.school_s6_health();
