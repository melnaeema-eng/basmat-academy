begin;
create table if not exists public.academy_question_bank (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete restrict,
 topic text not null,
 difficulty text not null default 'intermediate' check(difficulty in ('beginner','intermediate','advanced')),
 question_ar text not null check(length(trim(question_ar))>10),
 question_en text not null check(length(trim(question_en))>10),
 options_ar jsonb not null check(jsonb_typeof(options_ar)='array' and jsonb_array_length(options_ar)=4),
 options_en jsonb not null check(jsonb_typeof(options_en)='array' and jsonb_array_length(options_en)=4),
 answer_index integer not null check(answer_index between 0 and 3),
 explanation_ar text not null,
 explanation_en text not null,
 source_url text not null check(source_url ~ '^https://'),
 source_checked_on date not null default current_date,
 status text not null default 'draft' check(status in ('draft','reviewed','retired')),
 created_at timestamptz not null default now(),
 unique(course_id,question_en)
);
create index if not exists academy_question_bank_course_status on public.academy_question_bank(course_id,status);
alter table public.academy_question_bank enable row level security;
revoke all on public.academy_question_bank from anon;
grant select,insert,update,delete on public.academy_question_bank to authenticated;
create policy academy_question_bank_admin on public.academy_question_bank for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.exam_questions add column if not exists bank_question_id uuid references public.academy_question_bank(id) on delete set null;
create unique index if not exists exam_questions_bank_unique on public.exam_questions(exam_id,bank_question_id) where bank_question_id is not null;
create or replace function public.import_academy_bank_questions(p_exam_id uuid,p_question_ids uuid[],p_language text default 'ar') returns integer
language plpgsql security invoker set search_path=public as $$
declare target_course uuid; added integer;
begin
 if not public.is_admin() then raise exception 'admin_required'; end if;
 if p_language not in ('ar','en') then raise exception 'invalid_language'; end if;
 select course_id into target_course from public.exams where id=p_exam_id and not is_published for update;
 if target_course is null then raise exception 'select_draft_exam'; end if;
 if cardinality(p_question_ids) is null or cardinality(p_question_ids)<1 or cardinality(p_question_ids)>200 then raise exception 'select_1_to_200_questions'; end if;
 if exists(select 1 from unnest(p_question_ids) i where not exists(select 1 from public.academy_question_bank b where b.id=i and b.course_id=target_course and b.status='reviewed')) then raise exception 'questions_must_be_reviewed_and_match_course'; end if;
 insert into public.exam_questions(exam_id,question_text,options,correct_answer,points,order_number,bank_question_id)
 select p_exam_id,case when p_language='ar' then b.question_ar else b.question_en end,
 case when p_language='ar' then b.options_ar else b.options_en end,
 case when p_language='ar' then b.options_ar->>b.answer_index else b.options_en->>b.answer_index end,
 1,coalesce((select max(order_number) from public.exam_questions where exam_id=p_exam_id),0)+row_number() over(order by u.n),b.id
 from unnest(p_question_ids) with ordinality u(id,n) join public.academy_question_bank b on b.id=u.id
 on conflict (exam_id,bank_question_id) where bank_question_id is not null do nothing;
 get diagnostics added=row_count;return added;
end;$$;
revoke all on function public.import_academy_bank_questions(uuid,uuid[],text) from public,anon;
grant execute on function public.import_academy_bank_questions(uuid,uuid[],text) to authenticated;
commit;
