-- ============================================================
-- SCHOOL SPRINT S2 BIG — STUDENTS + PARENTS + FINANCE FOUNDATION
-- Nawabigh Aljazeera School
-- ============================================================

-- 0) SCHOOL ROLE + SCHOOL ADMIN
alter table public.profiles
add column if not exists school_role text;

create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_admin()
  or exists(
    select 1
    from public.profiles
    where id=auth.uid()
      and lower(trim(coalesce(school_role,'')))='school_admin'
  );
$$;

grant execute on function public.is_school_admin() to authenticated;

-- 1) STUDENTS
create table if not exists public.school_students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  student_no text unique,
  full_name_ar text not null,
  full_name_en text,
  gender text check(gender in('male','female')),
  date_of_birth date,
  nationality text default 'Sudanese',
  phone text,
  email text,
  status text not null default 'active'
    check(status in('active','inactive','graduated','withdrawn')),
  admission_date date default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.school_student_no_seq start 1001;

create or replace function public.school_set_student_no()
returns trigger
language plpgsql
as $$
begin
  if new.student_no is null or trim(new.student_no)='' then
    new.student_no := 'NAS-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_student_no_seq')::text,5,'0');
  end if;
  return new;
end $$;

drop trigger if exists trg_school_set_student_no on public.school_students;
create trigger trg_school_set_student_no
before insert on public.school_students
for each row execute function public.school_set_student_no();

-- 2) PARENTS / GUARDIANS
create table if not exists public.school_parents (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  relation_default text,
  national_id text,
  phone text,
  whatsapp text,
  email text,
  occupation text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.school_parents(id) on delete cascade,
  student_id uuid not null references public.school_students(id) on delete cascade,
  relation text not null default 'guardian',
  is_primary boolean not null default false,
  can_receive_finance boolean not null default true,
  can_receive_results boolean not null default true,
  created_at timestamptz not null default now(),
  unique(parent_id,student_id)
);

-- 3) SCHOOL ENROLLMENTS
create table if not exists public.school_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.school_students(id) on delete restrict,
  academic_year_id uuid not null references public.school_academic_years(id) on delete restrict,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  class_section_id uuid references public.school_class_sections(id) on delete set null,
  status text not null default 'active'
    check(status in('active','completed','transferred','withdrawn','suspended')),
  enrolled_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,academic_year_id)
);

-- 4) FINANCE
create table if not exists public.school_fee_plans (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  annual_tuition numeric(12,2) not null default 0 check(annual_tuition >= 0),
  registration_fee numeric(12,2) not null default 0 check(registration_fee >= 0),
  other_fees numeric(12,2) not null default 0 check(other_fees >= 0),
  installments_count integer not null default 10 check(installments_count between 1 and 12),
  currency text not null default 'SAR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academic_year_id,grade_level_id,curriculum_id)
);

create table if not exists public.school_installments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  installment_no integer not null,
  title text not null,
  due_date date not null,
  amount numeric(12,2) not null check(amount >= 0),
  paid_amount numeric(12,2) not null default 0 check(paid_amount >= 0),
  status text not null default 'unpaid'
    check(status in('unpaid','partial','paid','overdue','waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enrollment_id,installment_no)
);

create table if not exists public.school_payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete restrict,
  installment_id uuid references public.school_installments(id) on delete set null,
  amount numeric(12,2) not null check(amount > 0),
  currency text not null default 'SAR',
  method text not null default 'cash',
  reference_no text,
  paid_at timestamptz not null default now(),
  received_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.school_financial_clearance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  valid_from date not null default current_date,
  valid_until date,
  reason text not null,
  approved_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5) PAYMENT POSTING FUNCTION
create or replace function public.school_record_payment(
  p_enrollment_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_method text,
  p_reference_no text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment_id uuid;
  v_paid numeric;
  v_due numeric;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  if p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  insert into public.school_payments(
    enrollment_id,installment_id,amount,method,reference_no,received_by,notes
  )
  values(
    p_enrollment_id,p_installment_id,p_amount,coalesce(p_method,'cash'),
    nullif(trim(coalesce(p_reference_no,'')),''),
    auth.uid(),nullif(trim(coalesce(p_notes,'')),'')
  )
  returning id into v_payment_id;

  if p_installment_id is not null then
    select amount, paid_amount into v_due, v_paid
    from public.school_installments
    where id=p_installment_id
    for update;

    update public.school_installments
    set paid_amount=least(v_due,coalesce(v_paid,0)+p_amount),
        status=case
          when coalesce(v_paid,0)+p_amount >= v_due then 'paid'
          when coalesce(v_paid,0)+p_amount > 0 then 'partial'
          else status
        end,
        updated_at=now()
    where id=p_installment_id;
  end if;

  return v_payment_id;
end $$;

grant execute on function public.school_record_payment(uuid,uuid,numeric,text,text,text) to authenticated;

-- 6) GENERATE MONTHLY INSTALLMENTS
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

  each_amount := round(fp.annual_tuition / fp.installments_count,2);

  for i in 1..fp.installments_count loop
    insert into public.school_installments(
      enrollment_id,installment_no,title,due_date,amount,status
    )
    values(
      e.id,i,'Installment '||i,
      (p_first_due_date + make_interval(months => i-1))::date,
      case when i=fp.installments_count
           then fp.annual_tuition - each_amount*(fp.installments_count-1)
           else each_amount end,
      'unpaid'
    )
    on conflict(enrollment_id,installment_no) do nothing;

    if found then created_count := created_count + 1; end if;
  end loop;

  return created_count;
end $$;

grant execute on function public.school_generate_installments(uuid,date) to authenticated;

-- 7) UPDATE OVERDUE STATUS
create or replace function public.school_refresh_overdue()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare n integer;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  update public.school_installments
  set status='overdue',updated_at=now()
  where status in('unpaid','partial')
    and due_date < current_date
    and paid_amount < amount;

  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.school_refresh_overdue() to authenticated;

-- 8) FINANCIAL EXAM ELIGIBILITY FOUNDATION
create or replace function public.school_financial_exam_eligible(
  p_enrollment_id uuid,
  p_exam_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_due numeric;
  v_clearance boolean;
begin
  select exists(
    select 1 from public.school_financial_clearance fc
    where fc.enrollment_id=p_enrollment_id
      and fc.is_active=true
      and fc.valid_from <= p_exam_date
      and (fc.valid_until is null or fc.valid_until >= p_exam_date)
  ) into v_clearance;

  if v_clearance then
    return jsonb_build_object(
      'eligible',true,
      'reason','financial_clearance',
      'outstanding',0
    );
  end if;

  select coalesce(sum(greatest(amount-paid_amount,0)),0)
  into v_due
  from public.school_installments
  where enrollment_id=p_enrollment_id
    and due_date <= p_exam_date
    and status not in('paid','waived');

  return jsonb_build_object(
    'eligible', v_due <= 0,
    'reason', case when v_due <= 0 then 'paid' else 'outstanding_fees' end,
    'outstanding', v_due
  );
end $$;

grant execute on function public.school_financial_exam_eligible(uuid,date) to authenticated;

-- 9) SCHOOL ADMIN RLS
alter table public.school_students enable row level security;
alter table public.school_parents enable row level security;
alter table public.school_parent_students enable row level security;
alter table public.school_enrollments enable row level security;
alter table public.school_fee_plans enable row level security;
alter table public.school_installments enable row level security;
alter table public.school_payments enable row level security;
alter table public.school_financial_clearance enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'school_students','school_parents','school_parent_students',
    'school_enrollments','school_fee_plans','school_installments',
    'school_payments','school_financial_clearance'
  ] loop
    execute format('drop policy if exists %I on public.%I',t||'_school_admin_all',t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin())',
      t||'_school_admin_all',t
    );
  end loop;
end $$;

-- Update S1 school core policies to school admin too.
do $$
declare t text;
begin
  foreach t in array array[
    'school_academic_years','school_stages','school_grade_levels','school_curricula',
    'school_subjects','school_grade_subjects','school_class_sections'
  ] loop
    execute format('drop policy if exists %I on public.%I',t||'_admin_write',t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_school_admin()) with check (public.is_school_admin())',
      t||'_admin_write',t
    );
  end loop;
end $$;

-- Replace S1 year save with School Admin
create or replace function public.school_save_academic_year(
  p_id uuid,p_name text,p_starts_on date,p_ends_on date,p_is_current boolean,p_status text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;
  if p_ends_on <= p_starts_on then raise exception 'End date must be after start date'; end if;
  if p_is_current then
    update public.school_academic_years set is_current=false where is_current=true;
  end if;
  if p_id is null then
    insert into public.school_academic_years(name,starts_on,ends_on,is_current,status)
    values(trim(p_name),p_starts_on,p_ends_on,coalesce(p_is_current,false),coalesce(p_status,'draft'))
    returning id into v_id;
  else
    update public.school_academic_years
    set name=trim(p_name),starts_on=p_starts_on,ends_on=p_ends_on,
        is_current=coalesce(p_is_current,false),status=coalesce(p_status,'draft'),
        updated_at=now()
    where id=p_id
    returning id into v_id;
  end if;
  return v_id;
end $$;

grant execute on function public.school_save_academic_year(uuid,text,date,date,boolean,text) to authenticated;

-- 10) DISPLAY NAMES
update public.school_grade_levels set name_ar='المستوى الأول',name_en='KG1' where code='KG1';
update public.school_grade_levels set name_ar='المستوى الثاني',name_en='KG2' where code='KG2';
update public.school_grade_levels set name_ar='المستوى الثالث',name_en='KG3' where code='KG3';

update public.school_grade_levels set name_en='Grade 1' where code='P1';
update public.school_grade_levels set name_en='Grade 2' where code='P2';
update public.school_grade_levels set name_en='Grade 3' where code='P3';
update public.school_grade_levels set name_en='Grade 4' where code='P4';
update public.school_grade_levels set name_en='Grade 5' where code='P5';
update public.school_grade_levels set name_en='Grade 6' where code='P6';
update public.school_grade_levels set name_en='Grade 7' where code='M1';
update public.school_grade_levels set name_en='Grade 8' where code='M2';
update public.school_grade_levels set name_en='Grade 9' where code='M3';
update public.school_grade_levels set name_en='Grade 10' where code='S1';
update public.school_grade_levels set name_en='Grade 11' where code='S2';
update public.school_grade_levels set name_en='Grade 12' where code='S3';

-- 11) HEALTH
create or replace function public.school_s2_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'students',(select count(*) from school_students),
  'parents',(select count(*) from school_parents),
  'parent_links',(select count(*) from school_parent_students),
  'active_enrollments',(select count(*) from school_enrollments where status='active'),
  'fee_plans',(select count(*) from school_fee_plans where is_active),
  'installments',(select count(*) from school_installments),
  'overdue_installments',(select count(*) from school_installments where status='overdue'),
  'payments',(select count(*) from school_payments)
);
$$;

grant execute on function public.school_s2_health() to authenticated;
