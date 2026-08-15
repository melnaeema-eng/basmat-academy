-- ============================================================
-- SCHOOL SPRINT S1 — SCHOOL CORE
-- Sudanese Online School
-- KG1-KG3 + Primary 1-6 + Intermediate 1-3 + Secondary 1-3
-- Arabic Curriculum + English Curriculum
-- All objects are prefixed school_ to keep Academy Mode isolated.
-- ============================================================

create table if not exists public.school_academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  status text not null default 'draft' check(status in('draft','active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create unique index if not exists school_one_current_year
on public.school_academic_years ((is_current))
where is_current=true;

create table if not exists public.school_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  sort_order integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_grade_levels (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.school_stages(id) on delete restrict,
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  grade_number integer not null,
  sort_order integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(stage_id,grade_number)
);

create table if not exists public.school_curricula (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(code in('AR','EN')),
  name_ar text not null,
  name_en text not null,
  instruction_language text not null check(instruction_language in('ar','en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_grade_subjects (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete cascade,
  curriculum_id uuid not null references public.school_curricula(id) on delete cascade,
  subject_id uuid not null references public.school_subjects(id) on delete cascade,
  weekly_periods integer not null default 1 check(weekly_periods > 0),
  pass_mark numeric(5,2) not null default 50 check(pass_mark between 0 and 100),
  max_mark numeric(7,2) not null default 100 check(max_mark > 0),
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(academic_year_id,grade_level_id,curriculum_id,subject_id)
);

create table if not exists public.school_class_sections (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  grade_level_id uuid not null references public.school_grade_levels(id) on delete restrict,
  curriculum_id uuid not null references public.school_curricula(id) on delete restrict,
  section_name text not null,
  capacity integer check(capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academic_year_id,grade_level_id,curriculum_id,section_name)
);

-- Seed stages.
insert into public.school_stages(code,name_ar,name_en,sort_order)
values
 ('KG','الروضة','Kindergarten',1),
 ('PRIMARY','الابتدائية','Primary',2),
 ('INTERMEDIATE','المتوسطة','Intermediate',3),
 ('SECONDARY','الثانوية','Secondary',4)
on conflict(code) do update
set name_ar=excluded.name_ar,name_en=excluded.name_en,sort_order=excluded.sort_order;

-- Seed 15 levels.
insert into public.school_grade_levels(stage_id,code,name_ar,name_en,grade_number,sort_order)
select s.id,v.code,v.name_ar,v.name_en,v.grade_number,v.sort_order
from (
 values
 ('KG','KG1','KG1','KG1',1,1),
 ('KG','KG2','KG2','KG2',2,2),
 ('KG','KG3','KG3','KG3',3,3),

 ('PRIMARY','P1','الصف الأول الابتدائي','Primary Grade 1',1,4),
 ('PRIMARY','P2','الصف الثاني الابتدائي','Primary Grade 2',2,5),
 ('PRIMARY','P3','الصف الثالث الابتدائي','Primary Grade 3',3,6),
 ('PRIMARY','P4','الصف الرابع الابتدائي','Primary Grade 4',4,7),
 ('PRIMARY','P5','الصف الخامس الابتدائي','Primary Grade 5',5,8),
 ('PRIMARY','P6','الصف السادس الابتدائي','Primary Grade 6',6,9),

 ('INTERMEDIATE','M1','الصف الأول المتوسط','Intermediate Grade 1',1,10),
 ('INTERMEDIATE','M2','الصف الثاني المتوسط','Intermediate Grade 2',2,11),
 ('INTERMEDIATE','M3','الصف الثالث المتوسط','Intermediate Grade 3',3,12),

 ('SECONDARY','S1','الصف الأول الثانوي','Secondary Grade 1',1,13),
 ('SECONDARY','S2','الصف الثاني الثانوي','Secondary Grade 2',2,14),
 ('SECONDARY','S3','الصف الثالث الثانوي','Secondary Grade 3',3,15)
) as v(stage_code,code,name_ar,name_en,grade_number,sort_order)
join public.school_stages s on s.code=v.stage_code
on conflict(code) do update
set stage_id=excluded.stage_id,
    name_ar=excluded.name_ar,
    name_en=excluded.name_en,
    grade_number=excluded.grade_number,
    sort_order=excluded.sort_order;

-- Seed curricula.
insert into public.school_curricula(code,name_ar,name_en,instruction_language)
values
 ('AR','المنهج العربي','Arabic Curriculum','ar'),
 ('EN','المنهج الإنجليزي','English Curriculum','en')
on conflict(code) do update
set name_ar=excluded.name_ar,
    name_en=excluded.name_en,
    instruction_language=excluded.instruction_language;

-- RLS
alter table public.school_academic_years enable row level security;
alter table public.school_stages enable row level security;
alter table public.school_grade_levels enable row level security;
alter table public.school_curricula enable row level security;
alter table public.school_subjects enable row level security;
alter table public.school_grade_subjects enable row level security;
alter table public.school_class_sections enable row level security;

-- School core is readable by authenticated users; only Admin can modify in S1.
do $$
declare t text;
begin
  foreach t in array array[
    'school_academic_years','school_stages','school_grade_levels','school_curricula',
    'school_subjects','school_grade_subjects','school_class_sections'
  ] loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t||'_admin_write', t);
  end loop;
end $$;

-- Safe admin-only RPC for creating an academic year and making it current.
create or replace function public.school_save_academic_year(
  p_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_is_current boolean,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin required'; end if;
  if p_ends_on <= p_starts_on then raise exception 'End date must be after start date'; end if;
  if p_is_current then update public.school_academic_years set is_current=false where is_current=true; end if;

  if p_id is null then
    insert into public.school_academic_years(name,starts_on,ends_on,is_current,status)
    values(trim(p_name),p_starts_on,p_ends_on,coalesce(p_is_current,false),coalesce(p_status,'draft'))
    returning id into v_id;
  else
    update public.school_academic_years
    set name=trim(p_name),starts_on=p_starts_on,ends_on=p_ends_on,
        is_current=coalesce(p_is_current,false),status=coalesce(p_status,'draft'),
        updated_at=now()
    where id=p_id
    returning id into v_id;
  end if;
  return v_id;
end $$;

grant execute on function public.school_save_academic_year(uuid,text,date,date,boolean,text) to authenticated;

create or replace function public.school_core_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
 select jsonb_build_object(
   'stages',(select count(*) from school_stages where is_active),
   'grade_levels',(select count(*) from school_grade_levels where is_active),
   'curricula',(select count(*) from school_curricula where is_active),
   'academic_years',(select count(*) from school_academic_years),
   'subjects',(select count(*) from school_subjects where is_active),
   'class_sections',(select count(*) from school_class_sections where is_active)
 );
$$;

grant execute on function public.school_core_health() to authenticated;
