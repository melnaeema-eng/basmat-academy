alter table public.academy_lab_catalog drop constraint academy_lab_catalog_track_check;
alter table public.academy_lab_catalog add constraint academy_lab_catalog_track_check check(track in ('ccna','ccnp','claude','ccie'));
