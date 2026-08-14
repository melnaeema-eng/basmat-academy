-- ============================================================
-- SPRINT 7 — ACADEMY PROFESSIONAL PLATFORM
-- Instructors + Learning Paths + Live Sessions + Course Preview
-- Additive migration only. Existing academy data is preserved.
-- ============================================================

-- ---------- Instructors ----------
create table if not exists public.instructors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  bio text,
  photo_url text,
  linkedin_url text,
  website_url text,
  specialties text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses
  add column if not exists instructor_id uuid references public.instructors(id) on delete set null;

alter table public.instructors enable row level security;

drop policy if exists "instructors_public_read" on public.instructors;
drop policy if exists "instructors_admin_insert" on public.instructors;
drop policy if exists "instructors_admin_update" on public.instructors;
drop policy if exists "instructors_admin_delete" on public.instructors;

create policy "instructors_public_read"
on public.instructors for select to anon, authenticated
using (is_active = true or public.is_admin());

create policy "instructors_admin_insert"
on public.instructors for insert to authenticated
with check (public.is_admin());

create policy "instructors_admin_update"
on public.instructors for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "instructors_admin_delete"
on public.instructors for delete to authenticated
using (public.is_admin());

-- ---------- Learning Paths ----------
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  level text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_courses (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique(path_id, course_id)
);

alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;

drop policy if exists "paths_public_read" on public.learning_paths;
drop policy if exists "paths_admin_insert" on public.learning_paths;
drop policy if exists "paths_admin_update" on public.learning_paths;
drop policy if exists "paths_admin_delete" on public.learning_paths;

create policy "paths_public_read"
on public.learning_paths for select to anon, authenticated
using (is_published = true or public.is_admin());

create policy "paths_admin_insert"
on public.learning_paths for insert to authenticated
with check (public.is_admin());

create policy "paths_admin_update"
on public.learning_paths for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "paths_admin_delete"
on public.learning_paths for delete to authenticated
using (public.is_admin());

drop policy if exists "path_courses_public_read" on public.learning_path_courses;
drop policy if exists "path_courses_admin_insert" on public.learning_path_courses;
drop policy if exists "path_courses_admin_update" on public.learning_path_courses;
drop policy if exists "path_courses_admin_delete" on public.learning_path_courses;

create policy "path_courses_public_read"
on public.learning_path_courses for select to anon, authenticated
using (
  exists (
    select 1 from public.learning_paths p
    where p.id = path_id
      and (p.is_published = true or public.is_admin())
  )
);

create policy "path_courses_admin_insert"
on public.learning_path_courses for insert to authenticated
with check (public.is_admin());

create policy "path_courses_admin_update"
on public.learning_path_courses for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "path_courses_admin_delete"
on public.learning_path_courses for delete to authenticated
using (public.is_admin());

-- ---------- Live Sessions ----------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  provider text not null default 'zoom'
    check (provider in ('zoom','teams','meet','other')),
  meeting_url text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_sessions enable row level security;

drop policy if exists "live_sessions_student_read" on public.live_sessions;
drop policy if exists "live_sessions_admin_insert" on public.live_sessions;
drop policy if exists "live_sessions_admin_update" on public.live_sessions;
drop policy if exists "live_sessions_admin_delete" on public.live_sessions;

create policy "live_sessions_student_read"
on public.live_sessions for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = live_sessions.course_id
      and coalesce(e.status,'active') <> 'cancelled'
  )
);

create policy "live_sessions_admin_insert"
on public.live_sessions for insert to authenticated
with check (public.is_admin());

create policy "live_sessions_admin_update"
on public.live_sessions for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "live_sessions_admin_delete"
on public.live_sessions for delete to authenticated
using (public.is_admin());

-- Helpful indexes
create index if not exists idx_courses_instructor_id on public.courses(instructor_id);
create index if not exists idx_path_courses_path_id on public.learning_path_courses(path_id, order_number);
create index if not exists idx_live_sessions_course_start on public.live_sessions(course_id, start_at);


-- ---------- Safe public curriculum / previews ----------
-- Returns lesson metadata publicly, but exposes media URLs only for lessons marked as preview.
create or replace function public.get_course_curriculum_public(p_course_id uuid)
returns table(
  id uuid,
  title text,
  description text,
  duration text,
  lesson_type text,
  is_preview boolean,
  order_number integer,
  video_url text,
  file_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.description,
    l.duration::text,
    l.lesson_type,
    l.is_preview,
    l.order_number,
    case when l.is_preview then l.video_url else null end as video_url,
    case when l.is_preview then l.file_url else null end as file_url
  from public.lessons l
  where l.course_id = p_course_id
    and l.is_published = true
  order by l.order_number;
$$;

grant execute on function public.get_course_curriculum_public(uuid) to anon, authenticated;
