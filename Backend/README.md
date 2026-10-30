# Spartment backend

The application now uses this flow:

Frontend React -> Express API -> Supabase Auth / database / protected functions

## Start both applications

In one terminal:

```powershell
cd Backend
npm run dev
```

In another terminal:

```powershell
cd Frontend
npm run dev
```

Express listens on http://127.0.0.1:5000. Frontend/.env.local contains only
VITE_API_URL=/api for its server connection through Vite's development proxy. The frontend has
no Supabase SDK, credentials, database queries, or RPC calls. Frontend lib files
are HTTP wrappers, React hooks and display/receipt formatting only.

Backend/.env contains SUPABASE_URL, SUPABASE_ANON_KEY, PORT, HOST,
FRONTEND_ORIGIN and IDLE_TIMEOUT_MINUTES. The URL and public key remain server-side. The hosted protected
create-tenant function uses its own server-provided service-role credentials.
Never place a service-role key in browser code.

## Structure

- server.js: server startup and security/error middleware.
- routes/: authentication, public, tenant and administrator endpoints.
- controllers/: HTTP request/response handlers.
- services/: application operations and validation.
- models/: all database access, account/billing calculations and report generation.
- config/: per-request Supabase client using the verified caller token.
- middleware/: bearer token verification, role checks and error handling.
- supabase/: migrations, RLS policies, transaction functions and Edge Functions.

Normal application operations use each user's token and enforce database RLS.

## Forgotten-password recovery

The login page includes email recovery for tenants and admins and a separate `/reset-password` page.
Finish the Supabase redirect URL and email template configuration described in
[supabase/PASSWORD_RECOVERY.md](supabase/PASSWORD_RECOVERY.md). The backend handles
email requests, recovery-token verification and password updates. SMTP credentials
stay in Supabase. Migration 007 adds private storage for encrypted recovery
sessions and per-email request counters. Hosted storage also requires the
protected `recovery-state` function and server-only keys described in that guide.

## Frontend API routes

Public: POST /api/auth/login, POST /api/auth/refresh, GET /api/public/rooms,
POST /api/public/inquiries.

Authenticated: GET /api/auth/profile, POST /api/auth/logout,
POST /api/auth/password, GET /api/account, GET /api/billing,
GET /api/payments/:id/receipt, GET /api/requests, POST /api/requests/submit,
GET /api/notifications, POST /api/notifications/read.

Administrator: GET/POST /api/tenants, GET/POST /api/rooms,
POST /api/tenants/:id/move-out, POST /api/tenants/:id/transfer,
GET /api/tenants/:id/leases,
PATCH /api/rooms/:id/status, GET /api/billing/workspace,
PATCH /api/rooms/:id, DELETE /api/rooms/:id,
POST /api/billing/bills, POST /api/billing/payments,
POST /api/payments/corrections, GET /api/payments/:id/corrections,
GET /api/requests/workspace, PATCH /api/requests/:id,
PATCH /api/inquiries/:id, GET /api/analytics?month=YYYY-MM&period=Monthly.

Room listing edits cover building, room number, floor, size, monthly rate,
capacity and description; they do not change existing lease rents or occupancy.
Deletion is blocked for rooms referenced by tenant assignments, leases or requests.
Existing databases need migration `202609140001_room_management.sql` for the room
edit/delete permissions (run `npm run db:preview`, then `npm run db:push`).
Migration `202609140003_room_size_14.sql` expands supported room sizes to 8–14 sqm,
matching the add/edit form and backend validation.

The browser sends HttpOnly session cookies; access and refresh tokens are never
returned in login JSON or stored by frontend JavaScript. Requests include a custom
CSRF header and are checked against FRONTEND_ORIGIN. Refreshing an expired session
goes through Express. See [SECURITY.md](SECURITY.md) for login limits, cookie flags,
database permissions and same-origin proxy configuration. Sign in again once
after upgrading from the former localStorage session.

## Database setup and tenant lifecycle

See [supabase/SETUP.md](supabase/SETUP.md) for a complete fresh-project schema
and the migration workflow for an existing database. `npm run db:schema` exports
schema definitions only from the linked project; it does not export account data.

Move-out and transfer endpoints require an administrator and the following JSON:

```json
{
  "id": "a-new-operation-uuid",
  "leaseId": "the-current-active-lease-uuid",
  "date": "2026-09-13"
}
```

Transfers also require `roomId` (destination UUID) and `rent` (positive amount);
`leaseEnd` is optional. The effective date cannot be in the future or before
move-in. Reuse the same operation ID and payload when retrying an uncertain
request. The transaction checks the expected active lease, reserves the target
room, releases the previous room, records an audit event and notifies the tenant.
Move-out archives the assignment; account, previous leases, bills and payments
remain available. These endpoints are ready for future tenant-screen controls.

Resource lists support `offset` and `limit` (up to 1000). Workspace readers fetch
multiple database pages so room, inquiry, request and correction lists are not
silently cut off at Supabase's response limit. Invalid sessions return 401;
temporary Auth or profile lookup failures return 503 without forcing sign-out.

## Performance queries

Migration 008 moves analytics and tenant balance calculations into RLS-protected
database functions and adds indexes for billing dates and ordered lists.
The dashboard no longer downloads seven complete tables; CSV detail is retrieved
only when Export is clicked. Existing historical cutoff and payment-date rules
are preserved. Outstanding and selected-month detail remains available in reports.

- `GET /api/tenants?offset=0&limit=25` returns `data`, `total`, `offset`, `limit`.
- `GET /api/billing/workspace?month=2026-09&type=rent&status=All&search=&offset=0&limit=25`
  returns a page plus totals for the entire month/type. Search and status filtering
  happen before pagination. `GET /api/billing/leases` loads form options separately.
- `GET /api/notifications?offset=0&limit=25` returns a page, total unread count and
  `asOf`. Send that timestamp as `before` for subsequent pages. Mark-all requests
  use `{all:true,before:asOf}` and include unloaded notifications through that cutoff.
- These page endpoints accept limits from 1 to 100; the screens request 25.
- `GET /api/analytics?...&export=csv` requests full CSV detail on demand.

Account and notification operations reuse the middleware's verified user. All
database operations continue to use the caller's token and RLS. No report data
is cached across users. The older unfiltered billing workspace remains compatible
with existing clients, while the admin screen uses the paged endpoint.
