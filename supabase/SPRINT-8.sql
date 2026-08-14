-- SPRINT 8 — FINAL ACADEMY COMPLETION
-- Safe additive student lifecycle + admin management.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists archived_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz default now();

do $$ begin
  if not exists(select 1 from pg_constraint where conname='profiles_account_status_check') then
    alter table public.profiles add constraint profiles_account_status_check
      check(account_status in('active','disabled','archived'));
  end if;
end $$;

-- Admin can maintain student profiles. Auth email itself is intentionally not edited here.
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Central admin student detail. SECURITY DEFINER keeps the React layer simple
-- while authorization remains server-side.
create or replace function public.admin_student_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'enrollments', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select e.*, c.title as course_title, c.image as course_image
      from enrollments e left join courses c on c.id=e.course_id
      where e.user_id=p_user_id
    ) x),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select pay.*, c.title as course_title
      from payments pay left join courses c on c.id=pay.course_id
      where pay.user_id=p_user_id order by pay.created_at desc
    ) x),'[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select a.id,a.exam_id,a.score,a.passed,a.submitted_at,
             ex.title as exam_title, ex.course_id, c.title as course_title
      from exam_attempts a
      join exams ex on ex.id=a.exam_id
      left join courses c on c.id=ex.course_id
      where a.user_id=p_user_id order by a.submitted_at desc
    ) x),'[]'::jsonb),
    'certificates', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select cert.*, c.title as course_title
      from certificates cert left join courses c on c.id=cert.course_id
      where cert.user_id=p_user_id order by cert.issued_at desc
    ) x),'[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc)
      from notifications n where n.user_id=p_user_id),'[]'::jsonb)
  ) into v
  from profiles p where p.id=p_user_id and lower(trim(coalesce(p.role,'student'))) <> 'admin';
  if v is null then raise exception 'Student not found'; end if;
  return v;
end $$;
grant execute on function public.admin_student_detail(uuid) to authenticated;

create or replace function public.admin_update_student(
  p_user_id uuid,p_full_name text,p_phone text,p_city text,p_bio text,p_admin_note text
) returns boolean
language plpgsql security definer set search_path=public
as $$
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 update profiles set full_name=nullif(trim(p_full_name),''),
   phone=nullif(trim(p_phone),''),city=nullif(trim(p_city),''),
   bio=nullif(trim(p_bio),''),admin_note=nullif(trim(p_admin_note),''),
   updated_at=now()
 where id=p_user_id and lower(trim(coalesce(role,'student'))) <> 'admin';
 return found;
end $$;
grant execute on function public.admin_update_student(uuid,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_student_status(p_user_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 if p_status not in('active','disabled','archived') then raise exception 'Invalid status'; end if;
 update profiles set account_status=p_status,
   archived_at=case when p_status='archived' then now() else null end,
   updated_at=now()
 where id=p_user_id and lower(trim(coalesce(role,'student'))) <> 'admin';
 return found;
end $$;
grant execute on function public.admin_set_student_status(uuid,text) to authenticated;

-- Safe permanent-delete precheck. We intentionally do NOT delete auth.users from browser code.
create or replace function public.admin_student_delete_check(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare e int; pay int; a int; cert int; n int;
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 select count(*) into e from enrollments where user_id=p_user_id;
 select count(*) into pay from payments where user_id=p_user_id;
 select count(*) into a from exam_attempts where user_id=p_user_id;
 select count(*) into cert from certificates where user_id=p_user_id;
 select count(*) into n from notifications where user_id=p_user_id;
 return jsonb_build_object(
   'can_delete', e=0 and pay=0 and a=0 and cert=0,
   'enrollments',e,'payments',pay,'attempts',a,'certificates',cert,'notifications',n,
   'message',case when e=0 and pay=0 and a=0 and cert=0
     then 'No academic or financial blockers. Auth-user deletion still requires a trusted server/Admin API.'
     else 'Permanent deletion blocked: linked academic or financial records exist.' end
 );
end $$;
grant execute on function public.admin_student_delete_check(uuid) to authenticated;
