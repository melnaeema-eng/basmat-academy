-- ============================================================
-- SPRINT 12.7 — GLOBAL ANNOUNCEMENT + EMAIL BROADCAST
-- Existing course announcements remain compatible.
-- "all_registered" = every Academy account with an email,
-- including users NOT enrolled in the selected course.
-- ============================================================

alter table public.course_announcements
  alter column course_id drop not null;

alter table public.course_announcements
  add column if not exists audience_scope text not null default 'course'
    check (audience_scope in ('course','all_registered')),
  add column if not exists send_email boolean not null default false,
  add column if not exists email_queued_count integer not null default 0;

-- Make the existing read policy support global announcements.
drop policy if exists "course_announcements_read" on public.course_announcements;
create policy "course_announcements_read"
on public.course_announcements for select to authenticated
using(
  public.is_admin()
  or (
    is_published=true
    and audience_scope='all_registered'
  )
  or public.is_course_instructor(course_id)
  or (
    is_published=true
    and course_id is not null
    and exists(
      select 1 from public.enrollments e
      where e.user_id=auth.uid()
        and e.course_id=course_announcements.course_id
        and coalesce(e.status,'active') <> 'cancelled'
    )
  )
);

-- Insert/update remain Admin or linked instructor for course announcements.
drop policy if exists "course_announcements_insert_staff" on public.course_announcements;
create policy "course_announcements_insert_staff"
on public.course_announcements for insert to authenticated
with check(
  author_id=auth.uid()
  and (
    public.is_admin()
    or (
      audience_scope='course'
      and course_id is not null
      and public.is_course_instructor(course_id)
    )
  )
);

drop policy if exists "course_announcements_update_staff" on public.course_announcements;
create policy "course_announcements_update_staff"
on public.course_announcements for update to authenticated
using(
  public.is_admin()
  or (
    audience_scope='course'
    and course_id is not null
    and public.is_course_instructor(course_id)
  )
)
with check(
  public.is_admin()
  or (
    audience_scope='course'
    and course_id is not null
    and public.is_course_instructor(course_id)
  )
);

-- Queue email for one published announcement.
create or replace function public.queue_announcement_broadcast(p_announcement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.course_announcements%rowtype;
  v_course_title text;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required';
  end if;

  select * into a
  from public.course_announcements
  where id=p_announcement_id;

  if not found then raise exception 'Announcement not found'; end if;
  if not a.is_published then raise exception 'Announcement is not published'; end if;
  if not a.send_email then
    return jsonb_build_object('success',true,'queued',0,'message','Email disabled');
  end if;

  if a.course_id is not null then
    select title into v_course_title from public.courses where id=a.course_id;
  end if;

  -- Prevent accidental duplicate queues for the same announcement.
  delete from public.email_outbox
  where template='announcement'
    and status='pending'
    and payload->>'announcement_id'=a.id::text;

  if a.audience_scope='course' then
    insert into public.email_outbox(user_id,recipient,template,subject,payload)
    select distinct
      p.id,
      p.email,
      'announcement',
      a.title,
      jsonb_build_object(
        'announcement_id',a.id,
        'title',a.title,
        'body',a.body,
        'audience_scope',a.audience_scope,
        'course_id',a.course_id,
        'course_title',v_course_title
      )
    from public.profiles p
    join public.enrollments e on e.user_id=p.id
    where e.course_id=a.course_id
      and coalesce(e.status,'active') <> 'cancelled'
      and nullif(trim(p.email),'') is not null;
  else
    -- ALL Academy accounts with an email:
    -- includes enrolled and not-enrolled users.
    insert into public.email_outbox(user_id,recipient,template,subject,payload)
    select
      p.id,
      p.email,
      'announcement',
      a.title,
      jsonb_build_object(
        'announcement_id',a.id,
        'title',a.title,
        'body',a.body,
        'audience_scope',a.audience_scope,
        'course_id',a.course_id,
        'course_title',v_course_title
      )
    from public.profiles p
    where nullif(trim(p.email),'') is not null;
  end if;

  get diagnostics v_count = row_count;

  update public.course_announcements
  set email_queued_count=v_count,
      updated_at=now()
  where id=a.id;

  return jsonb_build_object(
    'success',true,
    'queued',v_count,
    'audience_scope',a.audience_scope
  );
end $$;

revoke all on function public.queue_announcement_broadcast(uuid) from public;
grant execute on function public.queue_announcement_broadcast(uuid) to authenticated;

-- Global announcements for authenticated users.
create or replace function public.get_global_announcements()
returns setof public.course_announcements
language sql
stable
security definer
set search_path=public
as $$
  select a.*
  from public.course_announcements a
  where a.is_published=true
    and a.audience_scope='all_registered'
  order by a.published_at desc
  limit 20;
$$;

grant execute on function public.get_global_announcements() to authenticated;
