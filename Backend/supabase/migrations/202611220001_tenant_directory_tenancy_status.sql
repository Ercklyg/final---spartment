-- Include archived tenants while keeping tenancy and payment filters independent.
begin;
create or replace function public.tenant_directory_search_page_v4(
  p_search text default '',p_offset integer default 0,p_limit integer default 9,p_include_test boolean default false,p_status text default 'All',p_tenancy_status text default 'All'
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_tenancy_status is null or p_tenancy_status not in ('All','Active','MovedOut') or p_status is null or p_status not in ('All','Paid','Pending','Overdue') or length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid tenant filters'; end if;
  with filtered as materialized (
    select a.id,a.email,a.full_name,a.phone,a.emergency_name,a.emergency_phone,a.relationship,
      (pr.is_test or coalesce(r.is_test,false)) is_test,pr.is_test test_account,coalesce(r.is_test,false) room_is_test,
      a.room_id,a.monthly_rent,a.move_in,a.lease_end,a.status,a.created_at,
      case when a.status='ended' then coalesce(a.lease_end,previous.lease_end_date) end move_out_date,
      jsonb_build_object('room_number',r.room_number,'buildings',jsonb_build_object('name',bu.name)) rooms
    from public.tenant_assignments a join public.profiles pr on pr.id=a.id
    left join lateral (
      select l.room_id,l.lease_end_date from public.leases l
      where a.status='ended' and l.tenant_id=a.id and l.status='ended'
      order by l.lease_end_date desc nulls last,l.move_in_date desc,l.created_at desc,l.id desc limit 1
    ) previous on true
    left join public.rooms r on r.id=case when a.status='active' then a.room_id else previous.room_id end
    left join public.buildings bu on bu.id=r.building_id
    where a.status in ('active','ended')
      and (p_tenancy_status='All' or (p_tenancy_status='Active' and a.status='active') or (p_tenancy_status='MovedOut' and a.status='ended')) and (p_include_test or (not pr.is_test and not coalesce(r.is_test,false))) and (p_search='' or strpos(lower(concat_ws(' ',a.full_name,a.email,a.phone,r.room_number::text,bu.name)),lower(p_search))>0)
  ), balances as (
    select f.tenant_id,count(*) count,sum(f.balance) balance,
      coalesce(sum(f.balance) filter(where f.status='Late'),0) overdue,
      bool_or(f.balance>0 and f.paid>0) partial
    from public.billing_facts() f where f.tenant_id in(select id from filtered) group by f.tenant_id
  ), matching as (
    select f.* from filtered f left join balances b on b.tenant_id=f.id
    where p_status='All'
      or (p_status='Paid' and b.count>0 and b.balance=0)
      or (p_status='Pending' and b.balance>0 and b.overdue=0)
      or (p_status='Overdue' and b.overdue>0)
  ), page as (
    select * from matching order by created_at desc,id offset p_offset limit p_limit
  )
  select jsonb_build_object(
    'data',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('billing',jsonb_build_object(
      'status',case when b.count is null then 'No bills' when b.balance=0 then 'Paid' when b.overdue>0 then 'Late' when b.partial then 'Partially paid' else 'Pending' end,
      'billCount',coalesce(b.count,0),'balance',coalesce(b.balance,0),'overdue',coalesce(b.overdue,0))) order by p.created_at desc,p.id)
      from page p left join balances b on b.tenant_id=p.id),'[]'::jsonb),
    'total',(select count(*) from matching),'offset',p_offset,'limit',p_limit
  ) into result;
  return result;
end $$;

revoke all on function public.tenant_directory_search_page_v4(text,integer,integer,boolean,text,text) from public,anon;
grant execute on function public.tenant_directory_search_page_v4(text,integer,integer,boolean,text,text) to authenticated;


notify pgrst, 'reload schema';
commit;
