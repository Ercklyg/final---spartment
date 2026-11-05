begin;

-- Discover actual financial reporting months without downloading full tables.
create function public.reporting_months()
returns text[] language plpgsql stable security invoker set search_path='' as $$
declare result text[];
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 select coalesce(array_agg(month order by month),'{}'::text[]) into result from (
   select to_char(billing_period,'YYYY-MM') as month from public.bills
   where billing_period <= (now() at time zone 'Asia/Manila')::date
   union
   select to_char(payment_date,'YYYY-MM') as month from public.payments
   where payment_date <= (now() at time zone 'Asia/Manila')::date
 ) months;
 return result;
end $$;
revoke all on function public.reporting_months() from public,anon;
grant execute on function public.reporting_months() to authenticated;

commit;
