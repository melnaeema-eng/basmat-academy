-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S17 BIG
-- SMART TIMETABLE & SCHEDULING
-- ============================================================

create table if not exists public.school_period_settings (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  period_no integer not null check(period_no>0),
  starts_at time not null,
  ends_at time not null,
  label_ar text,
  label_en text,
  is_break boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(academic_year_id,period_no),
  check(ends_at>starts_at)
);

alter table public.school_period_settings enable row level security;

drop policy if exists school_period_settings_admin_all on public.school_period_settings;
create policy school_period_settings_admin_all
on public.school_period_settings for all to authenticated
using(public.is_school_admin())
with check(public.is_school_admin());

drop policy if exists school_period_settings_read on public.school_period_settings;
create policy school_period_settings_read
on public.school_period_settings for select to authenticated
using(true);

create or replace function public.school_timetable_conflicts(
  p_academic_year_id uuid,
  p_class_section_id uuid,
  p_teacher_id uuid,
  p_weekday integer,
  p_period_no integer,
  p_exclude_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'class_conflict',exists(
      select 1 from school_timetable t
      where t.academic_year_id=p_academic_year_id
        and t.class_section_id=p_class_section_id
        and t.weekday=p_weekday
        and t.period_no=p_period_no
        and t.is_active=true
        and (p_exclude_id is null or t.id<>p_exclude_id)
    ),
    'teacher_conflict',exists(
      select 1 from school_timetable t
      where t.academic_year_id=p_academic_year_id
        and t.teacher_id=p_teacher_id
        and t.weekday=p_weekday
        and t.period_no=p_period_no
        and t.is_active=true
        and (p_exclude_id is null or t.id<>p_exclude_id)
    )
  );
$$;
grant execute on function public.school_timetable_conflicts(uuid,uuid,uuid,integer,integer,uuid) to authenticated;

create or replace function public.school_save_timetable_entry(
  p_id uuid,
  p_academic_year_id uuid,
  p_class_section_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_weekday integer,
  p_period_no integer,
  p_room text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  ps school_period_settings%rowtype;
  c jsonb;
  rid uuid;
begin
  if not public.is_school_admin() then raise exception 'School Admin required'; end if;

  if p_weekday not between 0 and 6 then raise exception 'Invalid weekday'; end if;

  select * into ps
  from school_period_settings
  where academic_year_id=p_academic_year_id
    and period_no=p_period_no
    and is_active=true
    and is_break=false;

  if not found then raise exception 'Period setting not found or is a break'; end if;

  if not exists(
    select 1 from school_teacher_assignments ta
    where ta.teacher_id=p_teacher_id
      and ta.academic_year_id=p_academic_year_id
      and ta.class_section_id=p_class_section_id
      and ta.subject_id=p_subject_id
      and ta.is_active=true
  ) then
    raise exception 'Teacher is not assigned to this class/subject';
  end if;

  c:=public.school_timetable_conflicts(
    p_academic_year_id,p_class_section_id,p_teacher_id,p_weekday,p_period_no,p_id
  );

  if coalesce((c->>'class_conflict')::boolean,false) then
    raise exception 'Class already has another lesson in this period';
  end if;

  if coalesce((c->>'teacher_conflict')::boolean,false) then
    raise exception 'Teacher already has another lesson in this period';
  end if;

  if p_id is null then
    insert into school_timetable(
      academic_year_id,class_section_id,subject_id,teacher_id,
      weekday,period_no,starts_at,ends_at,room,is_active
    )
    values(
      p_academic_year_id,p_class_section_id,p_subject_id,p_teacher_id,
      p_weekday,p_period_no,ps.starts_at,ps.ends_at,nullif(trim(coalesce(p_room,'')) ,''),true
    )
    returning id into rid;
  else
    update school_timetable
    set academic_year_id=p_academic_year_id,
        class_section_id=p_class_section_id,
        subject_id=p_subject_id,
        teacher_id=p_teacher_id,
        weekday=p_weekday,
        period_no=p_period_no,
        starts_at=ps.starts_at,
        ends_at=ps.ends_at,
        room=nullif(trim(coalesce(p_room,'')) ,''),
        is_active=true,
        updated_at=now()
    where id=p_id
    returning id into rid;
  end if;

  return rid;
end $$;
grant execute on function public.school_save_timetable_entry(uuid,uuid,uuid,uuid,uuid,integer,integer,text) to authenticated;

create or replace function public.school_timetable_weekly_load(
  p_class_section_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'subject_id',gs.subject_id,
      'subject_ar',s.name_ar,
      'required_periods',gs.weekly_periods,
      'scheduled_periods',(
        select count(*)
        from school_timetable t
        where t.class_section_id=p_class_section_id
          and t.subject_id=gs.subject_id
          and t.is_active=true
      ),
      'remaining_periods',greatest(
        gs.weekly_periods-(
          select count(*)
          from school_timetable t
          where t.class_section_id=p_class_section_id
            and t.subject_id=gs.subject_id
            and t.is_active=true
        ),0
      )
    )
    order by gs.sort_order,s.name_ar
  ),'[]'::jsonb)
  from school_class_sections cs
  join school_grade_subjects gs
    on gs.academic_year_id=cs.academic_year_id
   and gs.grade_level_id=cs.grade_level_id
   and gs.curriculum_id=cs.curriculum_id
   and gs.is_active=true
  join school_subjects s on s.id=gs.subject_id
  where cs.id=p_class_section_id;
$$;
grant execute on function public.school_timetable_weekly_load(uuid) to authenticated;

create or replace function public.school_s17_health()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'period_settings',(select count(*) from school_period_settings where is_active=true),
    'timetable_entries',(select count(*) from school_timetable where is_active=true),
    'class_conflicts',(
      select count(*) from (
        select academic_year_id,class_section_id,weekday,period_no,count(*)
        from school_timetable
        where is_active=true
        group by academic_year_id,class_section_id,weekday,period_no
        having count(*)>1
      )x
    ),
    'teacher_conflicts',(
      select count(*) from (
        select academic_year_id,teacher_id,weekday,period_no,count(*)
        from school_timetable
        where is_active=true
        group by academic_year_id,teacher_id,weekday,period_no
        having count(*)>1
      )x
    ),
    'classes_without_timetable',(
      select count(*)
      from school_class_sections cs
      where cs.is_active=true
        and not exists(select 1 from school_timetable t where t.class_section_id=cs.id and t.is_active=true)
    )
  );
$$;
grant execute on function public.school_s17_health() to authenticated;

select public.school_s17_health();
