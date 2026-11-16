begin;
create or replace function academy_private.lab_course_progress_snapshot(p_course uuid,p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with percentages as (
 select l.id,l.title,case when l.id=c.lesson_id then coalesce(
  (select floor(sum(least(s.seen_seconds[i],(array[15,25,25,35,90,45,45,30])[i])*100.0/(8*(array[15,25,25,35,90,45,45,30])[i])))::integer from academy_private.lab_view_sessions s cross join generate_series(1,8)i where s.user_id=p_user and s.lab_id=c.id),
  (select count(*)::integer*100/8 from public.academy_lab_stage_progress sp where sp.user_id=p_user and sp.lab_id=c.id and sp.completed),0)
 else coalesce((select v.progress from academy_private.lesson_view_sessions v where v.user_id=p_user and v.lesson_id=l.id),0) end as percent
 from public.lessons l join public.academy_lab_catalog c on c.course_id=l.course_id where l.course_id=p_course and l.is_published
 ) select jsonb_build_object('course_progress',coalesce(floor(avg(percent))::integer,0),'lessons',coalesce(jsonb_agg(jsonb_build_object('lesson_id',id,'title',title,'progress',percent)),'[]'::jsonb),'lesson_count',count(*)) from percentages;
$$;
revoke all on function academy_private.lab_course_progress_snapshot(uuid,uuid) from public,anon,authenticated;
create or replace function academy_private.refresh_lab_course_progress(p_course uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'login_required';end if;
 perform 1 from public.enrollments where course_id=p_course and user_id=auth.uid() and coalesce(status,'active')<>'cancelled' for update;
 if not found then raise exception 'enrollment_required';end if;
 result:=academy_private.lab_course_progress_snapshot(p_course,auth.uid());
 update public.enrollments set progress=(result->>'course_progress')::integer where course_id=p_course and user_id=auth.uid() and progress is distinct from (result->>'course_progress')::integer;
 return result;
end;$$;
create or replace function academy_private.reweight_lab_course_lessons() returns trigger
language plpgsql security definer set search_path='' as $$
declare c uuid;u record;s jsonb;old_course uuid;new_course uuid;
begin
 if tg_op<>'INSERT' then old_course:=old.course_id;end if;
 if tg_op<>'DELETE' then new_course:=new.course_id;end if;
 for c in select distinct x from unnest(array[old_course,new_course])x where x is not null loop
  if exists(select 1 from public.academy_lab_catalog where course_id=c) then
   for u in select user_id from public.enrollments where course_id=c and coalesce(status,'active')<>'cancelled' loop
    s:=academy_private.lab_course_progress_snapshot(c,u.user_id);
    update public.enrollments set progress=(s->>'course_progress')::integer where course_id=c and user_id=u.user_id and progress is distinct from (s->>'course_progress')::integer;
   end loop;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function academy_private.reweight_lab_course_lessons() from public,anon,authenticated;
create trigger academy_reweight_lab_course_lessons after insert or delete or update of is_published,course_id on public.lessons for each row execute function academy_private.reweight_lab_course_lessons();
commit;
