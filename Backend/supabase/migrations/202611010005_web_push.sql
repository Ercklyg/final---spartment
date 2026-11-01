begin;

create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048),
 p256dh text not null check(length(p256dh) between 20 and 512),
 auth text not null check(length(auth) between 8 and 256),
 user_agent text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions(user_id);

create table public.push_deliveries (
 notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 delivered_at timestamptz not null default now(),
 primary key(notification_id,subscription_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.push_subscriptions,public.push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant select,insert,delete on public.push_deliveries to authenticated;

create policy "Users manage own push devices" on public.push_subscriptions for all to authenticated
 using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy "Admins manage push deliveries" on public.push_deliveries for all to authenticated
 using(public.is_admin()) with check(public.is_admin());

commit;
