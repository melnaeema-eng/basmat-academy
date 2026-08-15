-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S11 BIG
-- COMMUNICATIONS + NOTIFICATIONS + ANNOUNCEMENTS
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Announcement channels
create table if not exists public.school_announcements (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text,
  body_ar text not null,
  body_en text,
  audience text not null default 'all'
    check(audience in('all','students','parents','teachers','staff','class')),
  academic_year_id uuid references public.school_academic_years(id) on delete set null,
  curriculum_id uuid references public.school_curricula(id) on delete set null,
  grade_level_id uuid references public.school_grade_levels(id) on delete set null,
  class_section_id uuid references public.school_class_sections(id) on delete set null,
  priority text not null default 'normal'
    check(priority in('low','normal','high','urgent')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Message/notification templates
create table if not exists public.school_message_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  subject_ar text,
  subject_en text,
  body_ar text not null,
  body_en text,
  channel text not null default 'in_app'
    check(channel in('in_app','email','sms','whatsapp')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Unified notification inbox
create table if not exists public.school_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_role text,
  notification_type text not null default 'general'
    check(notification_type in(
      'general','announcement','fee_due','payment_received','attendance',
      'homework','exam','result','certificate','admission','leave','payroll'
    )),
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  priority text not null default 'normal'
    check(priority in('low','normal','high','urgent')),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4) Communication delivery log
create table if not exists public.school_communication_log (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_address text,
  channel text not null
    check(channel in('in_app','email','sms','whatsapp')),
  template_code text,
  subject text,
  body text not null,
  status text not null default 'queued'
    check(status in('queued','sent','delivered','failed','cancelled')),
  provider_message_id text,
  error_message text,
  entity_type text,
  entity_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5) Notification preferences
create table if not exists public.school_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  fee_alerts boolean not null default true,
  attendance_alerts boolean not null default true,
  homework_alerts boolean not null default true,
  exam_alerts boolean not null default true,
  result_alerts boolean not null default true,
  announcement_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 6) Helper: create notification
create or replace function public.school_notify_user(
  p_user_id uuid,
  p_role text,
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_action_url text,
  p_priority text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid;
begin
  if p_user_id is null then return null; end if;

  insert into school_notifications(
    recipient_user_id,recipient_role,notification_type,title,body,
    entity_type,entity_id,action_url,priority
  )
  values(
    p_user_id,p_role,coalesce(p_type,'general'),p_title,p_body,
    p_entity_type,p_entity_id,p_action_url,coalesce(p_priority,'normal')
  )
  returning id into rid;

  insert into school_communication_log(
    recipient_user_id,channel,subject,body,status,
    entity_type,entity_id,created_by,sent_at
  )
  values(
    p_user_id,'in_app',p_title,p_body,'delivered',
    p_entity_type,p_entity_id,auth.uid(),now()
  );

  return rid;
end $$;

grant execute on function public.school_notify_user(uuid,text,text,text,text,text,uuid,text,text) to authenticated;

-- 7) Publish announcement and fan out to recipients
create or replace function public.school_publish_announcement(p_announcement_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare a school_announcements%rowtype;
        r record;
        n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  select * into a from school_announcements where id=p_announcement_id;
  if not found then raise exception 'Announcement not found'; end if;

  update school_announcements
  set is_published=true,starts_at=coalesce(starts_at,now()),updated_at=now()
  where id=a.id;

  for r in
    select distinct user_id,role_label
    from (
      -- Students
      select s.auth_user_id user_id,'student'::text role_label
      from school_students s
      join school_enrollments e on e.student_id=s.id and e.status='active'
      where s.auth_user_id is not null
        and a.audience in('all','students','class')
        and (a.academic_year_id is null or e.academic_year_id=a.academic_year_id)
        and (a.curriculum_id is null or e.curriculum_id=a.curriculum_id)
        and (a.grade_level_id is null or e.grade_level_id=a.grade_level_id)
        and (a.class_section_id is null or e.class_section_id=a.class_section_id)

      union all

      -- Parents linked to matching students
      select p.auth_user_id,'parent'::text
      from school_parents p
      join school_parent_students ps on ps.parent_id=p.id
      join school_enrollments e on e.student_id=ps.student_id and e.status='active'
      where p.auth_user_id is not null
        and a.audience in('all','parents','class')
        and (a.academic_year_id is null or e.academic_year_id=a.academic_year_id)
        and (a.curriculum_id is null or e.curriculum_id=a.curriculum_id)
        and (a.grade_level_id is null or e.grade_level_id=a.grade_level_id)
        and (a.class_section_id is null or e.class_section_id=a.class_section_id)

      union all

      -- Teachers
      select t.auth_user_id,'teacher'::text
      from school_teachers t
      where t.auth_user_id is not null
        and a.audience in('all','teachers')

      union all

      -- Staff
      select e.auth_user_id,'staff'::text
      from school_employees e
      where e.auth_user_id is not null
        and e.status='active'
        and a.audience in('all','staff')
    ) q
    where user_id is not null
  loop
    perform public.school_notify_user(
      r.user_id,r.role_label,'announcement',
      a.title_ar,a.body_ar,'announcement',a.id,
      '/school/announcements',a.priority
    );
    n:=n+1;
  end loop;

  return n;
end $$;
grant execute on function public.school_publish_announcement(uuid) to authenticated;

-- 8) Read/unread
create or replace function public.school_mark_notification_read(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare rid uuid;
begin
  update school_notifications
  set is_read=true,read_at=now()
  where id=p_notification_id
    and recipient_user_id=auth.uid()
  returning id into rid;

  return rid;
end $$;
grant execute on function public.school_mark_notification_read(uuid) to authenticated;

create or replace function public.school_mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare n integer;
begin
  update school_notifications
  set is_read=true,read_at=now()
  where recipient_user_id=auth.uid()
    and is_read=false;

  get diagnostics n=row_count;
  return n;
end $$;
grant execute on function public.school_mark_all_notifications_read() to authenticated;

-- 9) Fee due notifications
create or replace function public.school_send_fee_due_notifications(p_due_within_days integer default 7)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare r record; n integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  for r in
    select
      i.id installment_id,
      i.title,
      i.due_date,
      greatest(i.amount-i.paid_amount,0) outstanding,
      s.full_name_ar student_name,
      p.auth_user_id parent_user_id
    from school_installments i
    join school_enrollments e on e.id=i.enrollment_id
    join school_students s on s.id=e.student_id
    join school_parent_students ps on ps.student_id=s.id and ps.is_primary=true
    join school_parents p on p.id=ps.parent_id
    where i.status in('unpaid','partial','overdue')
      and i.due_date between current_date and current_date+p_due_within_days
      and p.auth_user_id is not null
  loop
    if not exists(
      select 1 from school_notifications n
      where n.recipient_user_id=r.parent_user_id
        and n.notification_type='fee_due'
        and n.entity_type='installment'
        and n.entity_id=r.installment_id
        and n.created_at::date=current_date
    ) then
      perform public.school_notify_user(
        r.parent_user_id,'parent','fee_due',
        'تنبيه قسط دراسي',
        'قسط الطالب '||r.student_name||' مستحق بتاريخ '||r.due_date||
        ' والمتبقي '||r.outstanding||' SAR',
        'installment',r.installment_id,
        '/school/parent/fees','high'
      );
      n:=n+1;
    end if;
  end loop;

  return n;
end $$;
grant execute on function public.school_send_fee_due_notifications(integer) to authenticated;

-- 10) Attendance notification trigger
create or replace function public.school_notify_student_attendance()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare sid uuid; sname text; puser uuid;
begin
  if new.status not in('absent','late') then return new; end if;

  select s.id,s.full_name_ar
  into sid,sname
  from school_enrollments e
  join school_students s on s.id=e.student_id
  where e.id=new.enrollment_id;

  select p.auth_user_id
  into puser
  from school_parent_students ps
  join school_parents p on p.id=ps.parent_id
  where ps.student_id=sid
    and ps.is_primary=true
  order by ps.created_at
  limit 1;

  if puser is not null then
    perform public.school_notify_user(
      puser,'parent','attendance',
      case when new.status='absent' then 'تنبيه غياب' else 'تنبيه تأخير' end,
      case when new.status='absent'
        then 'تم تسجيل غياب الطالب '||sname||' بتاريخ '||new.attendance_date
        else 'تم تسجيل تأخير الطالب '||sname||' بتاريخ '||new.attendance_date
      end,
      'attendance',new.id,'/school/parent/attendance','high'
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_school_notify_student_attendance on school_attendance;
create trigger trg_school_notify_student_attendance
after insert or update of status on school_attendance
for each row execute function public.school_notify_student_attendance();

-- 11) Homework notification trigger
create or replace function public.school_notify_assignment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare r record;
begin
  if new.is_published=false then return new; end if;

  for r in
    select distinct s.auth_user_id user_id
    from school_enrollments e
    join school_students s on s.id=e.student_id
    where e.class_section_id=new.class_section_id
      and e.status='active'
      and s.auth_user_id is not null
  loop
    perform public.school_notify_user(
      r.user_id,'student','homework',
      'واجب جديد',
      new.title,'assignment',new.id,
      '/school/student/assignments','normal'
    );
  end loop;

  return new;
end $$;

drop trigger if exists trg_school_notify_assignment on school_assignments;
create trigger trg_school_notify_assignment
after insert on school_assignments
for each row execute function public.school_notify_assignment();

-- 12) Exam notification trigger
create or replace function public.school_notify_exam_publish()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare r record;
begin
  if new.is_published=false then return new; end if;
  if tg_op='UPDATE' and old.is_published=true then return new; end if;

  for r in
    select s.auth_user_id user_id
    from school_enrollments e
    join school_students s on s.id=e.student_id
    where e.class_section_id=new.class_section_id
      and e.status='active'
      and s.auth_user_id is not null
  loop
    perform public.school_notify_user(
      r.user_id,'student','exam',
      'امتحان جديد / منشور',
      new.title||' بتاريخ '||new.exam_date,
      'exam',new.id,'/school/student/online-exams','high'
    );
  end loop;

  return new;
end $$;

drop trigger if exists trg_school_notify_exam_publish on school_exams;
create trigger trg_school_notify_exam_publish
after insert or update of is_published on school_exams
for each row execute function public.school_notify_exam_publish();

-- 13) Result publication notification trigger
create or replace function public.school_notify_annual_result_publish()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare suser uuid; puser uuid; sname text;
begin
  if new.is_published=false then return new; end if;
  if tg_op='UPDATE' and old.is_published=true then return new; end if;

  select auth_user_id,full_name_ar
  into suser,sname
  from school_students
  where id=new.student_id;

  if suser is not null then
    perform public.school_notify_user(
      suser,'student','result',
      'تم نشر النتيجة السنوية',
      'تم نشر نتيجتك السنوية. المعدل: '||coalesce(new.average_score::text,'—')||'%',
      'annual_result',new.id,'/school/student/academic-records','high'
    );
  end if;

  select p.auth_user_id into puser
  from school_parent_students ps
  join school_parents p on p.id=ps.parent_id
  where ps.student_id=new.student_id
    and ps.is_primary=true
    and ps.can_receive_results=true
  order by ps.created_at
  limit 1;

  if puser is not null then
    perform public.school_notify_user(
      puser,'parent','result',
      'تم نشر نتيجة الطالب',
      'تم نشر النتيجة السنوية للطالب '||sname||
      '. المعدل: '||coalesce(new.average_score::text,'—')||'%',
      'annual_result',new.id,'/school/parent/results','high'
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_school_notify_annual_result_publish on school_annual_results;
create trigger trg_school_notify_annual_result_publish
after insert or update of is_published on school_annual_results
for each row execute function public.school_notify_annual_result_publish();

-- 14) Certificate notification trigger
create or replace function public.school_notify_certificate_issue()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare suser uuid; puser uuid; sname text;
begin
  select auth_user_id,full_name_ar into suser,sname
  from school_students where id=new.student_id;

  if suser is not null then
    perform public.school_notify_user(
      suser,'student','certificate',
      'تم إصدار شهادة جديدة',
      new.title_ar||' — '||new.certificate_no,
      'certificate',new.id,'/school/student/academic-records','normal'
    );
  end if;

  select p.auth_user_id into puser
  from school_parent_students ps
  join school_parents p on p.id=ps.parent_id
  where ps.student_id=new.student_id
    and ps.is_primary=true
  order by ps.created_at
  limit 1;

  if puser is not null then
    perform public.school_notify_user(
      puser,'parent','certificate',
      'تم إصدار شهادة للطالب',
      'تم إصدار '||new.title_ar||' للطالب '||sname,
      'certificate',new.id,'/school/parent/results','normal'
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_school_notify_certificate_issue on school_certificates;
create trigger trg_school_notify_certificate_issue
after insert on school_certificates
for each row execute function public.school_notify_certificate_issue();

-- 15) RLS
alter table school_announcements enable row level security;
alter table school_message_templates enable row level security;
alter table school_notifications enable row level security;
alter table school_communication_log enable row level security;
alter table school_notification_preferences enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'school_announcements',
    'school_message_templates',
    'school_communication_log'
  ]
  loop
    execute format('drop policy if exists %I on public.%I',t||'_admin_all',t);
    execute format(
      'create policy %I on public.%I for all to authenticated
       using(public.is_school_admin()) with check(public.is_school_admin())',
      t||'_admin_all',t
    );
  end loop;
end $$;

drop policy if exists school_notifications_self_read on school_notifications;
create policy school_notifications_self_read
on school_notifications for select to authenticated
using(recipient_user_id=auth.uid());

drop policy if exists school_notifications_self_update on school_notifications;
create policy school_notifications_self_update
on school_notifications for update to authenticated
using(recipient_user_id=auth.uid())
with check(recipient_user_id=auth.uid());

drop policy if exists school_notifications_admin_all on school_notifications;
create policy school_notifications_admin_all
on school_notifications for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists school_notification_preferences_self_all on school_notification_preferences;
create policy school_notification_preferences_self_all
on school_notification_preferences for all to authenticated
using(user_id=auth.uid())
with check(user_id=auth.uid());

drop policy if exists school_announcements_authenticated_read on school_announcements;
create policy school_announcements_authenticated_read
on school_announcements for select to authenticated
using(
  is_published=true
  and starts_at<=now()
  and (expires_at is null or expires_at>=now())
);

-- 16) Seed templates
insert into school_message_templates(
  code,name_ar,name_en,subject_ar,subject_en,body_ar,body_en,channel
)
values
('FEE_DUE','تنبيه قسط','Fee Due','تنبيه قسط دراسي','School Fee Reminder','يوجد قسط دراسي مستحق.','A school installment is due.','in_app'),
('ABSENT','تنبيه غياب','Absence Alert','غياب الطالب','Student Absence','تم تسجيل غياب الطالب.','The student was marked absent.','in_app'),
('EXAM','تنبيه امتحان','Exam Alert','امتحان جديد','New Exam','تم نشر امتحان جديد.','A new exam has been published.','in_app'),
('RESULT','نشر نتيجة','Result Published','تم نشر النتيجة','Result Published','تم نشر نتيجة جديدة.','A new result has been published.','in_app')
on conflict(code) do nothing;

-- 17) Health
create or replace function public.school_s11_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'announcements',(select count(*) from school_announcements),
    'notifications',(select count(*) from school_notifications),
    'unread_notifications',(select count(*) from school_notifications where is_read=false),
    'templates',(select count(*) from school_message_templates),
    'communication_log',(select count(*) from school_communication_log)
  );
$$;

grant execute on function public.school_s11_health() to authenticated;

select public.school_s11_health();
