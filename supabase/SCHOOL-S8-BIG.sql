-- NAWABIGH ALJAZEERA SCHOOL — S8 BIG
-- ADMISSIONS + ENROLLMENT + DOCUMENTS + STUDENT STATUS

create extension if not exists pgcrypto;

create table if not exists public.school_admission_applications (
 id uuid primary key default gen_random_uuid(),
 application_no text unique,
 academic_year_id uuid references public.school_academic_years(id) on delete set null,
 curriculum_id uuid references public.school_curricula(id) on delete set null,
 grade_level_id uuid references public.school_grade_levels(id) on delete set null,
 student_name_ar text not null,
 student_name_en text,
 gender text check(gender in('male','female')),
 birth_date date,
 nationality text,
 previous_school text,
 parent_name text not null,
 parent_email text,
 parent_phone text not null,
 address text,
 notes text,
 status text not null default 'new'
   check(status in('new','under_review','accepted','rejected','enrolled','withdrawn')),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create sequence if not exists public.school_admission_no_seq start 1001;
create or replace function public.school_set_admission_no()
returns trigger language plpgsql as $$
begin
 if new.application_no is null or trim(new.application_no)='' then
   new.application_no := 'APP-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_admission_no_seq')::text,5,'0');
 end if;
 return new;
end $$;
drop trigger if exists trg_school_admission_no on public.school_admission_applications;
create trigger trg_school_admission_no before insert on public.school_admission_applications
for each row execute function public.school_set_admission_no();

create table if not exists public.school_admission_documents (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.school_admission_applications(id) on delete cascade,
 document_type text not null,
 document_name text not null,
 file_url text not null,
 storage_path text,
 uploaded_at timestamptz not null default now()
);

create table if not exists public.school_student_status_history (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.school_students(id) on delete cascade,
 old_status text,
 new_status text not null,
 reason text,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);

insert into storage.buckets(id,name,public)
values('school-admissions','school-admissions',true)
on conflict(id) do update set public=true;

drop policy if exists school_admissions_storage_read on storage.objects;
create policy school_admissions_storage_read on storage.objects for select to authenticated
using(bucket_id='school-admissions');

drop policy if exists school_admissions_storage_admin on storage.objects;
create policy school_admissions_storage_admin on storage.objects for all to authenticated
using(bucket_id='school-admissions' and public.is_school_admin())
with check(bucket_id='school-admissions' and public.is_school_admin());

alter table school_admission_applications enable row level security;
alter table school_admission_documents enable row level security;
alter table school_student_status_history enable row level security;

drop policy if exists school_admissions_admin_all on school_admission_applications;
create policy school_admissions_admin_all on school_admission_applications for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_admission_documents_admin_all on school_admission_documents;
create policy school_admission_documents_admin_all on school_admission_documents for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

drop policy if exists school_student_status_history_admin_all on school_student_status_history;
create policy school_student_status_history_admin_all on school_student_status_history for all to authenticated
using(public.is_school_admin()) with check(public.is_school_admin());

create or replace function public.school_review_admission(p_id uuid,p_status text,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_status not in('under_review','accepted','rejected','withdrawn') then raise exception 'Invalid status'; end if;
 update school_admission_applications
 set status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note,updated_at=now()
 where id=p_id returning id into rid;
 return rid;
end $$;
grant execute on function public.school_review_admission(uuid,text,text) to authenticated;

create or replace function public.school_change_student_status(p_student_id uuid,p_new_status text,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare old_s text; rid uuid;
begin
 if not public.is_school_admin() then raise exception 'School Admin required'; end if;
 if p_new_status not in('active','suspended','withdrawn','graduated','archived') then raise exception 'Invalid status'; end if;
 select status into old_s from school_students where id=p_student_id;
 update school_students set status=p_new_status where id=p_student_id;
 insert into school_student_status_history(student_id,old_status,new_status,reason,changed_by)
 values(p_student_id,old_s,p_new_status,p_reason,auth.uid()) returning id into rid;
 return rid;
end $$;
grant execute on function public.school_change_student_status(uuid,text,text) to authenticated;

create or replace function public.school_s8_health()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'applications',(select count(*) from school_admission_applications),
  'new_applications',(select count(*) from school_admission_applications where status='new'),
  'accepted',(select count(*) from school_admission_applications where status='accepted'),
  'admission_documents',(select count(*) from school_admission_documents),
  'status_history',(select count(*) from school_student_status_history)
 );
$$;
grant execute on function public.school_s8_health() to authenticated;
select public.school_s8_health();
