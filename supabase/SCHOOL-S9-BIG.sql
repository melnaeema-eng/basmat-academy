-- ============================================================
-- NAWABIGH ALJAZEERA SCHOOL — S9 BIG
-- QUESTION BANK + ONLINE EXAMS + AUTO/MANUAL GRADING
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Extend school exams for online mode
alter table public.school_exams
  add column if not exists delivery_mode text not null default 'paper'
    check(delivery_mode in('paper','online','hybrid')),
  add column if not exists opens_at timestamptz,
  add column if not exists closes_at timestamptz,
  add column if not exists attempts_allowed integer not null default 1 check(attempts_allowed between 1 and 5),
  add column if not exists randomize_questions boolean not null default false,
  add column if not exists randomize_options boolean not null default false,
  add column if not exists show_result_after_submit boolean not null default false,
  add column if not exists allow_review boolean not null default false;

-- 2) Question Bank
create table if not exists public.school_question_bank (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid references public.school_academic_years(id) on delete set null,
  curriculum_id uuid references public.school_curricula(id) on delete set null,
  grade_level_id uuid references public.school_grade_levels(id) on delete set null,
  subject_id uuid not null references public.school_subjects(id) on delete cascade,
  teacher_id uuid references public.school_teachers(id) on delete set null,
  question_type text not null
    check(question_type in('mcq','true_false','short_answer','essay')),
  question_text text not null,
  options jsonb,
  correct_answer text,
  accepted_answers jsonb,
  explanation text,
  difficulty text not null default 'medium'
    check(difficulty in('easy','medium','hard')),
  default_points numeric(8,2) not null default 1 check(default_points>0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Exam questions: snapshot mapping to bank question
create table if not exists public.school_online_exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  question_bank_id uuid references public.school_question_bank(id) on delete set null,
  question_type text not null
    check(question_type in('mcq','true_false','short_answer','essay')),
  question_text text not null,
  options jsonb,
  correct_answer text,
  accepted_answers jsonb,
  explanation text,
  points numeric(8,2) not null default 1 check(points>0),
  order_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique(exam_id,order_number)
);

-- 4) Online attempts
create table if not exists public.school_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  enrollment_id uuid not null references public.school_enrollments(id) on delete cascade,
  attempt_no integer not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress'
    check(status in('in_progress','submitted','auto_graded','needs_review','graded','expired')),
  auto_score numeric(8,2) not null default 0,
  manual_score numeric(8,2) not null default 0,
  total_score numeric(8,2) not null default 0,
  ip_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_id,enrollment_id,attempt_no)
);

-- 5) Answers
create table if not exists public.school_exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.school_exam_attempts(id) on delete cascade,
  exam_question_id uuid not null references public.school_online_exam_questions(id) on delete cascade,
  answer_text text,
  is_correct boolean,
  auto_score numeric(8,2) not null default 0,
  manual_score numeric(8,2) not null default 0,
  teacher_feedback text,
  answered_at timestamptz not null default now(),
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  unique(attempt_id,exam_question_id)
);

-- 6) Add bank question to exam as immutable snapshot
create or replace function public.school_add_question_to_exam(
  p_exam_id uuid,p_question_id uuid,p_points numeric
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare q school_question_bank%rowtype; n integer; rid uuid; ex school_exams%rowtype;
begin
 select * into ex from school_exams where id=p_exam_id;
 if not found then raise exception 'Exam not found'; end if;
 if not public.is_school_admin() and not public.school_teacher_can_manage(ex.class_section_id,ex.subject_id) then
   raise exception 'Not allowed';
 end if;

 select * into q from school_question_bank where id=p_question_id and is_active=true;
 if not found then raise exception 'Question not found'; end if;
 select coalesce(max(order_number),0)+1 into n from school_online_exam_questions where exam_id=p_exam_id;

 insert into school_online_exam_questions(
   exam_id,question_bank_id,question_type,question_text,options,correct_answer,
   accepted_answers,explanation,points,order_number
 ) values(
   p_exam_id,q.id,q.question_type,q.question_text,q.options,q.correct_answer,
   q.accepted_answers,q.explanation,coalesce(p_points,q.default_points),n
 ) returning id into rid;
 return rid;
end $$;
grant execute on function public.school_add_question_to_exam(uuid,uuid,numeric) to authenticated;

-- 7) Start online exam attempt
create or replace function public.school_start_exam_attempt(p_exam_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare sid uuid; eid uuid; ex school_exams%rowtype; cnt integer; rid uuid; access_ok boolean;
begin
 sid:=public.current_school_student_id();
 if sid is null then raise exception 'Student access required'; end if;

 select * into ex from school_exams where id=p_exam_id;
 if not found or ex.is_published=false then raise exception 'Exam not available'; end if;
 if ex.delivery_mode not in('online','hybrid') then raise exception 'Exam is not online'; end if;
 if ex.opens_at is not null and now()<ex.opens_at then raise exception 'Exam has not opened yet'; end if;
 if ex.closes_at is not null and now()>ex.closes_at then raise exception 'Exam has closed'; end if;

 select id into eid from school_enrollments
 where student_id=sid and class_section_id=ex.class_section_id and status='active'
 limit 1;
 if eid is null then raise exception 'Student not enrolled in this class'; end if;

 select coalesce(a.eligible,true) into access_ok
 from school_exam_access a
 where a.exam_id=ex.id and a.enrollment_id=eid
 order by a.checked_at desc limit 1;
 if access_ok is false then raise exception 'Financial clearance required'; end if;

 select count(*) into cnt from school_exam_attempts where exam_id=ex.id and enrollment_id=eid;
 if cnt>=ex.attempts_allowed then raise exception 'No attempts remaining'; end if;

 insert into school_exam_attempts(exam_id,enrollment_id,attempt_no)
 values(ex.id,eid,cnt+1) returning id into rid;

 return jsonb_build_object('attempt_id',rid,'attempt_no',cnt+1,'duration_minutes',ex.duration_minutes);
end $$;
grant execute on function public.school_start_exam_attempt(uuid) to authenticated;

-- 8) Save answer
create or replace function public.school_save_online_answer(
  p_attempt_id uuid,p_question_id uuid,p_answer text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare a school_exam_attempts%rowtype; e school_enrollments%rowtype; sid uuid; rid uuid;
begin
 sid:=public.current_school_student_id();
 select * into a from school_exam_attempts where id=p_attempt_id and status='in_progress';
 if not found then raise exception 'Attempt not active'; end if;
 select * into e from school_enrollments where id=a.enrollment_id;
 if e.student_id<>sid then raise exception 'Not allowed'; end if;

 insert into school_exam_answers(attempt_id,exam_question_id,answer_text)
 values(p_attempt_id,p_question_id,p_answer)
 on conflict(attempt_id,exam_question_id) do update
 set answer_text=excluded.answer_text,answered_at=now()
 returning id into rid;
 return rid;
end $$;
grant execute on function public.school_save_online_answer(uuid,uuid,text) to authenticated;

-- 9) Submit and auto-grade objective questions
create or replace function public.school_submit_exam_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a school_exam_attempts%rowtype; e school_enrollments%rowtype; sid uuid;
        ans record; auto_total numeric:=0; needs_manual boolean:=false; total numeric:=0;
begin
 sid:=public.current_school_student_id();
 select * into a from school_exam_attempts where id=p_attempt_id and status='in_progress' for update;
 if not found then raise exception 'Attempt not active'; end if;
 select * into e from school_enrollments where id=a.enrollment_id;
 if e.student_id<>sid then raise exception 'Not allowed'; end if;

 for ans in
   select ea.id answer_id,ea.answer_text,q.question_type,q.correct_answer,q.accepted_answers,q.points
   from school_exam_answers ea
   join school_online_exam_questions q on q.id=ea.exam_question_id
   where ea.attempt_id=a.id
 loop
   if ans.question_type in('mcq','true_false') then
     update school_exam_answers
     set is_correct=(lower(trim(coalesce(ans.answer_text,'')))=lower(trim(coalesce(ans.correct_answer,'')))),
         auto_score=case when lower(trim(coalesce(ans.answer_text,'')))=lower(trim(coalesce(ans.correct_answer,''))) then ans.points else 0 end
     where id=ans.answer_id;
   elsif ans.question_type='short_answer' then
     update school_exam_answers
     set is_correct=(
       lower(trim(coalesce(ans.answer_text,'')))=lower(trim(coalesce(ans.correct_answer,'')))
       or exists(
         select 1 from jsonb_array_elements_text(coalesce(ans.accepted_answers,'[]'::jsonb)) x
         where lower(trim(x))=lower(trim(coalesce(ans.answer_text,'')))
       )
     ),
     auto_score=case when (
       lower(trim(coalesce(ans.answer_text,'')))=lower(trim(coalesce(ans.correct_answer,'')))
       or exists(
         select 1 from jsonb_array_elements_text(coalesce(ans.accepted_answers,'[]'::jsonb)) x
         where lower(trim(x))=lower(trim(coalesce(ans.answer_text,'')))
       )
     ) then ans.points else 0 end
     where id=ans.answer_id;
   else
     needs_manual:=true;
   end if;
 end loop;

 select coalesce(sum(auto_score),0),coalesce(sum(auto_score+manual_score),0)
 into auto_total,total from school_exam_answers where attempt_id=a.id;

 update school_exam_attempts
 set submitted_at=now(),auto_score=auto_total,total_score=total,
     status=case when needs_manual then 'needs_review' else 'auto_graded' end,
     updated_at=now()
 where id=a.id;

 -- Push objective score into existing gradebook immediately only when no manual review.
 if not needs_manual then
   insert into school_exam_results(exam_id,enrollment_id,score,status,entered_at)
   values(a.exam_id,a.enrollment_id,total,'present',now())
   on conflict(exam_id,enrollment_id) do update
   set score=excluded.score,status='present',entered_at=now(),updated_at=now();
 end if;

 return jsonb_build_object('auto_score',auto_total,'total_score',total,'needs_manual_review',needs_manual);
end $$;
grant execute on function public.school_submit_exam_attempt(uuid) to authenticated;

-- 10) Manual grading answer
create or replace function public.school_grade_online_answer(
 p_answer_id uuid,p_score numeric,p_feedback text
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare ans record; ex school_exams%rowtype; rid uuid;
begin
 select ea.id,ea.attempt_id,ea.exam_question_id,q.points,a.exam_id
 into ans
 from school_exam_answers ea
 join school_online_exam_questions q on q.id=ea.exam_question_id
 join school_exam_attempts a on a.id=ea.attempt_id
 where ea.id=p_answer_id;
 if not found then raise exception 'Answer not found'; end if;

 select * into ex from school_exams where id=ans.exam_id;
 if not public.is_school_admin() and not public.school_teacher_can_manage(ex.class_section_id,ex.subject_id) then
   raise exception 'Not allowed';
 end if;
 if p_score<0 or p_score>ans.points then raise exception 'Score out of range'; end if;

 update school_exam_answers
 set manual_score=p_score,teacher_feedback=p_feedback,graded_by=auth.uid(),graded_at=now()
 where id=p_answer_id returning id into rid;
 return rid;
end $$;
grant execute on function public.school_grade_online_answer(uuid,numeric,text) to authenticated;

-- 11) Finalize attempt after manual grading
create or replace function public.school_finalize_exam_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a school_exam_attempts%rowtype; ex school_exams%rowtype; total numeric;
begin
 select * into a from school_exam_attempts where id=p_attempt_id;
 if not found then raise exception 'Attempt not found'; end if;
 select * into ex from school_exams where id=a.exam_id;
 if not public.is_school_admin() and not public.school_teacher_can_manage(ex.class_section_id,ex.subject_id) then
   raise exception 'Not allowed';
 end if;

 if exists(
   select 1 from school_exam_answers ea
   join school_online_exam_questions q on q.id=ea.exam_question_id
   where ea.attempt_id=a.id and q.question_type='essay' and ea.graded_at is null
 ) then raise exception 'Essay answers still need grading'; end if;

 select coalesce(sum(auto_score+manual_score),0) into total
 from school_exam_answers where attempt_id=a.id;

 update school_exam_attempts set total_score=total,manual_score=greatest(total-auto_score,0),status='graded',updated_at=now()
 where id=a.id;

 insert into school_exam_results(exam_id,enrollment_id,score,status,entered_by,entered_at)
 values(a.exam_id,a.enrollment_id,total,'present',auth.uid(),now())
 on conflict(exam_id,enrollment_id) do update
 set score=excluded.score,status='present',entered_by=excluded.entered_by,entered_at=now(),updated_at=now();

 return jsonb_build_object('total_score',total);
end $$;
grant execute on function public.school_finalize_exam_attempt(uuid) to authenticated;

-- 12) RLS
alter table public.school_question_bank enable row level security;
alter table public.school_online_exam_questions enable row level security;
alter table public.school_exam_attempts enable row level security;
alter table public.school_exam_answers enable row level security;

do $$
declare t text;
begin
 foreach t in array array['school_question_bank','school_online_exam_questions','school_exam_attempts','school_exam_answers']
 loop
   execute format('drop policy if exists %I on public.%I',t||'_admin_all',t);
   execute format('create policy %I on public.%I for all to authenticated using(public.is_school_admin()) with check(public.is_school_admin())',t||'_admin_all',t);
 end loop;
end $$;

-- Question bank teacher manage own/manageable subject
drop policy if exists school_question_bank_teacher_read on school_question_bank;
create policy school_question_bank_teacher_read on school_question_bank for select to authenticated
using(
  teacher_id in(select id from school_teachers where auth_user_id=auth.uid())
  or public.is_school_admin()
);

-- Student reads only questions for own active attempt
drop policy if exists school_online_exam_questions_student_read on school_online_exam_questions;
create policy school_online_exam_questions_student_read on school_online_exam_questions for select to authenticated
using(
  exists(
    select 1
    from school_exam_attempts a
    join school_enrollments e on e.id=a.enrollment_id
    join school_students s on s.id=e.student_id
    where a.exam_id=school_online_exam_questions.exam_id
      and a.status='in_progress'
      and s.auth_user_id=auth.uid()
  )
);

drop policy if exists school_exam_attempts_student_read on school_exam_attempts;
create policy school_exam_attempts_student_read on school_exam_attempts for select to authenticated
using(
  enrollment_id in(
    select e.id from school_enrollments e join school_students s on s.id=e.student_id
    where s.auth_user_id=auth.uid()
  )
);

drop policy if exists school_exam_answers_student_read on school_exam_answers;
create policy school_exam_answers_student_read on school_exam_answers for select to authenticated
using(
  attempt_id in(
    select a.id from school_exam_attempts a
    join school_enrollments e on e.id=a.enrollment_id
    join school_students s on s.id=e.student_id
    where s.auth_user_id=auth.uid()
  )
);

create or replace function public.school_s9_health()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'question_bank',(select count(*) from school_question_bank),
  'online_exam_questions',(select count(*) from school_online_exam_questions),
  'attempts',(select count(*) from school_exam_attempts),
  'answers',(select count(*) from school_exam_answers),
  'needs_review',(select count(*) from school_exam_attempts where status='needs_review')
 );
$$;
grant execute on function public.school_s9_health() to authenticated;

select public.school_s9_health();
