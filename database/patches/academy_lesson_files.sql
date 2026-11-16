begin;
insert into storage.buckets(id,name,public,file_size_limit) values('academy-lesson-files','academy-lesson-files',false,52428800) on conflict(id) do nothing;
create table if not exists public.academy_lesson_files(
 id uuid primary key default gen_random_uuid(),
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 file_name text not null,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes between 1 and 52428800),
 original_path text not null unique,
 page_paths text[] not null default '{}',
 ready boolean not null default false,
 created_at timestamptz not null default now(),
 check(not ready or mime_type<>'application/pdf' or cardinality(page_paths) between 1 and 100)
);
create index if not exists academy_lesson_files_lesson on public.academy_lesson_files(lesson_id);
alter table public.academy_lesson_files enable row level security;
create or replace function public.can_read_academy_lesson_file(p_lesson_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_admin() or exists(
 select 1 from public.lessons l where l.id=p_lesson_id and l.is_published
 and (l.is_preview or exists(select 1 from public.enrollments e where e.course_id=l.course_id and e.user_id=auth.uid() and coalesce(e.status,'active')<>'cancelled'))
 and not exists(select 1 from public.academy_lab_catalog c where c.course_id=l.course_id and c.price>0 and not exists(select 1 from public.academy_lab_access a where a.lab_id=c.id and a.user_id=auth.uid() and a.revoked_at is null))
 ));
$$;
revoke all on function public.can_read_academy_lesson_file(uuid) from public,anon;
grant execute on function public.can_read_academy_lesson_file(uuid) to authenticated;
revoke all on public.academy_lesson_files from anon;
grant select,insert,update,delete on public.academy_lesson_files to authenticated;
create policy academy_lesson_files_admin on public.academy_lesson_files for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy academy_lesson_files_student on public.academy_lesson_files for select to authenticated using(ready and public.can_read_academy_lesson_file(lesson_id));
create policy academy_lesson_objects_read on storage.objects for select to authenticated using(bucket_id='academy-lesson-files' and (public.is_admin() or exists(select 1 from public.academy_lesson_files f where f.ready and public.can_read_academy_lesson_file(f.lesson_id) and (name=any(f.page_paths) or (f.mime_type<>'application/pdf' and name=f.original_path)))));
create policy academy_lesson_objects_insert on storage.objects for insert to authenticated with check(bucket_id='academy-lesson-files' and public.is_admin());
create policy academy_lesson_objects_update on storage.objects for update to authenticated using(bucket_id='academy-lesson-files' and public.is_admin()) with check(bucket_id='academy-lesson-files' and public.is_admin());
create policy academy_lesson_objects_delete on storage.objects for delete to authenticated using(bucket_id='academy-lesson-files' and public.is_admin());
commit;
