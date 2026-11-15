-- Additive lab catalogue/content access. Existing parent courses and purchases are preserved.
create schema if not exists academy_private;
revoke all on schema academy_private from public,anon,authenticated;
create table public.academy_lab_catalog (
 id uuid primary key default gen_random_uuid(),
 track text not null check(track in ('ccna','ccnp')),
 lab_number integer not null check(lab_number>0),
 slug text not null check(slug ~ '^l[0-9]+-[a-z0-9-]+$'),
 title_ar text not null,title_en text not null,
 summary_ar text not null default '',summary_en text not null default '',
 duration_minutes integer not null check(duration_minutes>0),
 price numeric(10,2) not null check(price>=0),
 currency text not null default 'SAR' check(currency='SAR'),
 course_id uuid not null unique references public.courses(id) on delete restrict,
 lesson_id uuid references public.lessons(id) on delete set null,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 unique(track,lab_number),unique(track,slug),
 check((lab_number=1 and price=0) or (lab_number>1 and price>0))
);
create table public.academy_lab_content (
 lab_id uuid primary key references public.academy_lab_catalog(id) on delete cascade,
 student_html text not null,
 updated_at timestamptz not null default now()
);
create table public.academy_lab_access (
 id uuid primary key default gen_random_uuid(),
 lab_id uuid not null references public.academy_lab_catalog(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 payment_id uuid not null unique references public.payments(id) on delete cascade,
 granted_at timestamptz not null default now(), revoked_at timestamptz,
 unique(lab_id,user_id,payment_id)
);
create index academy_lab_access_user_lab on public.academy_lab_access(user_id,lab_id) where revoked_at is null;
create index academy_lab_catalog_lesson on public.academy_lab_catalog(lesson_id);
alter table public.academy_lab_catalog enable row level security;
alter table public.academy_lab_content enable row level security;
alter table public.academy_lab_access enable row level security;
grant select on public.academy_lab_catalog,public.academy_lab_content to anon,authenticated;
grant select on public.academy_lab_access to authenticated;
grant all on public.academy_lab_catalog,public.academy_lab_content,public.academy_lab_access to service_role;
create policy lab_catalog_read on public.academy_lab_catalog for select to anon,authenticated using(is_published or (select public.is_admin()));
create policy lab_access_read_own on public.academy_lab_access for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy lab_content_read on public.academy_lab_content for select to anon,authenticated using(
 (select public.is_admin()) or exists (
  select 1 from public.academy_lab_catalog c where c.id=lab_id and c.is_published and
   (c.price=0 or exists(select 1 from public.academy_lab_access a where a.lab_id=c.id and a.user_id=(select auth.uid()) and a.revoked_at is null))
 )
);
-- Student inserts must never forge a successful payment through legacy permissive payment policies.
create function academy_private.guard_lab_payment() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_price numeric; v_is_lab boolean;
begin
 if tg_op='UPDATE' then
  select exists(select 1 from public.academy_lab_catalog where course_id=old.course_id) into v_is_lab;
  if v_is_lab and (new.course_id is distinct from old.course_id or new.user_id is distinct from old.user_id) then raise exception 'Lab payment ownership is immutable';end if;
 end if;
 select price into v_price from public.academy_lab_catalog where course_id=new.course_id;
 if not found then return new;end if;
 if public.is_admin() or coalesce(auth.jwt()->>'role','')='service_role' or (auth.uid() is null and session_user in ('postgres','supabase_admin')) then return new;end if;
 if tg_op<>'INSERT' or new.user_id is distinct from auth.uid() or new.method<>'bank_transfer' or new.status<>'pending'
  or new.currency<>'SAR' or new.amount is distinct from v_price or v_price<=0
  or new.coupon_id is not null or coalesce(new.discount_amount,0)<>0
  or new.paid_at is not null or new.reviewed_at is not null or new.reviewed_by is not null
  or new.provider_order_id is not null or new.provider_capture_id is not null or new.admin_note is not null
  or new.receipt_path is null or new.receipt_path not like auth.uid()::text||'/'||new.course_id::text||'/%'
 then raise exception 'Lab purchase must be a pending receipt at the published price';end if;
 new.original_amount:=v_price;new.discount_amount:=0;
 return new;
end;$$;
revoke all on function academy_private.guard_lab_payment() from public,anon,authenticated;
create trigger lab_payment_guard before insert or update on public.payments for each row execute function academy_private.guard_lab_payment();
-- Only a trusted/admin-confirmed transition to paid grants access; refunds revoke that payment grant.
create function academy_private.sync_lab_access() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_lab uuid;
begin
 select id into v_lab from public.academy_lab_catalog where course_id=new.course_id;
 if not found then return new;end if;
 if new.status='paid' and new.paid_at is not null then
  insert into public.academy_lab_access(lab_id,user_id,payment_id) values(v_lab,new.user_id,new.id)
  on conflict(payment_id) do update set revoked_at=null;
 else
  update public.academy_lab_access set revoked_at=coalesce(revoked_at,now()) where payment_id=new.id;
 end if;
 return new;
end;$$;
revoke all on function academy_private.sync_lab_access() from public,anon,authenticated;
create trigger lab_payment_access after insert or update of status,paid_at on public.payments for each row execute function academy_private.sync_lab_access();
-- Prevent learners changing product price/deleting lab products through old general course policies.
create function academy_private.guard_lab_course() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select 1 from public.academy_lab_catalog where course_id=old.id) and not
  (public.is_admin() or coalesce(auth.jwt()->>'role','')='service_role' or (auth.uid() is null and session_user in ('postgres','supabase_admin'))) then raise exception 'Lab product changes require administration';end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function academy_private.guard_lab_course() from public,anon,authenticated;
create trigger lab_course_guard before update or delete on public.courses for each row execute function academy_private.guard_lab_course();
-- Anonymous users may inspect no entitlement rows, but need relation privilege for the free-content RLS expression.
grant select on public.academy_lab_access to anon;
create function academy_private.sync_lab_price() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 update public.academy_lab_catalog set price=new.price where course_id=new.id;
 return new;
end;$$;
revoke all on function academy_private.sync_lab_price() from public,anon,authenticated;
create trigger lab_price_sync after update of price on public.courses for each row when(old.price is distinct from new.price) execute function academy_private.sync_lab_price();
