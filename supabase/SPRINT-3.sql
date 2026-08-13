-- ============================================================
-- Basmat Alnawabigh Academy - Sprint 3
-- Payments & Checkout
-- Free enrollment + Al Rajhi bank transfer + PayPal-ready backend
-- Run in Supabase SQL Editor
-- ============================================================

-- 1) Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  method text not null check (method in ('bank_transfer','paypal','alrajhi_gateway','stcpay')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'SAR',
  status text not null default 'pending'
    check (status in ('pending','paid','failed','rejected','refunded')),
  receipt_path text,
  bank_reference text,
  provider_order_id text,
  provider_capture_id text,
  admin_note text,
  paid_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_course on public.payments(course_id);
create index if not exists idx_payments_status on public.payments(status);
create unique index if not exists idx_payments_paypal_order_unique
  on public.payments(provider_order_id)
  where provider_order_id is not null;

alter table public.payments enable row level security;

drop policy if exists "Students view own payments" on public.payments;
create policy "Students view own payments"
on public.payments for select to authenticated
using (auth.uid() = user_id);

-- Students can submit only a pending bank transfer for the exact course price.
drop policy if exists "Students submit bank transfer" on public.payments;
create policy "Students submit bank transfer"
on public.payments for insert to authenticated
with check (
  auth.uid() = user_id
  and method = 'bank_transfer'
  and status = 'pending'
  and currency = 'SAR'
  and exists (
    select 1 from public.courses c
    where c.id = course_id
      and coalesce(c.price,0) > 0
      and amount = coalesce(c.price,0)
  )
);

drop policy if exists "Admins view all payments" on public.payments;
create policy "Admins view all payments"
on public.payments for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  )
);

-- 2) Harden enrollments: students may self-enroll only in FREE courses.
-- Paid enrollment is created by verified PayPal backend or admin approval.
drop policy if exists "Students can enroll themselves" on public.enrollments;
drop policy if exists "Students enroll in free courses" on public.enrollments;
create policy "Students enroll in free courses"
on public.enrollments for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.courses c
    where c.id = course_id
      and coalesce(c.price,0) <= 0
  )
);

drop policy if exists "Admins can insert enrollments" on public.enrollments;
create policy "Admins can insert enrollments"
on public.enrollments for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  )
);

-- 3) Private bucket for bank-transfer receipts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Students upload own payment receipts" on storage.objects;
create policy "Students upload own payment receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students view own payment receipts" on storage.objects;
create policy "Students view own payment receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins view payment receipts" on storage.objects;
create policy "Admins view payment receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  )
);

-- 4) Admin bank-transfer approval/rejection RPCs
create or replace function public.approve_bank_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  ) then
    raise exception 'Admin permission required';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.method <> 'bank_transfer' then
    raise exception 'Only bank transfer payments can be approved manually';
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('success', true, 'already_paid', true);
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is not pending';
  end if;

  insert into public.enrollments (user_id, course_id, status, progress)
  values (v_payment.user_id, v_payment.course_id, 'active', 0)
  on conflict (user_id, course_id) do nothing;

  update public.payments
  set status = 'paid',
      paid_at = now(),
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.reject_bank_payment(p_payment_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  ) then
    raise exception 'Admin permission required';
  end if;

  update public.payments
  set status = 'rejected',
      admin_note = p_note,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and method = 'bank_transfer'
    and status = 'pending';

  if not found then
    raise exception 'Pending bank transfer not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.approve_bank_payment(uuid) from public;
grant execute on function public.approve_bank_payment(uuid) to authenticated;
revoke all on function public.reject_bank_payment(uuid,text) from public;
grant execute on function public.reject_bank_payment(uuid,text) to authenticated;

-- 5) PayPal finalization RPC: called only by the Supabase service role
-- after the Edge Function verifies COMPLETED status, amount and currency with PayPal.
create or replace function public.finalize_paypal_payment(p_payment_id uuid, p_capture_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.method <> 'paypal' then
    raise exception 'Payment method is not PayPal';
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object('success', true, 'already_paid', true);
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment is not pending';
  end if;

  insert into public.enrollments (user_id, course_id, status, progress)
  values (v_payment.user_id, v_payment.course_id, 'active', 0)
  on conflict (user_id, course_id) do nothing;

  update public.payments
  set status = 'paid',
      provider_capture_id = p_capture_id,
      paid_at = now(),
      updated_at = now()
  where id = p_payment_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.finalize_paypal_payment(uuid,text) from public;
revoke all on function public.finalize_paypal_payment(uuid,text) from anon;
revoke all on function public.finalize_paypal_payment(uuid,text) from authenticated;
grant execute on function public.finalize_paypal_payment(uuid,text) to service_role;
