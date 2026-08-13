-- Basmat Alnawabigh Academy
-- Sprint 1: Student Enrollment

-- Admins can view all enrollments for dashboard/reporting.
-- Student policies were created when the enrollments table was created.
drop policy if exists "Admins can view all enrollments" on public.enrollments;

create policy "Admins can view all enrollments"
on public.enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(trim(profiles.role)) = 'admin'
  )
);
