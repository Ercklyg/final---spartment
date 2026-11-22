begin;

alter table public.inquiries
  add column inquiry_type text not null default 'room',
  add column subject text,
  alter column email drop not null;

alter table public.inquiries add constraint inquiries_message_details_check check (
  inquiry_type in ('room','general')
  and length(trim(full_name)) between 1 and 160
  and (email is null or (length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
  and length(coalesce(phone,''))<=40
  and length(coalesce(message,''))<=4000
  and case when inquiry_type='room' then email is not null and subject is null
    else subject is not null and length(trim(subject)) between 1 and 160
      and message is not null and length(trim(message)) between 1 and 4000
      and (email is not null or coalesce(phone,'') ~ '^[0-9]{1,11}$')
      and (phone is null or phone ~ '^[0-9]{1,11}$')
      and room_id is null and preferred_room is null and move_in_date is null
    end
);

drop policy "Anyone can submit an inquiry" on public.inquiries;
create policy "Anyone can submit an inquiry" on public.inquiries for insert to anon,authenticated
with check (
  status='New'
  and length(trim(full_name)) between 1 and 160
  and (move_in_date is null or move_in_date >= (now() at time zone 'Asia/Manila')::date)
);

-- Contact and message validation is enforced by the table constraint for all roles.
-- Existing administrator-only read and status-update policies remain in force.

create or replace function public.request_workspace_page(
  p_filter text default 'All',p_offset integer default 0,p_limit integer default 20
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_filter not in ('All','Maintenance','Other','Inquiry') or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid request filters'; end if;
  with combined as materialized (
    select 'request'::text source,id,created_at from public.tenant_requests
      where p_filter='All' or lower(kind::text)=lower(p_filter)
    union all
    select 'inquiry'::text source,id,created_at from public.inquiries
      where p_filter in ('All','Inquiry')
  ), page as materialized (
    select * from combined order by created_at desc,id offset p_offset limit p_limit
  ), request_rows as (
    select tr.id,tr.kind,tr.subject,tr.message,tr.priority,tr.status,tr.admin_note,tr.created_at,tr.updated_at,
      jsonb_build_object('full_name',pr.full_name) profiles,
      case when r.id is null then null else jsonb_build_object('room_number',r.room_number,'buildings',jsonb_build_object('name',bu.name)) end rooms,
      coalesce((select jsonb_agg(jsonb_build_object('id',ma.id,'original_name',ma.original_name,'mime_type',ma.mime_type,
        'size_bytes',ma.size_bytes,'created_at',ma.created_at,'uploaded_by',ma.uploaded_by) order by ma.created_at,ma.id)
        from public.maintenance_attachments ma where ma.request_id=tr.id),'[]'::jsonb) maintenance_attachments
    from public.tenant_requests tr
    left join public.profiles pr on pr.id=tr.tenant_id
    left join public.rooms r on r.id=tr.room_id
    left join public.buildings bu on bu.id=r.building_id
    where tr.id in(select id from page where source='request')
  ), inquiry_rows as (
    select i.id,i.inquiry_type,i.subject,i.full_name,i.email,i.phone,i.preferred_room,i.move_in_date,i.message,i.status,i.created_at
    from public.inquiries i where i.id in(select id from page where source='inquiry')
  )
  select jsonb_build_object(
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id) from request_rows r),'[]'::jsonb),
    'inquiries',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc,i.id) from inquiry_rows i),'[]'::jsonb),
    'total',(select count(*) from combined),'offset',p_offset,'limit',p_limit
  ) into result;
  return result;
end $$;

revoke all on function public.request_workspace_page(text,integer,integer) from public,anon;
grant execute on function public.request_workspace_page(text,integer,integer) to authenticated;

commit;
