create table public.saved_ai_recommendations (
  admin_id uuid not null references public.profiles(id) on delete cascade,
  report_month date not null check (extract(day from report_month) = 1),
  period text not null check (period in ('Monthly','Quarterly','Yearly')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 4),
  generated_at timestamptz,
  reporting_cutoff date,
  last_failure text check (last_failure in ('quota','busy','unavailable')),
  failed_at timestamptz,
  last_attempt_at timestamptz not null,
  primary key (admin_id, report_month, period),
  check ((generated_at is null and jsonb_array_length(items) = 0) or (generated_at is not null and jsonb_array_length(items) > 0)),
  check ((last_failure is null) = (failed_at is null))
);
alter table public.saved_ai_recommendations enable row level security;
revoke all on public.saved_ai_recommendations from public, anon, authenticated;
grant select on public.saved_ai_recommendations to authenticated;
grant all on public.saved_ai_recommendations to service_role;
create policy saved_ai_recommendations_owner_read on public.saved_ai_recommendations for select to authenticated
  using (public.is_admin() and admin_id = auth.uid());

create function public.save_ai_recommendations(p_month date,p_period text,p_items jsonb,p_cutoff date,p_started_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.saved_ai_recommendations; item jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_period is null or p_period not in ('Monthly','Quarterly','Yearly')
    or p_cutoff is null or p_started_at is null then raise exception 'Invalid recommendation scope' using errcode='22023'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid recommendations' using errcode='22023'; end if;
  if jsonb_array_length(p_items) not between 1 and 4 then raise exception 'Invalid recommendations' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'title') is distinct from 'string'
      or jsonb_typeof(item->'text') is distinct from 'string'
      or coalesce(length(btrim(item->>'title')),0) not between 1 and 60
      or coalesce(length(btrim(item->>'text')),0) not between 1 and 140
      or item->>'category' is null or item->>'category' not in ('warning','opportunity','attention','insight')
      or item->>'page' is null or item->>'page' not in ('Billing','Rooms','Tenants','Customer Requests') then
      raise exception 'Invalid recommendations' using errcode='22023';
    end if;
  end loop;
  insert into public.saved_ai_recommendations(admin_id,report_month,period,items,generated_at,reporting_cutoff,last_attempt_at)
    values(auth.uid(),p_month,p_period,p_items,clock_timestamp(),p_cutoff,p_started_at)
  on conflict(admin_id,report_month,period) do update set items=excluded.items,generated_at=excluded.generated_at,
    reporting_cutoff=excluded.reporting_cutoff,last_failure=null,failed_at=null,last_attempt_at=excluded.last_attempt_at
    where public.saved_ai_recommendations.last_attempt_at <= excluded.last_attempt_at
  returning * into result;
  if not found then select * into result from public.saved_ai_recommendations where admin_id=auth.uid() and report_month=p_month and period=p_period; end if;
  return to_jsonb(result);
end $$;

create function public.record_ai_recommendation_failure(p_month date,p_period text,p_reason text,p_started_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.saved_ai_recommendations;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_period is null or p_period not in ('Monthly','Quarterly','Yearly')
    or p_reason is null or p_reason not in ('quota','busy','unavailable') or p_started_at is null then
    raise exception 'Invalid recommendation failure' using errcode='22023';
  end if;
  insert into public.saved_ai_recommendations(admin_id,report_month,period,last_failure,failed_at,last_attempt_at)
    values(auth.uid(),p_month,p_period,p_reason,clock_timestamp(),p_started_at)
  on conflict(admin_id,report_month,period) do update set last_failure=excluded.last_failure,
    failed_at=excluded.failed_at,last_attempt_at=excluded.last_attempt_at
    where public.saved_ai_recommendations.last_attempt_at <= excluded.last_attempt_at
  returning * into result;
  if not found then select * into result from public.saved_ai_recommendations where admin_id=auth.uid() and report_month=p_month and period=p_period; end if;
  return to_jsonb(result);
end $$;

revoke all on function public.save_ai_recommendations(date,text,jsonb,date,timestamptz) from public,anon;
revoke all on function public.record_ai_recommendation_failure(date,text,text,timestamptz) from public,anon;
grant execute on function public.save_ai_recommendations(date,text,jsonb,date,timestamptz) to authenticated;
grant execute on function public.record_ai_recommendation_failure(date,text,text,timestamptz) to authenticated;
