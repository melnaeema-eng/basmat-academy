create table if not exists public.school_attendance_excuses (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  attendance_record_id uuid references public.school_attendance_records(id) on delete cascade,
  excuse_date date not null,
  excuse_type text not null default 'medical' check(excuse_type in('medical','family','official','transport','other')),
  reason text not null,
  attachment_url text,
  status text not null default 'pending' check(status in('pending','approved','rejected')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_student_affairs_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.school_students(id) on delete cascade,
  enrollment_id uuid references public.school_enrollments(id) on delete set null,
  note_type text not null default 'general' check(note_type in('general','behavior','academic','attendance','health','parent_contact','achievement')),
  severity text not null default 'normal' check(severity in('low','normal','high','critical','positive')),
  title text not null,
  note text not null,
  action_taken text,
  follow_up_date date,
  is_private boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_attendance_excuses enable row level security;
alter table public.school_student_affairs_notes enable row level security;

drop policy if exists school_attendance_excuses_admin_all on public.school_attendance_excuses;
create policy school_attendance_excuses_admin_all on public.school_attendance_excuses
for all to authenticated using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_student_affairs_notes_admin_all on public.school_student_affairs_notes;
create policy school_student_affairs_notes_admin_all on public.school_student_affairs_notes
for all to authenticated using(public.is_school_admin()) with check(public.is_school_admin());

create or replace function public.school_student_attendance_summary(p_enrollment_id uuid,p_date_from date default null,p_date_to date default null)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'present',count(*) filter(where r.status='present'),
 'absent',count(*) filter(where r.status='absent'),
 'late',count(*) filter(where r.status='late'),
 'excused',count(*) filter(where r.status='excused'),
 'total',count(*),
 'attendance_rate',case when count(*)=0 then 0 else round(((count(*) filter(where r.status in('present','late','excused')))::numeric/count(*)::numeric)*100,2) end
)
from school_attendance_records r
join school_attendance_sessions s on s.id=r.session_id
where r.enrollment_id=p_enrollment_id
and (p_date_from is null or s.attendance_date>=p_date_from)
and (p_date_to is null or s.attendance_date<=p_date_to);
$$;
grant execute on function public.school_student_attendance_summary(uuid,date,date) to authenticated;

create or replace function public.school_attendance_monthly_report(p_class_section_id uuid,p_year integer,p_month integer)
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object(
 'enrollment_id',e.id,'student_id',st.id,'student_no',st.student_no,'student_name',st.full_name_ar,
 'summary',public.school_student_attendance_summary(e.id,make_date(p_year,p_month,1),(make_date(p_year,p_month,1)+interval '1 month - 1 day')::date)
) order by st.full_name_ar),'[]'::jsonb)
from school_enrollments e join school_students st on st.id=e.student_id
where e.class_section_id=p_class_section_id and e.status='active';
$$;
grant execute on function public.school_attendance_monthly_report(uuid,integer,integer) to authenticated;

create or replace function public.school_review_attendance_excuse(p_excuse_id uuid,p_status text,p_review_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare ex school_attendance_excuses%rowtype; rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_status not in('approved','rejected') then raise exception 'Invalid excuse status'; end if;
 select * into ex from school_attendance_excuses where id=p_excuse_id for update;
 if not found then raise exception 'Excuse not found'; end if;
 update school_attendance_excuses set status=p_status,review_note=nullif(trim(coalesce(p_review_note,'')),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=ex.id returning id into rid;
 if p_status='approved' and ex.attendance_record_id is not null then
   update school_attendance_records set status='excused',note=coalesce(note||' • ','')||'Excuse approved' where id=ex.attendance_record_id;
 end if;
 return rid;
end $$;
grant execute on function public.school_review_attendance_excuse(uuid,text,text) to authenticated;

create or replace function public.school_add_student_affairs_note(
 p_student_id uuid,p_enrollment_id uuid,p_note_type text,p_severity text,p_title text,p_note text,p_action_taken text,p_follow_up_date date,p_is_private boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not (public.is_school_admin() or (public.is_school_teacher() and public.school_can_access_student(p_student_id))) then raise exception 'Not allowed'; end if;
 insert into school_student_affairs_notes(student_id,enrollment_id,note_type,severity,title,note,action_taken,follow_up_date,is_private,created_by)
 values(p_student_id,p_enrollment_id,coalesce(nullif(trim(p_note_type),''),'general'),coalesce(nullif(trim(p_severity),''),'normal'),p_title,p_note,
 nullif(trim(coalesce(p_action_taken,'')),''),p_follow_up_date,coalesce(p_is_private,true),auth.uid())
 returning id into rid;
 return rid;
end $$;
grant execute on function public.school_add_student_affairs_note(uuid,uuid,text,text,text,text,text,date,boolean) to authenticated;

create or replace function public.school_student_affairs_profile(p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare eid uuid;
begin
 if not public.school_can_access_student(p_student_id) then raise exception 'Not allowed'; end if;
 select id into eid from school_enrollments where student_id=p_student_id and status='active' order by created_at desc limit 1;
 return jsonb_build_object(
  'attendance',case when eid is null then '{}'::jsonb else public.school_student_attendance_summary(eid,null,null) end,
  'notes',coalesce((select jsonb_agg(jsonb_build_object(
    'id',n.id,'note_type',n.note_type,'severity',n.severity,'title',n.title,'note',n.note,'action_taken',n.action_taken,'follow_up_date',n.follow_up_date,'is_private',n.is_private,'created_at',n.created_at
  ) order by n.created_at desc) from school_student_affairs_notes n where n.student_id=p_student_id),'[]'::jsonb),
  'pending_excuses',coalesce((select jsonb_agg(jsonb_build_object(
    'id',x.id,'excuse_date',x.excuse_date,'excuse_type',x.excuse_type,'reason',x.reason,'status',x.status,'attachment_url',x.attachment_url
  ) order by x.created_at desc) from school_attendance_excuses x where x.enrollment_id=eid and x.status='pending'),'[]'::jsonb)
 );
end $$;
grant execute on function public.school_student_affairs_profile(uuid) to authenticated;

create or replace function public.school_s18_health()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'attendance_records',(select count(*) from school_attendance_records),
 'absent_records',(select count(*) from school_attendance_records where status='absent'),
 'late_records',(select count(*) from school_attendance_records where status='late'),
 'excused_records',(select count(*) from school_attendance_records where status='excused'),
 'pending_excuses',(select count(*) from school_attendance_excuses where status='pending'),
 'student_affairs_notes',(select count(*) from school_student_affairs_notes),
 'high_severity_notes',(select count(*) from school_student_affairs_notes where severity in('high','critical'))
);
$$;
grant execute on function public.school_s18_health() to authenticated;

select public.school_s18_health();
