-- Preserve notification history and financial confirmations after move-out.
-- New announcements and new bills already require an active tenancy.
begin;

create or replace function public.edit_announcement(p_id uuid, p_title text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare announcement public.announcements;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_title is null or p_message is null or length(btrim(p_title)) not between 1 and 150
    or length(btrim(p_message)) not between 1 and 5000
    or p_title !~ '[^[:space:]]' or p_message !~ '[^[:space:]]' then
    raise exception 'Invalid announcement text' using errcode = '22023';
  end if;
  select * into announcement from public.announcements where id = p_id for update;
  if not found then raise exception 'Announcement not found' using errcode = 'P0002'; end if;
  if announcement.title = btrim(p_title) and announcement.message = btrim(p_message) then
    return to_jsonb(announcement);
  end if;
  update public.announcements set title = btrim(p_title), message = btrim(p_message), updated_at = now()
    where id = p_id returning * into announcement;
  update public.notifications set title = announcement.title, message = announcement.message,
    is_read = false, seen_at = null, acknowledged_at = null
    where kind = 'announcement' and source_id = p_id
      and exists(select 1 from public.tenant_assignments a where a.id=tenant_id and a.status='active');
  return to_jsonb(announcement);
end $$;

create or replace function public.notify_tenant_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; heading text; body text; event_kind text;
begin
  if TG_TABLE_NAME='bills' then
    select tenant_id into recipient from public.leases where id=new.lease_id;
    heading := 'New '||new.bill_type||' bill';
    body := 'Your '||new.bill_type||' bill for '||to_char(new.billing_period,'YYYY-MM')||' is available. Due '||new.due_date||'.';
    event_kind := 'bill';
  elsif TG_TABLE_NAME='payments' then
    select l.tenant_id into recipient from public.bills b join public.leases l on l.id=b.lease_id where b.id=new.bill_id;
    heading := 'Payment recorded';
    body := 'A payment of PHP '||to_char(new.amount,'FM999999999990.00')||' dated '||new.payment_date||' has been recorded.';
    event_kind := 'payment';
  else
    if new.status is not distinct from old.status and new.admin_note is not distinct from old.admin_note then return new; end if;
    -- Send the final resolution, then stop routine edits after closure.
    if old.status='Resolved' and new.status='Resolved' and not exists(
      select 1 from public.tenant_assignments a where a.id=new.tenant_id and a.status='active'
    ) then return new; end if;
    recipient := new.tenant_id;
    heading := 'Request update: '||new.subject;
    body := 'Status: '||new.status||case when new.admin_note<>'' then '. '||new.admin_note else '' end;
    event_kind := 'request';
  end if;
  insert into public.notifications(tenant_id,title,message,kind,source_id)
  values(recipient,heading,body,event_kind,new.id);
  return new;
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
 and not public.is_test_lease(b.lease_id) and b.bill_type::text=p_type and b.billing_period>=date_trunc('month',p_month)::date
 and b.billing_period<(date_trunc('month',p_month)+interval '1 month')::date
 and b.rent_amount+b.electricity_amount+b.water_amount>paid.amount
 and (p_audience='all_unpaid'
   or (p_audience='overdue' and b.due_date<(now() at time zone 'Asia/Manila')::date)
   or (p_audience='partially_paid' and paid.amount>0));
end $$;

create or replace function public.send_bill_reminder(p_bill uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare target record; total numeric; paid numeric; sent_at timestamptz:=now();
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 perform id from public.bills where id=p_bill for update;
 select b.id,b.bill_type,b.billing_period,b.due_date,l.tenant_id,l.status as lease_status,l.lease_end_date into target
 from public.bills b join public.leases l on l.id=b.lease_id where b.id=p_bill;
 if not found then raise exception 'Bill not found'; end if;
 if target.lease_status<>'active' and (target.lease_end_date is null or target.billing_period>target.lease_end_date) then
   raise exception 'Cannot send a reminder for a billing period after the tenancy ended';
 end if;
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


notify pgrst, 'reload schema';
commit;
