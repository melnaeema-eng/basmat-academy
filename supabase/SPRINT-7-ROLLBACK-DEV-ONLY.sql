-- SPRINT 7 DATABASE ROLLBACK — DEVELOPMENT ONLY
-- WARNING: This deletes Sprint 7 instructor/path/live-session data.
-- Do NOT run after production data has been entered unless you intentionally want to remove it.

drop function if exists public.get_course_curriculum_public(uuid);

alter table public.courses
  drop column if exists instructor_id;

drop table if exists public.live_sessions cascade;
drop table if exists public.learning_path_courses cascade;
drop table if exists public.learning_paths cascade;
drop table if exists public.instructors cascade;
