-- Student course cancellation — Sprint 11 hotfix
-- Free course: student can cancel own enrollment.
-- Paid course: must use existing refund workflow.
-- Certified course: cancellation blocked.

create or replace function public.cancel_my_free_enrollment(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_price numeric;
  v_enrollment_id uuid;
begin
  select coalesce(price,0) into v_price from courses where id=p_course_id;
  if not found then raise exception 'Course not found'; end if;

  if v_price > 0 then
    raise exception 'Paid courses must use the refund workflow';
  end if;

  if exists(
    select 1 from certificates
    where user_id=auth.uid() and course_id=p_course_id
  ) then
    raise exception 'Certified courses cannot be cancelled';
  end if;

  select id into v_enrollment_id
  from enrollments
  where user_id=auth.uid()
    and course_id=p_course_id
    and coalesce(status,'active') <> 'cancelled'
  limit 1;

  if v_enrollment_id is null then
    raise exception 'Active enrollment not found';
  end if;

  update enrollments
  set status='cancelled'
  where id=v_enrollment_id;

  return jsonb_build_object('success',true,'course_id',p_course_id);
end $$;

grant execute on function public.cancel_my_free_enrollment(uuid) to authenticated;
