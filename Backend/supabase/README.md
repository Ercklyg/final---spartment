# Tenant account setup

The frontend reads tenant_assignments and rooms. The create-tenant Edge Function
validates the caller with Auth.getUser, checks profiles.role = admin, creates the
Auth user, then calls a service-role-only transaction to save the profile and
assignment. The browser never receives a service-role key. Passwords are sent
only to Auth and are not stored in tenant records.

## Deploy

Deployed and live-tested on Spartment-Final (nbuwnbcnhzgkvjteggfb).
The schema and RLS policies were inspected using the signed-in CLI. Auth and
frontend public-key configuration work; the schema endpoint requires a server
key, so its earlier HTTP 401 did not indicate an invalid frontend key.

The migration introduces tenant_assignments and creates an active lease in the
existing leases table in the same transaction. profiles.phone is saved too.
There were no existing leases when deployed. Mock tenants are not imported.
Unique partial indexes prevent multiple active leases for a room or tenant.

From the Backend directory with the Supabase CLI installed:

1. Run `supabase login` and `supabase link --project-ref YOUR_PROJECT_REF`.
2. Review and apply `supabase db push`.
3. Run `supabase functions deploy create-tenant`.
4. Confirm ../Frontend/.env.local contains this project's URL and anon/publishable
   key, and that the signed-in administrator has profiles.role = admin.

SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by hosted Edge Functions.
Never put the service-role key in a VITE variable. verify_jwt is disabled in
config.toml because the handler verifies the bearer token against Auth directly;
the function does not accept unauthenticated requests.

Existing profiles and rooms RLS policies must allow admins to read those tables
and manage rooms, and users to read their own profile. Review any existing
SECURITY DEFINER profile-writing functions: they must not let callers grant
themselves admin. The migration blocks direct client role changes.

## Acceptance checks after deployment

- No bearer token / invalid token: 401; a signed-in tenant: 403; neither creates users.
- Admin creates a tenant: Auth user, tenant profile, assignment, and occupied room
  persist after reload. Admin remains signed in. New credentials sign in as tenant.
- Two concurrent creations for one room: exactly one assignment succeeds; the
  unsuccessful Auth user is removed. Duplicate emails must not create assignments.
- Invalid email, UUID, dates, phone, rent, and short password: 400.
- Direct authenticated INSERT/UPDATE/DELETE on assignments and calls to
  finish_tenant_account are denied. Tenants can read only their own assignment.
- Assigned room status cannot change to available, reserved, or maintenance.
- Existing leases restrict Auth-user deletion to preserve billing history. For
  isolated tests only, remove the test lease before deleting the test Auth user;
  its assignment then cascades and the room becomes available.

Run `node supabase/verify-tenants.mjs` from the Backend directory with the CLI
signed in to repeat the live tests. This reads the server key into memory without
printing or saving it, creates isolated fixtures, and cleans them up afterward.
Verified: missing/invalid-token rejection, invalid rent, admin creation, tenant
login and role, persisted room/lease/profile, admin session preservation,
non-admin rejection, RPC/write restrictions, room status guard, own-record reads,
and concurrent assignment conflicts. Temporary fixtures were removed.

Auth creation and the database RPC are separate services. If assignment fails,
the function deletes the newly created Auth user. If cleanup fails it returns an
explicit cleanup error and logs only the user ID; remove that orphan account in
Auth administration before retrying. An interrupted invocation can also require
checking Auth users. The UI does not automatically retry account creation.

Temporary passwords are randomly generated per form. Share them privately before
closing the form and ask the tenant to change their password through a working
Auth password-change flow; forced password changes are not implemented here.
ChangePassword.jsx now verifies the current password in an isolated in-memory
Auth session and updates the app user's password through Supabase Auth. The
temporary session is signed out with local scope, leaving the app session intact.
It validates confirmation and strength, prevents duplicate submissions, reports
failures, and clears password fields after a confirmed update.

Run `node supabase/verify-password-change.mjs` for its live integration test.
Verified: incorrect current password, mismatched confirmation, weak/unchanged
passwords and missing session are rejected; the new password signs in, the old
password fails, and the app session stays intact. The temporary account is deleted.
No database migration or Edge Function deployment is required for this screen.

## Tenant account and dashboard

The tenant account loader uses the authenticated user ID to read profiles,
tenant_assignments, and the active lease with its room and building. Account
information displays name, Auth email, phone, room, rent, lease dates, and emergency
contact. The dashboard greeting and summary use these same records. Tenant
headers and chat room prefills use actual account data across tenant pages.

Migration 202609130002_tenant_room_read.sql is deployed and grants SELECT on the
occupied room linked to the caller's own active lease. Live integration tests
verify that another tenant's profile, assignment, lease, and occupied room remain
hidden, and that accounts without a lease show an unassigned state. Loading errors
have a retry action. No mock account or default rent is substituted on failure.

The dashboard and Billing page display saved bills, payment histories, and computed
balances. The dashboard also displays the tenant's saved requests and admin updates.

## Billing, payments, and requests

Migration 202609130003_billing_requests.sql is deployed. Admin Billing creates rent
or utility bills for active leases. Rent defaults to the tenant's agreed rent.
One bill per lease/type/month is enforced by the existing unique constraint.
Payments are recorded through an admin-only function which locks the bill,
rejects overpayments, and updates status in the same transaction. Retrying the
same payment ID does not duplicate payment records. Authenticated direct financial
writes are revoked; the checked functions are the supported write path.
The UI derives paid, partial, pending, and late statuses from amounts and dates,
using Philippine dates and cent-based balance calculations.

Tenant maintenance and general-message forms call submit_tenant_request. The
server derives the sender and assigned room from Auth and the active lease.
Maintenance requires an active lease; general messages allow unassigned tenants.
Guests can submit Unit Inquiry, including contact details and preferred move-in
date. Guest inquiries are not publicly readable. General and maintenance forms
require tenant sign-in. No emails or messages outside this application are sent.

Admin Customer Requests shows saved tenant requests and guest inquiries. Admins
can save status changes and a note visible to the tenant. Tenant requests are
visible only to their sender and admins. Use Refresh or reopen the page to load
updates; closing the dashboard chat also refreshes the tenant request list.

The live verify-tenants.mjs suite verifies bill creation/uniqueness, financial
write authorization, partial/full payments, duplicate concurrent payment retries,
overpayment rejection, utility decimal amounts, billing/payment privacy, saved
requests, authoritative room assignment, admin updates, tenant write restrictions,
unassigned tenant behavior and guest inquiries. All isolated fixtures are removed.

Bills
are created manually; recurring bill generation is not implemented.

## Admin dashboard and analytics

Both pages use the admin-only account loader and paginated reads of rooms,
profiles, leases, bills, payments, tenant requests and inquiries. Collections use
payment_date; billed totals use billing_period. Balances through a selected month
exclude later payments. The current month is capped at today's Philippine date.
Bill statuses derive from unpaid amounts and due dates, rather than stale status
labels. Active tenants count distinct tenants on active leases.

Occupancy, available-room rates and unresolved requests are current snapshots,
clearly distinguished from historical financial cutoffs. No room-history table
exists. Collections charts support monthly, quarterly and yearly groupings; zero
means no saved payments, not proof that historical data is complete. The optional
three-month estimate requires completed months with recorded payments. Sample
targets, growth claims and credit-risk assertions have been removed.

CSV export includes grouped billed/collected totals, detailed balances and current
inventory. Text cells are quoted and formula prefixes escaped. Refresh reloads
data; these views are not realtime subscriptions.

Validated with node --test ../Frontend/src/lib/adminAnalytics.test.js and the live
verify-tenants.mjs suite: historical cutoffs, cent arithmetic, grouping, empty
data, CSV escaping, live bill/payment/request totals and non-admin rejection.
All temporary integration fixtures were removed. No new migration was required.

## Tenant notifications

Migration 202609130004_notifications.sql creates in-app notifications after a new
bill, a recorded payment, or a changed request status/admin note. The notification
and source action share a transaction. Idempotent bill/payment retries and no-op
request updates do not generate duplicate notifications. Existing events are not
backfilled. No email, SMS, or browser push is sent.

The dashboard shows the signed-in tenant's notifications, unread count, individual
read controls, mark-all-read, billing links and Show more. Refresh or reopen the
dashboard to load new events; no realtime subscription is required. Tenants may
only update is_read on notifications permitted by RLS, not their content or owner.
The live workflow test verifies event counts, duplicate suppression, cross-tenant
access denial, content protection and persisted read state.

## Printable payment receipts

Admin and tenant billing lists expose View / print receipt for each saved payment.
The preview re-fetches that payment with its bill, tenant and room using the
caller's authenticated Supabase client. Existing RLS permits admins and the owner;
other tenants and guests cannot fetch the receipt data. No migration is needed.

The receipt contains the payment UUID, actual payment amount/date/reference,
bill UUID/type/period/due date, and currently linked tenant/building/room details.
It acknowledges only that payment, including partial payments. It does not infer
full settlement or freeze historical tenant identity. User text is HTML-escaped.
Print / Save as PDF opens the browser print dialog for the receipt-only frame.
Download saves a standalone HTML receipt that can also be opened and printed.

Validated template escaping/partial amounts and live owner/admin/guest/other-tenant
access. Build and targeted lint passed. Native print-dialog behavior still depends
on the user's browser and printer/PDF destination.

References: [Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[getUser token verification](https://supabase.com/docs/reference/javascript/auth-getuser).
