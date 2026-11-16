begin;
create or replace function public.create_academy_exam_from_bank(p_course_id uuid,p_count integer default 30,p_language text default 'ar',p_duration integer default 30,p_passing integer default 70) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare ids uuid[]; e public.exams%rowtype;
begin
 if not public.is_admin() then raise exception 'admin_required';end if;
 if p_count is null or p_language is null or p_duration is null or p_passing is null or p_count not between 1 and 200 or p_language not in ('ar','en') or p_duration not between 1 and 240 or p_passing not between 1 and 100 then raise exception 'invalid_exam_settings';end if;
 select array_agg(id) into ids from (select id from public.academy_question_bank where course_id=p_course_id and status='reviewed' order by random() limit p_count)b;
 if coalesce(cardinality(ids),0)<>p_count then raise exception 'not_enough_reviewed_questions';end if;
 insert into public.exams(course_id,title,description,passing_score,max_attempts,duration_minutes,randomize_questions,show_answers_after_submit,is_final,is_published)
 values(p_course_id,case when p_language='ar' then 'اختبار تدريبي من بنك الدورة' else 'Course bank practice exam' end,case when p_language='ar' then 'اختبار مُنشأ آليًا من أسئلة التدريب المعتمدة؛ راجعه قبل النشر.' else 'Automatically assembled from reviewed practice questions; review before publishing.' end,p_passing,3,p_duration,true,true,false,false) returning * into e;
 perform public.import_academy_bank_questions(e.id,ids,p_language);
 return to_jsonb(e)||jsonb_build_object('exam_questions',(select jsonb_agg(to_jsonb(q) order by q.order_number) from public.exam_questions q where q.exam_id=e.id));
end;$$;
revoke all on function public.create_academy_exam_from_bank(uuid,integer,text,integer,integer) from public,anon;
grant execute on function public.create_academy_exam_from_bank(uuid,integer,text,integer,integer) to authenticated;
create or replace function public.guard_empty_academy_exam() returns trigger language plpgsql set search_path='' as $$
begin
 if new.is_published and not exists(select 1 from public.exam_questions where exam_id=new.id) then raise exception 'cannot_publish_empty_exam';end if;return new;
end;$$;
create trigger academy_guard_empty_exam before insert or update on public.exams for each row execute function public.guard_empty_academy_exam();
commit;
