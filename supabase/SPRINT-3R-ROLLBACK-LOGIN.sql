-- SPRINT 3R emergency rollback for profiles LOGIN only.
-- Use only if login reports a profiles policy error after SPRINT-3R.sql.
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='profiles'
  loop execute format('drop policy if exists %I on public.profiles',r.policyname); end loop;
end $$;
create policy "profiles_emergency_self_read"
on public.profiles for select to authenticated using(id=auth.uid());
create policy "profiles_emergency_self_update"
on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
