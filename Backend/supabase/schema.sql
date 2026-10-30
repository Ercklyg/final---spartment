-- Fresh Supabase projects only. Do not run over an existing application schema.
-- Snapshot includes migrations 202609130001 through 202609130009 and 202609140001 through 202609140003; no user data.
BEGIN;
SET LOCAL search_path = public, extensions;
SET LOCAL check_function_bodies = false;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM public, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public, anon, authenticated;

CREATE TYPE public.app_role AS ENUM ('admin', 'tenant');

CREATE TYPE public.bill_status AS ENUM ('pending', 'partially_paid', 'paid', 'overdue');

CREATE TYPE public.lease_status AS ENUM ('active', 'ended', 'cancelled');

CREATE TYPE public.room_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');

CREATE TABLE public.bills (id uuid DEFAULT gen_random_uuid() NOT NULL,
  lease_id uuid NOT NULL,
  bill_type text NOT NULL,
  billing_period date NOT NULL,
  due_date date NOT NULL,
  rent_amount numeric(12,2) DEFAULT 0 NOT NULL,
  electricity_amount numeric(12,2) DEFAULT 0 NOT NULL,
  water_amount numeric(12,2) DEFAULT 0 NOT NULL,
  status bill_status DEFAULT 'pending'::bill_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.buildings (id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.inquiries (id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  preferred_room text,
  move_in_date date,
  status text DEFAULT 'New'::text NOT NULL);

CREATE TABLE public.leases (id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  room_id uuid NOT NULL,
  move_in_date date NOT NULL,
  lease_end_date date,
  status lease_status DEFAULT 'active'::lease_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.login_attempt_limits (key_hash text NOT NULL,
  attempts integer NOT NULL,
  expires_at timestamp with time zone NOT NULL);

CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  kind text,
  source_id uuid);

CREATE TABLE public.password_recovery_limits (email_hash text NOT NULL,
  attempts integer NOT NULL,
  expires_at timestamp with time zone NOT NULL);

CREATE TABLE public.password_recovery_sessions (ticket_hash text NOT NULL,
  encrypted_session text NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  busy boolean DEFAULT false NOT NULL);

CREATE TABLE public.payment_corrections (id uuid NOT NULL,
  payment_id uuid NOT NULL,
  corrected_by uuid,
  reason text NOT NULL,
  previous_values jsonb NOT NULL,
  corrected_values jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.payments (id uuid DEFAULT gen_random_uuid() NOT NULL,
  bill_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_date date DEFAULT CURRENT_DATE NOT NULL,
  reference_note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.profiles (id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  role app_role DEFAULT 'tenant'::app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.rooms (id uuid DEFAULT gen_random_uuid() NOT NULL,
  building_id uuid NOT NULL,
  room_number text NOT NULL,
  floor integer NOT NULL,
  status room_status DEFAULT 'available'::room_status NOT NULL,
  size_sqm numeric(5,2) NOT NULL,
  capacity text DEFAULT '2-3 persons'::text NOT NULL,
  monthly_rate numeric(12,2) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.tenant_assignments (id uuid NOT NULL,
  room_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  monthly_rent numeric(12,2) NOT NULL,
  move_in date NOT NULL,
  lease_end date,
  emergency_name text NOT NULL,
  emergency_phone text NOT NULL,
  relationship text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'active'::text NOT NULL);

CREATE TABLE public.tenant_occupancy_events (id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  previous_lease_id uuid NOT NULL,
  new_lease_id uuid,
  performed_by uuid NOT NULL,
  details jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.tenant_requests (id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  room_id uuid,
  kind text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'Normal'::text NOT NULL,
  status text DEFAULT 'New'::text NOT NULL,
  admin_note text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE public.bills ADD CONSTRAINT bills_bill_type_check CHECK ((bill_type = ANY (ARRAY['rent'::text, 'utility'::text])));

ALTER TABLE public.bills ADD CONSTRAINT bills_electricity_amount_check CHECK ((electricity_amount >= (0)::numeric));

ALTER TABLE public.bills ADD CONSTRAINT bills_lease_id_bill_type_billing_period_key UNIQUE (lease_id, bill_type, billing_period);

ALTER TABLE public.bills ADD CONSTRAINT bills_pkey PRIMARY KEY (id);

ALTER TABLE public.bills ADD CONSTRAINT bills_rent_amount_check CHECK ((rent_amount >= (0)::numeric));

ALTER TABLE public.bills ADD CONSTRAINT bills_water_amount_check CHECK ((water_amount >= (0)::numeric));

ALTER TABLE public.buildings ADD CONSTRAINT buildings_name_key UNIQUE (name);

ALTER TABLE public.buildings ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_preferred_room_check CHECK ((length(preferred_room) <= 160));

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_status_check CHECK ((status = ANY (ARRAY['New'::text, 'Contacted'::text, 'Resolved'::text])));

ALTER TABLE public.leases ADD CONSTRAINT leases_check CHECK (((lease_end_date IS NULL) OR (lease_end_date >= move_in_date)));

ALTER TABLE public.leases ADD CONSTRAINT leases_pkey PRIMARY KEY (id);

ALTER TABLE public.login_attempt_limits ADD CONSTRAINT login_attempt_limits_attempts_check CHECK ((attempts > 0));

ALTER TABLE public.login_attempt_limits ADD CONSTRAINT login_attempt_limits_key_hash_check CHECK ((key_hash ~ '^[a-f0-9]{64}$'::text));

ALTER TABLE public.login_attempt_limits ADD CONSTRAINT login_attempt_limits_pkey PRIMARY KEY (key_hash);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.password_recovery_limits ADD CONSTRAINT password_recovery_limits_email_hash_check CHECK ((length(email_hash) = 64));

ALTER TABLE public.password_recovery_limits ADD CONSTRAINT password_recovery_limits_pkey PRIMARY KEY (email_hash);

ALTER TABLE public.password_recovery_sessions ADD CONSTRAINT password_recovery_sessions_pkey PRIMARY KEY (ticket_hash);

ALTER TABLE public.password_recovery_sessions ADD CONSTRAINT password_recovery_sessions_ticket_hash_check CHECK ((length(ticket_hash) = 64));

ALTER TABLE public.payment_corrections ADD CONSTRAINT payment_corrections_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_corrections ADD CONSTRAINT payment_corrections_reason_check CHECK (((length(TRIM(BOTH FROM reason)) >= 1) AND (length(TRIM(BOTH FROM reason)) <= 500)));

ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric));

ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.rooms ADD CONSTRAINT rooms_building_id_room_number_key UNIQUE (building_id, room_number);

ALTER TABLE public.rooms ADD CONSTRAINT rooms_floor_check CHECK ((floor > 0));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_monthly_rate_check CHECK ((monthly_rate > (0)::numeric));

ALTER TABLE public.rooms ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);

ALTER TABLE public.rooms ADD CONSTRAINT rooms_size_sqm_check CHECK (((size_sqm >= (8)::numeric) AND (size_sqm <= (14)::numeric)));

ALTER TABLE public.tenant_assignments ADD CONSTRAINT assignment_status_room CHECK ((((status = 'active'::text) AND (room_id IS NOT NULL)) OR ((status = 'ended'::text) AND (room_id IS NULL))));

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_check CHECK ((lease_end >= move_in));

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_monthly_rent_check CHECK ((monthly_rent > (0)::numeric));

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_room_id_key UNIQUE (room_id);

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'ended'::text])));

ALTER TABLE public.tenant_occupancy_events ADD CONSTRAINT tenant_occupancy_events_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_admin_note_check CHECK ((length(admin_note) <= 4000));

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_kind_check CHECK ((kind = ANY (ARRAY['maintenance'::text, 'other'::text])));

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_message_check CHECK (((length(TRIM(BOTH FROM message)) >= 1) AND (length(TRIM(BOTH FROM message)) <= 4000)));

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_priority_check CHECK ((priority = ANY (ARRAY['Normal'::text, 'High'::text, 'Urgent'::text])));

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_status_check CHECK ((status = ANY (ARRAY['New'::text, 'Scheduled'::text, 'In progress'::text, 'Resolved'::text])));

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_subject_check CHECK (((length(TRIM(BOTH FROM subject)) >= 1) AND (length(TRIM(BOTH FROM subject)) <= 160)));

ALTER TABLE public.bills ADD CONSTRAINT bills_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE RESTRICT;

ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;

ALTER TABLE public.leases ADD CONSTRAINT leases_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE public.leases ADD CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.password_recovery_sessions ADD CONSTRAINT password_recovery_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_corrections ADD CONSTRAINT payment_corrections_corrected_by_fkey FOREIGN KEY (corrected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.payment_corrections ADD CONSTRAINT payment_corrections_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

ALTER TABLE public.payments ADD CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rooms ADD CONSTRAINT rooms_building_id_fkey FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT;

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tenant_assignments ADD CONSTRAINT tenant_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id);

ALTER TABLE public.tenant_occupancy_events ADD CONSTRAINT tenant_occupancy_events_new_lease_id_fkey FOREIGN KEY (new_lease_id) REFERENCES leases(id);

ALTER TABLE public.tenant_occupancy_events ADD CONSTRAINT tenant_occupancy_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES profiles(id);

ALTER TABLE public.tenant_occupancy_events ADD CONSTRAINT tenant_occupancy_events_previous_lease_id_fkey FOREIGN KEY (previous_lease_id) REFERENCES leases(id);

ALTER TABLE public.tenant_occupancy_events ADD CONSTRAINT tenant_occupancy_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES profiles(id);

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id);

ALTER TABLE public.tenant_requests ADD CONSTRAINT tenant_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX bills_period_idx ON public.bills USING btree (billing_period, created_at, id);

CREATE UNIQUE INDEX one_active_lease_per_room ON public.leases USING btree (room_id) WHERE (status = 'active'::lease_status);

CREATE UNIQUE INDEX leases_one_active_room ON public.leases USING btree (room_id) WHERE (status = 'active'::lease_status);

CREATE UNIQUE INDEX leases_one_active_tenant ON public.leases USING btree (tenant_id) WHERE (status = 'active'::lease_status);

CREATE INDEX login_attempt_expiry_idx ON public.login_attempt_limits USING btree (expires_at);

CREATE INDEX notifications_tenant_created_idx ON public.notifications USING btree (tenant_id, created_at DESC, id);

CREATE INDEX password_recovery_limit_expiry ON public.password_recovery_limits USING btree (expires_at);

CREATE INDEX password_recovery_expiry ON public.password_recovery_sessions USING btree (expires_at);

CREATE INDEX payment_corrections_payment ON public.payment_corrections USING btree (payment_id);

CREATE INDEX payments_bill_date_idx ON public.payments USING btree (bill_id, payment_date);

CREATE INDEX payments_date_idx ON public.payments USING btree (payment_date);

CREATE UNIQUE INDEX tenant_assignments_email ON public.tenant_assignments USING btree (lower(email));

CREATE INDEX assignments_status_created_idx ON public.tenant_assignments USING btree (status, created_at DESC, id);

CREATE INDEX tenant_requests_tenant ON public.tenant_requests USING btree (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.analytics_report(p_month date, p_period text DEFAULT 'Monthly'::text, p_export boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare cutoff date; step integer; anchor date; result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_period not in ('Monthly','Quarterly','Yearly') then raise exception 'Invalid report period'; end if;
 cutoff:=least((date_trunc('month',p_month)+interval '1 month - 1 day')::date,(now() at time zone 'Asia/Manila')::date);
 step:=case p_period when 'Yearly' then 12 when 'Quarterly' then 3 else 1 end;
 anchor:=date_trunc(case p_period when 'Yearly' then 'year' when 'Quarterly' then 'quarter' else 'month' end,p_month)::date;
 with facts as materialized (select f.*,case when f.room_number is null then 'Unassigned' else f.building_name||' / '||f.room_number end room from public.billing_facts(cutoff) f),
 periods as (select i,(anchor-make_interval(months=>i*step))::date start,(anchor+make_interval(months=>(1-i)*step))::date finish from generate_series(0,5) i),
 series as (select i,jsonb_build_object('label',case p_period when 'Yearly' then to_char(start,'YYYY') when 'Quarterly' then 'Q'||extract(quarter from start)||' '||extract(year from start) else to_char(start,'YYYY-MM') end,
   'value',(select coalesce(sum(amount),0) from public.payments where payment_date>=start and payment_date<finish and payment_date<=cutoff),
   'billed',(select coalesce(sum(total),0) from facts where billing_period>=start and billing_period<finish)) point from periods),
 forecast as (select i,jsonb_build_object('label',to_char(start,'YYYY-MM'),
   'value',(select coalesce(sum(amount),0) from public.payments where payment_date>=start and payment_date<(start+interval '1 month')::date and payment_date<=cutoff),
   'paymentCount',(select count(*) from public.payments where payment_date>=start and payment_date<(start+interval '1 month')::date and payment_date<=cutoff),
   'billed',(select coalesce(sum(total),0) from facts where billing_period>=start and billing_period<(start+interval '1 month')::date)) point
   from (select i,(date_trunc('month',p_month)-make_interval(months=>i))::date start from generate_series(0,2) i) m)
 select jsonb_build_object('snapshot',jsonb_build_object('cutoff',cutoff,
   'rows',coalesce((select jsonb_agg(to_jsonb(f) order by f.billing_period,f.id) from facts f where p_export or balance>0),'[]'::jsonb),
   'selected',coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from facts f where to_char(billing_period,'YYYY-MM')=to_char(p_month,'YYYY-MM')),'[]'::jsonb),
   'late',coalesce((select jsonb_agg(to_jsonb(f) order by due_date,id) from facts f where status='Late'),'[]'::jsonb),
   'outstanding',(select coalesce(sum(balance),0) from facts),'overdue',(select coalesce(sum(balance),0) from facts where status='Late'),
   'collected',(select coalesce(sum(amount),0) from public.payments where payment_date>=date_trunc('month',p_month)::date and payment_date<=cutoff),
   'inventory',(select jsonb_agg(jsonb_build_object('status',s,'count',(select count(*) from public.rooms where status::text=s))) from unnest(array['occupied','available','reserved','maintenance']) s),
   'occupancy',(select coalesce(100.0*count(*) filter(where status='occupied')/nullif(count(*),0),0) from public.rooms),
   'activeTenants',(select count(distinct l.tenant_id) from public.leases l join public.profiles p on p.id=l.tenant_id where l.status='active' and p.role='tenant'),
   'available',(select count(*) from public.rooms where status='available'),'vacancyGap',(select coalesce(sum(monthly_rate),0) from public.rooms where status='available'),
   'openRequests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'subject',subject,'created_at',created_at) order by created_at desc,id) from public.tenant_requests where status<>'Resolved'),'[]'::jsonb),
   'openInquiries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'created_at',created_at) order by created_at desc,id) from public.inquiries where status<>'Resolved'),'[]'::jsonb)),
   'series',(select jsonb_agg(point order by i desc) from series),'forecastMonths',(select jsonb_agg(point order by i desc) from forecast),
   'roomCount',(select count(*) from public.rooms)) into result;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.assign_tenant_room()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform 1 from public.rooms where id = new.room_id and status = 'available' for update;
  if not found then raise exception 'Room is no longer available'; end if;
  update public.rooms set status = 'occupied' where id = new.room_id;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.billing_facts(p_cutoff date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, lease_id uuid, tenant_id uuid, bill_type text, billing_period date, due_date date, rent_amount numeric, electricity_amount numeric, water_amount numeric, total numeric, paid numeric, balance numeric, status text, name text, room_number text, building_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with payments as (select p.bill_id,sum(p.amount) paid from public.payments p
   where p_cutoff is null or p.payment_date<=p_cutoff group by p.bill_id),
 amounts as (select b.*,l.tenant_id,coalesce(p.paid,0) paid,
   b.rent_amount+b.electricity_amount+b.water_amount total,
   coalesce(pr.full_name,'Unknown tenant') name,r.room_number::text,coalesce(bu.name,'Building') building_name
   from public.bills b left join payments p on p.bill_id=b.id
   left join public.leases l on l.id=b.lease_id left join public.profiles pr on pr.id=l.tenant_id
   left join public.rooms r on r.id=l.room_id left join public.buildings bu on bu.id=r.building_id
   where p_cutoff is null or b.billing_period<=p_cutoff)
 select a.id,a.lease_id,a.tenant_id,a.bill_type,a.billing_period,a.due_date,a.rent_amount,a.electricity_amount,a.water_amount,
 a.total,a.paid,greatest(0,a.total-a.paid),
 case when a.paid>=a.total then 'Paid' when a.due_date<coalesce(p_cutoff,(now() at time zone 'Asia/Manila')::date) then 'Late'
 when a.paid>0 then 'Partially paid' else 'Pending' end,a.name,a.room_number,a.building_name from amounts a;
$function$
;

CREATE OR REPLACE FUNCTION public.billing_page(p_month date, p_type text, p_status text DEFAULT 'All'::text, p_search text DEFAULT ''::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_type not in ('rent','utility') or p_status not in ('All','Paid','Pending','Partially paid','Late')
 or length(p_search)>160 or p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid billing filters'; end if;
 with month_rows as materialized (select * from public.billing_facts() where bill_type=p_type
   and billing_period>=date_trunc('month',p_month)::date and billing_period<(date_trunc('month',p_month)+interval '1 month')::date),
 filtered as (select * from month_rows where (p_status='All' or status=p_status)
   and strpos(lower(concat_ws(' ',name,room_number,building_name)),lower(p_search))>0),
 page as (select * from filtered order by billing_period desc,due_date desc,id offset p_offset limit p_limit)
 select jsonb_build_object('bills',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('displayStatus',p.status,
   'payments',coalesce((select jsonb_agg(to_jsonb(pay) order by pay.payment_date,pay.id) from public.payments pay where pay.bill_id=p.id),'[]'::jsonb),
   'leases',jsonb_build_object('tenant_id',p.tenant_id,'profiles',jsonb_build_object('full_name',p.name),'rooms',jsonb_build_object('room_number',p.room_number,'buildings',jsonb_build_object('name',p.building_name)))) order by p.billing_period desc,p.due_date desc,p.id) from page p),'[]'::jsonb),
   'total',(select count(*) from filtered),'periodTotal',(select count(*) from month_rows),'offset',p_offset,'limit',p_limit,
   'totals',(select jsonb_build_object('total',coalesce(sum(total),0),'paid',coalesce(sum(paid),0),'balance',coalesce(sum(balance),0),
   'electricity',coalesce(sum(electricity_amount),0),'water',coalesce(sum(water_amount),0),'overdue',coalesce(sum(balance) filter(where status='Late'),0)) from month_rows)) into result;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.change_tenant_occupancy(p_id uuid, p_tenant uuid, p_lease uuid, p_date date, p_room uuid DEFAULT NULL::uuid, p_rent numeric DEFAULT NULL::numeric, p_end date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare previous public.leases; assignment public.tenant_assignments; event public.tenant_occupancy_events;
  new_lease uuid; payload jsonb; target_status public.room_status;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_id is null or p_tenant is null or p_lease is null or p_date is null
    or p_date>(now() at time zone 'Asia/Manila')::date then raise exception 'Check operation ID, tenant, lease and effective date'; end if;
  if p_room is not null and (p_rent is null or p_rent<=0 or p_rent>9999999999.99
    or p_rent<>round(p_rent,2) or (p_end is not null and p_end<p_date)) then raise exception 'Check rent and lease end date'; end if;
  if p_room is null and (p_rent is not null or p_end is not null) then raise exception 'Move-out does not accept a new rent or lease end'; end if;
  payload:=jsonb_build_object('date',p_date,'room',p_room,'rent',p_rent,'end',p_end);
  -- Serializes retries and changes for one tenant before checking the active lease.
  select * into assignment from public.tenant_assignments where id=p_tenant for update;
  if not found then raise exception 'Tenant assignment not found'; end if;
  select * into event from public.tenant_occupancy_events where id=p_id;
  if found then
    if event.tenant_id=p_tenant and event.previous_lease_id=p_lease and event.details=payload then
      return jsonb_build_object('ok',true,'leaseId',event.new_lease_id,'eventId',event.id);
    end if;
    raise exception 'Operation ID already used for a different change';
  end if;
  select * into previous from public.leases where id=p_lease and tenant_id=p_tenant and status='active' for update;
  if not found or assignment.status<>'active' or assignment.room_id<>previous.room_id then raise exception 'The active lease changed. Refresh the tenant before retrying'; end if;
  if p_date<previous.move_in_date then raise exception 'Effective date cannot be before move-in'; end if;
  if p_room=previous.room_id then raise exception 'Choose a different room'; end if;
  perform 1 from public.rooms where id in (previous.room_id,p_room) order by id for update;
  if p_room is not null then
    select status into target_status from public.rooms where id=p_room;
    if not found or target_status<>'available' or exists(select 1 from public.tenant_assignments where room_id=p_room) then raise exception 'The destination room is not available'; end if;
  end if;
  update public.leases set status='ended',lease_end_date=p_date where id=previous.id;
  if p_room is null then
    update public.tenant_assignments set room_id=null,status='ended',lease_end=p_date where id=p_tenant;
  else
    insert into public.leases(tenant_id,room_id,move_in_date,lease_end_date)
      values(p_tenant,p_room,p_date,p_end) returning id into new_lease;
    update public.tenant_assignments set room_id=p_room,monthly_rent=p_rent,move_in=p_date,lease_end=p_end where id=p_tenant;
    update public.rooms set status='occupied' where id=p_room;
  end if;
  update public.rooms set status='available' where id=previous.room_id;
  insert into public.tenant_occupancy_events(id,tenant_id,previous_lease_id,new_lease_id,performed_by,details)
    values(p_id,p_tenant,previous.id,new_lease,auth.uid(),payload);
  insert into public.notifications(tenant_id,title,message,kind,source_id)
    values(p_tenant,case when p_room is null then 'Move-out recorded' else 'Room transfer recorded' end,
      'Your tenancy was updated effective '||p_date||'. Previous bills and payments remain available.','tenancy',p_id);
  return jsonb_build_object('ok',true,'leaseId',new_lease,'eventId',p_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.consume_login_attempt(p_account_hash text, p_ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item record; entry public.login_attempt_limits; allowed boolean:=true; retry integer:=0;
begin
 if p_account_hash is null or p_ip_hash is null or p_account_hash=p_ip_hash
 or p_account_hash !~ '^[a-f0-9]{64}$' or p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid limit keys'; end if;
 delete from public.login_attempt_limits where expires_at<=now();
 -- Stable lock order also handles simultaneous attempts from several instances.
 for item in select * from (values(p_account_hash,5),(p_ip_hash,30)) as limits(key,maximum) order by key loop
   insert into public.login_attempt_limits(key_hash,attempts,expires_at) values(item.key,1,now()+interval '15 minutes')
   on conflict(key_hash) do update set attempts=least(public.login_attempt_limits.attempts+1,item.maximum+1)
   returning * into entry;
   if entry.attempts>item.maximum then allowed:=false;retry:=greatest(retry,ceil(extract(epoch from entry.expires_at-now()))::integer); end if;
 end loop;
 return jsonb_build_object('allowed',allowed,'retryAfter',greatest(retry,1));
end $function$
;

CREATE OR REPLACE FUNCTION public.consume_password_recovery_attempt(p_email_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare entry public.password_recovery_limits;
begin
  delete from public.password_recovery_limits where expires_at<=now();
  insert into public.password_recovery_limits(email_hash,attempts,expires_at)
    values(p_email_hash,1,now()+interval '15 minutes')
  on conflict(email_hash) do update set attempts=least(public.password_recovery_limits.attempts+1,4)
  returning * into entry;
  return jsonb_build_object('allowed',entry.attempts<=3,'expiresAt',entry.expires_at);
end $function$
;

CREATE OR REPLACE FUNCTION public.correct_bill_payment(p_id uuid, p_payment uuid, p_amount numeric, p_date date, p_reference text, p_reason text, p_expected jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare original public.payments; bill public.bills; audit public.payment_corrections; paid numeric; total numeric; bill_id uuid; recipient uuid; old_values jsonb; new_values jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_id is null or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_date is null or p_date>(now() at time zone 'Asia/Manila')::date
    or p_reason is null or length(trim(p_reason)) not between 1 and 500
    or length(coalesce(p_reference,''))>254 then raise exception 'Check amount, date, reference and correction reason'; end if;
  new_values:=jsonb_build_object('amount',p_amount,'payment_date',p_date,'reference_note',coalesce(p_reference,''));
  select p.bill_id into bill_id from public.payments p where p.id=p_payment;
  select * into bill from public.bills where id=bill_id for update;
  if not found then raise exception 'Payment bill not found'; end if;
  select * into original from public.payments where id=p_payment for update;
  select * into audit from public.payment_corrections where id=p_id;
  if found then
    if audit.payment_id=p_payment and audit.corrected_values=new_values and audit.reason=trim(p_reason) then return p_id; end if;
    raise exception 'Correction identifier already used';
  end if;
  old_values:=jsonb_build_object('amount',original.amount,'payment_date',original.payment_date,'reference_note',coalesce(original.reference_note,''));
  if p_expected is distinct from old_values then raise exception 'This payment changed. Refresh billing before correcting it'; end if;
  if new_values=old_values then raise exception 'Change at least one payment field'; end if;
  select coalesce(sum(amount),0) into paid from public.payments where payments.bill_id=bill.id and id<>p_payment;
  total:=bill.rent_amount+bill.electricity_amount+bill.water_amount;
  if p_amount>total-paid then raise exception 'Corrected payment exceeds bill balance'; end if;
  insert into public.payment_corrections(id,payment_id,corrected_by,reason,previous_values,corrected_values)
  values(p_id,p_payment,auth.uid(),trim(p_reason),old_values,new_values);
  update public.payments set amount=p_amount,payment_date=p_date,reference_note=coalesce(p_reference,'') where id=p_payment;
  update public.bills set status=case when paid+p_amount>=total then 'paid'::public.bill_status else 'partially_paid'::public.bill_status end where id=bill.id;
  select tenant_id into recipient from public.leases where id=bill.lease_id;
  insert into public.notifications(tenant_id,title,message,kind,source_id)
  values(recipient,'Payment corrected','Payment '||p_payment||' was corrected from PHP '||original.amount||' to PHP '||p_amount||'. Reason: '||trim(p_reason),'payment',p_payment);
  return p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.create_bill(p_lease uuid, p_type text, p_period date, p_due date, p_rent numeric, p_electricity numeric, p_water numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare bill_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_type is null or p_type not in ('rent','utility') or p_period is null or p_due is null
    or p_rent is null or p_electricity is null or p_water is null
    or p_rent < 0 or p_electricity < 0 or p_water < 0
    or p_rent + p_electricity + p_water <= 0
    or p_rent + p_electricity + p_water > 9999999999.99
    or p_rent <> round(p_rent,2) or p_electricity <> round(p_electricity,2) or p_water <> round(p_water,2)
    or (p_type = 'rent' and (p_electricity <> 0 or p_water <> 0))
    or (p_type = 'utility' and p_rent <> 0) then
    raise exception 'Check bill type, dates and amounts';
  end if;
  perform 1 from public.leases where id = p_lease and status = 'active' for share;
  if not found then raise exception 'Select an active lease'; end if;
  insert into public.bills(lease_id,bill_type,billing_period,due_date,rent_amount,electricity_amount,water_amount)
  values(p_lease,p_type,date_trunc('month',p_period)::date,p_due,round(p_rent,2),round(p_electricity,2),round(p_water,2)) returning id into bill_id;
  return bill_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.finish_tenant_account(account_id uuid, account jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles(id, role, full_name, phone)
  values(account_id, 'tenant', account->>'name', account->>'phone')
  on conflict(id) do update set role = 'tenant', full_name = excluded.full_name, phone = excluded.phone;
  insert into public.tenant_assignments(id, room_id, full_name, email, phone, monthly_rent,
    move_in, lease_end, emergency_name, emergency_phone, relationship)
  values(account_id, (account->>'room')::uuid, account->>'name', account->>'email',
    account->>'phone', (account->>'rent')::numeric, (account->>'moveIn')::date,
    nullif(account->>'leaseEnd','')::date, account->>'emergencyName',
    account->>'emergencyPhone', account->>'relationship');
  insert into public.leases(tenant_id, room_id, move_in_date, lease_end_date)
  values(account_id, (account->>'room')::uuid, (account->>'moveIn')::date,
    nullif(account->>'leaseEnd','')::date);
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_assigned_room()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status <> 'occupied' and exists(select 1 from public.tenant_assignments where room_id = new.id) then
    raise exception 'Room has an active tenant assignment';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user in ('anon', 'authenticated') and
     ((TG_OP = 'INSERT' and new.role = 'admin') or
      (TG_OP = 'UPDATE' and new.role is distinct from old.role)) then
    raise exception 'Account roles can only be changed by the server';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New user')
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.notify_tenant_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    recipient := new.tenant_id;
    heading := 'Request update: '||new.subject;
    body := 'Status: '||new.status||case when new.admin_note<>'' then '. '||new.admin_note else '' end;
    event_kind := 'request';
  end if;
  insert into public.notifications(tenant_id,title,message,kind,source_id)
  values(recipient,heading,body,event_kind,new.id);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.record_bill_payment(p_bill uuid, p_id uuid, p_amount numeric, p_date date, p_reference text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare bill public.bills; existing public.payments; total numeric; paid numeric;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_id is null or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2)
    or p_date is null or p_date > (now() at time zone 'Asia/Manila')::date
    or length(coalesce(p_reference,'')) > 254 then raise exception 'Check payment amount, date and reference'; end if;
  select * into bill from public.bills where id=p_bill for update;
  if not found then raise exception 'Bill not found'; end if;
  select * into existing from public.payments where id=p_id;
  if found then
    if existing.bill_id=p_bill and existing.amount=p_amount and existing.payment_date=p_date
      and coalesce(existing.reference_note,'')=coalesce(p_reference,'') then return p_id; end if;
    raise exception 'Payment reference was already used for a different payment';
  end if;
  total := bill.rent_amount+bill.electricity_amount+bill.water_amount;
  select coalesce(sum(amount),0) into paid from public.payments where bill_id=p_bill;
  if p_amount > total-paid then raise exception 'Payment exceeds remaining balance'; end if;
  insert into public.payments(id,bill_id,amount,payment_date,reference_note) values(p_id,p_bill,p_amount,p_date,p_reference);
  update public.bills set status=case when paid+p_amount>=total then 'paid'::public.bill_status
    else 'partially_paid'::public.bill_status end where id=p_bill;
  return p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.release_tenant_room()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.rooms set status = 'available' where id = old.room_id and status = 'occupied';
  return old;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_tenant_request(p_id uuid, p_kind text, p_subject text, p_message text, p_priority text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare assigned_room uuid; previous public.tenant_requests;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='tenant') then
    raise exception 'Sign in with a tenant account to submit a request'; end if;
  select * into previous from public.tenant_requests where id=p_id;
  if found then
    if previous.tenant_id=auth.uid() and previous.kind=p_kind and previous.subject=trim(p_subject)
      and previous.message=trim(p_message) and previous.priority=p_priority then return p_id; end if;
    raise exception 'Request identifier already used';
  end if;
  select room_id into assigned_room from public.leases where tenant_id=auth.uid() and status='active';
  if p_kind='maintenance' and assigned_room is null then raise exception 'An active room assignment is required'; end if;
  insert into public.tenant_requests(id,tenant_id,room_id,kind,subject,message,priority)
  values(p_id,auth.uid(),assigned_room,p_kind,trim(p_subject),trim(p_message),p_priority);
  return p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.tenant_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $function$
;

CREATE OR REPLACE FUNCTION public.tenant_directory_page(p_offset integer DEFAULT 0, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_offset<0 or p_limit not between 1 and 100 then raise exception 'Invalid page'; end if;
 with page as (select a.*,jsonb_build_object('room_number',r.room_number,'buildings',jsonb_build_object('name',bu.name)) rooms
   from public.tenant_assignments a left join public.rooms r on r.id=a.room_id left join public.buildings bu on bu.id=r.building_id
   where a.status='active' order by a.created_at desc,a.id offset p_offset limit p_limit),
 balances as (select f.tenant_id,count(*) count,sum(f.balance) balance,
   coalesce(sum(f.balance) filter(where f.status='Late'),0) overdue,bool_or(f.balance>0 and f.paid>0) partial
   from public.billing_facts() f where f.tenant_id in(select id from page) group by f.tenant_id)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('billing',jsonb_build_object(
   'status',case when b.count is null then 'No bills' when b.balance=0 then 'Paid' when b.overdue>0 then 'Late' when b.partial then 'Partially paid' else 'Pending' end,
   'billCount',coalesce(b.count,0),'balance',coalesce(b.balance,0),'overdue',coalesce(b.overdue,0))) order by p.created_at desc,p.id)
   from page p left join balances b on b.tenant_id=p.id),'[]'::jsonb),
   'total',(select count(*) from public.tenant_assignments where status='active'),'offset',p_offset,'limit',p_limit) into result;
 return result;
end $function$
;

CREATE TRIGGER notify_new_bill AFTER INSERT ON public.bills FOR EACH ROW EXECUTE FUNCTION notify_tenant_event();

CREATE TRIGGER notify_new_payment AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION notify_tenant_event();

CREATE TRIGGER guard_profile_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_role();

CREATE TRIGGER guard_assigned_room BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION guard_assigned_room();

CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER assign_tenant_room BEFORE INSERT ON public.tenant_assignments FOR EACH ROW EXECUTE FUNCTION assign_tenant_room();

CREATE TRIGGER release_tenant_room AFTER DELETE ON public.tenant_assignments FOR EACH ROW EXECUTE FUNCTION release_tenant_room();

CREATE TRIGGER notify_request_update AFTER UPDATE ON public.tenant_requests FOR EACH ROW EXECUTE FUNCTION notify_tenant_event();

CREATE TRIGGER tenant_request_updated BEFORE UPDATE ON public.tenant_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.login_attempt_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.password_recovery_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.password_recovery_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_corrections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_occupancy_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bills" ON public.bills AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Tenants view own bills" ON public.bills AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM leases
  WHERE ((leases.id = bills.lease_id) AND (leases.tenant_id = auth.uid()))))));

CREATE POLICY "Admins manage buildings" ON public.buildings AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can view buildings" ON public.buildings AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Admins update inquiries" ON public.inquiries AS PERMISSIVE FOR UPDATE TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins view and manage inquiries" ON public.inquiries AS PERMISSIVE FOR SELECT TO public USING (is_admin());

CREATE POLICY "Anyone can submit an inquiry" ON public.inquiries AS PERMISSIVE FOR INSERT TO anon,authenticated WITH CHECK (((status = 'New'::text) AND ((length(TRIM(BOTH FROM full_name)) >= 1) AND (length(TRIM(BOTH FROM full_name)) <= 160)) AND ((length(email) >= 3) AND (length(email) <= 254)) AND (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text) AND (length(COALESCE(phone, ''::text)) <= 40) AND (length(COALESCE(message, ''::text)) <= 4000) AND ((move_in_date IS NULL) OR (move_in_date >= ((now() AT TIME ZONE 'Asia/Manila'::text))::date))));

CREATE POLICY "Admins manage leases" ON public.leases AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Tenants view own leases" ON public.leases AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = auth.uid()) OR is_admin()));

CREATE POLICY "Admins create and manage notifications" ON public.notifications AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Tenants mark own notifications as read" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((tenant_id = auth.uid())) WITH CHECK ((tenant_id = auth.uid()));

CREATE POLICY "Tenants view own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = auth.uid()) OR is_admin()));

CREATE POLICY "Admins read correction audit" ON public.payment_corrections AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins manage payments" ON public.payments AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Tenants view own payments" ON public.payments AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM (bills
     JOIN leases ON ((leases.id = bills.lease_id)))
  WHERE ((bills.id = payments.bill_id) AND (leases.tenant_id = auth.uid()))))));

CREATE POLICY "Admins manage profiles" ON public.profiles AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((id = auth.uid()) OR is_admin()));

CREATE POLICY "Admins manage rooms" ON public.rooms AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Guests see available rooms and admins see all rooms" ON public.rooms AS PERMISSIVE FOR SELECT TO public USING (((status = 'available'::room_status) OR is_admin()));

CREATE POLICY "Tenants read their active room" ON public.rooms AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM leases
  WHERE ((leases.room_id = rooms.id) AND (leases.tenant_id = auth.uid()) AND (leases.status = 'active'::lease_status)))));

CREATE POLICY tenant_assignments_read ON public.tenant_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (((id = auth.uid()) OR tenant_admin()));

CREATE POLICY occupancy_event_read ON public.tenant_occupancy_events AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (tenant_id = auth.uid())));

CREATE POLICY "Admins update requests" ON public.tenant_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Read own requests or admin" ON public.tenant_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((tenant_id = auth.uid()) OR is_admin()));

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public, anon, authenticated, service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public, anon, authenticated, service_role;

GRANT SELECT ON public.bills TO authenticated;

GRANT DELETE ON public.bills TO service_role;

GRANT INSERT ON public.bills TO service_role;

GRANT REFERENCES ON public.bills TO service_role;

GRANT SELECT ON public.bills TO service_role;

GRANT TRIGGER ON public.bills TO service_role;

GRANT TRUNCATE ON public.bills TO service_role;

GRANT UPDATE ON public.bills TO service_role;

GRANT SELECT ON public.buildings TO anon;

GRANT INSERT ON public.buildings TO authenticated;

GRANT SELECT ON public.buildings TO authenticated;

GRANT DELETE ON public.buildings TO service_role;

GRANT INSERT ON public.buildings TO service_role;

GRANT REFERENCES ON public.buildings TO service_role;

GRANT SELECT ON public.buildings TO service_role;

GRANT TRIGGER ON public.buildings TO service_role;

GRANT TRUNCATE ON public.buildings TO service_role;

GRANT UPDATE ON public.buildings TO service_role;

GRANT INSERT ON public.inquiries TO anon;

GRANT INSERT ON public.inquiries TO authenticated;

GRANT SELECT ON public.inquiries TO authenticated;

GRANT DELETE ON public.inquiries TO service_role;

GRANT INSERT ON public.inquiries TO service_role;

GRANT REFERENCES ON public.inquiries TO service_role;

GRANT SELECT ON public.inquiries TO service_role;

GRANT TRIGGER ON public.inquiries TO service_role;

GRANT TRUNCATE ON public.inquiries TO service_role;

GRANT UPDATE ON public.inquiries TO service_role;

GRANT SELECT ON public.leases TO authenticated;

GRANT DELETE ON public.leases TO service_role;

GRANT INSERT ON public.leases TO service_role;

GRANT REFERENCES ON public.leases TO service_role;

GRANT SELECT ON public.leases TO service_role;

GRANT TRIGGER ON public.leases TO service_role;

GRANT TRUNCATE ON public.leases TO service_role;

GRANT UPDATE ON public.leases TO service_role;

GRANT DELETE ON public.login_attempt_limits TO service_role;

GRANT INSERT ON public.login_attempt_limits TO service_role;

GRANT REFERENCES ON public.login_attempt_limits TO service_role;

GRANT SELECT ON public.login_attempt_limits TO service_role;

GRANT TRIGGER ON public.login_attempt_limits TO service_role;

GRANT TRUNCATE ON public.login_attempt_limits TO service_role;

GRANT UPDATE ON public.login_attempt_limits TO service_role;

GRANT SELECT ON public.notifications TO authenticated;

GRANT DELETE ON public.notifications TO service_role;

GRANT INSERT ON public.notifications TO service_role;

GRANT REFERENCES ON public.notifications TO service_role;

GRANT SELECT ON public.notifications TO service_role;

GRANT TRIGGER ON public.notifications TO service_role;

GRANT TRUNCATE ON public.notifications TO service_role;

GRANT UPDATE ON public.notifications TO service_role;

GRANT DELETE ON public.password_recovery_limits TO service_role;

GRANT INSERT ON public.password_recovery_limits TO service_role;

GRANT REFERENCES ON public.password_recovery_limits TO service_role;

GRANT SELECT ON public.password_recovery_limits TO service_role;

GRANT TRIGGER ON public.password_recovery_limits TO service_role;

GRANT TRUNCATE ON public.password_recovery_limits TO service_role;

GRANT UPDATE ON public.password_recovery_limits TO service_role;

GRANT DELETE ON public.password_recovery_sessions TO service_role;

GRANT INSERT ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES ON public.password_recovery_sessions TO service_role;

GRANT SELECT ON public.password_recovery_sessions TO service_role;

GRANT TRIGGER ON public.password_recovery_sessions TO service_role;

GRANT TRUNCATE ON public.password_recovery_sessions TO service_role;

GRANT UPDATE ON public.password_recovery_sessions TO service_role;

GRANT SELECT ON public.payment_corrections TO authenticated;

GRANT DELETE ON public.payment_corrections TO service_role;

GRANT INSERT ON public.payment_corrections TO service_role;

GRANT REFERENCES ON public.payment_corrections TO service_role;

GRANT SELECT ON public.payment_corrections TO service_role;

GRANT TRIGGER ON public.payment_corrections TO service_role;

GRANT TRUNCATE ON public.payment_corrections TO service_role;

GRANT UPDATE ON public.payment_corrections TO service_role;

GRANT SELECT ON public.payments TO authenticated;

GRANT DELETE ON public.payments TO service_role;

GRANT INSERT ON public.payments TO service_role;

GRANT REFERENCES ON public.payments TO service_role;

GRANT SELECT ON public.payments TO service_role;

GRANT TRIGGER ON public.payments TO service_role;

GRANT TRUNCATE ON public.payments TO service_role;

GRANT UPDATE ON public.payments TO service_role;

GRANT SELECT ON public.profiles TO authenticated;

GRANT DELETE ON public.profiles TO service_role;

GRANT INSERT ON public.profiles TO service_role;

GRANT REFERENCES ON public.profiles TO service_role;

GRANT SELECT ON public.profiles TO service_role;

GRANT TRIGGER ON public.profiles TO service_role;

GRANT TRUNCATE ON public.profiles TO service_role;

GRANT UPDATE ON public.profiles TO service_role;

GRANT SELECT ON public.rooms TO anon;

GRANT INSERT ON public.rooms TO authenticated;

GRANT DELETE ON public.rooms TO authenticated;

GRANT UPDATE (building_id, room_number, floor, size_sqm, monthly_rate, capacity, description) ON public.rooms TO authenticated;

GRANT SELECT ON public.rooms TO authenticated;

GRANT DELETE ON public.rooms TO service_role;

GRANT INSERT ON public.rooms TO service_role;

GRANT REFERENCES ON public.rooms TO service_role;

GRANT SELECT ON public.rooms TO service_role;

GRANT TRIGGER ON public.rooms TO service_role;

GRANT TRUNCATE ON public.rooms TO service_role;

GRANT UPDATE ON public.rooms TO service_role;

GRANT SELECT ON public.tenant_assignments TO authenticated;

GRANT DELETE ON public.tenant_assignments TO service_role;

GRANT INSERT ON public.tenant_assignments TO service_role;

GRANT REFERENCES ON public.tenant_assignments TO service_role;

GRANT SELECT ON public.tenant_assignments TO service_role;

GRANT TRIGGER ON public.tenant_assignments TO service_role;

GRANT TRUNCATE ON public.tenant_assignments TO service_role;

GRANT UPDATE ON public.tenant_assignments TO service_role;

GRANT SELECT ON public.tenant_occupancy_events TO authenticated;

GRANT DELETE ON public.tenant_occupancy_events TO service_role;

GRANT INSERT ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES ON public.tenant_occupancy_events TO service_role;

GRANT SELECT ON public.tenant_occupancy_events TO service_role;

GRANT TRIGGER ON public.tenant_occupancy_events TO service_role;

GRANT TRUNCATE ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE ON public.tenant_occupancy_events TO service_role;

GRANT SELECT ON public.tenant_requests TO authenticated;

GRANT DELETE ON public.tenant_requests TO service_role;

GRANT INSERT ON public.tenant_requests TO service_role;

GRANT REFERENCES ON public.tenant_requests TO service_role;

GRANT SELECT ON public.tenant_requests TO service_role;

GRANT TRIGGER ON public.tenant_requests TO service_role;

GRANT TRUNCATE ON public.tenant_requests TO service_role;

GRANT UPDATE ON public.tenant_requests TO service_role;

GRANT SELECT (bill_type) ON public.bills TO authenticated;

GRANT INSERT (bill_type) ON public.bills TO service_role;

GRANT REFERENCES (bill_type) ON public.bills TO service_role;

GRANT SELECT (bill_type) ON public.bills TO service_role;

GRANT UPDATE (bill_type) ON public.bills TO service_role;

GRANT SELECT (billing_period) ON public.bills TO authenticated;

GRANT INSERT (billing_period) ON public.bills TO service_role;

GRANT REFERENCES (billing_period) ON public.bills TO service_role;

GRANT SELECT (billing_period) ON public.bills TO service_role;

GRANT UPDATE (billing_period) ON public.bills TO service_role;

GRANT SELECT (created_at) ON public.bills TO authenticated;

GRANT INSERT (created_at) ON public.bills TO service_role;

GRANT REFERENCES (created_at) ON public.bills TO service_role;

GRANT SELECT (created_at) ON public.bills TO service_role;

GRANT UPDATE (created_at) ON public.bills TO service_role;

GRANT SELECT (due_date) ON public.bills TO authenticated;

GRANT INSERT (due_date) ON public.bills TO service_role;

GRANT REFERENCES (due_date) ON public.bills TO service_role;

GRANT SELECT (due_date) ON public.bills TO service_role;

GRANT UPDATE (due_date) ON public.bills TO service_role;

GRANT SELECT (electricity_amount) ON public.bills TO authenticated;

GRANT INSERT (electricity_amount) ON public.bills TO service_role;

GRANT REFERENCES (electricity_amount) ON public.bills TO service_role;

GRANT SELECT (electricity_amount) ON public.bills TO service_role;

GRANT UPDATE (electricity_amount) ON public.bills TO service_role;

GRANT SELECT (id) ON public.bills TO authenticated;

GRANT INSERT (id) ON public.bills TO service_role;

GRANT REFERENCES (id) ON public.bills TO service_role;

GRANT SELECT (id) ON public.bills TO service_role;

GRANT UPDATE (id) ON public.bills TO service_role;

GRANT SELECT (lease_id) ON public.bills TO authenticated;

GRANT INSERT (lease_id) ON public.bills TO service_role;

GRANT REFERENCES (lease_id) ON public.bills TO service_role;

GRANT SELECT (lease_id) ON public.bills TO service_role;

GRANT UPDATE (lease_id) ON public.bills TO service_role;

GRANT SELECT (rent_amount) ON public.bills TO authenticated;

GRANT INSERT (rent_amount) ON public.bills TO service_role;

GRANT REFERENCES (rent_amount) ON public.bills TO service_role;

GRANT SELECT (rent_amount) ON public.bills TO service_role;

GRANT UPDATE (rent_amount) ON public.bills TO service_role;

GRANT SELECT (status) ON public.bills TO authenticated;

GRANT INSERT (status) ON public.bills TO service_role;

GRANT REFERENCES (status) ON public.bills TO service_role;

GRANT SELECT (status) ON public.bills TO service_role;

GRANT UPDATE (status) ON public.bills TO service_role;

GRANT SELECT (water_amount) ON public.bills TO authenticated;

GRANT INSERT (water_amount) ON public.bills TO service_role;

GRANT REFERENCES (water_amount) ON public.bills TO service_role;

GRANT SELECT (water_amount) ON public.bills TO service_role;

GRANT UPDATE (water_amount) ON public.bills TO service_role;

GRANT SELECT (address) ON public.buildings TO anon;

GRANT INSERT (address) ON public.buildings TO authenticated;

GRANT SELECT (address) ON public.buildings TO authenticated;

GRANT INSERT (address) ON public.buildings TO service_role;

GRANT REFERENCES (address) ON public.buildings TO service_role;

GRANT SELECT (address) ON public.buildings TO service_role;

GRANT UPDATE (address) ON public.buildings TO service_role;

GRANT SELECT (created_at) ON public.buildings TO anon;

GRANT INSERT (created_at) ON public.buildings TO authenticated;

GRANT SELECT (created_at) ON public.buildings TO authenticated;

GRANT INSERT (created_at) ON public.buildings TO service_role;

GRANT REFERENCES (created_at) ON public.buildings TO service_role;

GRANT SELECT (created_at) ON public.buildings TO service_role;

GRANT UPDATE (created_at) ON public.buildings TO service_role;

GRANT SELECT (id) ON public.buildings TO anon;

GRANT INSERT (id) ON public.buildings TO authenticated;

GRANT SELECT (id) ON public.buildings TO authenticated;

GRANT INSERT (id) ON public.buildings TO service_role;

GRANT REFERENCES (id) ON public.buildings TO service_role;

GRANT SELECT (id) ON public.buildings TO service_role;

GRANT UPDATE (id) ON public.buildings TO service_role;

GRANT SELECT (name) ON public.buildings TO anon;

GRANT INSERT (name) ON public.buildings TO authenticated;

GRANT SELECT (name) ON public.buildings TO authenticated;

GRANT INSERT (name) ON public.buildings TO service_role;

GRANT REFERENCES (name) ON public.buildings TO service_role;

GRANT SELECT (name) ON public.buildings TO service_role;

GRANT UPDATE (name) ON public.buildings TO service_role;

GRANT INSERT (created_at) ON public.inquiries TO anon;

GRANT INSERT (created_at) ON public.inquiries TO authenticated;

GRANT SELECT (created_at) ON public.inquiries TO authenticated;

GRANT INSERT (created_at) ON public.inquiries TO service_role;

GRANT REFERENCES (created_at) ON public.inquiries TO service_role;

GRANT SELECT (created_at) ON public.inquiries TO service_role;

GRANT UPDATE (created_at) ON public.inquiries TO service_role;

GRANT INSERT (email) ON public.inquiries TO anon;

GRANT INSERT (email) ON public.inquiries TO authenticated;

GRANT SELECT (email) ON public.inquiries TO authenticated;

GRANT INSERT (email) ON public.inquiries TO service_role;

GRANT REFERENCES (email) ON public.inquiries TO service_role;

GRANT SELECT (email) ON public.inquiries TO service_role;

GRANT UPDATE (email) ON public.inquiries TO service_role;

GRANT INSERT (full_name) ON public.inquiries TO anon;

GRANT INSERT (full_name) ON public.inquiries TO authenticated;

GRANT SELECT (full_name) ON public.inquiries TO authenticated;

GRANT INSERT (full_name) ON public.inquiries TO service_role;

GRANT REFERENCES (full_name) ON public.inquiries TO service_role;

GRANT SELECT (full_name) ON public.inquiries TO service_role;

GRANT UPDATE (full_name) ON public.inquiries TO service_role;

GRANT INSERT (id) ON public.inquiries TO anon;

GRANT INSERT (id) ON public.inquiries TO authenticated;

GRANT SELECT (id) ON public.inquiries TO authenticated;

GRANT INSERT (id) ON public.inquiries TO service_role;

GRANT REFERENCES (id) ON public.inquiries TO service_role;

GRANT SELECT (id) ON public.inquiries TO service_role;

GRANT UPDATE (id) ON public.inquiries TO service_role;

GRANT INSERT (message) ON public.inquiries TO anon;

GRANT INSERT (message) ON public.inquiries TO authenticated;

GRANT SELECT (message) ON public.inquiries TO authenticated;

GRANT INSERT (message) ON public.inquiries TO service_role;

GRANT REFERENCES (message) ON public.inquiries TO service_role;

GRANT SELECT (message) ON public.inquiries TO service_role;

GRANT UPDATE (message) ON public.inquiries TO service_role;

GRANT INSERT (move_in_date) ON public.inquiries TO anon;

GRANT INSERT (move_in_date) ON public.inquiries TO authenticated;

GRANT SELECT (move_in_date) ON public.inquiries TO authenticated;

GRANT INSERT (move_in_date) ON public.inquiries TO service_role;

GRANT REFERENCES (move_in_date) ON public.inquiries TO service_role;

GRANT SELECT (move_in_date) ON public.inquiries TO service_role;

GRANT UPDATE (move_in_date) ON public.inquiries TO service_role;

GRANT INSERT (phone) ON public.inquiries TO anon;

GRANT INSERT (phone) ON public.inquiries TO authenticated;

GRANT SELECT (phone) ON public.inquiries TO authenticated;

GRANT INSERT (phone) ON public.inquiries TO service_role;

GRANT REFERENCES (phone) ON public.inquiries TO service_role;

GRANT SELECT (phone) ON public.inquiries TO service_role;

GRANT UPDATE (phone) ON public.inquiries TO service_role;

GRANT INSERT (preferred_room) ON public.inquiries TO anon;

GRANT INSERT (preferred_room) ON public.inquiries TO authenticated;

GRANT SELECT (preferred_room) ON public.inquiries TO authenticated;

GRANT INSERT (preferred_room) ON public.inquiries TO service_role;

GRANT REFERENCES (preferred_room) ON public.inquiries TO service_role;

GRANT SELECT (preferred_room) ON public.inquiries TO service_role;

GRANT UPDATE (preferred_room) ON public.inquiries TO service_role;

GRANT INSERT (room_id) ON public.inquiries TO anon;

GRANT INSERT (room_id) ON public.inquiries TO authenticated;

GRANT SELECT (room_id) ON public.inquiries TO authenticated;

GRANT INSERT (room_id) ON public.inquiries TO service_role;

GRANT REFERENCES (room_id) ON public.inquiries TO service_role;

GRANT SELECT (room_id) ON public.inquiries TO service_role;

GRANT UPDATE (room_id) ON public.inquiries TO service_role;

GRANT INSERT (status) ON public.inquiries TO anon;

GRANT INSERT (status) ON public.inquiries TO authenticated;

GRANT SELECT (status) ON public.inquiries TO authenticated;

GRANT UPDATE (status) ON public.inquiries TO authenticated;

GRANT INSERT (status) ON public.inquiries TO service_role;

GRANT REFERENCES (status) ON public.inquiries TO service_role;

GRANT SELECT (status) ON public.inquiries TO service_role;

GRANT UPDATE (status) ON public.inquiries TO service_role;

GRANT SELECT (created_at) ON public.leases TO authenticated;

GRANT INSERT (created_at) ON public.leases TO service_role;

GRANT REFERENCES (created_at) ON public.leases TO service_role;

GRANT SELECT (created_at) ON public.leases TO service_role;

GRANT UPDATE (created_at) ON public.leases TO service_role;

GRANT SELECT (id) ON public.leases TO authenticated;

GRANT INSERT (id) ON public.leases TO service_role;

GRANT REFERENCES (id) ON public.leases TO service_role;

GRANT SELECT (id) ON public.leases TO service_role;

GRANT UPDATE (id) ON public.leases TO service_role;

GRANT SELECT (lease_end_date) ON public.leases TO authenticated;

GRANT INSERT (lease_end_date) ON public.leases TO service_role;

GRANT REFERENCES (lease_end_date) ON public.leases TO service_role;

GRANT SELECT (lease_end_date) ON public.leases TO service_role;

GRANT UPDATE (lease_end_date) ON public.leases TO service_role;

GRANT SELECT (move_in_date) ON public.leases TO authenticated;

GRANT INSERT (move_in_date) ON public.leases TO service_role;

GRANT REFERENCES (move_in_date) ON public.leases TO service_role;

GRANT SELECT (move_in_date) ON public.leases TO service_role;

GRANT UPDATE (move_in_date) ON public.leases TO service_role;

GRANT SELECT (room_id) ON public.leases TO authenticated;

GRANT INSERT (room_id) ON public.leases TO service_role;

GRANT REFERENCES (room_id) ON public.leases TO service_role;

GRANT SELECT (room_id) ON public.leases TO service_role;

GRANT UPDATE (room_id) ON public.leases TO service_role;

GRANT SELECT (status) ON public.leases TO authenticated;

GRANT INSERT (status) ON public.leases TO service_role;

GRANT REFERENCES (status) ON public.leases TO service_role;

GRANT SELECT (status) ON public.leases TO service_role;

GRANT UPDATE (status) ON public.leases TO service_role;

GRANT SELECT (tenant_id) ON public.leases TO authenticated;

GRANT INSERT (tenant_id) ON public.leases TO service_role;

GRANT REFERENCES (tenant_id) ON public.leases TO service_role;

GRANT SELECT (tenant_id) ON public.leases TO service_role;

GRANT UPDATE (tenant_id) ON public.leases TO service_role;

GRANT INSERT (attempts) ON public.login_attempt_limits TO service_role;

GRANT REFERENCES (attempts) ON public.login_attempt_limits TO service_role;

GRANT SELECT (attempts) ON public.login_attempt_limits TO service_role;

GRANT UPDATE (attempts) ON public.login_attempt_limits TO service_role;

GRANT INSERT (expires_at) ON public.login_attempt_limits TO service_role;

GRANT REFERENCES (expires_at) ON public.login_attempt_limits TO service_role;

GRANT SELECT (expires_at) ON public.login_attempt_limits TO service_role;

GRANT UPDATE (expires_at) ON public.login_attempt_limits TO service_role;

GRANT INSERT (key_hash) ON public.login_attempt_limits TO service_role;

GRANT REFERENCES (key_hash) ON public.login_attempt_limits TO service_role;

GRANT SELECT (key_hash) ON public.login_attempt_limits TO service_role;

GRANT UPDATE (key_hash) ON public.login_attempt_limits TO service_role;

GRANT SELECT (created_at) ON public.notifications TO authenticated;

GRANT INSERT (created_at) ON public.notifications TO service_role;

GRANT REFERENCES (created_at) ON public.notifications TO service_role;

GRANT SELECT (created_at) ON public.notifications TO service_role;

GRANT UPDATE (created_at) ON public.notifications TO service_role;

GRANT SELECT (id) ON public.notifications TO authenticated;

GRANT INSERT (id) ON public.notifications TO service_role;

GRANT REFERENCES (id) ON public.notifications TO service_role;

GRANT SELECT (id) ON public.notifications TO service_role;

GRANT UPDATE (id) ON public.notifications TO service_role;

GRANT SELECT (is_read) ON public.notifications TO authenticated;

GRANT UPDATE (is_read) ON public.notifications TO authenticated;

GRANT INSERT (is_read) ON public.notifications TO service_role;

GRANT REFERENCES (is_read) ON public.notifications TO service_role;

GRANT SELECT (is_read) ON public.notifications TO service_role;

GRANT UPDATE (is_read) ON public.notifications TO service_role;

GRANT SELECT (kind) ON public.notifications TO authenticated;

GRANT INSERT (kind) ON public.notifications TO service_role;

GRANT REFERENCES (kind) ON public.notifications TO service_role;

GRANT SELECT (kind) ON public.notifications TO service_role;

GRANT UPDATE (kind) ON public.notifications TO service_role;

GRANT SELECT (message) ON public.notifications TO authenticated;

GRANT INSERT (message) ON public.notifications TO service_role;

GRANT REFERENCES (message) ON public.notifications TO service_role;

GRANT SELECT (message) ON public.notifications TO service_role;

GRANT UPDATE (message) ON public.notifications TO service_role;

GRANT SELECT (source_id) ON public.notifications TO authenticated;

GRANT INSERT (source_id) ON public.notifications TO service_role;

GRANT REFERENCES (source_id) ON public.notifications TO service_role;

GRANT SELECT (source_id) ON public.notifications TO service_role;

GRANT UPDATE (source_id) ON public.notifications TO service_role;

GRANT SELECT (tenant_id) ON public.notifications TO authenticated;

GRANT INSERT (tenant_id) ON public.notifications TO service_role;

GRANT REFERENCES (tenant_id) ON public.notifications TO service_role;

GRANT SELECT (tenant_id) ON public.notifications TO service_role;

GRANT UPDATE (tenant_id) ON public.notifications TO service_role;

GRANT SELECT (title) ON public.notifications TO authenticated;

GRANT INSERT (title) ON public.notifications TO service_role;

GRANT REFERENCES (title) ON public.notifications TO service_role;

GRANT SELECT (title) ON public.notifications TO service_role;

GRANT UPDATE (title) ON public.notifications TO service_role;

GRANT INSERT (attempts) ON public.password_recovery_limits TO service_role;

GRANT REFERENCES (attempts) ON public.password_recovery_limits TO service_role;

GRANT SELECT (attempts) ON public.password_recovery_limits TO service_role;

GRANT UPDATE (attempts) ON public.password_recovery_limits TO service_role;

GRANT INSERT (email_hash) ON public.password_recovery_limits TO service_role;

GRANT REFERENCES (email_hash) ON public.password_recovery_limits TO service_role;

GRANT SELECT (email_hash) ON public.password_recovery_limits TO service_role;

GRANT UPDATE (email_hash) ON public.password_recovery_limits TO service_role;

GRANT INSERT (expires_at) ON public.password_recovery_limits TO service_role;

GRANT REFERENCES (expires_at) ON public.password_recovery_limits TO service_role;

GRANT SELECT (expires_at) ON public.password_recovery_limits TO service_role;

GRANT UPDATE (expires_at) ON public.password_recovery_limits TO service_role;

GRANT INSERT (busy) ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES (busy) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (busy) ON public.password_recovery_sessions TO service_role;

GRANT UPDATE (busy) ON public.password_recovery_sessions TO service_role;

GRANT INSERT (encrypted_session) ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES (encrypted_session) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (encrypted_session) ON public.password_recovery_sessions TO service_role;

GRANT UPDATE (encrypted_session) ON public.password_recovery_sessions TO service_role;

GRANT INSERT (expires_at) ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES (expires_at) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (expires_at) ON public.password_recovery_sessions TO service_role;

GRANT UPDATE (expires_at) ON public.password_recovery_sessions TO service_role;

GRANT INSERT (ticket_hash) ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES (ticket_hash) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (ticket_hash) ON public.password_recovery_sessions TO service_role;

GRANT UPDATE (ticket_hash) ON public.password_recovery_sessions TO service_role;

GRANT INSERT (user_id) ON public.password_recovery_sessions TO service_role;

GRANT REFERENCES (user_id) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (user_id) ON public.password_recovery_sessions TO service_role;

GRANT UPDATE (user_id) ON public.password_recovery_sessions TO service_role;

GRANT SELECT (corrected_by) ON public.payment_corrections TO authenticated;

GRANT INSERT (corrected_by) ON public.payment_corrections TO service_role;

GRANT REFERENCES (corrected_by) ON public.payment_corrections TO service_role;

GRANT SELECT (corrected_by) ON public.payment_corrections TO service_role;

GRANT UPDATE (corrected_by) ON public.payment_corrections TO service_role;

GRANT SELECT (corrected_values) ON public.payment_corrections TO authenticated;

GRANT INSERT (corrected_values) ON public.payment_corrections TO service_role;

GRANT REFERENCES (corrected_values) ON public.payment_corrections TO service_role;

GRANT SELECT (corrected_values) ON public.payment_corrections TO service_role;

GRANT UPDATE (corrected_values) ON public.payment_corrections TO service_role;

GRANT SELECT (created_at) ON public.payment_corrections TO authenticated;

GRANT INSERT (created_at) ON public.payment_corrections TO service_role;

GRANT REFERENCES (created_at) ON public.payment_corrections TO service_role;

GRANT SELECT (created_at) ON public.payment_corrections TO service_role;

GRANT UPDATE (created_at) ON public.payment_corrections TO service_role;

GRANT SELECT (id) ON public.payment_corrections TO authenticated;

GRANT INSERT (id) ON public.payment_corrections TO service_role;

GRANT REFERENCES (id) ON public.payment_corrections TO service_role;

GRANT SELECT (id) ON public.payment_corrections TO service_role;

GRANT UPDATE (id) ON public.payment_corrections TO service_role;

GRANT SELECT (payment_id) ON public.payment_corrections TO authenticated;

GRANT INSERT (payment_id) ON public.payment_corrections TO service_role;

GRANT REFERENCES (payment_id) ON public.payment_corrections TO service_role;

GRANT SELECT (payment_id) ON public.payment_corrections TO service_role;

GRANT UPDATE (payment_id) ON public.payment_corrections TO service_role;

GRANT SELECT (previous_values) ON public.payment_corrections TO authenticated;

GRANT INSERT (previous_values) ON public.payment_corrections TO service_role;

GRANT REFERENCES (previous_values) ON public.payment_corrections TO service_role;

GRANT SELECT (previous_values) ON public.payment_corrections TO service_role;

GRANT UPDATE (previous_values) ON public.payment_corrections TO service_role;

GRANT SELECT (reason) ON public.payment_corrections TO authenticated;

GRANT INSERT (reason) ON public.payment_corrections TO service_role;

GRANT REFERENCES (reason) ON public.payment_corrections TO service_role;

GRANT SELECT (reason) ON public.payment_corrections TO service_role;

GRANT UPDATE (reason) ON public.payment_corrections TO service_role;

GRANT SELECT (amount) ON public.payments TO authenticated;

GRANT INSERT (amount) ON public.payments TO service_role;

GRANT REFERENCES (amount) ON public.payments TO service_role;

GRANT SELECT (amount) ON public.payments TO service_role;

GRANT UPDATE (amount) ON public.payments TO service_role;

GRANT SELECT (bill_id) ON public.payments TO authenticated;

GRANT INSERT (bill_id) ON public.payments TO service_role;

GRANT REFERENCES (bill_id) ON public.payments TO service_role;

GRANT SELECT (bill_id) ON public.payments TO service_role;

GRANT UPDATE (bill_id) ON public.payments TO service_role;

GRANT SELECT (created_at) ON public.payments TO authenticated;

GRANT INSERT (created_at) ON public.payments TO service_role;

GRANT REFERENCES (created_at) ON public.payments TO service_role;

GRANT SELECT (created_at) ON public.payments TO service_role;

GRANT UPDATE (created_at) ON public.payments TO service_role;

GRANT SELECT (id) ON public.payments TO authenticated;

GRANT INSERT (id) ON public.payments TO service_role;

GRANT REFERENCES (id) ON public.payments TO service_role;

GRANT SELECT (id) ON public.payments TO service_role;

GRANT UPDATE (id) ON public.payments TO service_role;

GRANT SELECT (payment_date) ON public.payments TO authenticated;

GRANT INSERT (payment_date) ON public.payments TO service_role;

GRANT REFERENCES (payment_date) ON public.payments TO service_role;

GRANT SELECT (payment_date) ON public.payments TO service_role;

GRANT UPDATE (payment_date) ON public.payments TO service_role;

GRANT SELECT (reference_note) ON public.payments TO authenticated;

GRANT INSERT (reference_note) ON public.payments TO service_role;

GRANT REFERENCES (reference_note) ON public.payments TO service_role;

GRANT SELECT (reference_note) ON public.payments TO service_role;

GRANT UPDATE (reference_note) ON public.payments TO service_role;

GRANT SELECT (created_at) ON public.profiles TO authenticated;

GRANT INSERT (created_at) ON public.profiles TO service_role;

GRANT REFERENCES (created_at) ON public.profiles TO service_role;

GRANT SELECT (created_at) ON public.profiles TO service_role;

GRANT UPDATE (created_at) ON public.profiles TO service_role;

GRANT SELECT (full_name) ON public.profiles TO authenticated;

GRANT INSERT (full_name) ON public.profiles TO service_role;

GRANT REFERENCES (full_name) ON public.profiles TO service_role;

GRANT SELECT (full_name) ON public.profiles TO service_role;

GRANT UPDATE (full_name) ON public.profiles TO service_role;

GRANT SELECT (id) ON public.profiles TO authenticated;

GRANT INSERT (id) ON public.profiles TO service_role;

GRANT REFERENCES (id) ON public.profiles TO service_role;

GRANT SELECT (id) ON public.profiles TO service_role;

GRANT UPDATE (id) ON public.profiles TO service_role;

GRANT SELECT (phone) ON public.profiles TO authenticated;

GRANT INSERT (phone) ON public.profiles TO service_role;

GRANT REFERENCES (phone) ON public.profiles TO service_role;

GRANT SELECT (phone) ON public.profiles TO service_role;

GRANT UPDATE (phone) ON public.profiles TO service_role;

GRANT SELECT (role) ON public.profiles TO authenticated;

GRANT INSERT (role) ON public.profiles TO service_role;

GRANT REFERENCES (role) ON public.profiles TO service_role;

GRANT SELECT (role) ON public.profiles TO service_role;

GRANT UPDATE (role) ON public.profiles TO service_role;

GRANT SELECT (building_id) ON public.rooms TO anon;

GRANT INSERT (building_id) ON public.rooms TO authenticated;

GRANT SELECT (building_id) ON public.rooms TO authenticated;

GRANT INSERT (building_id) ON public.rooms TO service_role;

GRANT REFERENCES (building_id) ON public.rooms TO service_role;

GRANT SELECT (building_id) ON public.rooms TO service_role;

GRANT UPDATE (building_id) ON public.rooms TO service_role;

GRANT SELECT (capacity) ON public.rooms TO anon;

GRANT INSERT (capacity) ON public.rooms TO authenticated;

GRANT SELECT (capacity) ON public.rooms TO authenticated;

GRANT INSERT (capacity) ON public.rooms TO service_role;

GRANT REFERENCES (capacity) ON public.rooms TO service_role;

GRANT SELECT (capacity) ON public.rooms TO service_role;

GRANT UPDATE (capacity) ON public.rooms TO service_role;

GRANT SELECT (created_at) ON public.rooms TO anon;

GRANT INSERT (created_at) ON public.rooms TO authenticated;

GRANT SELECT (created_at) ON public.rooms TO authenticated;

GRANT INSERT (created_at) ON public.rooms TO service_role;

GRANT REFERENCES (created_at) ON public.rooms TO service_role;

GRANT SELECT (created_at) ON public.rooms TO service_role;

GRANT UPDATE (created_at) ON public.rooms TO service_role;

GRANT SELECT (description) ON public.rooms TO anon;

GRANT INSERT (description) ON public.rooms TO authenticated;

GRANT SELECT (description) ON public.rooms TO authenticated;

GRANT INSERT (description) ON public.rooms TO service_role;

GRANT REFERENCES (description) ON public.rooms TO service_role;

GRANT SELECT (description) ON public.rooms TO service_role;

GRANT UPDATE (description) ON public.rooms TO service_role;

GRANT SELECT (floor) ON public.rooms TO anon;

GRANT INSERT (floor) ON public.rooms TO authenticated;

GRANT SELECT (floor) ON public.rooms TO authenticated;

GRANT INSERT (floor) ON public.rooms TO service_role;

GRANT REFERENCES (floor) ON public.rooms TO service_role;

GRANT SELECT (floor) ON public.rooms TO service_role;

GRANT UPDATE (floor) ON public.rooms TO service_role;

GRANT SELECT (id) ON public.rooms TO anon;

GRANT INSERT (id) ON public.rooms TO authenticated;

GRANT SELECT (id) ON public.rooms TO authenticated;

GRANT INSERT (id) ON public.rooms TO service_role;

GRANT REFERENCES (id) ON public.rooms TO service_role;

GRANT SELECT (id) ON public.rooms TO service_role;

GRANT UPDATE (id) ON public.rooms TO service_role;

GRANT SELECT (monthly_rate) ON public.rooms TO anon;

GRANT INSERT (monthly_rate) ON public.rooms TO authenticated;

GRANT SELECT (monthly_rate) ON public.rooms TO authenticated;

GRANT INSERT (monthly_rate) ON public.rooms TO service_role;

GRANT REFERENCES (monthly_rate) ON public.rooms TO service_role;

GRANT SELECT (monthly_rate) ON public.rooms TO service_role;

GRANT UPDATE (monthly_rate) ON public.rooms TO service_role;

GRANT SELECT (room_number) ON public.rooms TO anon;

GRANT INSERT (room_number) ON public.rooms TO authenticated;

GRANT SELECT (room_number) ON public.rooms TO authenticated;

GRANT INSERT (room_number) ON public.rooms TO service_role;

GRANT REFERENCES (room_number) ON public.rooms TO service_role;

GRANT SELECT (room_number) ON public.rooms TO service_role;

GRANT UPDATE (room_number) ON public.rooms TO service_role;

GRANT SELECT (size_sqm) ON public.rooms TO anon;

GRANT INSERT (size_sqm) ON public.rooms TO authenticated;

GRANT SELECT (size_sqm) ON public.rooms TO authenticated;

GRANT INSERT (size_sqm) ON public.rooms TO service_role;

GRANT REFERENCES (size_sqm) ON public.rooms TO service_role;

GRANT SELECT (size_sqm) ON public.rooms TO service_role;

GRANT UPDATE (size_sqm) ON public.rooms TO service_role;

GRANT SELECT (status) ON public.rooms TO anon;

GRANT INSERT (status) ON public.rooms TO authenticated;

GRANT SELECT (status) ON public.rooms TO authenticated;

GRANT UPDATE (status) ON public.rooms TO authenticated;

GRANT INSERT (status) ON public.rooms TO service_role;

GRANT REFERENCES (status) ON public.rooms TO service_role;

GRANT SELECT (status) ON public.rooms TO service_role;

GRANT UPDATE (status) ON public.rooms TO service_role;

GRANT SELECT (updated_at) ON public.rooms TO anon;

GRANT INSERT (updated_at) ON public.rooms TO authenticated;

GRANT SELECT (updated_at) ON public.rooms TO authenticated;

GRANT INSERT (updated_at) ON public.rooms TO service_role;

GRANT REFERENCES (updated_at) ON public.rooms TO service_role;

GRANT SELECT (updated_at) ON public.rooms TO service_role;

GRANT UPDATE (updated_at) ON public.rooms TO service_role;

GRANT SELECT (created_at) ON public.tenant_assignments TO authenticated;

GRANT INSERT (created_at) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (created_at) ON public.tenant_assignments TO service_role;

GRANT SELECT (created_at) ON public.tenant_assignments TO service_role;

GRANT UPDATE (created_at) ON public.tenant_assignments TO service_role;

GRANT SELECT (email) ON public.tenant_assignments TO authenticated;

GRANT INSERT (email) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (email) ON public.tenant_assignments TO service_role;

GRANT SELECT (email) ON public.tenant_assignments TO service_role;

GRANT UPDATE (email) ON public.tenant_assignments TO service_role;

GRANT SELECT (emergency_name) ON public.tenant_assignments TO authenticated;

GRANT INSERT (emergency_name) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (emergency_name) ON public.tenant_assignments TO service_role;

GRANT SELECT (emergency_name) ON public.tenant_assignments TO service_role;

GRANT UPDATE (emergency_name) ON public.tenant_assignments TO service_role;

GRANT SELECT (emergency_phone) ON public.tenant_assignments TO authenticated;

GRANT INSERT (emergency_phone) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (emergency_phone) ON public.tenant_assignments TO service_role;

GRANT SELECT (emergency_phone) ON public.tenant_assignments TO service_role;

GRANT UPDATE (emergency_phone) ON public.tenant_assignments TO service_role;

GRANT SELECT (full_name) ON public.tenant_assignments TO authenticated;

GRANT INSERT (full_name) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (full_name) ON public.tenant_assignments TO service_role;

GRANT SELECT (full_name) ON public.tenant_assignments TO service_role;

GRANT UPDATE (full_name) ON public.tenant_assignments TO service_role;

GRANT SELECT (id) ON public.tenant_assignments TO authenticated;

GRANT INSERT (id) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (id) ON public.tenant_assignments TO service_role;

GRANT SELECT (id) ON public.tenant_assignments TO service_role;

GRANT UPDATE (id) ON public.tenant_assignments TO service_role;

GRANT SELECT (lease_end) ON public.tenant_assignments TO authenticated;

GRANT INSERT (lease_end) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (lease_end) ON public.tenant_assignments TO service_role;

GRANT SELECT (lease_end) ON public.tenant_assignments TO service_role;

GRANT UPDATE (lease_end) ON public.tenant_assignments TO service_role;

GRANT SELECT (monthly_rent) ON public.tenant_assignments TO authenticated;

GRANT INSERT (monthly_rent) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (monthly_rent) ON public.tenant_assignments TO service_role;

GRANT SELECT (monthly_rent) ON public.tenant_assignments TO service_role;

GRANT UPDATE (monthly_rent) ON public.tenant_assignments TO service_role;

GRANT SELECT (move_in) ON public.tenant_assignments TO authenticated;

GRANT INSERT (move_in) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (move_in) ON public.tenant_assignments TO service_role;

GRANT SELECT (move_in) ON public.tenant_assignments TO service_role;

GRANT UPDATE (move_in) ON public.tenant_assignments TO service_role;

GRANT SELECT (phone) ON public.tenant_assignments TO authenticated;

GRANT INSERT (phone) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (phone) ON public.tenant_assignments TO service_role;

GRANT SELECT (phone) ON public.tenant_assignments TO service_role;

GRANT UPDATE (phone) ON public.tenant_assignments TO service_role;

GRANT SELECT (relationship) ON public.tenant_assignments TO authenticated;

GRANT INSERT (relationship) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (relationship) ON public.tenant_assignments TO service_role;

GRANT SELECT (relationship) ON public.tenant_assignments TO service_role;

GRANT UPDATE (relationship) ON public.tenant_assignments TO service_role;

GRANT SELECT (room_id) ON public.tenant_assignments TO authenticated;

GRANT INSERT (room_id) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (room_id) ON public.tenant_assignments TO service_role;

GRANT SELECT (room_id) ON public.tenant_assignments TO service_role;

GRANT UPDATE (room_id) ON public.tenant_assignments TO service_role;

GRANT SELECT (status) ON public.tenant_assignments TO authenticated;

GRANT INSERT (status) ON public.tenant_assignments TO service_role;

GRANT REFERENCES (status) ON public.tenant_assignments TO service_role;

GRANT SELECT (status) ON public.tenant_assignments TO service_role;

GRANT UPDATE (status) ON public.tenant_assignments TO service_role;

GRANT SELECT (created_at) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (created_at) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (created_at) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (created_at) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (created_at) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (details) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (details) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (details) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (details) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (details) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (id) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (id) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (id) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (new_lease_id) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (new_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (new_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (new_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (new_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (performed_by) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (performed_by) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (performed_by) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (performed_by) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (performed_by) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (previous_lease_id) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (previous_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (previous_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (previous_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (previous_lease_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (tenant_id) ON public.tenant_occupancy_events TO authenticated;

GRANT INSERT (tenant_id) ON public.tenant_occupancy_events TO service_role;

GRANT REFERENCES (tenant_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (tenant_id) ON public.tenant_occupancy_events TO service_role;

GRANT UPDATE (tenant_id) ON public.tenant_occupancy_events TO service_role;

GRANT SELECT (admin_note) ON public.tenant_requests TO authenticated;

GRANT UPDATE (admin_note) ON public.tenant_requests TO authenticated;

GRANT INSERT (admin_note) ON public.tenant_requests TO service_role;

GRANT REFERENCES (admin_note) ON public.tenant_requests TO service_role;

GRANT SELECT (admin_note) ON public.tenant_requests TO service_role;

GRANT UPDATE (admin_note) ON public.tenant_requests TO service_role;

GRANT SELECT (created_at) ON public.tenant_requests TO authenticated;

GRANT INSERT (created_at) ON public.tenant_requests TO service_role;

GRANT REFERENCES (created_at) ON public.tenant_requests TO service_role;

GRANT SELECT (created_at) ON public.tenant_requests TO service_role;

GRANT UPDATE (created_at) ON public.tenant_requests TO service_role;

GRANT SELECT (id) ON public.tenant_requests TO authenticated;

GRANT INSERT (id) ON public.tenant_requests TO service_role;

GRANT REFERENCES (id) ON public.tenant_requests TO service_role;

GRANT SELECT (id) ON public.tenant_requests TO service_role;

GRANT UPDATE (id) ON public.tenant_requests TO service_role;

GRANT SELECT (kind) ON public.tenant_requests TO authenticated;

GRANT INSERT (kind) ON public.tenant_requests TO service_role;

GRANT REFERENCES (kind) ON public.tenant_requests TO service_role;

GRANT SELECT (kind) ON public.tenant_requests TO service_role;

GRANT UPDATE (kind) ON public.tenant_requests TO service_role;

GRANT SELECT (message) ON public.tenant_requests TO authenticated;

GRANT INSERT (message) ON public.tenant_requests TO service_role;

GRANT REFERENCES (message) ON public.tenant_requests TO service_role;

GRANT SELECT (message) ON public.tenant_requests TO service_role;

GRANT UPDATE (message) ON public.tenant_requests TO service_role;

GRANT SELECT (priority) ON public.tenant_requests TO authenticated;

GRANT INSERT (priority) ON public.tenant_requests TO service_role;

GRANT REFERENCES (priority) ON public.tenant_requests TO service_role;

GRANT SELECT (priority) ON public.tenant_requests TO service_role;

GRANT UPDATE (priority) ON public.tenant_requests TO service_role;

GRANT SELECT (room_id) ON public.tenant_requests TO authenticated;

GRANT INSERT (room_id) ON public.tenant_requests TO service_role;

GRANT REFERENCES (room_id) ON public.tenant_requests TO service_role;

GRANT SELECT (room_id) ON public.tenant_requests TO service_role;

GRANT UPDATE (room_id) ON public.tenant_requests TO service_role;

GRANT SELECT (status) ON public.tenant_requests TO authenticated;

GRANT UPDATE (status) ON public.tenant_requests TO authenticated;

GRANT INSERT (status) ON public.tenant_requests TO service_role;

GRANT REFERENCES (status) ON public.tenant_requests TO service_role;

GRANT SELECT (status) ON public.tenant_requests TO service_role;

GRANT UPDATE (status) ON public.tenant_requests TO service_role;

GRANT SELECT (subject) ON public.tenant_requests TO authenticated;

GRANT INSERT (subject) ON public.tenant_requests TO service_role;

GRANT REFERENCES (subject) ON public.tenant_requests TO service_role;

GRANT SELECT (subject) ON public.tenant_requests TO service_role;

GRANT UPDATE (subject) ON public.tenant_requests TO service_role;

GRANT SELECT (tenant_id) ON public.tenant_requests TO authenticated;

GRANT INSERT (tenant_id) ON public.tenant_requests TO service_role;

GRANT REFERENCES (tenant_id) ON public.tenant_requests TO service_role;

GRANT SELECT (tenant_id) ON public.tenant_requests TO service_role;

GRANT UPDATE (tenant_id) ON public.tenant_requests TO service_role;

GRANT SELECT (updated_at) ON public.tenant_requests TO authenticated;

GRANT INSERT (updated_at) ON public.tenant_requests TO service_role;

GRANT REFERENCES (updated_at) ON public.tenant_requests TO service_role;

GRANT SELECT (updated_at) ON public.tenant_requests TO service_role;

GRANT UPDATE (updated_at) ON public.tenant_requests TO service_role;

GRANT EXECUTE ON FUNCTION public.analytics_report(p_month date, p_period text, p_export boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.analytics_report(p_month date, p_period text, p_export boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.assign_tenant_room() TO service_role;

GRANT EXECUTE ON FUNCTION public.billing_facts(p_cutoff date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.billing_facts(p_cutoff date) TO service_role;

GRANT EXECUTE ON FUNCTION public.billing_page(p_month date, p_type text, p_status text, p_search text, p_offset integer, p_limit integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.billing_page(p_month date, p_type text, p_status text, p_search text, p_offset integer, p_limit integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.change_tenant_occupancy(p_id uuid, p_tenant uuid, p_lease uuid, p_date date, p_room uuid, p_rent numeric, p_end date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.change_tenant_occupancy(p_id uuid, p_tenant uuid, p_lease uuid, p_date date, p_room uuid, p_rent numeric, p_end date) TO service_role;

GRANT EXECUTE ON FUNCTION public.consume_login_attempt(p_account_hash text, p_ip_hash text) TO service_role;

GRANT EXECUTE ON FUNCTION public.consume_password_recovery_attempt(p_email_hash text) TO service_role;

GRANT EXECUTE ON FUNCTION public.correct_bill_payment(p_id uuid, p_payment uuid, p_amount numeric, p_date date, p_reference text, p_reason text, p_expected jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.correct_bill_payment(p_id uuid, p_payment uuid, p_amount numeric, p_date date, p_reference text, p_reason text, p_expected jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_bill(p_lease uuid, p_type text, p_period date, p_due date, p_rent numeric, p_electricity numeric, p_water numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_bill(p_lease uuid, p_type text, p_period date, p_due date, p_rent numeric, p_electricity numeric, p_water numeric) TO service_role;

GRANT EXECUTE ON FUNCTION public.finish_tenant_account(account_id uuid, account jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_assigned_room() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_profile_role() TO service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.notify_tenant_event() TO service_role;

GRANT EXECUTE ON FUNCTION public.record_bill_payment(p_bill uuid, p_id uuid, p_amount numeric, p_date date, p_reference text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_bill_payment(p_bill uuid, p_id uuid, p_amount numeric, p_date date, p_reference text) TO service_role;

GRANT EXECUTE ON FUNCTION public.release_tenant_room() TO service_role;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.submit_tenant_request(p_id uuid, p_kind text, p_subject text, p_message text, p_priority text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_tenant_request(p_id uuid, p_kind text, p_subject text, p_message text, p_priority text) TO service_role;

GRANT EXECUTE ON FUNCTION public.tenant_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.tenant_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.tenant_directory_page(p_offset integer, p_limit integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.tenant_directory_page(p_offset integer, p_limit integer) TO service_role;

COMMIT;
