-- SPRINT 4 verification queries
select 'profiles fields' as check_name,
       count(*) filter (where column_name in ('phone','city','bio','avatar_url')) as found_fields
from information_schema.columns
where table_schema='public' and table_name='profiles';

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('exams','exam_questions','exam_attempts','certificates')
order by table_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('get_exam_for_student','submit_exam_attempt','issue_certificate_if_eligible')
order by routine_name;

select id,name,public
from storage.buckets
where id='profile-avatars';
