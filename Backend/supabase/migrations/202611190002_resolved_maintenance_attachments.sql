begin;

create or replace function public.register_maintenance_attachment(p_id uuid,p_request uuid,p_path text,p_name text,p_type text,p_size integer)
returns public.maintenance_attachments language plpgsql security definer set search_path='' as $$
declare result public.maintenance_attachments; request_status text;
begin
 if auth.uid() is null then raise exception 'Sign in to continue'; end if;
 -- Serialize registration with request status changes. An upload started on an
 -- older page cannot register an attachment after the request is resolved.
 select r.status into request_status from public.tenant_requests r
 where r.id=p_request and r.kind='maintenance' and (r.tenant_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Maintenance request not found'; end if;
 if request_status='Resolved' then
   raise exception 'This maintenance request has been resolved. New attachments are no longer accepted.';
 end if;
 if (select count(*) from public.maintenance_attachments where request_id=p_request)>=5 then raise exception 'A maintenance request can have up to 5 attachments'; end if;
 insert into public.maintenance_attachments(id,request_id,storage_path,original_name,mime_type,size_bytes,uploaded_by)
 values(p_id,p_request,p_path,trim(p_name),p_type,p_size,auth.uid()) returning * into result;
 return result;
end $$;

drop policy "Request participants upload maintenance files" on storage.objects;
create policy "Request participants upload maintenance files" on storage.objects for insert to authenticated with check(bucket_id='maintenance-attachments' and exists(
 select 1 from public.tenant_requests r where r.id=(storage.foldername(name))[1]::uuid and r.kind='maintenance'
 and r.status<>'Resolved' and (r.tenant_id=auth.uid() or public.is_admin())
));

-- Existing read and cleanup policies remain available after resolution.
commit;
