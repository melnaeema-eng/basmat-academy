-- SPRINT 12.1 — INSTRUCTOR PROFILE / PHOTO STORAGE
-- Existing instructors table is preserved. No instructor columns are rebuilt.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'instructor-photos',
  'instructor-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,
    file_size_limit=5242880,
    allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Instructor photos public read" on storage.objects;
create policy "Instructor photos public read"
on storage.objects for select
to public
using (bucket_id='instructor-photos');

drop policy if exists "Admin uploads instructor photos" on storage.objects;
create policy "Admin uploads instructor photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id='instructor-photos'
  and public.is_admin()
);

drop policy if exists "Admin updates instructor photos" on storage.objects;
create policy "Admin updates instructor photos"
on storage.objects for update
to authenticated
using (
  bucket_id='instructor-photos'
  and public.is_admin()
)
with check (
  bucket_id='instructor-photos'
  and public.is_admin()
);

drop policy if exists "Admin deletes instructor photos" on storage.objects;
create policy "Admin deletes instructor photos"
on storage.objects for delete
to authenticated
using (
  bucket_id='instructor-photos'
  and public.is_admin()
);
