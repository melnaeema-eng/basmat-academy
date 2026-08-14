-- ============================================================
-- SPRINT 10 — FINAL PRODUCTION READINESS + UDEMY POLISH
-- Global Search support + Cross-device video resume
-- Course Announcements + Admin System Health
-- Additive and safe.
-- ============================================================

-- ---------- Cross-device lesson watch state ----------
create table if not exists public.lesson_watch_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position_seconds integer not null default 0 check(position_seconds >= 0),
  duration_seconds integer,
  updated_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

alter table public.lesson_watch_state enable row level security;

drop policy if exists "lesson_watch_state_own" on public.lesson_watch_state;
create policy "lesson_watch_state_own"
on public.lesson_watch_state for all to authenticated
using(user_id = auth.uid())
with check(user_id = auth.uid());

create index if not exists idx_lesson_watch_state_course_user
on public.lesson_watch_state(user_id, course_id, updated_at desc);

-- ---------- Course Announcements ----------
create table if not exists public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_announcements enable row level security;

drop policy if exists "course_announcements_read" on public.course_announcements;
create policy "course_announcements_read"
on public.course_announcements for select to authenticated
using(
  public.is_admin()
  or public.is_course_instructor(course_id)
  or (
    is_published = true
    and exists(
      select 1 from public.enrollments e
      where e.user_id=auth.uid()
        and e.course_id=course_announcements.course_id
        and coalesce(e.status,'active') <> 'cancelled'
    )
  )
);

drop policy if exists "course_announcements_insert_staff" on public.course_announcements;
create policy "course_announcements_insert_staff"
on public.course_announcements for insert to authenticated
with check(
  author_id=auth.uid()
  and (public.is_admin() or public.is_course_instructor(course_id))
);

drop policy if exists "course_announcements_update_staff" on public.course_announcements;
create policy "course_announcements_update_staff"
on public.course_announcements for update to authenticated
using(public.is_admin() or public.is_course_instructor(course_id))
with check(public.is_admin() or public.is_course_instructor(course_id));

drop policy if exists "course_announcements_delete_staff" on public.course_announcements;
create policy "course_announcements_delete_staff"
on public.course_announcements for delete to authenticated
using(public.is_admin() or public.is_course_instructor(course_id));

-- ---------- Global search RPC ----------
create or replace function public.academy_global_search(p_query text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare q text := '%' || trim(coalesce(p_query,'')) || '%'; result jsonb;
begin
  if trim(coalesce(p_query,'')) = '' then
    return jsonb_build_object('courses','[]'::jsonb,'paths','[]'::jsonb,'instructors','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'courses', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select c.id,c.title,c.description,c.category,c.instructor,c.price,c.image,c.level,c.course_type
      from courses c
      where coalesce(c.status,'Published') <> 'Draft'
        and (
          c.title ilike q
          or coalesce(c.description,'') ilike q
          or coalesce(c.category,'') ilike q
          or coalesce(c.instructor,'') ilike q
        )
      order by c.created_at desc
      limit 20
    ) x),'[]'::jsonb),
    'paths', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select p.id,p.title,p.description,p.image_url,p.level
      from learning_paths p
      where p.is_published=true
        and (p.title ilike q or coalesce(p.description,'') ilike q or coalesce(p.level,'') ilike q)
      order by p.created_at desc
      limit 10
    ) x),'[]'::jsonb),
    'instructors', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select i.id,i.full_name,i.title,i.bio,i.photo_url,i.specialties
      from instructors i
      where i.is_active=true
        and (
          i.full_name ilike q
          or coalesce(i.title,'') ilike q
          or coalesce(i.bio,'') ilike q
          or array_to_string(i.specialties,' ') ilike q
        )
      order by i.full_name
      limit 10
    ) x),'[]'::jsonb)
  ) into result;
  return result;
end $$;

grant execute on function public.academy_global_search(text) to anon,authenticated;

-- ---------- Admin system health ----------
create or replace function public.admin_system_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;

  select jsonb_build_object(
    'database_time', now(),
    'counts', jsonb_build_object(
      'students',(select count(*) from profiles where lower(trim(coalesce(role,'student'))) <> 'admin'),
      'courses',(select count(*) from courses),
      'enrollments',(select count(*) from enrollments),
      'payments',(select count(*) from payments),
      'certificates',(select count(*) from certificates),
      'instructors',(select count(*) from instructors),
      'questions',(select count(*) from course_questions),
      'announcements',(select count(*) from course_announcements)
    ),
    'objects', jsonb_build_object(
      'profiles',to_regclass('public.profiles') is not null,
      'courses',to_regclass('public.courses') is not null,
      'lessons',to_regclass('public.lessons') is not null,
      'enrollments',to_regclass('public.enrollments') is not null,
      'payments',to_regclass('public.payments') is not null,
      'certificates',to_regclass('public.certificates') is not null,
      'course_reviews',to_regclass('public.course_reviews') is not null,
      'course_questions',to_regclass('public.course_questions') is not null,
      'lesson_notes',to_regclass('public.lesson_notes') is not null,
      'lesson_watch_state',to_regclass('public.lesson_watch_state') is not null,
      'course_announcements',to_regclass('public.course_announcements') is not null,
      'coupons',to_regclass('public.coupons') is not null,
      'live_sessions',to_regclass('public.live_sessions') is not null
    ),
    'pending_payments',(select count(*) from payments where status='pending'),
    'disabled_students',(select count(*) from profiles where account_status='disabled'),
    'archived_students',(select count(*) from profiles where account_status='archived')
  ) into result;

  return result;
end $$;

grant execute on function public.admin_system_health() to authenticated;
