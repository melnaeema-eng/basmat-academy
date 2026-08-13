-- ============================================================
-- SPRINT 3R — RECOVERY & PAYMENTS REBUILD
-- Fixes profiles RLS recursion safely and completes payments flow.
-- Does NOT delete courses, enrollments, profiles, or payment history.
-- ============================================================

-- 0) SECURITY DEFINER admin checker: avoids profiles-policy recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(trim(coalesce(role,''))) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 1) RECOVER PROFILES RLS.
-- Remove all existing policies on profiles because a previous Sprint created
-- a recursive SELECT policy. Recreate only non-recursive policies.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;
end $$;

alter table public.profiles enable row level security;

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 2) PAYMENTS: ensure required review columns exist.
alter table public.payments
  add column if not exists admin_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz default now();

alter table public.payments enable row level security;

-- Replace payment policies with non-recursive admin check.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='payments'
  loop
    execute format('drop policy if exists %I on public.payments', r.policyname);
  end loop;
end $$;

create policy "payments_select_own_or_admin"
on public.payments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "payments_insert_own_bank_transfer"
on public.payments for insert to authenticated
with check (
  user_id = auth.uid()
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

-- 3) ENROLLMENTS: own read + admin read; free self-enrollment only.
alter table public.enrollments enable row level security;

drop policy if exists "Admin read all enrollments" on public.enrollments;
drop policy if exists "Admins view all enrollments" on public.enrollments;
create policy "enrollments_admin_select"
on public.enrollments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- 4) Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  related_payment_id uuid references public.payments(id) on delete set null,
  related_course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (user_id=auth.uid());
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

-- 5) Storage receipt policies using non-recursive is_admin()
drop policy if exists "Admins view payment receipts" on storage.objects;
drop policy if exists "Sprint3R admin receipt read" on storage.objects;
create policy "Sprint3R admin receipt read"
on storage.objects for select to authenticated
using (bucket_id='payment-receipts' and public.is_admin());

-- 6) Approval RPC: enroll + notify.
create or replace function public.approve_bank_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v public.payments%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;

  select * into v from public.payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v.method <> 'bank_transfer' then raise exception 'Only bank transfer can be approved manually'; end if;
  if v.status='paid' then return jsonb_build_object('success',true,'already_paid',true); end if;
  if v.status<>'pending' then raise exception 'Payment is not pending'; end if;

  insert into public.enrollments(user_id,course_id,status,progress)
  values(v.user_id,v.course_id,'active',0)
  on conflict(user_id,course_id) do update set status='active';

  update public.payments set status='paid',paid_at=now(),reviewed_at=now(),
    reviewed_by=auth.uid(),admin_note=null,updated_at=now()
  where id=p_payment_id;

  insert into public.notifications(user_id,title,message,type,related_payment_id,related_course_id)
  values(v.user_id,'تم اعتماد الدفع','تم قبول إيصال الدفع وأصبحت الدورة متاحة لك.',
    'payment_approved',v.id,v.course_id);

  return jsonb_build_object('success',true);
end $$;

-- 7) Rejection RPC: reason REQUIRED + notify.
create or replace function public.reject_bank_payment(p_payment_id uuid,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v public.payments%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;
  if nullif(trim(coalesce(p_note,'')),'') is null then raise exception 'Rejection reason is required'; end if;

  select * into v from public.payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v.method<>'bank_transfer' or v.status<>'pending' then raise exception 'Pending bank transfer not found'; end if;

  update public.payments set status='rejected',admin_note=trim(p_note),
    reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now()
  where id=p_payment_id;

  insert into public.notifications(user_id,title,message,type,related_payment_id,related_course_id)
  values(v.user_id,'تم رفض إيصال الدفع','سبب الرفض: '||trim(p_note),
    'payment_rejected',v.id,v.course_id);

  return jsonb_build_object('success',true);
end $$;

revoke all on function public.approve_bank_payment(uuid) from public;
grant execute on function public.approve_bank_payment(uuid) to authenticated;
revoke all on function public.reject_bank_payment(uuid,text) from public;
grant execute on function public.reject_bank_payment(uuid,text) to authenticated;
