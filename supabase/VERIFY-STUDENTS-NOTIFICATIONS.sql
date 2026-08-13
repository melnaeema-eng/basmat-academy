-- Run this AFTER the fix to verify students and notifications.

-- A) How many Auth users exist?
select count(*) as auth_users from auth.users;

-- B) How many profiles exist?
select count(*) as profiles from public.profiles;

-- C) Students that should appear in /admin/students
select id, full_name, email, role
from public.profiles
where lower(trim(coalesce(role,'student'))) <> 'admin'
order by email;

-- D) Payment notifications
select user_id, title, message, type, is_read, created_at
from public.notifications
order by created_at desc;
