begin;
create or replace function public.guard_empty_academy_attempt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.exam_questions where exam_id=new.exam_id) then raise exception 'exam_has_no_questions';end if;return new;
end;$$;
revoke all on function public.guard_empty_academy_attempt() from public,anon,authenticated;
create trigger academy_guard_empty_attempt before insert on public.exam_attempts for each row execute function public.guard_empty_academy_attempt();
do $patch$ declare body text; begin
 body:=pg_get_functiondef('public.get_exam_for_student(uuid)'::regprocedure);
 if position('Exam has no questions' in body)=0 then
  body:=replace(body,'if v_attempts >= v_exam.max_attempts then','if not exists(select 1 from public.exam_questions where exam_id=p_exam_id) then raise exception ''Exam has no questions''; end if; if v_attempts >= v_exam.max_attempts then');
  if position('Exam has no questions' in body)=0 then raise exception 'exam_function_patch_failed';end if;
  execute body;
 end if;
end $patch$;
commit;
