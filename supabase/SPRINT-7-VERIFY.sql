-- SPRINT 7 VERIFICATION
select 'instructors' as object_name, count(*) as rows from public.instructors
union all
select 'learning_paths', count(*) from public.learning_paths
union all
select 'learning_path_courses', count(*) from public.learning_path_courses
union all
select 'live_sessions', count(*) from public.live_sessions;

select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='courses'
  and column_name='instructor_id';
