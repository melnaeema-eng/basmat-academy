alter table public.academy_lab_content add column if not exists student_pdf_base64 text;
comment on column public.academy_lab_content.student_pdf_base64 is 'Private student PDF governed by the same content access RLS.';
