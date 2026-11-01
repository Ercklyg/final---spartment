begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('maintenance-attachments','maintenance-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table public.maintenance_attachments (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.tenant_requests(id) on delete cascade,
 storage_path text not null unique check(length(storage_path) between 3 and 300), original_name text not null check(length(trim(original_name)) between 1 and 180),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
 size_bytes integer not null check(size_bytes between 1 and 10485760), uploaded_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index maintenance_attachments_request on public.maintenance_attachments(request_id,created_at,id);
alter table public.maintenance_attachments enable row level security;
revoke all on public.maintenance_attachments from public,anon,authenticated;
grant select on public.maintenance_attachments to authenticated;
grant all on public.maintenance_attachments to service_role;
create policy "Request participants read maintenance attachments" on public.maintenance_attachments for select to authenticated using(exists(
 select 1 from public.tenant_requests r where r.id=request_id and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin())
));

create or replace function public.register_maintenance_attachment(p_id uuid,p_request uuid,p_path text,p_name text,p_type text,p_size integer)
returns public.maintenance_attachments language plpgsql security definer set search_path='' as $$
declare result public.maintenance_attachments;
begin
 if auth.uid() is null then raise exception 'Sign in to continue'; end if;
 perform 1 from public.tenant_requests r where r.id=p_request and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Maintenance request not found'; end if;
 if (select count(*) from public.maintenance_attachments where request_id=p_request)>=5 then raise exception 'A maintenance request can have up to 5 attachments'; end if;
 insert into public.maintenance_attachments(id,request_id,storage_path,original_name,mime_type,size_bytes,uploaded_by)
 values(p_id,p_request,p_path,trim(p_name),p_type,p_size,auth.uid()) returning * into result;
 return result;
end $$;
revoke all on function public.register_maintenance_attachment(uuid,uuid,text,text,text,integer) from public,anon;
grant execute on function public.register_maintenance_attachment(uuid,uuid,text,text,text,integer) to authenticated,service_role;

create policy "Request participants upload maintenance files" on storage.objects for insert to authenticated with check(bucket_id='maintenance-attachments' and exists(
 select 1 from public.tenant_requests r where r.id=(storage.foldername(name))[1]::uuid and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin())
));
create policy "Request participants read maintenance files" on storage.objects for select to authenticated using(bucket_id='maintenance-attachments' and exists(
 select 1 from public.tenant_requests r where r.id=(storage.foldername(name))[1]::uuid and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin())
));
create policy "Request participants clean maintenance files" on storage.objects for delete to authenticated using(bucket_id='maintenance-attachments' and exists(
 select 1 from public.tenant_requests r where r.id=(storage.foldername(name))[1]::uuid and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin())
));
commit;
