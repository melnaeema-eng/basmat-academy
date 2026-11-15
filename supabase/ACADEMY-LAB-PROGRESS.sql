create table public.academy_lab_stage_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 lab_id uuid not null references public.academy_lab_catalog(id) on delete cascade,
 stage smallint not null check(stage between 1 and 8),
 completed boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(user_id,lab_id,stage)
);
alter table public.academy_lab_stage_progress enable row level security;
revoke all on public.academy_lab_stage_progress from public,anon,authenticated;
grant select on public.academy_lab_stage_progress to authenticated;
grant all on public.academy_lab_stage_progress to service_role;
create policy academy_lab_stage_read_own on public.academy_lab_stage_progress for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.set_academy_lab_stage(p_lab_id uuid,p_stage integer,p_completed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_lab public.academy_lab_catalog%rowtype; v_enrollment uuid; v_stages integer[]; v_progress integer;
begin
 if v_user is null then raise exception 'login_required';end if;
 if p_stage is null or p_stage not between 1 and 8 or p_completed is null then raise exception 'invalid_stage';end if;
 select * into v_lab from public.academy_lab_catalog where id=p_lab_id and is_published;
 if not found then raise exception 'lab_not_available';end if;
 if v_lab.price>0 and not exists(select 1 from public.academy_lab_access where lab_id=p_lab_id and user_id=v_user and revoked_at is null) then raise exception 'lab_purchase_required';end if;
 select id into v_enrollment from public.enrollments where course_id=v_lab.course_id and user_id=v_user and coalesce(status,'active')<>'cancelled' for update;
 if not found then raise exception 'enrollment_required';end if;
 insert into public.academy_lab_stage_progress(user_id,lab_id,stage,completed) values(v_user,p_lab_id,p_stage,p_completed)
 on conflict(user_id,lab_id,stage) do update set completed=excluded.completed,updated_at=now();
 select coalesce(array_agg(stage::integer order by stage) filter(where completed),'{}'::integer[]) into v_stages from public.academy_lab_stage_progress where user_id=v_user and lab_id=p_lab_id;
 v_progress:=round(cardinality(v_stages)*100.0/8)::integer;
 update public.enrollments set progress=v_progress where id=v_enrollment;
 if v_lab.lesson_id is not null then
  if v_progress=100 then
   insert into public.lesson_progress(user_id,lesson_id,completed_at) values(v_user,v_lab.lesson_id,now()) on conflict(user_id,lesson_id) do nothing;
  else
   delete from public.lesson_progress where user_id=v_user and lesson_id=v_lab.lesson_id;
  end if;
 end if;
 return jsonb_build_object('completed_stages',v_stages,'progress',v_progress);
end;$$;
revoke all on function public.set_academy_lab_stage(uuid,integer,boolean) from public,anon;
grant execute on function public.set_academy_lab_stage(uuid,integer,boolean) to authenticated;
