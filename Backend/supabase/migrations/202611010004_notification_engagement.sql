begin;

alter table public.notifications add column if not exists seen_at timestamptz;
alter table public.notifications add column if not exists acknowledged_at timestamptz;
grant select (seen_at,acknowledged_at) on public.notifications to authenticated;
grant update (seen_at,acknowledged_at) on public.notifications to authenticated;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sound_enabled boolean not null default false,
  browser_enabled boolean not null default false,
  billing_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  request_enabled boolean not null default true,
  account_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "Users read notification preferences" on public.notification_preferences for select to authenticated using (user_id=auth.uid());
create policy "Users insert notification preferences" on public.notification_preferences for insert to authenticated with check (user_id=auth.uid());
create policy "Users update notification preferences" on public.notification_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,insert,update on public.notification_preferences to authenticated;

commit;
