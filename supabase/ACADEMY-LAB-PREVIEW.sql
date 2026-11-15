alter table public.academy_lab_content add column if not exists student_pdf_pages jsonb;
comment on column public.academy_lab_content.student_pdf_pages is 'Rendered PDF page previews; original PDF bytes are never needed by the student viewer.';

revoke select on public.academy_lab_content from anon,authenticated;
grant select(lab_id,student_html,updated_at,student_pdf_pages) on public.academy_lab_content to anon,authenticated;
