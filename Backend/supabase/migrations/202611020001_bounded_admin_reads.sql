-- Keep growing admin lists bounded and perform filtering beside the data.
create index if not exists tenant_requests_kind_created_idx
  on public.tenant_requests(kind,created_at desc,id);
create index if not exists inquiries_created_idx
  on public.inquiries(created_at desc,id);

create or replace function public.tenant_directory_search_page(
  p_search text default '',p_offset integer default 0,p_limit integer default 30
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid tenant filters'; end if;
  with filtered as materialized (
    select a.id,a.email,a.full_name,a.phone,a.emergency_name,a.emergency_phone,a.relationship,
      a.room_id,a.monthly_rent,a.move_in,a.lease_end,a.status,a.created_at,
      jsonb_build_object('room_number',r.room_number,'buildings',jsonb_build_object('name',bu.name)) rooms
    from public.tenant_assignments a
    left join public.rooms r on r.id=a.room_id
    left join public.buildings bu on bu.id=r.building_id
    where a.status='active' and (p_search='' or strpos(lower(concat_ws(' ',a.full_name,a.email,a.phone,r.room_number::text)),lower(p_search))>0)
  ), page as (
    select * from filtered order by created_at desc,id offset p_offset limit p_limit
  ), balances as (
    select f.tenant_id,count(*) count,sum(f.balance) balance,
      coalesce(sum(f.balance) filter(where f.status='Late'),0) overdue,
      bool_or(f.balance>0 and f.paid>0) partial
    from public.billing_facts() f where f.tenant_id in(select id from page) group by f.tenant_id
  )
  select jsonb_build_object(
    'data',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('billing',jsonb_build_object(
      'status',case when b.count is null then 'No bills' when b.balance=0 then 'Paid' when b.overdue>0 then 'Late' when b.partial then 'Partially paid' else 'Pending' end,
      'billCount',coalesce(b.count,0),'balance',coalesce(b.balance,0),'overdue',coalesce(b.overdue,0))) order by p.created_at desc,p.id)
      from page p left join balances b on b.tenant_id=p.id),'[]'::jsonb),
    'total',(select count(*) from filtered),'offset',p_offset,'limit',p_limit
  ) into result;
  return result;
end $$;

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
    select i.id,i.full_name,i.email,i.phone,i.preferred_room,i.move_in_date,i.message,i.status,i.created_at
    from public.inquiries i where i.id in(select id from page where source='inquiry')
  )
  select jsonb_build_object(
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id) from request_rows r),'[]'::jsonb),
    'inquiries',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc,i.id) from inquiry_rows i),'[]'::jsonb),
    'total',(select count(*) from combined),'offset',p_offset,'limit',p_limit
  ) into result;
  return result;
end $$;

revoke all on function public.tenant_directory_search_page(text,integer,integer),
  public.request_workspace_page(text,integer,integer) from public,anon;
grant execute on function public.tenant_directory_search_page(text,integer,integer),
  public.request_workspace_page(text,integer,integer) to authenticated;
