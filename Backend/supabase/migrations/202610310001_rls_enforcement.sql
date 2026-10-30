-- RLS is the authorization boundary. The API uses the anon key plus the
-- caller's JWT, so PostgREST runs as anon/authenticated and every public
-- table must keep row level security enabled.
begin;

alter table public.bills enable row level security;
alter table public.buildings enable row level security;
alter table public.inquiries enable row level security;
alter table public.leases enable row level security;
alter table public.login_attempt_limits enable row level security;
alter table public.notifications enable row level security;
alter table public.password_recovery_limits enable row level security;
alter table public.password_recovery_sessions enable row level security;
alter table public.payment_corrections enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.tenant_assignments enable row level security;
alter table public.tenant_occupancy_events enable row level security;
alter table public.tenant_requests enable row level security;

-- is_admin() is evaluated by RLS policies. Pin its search_path so callers
-- cannot redirect object resolution and bypass those policies.
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

commit;
