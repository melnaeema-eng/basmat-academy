-- ============================================================
-- Basmat Alnawabigh Academy - Sprint 2
-- Recorded Courses, Lessons & Progress
-- Run in Supabase SQL Editor
-- ============================================================

-- 1) Course delivery type
alter table public.courses
  add column if not exists course_type text not null default 'recorded';

update public.courses
set course_type = 'recorded'
where course_type is null or course_type not in ('recorded','live','hybrid');

alter table public.courses drop constraint if exists courses_course_type_check;
alter table public.courses
  add constraint courses_course_type_check
  check (course_type in ('recorded','live','hybrid'));

-- 2) Lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  lesson_type text not null default 'video'
    check (lesson_type in ('video','text','file')),
  video_url text,
  file_url text,
  content text,
  duration text,
  order_number integer not null default 1 check (order_number > 0),
  is_preview boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lessons_course_order
  on public.lessons(course_id, order_number);

-- 3) Lesson progress
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index if not exists idx_lesson_progress_user
  on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson
  on public.lesson_progress(lesson_id);

alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

-- Recreate policies safely
DROP POLICY IF EXISTS "Lessons visible to enrolled students and preview" ON public.lessons;
DROP POLICY IF EXISTS "Admins manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students view own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students insert own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students delete own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admins view all lesson progress" ON public.lesson_progress;

-- Published lessons: preview for authenticated users OR full access for enrolled students.
-- Admins can also read all lessons.
CREATE POLICY "Lessons visible to enrolled students and preview"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  is_preview = true
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = lessons.course_id
      AND e.user_id = auth.uid()
      AND e.status <> 'cancelled'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);

CREATE POLICY "Admins manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);

CREATE POLICY "Students view own lesson progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students insert own lesson progress"
ON public.lesson_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students delete own lesson progress"
ON public.lesson_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all lesson progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);
