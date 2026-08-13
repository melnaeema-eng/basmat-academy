-- Sprint 1 - Student Enrollment
-- Safe to run after the enrollments table was created earlier.

alter table public.enrollments enable row level security;

-- Recreate student policies cleanly.
drop policy if exists "Students can view own enrollments" on public.enrollments;
create policy "Students can view own enrollments"
on public.enrollments for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Students can enroll themselves" on public.enrollments;
create policy "Students can enroll themselves"
on public.enrollments for insert to authenticated
with check (auth.uid() = user_id);

-- Admin can read all enrollments for dashboard statistics.
drop policy if exists "Admins can view all enrollments" on public.enrollments;
create policy "Admins can view all enrollments"
on public.enrollments for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) = 'admin'
  )
);
