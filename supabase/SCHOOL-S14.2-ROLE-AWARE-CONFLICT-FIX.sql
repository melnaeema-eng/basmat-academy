-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S14.2
-- ROLE-AWARE AUTH CONFLICT FIX
-- Same Auth can legitimately have different school roles.
-- Conflict = duplicate records inside the SAME entity type only.
-- ============================================================

create or replace function public.school_auth_link_conflicts()
returns table(
  auth_user_id uuid,
  auth_email text,
  entity_type text,
  linked_records bigint,
  linked_entities jsonb
)
language sql
stable
security definer
set search_path=public,auth
as $$
  with links as (
    select
      s.auth_user_id,
      'student'::text as entity_type,
      s.id as entity_id,
      s.full_name_ar as entity_name
    from school_students s
    where s.auth_user_id is not null

    union all

    select
      p.auth_user_id,
      'parent'::text,
      p.id,
      p.full_name
    from school_parents p
    where p.auth_user_id is not null

    union all

    select
      t.auth_user_id,
      'teacher'::text,
      t.id,
      t.full_name_ar
    from school_teachers t
    where t.auth_user_id is not null

    union all

    select
      e.auth_user_id,
      'employee'::text,
      e.id,
      e.full_name_ar
    from school_employees e
    where e.auth_user_id is not null
  )
  select
    l.auth_user_id,
    u.email,
    l.entity_type,
    count(*)::bigint,
    jsonb_agg(
      jsonb_build_object(
        'entity_id',l.entity_id,
        'entity_name',l.entity_name
      )
      order by l.entity_name
    )
  from links l
  join auth.users u on u.id=l.auth_user_id
  group by l.auth_user_id,u.email,l.entity_type
  having count(*)>1
  order by u.email,l.entity_type;
$$;

grant execute on function public.school_auth_link_conflicts() to authenticated;


create or replace function public.school_auth_role_map()
returns table(
  auth_user_id uuid,
  auth_email text,
  roles jsonb
)
language sql
stable
security definer
set search_path=public,auth
as $$
  with roles as (
    select s.auth_user_id,'student'::text role_name
    from school_students s where s.auth_user_id is not null

    union

    select p.auth_user_id,'parent'
    from school_parents p where p.auth_user_id is not null

    union

    select t.auth_user_id,'teacher'
    from school_teachers t where t.auth_user_id is not null

    union

    select e.auth_user_id,'employee'
    from school_employees e where e.auth_user_id is not null
  )
  select
    r.auth_user_id,
    u.email,
    jsonb_agg(r.role_name order by r.role_name)
  from roles r
  join auth.users u on u.id=r.auth_user_id
  group by r.auth_user_id,u.email
  order by u.email;
$$;

grant execute on function public.school_auth_role_map() to authenticated;


create or replace function public.school_s14_2_health()
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'same_role_conflicts',(select count(*) from public.school_auth_link_conflicts()),
    'multi_role_users',(
      select count(*)
      from (
        select auth_user_id
        from (
          select auth_user_id,'student'::text role_name from school_students where auth_user_id is not null
          union
          select auth_user_id,'parent' from school_parents where auth_user_id is not null
          union
          select auth_user_id,'teacher' from school_teachers where auth_user_id is not null
          union
          select auth_user_id,'employee' from school_employees where auth_user_id is not null
        ) r
        group by auth_user_id
        having count(*)>1
      ) x
    ),
    'teachers_with_auth',(select count(*) from school_teachers where status='active' and auth_user_id is not null),
    'teachers_unlinked',(select count(*) from school_teachers where status='active' and auth_user_id is null)
  );
$$;

grant execute on function public.school_s14_2_health() to authenticated;

select public.school_s14_2_health();
