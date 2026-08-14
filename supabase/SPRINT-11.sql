-- SPRINT 11 — COMMERCE & PRODUCTION CLOSURE
-- Cart, orders/invoices, refunds, email outbox, production security.

create table if not exists public.shopping_cart (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,course_id)
);
alter table shopping_cart enable row level security;
drop policy if exists "shopping_cart_own" on shopping_cart;
create policy "shopping_cart_own" on shopping_cart for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check(status in('pending','paid','cancelled','partially_refunded','refunded')),
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'SAR',
  payment_method text,
  payment_id uuid references payments(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create sequence if not exists public.academy_invoice_seq start 1001;
create or replace function public.set_invoice_number() returns trigger language plpgsql as $$
begin if new.invoice_number is null then new.invoice_number:='BNA-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.academy_invoice_seq')::text,6,'0'); end if; return new; end $$;
drop trigger if exists trg_set_invoice_number on orders;
create trigger trg_set_invoice_number before insert on orders for each row execute function set_invoice_number();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  course_id uuid not null references courses(id) on delete restrict,
  course_title text not null,
  unit_price numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  final_amount numeric(10,2) not null,
  unique(order_id,course_id)
);
alter table orders enable row level security; alter table order_items enable row level security;
drop policy if exists "orders_own_read" on orders;
create policy "orders_own_read" on orders for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "order_items_own_read" on order_items;
create policy "order_items_own_read" on order_items for select to authenticated
using(public.is_admin() or exists(select 1 from orders o where o.id=order_id and o.user_id=auth.uid()));

create table if not exists public.refund_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 payment_id uuid not null references payments(id) on delete restrict,
 course_id uuid not null references courses(id) on delete restrict,
 reason text not null,
 status text not null default 'requested' check(status in('requested','approved','rejected','processed')),
 admin_note text,
 requested_at timestamptz not null default now(),
 decided_at timestamptz,
 decided_by uuid references auth.users(id),
 unique(user_id,payment_id)
);
alter table refund_requests enable row level security;
drop policy if exists "refund_own_read" on refund_requests;
create policy "refund_own_read" on refund_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "refund_own_insert" on refund_requests;
create policy "refund_own_insert" on refund_requests for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from payments p where p.id=payment_id and p.user_id=auth.uid() and p.status='paid'));
drop policy if exists "refund_admin_update" on refund_requests;
create policy "refund_admin_update" on refund_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());

create table if not exists public.email_outbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 recipient text not null,
 template text not null,
 subject text not null,
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in('pending','sent','failed')),
 attempts integer not null default 0,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
alter table email_outbox enable row level security;
drop policy if exists "email_outbox_admin" on email_outbox;
create policy "email_outbox_admin" on email_outbox for select to authenticated using(public.is_admin());

create or replace function public.create_order_from_payment(p_payment_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare p payments%rowtype; c courses%rowtype; oid uuid;
begin
 select * into p from payments where id=p_payment_id;
 if not found or p.status<>'paid' then return null; end if;
 if exists(select 1 from orders where payment_id=p.id) then select id into oid from orders where payment_id=p.id; return oid; end if;
 select * into c from courses where id=p.course_id;
 insert into orders(user_id,status,subtotal,discount_amount,total,currency,payment_method,payment_id,paid_at)
 values(p.user_id,'paid',coalesce(p.original_amount,p.amount),coalesce(p.discount_amount,0),p.amount,p.currency,p.method,p.id,now()) returning id into oid;
 insert into order_items(order_id,course_id,course_title,unit_price,discount_amount,final_amount)
 values(oid,c.id,c.title,coalesce(p.original_amount,p.amount),coalesce(p.discount_amount,0),p.amount);
 return oid;
end $$;

create or replace function public.sync_paid_order() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status='paid' and old.status is distinct from 'paid' then perform create_order_from_payment(new.id); end if; return new; end $$;
drop trigger if exists trg_sync_paid_order on payments;
create trigger trg_sync_paid_order after update of status on payments for each row execute function sync_paid_order();

-- Backfill existing paid purchases safely.
do $$ declare r record; begin for r in select id from payments where status='paid' loop perform create_order_from_payment(r.id); end loop; end $$;

create or replace function public.request_refund(p_payment_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare p payments%rowtype; rid uuid;
begin
 select * into p from payments where id=p_payment_id and user_id=auth.uid() and status='paid';
 if not found then raise exception 'Paid purchase not found'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Refund reason required'; end if;
 insert into refund_requests(user_id,payment_id,course_id,reason) values(auth.uid(),p.id,p.course_id,trim(p_reason))
 returning id into rid; return rid;
end $$;
grant execute on function request_refund(uuid,text) to authenticated;

create or replace function public.decide_refund(p_refund_id uuid,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if p_decision not in('approved','rejected','processed') then raise exception 'Invalid decision'; end if;
 update refund_requests set status=p_decision,admin_note=p_note,decided_at=now(),decided_by=auth.uid() where id=p_refund_id;
 if p_decision='processed' then
   update orders set status='refunded' where payment_id=(select payment_id from refund_requests where id=p_refund_id);
 end if;
end $$;
grant execute on function decide_refund(uuid,text,text) to authenticated;

create or replace function public.queue_email(p_user_id uuid,p_template text,p_subject text,p_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare em text; eid uuid;
begin
 select email into em from profiles where id=p_user_id;
 if em is null then return null; end if;
 insert into email_outbox(user_id,recipient,template,subject,payload) values(p_user_id,em,p_template,p_subject,coalesce(p_payload,'{}')) returning id into eid;
 return eid;
end $$;

-- Production hardening: explicit grants only for app tables added in S11.
revoke all on shopping_cart,orders,order_items,refund_requests,email_outbox from anon;
grant select,insert,delete on shopping_cart to authenticated;
grant select on orders,order_items to authenticated;
grant select,insert on refund_requests to authenticated;
grant select on email_outbox to authenticated;


-- Queue important transactional emails.
create or replace function public.queue_payment_email() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status and new.status in('paid','rejected') then
   perform queue_email(new.user_id,'payment_'||new.status,
     case when new.status='paid' then 'Payment approved — Basmat Alnawabigh Academy' else 'Payment update — Basmat Alnawabigh Academy' end,
     jsonb_build_object('payment_id',new.id,'course_id',new.course_id,'amount',new.amount,'currency',new.currency,'status',new.status));
 end if; return new;
end $$;
drop trigger if exists trg_queue_payment_email on payments;
create trigger trg_queue_payment_email after update of status on payments for each row execute function queue_payment_email();

create or replace function public.queue_refund_email() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status then
   perform queue_email(new.user_id,'refund_'||new.status,'Refund update — Basmat Alnawabigh Academy',
     jsonb_build_object('refund_id',new.id,'course_id',new.course_id,'status',new.status,'admin_note',new.admin_note));
 end if; return new;
end $$;
drop trigger if exists trg_queue_refund_email on refund_requests;
create trigger trg_queue_refund_email after update of status on refund_requests for each row execute function queue_refund_email();
