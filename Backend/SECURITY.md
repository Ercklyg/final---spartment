# Application security configuration

## Database privileges

Migration 009 removes blanket table/column permissions from public, anonymous
and authenticated roles. In particular those roles cannot truncate tables,
create triggers, edit profile roles, or directly edit financial records.
The browser roles receive only the reads, inserts and specific column updates
needed by the API. Existing RLS policies still enforce ownership and admin access.
Billing, account creation and tenancy mutations run through authorized database
functions. Privileged provisioning and limiter functions remain service-only.
Default grants for future objects created by the migration role are also narrowed;
new migrations must explicitly grant the access they require.

## Login throttling

The protected `recovery-state` function now also manages persistent login limits:

- Five login requests per normalized email in a fixed 15-minute window.
- Thirty login requests per IP (IPv6 addresses grouped by subnet) in that window.
- Both limits must allow the request. Password-change reauthentication shares
  the same protection. Validly formed requests count even when credentials succeed
  or the provider is unavailable. Limits expire automatically, without permanently
  locking or changing an account. Password recovery keeps its separate quota.
- HMAC-derived account/IP keys are stored instead of raw email/IP values. Counters
  live in a private database table and survive restarts. Storage failures fail closed.
- The function uses the existing server-to-server secret. It must be deployed and
  configured before login can work, even if local recovery memory mode is selected.

The limiter protects the Express endpoints; Supabase Auth also has its own limits.
The app does not trust arbitrary X-Forwarded-For headers. Behind a production
reverse proxy, configure Express trust proxy for the exact trusted proxy topology;
otherwise clients conservatively share the proxy's IP quota. Do not set blanket
trust in user-supplied forwarding headers.

## Browser sessions and CSRF

Supabase access and refresh tokens are set by Express as host-only HttpOnly
cookies. Login/session/refresh JSON contains only a user ID, email and expiry.
The frontend retains that display information in memory and removes the old
`spartment-session` localStorage entry. Existing users must sign in once after
this migration. No old localStorage credential is imported into a cookie.

Cookies use SameSite=Lax, Path=/, and the Secure flag in production. Production
names use the __Host- prefix; NODE_ENV=production always enables Secure. Local
HTTP development uses unprefixed cookies without Secure. Access-cookie expiry
matches the JWT; the refresh cookie lasts up to 14 days after its last refresh.
Logout clears both cookies even if provider revocation is unavailable, and the
response distinguishes that case. Already issued access tokens can remain valid
until Supabase expires them; HttpOnly does not promise immediate revocation or
eliminate every consequence of an XSS vulnerability.

Every modifying API request requires an exact Origin from FRONTEND_ORIGIN, the
custom X-Spartment-Request: 1 header, and application/json. CORS uses the same
explicit origin list and permits credentials. These checks apply to login,
logout, refresh, password recovery, and public submissions as well as authenticated
actions. The authenticated API includes an expected-user header to reject stale
requests if another tab switches the account. Authentication still verifies
the cookie's JWT with Supabase and reads the database role for every request.
The Express API no longer accepts browser-supplied bearer tokens or refresh tokens
in JSON. Edge Functions still verify the server-forwarded Supabase bearer token.

Use VITE_API_URL=/api locally: the Vite development proxy forwards /api to Express
without changing Origin. This avoids mixing localhost and 127.0.0.1 cookie sites.
When hosting, serve /api through the same site's reverse proxy, use HTTPS and
NODE_ENV=production, and set FRONTEND_ORIGIN to the exact HTTPS frontend origin.
Do not disable CSRF checks or change to wildcard origins to work around hosting.

The SMTP configuration and Gmail app password were not changed by this update.
