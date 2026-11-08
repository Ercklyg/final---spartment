-- Email-change credentials are hashes. Only the private Edge Function can use this API.
create table public.tenant_email_changes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 old_email text not null, new_email text not null,
 approval_hash text not null unique, otp_hash text,
 stage text not null check(stage in ('approval','otp','ready','complete')),
 expires_at timestamptz not null, sent_at timestamptz not null default now(),
 attempts integer not null default 0, completed_at timestamptz
);
create table public.tenant_email_send_limits (
 key_hash text primary key, sends integer not null, expires_at timestamptz not null
);
create table public.tenant_email_events (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 old_email text not null, new_email text not null, created_at timestamptz not null default now(),
 notified_at timestamptz
);
alter table public.tenant_email_changes enable row level security;
alter table public.tenant_email_send_limits enable row level security;
alter table public.tenant_email_events enable row level security;
revoke all on public.tenant_email_changes,public.tenant_email_send_limits,public.tenant_email_events from public,anon,authenticated;
grant all on public.tenant_email_changes,public.tenant_email_send_limits,public.tenant_email_events to service_role;

create function public.tenant_email_change(p_action text,p_user uuid default null,p_email text default null,
 p_approval text default null,p_otp text default null,p_ip text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.tenant_email_changes; current_email text; k text; email_key text; lim public.tenant_email_send_limits;
begin
 -- Serialize all requests for one account, including first requests and completion.
 if p_action='approve' then
   select user_id into p_user from public.tenant_email_changes where approval_hash=p_approval;
 end if;
 if p_user is null then return jsonb_build_object('error','This approval link has expired or has already been used.','status',400); end if;
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
 if p_action in ('start','resend','approve') then
   if p_action='approve' and (r.stage<>'approval' or r.approval_hash<>p_approval or r.expires_at<=now() or r.old_email<>current_email) then
     return jsonb_build_object('error','This approval link has expired or has already been used.','status',400);
   end if;
   if p_action='resend' and (r.user_id is null or r.stage not in ('approval','otp','ready') or r.expires_at<=now() or r.old_email<>current_email) then
     return jsonb_build_object('error','Start a new email change request.','status',400);
   end if;
   if p_action<>'approve' and r.sent_at>now()-interval '60 seconds' then
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
   -- Derive from the locked request, never from a potentially stale Edge read.
   email_key:=encode(sha256(convert_to(p_email,'UTF8')),'hex');
   if p_ip is null or p_ip !~ '^[a-f0-9]{64}$'
     or p_approval is null or p_approval !~ '^[a-f0-9]{64}$' or p_otp is null or p_otp !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request hashes'; end if;
   -- Stable ordering prevents deadlocks for overlapping account/email/IP buckets.
   -- Reserve all buckets before incrementing any; rejected requests consume none.
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
     insert into public.tenant_email_changes(user_id,old_email,new_email,approval_hash,stage,expires_at)
       values(p_user,current_email,p_email,p_approval,'approval',now()+interval '10 minutes')
       on conflict(user_id) do update set old_email=excluded.old_email,new_email=excluded.new_email,
       approval_hash=excluded.approval_hash,otp_hash=null,stage='approval',expires_at=excluded.expires_at,sent_at=now(),attempts=0;
   elsif p_action='approve' or r.stage in ('otp','ready') then
     update public.tenant_email_changes set stage='otp',otp_hash=p_otp,expires_at=now()+interval '10 minutes',sent_at=now(),attempts=0 where user_id=p_user;
   else
     update public.tenant_email_changes set approval_hash=p_approval,expires_at=now()+interval '10 minutes',sent_at=now() where user_id=p_user;
   end if;
   select * into r from public.tenant_email_changes where user_id=p_user;
   return jsonb_build_object('stage',r.stage,'oldEmail',r.old_email,'newEmail',r.new_email,
    'expiresAt',r.expires_at,'resendAt',r.sent_at+interval '60 seconds');
 end if;
 if p_action='verify' then
   if r.user_id is null or r.stage not in ('otp','ready') or r.expires_at<=now() or r.attempts>=5 or r.old_email<>current_email then
     return jsonb_build_object('error','This code has expired or is no longer valid. Request a new code.','status',400);
   end if;
   if p_otp is null or r.otp_hash<>p_otp then
     update public.tenant_email_changes set attempts=attempts+1 where user_id=p_user;
     return jsonb_build_object('error','Incorrect verification code.','status',400);
   end if;
   update public.tenant_email_changes set stage='ready' where user_id=p_user;
   return jsonb_build_object('newEmail',r.new_email);
 end if;
 return jsonb_build_object('error','Invalid email change action.','status',400);
end $$;
revoke all on function public.tenant_email_change(text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.tenant_email_change(text,uuid,text,text,text,text) to service_role;

-- Auth's admin API updates the identity using its supported implementation. This
-- trigger makes verification consumption, directory sync, session revocation and
-- auditing part of that SAME transaction; failures roll back the Auth update.
create function public.finish_tenant_email_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare r public.tenant_email_changes;
begin
 if lower(new.email) is not distinct from lower(old.email) then return new; end if;
 if not exists(select 1 from public.profiles where id=new.id and role='tenant') then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.id::text,8108));
 select * into r from public.tenant_email_changes where user_id=new.id for update;
 if r.user_id is null or r.stage<>'ready' or r.expires_at<=now() or r.attempts>=5
   or r.old_email<>lower(old.email) or r.new_email<>lower(new.email)
   or r.completed_at>now()-interval '24 hours' then
   raise exception 'Tenant email verification required';
 end if;
 if exists(select 1 from auth.users where lower(email)=lower(new.email) and id<>new.id) then raise unique_violation; end if;
 update public.tenant_assignments set email=lower(new.email) where id=new.id;
 update public.tenant_email_changes set stage='complete',completed_at=now(),otp_hash=null where user_id=new.id;
 delete from auth.sessions where user_id=new.id;
 insert into public.tenant_email_events(user_id,old_email,new_email) values(new.id,old.email,new.email);
 return new;
end $$;
revoke all on function public.finish_tenant_email_change() from public,anon,authenticated;
create trigger finish_tenant_email_change before update of email on auth.users
for each row execute function public.finish_tenant_email_change();

-- Access JWTs can outlive a revoked refresh token. Check the session in the API.
create function public.current_session_active() returns boolean
language sql security definer stable set search_path='' as $$
 select exists(select 1 from auth.sessions where user_id=auth.uid() and id::text=auth.jwt()->>'session_id');
$$;
revoke all on function public.current_session_active() from public,anon;
grant execute on function public.current_session_active() to authenticated;
