begin;

-- A grouped notice still records every covered bill for cooldowns and alerts.
alter table public.notifications add column reminder_bill_ids uuid[] not null default '{}';
create index notification_reminder_bills_idx on public.notifications using gin(reminder_bill_ids);

create table public.bill_reminder_batches (
 id uuid primary key,
 admin_id uuid not null references public.profiles(id),
 billing_month date not null,
 bill_type text not null check(bill_type in ('rent','utility')),
 audience text not null check(audience in ('all_unpaid','overdue','partially_paid')),
 result jsonb,
 created_at timestamptz not null default now()
);
alter table public.bill_reminder_batches enable row level security;
revoke all on public.bill_reminder_batches from public,anon,authenticated;

create function public.bill_reminder_candidates(p_month date,p_type text,p_audience text)
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
 where b.bill_type::text=p_type and b.billing_period>=date_trunc('month',p_month)::date
 and b.billing_period<(date_trunc('month',p_month)+interval '1 month')::date
 and b.rent_amount+b.electricity_amount+b.water_amount>paid.amount
 and (p_audience='all_unpaid'
   or (p_audience='overdue' and b.due_date<(now() at time zone 'Asia/Manila')::date)
   or (p_audience='partially_paid' and paid.amount>0));
end $$;
revoke all on function public.bill_reminder_candidates(date,text,text) from public,anon,authenticated;

create function public.preview_bill_reminders(p_month date,p_type text,p_audience text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 with candidates as materialized (select * from public.bill_reminder_candidates(p_month,p_type,p_audience)),
 recipients as (
   select tenant_id,min(tenant_name) as name,count(*) as bills,sum(balance) as balance
   from candidates where not cooling_down group by tenant_id
 )
 select jsonb_build_object(
  'matchedBills',(select count(*) from candidates),
  'eligibleBills',(select count(*) from candidates where not cooling_down),
  'skippedBills',(select count(*) from candidates where cooling_down),
  'tenantCount',(select count(*) from recipients),
  'balance',(select coalesce(sum(balance),0) from recipients),
  'recipients',coalesce((select jsonb_agg(to_jsonb(sample)) from
    (select name,bills,balance from recipients order by name,tenant_id limit 10) sample),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.preview_bill_reminders(date,text,text) from public,anon;
grant execute on function public.preview_bill_reminders(date,text,text) to authenticated;

create function public.send_bulk_bill_reminders(p_id uuid,p_month date,p_type text,p_audience text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare batch public.bill_reminder_batches; target record; notice uuid;
 sent_tenants integer:=0; sent_bills integer:=0; failed_bills integer:=0;
 skipped_bills integer; matched_bills integer; outcome jsonb; failures jsonb:='[]'::jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_id is null or p_month is null or p_type is null or p_type not in ('rent','utility')
 or p_audience is null or p_audience not in ('all_unpaid','overdue','partially_paid') then raise exception 'Invalid reminder scope'; end if;
 insert into public.bill_reminder_batches(id,admin_id,billing_month,bill_type,audience)
 values(p_id,auth.uid(),date_trunc('month',p_month)::date,p_type,p_audience) on conflict(id) do nothing;
 select * into batch from public.bill_reminder_batches where id=p_id for update;
 if batch.admin_id<>auth.uid() or batch.billing_month<>date_trunc('month',p_month)::date
 or batch.bill_type<>p_type or batch.audience<>p_audience then raise exception 'Reminder operation already used'; end if;
 if batch.result is not null then return batch.result; end if;

 -- Same ordered bill locks as individual reminders/payments, then recheck the
 -- actual balance and cooldown. Never trust preview counts or browser statuses.
 perform b.id from public.bills b where b.bill_type::text=p_type
 and b.billing_period>=date_trunc('month',p_month)::date
 and b.billing_period<(date_trunc('month',p_month)+interval '1 month')::date order by b.id for update;
 select count(*),count(*) filter(where cooling_down) into matched_bills,skipped_bills
 from public.bill_reminder_candidates(p_month,p_type,p_audience);
 for target in
   select tenant_id,min(tenant_name) as name,array_agg(bill_id order by bill_id) as ids,sum(balance) as amount
   from public.bill_reminder_candidates(p_month,p_type,p_audience)
   where not cooling_down group by tenant_id order by tenant_id
 loop
  begin
   insert into public.notifications(tenant_id,title,message,kind,source_id,reminder_bill_ids)
   values(target.tenant_id,'Payment reminder',
    'This is a friendly reminder about your '||cardinality(target.ids)||' unpaid '||p_type||
    ' bill(s) for '||to_char(p_month,'FMMonth YYYY')||' with a total remaining balance of PHP '||
    to_char(target.amount,'FM999,999,999,990.00')||'. Please review Billing for bill details and due dates.',
    'bill',target.ids[1],target.ids) returning id into notice;
   sent_tenants:=sent_tenants+1; sent_bills:=sent_bills+cardinality(target.ids);
  exception when others then
   failed_bills:=failed_bills+cardinality(target.ids);
   failures:=failures||jsonb_build_array(jsonb_build_object('name',target.name,'bills',cardinality(target.ids),'message','Unable to create the reminder. Please retry.'));
  end;
 end loop;
 outcome:=jsonb_build_object('ok',true,'sentTenants',sent_tenants,'sentBills',sent_bills,
   'skippedBills',skipped_bills,'failedBills',failed_bills,'matchedBills',matched_bills,'failures',failures);
 update public.bill_reminder_batches set result=outcome where id=p_id;
 return outcome;
end $$;
revoke all on function public.send_bulk_bill_reminders(uuid,date,text,text) from public,anon;
grant execute on function public.send_bulk_bill_reminders(uuid,date,text,text) to authenticated;

-- Reuse the existing individual operation, including its public return type.
create or replace function public.send_bill_reminder(p_bill uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare target record; total numeric; paid numeric; sent_at timestamptz:=now();
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 perform id from public.bills where id=p_bill for update;
 select b.id,b.bill_type,b.billing_period,b.due_date,l.tenant_id into target
 from public.bills b join public.leases l on l.id=b.lease_id where b.id=p_bill;
 if not found then raise exception 'Bill not found'; end if;
 select round(b.rent_amount+b.electricity_amount+b.water_amount,2),
 coalesce((select sum(p.amount) from public.payments p where p.bill_id=b.id),0)
 into total,paid from public.bills b where b.id=p_bill;
 if paid>=total then raise exception 'This bill is already fully paid'; end if;
 if exists(select 1 from public.notifications n where n.tenant_id=target.tenant_id and n.kind='bill'
 and n.title='Payment reminder' and n.created_at>sent_at-interval '5 minutes'
 and (n.source_id=p_bill or n.reminder_bill_ids @> array[p_bill])) then
 raise exception 'Please wait before sending another reminder for this bill'; end if;
 insert into public.notifications(tenant_id,title,message,kind,source_id,reminder_bill_ids)
 values(target.tenant_id,'Payment reminder','This is a friendly reminder that your '||target.bill_type||
 ' bill for '||to_char(target.billing_period,'FMMonth YYYY')||' has a remaining balance of PHP '||
 to_char(total-paid,'FM999,999,999,990.00')||'. Due date: '||to_char(target.due_date,'Mon DD, YYYY')||
 '. Please review your billing details.','bill',p_bill,array[p_bill]);
 return sent_at;
end $$;

create function public.bill_reminder_times(p_ids uuid[])
returns table(bill_id uuid,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_ids is null or cardinality(p_ids)>1000 then raise exception 'Invalid bill IDs'; end if;
 return query select requested.id,max(n.created_at) from unnest(p_ids) requested(id)
 join public.notifications n on (n.source_id=requested.id or n.reminder_bill_ids @> array[requested.id])
 where n.kind='bill' and n.title='Payment reminder' group by requested.id;
end $$;
revoke all on function public.bill_reminder_times(uuid[]) from public,anon;
grant execute on function public.bill_reminder_times(uuid[]) to authenticated;

commit;
