begin;

create or replace function public.update_login_attempt(p_account_hash text,p_ip_hash text,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item record; entry public.login_attempt_limits; allowed boolean:=true; retry integer:=0;
begin
 if p_account_hash is null or p_ip_hash is null or p_account_hash=p_ip_hash
 or p_account_hash !~ '^[a-f0-9]{64}$' or p_ip_hash !~ '^[a-f0-9]{64}$'
 or p_action not in ('check','failure','success') then raise exception 'Invalid login limit input'; end if;
 delete from public.login_attempt_limits where expires_at<=now();
 if p_action='success' then
   delete from public.login_attempt_limits where key_hash=p_account_hash;
   return jsonb_build_object('allowed',true,'retryAfter',1);
 end if;
 for item in select * from (values(p_account_hash,5),(p_ip_hash,30)) as limits(key,maximum) order by key loop
   if p_action='failure' then
     insert into public.login_attempt_limits(key_hash,attempts,expires_at) values(item.key,1,now()+interval '15 minutes')
     on conflict(key_hash) do update set attempts=least(public.login_attempt_limits.attempts+1,item.maximum)
     returning * into entry;
   else
     select * into entry from public.login_attempt_limits where key_hash=item.key;
   end if;
   if p_action='check' and entry is not null and entry.attempts>=item.maximum then
     allowed:=false;retry:=greatest(retry,ceil(extract(epoch from entry.expires_at-now()))::integer);
   end if;
   entry:=null;
 end loop;
 return jsonb_build_object('allowed',allowed,'retryAfter',greatest(retry,1));
end $$;

revoke all on function public.update_login_attempt(text,text,text) from public,anon,authenticated;
grant execute on function public.update_login_attempt(text,text,text) to service_role;

commit;
