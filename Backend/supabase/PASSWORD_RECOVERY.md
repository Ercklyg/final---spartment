# Password recovery setup

SMTP delivery has been configured separately in the Supabase dashboard. This
application uses Supabase Auth to send recovery emails; Gmail credentials are
not needed in the source code or frontend environment. Recovery is available
for both tenant and administrator accounts. It does not require a service-role key.

## Required Supabase dashboard settings

The linked project's site URL, exact reset redirects, recovery subject and HTML
template have been applied from `config.toml`. The site URL is now
`http://localhost:5173`; SMTP settings were preserved. For another project,
follow the settings below. Email delivery still needs confirmation from a fresh request.

Recovery delivery failures now return a safe, specific message instead of the
generic server error. The backend logs `[auth] Recovery email failure` with
status, error code, error type and stage only. If delivery still fails, inspect
the hosted Auth log for `/recover`; never share SMTP passwords or reset tokens.

1. Open Authentication → URL Configuration. Add this exact additional redirect URL:

   `http://localhost:5173/reset-password`

2. Open Authentication → Email Templates → Reset Password. Keep an appropriate
   subject, such as `Reset your Spartment password`. Replace the message body with
   the contents of [templates/recovery.html](templates/recovery.html) and save.

   The button's link must be:

   ```html
   <a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
   ```

   This application verifies the token through Express. The default
   `{{ .ConfirmationURL }}` template creates a normal Supabase session and is
   not used by this reset page. Request a fresh email after changing the template.

## Local use

Run `npm run dev` in Backend and Frontend. The default recovery URL is
`http://localhost:5173/reset-password`. Open the email on the computer running
the app. A localhost link cannot reach this app from a tenant's phone.

To change the URL, set `PASSWORD_RESET_URL` in `Backend/.env`, restart the
backend, and add the same URL to Supabase's redirect allowlist. For a hosted
app, use HTTPS, allow the frontend origin in `FRONTEND_ORIGIN`, and serve the
React app at `/reset-password` as well as `/`.

## Implementation

- POST `/api/auth/forgot-password` validates the email and requests a recovery link
  through Supabase Auth. Its success response is the same for tenant, admin and unknown addresses.
  It allows three requests per normalized email address in a 15-minute window,
  starting with the first request. Changing browser sessions, devices, IP addresses,
  email capitalization or surrounding spaces does not provide extra attempts.
  Different email addresses have separate counters. Malformed emails are rejected
  before counting; valid requests count even if mail delivery fails. A blocked request
  returns HTTP 429, a Retry-After header and the remaining wait in minutes.
  With hosted storage enabled, counters use hashed email keys in the database
  and survive backend restarts; all backend instances share the same quota.
  Until activation, the local memory fallback resets counters on restart.
  Supabase's own email delivery limits and the API's general IP limit still apply.
- POST `/api/auth/verify-recovery` verifies the email token with the fixed
  `recovery` type and returns a short-lived opaque ticket. Supabase sessions
  stay on the backend. Both tenant and administrator accounts can receive a ticket.
  The incoming Supabase token is a bounded opaque string, not our 64-character
  ticket. Supabase's 56-character email hashes are accepted and verified by Auth.
  Opening a page without a valid link cannot reset a password.
- POST `/api/auth/reset-password` requires that ticket, validates the matching
  passwords, and updates the verified account. No account ID or target email
  supplied by the browser is used for the password update.
- Both password fields require 8–128 characters. The server also requires
  uppercase, lowercase, a number, and a symbol; Supabase's password policy still applies.
- Tickets expire after at most ten minutes and are consumed on success. Concurrent
  submissions using the same ticket are rejected. Password-policy errors allow
  another attempt during that session.
- The browser removes the recovery token from the URL before rendering. Only
  the temporary ticket is kept in tab storage so a page refresh can continue.
- Recovery bypasses the app's normal dashboard routing and existing login token.
  After completion, the local login session is cleared and the user signs in again.
- Successful resets request global Supabase sign-out. Previously issued access
  tokens may remain valid until expiry; this does not promise immediate revocation.
- The endpoints have their own request limits and return `Cache-Control: no-store`.

## Persistent recovery storage

Hosted recovery storage is activated for the linked Spartment-Final project.
The protected function is deployed and `Backend/.env` enables it. The example
environment keeps it disabled so a fresh setup is activated only after its
function and matching secret are configured.

Migration `202609130007_recovery_state.sql` creates private session and quota
tables. Neither anonymous users nor signed-in browser clients can access them.
The protected `recovery-state` Edge Function uses Supabase's platform-provided
service role internally. Express authenticates to that function with a separate
recovery-only secret; no service-role key is copied to Express.

`Backend/.env` needs two independently generated server-only keys:

- `RECOVERY_STORAGE_SECRET`: a random 32-byte secret encoded as hexadecimal,
  also configured as a secret for the hosted function.
- `RECOVERY_ENCRYPTION_KEY`: a random 32-byte key encoded as base64, retained
  only by Express. Sessions are encrypted with AES-256-GCM, bound to the hashed
  ticket ID. Store this key securely and use the same key across backend instances.
  Changing it invalidates pending reset sessions.

After applying migration 007, upload only `RECOVERY_STORAGE_SECRET` using
Supabase's secret settings or a private CLI env file, and deploy `recovery-state`.
Then set `RECOVERY_STORAGE_ENABLED=true` in `Backend/.env` and restart Express.
Never upload the encryption key or the whole Backend environment as function
secrets. The function checks its private shared secret even though gateway JWT
verification is disabled in `config.toml`.

With storage enabled, ticket claims are atomic across backend instances.
Expired sessions are removed as new sessions are stored, and quota entries
expire after 15 minutes. If the hosted store becomes unavailable, Express fails
closed instead of silently switching back to an independent memory quota.

The default `RECOVERY_STORAGE_ENABLED=false` keeps local development usable
until the function is activated. In this mode pending tickets and per-email
counters remain in process memory and do not survive a backend restart.

SMTP delivery and real account password changes were not exercised as part of
implementation. Do not use another person's account to verify this feature.

References: [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
