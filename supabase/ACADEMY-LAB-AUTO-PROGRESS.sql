create table academy_private.lab_view_sessions(
 user_id uuid not null references auth.users(id) on delete cascade,
 lab_id uuid not null references public.academy_lab_catalog(id) on delete cascade,
 session_token uuid not null default gen_random_uuid(),
 last_stage smallint check(last_stage between 1 and 8),
 last_ping timestamptz not null default now(),
 seen_seconds integer[] not null default array[0,0,0,0,0,0,0,0] check(array_length(seen_seconds,1)=8),
 primary key(user_id,lab_id)
);
revoke all on academy_private.lab_view_sessions from public,anon,authenticated;
create function academy_private.authorize_lab_tracking(p_lab_id uuid) returns public.academy_lab_catalog language plpgsql security definer set search_path='' as $$
declare lab public.academy_lab_catalog%rowtype;
begin
 if auth.uid() is null then raise exception 'login_required';end if;
 select * into lab from public.academy_lab_catalog where id=p_lab_id and is_published;
 if not found then raise exception 'lab_not_available';end if;
 if lab.price>0 and not exists(select 1 from public.academy_lab_access where lab_id=lab.id and user_id=auth.uid() and revoked_at is null) then raise exception 'lab_purchase_required';end if;
 perform 1 from public.enrollments where user_id=auth.uid() and course_id=lab.course_id and coalesce(status,'active')<>'cancelled' for update;
 if not found then raise exception 'enrollment_required';end if;
 return lab;
end;$$;
create function academy_private.lab_tracking_snapshot(p_lab_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s academy_private.lab_view_sessions%rowtype;targets integer[]:=array[15,25,25,35,90,45,45,30];parts integer[];done integer[];value integer;previous integer;course uuid;
begin
 select * into s from academy_private.lab_view_sessions where user_id=auth.uid() and lab_id=p_lab_id;
 select course_id into course from public.academy_lab_catalog where id=p_lab_id;
 select array_agg(least(100,floor(s.seen_seconds[i]*100.0/targets[i])::integer) order by i),coalesce(array_agg(i order by i) filter(where s.seen_seconds[i]>=targets[i]),'{}'::integer[]),floor(sum(least(s.seen_seconds[i],targets[i])*100.0/(8*targets[i])))::integer into parts,done,value from generate_series(1,8) i;
 select coalesce(progress,0) into previous from public.enrollments where user_id=auth.uid() and course_id=course;
 value:=greatest(value,previous);
 update public.enrollments set progress=value where user_id=auth.uid() and course_id=course and coalesce(progress,0)<value;
 insert into public.academy_lab_stage_progress(user_id,lab_id,stage,completed)
 select auth.uid(),p_lab_id,i,true from generate_series(1,8) i where s.seen_seconds[i]>=targets[i]
 on conflict(user_id,lab_id,stage) do update set completed=true,updated_at=now();
 return jsonb_build_object('session_id',s.session_token,'progress',value,'stage_progress',parts,'completed_stages',done,'canRecord',true,'loginRequired',false);
end;$$;
create function public.open_academy_lab_tracking(p_lab_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare lab public.academy_lab_catalog%rowtype;seed integer[];targets integer[]:=array[15,25,25,35,90,45,45,30];
begin
 lab:=academy_private.authorize_lab_tracking(p_lab_id);
 select array_agg(case when exists(select 1 from public.academy_lab_stage_progress p where p.user_id=auth.uid() and p.lab_id=p_lab_id and p.stage=i and p.completed) then targets[i] else 0 end order by i) into seed from generate_series(1,8) i;
 insert into academy_private.lab_view_sessions(user_id,lab_id,seen_seconds) values(auth.uid(),p_lab_id,seed)
 on conflict(user_id,lab_id) do update set session_token=gen_random_uuid(),last_stage=null,last_ping=now();
 return academy_private.lab_tracking_snapshot(p_lab_id);
end;$$;
create function public.track_academy_lab_view(p_lab_id uuid,p_session_id uuid,p_stage integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare lab public.academy_lab_catalog%rowtype;s academy_private.lab_view_sessions%rowtype;gap numeric;amount integer;targets integer[]:=array[15,25,25,35,90,45,45,30];
begin
 if p_stage is not null and p_stage not between 1 and 8 then raise exception 'invalid_stage';end if;
 lab:=academy_private.authorize_lab_tracking(p_lab_id);
 select * into s from academy_private.lab_view_sessions where user_id=auth.uid() and lab_id=p_lab_id for update;
 if not found or s.session_token is distinct from p_session_id then raise exception 'tracking_session_expired';end if;
 gap:=extract(epoch from now()-s.last_ping);
 if p_stage is not null and s.last_stage=p_stage and gap>=3 and gap<=15 then
  amount:=least(10,round(gap)::integer);
  s.seen_seconds[p_stage]:=least(targets[p_stage],s.seen_seconds[p_stage]+amount);
 end if;
 update academy_private.lab_view_sessions set seen_seconds=s.seen_seconds,last_stage=p_stage,last_ping=now() where user_id=auth.uid() and lab_id=p_lab_id;
 return academy_private.lab_tracking_snapshot(p_lab_id);
end;$$;
revoke all on function academy_private.authorize_lab_tracking(uuid),academy_private.lab_tracking_snapshot(uuid) from public,anon,authenticated;
revoke all on function public.open_academy_lab_tracking(uuid),public.track_academy_lab_view(uuid,uuid,integer) from public,anon;
grant execute on function public.open_academy_lab_tracking(uuid),public.track_academy_lab_view(uuid,uuid,integer) to authenticated;
revoke execute on function public.set_academy_lab_stage(uuid,integer,boolean) from authenticated;
-- Direct percentage writes for lab enrollments must not bypass automatic tracking.
create function public.guard_automatic_lab_progress() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' and not public.is_admin() and new.progress is distinct from old.progress and exists(select 1 from public.academy_lab_catalog where course_id=old.course_id) then raise exception 'lab_progress_is_automatic';end if;
 return new;
end;$$;
revoke all on function public.guard_automatic_lab_progress() from public,anon,authenticated;
create trigger academy_guard_automatic_lab_progress before update of progress on public.enrollments for each row execute function public.guard_automatic_lab_progress();
alter table public.academy_lab_content add column if not exists student_pdf_page_stages jsonb;
alter table public.academy_lab_content add column if not exists student_pdf_page_languages jsonb;
grant select(student_pdf_page_stages,student_pdf_page_languages) on public.academy_lab_content to anon,authenticated;
create function public.enroll_my_free_course(p_course_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.enrollments%rowtype; begin if auth.uid() is null then raise exception 'login_required';end if; if not exists(select 1 from public.courses where id=p_course_id and coalesce(price,0)<=0 and lower(coalesce(status,''))='published') then raise exception 'free_course_required';end if; insert into public.enrollments(user_id,course_id,status) values(auth.uid(),p_course_id,'active') on conflict(user_id,course_id) do update set status='active' returning * into result; return to_jsonb(result);end;$$; revoke all on function public.enroll_my_free_course(uuid) from public,anon;grant execute on function public.enroll_my_free_course(uuid) to authenticated;
create function public.guard_lab_lesson_assessment() returns trigger language plpgsql security invoker set search_path='' as $$begin if current_user='authenticated' and not public.is_admin() and exists(select 1 from public.academy_lab_catalog where lesson_id=new.lesson_id) then raise exception 'lab_assessment_required';end if;return new;end;$$;revoke all on function public.guard_lab_lesson_assessment() from public,anon,authenticated;create trigger academy_guard_lab_lesson_assessment before insert or update on public.lesson_progress for each row execute function public.guard_lab_lesson_assessment();
