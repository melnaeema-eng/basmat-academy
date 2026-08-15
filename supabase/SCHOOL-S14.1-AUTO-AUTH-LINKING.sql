-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S14.1
-- AUTO AUTH LINKING HOTFIX
-- Student + Parent + Teacher + Employee
-- ============================================================

create or replace function public.school_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path=public,auth
as $$
  select u.id
  from auth.users u
  where nullif(trim(coalesce(p_email,'')),'') is not null
    and lower(trim(u.email))=lower(trim(p_email))
  order by u.created_at
  limit 1;
$$;
grant execute on function public.school_auth_user_id_by_email(text) to authenticated;

create or replace function public.school_auto_link_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare resolved_id uuid;
begin
  if nullif(trim(coalesce(new.email,'')),'') is null then
    return new;
  end if;

  resolved_id:=public.school_auth_user_id_by_email(new.email);
  if resolved_id is not null then
    new.auth_user_id:=resolved_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_school_students_auto_auth on public.school_students;
create trigger trg_school_students_auto_auth
before insert or update of email on public.school_students
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_parents_auto_auth on public.school_parents;
create trigger trg_school_parents_auto_auth
before insert or update of email on public.school_parents
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_teachers_auto_auth on public.school_teachers;
create trigger trg_school_teachers_auto_auth
before insert or update of email on public.school_teachers
for each row execute function public.school_auto_link_auth_user();

drop trigger if exists trg_school_employees_auto_auth on public.school_employees;
create trigger trg_school_employees_auto_auth
before insert or update of email on public.school_employees
for each row execute function public.school_auto_link_auth_user();

-- Repair existing rows
update public.school_students s
set auth_user_id=u.id,updated_at=now()
from auth.users u
where s.auth_user_id is null
  and nullif(trim(coalesce(s.email,'')),'') is not null
  and lower(trim(s.email))=lower(trim(u.email));

update public.school_parents p
set auth_user_id=u.id,updated_at=now()
from auth.users u
where p.auth_user_id is null
  and nullif(trim(coalesce(p.email,'')),'') is not null
  and lower(trim(p.email))=lower(trim(u.email));

update public.school_teachers t
set auth_user_id=u.id,updated_at=now()
from auth.users u
where t.auth_user_id is null
  and nullif(trim(coalesce(t.email,'')),'') is not null
  and lower(trim(t.email))=lower(trim(u.email));

update public.school_employees e
set auth_user_id=u.id,updated_at=now()
from auth.users u
where e.auth_user_id is null
  and nullif(trim(coalesce(e.email,'')),'') is not null
  and lower(trim(e.email))=lower(trim(u.email));

create or replace function public.school_unlinked_accounts()
returns table(
  entity_type text,
  entity_id uuid,
  display_name text,
  email text,
  status text,
  auth_user_exists boolean
)
language sql
stable
security definer
set search_path=public,auth
as $$
  select 'student',s.id,s.full_name_ar,s.email,s.status,
         exists(select 1 from auth.users u where lower(trim(u.email))=lower(trim(s.email)))
  from school_students s
  where s.auth_user_id is null and s.status='active'

  union all

  select 'parent',p.id,p.full_name,p.email,
         case when p.is_active then 'active' else 'inactive' end,
         exists(select 1 from auth.users u where lower(trim(u.email))=lower(trim(p.email)))
  from school_parents p
  where p.auth_user_id is null and p.is_active=true

  union all

  select 'teacher',t.id,t.full_name_ar,t.email,t.status,
         exists(select 1 from auth.users u where lower(trim(u.email))=lower(trim(t.email)))
  from school_teachers t
  where t.auth_user_id is null and t.status='active'

  union all

  select 'employee',e.id,e.full_name_ar,e.email,e.status,
         exists(select 1 from auth.users u where lower(trim(u.email))=lower(trim(e.email)))
  from school_employees e
  where e.auth_user_id is null and e.status='active'

  order by entity_type,display_name;
$$;
grant execute on function public.school_unlinked_accounts() to authenticated;

create or replace function public.school_auth_link_conflicts()
returns table(
  auth_user_id uuid,
  auth_email text,
  linked_records bigint,
  linked_entities jsonb
)
language sql
stable
security definer
set search_path=public,auth
as $$
  with links as (
    select s.auth_user_id,'student'::text entity_type,s.id entity_id,s.full_name_ar entity_name
    from school_students s where s.auth_user_id is not null
    union all
    select p.auth_user_id,'parent',p.id,p.full_name
    from school_parents p where p.auth_user_id is not null
    union all
    select t.auth_user_id,'teacher',t.id,t.full_name_ar
    from school_teachers t where t.auth_user_id is not null
    union all
    select e.auth_user_id,'employee',e.id,e.full_name_ar
    from school_employees e where e.auth_user_id is not null
  )
  select l.auth_user_id,u.email,count(*)::bigint,
         jsonb_agg(jsonb_build_object(
           'entity_type',l.entity_type,
           'entity_id',l.entity_id,
           'entity_name',l.entity_name
         ))
  from links l
  join auth.users u on u.id=l.auth_user_id
  group by l.auth_user_id,u.email
  having count(*)>1
  order by count(*) desc,u.email;
$$;
grant execute on function public.school_auth_link_conflicts() to authenticated;

create or replace function public.school_resync_auth_links()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  n_students integer:=0;
  n_parents integer:=0;
  n_teachers integer:=0;
  n_employees integer:=0;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  update school_students s
  set auth_user_id=u.id,updated_at=now()
  from auth.users u
  where s.auth_user_id is null
    and nullif(trim(coalesce(s.email,'')),'') is not null
    and lower(trim(s.email))=lower(trim(u.email));
  get diagnostics n_students=row_count;

  update school_parents p
  set auth_user_id=u.id,updated_at=now()
  from auth.users u
  where p.auth_user_id is null
    and nullif(trim(coalesce(p.email,'')),'') is not null
    and lower(trim(p.email))=lower(trim(u.email));
  get diagnostics n_parents=row_count;

  update school_teachers t
  set auth_user_id=u.id,updated_at=now()
  from auth.users u
  where t.auth_user_id is null
    and nullif(trim(coalesce(t.email,'')),'') is not null
    and lower(trim(t.email))=lower(trim(u.email));
  get diagnostics n_teachers=row_count;

  update school_employees e
  set auth_user_id=u.id,updated_at=now()
  from auth.users u
  where e.auth_user_id is null
    and nullif(trim(coalesce(e.email,'')),'') is not null
    and lower(trim(e.email))=lower(trim(u.email));
  get diagnostics n_employees=row_count;

  return jsonb_build_object(
    'students_linked',n_students,
    'parents_linked',n_parents,
    'teachers_linked',n_teachers,
    'employees_linked',n_employees
  );
end $$;
grant execute on function public.school_resync_auth_links() to authenticated;

create or replace function public.school_s14_1_health()
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select jsonb_build_object(
    'students_unlinked',(select count(*) from school_students where status='active' and auth_user_id is null),
    'parents_unlinked',(select count(*) from school_parents where is_active=true and auth_user_id is null),
    'teachers_unlinked',(select count(*) from school_teachers where status='active' and auth_user_id is null),
    'employees_unlinked',(select count(*) from school_employees where status='active' and auth_user_id is null),
    'teachers_with_auth',(select count(*) from school_teachers where status='active' and auth_user_id is not null),
    'link_conflicts',(select count(*) from public.school_auth_link_conflicts())
  );
$$;
grant execute on function public.school_s14_1_health() to authenticated;

select public.school_s14_1_health();
