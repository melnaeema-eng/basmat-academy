-- ============================================================
-- SCHOOL S21 BIG — HR & STAFF MANAGEMENT COMPLETE
-- Built on actual S5/S6 schema
-- ============================================================

create table if not exists public.school_employee_performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.school_employees(id) on delete cascade,
  review_period_start date not null,
  review_period_end date not null,
  attendance_score numeric(5,2) check(attendance_score between 0 and 100),
  performance_score numeric(5,2) check(performance_score between 0 and 100),
  behavior_score numeric(5,2) check(behavior_score between 0 and 100),
  overall_score numeric(5,2) check(overall_score between 0 and 100),
  strengths text,
  improvement_areas text,
  manager_comment text,
  status text not null default 'draft' check(status in('draft','final')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(review_period_end>=review_period_start)
);

alter table public.school_employee_performance_reviews enable row level security;

drop policy if exists school_employee_reviews_admin_all on public.school_employee_performance_reviews;
create policy school_employee_reviews_admin_all
on public.school_employee_performance_reviews for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

create or replace function public.school_hr_dashboard()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'employees_total',(select count(*) from school_employees),
  'employees_active',(select count(*) from school_employees where status='active'),
  'employees_on_leave',(select count(*) from school_employees where status='on_leave'),
  'teachers_linked',(select count(*) from school_employees where teacher_id is not null),
  'auth_linked',(select count(*) from school_employees where auth_user_id is not null),
  'active_contracts',(select count(*) from school_employee_contracts where status='active'),
  'contracts_expiring_30_days',(
    select count(*) from school_employee_contracts
    where status='active'
      and ends_on is not null
      and ends_on between current_date and current_date+30
  ),
  'pending_leave_requests',(select count(*) from school_leave_requests where status='pending'),
  'attendance_today',(select count(*) from school_staff_attendance where attendance_date=current_date),
  'late_today',(select count(*) from school_staff_attendance where attendance_date=current_date and status='late'),
  'absent_today',(select count(*) from school_staff_attendance where attendance_date=current_date and status='absent'),
  'pending_overtime',(select count(*) from school_overtime_entries where status='pending'),
  'performance_reviews',(select count(*) from school_employee_performance_reviews),
  'payroll_runs',(select count(*) from school_payroll_runs)
);
$$;
grant execute on function public.school_hr_dashboard() to authenticated;

create or replace function public.school_employee_hr_profile(p_employee_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 return jsonb_build_object(
  'employee',(select to_jsonb(e) from school_employees e where e.id=p_employee_id),
  'contracts',coalesce((
    select jsonb_agg(to_jsonb(c) order by c.starts_on desc)
    from school_employee_contracts c where c.employee_id=p_employee_id
  ),'[]'::jsonb),
  'attendance_summary',coalesce((
    select jsonb_build_object(
      'present',count(*) filter(where status='present'),
      'late',count(*) filter(where status='late'),
      'absent',count(*) filter(where status='absent'),
      'leave',count(*) filter(where status='leave'),
      'remote',count(*) filter(where status='remote'),
      'late_minutes',coalesce(sum(late_minutes),0),
      'overtime_minutes',coalesce(sum(overtime_minutes),0)
    )
    from school_staff_attendance
    where employee_id=p_employee_id
      and attendance_date>=date_trunc('month',current_date)::date
  ),'{}'::jsonb),
  'leaves',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',l.id,'starts_on',l.starts_on,'ends_on',l.ends_on,'days_count',l.days_count,
      'status',l.status,'reason',l.reason,'leave_type',t.name_ar
    ) order by l.created_at desc)
    from school_leave_requests l
    join school_leave_types t on t.id=l.leave_type_id
    where l.employee_id=p_employee_id
  ),'[]'::jsonb),
  'overtime',coalesce((
    select jsonb_agg(to_jsonb(o) order by o.overtime_date desc)
    from school_overtime_entries o where o.employee_id=p_employee_id
  ),'[]'::jsonb),
  'reviews',coalesce((
    select jsonb_agg(to_jsonb(r) order by r.review_period_end desc)
    from school_employee_performance_reviews r where r.employee_id=p_employee_id
  ),'[]'::jsonb)
 );
end $$;
grant execute on function public.school_employee_hr_profile(uuid) to authenticated;

create or replace function public.school_save_performance_review(
 p_id uuid,
 p_employee_id uuid,
 p_start date,
 p_end date,
 p_attendance_score numeric,
 p_performance_score numeric,
 p_behavior_score numeric,
 p_strengths text,
 p_improvement_areas text,
 p_manager_comment text,
 p_final boolean
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid; ov numeric;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;

 ov:=round((
   coalesce(p_attendance_score,0)
   +coalesce(p_performance_score,0)
   +coalesce(p_behavior_score,0)
 )/3,2);

 if p_id is null then
   insert into school_employee_performance_reviews(
     employee_id,review_period_start,review_period_end,
     attendance_score,performance_score,behavior_score,overall_score,
     strengths,improvement_areas,manager_comment,status,reviewed_by,reviewed_at
   ) values(
     p_employee_id,p_start,p_end,
     p_attendance_score,p_performance_score,p_behavior_score,ov,
     nullif(trim(coalesce(p_strengths,'')),''),
     nullif(trim(coalesce(p_improvement_areas,'')),''),
     nullif(trim(coalesce(p_manager_comment,'')),''),
     case when p_final then 'final' else 'draft' end,
     auth.uid(),case when p_final then now() else null end
   ) returning id into rid;
 else
   update school_employee_performance_reviews
   set review_period_start=p_start,review_period_end=p_end,
       attendance_score=p_attendance_score,performance_score=p_performance_score,
       behavior_score=p_behavior_score,overall_score=ov,
       strengths=nullif(trim(coalesce(p_strengths,'')),''),
       improvement_areas=nullif(trim(coalesce(p_improvement_areas,'')),''),
       manager_comment=nullif(trim(coalesce(p_manager_comment,'')),''),
       status=case when p_final then 'final' else 'draft' end,
       reviewed_by=auth.uid(),
       reviewed_at=case when p_final then now() else reviewed_at end,
       updated_at=now()
   where id=p_id returning id into rid;
 end if;
 return rid;
end $$;
grant execute on function public.school_save_performance_review(uuid,uuid,date,date,numeric,numeric,numeric,text,text,text,boolean) to authenticated;

create or replace function public.school_s21_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
 'employees',(select count(*) from school_employees),
 'active_employees',(select count(*) from school_employees where status='active'),
 'contracts',(select count(*) from school_employee_contracts),
 'active_contracts',(select count(*) from school_employee_contracts where status='active'),
 'staff_attendance',(select count(*) from school_staff_attendance),
 'leave_requests',(select count(*) from school_leave_requests),
 'overtime_entries',(select count(*) from school_overtime_entries),
 'performance_reviews',(select count(*) from school_employee_performance_reviews),
 'payroll_runs',(select count(*) from school_payroll_runs),
 'unlinked_auth',(select count(*) from school_employees where status='active' and auth_user_id is null)
);
$$;
grant execute on function public.school_s21_health() to authenticated;

select public.school_s21_health();
