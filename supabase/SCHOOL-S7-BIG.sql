-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S7 BIG
-- DIGITAL LIBRARY + BOOKS + FILES
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Digital books/files
create table if not exists public.school_books (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text,
  subject_id uuid references public.school_subjects(id) on delete set null,
  grade_level_id uuid references public.school_grade_levels(id) on delete set null,
  curriculum_id uuid references public.school_curricula(id) on delete set null,
  academic_year_id uuid references public.school_academic_years(id) on delete set null,
  book_type text not null default 'textbook'
    check(book_type in('textbook','workbook','teacher_guide','reference','worksheet','other')),
  file_url text not null,
  storage_path text,
  cover_url text,
  file_size_bytes bigint,
  mime_type text,
  version text,
  description text,
  is_downloadable boolean not null default true,
  is_published boolean not null default true,
  audience text not null default 'student'
    check(audience in('student','teacher','both')),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Download log
create table if not exists public.school_book_downloads (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.school_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

-- 3) Book favorites/bookmarks
create table if not exists public.school_book_favorites (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.school_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(book_id,user_id)
);

-- 4) Storage bucket
insert into storage.buckets(id,name,public)
values('school-books','school-books',true)
on conflict(id) do update set public=true;

-- Public read for published book files
drop policy if exists school_books_public_read on storage.objects;
create policy school_books_public_read
on storage.objects for select
to public
using(bucket_id='school-books');

-- School admin upload/update/delete
drop policy if exists school_books_admin_insert on storage.objects;
create policy school_books_admin_insert
on storage.objects for insert
to authenticated
with check(bucket_id='school-books' and public.is_school_admin());

drop policy if exists school_books_admin_update on storage.objects;
create policy school_books_admin_update
on storage.objects for update
to authenticated
using(bucket_id='school-books' and public.is_school_admin())
with check(bucket_id='school-books' and public.is_school_admin());

drop policy if exists school_books_admin_delete on storage.objects;
create policy school_books_admin_delete
on storage.objects for delete
to authenticated
using(bucket_id='school-books' and public.is_school_admin());

-- 5) RLS
alter table public.school_books enable row level security;
alter table public.school_book_downloads enable row level security;
alter table public.school_book_favorites enable row level security;

drop policy if exists school_books_admin_all on school_books;
create policy school_books_admin_all
on school_books for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

-- Published books visible to authenticated school users.
drop policy if exists school_books_authenticated_read on school_books;
create policy school_books_authenticated_read
on school_books for select to authenticated
using(is_published=true);

drop policy if exists school_book_downloads_admin_all on school_book_downloads;
create policy school_book_downloads_admin_all
on school_book_downloads for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists school_book_downloads_self_insert on school_book_downloads;
create policy school_book_downloads_self_insert
on school_book_downloads for insert to authenticated
with check(user_id=auth.uid());

drop policy if exists school_book_downloads_self_read on school_book_downloads;
create policy school_book_downloads_self_read
on school_book_downloads for select to authenticated
using(user_id=auth.uid());

drop policy if exists school_book_favorites_self_all on school_book_favorites;
create policy school_book_favorites_self_all
on school_book_favorites for all to authenticated
using(user_id=auth.uid())
with check(user_id=auth.uid());

-- 6) Health
create or replace function public.school_s7_health()
returns jsonb
language sql stable security definer set search_path=public
as $$
 select jsonb_build_object(
   'books',(select count(*) from school_books),
   'published_books',(select count(*) from school_books where is_published=true),
   'downloads',(select count(*) from school_book_downloads),
   'favorites',(select count(*) from school_book_favorites)
 );
$$;
grant execute on function public.school_s7_health() to authenticated;

select public.school_s7_health();
