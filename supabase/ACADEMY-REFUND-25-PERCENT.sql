-- Course consumption locks are permanent, even if progress is later reduced.
create table academy_private.course_refund_locks(
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 locked_at timestamptz not null default now(),
 primary key(user_id,course_id)
);
revoke all on academy_private.course_refund_locks from public,anon,authenticated;
alter table public.enrollments add column if not exists refund_locked_at timestamptz;
insert into academy_private.course_refund_locks(user_id,course_id)
 select distinct user_id,course_id from public.enrollments where progress>=25 on conflict do nothing;
update public.enrollments e set refund_locked_at=l.locked_at from academy_private.course_refund_locks l where l.user_id=e.user_id and l.course_id=e.course_id;
create function academy_private.keep_course_refund_lock() returns trigger language plpgsql security definer set search_path='' as $$
declare locked timestamptz;
begin
 if coalesce(new.progress,0)>=25 then
  insert into academy_private.course_refund_locks(user_id,course_id) values(new.user_id,new.course_id) on conflict do nothing;
 end if;
 select locked_at into locked from academy_private.course_refund_locks where user_id=new.user_id and course_id=new.course_id;
 new.refund_locked_at:=locked;
 return new;
end;$$;
revoke all on function academy_private.keep_course_refund_lock() from public,anon,authenticated;
create trigger academy_keep_course_refund_lock before insert or update on public.enrollments for each row execute function academy_private.keep_course_refund_lock();
create function academy_private.enforce_refund_progress_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare purchase public.payments%rowtype; observed integer; locked timestamptz;
begin
 if tg_op='UPDATE' then
  if new.user_id is distinct from old.user_id or new.course_id is distinct from old.course_id or new.payment_id is distinct from old.payment_id then raise exception 'refund_identity_immutable';end if;
  if new.status='rejected' then return new;end if;
 end if;
 select * into purchase from public.payments where id=new.payment_id;
 if not found or new.user_id is distinct from purchase.user_id or new.course_id is distinct from purchase.course_id then raise exception 'refund_purchase_mismatch';end if;
 if tg_op='INSERT' and auth.uid() is not null and not public.is_admin() and new.status<>'pending' then raise exception 'refund_pending_required';end if;
 if tg_op='INSERT' or (new.status is distinct from old.status and new.status in('approved','processed')) then
  if purchase.status<>'paid' then raise exception 'paid_purchase_required';end if;
  select e.progress,e.refund_locked_at into observed,locked from public.enrollments e where e.user_id=new.user_id and e.course_id=new.course_id order by e.progress desc nulls last limit 1 for share;
  if coalesce(observed,0)>=25 or locked is not null or exists(select 1 from academy_private.course_refund_locks l where l.user_id=new.user_id and l.course_id=new.course_id) then raise exception 'refund_progress_limit';end if;
 end if;
 return new;
end;$$;
revoke all on function academy_private.enforce_refund_progress_limit() from public,anon,authenticated;
create trigger academy_enforce_refund_progress_limit before insert or update on public.refund_requests for each row execute function academy_private.enforce_refund_progress_limit();
create function public.get_my_refund_eligibility(p_payment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare purchase public.payments%rowtype; observed integer; locked boolean;
begin
 if auth.uid() is null then raise exception 'login_required';end if;
 select * into purchase from public.payments where id=p_payment_id and user_id=auth.uid() and status='paid';
 if not found then return jsonb_build_object('eligible',false,'reason','payment_unavailable');end if;
 select coalesce(max(progress),0) into observed from public.enrollments where user_id=auth.uid() and course_id=purchase.course_id;
 locked:=observed>=25 or exists(select 1 from academy_private.course_refund_locks l where l.user_id=auth.uid() and l.course_id=purchase.course_id);
 return jsonb_build_object('eligible',not locked,'reason',case when locked then 'progress_limit' else 'eligible' end,'progress',observed);
end;$$;
revoke all on function public.get_my_refund_eligibility(uuid) from public,anon;
grant execute on function public.get_my_refund_eligibility(uuid) to authenticated;
