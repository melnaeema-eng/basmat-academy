-- ============================================================
-- SPRINT 3R FIX — STUDENTS + NOTIFICATIONS
-- Root cause fixes based on the actual Register.jsx and Students.jsx.
-- ============================================================

-- 1) Admin checker without profiles RLS recursion.
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

-- 2) Ensure profiles policies are non-recursive.
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

create policy "profiles_read_self_or_admin"
on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3) FIX ROOT CAUSE:
-- Register.jsx creates auth.users metadata but does not insert public.profiles.
-- This trigger creates a student profile automatically for every new auth user.
create or replace function public.handle_new_academy_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email,'@',1)),
    new.email,
    'student'
  )
  on conflict (id) do update
  set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_academy_profile on auth.users;
create trigger on_auth_user_created_academy_profile
after insert on auth.users
for each row execute procedure public.handle_new_academy_user();

-- 4) BACKFILL existing students already in Auth but missing from profiles.
-- Existing profile roles are preserved, so existing admins are not converted to students.
insert into public.profiles (id, full_name, email, role)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email,'@',1)),
  u.email,
  'student'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Fill missing names/emails on existing profiles without changing roles.
update public.profiles p
set
  full_name = coalesce(
    nullif(trim(p.full_name),''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'),''),
    split_part(u.email,'@',1)
  ),
  email = coalesce(nullif(trim(p.email),''), u.email)
from auth.users u
where p.id = u.id
  and (
    nullif(trim(p.full_name),'') is null
    or nullif(trim(p.email),'') is null
  );

-- 5) Notifications table.
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
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 6) Make payment notifications DATABASE-DRIVEN.
-- This removes dependence on a particular Admin React screen.
create or replace function public.notify_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then

    if new.status = 'paid' then
      if not exists (
        select 1 from public.notifications
        where related_payment_id = new.id
          and type = 'payment_approved'
      ) then
        insert into public.notifications(
          user_id,title,message,type,related_payment_id,related_course_id
        )
        values(
          new.user_id,
          'تم اعتماد الدفع',
          'تم قبول دفعتك وأصبحت الدورة متاحة لك.',
          'payment_approved',
          new.id,
          new.course_id
        );
      end if;

    elsif new.status = 'rejected' then
      if not exists (
        select 1 from public.notifications
        where related_payment_id = new.id
          and type = 'payment_rejected'
      ) then
        insert into public.notifications(
          user_id,title,message,type,related_payment_id,related_course_id
        )
        values(
          new.user_id,
          'تم رفض إيصال الدفع',
          'سبب الرفض: ' || coalesce(nullif(trim(new.admin_note),''),'لم يتم تحديد السبب'),
          'payment_rejected',
          new.id,
          new.course_id
        );
      end if;
    end if;

  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_payment_status_change on public.payments;
create trigger trg_notify_payment_status_change
after update of status on public.payments
for each row
execute procedure public.notify_payment_status_change();

-- 7) Backfill notifications for already-reviewed payments.
insert into public.notifications(
  user_id,title,message,type,related_payment_id,related_course_id
)
select
  p.user_id,
  case when p.status='paid' then 'تم اعتماد الدفع' else 'تم رفض إيصال الدفع' end,
  case
    when p.status='paid' then 'تم قبول دفعتك وأصبحت الدورة متاحة لك.'
    else 'سبب الرفض: ' || coalesce(nullif(trim(p.admin_note),''),'لم يتم تحديد السبب')
  end,
  case when p.status='paid' then 'payment_approved' else 'payment_rejected' end,
  p.id,
  p.course_id
from public.payments p
where p.status in ('paid','rejected')
and not exists (
  select 1
  from public.notifications n
  where n.related_payment_id = p.id
    and n.type = case when p.status='paid' then 'payment_approved' else 'payment_rejected' end
);
