begin;
alter table public.maintenance_attachments alter column uploaded_by drop not null;
alter table public.maintenance_attachments drop constraint maintenance_attachments_uploaded_by_fkey;
alter table public.maintenance_attachments add constraint maintenance_attachments_uploaded_by_fkey foreign key(uploaded_by) references public.profiles(id) on delete set null;
commit;
