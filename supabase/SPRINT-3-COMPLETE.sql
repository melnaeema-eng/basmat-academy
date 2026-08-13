-- ==========================================
-- SPRINT 3 COMPLETE
-- Payments feedback + notifications + students management
-- ==========================================

-- 1) PAYMENTS: rejection / review fields
alter table public.payments
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

-- Normalize/replace payment status check if present
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.payments drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.payments
  add constraint payments_status_check
  check (status in ('pending','paid','failed','rejected','refunded'));

-- 2) NOTIFICATIONS
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

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
on public.notifications for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
on public.notifications for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admin insert notification
drop policy if exists "Admin insert notifications" on public.notifications;
create policy "Admin insert notifications"
on public.notifications for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- 3) PAYMENTS RLS
alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments"
on public.payments for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users insert own payments" on public.payments;
create policy "Users insert own payments"
on public.payments for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admin read all payments" on public.payments;
create policy "Admin read all payments"
on public.payments for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admin update payments" on public.payments;
create policy "Admin update payments"
on public.payments for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- 4) PROFILES / ENROLLMENTS admin read for students page
alter table public.profiles enable row level security;

drop policy if exists "Admin read all profiles" on public.profiles;
create policy "Admin read all profiles"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

alter table public.enrollments enable row level security;

drop policy if exists "Admin read all enrollments" on public.enrollments;
create policy "Admin read all enrollments"
on public.enrollments for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
