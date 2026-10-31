-- Admin-triggered in-app reminders for a specific unpaid bill.
create function public.send_bill_reminder(p_bill uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  total numeric;
  paid numeric;
  sent_at timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select b.id,b.bill_type,b.billing_period,b.due_date,l.tenant_id
    into target
    from public.bills b
    join public.leases l on l.id=b.lease_id
    where b.id=p_bill
    for share of b,l;
  if not found then raise exception 'Bill not found'; end if;

  select round(b.rent_amount+b.electricity_amount+b.water_amount,2),
    coalesce((select round(sum(p.amount),2) from public.payments p where p.bill_id=b.id),0)
    into total,paid from public.bills b where b.id=p_bill;
  if paid>=total then raise exception 'This bill is already fully paid'; end if;

  if exists(select 1 from public.notifications n where n.tenant_id=target.tenant_id
    and n.kind='bill' and n.title='Payment reminder' and n.source_id=p_bill
    and n.created_at>sent_at-interval '5 minutes') then
    raise exception 'Please wait before sending another reminder for this bill';
  end if;

  insert into public.notifications(tenant_id,title,message,kind,source_id)
  values(target.tenant_id,'Payment reminder',
    'This is a friendly reminder that your '||target.bill_type||' bill for '||to_char(target.billing_period,'FMMonth YYYY')||
    ' has a remaining balance of '||to_char(total-paid,'FM999,999,999,990.00')||'. It was due on '||to_char(target.due_date,'Mon DD, YYYY')||'. Please review your billing details.',
    'bill',p_bill);
  return sent_at;
end;
$$;

revoke all on function public.send_bill_reminder(uuid) from public,anon;
grant execute on function public.send_bill_reminder(uuid) to authenticated;
