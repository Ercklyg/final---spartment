begin;

-- Retire the optional test classification. Keep every account, room, lease,
-- bill, payment and existing classification-audit entry.
drop trigger if exists rooms_test_guard on public.rooms;
drop trigger if exists profiles_test_guard on public.profiles;
drop trigger if exists leases_test_inheritance on public.leases;
-- Capture the conversion in the existing audit log before retiring its triggers.
update public.rooms set is_test=false where is_test;
update public.profiles set is_test=false where is_test;
drop trigger if exists rooms_test_audit on public.rooms;
drop trigger if exists profiles_test_audit on public.profiles;

alter policy "Guests see available rooms and admins see all rooms" on public.rooms
using (status='available' or public.is_admin());

drop function public.set_test_record(text,uuid,boolean);
drop function public.guard_test_classification();
drop function public.inherit_test_tenancy();
drop function public.audit_test_classification();

-- Replace classification-aware signatures with ordinary directory/billing RPCs.
drop function public.tenant_directory_search_page_v2(text,integer,integer,boolean);
drop function public.tenant_directory_search_page_v3(text,integer,integer,boolean,text);
drop function public.tenant_directory_search_page_v4(text,integer,integer,boolean,text,text);
drop function public.billing_page_v2(date,text,text,text,integer,integer,boolean);

create or replace function public.forecast_payments()
returns table(id uuid,amount numeric,payment_date date,billing_period date)
language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return query select p.id,p.amount,p.payment_date,b.billing_period
 from public.payments p join public.bills b on b.id=p.bill_id
;
end $$;

create or replace function public.analytics_report(p_month date,p_period text default 'Monthly',p_export boolean default false)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cutoff date; step integer; anchor date; result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_period not in ('Monthly','Quarterly','Yearly') then raise exception 'Invalid report period'; end if;
 cutoff:=least((date_trunc('month',p_month)+interval '1 month - 1 day')::date,(now() at time zone 'Asia/Manila')::date);
 step:=case p_period when 'Yearly' then 12 when 'Quarterly' then 3 else 1 end;
 anchor:=date_trunc(case p_period when 'Yearly' then 'year' when 'Quarterly' then 'quarter' else 'month' end,p_month)::date;
 with operational_rooms as materialized (select * from public.rooms),
 operational_leases as materialized (select * from public.leases l ),
 operational_payments as materialized (select p.* from public.payments p join public.bills b on b.id=p.bill_id ),
 operational_tenant_requests as materialized (select tr.* from public.tenant_requests tr join public.profiles pr on pr.id=tr.tenant_id
   left join public.rooms r on r.id=tr.room_id ),
 operational_inquiries as materialized (select i.* from public.inquiries i left join public.rooms r on r.id=i.room_id ),
 facts as materialized (
   select f.*,case when f.room_number is null then 'Unassigned' else f.building_name||' / '||f.room_number end room
   from public.billing_facts(cutoff) f where true
 ), punctual_facts as materialized (
   select f.*,coalesce((select sum(p.amount) from operational_payments p
     where p.bill_id=f.id and p.payment_date<=least(f.due_date,cutoff)),0) paid_by_due
   from facts f
 ), periods as (
   select i,(anchor-make_interval(months=>i*step))::date start,(anchor+make_interval(months=>(1-i)*step))::date finish
   from generate_series(0,5) i
 ), series as (
   select i,jsonb_build_object('label',case p_period when 'Yearly' then to_char(start,'YYYY') when 'Quarterly' then 'Q'||extract(quarter from start)||' '||extract(year from start) else to_char(start,'YYYY-MM') end,
     'value',(select coalesce(sum(amount),0) from operational_payments where payment_date>=start and payment_date<finish and payment_date<=cutoff),
     'billed',(select coalesce(sum(total),0) from facts where billing_period>=start and billing_period<finish)) point
   from periods
 ), forecast as (
   select i,jsonb_build_object('label',to_char(start,'YYYY-MM'),
     'value',(select coalesce(sum(amount),0) from operational_payments where payment_date>=start and payment_date<(start+interval '1 month')::date and payment_date<=cutoff),
     'paymentCount',(select count(*) from operational_payments where payment_date>=start and payment_date<(start+interval '1 month')::date and payment_date<=cutoff),
     'billed',(select coalesce(sum(total),0) from facts where billing_period>=start and billing_period<(start+interval '1 month')::date)) point
   from (select i,(date_trunc('month',p_month)-make_interval(months=>i))::date start from generate_series(0,2) i) m
 ), aging as (
   select 1 as position,'Current'::text as label,coalesce(sum(balance) filter(where balance>0 and due_date>=cutoff),0) balance,coalesce(count(*) filter(where balance>0 and due_date>=cutoff),0) bill_count from facts
   union all select 2,'1-7 days',coalesce(sum(balance) filter(where balance>0 and cutoff-due_date between 1 and 7),0),coalesce(count(*) filter(where balance>0 and cutoff-due_date between 1 and 7),0) from facts
   union all select 3,'8-30 days',coalesce(sum(balance) filter(where balance>0 and cutoff-due_date between 8 and 30),0),coalesce(count(*) filter(where balance>0 and cutoff-due_date between 8 and 30),0) from facts
   union all select 4,'31-60 days',coalesce(sum(balance) filter(where balance>0 and cutoff-due_date between 31 and 60),0),coalesce(count(*) filter(where balance>0 and cutoff-due_date between 31 and 60),0) from facts
   union all select 5,'61+ days',coalesce(sum(balance) filter(where balance>0 and cutoff-due_date>=61),0),coalesce(count(*) filter(where balance>0 and cutoff-due_date>=61),0) from facts
 ), punctuality as (
   select count(*) filter(where due_date<=cutoff) due_bill_count,
     count(*) filter(where due_date<=cutoff and paid_by_due>=total) on_time_bill_count,
     coalesce(100*sum(paid)/nullif(sum(total),0),0) collection_rate
   from punctual_facts
 ), repeat_late as (
   select tenant_id,max(name) name,string_agg(distinct room,', ') room,
     count(*) filter(where due_date between (cutoff-interval '6 months')::date and cutoff and paid_by_due<total) late_bill_count,
     coalesce(sum(balance) filter(where due_date<cutoff),0) overdue_balance
   from punctual_facts
   where tenant_id is not null
   group by tenant_id
   having count(*) filter(where due_date between (cutoff-interval '6 months')::date and cutoff and paid_by_due<total)>=2
 )
 select jsonb_build_object('snapshot',jsonb_build_object('cutoff',cutoff,
   'rows',coalesce((select jsonb_agg(to_jsonb(f) order by f.billing_period,f.id) from facts f where p_export or balance>0),'[]'::jsonb),
   'selected',coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from facts f where to_char(billing_period,'YYYY-MM')=to_char(p_month,'YYYY-MM')),'[]'::jsonb),
   'late',coalesce((select jsonb_agg(to_jsonb(f) order by due_date,id) from facts f where status='Late'),'[]'::jsonb),
   'outstanding',(select coalesce(sum(balance),0) from facts),'overdue',(select coalesce(sum(balance),0) from facts where status='Late'),
   'collected',(select coalesce(sum(amount),0) from operational_payments where payment_date>=date_trunc('month',p_month)::date and payment_date<=cutoff),
   'collectionHealth',jsonb_build_object(
     'aging',coalesce((select jsonb_agg(jsonb_build_object('label',label,'balance',balance,'billCount',bill_count) order by position) from aging),'[]'::jsonb),
     'dueBillCount',(select due_bill_count from punctuality),'onTimeBillCount',(select on_time_bill_count from punctuality),
     'onTimeRate',coalesce((select 100.0*on_time_bill_count/nullif(due_bill_count,0) from punctuality),0),
     'collectionRate',(select collection_rate from punctuality),
     'repeatLatePayers',coalesce((select jsonb_agg(jsonb_build_object('tenantId',tenant_id,'name',name,'room',room,'lateBillCount',late_bill_count,'overdueBalance',overdue_balance) order by late_bill_count desc,overdue_balance desc,name) from (select * from repeat_late order by late_bill_count desc,overdue_balance desc,name limit 10) repeat_late_page),'[]'::jsonb)),
   'inventory',(select jsonb_agg(jsonb_build_object('status',s,'count',(select count(*) from operational_rooms where status::text=s))) from unnest(array['occupied','available','reserved','maintenance']) s),
   'occupancy',(select coalesce(100.0*count(*) filter(where status='occupied')/nullif(count(*),0),0) from operational_rooms),
   'activeTenants',(select count(distinct l.tenant_id) from operational_leases l join public.profiles p on p.id=l.tenant_id where l.status='active' and p.role='tenant'),
   'available',(select count(*) from operational_rooms where status='available'),'vacancyGap',(select coalesce(sum(monthly_rate),0) from operational_rooms where status='available'),
   'openRequests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'subject',subject,'created_at',created_at) order by created_at desc,id) from operational_tenant_requests where status<>'Resolved'),'[]'::jsonb),
   'openInquiries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'created_at',created_at) order by created_at desc,id) from operational_inquiries where status<>'Resolved'),'[]'::jsonb)),
   'series',(select jsonb_agg(point order by i desc) from series),'forecastMonths',(select jsonb_agg(point order by i desc) from forecast),
   'roomCount',(select count(*) from operational_rooms)) into result;
 return result;
end $$;

create or replace function public.tenant_directory_search_page_v2(
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
    from public.tenant_assignments a join public.profiles pr on pr.id=a.id
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

create or replace function public.tenant_directory_search_page_v3(
  p_search text default '',p_offset integer default 0,p_limit integer default 9,p_status text default 'All'
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status is null or p_status not in ('All','Paid','Pending','Overdue') or length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid tenant filters'; end if;
  with filtered as materialized (
    select a.id,a.email,a.full_name,a.phone,a.emergency_name,a.emergency_phone,a.relationship,
      a.room_id,a.monthly_rent,a.move_in,a.lease_end,a.status,a.created_at,
      jsonb_build_object('room_number',r.room_number,'buildings',jsonb_build_object('name',bu.name)) rooms
    from public.tenant_assignments a join public.profiles pr on pr.id=a.id
    left join public.rooms r on r.id=a.room_id
    left join public.buildings bu on bu.id=r.building_id
    where a.status='active' and (p_search='' or strpos(lower(concat_ws(' ',a.full_name,a.email,a.phone,r.room_number::text,bu.name)),lower(p_search))>0)
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

create or replace function public.tenant_directory_search_page_v4(
  p_search text default '',p_offset integer default 0,p_limit integer default 9,p_status text default 'All',p_tenancy_status text default 'All'
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_tenancy_status is null or p_tenancy_status not in ('All','Active','MovedOut') or p_status is null or p_status not in ('All','Paid','Pending','Overdue') or length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid tenant filters'; end if;
  with filtered as materialized (
    select a.id,a.email,a.full_name,a.phone,a.emergency_name,a.emergency_phone,a.relationship,
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
      and (p_tenancy_status='All' or (p_tenancy_status='Active' and a.status='active') or (p_tenancy_status='MovedOut' and a.status='ended')) and (p_search='' or strpos(lower(concat_ws(' ',a.full_name,a.email,a.phone,r.room_number::text,bu.name)),lower(p_search))>0)
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

create or replace function public.billing_page_v2(p_month date,p_type text,p_status text default 'All',p_search text default '',p_offset integer default 0,p_limit integer default 25)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_type not in ('rent','utility') or p_status not in ('All','Paid','Pending','Partially paid','Late')
 or length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid billing filters'; end if;
 with month_rows as materialized (select f.* from public.billing_facts() f where bill_type=p_type
   and billing_period>=date_trunc('month',p_month)::date and billing_period<(date_trunc('month',p_month)+interval '1 month')::date),
 filtered as (select * from month_rows where (p_status='All' or status=p_status)
   and strpos(lower(concat_ws(' ',name,room_number,building_name)),lower(p_search))>0),
 page as (select * from filtered order by billing_period desc,due_date desc,id offset p_offset limit p_limit)
 select jsonb_build_object('bills',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('displayStatus',p.status,
   'payments',coalesce((select jsonb_agg(to_jsonb(pay) order by pay.payment_date,pay.id) from public.payments pay where pay.bill_id=p.id),'[]'::jsonb),
   'leases',jsonb_build_object('tenant_id',p.tenant_id,'profiles',jsonb_build_object('full_name',p.name),'rooms',jsonb_build_object('room_number',p.room_number,'buildings',jsonb_build_object('name',p.building_name)))) order by p.billing_period desc,p.due_date desc,p.id) from page p),'[]'::jsonb),
   'total',(select count(*) from filtered),'periodTotal',(select count(*) from month_rows),'offset',p_offset,'limit',p_limit,
   'totals',(select jsonb_build_object('total',coalesce(sum(total),0),'paid',coalesce(sum(paid),0),'balance',coalesce(sum(balance),0),
   'electricity',coalesce(sum(electricity_amount),0),'water',coalesce(sum(water_amount),0),'overdue',coalesce(sum(balance) filter(where status='Late'),0)) from month_rows)) into result;
 return result;
end $$;

create or replace function public.reporting_months()
returns text[] language plpgsql stable security invoker set search_path='' as $$
declare result text[];
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 select coalesce(array_agg(month order by month),'{}'::text[]) into result from (
   select to_char(billing_period,'YYYY-MM') as month from public.bills b
   where billing_period <= (now() at time zone 'Asia/Manila')::date
   union
   select to_char(payment_date,'YYYY-MM') as month from public.payments p join public.bills b on b.id=p.bill_id
   where payment_date <= (now() at time zone 'Asia/Manila')::date
 ) months;
 return result;
end $$;

create or replace function public.bill_reminder_candidates(p_month date,p_type text,p_audience text)
returns table(bill_id uuid,tenant_id uuid,tenant_name text,room text,balance numeric,cooling_down boolean)
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_type is null or p_type not in ('rent','utility')
 or p_audience is null or p_audience not in ('all_unpaid','overdue','partially_paid') then raise exception 'Invalid reminder scope'; end if;
 return query
 select b.id,l.tenant_id,coalesce(p.full_name,'Tenant'),coalesce(r.room_number,'Unassigned')::text,
 round(b.rent_amount+b.electricity_amount+b.water_amount-paid.amount,2),
 exists(select 1 from public.notifications n where n.tenant_id=l.tenant_id and n.kind='bill'
   and n.title='Payment reminder' and n.created_at>now()-interval '5 minutes'
   and (n.source_id=b.id or n.reminder_bill_ids @> array[b.id]))
 from public.bills b join public.leases l on l.id=b.lease_id
 join public.profiles p on p.id=l.tenant_id left join public.rooms r on r.id=l.room_id
 cross join lateral (select coalesce(sum(pay.amount),0) as amount from public.payments pay where pay.bill_id=b.id) paid
 where (l.status='active' or b.billing_period<=l.lease_end_date)
 and b.bill_type::text=p_type and b.billing_period>=date_trunc('month',p_month)::date
 and b.billing_period<(date_trunc('month',p_month)+interval '1 month')::date
 and b.rent_amount+b.electricity_amount+b.water_amount>paid.amount
 and (p_audience='all_unpaid'
   or (p_audience='overdue' and b.due_date<(now() at time zone 'Asia/Manila')::date)
   or (p_audience='partially_paid' and paid.amount>0));
end $$;

-- No live function or policy needs these columns now. RESTRICT prevents
-- silently removing any unexpected dependent object.
drop function public.is_test_lease(uuid);
alter table public.rooms drop column is_test restrict;
alter table public.profiles drop column is_test restrict;

revoke all on function public.forecast_payments() from public,anon;
grant execute on function public.forecast_payments() to authenticated;
revoke all on function public.analytics_report(date,text,boolean) from public,anon;
grant execute on function public.analytics_report(date,text,boolean) to authenticated;
revoke all on function public.tenant_directory_search_page_v2(text,integer,integer) from public,anon;
grant execute on function public.tenant_directory_search_page_v2(text,integer,integer) to authenticated;
revoke all on function public.tenant_directory_search_page_v3(text,integer,integer,text) from public,anon;
grant execute on function public.tenant_directory_search_page_v3(text,integer,integer,text) to authenticated;
revoke all on function public.tenant_directory_search_page_v4(text,integer,integer,text,text) from public,anon;
grant execute on function public.tenant_directory_search_page_v4(text,integer,integer,text,text) to authenticated;
revoke all on function public.billing_page_v2(date,text,text,text,integer,integer) from public,anon;
grant execute on function public.billing_page_v2(date,text,text,text,integer,integer) to authenticated;
revoke all on function public.reporting_months() from public,anon;
grant execute on function public.reporting_months() to authenticated;
revoke all on function public.bill_reminder_candidates(date,text,text) from public,anon;
grant execute on function public.bill_reminder_candidates(date,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
