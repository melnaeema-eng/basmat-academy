-- ============================================================
-- SPRINT 11 — CANCEL / REFUND RPC FIX V2
-- Does NOT throw business-rule exceptions, so React will not get HTTP 400
-- for normal states such as already-cancelled/not-enrolled.
-- ============================================================

create or replace function public.cancel_my_free_enrollment(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_enrollment_id uuid;
  v_status text;
  v_price numeric := 0;
begin
  if v_user is null then
    return jsonb_build_object(
      'success',false,
      'reason','login_required'
    );
  end if;

  -- Find the student's enrollment first. Do not guess from UI state.
  select e.id, coalesce(e.status,'active'), coalesce(c.price,0)
  into v_enrollment_id, v_status, v_price
  from public.enrollments e
  join public.courses c on c.id=e.course_id
  where e.user_id=v_user
    and e.course_id=p_course_id
  limit 1;

  if v_enrollment_id is null then
    return jsonb_build_object(
      'success',false,
      'reason','not_enrolled'
    );
  end if;

  -- Repeated cancellation is idempotent: return success, not an exception.
  if v_status='cancelled' then
    return jsonb_build_object(
      'success',true,
      'already_cancelled',true,
      'course_id',p_course_id
    );
  end if;

  if exists(
    select 1
    from public.certificates cert
    where cert.user_id=v_user
      and cert.course_id=p_course_id
  ) then
    return jsonb_build_object(
      'success',false,
      'reason','certified'
    );
  end if;

  if v_price > 0 then
    return jsonb_build_object(
      'success',false,
      'reason','paid_course',
      'requires_refund',true
    );
  end if;

  update public.enrollments
  set status='cancelled'
  where id=v_enrollment_id;

  return jsonb_build_object(
    'success',true,
    'already_cancelled',false,
    'course_id',p_course_id
  );
end $$;

revoke all on function public.cancel_my_free_enrollment(uuid) from public;
grant execute on function public.cancel_my_free_enrollment(uuid) to authenticated;


-- Paid refund: once Admin marks the real-world refund as PROCESSED,
-- revoke course access by cancelling the enrollment while retaining history.
create or replace function public.decide_refund(
  p_refund_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid;
  v_course_id uuid;
  v_payment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  if p_decision not in ('approved','rejected','processed') then
    raise exception 'Invalid decision';
  end if;

  select rr.user_id, rr.course_id, rr.payment_id
  into v_user_id, v_course_id, v_payment_id
  from public.refund_requests rr
  where rr.id=p_refund_id
  for update;

  if v_user_id is null then
    raise exception 'Refund request not found';
  end if;

  update public.refund_requests
  set status=p_decision,
      admin_note=p_note,
      decided_at=now(),
      decided_by=auth.uid()
  where id=p_refund_id;

  if p_decision='processed' then
    update public.orders
    set status='refunded'
    where payment_id=v_payment_id;

    update public.payments
    set status='refunded',
        updated_at=now()
    where id=v_payment_id
      and status='paid';

    update public.enrollments
    set status='cancelled'
    where user_id=v_user_id
      and course_id=v_course_id
      and coalesce(status,'active') <> 'cancelled';
  end if;
end $$;

revoke all on function public.decide_refund(uuid,text,text) from public;
grant execute on function public.decide_refund(uuid,text,text) to authenticated;


-- Repair already-processed refunds from previous Sprint 11 attempts:
-- hide those paid courses from My Courses immediately.
update public.enrollments e
set status='cancelled'
from public.refund_requests rr
where rr.user_id=e.user_id
  and rr.course_id=e.course_id
  and rr.status='processed'
  and coalesce(e.status,'active') <> 'cancelled';

update public.payments p
set status='refunded',
    updated_at=now()
from public.refund_requests rr
where rr.payment_id=p.id
  and rr.status='processed'
  and p.status='paid';

update public.orders o
set status='refunded'
from public.refund_requests rr
where rr.payment_id=o.payment_id
  and rr.status='processed'
  and o.status <> 'refunded';
