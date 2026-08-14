-- ============================================================
-- SPRINT 6 — UDEMY EXPERIENCE
-- Wishlist + Reviews
-- Does not change existing payment/enrollment/exam/certificate tables.
-- ============================================================

create table if not exists public.course_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, course_id)
);

alter table public.course_wishlist enable row level security;

drop policy if exists "wishlist_select_own" on public.course_wishlist;
drop policy if exists "wishlist_insert_own" on public.course_wishlist;
drop policy if exists "wishlist_delete_own" on public.course_wishlist;

create policy "wishlist_select_own"
on public.course_wishlist for select to authenticated
using (auth.uid() = user_id);

create policy "wishlist_insert_own"
on public.course_wishlist for insert to authenticated
with check (auth.uid() = user_id);

create policy "wishlist_delete_own"
on public.course_wishlist for delete to authenticated
using (auth.uid() = user_id);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, course_id)
);

alter table public.course_reviews enable row level security;

drop policy if exists "reviews_read_public" on public.course_reviews;
drop policy if exists "reviews_insert_enrolled" on public.course_reviews;
drop policy if exists "reviews_update_own" on public.course_reviews;
drop policy if exists "reviews_delete_own" on public.course_reviews;

create policy "reviews_read_public"
on public.course_reviews for select to anon, authenticated
using (is_published = true or user_id = auth.uid());

create policy "reviews_insert_enrolled"
on public.course_reviews for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = course_reviews.course_id
      and coalesce(e.status,'active') <> 'cancelled'
  )
);

create policy "reviews_update_own"
on public.course_reviews for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reviews_delete_own"
on public.course_reviews for delete to authenticated
using (user_id = auth.uid());

create or replace function public.get_course_reviews_public(p_course_id uuid)
returns table(
  id uuid,
  rating integer,
  review_text text,
  created_at timestamptz,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.rating,
    r.review_text,
    r.created_at,
    coalesce(nullif(trim(p.full_name),''),'Student') as display_name
  from public.course_reviews r
  left join public.profiles p on p.id = r.user_id
  where r.course_id = p_course_id
    and r.is_published = true
  order by r.created_at desc;
$$;

grant execute on function public.get_course_reviews_public(uuid) to anon, authenticated;
