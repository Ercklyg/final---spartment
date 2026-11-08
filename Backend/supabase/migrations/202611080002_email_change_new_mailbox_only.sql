-- Verify only the NEW mailbox. Existing approval requests must restart.
update public.tenant_email_changes set stage='otp',otp_hash=null,expires_at=now()
where stage='approval';
alter table public.tenant_email_changes drop column approval_hash;
alter table public.tenant_email_changes drop constraint tenant_email_changes_stage_check;
alter table public.tenant_email_changes add constraint tenant_email_changes_stage_check
 check(stage in ('otp','ready','complete'));

-- Keep the legacy p_approval argument for rolling deployments; it is ignored.
create or replace function public.tenant_email_change(p_action text,p_user uuid default null,p_email text default null,
 p_approval text default null,p_otp text default null,p_ip text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.tenant_email_changes; current_email text; k text; email_key text; lim public.tenant_email_send_limits;
begin
 if p_action not in ('start','resend','status','verify') or p_action is null then
   return jsonb_build_object('error','Invalid email change action.','status',400);
 end if;
 if p_user is null then return jsonb_build_object('error','Sign in to continue.','status',401); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,8108));
 select lower(email) into current_email from auth.users where id=p_user;
 if not exists(select 1 from public.profiles where id=p_user and role='tenant') then
   return jsonb_build_object('error','A tenant account is required.','status',403);
 end if;
 select * into r from public.tenant_email_changes where user_id=p_user for update;
 if p_action='status' then
   return jsonb_build_object('stage',case when r.expires_at<=now() and r.stage<>'complete' then 'expired' else coalesce(r.stage,'none') end,
    'newEmail',r.new_email,'expiresAt',r.expires_at,'resendAt',r.sent_at+interval '60 seconds');
 end if;
 if r.completed_at>now()-interval '24 hours' then
   return jsonb_build_object('error','You can change your email once every 24 hours.','status',429);
 end if;
 if p_action in ('start','resend') then
   if p_action='resend' and (r.user_id is null or r.stage not in ('otp','ready') or r.expires_at<=now() or r.old_email<>current_email) then
     return jsonb_build_object('error','Start a new email change request.','status',400);
   end if;
   if r.sent_at>now()-interval '60 seconds' then
     return jsonb_build_object('error','Wait 60 seconds before requesting another email.','status',429);
   end if;
   p_email:=case when p_action='start' then lower(trim(p_email)) else r.new_email end;
   if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
     return jsonb_build_object('error','Enter a valid email address.','status',400);
   end if;
   if p_email=current_email then return jsonb_build_object('error','This is already your current email.','status',400); end if;
   if exists(select 1 from auth.users where lower(email)=p_email and id<>p_user)
     or exists(select 1 from public.tenant_assignments where lower(email)=p_email and id<>p_user) then
     return jsonb_build_object('error','This email cannot be used.','status',400);
   end if;
   email_key:=encode(sha256(convert_to(p_email,'UTF8')),'hex');
   if p_ip is null or p_ip !~ '^[a-f0-9]{64}$' or p_otp is null or p_otp !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request hashes'; end if;
   delete from public.tenant_email_send_limits where expires_at<=now();
   for k in select v from unnest(array['account:'||p_user::text,'email:'||email_key,'ip:'||p_ip]) v order by v loop
     perform pg_advisory_xact_lock(hashtextextended(k,8109));
     select * into lim from public.tenant_email_send_limits where key_hash=k;
     if lim.sends >= (case when k like 'ip:%' then 20 else 5 end) then
       return jsonb_build_object('error','Too many verification emails. Try again in an hour.','status',429);
     end if;
   end loop;
   for k in select v from unnest(array['account:'||p_user::text,'email:'||email_key,'ip:'||p_ip]) v order by v loop
     insert into public.tenant_email_send_limits values(k,1,now()+interval '1 hour')
       on conflict(key_hash) do update set sends=public.tenant_email_send_limits.sends+1;
   end loop;
   if p_action='start' then
     insert into public.tenant_email_changes(user_id,old_email,new_email,otp_hash,stage,expires_at)
       values(p_user,current_email,p_email,p_otp,'otp',now()+interval '10 minutes')
       on conflict(user_id) do update set old_email=excluded.old_email,new_email=excluded.new_email,
       otp_hash=excluded.otp_hash,stage='otp',expires_at=excluded.expires_at,sent_at=now(),attempts=0;
   else
     update public.tenant_email_changes set stage='otp',otp_hash=p_otp,expires_at=now()+interval '10 minutes',sent_at=now(),attempts=0 where user_id=p_user;
   end if;
   select * into r from public.tenant_email_changes where user_id=p_user;
   return jsonb_build_object('stage',r.stage,'newEmail',r.new_email,
    'expiresAt',r.expires_at,'resendAt',r.sent_at+interval '60 seconds');
 end if;
 if r.user_id is null or r.stage not in ('otp','ready') or r.expires_at<=now() or r.attempts>=5 or r.old_email<>current_email then
   return jsonb_build_object('error','This code has expired or is no longer valid. Request a new code.','status',400);
 end if;
 if p_otp is null or r.otp_hash is null or r.otp_hash<>p_otp then
   update public.tenant_email_changes set attempts=attempts+1 where user_id=p_user;
   return jsonb_build_object('error','Incorrect verification code.','status',400);
 end if;
 update public.tenant_email_changes set stage='ready' where user_id=p_user;
 return jsonb_build_object('newEmail',r.new_email);
end $$;
revoke all on function public.tenant_email_change(text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.tenant_email_change(text,uuid,text,text,text,text) to service_role;
