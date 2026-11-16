begin;
create table if not exists academy_private.lesson_view_sessions(
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 token uuid not null default gen_random_uuid(),
 last_ping timestamptz not null default clock_timestamp(),
 last_position integer, last_playing boolean not null default false,
 duration_seconds integer not null default 0,
 coverage integer[] not null default '{}',
 reading_seconds integer not null default 0,
 progress integer not null default 0 check(progress between 0 and 100),
 primary key(user_id,lesson_id)
);
alter table academy_private.lesson_view_sessions enable row level security;
revoke all on academy_private.lesson_view_sessions from public,anon,authenticated;
create or replace function academy_private.refresh_lab_course_progress(p_course uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; value integer; targets integer[]:=array[15,25,25,35,90,45,45,30];
begin
 if auth.uid() is null then raise exception 'login_required';end if;
 perform 1 from public.enrollments where course_id=p_course and user_id=auth.uid() and coalesce(status,'active')<>'cancelled' for update;
 if not found then raise exception 'enrollment_required';end if;
 with percentages as (
 select l.id,l.title,case when l.id=c.lesson_id then coalesce(
  (select floor(sum(least(s.seen_seconds[i],targets[i])*100.0/(8*targets[i])))::integer from academy_private.lab_view_sessions s cross join generate_series(1,8)i where s.user_id=auth.uid() and s.lab_id=c.id),
  (select count(*)::integer*100/8 from public.academy_lab_stage_progress sp where sp.user_id=auth.uid() and sp.lab_id=c.id and sp.completed),0)
 else coalesce((select v.progress from academy_private.lesson_view_sessions v where v.user_id=auth.uid() and v.lesson_id=l.id),0) end as percent
 from public.lessons l join public.academy_lab_catalog c on c.course_id=l.course_id where l.course_id=p_course and l.is_published
 ) select coalesce(floor(avg(percent))::integer,0),coalesce(jsonb_agg(jsonb_build_object('lesson_id',id,'title',title,'progress',percent)),'[]'::jsonb) into value,result from percentages;
 update public.enrollments set progress=value where course_id=p_course and user_id=auth.uid() and progress is distinct from value;
 return jsonb_build_object('course_progress',value,'lessons',result,'lesson_count',jsonb_array_length(result));
end;$$;
revoke all on function academy_private.refresh_lab_course_progress(uuid) from public,anon,authenticated;
create or replace function academy_private.lab_tracking_snapshot(p_lab_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s academy_private.lab_view_sessions%rowtype;targets integer[]:=array[15,25,25,35,90,45,45,30];parts integer[];done integer[];value integer;course uuid;primary_lesson uuid;course_state jsonb;
begin
 select * into s from academy_private.lab_view_sessions where user_id=auth.uid() and lab_id=p_lab_id;
 select course_id,lesson_id into course,primary_lesson from public.academy_lab_catalog where id=p_lab_id;
 select array_agg(least(100,floor(s.seen_seconds[i]*100.0/targets[i])::integer) order by i),coalesce(array_agg(i order by i) filter(where s.seen_seconds[i]>=targets[i]),'{}'::integer[]),floor(sum(least(s.seen_seconds[i],targets[i])*100.0/(8*targets[i])))::integer into parts,done,value from generate_series(1,8) i;
 insert into public.academy_lab_stage_progress(user_id,lab_id,stage,completed) select auth.uid(),p_lab_id,i,true from generate_series(1,8)i where s.seen_seconds[i]>=targets[i] on conflict(user_id,lab_id,stage) do update set completed=true,updated_at=now();
 if value=100 and primary_lesson is not null then insert into public.lesson_progress(user_id,lesson_id,completed_at) values(auth.uid(),primary_lesson,now()) on conflict(user_id,lesson_id) do nothing;end if;
 course_state:=academy_private.refresh_lab_course_progress(course);
 return course_state||jsonb_build_object('session_id',s.session_token,'progress',value,'stage_progress',parts,'completed_stages',done,'canRecord',true,'loginRequired',false);
end;$$;
create or replace function public.open_academy_lesson_tracking(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.lessons%rowtype; lab public.academy_lab_catalog%rowtype;v academy_private.lesson_view_sessions%rowtype;
begin
 select * into l from public.lessons where id=p_lesson_id and is_published;if not found then raise exception 'lesson_not_available';end if;
 select * into lab from public.academy_lab_catalog where course_id=l.course_id;if not found then raise exception 'lab_course_required';end if;
 perform academy_private.authorize_lab_tracking(lab.id);
 if l.id=lab.lesson_id then raise exception 'use_lab_stage_tracking';end if;
 insert into academy_private.lesson_view_sessions(user_id,lesson_id) values(auth.uid(),l.id) on conflict(user_id,lesson_id) do update set token=gen_random_uuid(),last_ping=clock_timestamp(),last_position=null,last_playing=false returning * into v;
 return academy_private.refresh_lab_course_progress(l.course_id)||jsonb_build_object('session_id',v.token,'progress',v.progress);
end;$$;
create or replace function public.track_academy_lesson_view(p_lesson_id uuid,p_session_id uuid,p_playing boolean,p_position integer default null,p_duration integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.lessons%rowtype;lab public.academy_lab_catalog%rowtype;v academy_private.lesson_view_sessions%rowtype;gap numeric;amount integer;target integer;
begin
 select * into l from public.lessons where id=p_lesson_id and is_published;
 select * into lab from public.academy_lab_catalog where course_id=l.course_id;if lab.id is null or l.id=lab.lesson_id then raise exception 'invalid_lesson';end if;
 perform academy_private.authorize_lab_tracking(lab.id);
 select * into v from academy_private.lesson_view_sessions where user_id=auth.uid() and lesson_id=l.id for update;
 if not found or v.token is distinct from p_session_id then raise exception 'tracking_session_expired';end if;
 gap:=extract(epoch from clock_timestamp()-v.last_ping);
 if l.lesson_type='video' then
  if v.duration_seconds=0 and p_duration between 1 and 86400 then v.duration_seconds:=p_duration;end if;
  if p_playing and v.last_playing and gap between 0.5 and 15 and (gap>=3 or p_position=v.duration_seconds) and p_position between 0 and v.duration_seconds and v.last_position is not null and p_position>v.last_position and p_position-v.last_position<=ceil(gap)+2 then
   amount:=least(10,round(gap)::integer,p_position-v.last_position);
   select array_agg(distinct x order by x) into v.coverage from unnest(v.coverage||array(select i from generate_series(greatest(0,p_position-amount),least(v.duration_seconds-1,p_position-1)) i))x;
  end if;
  v.progress:=case when v.duration_seconds>0 then least(100,floor(cardinality(v.coverage)*100.0/v.duration_seconds)::integer) else 0 end;
 else
  if p_playing and v.last_playing and gap between 3 and 15 then v.reading_seconds:=least(60,v.reading_seconds+least(10,floor(gap)::integer));end if;
  v.progress:=floor(v.reading_seconds*100.0/60)::integer;
 end if;
 update academy_private.lesson_view_sessions set last_ping=clock_timestamp(),last_position=p_position,last_playing=coalesce(p_playing,false),duration_seconds=v.duration_seconds,coverage=v.coverage,reading_seconds=v.reading_seconds,progress=v.progress where user_id=auth.uid() and lesson_id=l.id;
 if v.progress=100 then insert into public.lesson_progress(user_id,lesson_id,completed_at) values(auth.uid(),l.id,now()) on conflict(user_id,lesson_id) do nothing;end if;
 return academy_private.refresh_lab_course_progress(l.course_id)||jsonb_build_object('progress',v.progress);
end;$$;
revoke all on function public.open_academy_lesson_tracking(uuid) from public,anon;
revoke all on function public.track_academy_lesson_view(uuid,uuid,boolean,integer,integer) from public,anon;
grant execute on function public.open_academy_lesson_tracking(uuid) to authenticated;
grant execute on function public.track_academy_lesson_view(uuid,uuid,boolean,integer,integer) to authenticated;
create or replace function public.guard_lab_lesson_completion() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and not public.is_admin() and exists(select 1 from public.lessons l join public.academy_lab_catalog c on c.course_id=l.course_id where l.id=case when tg_op='DELETE' then old.lesson_id else new.lesson_id end) then raise exception 'lab_lesson_completion_is_automatic';end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create trigger academy_guard_lab_lesson_completion before insert or update or delete on public.lesson_progress for each row execute function public.guard_lab_lesson_completion();
commit;
