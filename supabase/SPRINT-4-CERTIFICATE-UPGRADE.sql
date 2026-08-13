-- SPRINT 4 CERTIFICATE UPGRADE
alter table public.certificates
  add column if not exists verification_token uuid default gen_random_uuid(),
  add column if not exists status text not null default 'active',
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id);

update public.certificates set verification_token=gen_random_uuid() where verification_token is null;
create unique index if not exists certificates_verification_token_uq on public.certificates(verification_token);

do $$ begin
 if not exists(select 1 from pg_constraint where conname='certificates_status_check') then
  alter table public.certificates add constraint certificates_status_check check(status in('active','revoked'));
 end if;
end $$;

create or replace function public.verify_certificate_public(p_token text)
returns table(student_name text,course_title text,certificate_number text,issued_at timestamptz,status text)
language sql stable security definer set search_path=public
as $$
 select p.full_name,c.title,cert.certificate_number,cert.issued_at,cert.status
 from public.certificates cert
 join public.profiles p on p.id=cert.user_id
 join public.courses c on c.id=cert.course_id
 where cert.verification_token::text=p_token or cert.verification_code=p_token
 limit 1;
$$;
grant execute on function public.verify_certificate_public(text) to anon,authenticated;

create or replace function public.admin_set_certificate_status(p_certificate_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Admin permission required'; end if;
 if p_status not in('active','revoked') then raise exception 'Invalid status'; end if;
 update public.certificates set status=p_status,
 revoked_at=case when p_status='revoked' then now() else null end,
 revoked_by=case when p_status='revoked' then auth.uid() else null end
 where id=p_certificate_id;
 return found;
end $$;
grant execute on function public.admin_set_certificate_status(uuid,text) to authenticated;
