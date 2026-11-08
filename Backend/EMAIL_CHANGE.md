# Tenant email change

Tenants approve a change through their current mailbox and then enter a six-digit
OTP delivered to the new mailbox. This flow does not request a password or MFA.
Lost access to the current mailbox requires the administrator's separate account
recovery process; the application does not bypass ownership checks.

## Deployment order

1. Apply `supabase/migrations/202611080001_tenant_email_change.sql` using your
   normal reviewed Supabase migration process. Deploy this **before** the backend:
   authentication now calls `current_session_active()` to reject revoked JWTs.
2. Set these **Supabase Edge Function secrets**, never frontend variables:
   - `RECOVERY_STORAGE_SECRET`: the same private server-to-server secret already
     configured in `Backend/.env` for recovery storage.
   - `EMAIL_CHANGE_SMTP_USER`: the Gmail address already used as the SMTP
     username for password resets in Supabase Auth.
   - `EMAIL_CHANGE_SMTP_PASSWORD`: its Gmail **app password**, not the normal
     Google account password. Enter it directly in Supabase's Edge Function
     Secrets screen. Never paste it into chat, frontend code, or a committed file.
   - `EMAIL_CHANGE_APPROVAL_URL`: the frontend's exact approval URL, e.g.
     `https://final-spartment.vercel.app/approve-email-change`.
   The function uses Supabase's `SUPABASE_SERVICE_ROLE_KEY` or the existing
   `SUPABASE_SECRET_KEYS.spartment_production` secret. Neither belongs in the browser.
   The sender uses `smtp.gmail.com:465` with implicit TLS and the display name
   `Spartment`. Supabase Edge Functions block outgoing port 587; Gmail supports
   465 for secure SMTP. **Leave the existing Auth SMTP settings on port 587**:
   password-reset delivery is separate and remains unchanged. Auth's stored
   password is not automatically available to Edge Functions. If you no longer
   have that app password, create another app password for this sender; keep the
   existing one so password resets continue working. No Resend account is needed.
3. Deploy `supabase functions deploy email-change --use-api`. Its configuration
   disables platform JWT verification because it validates the private backend
   secret itself. Every tenant action additionally validates its Auth user and
   active session; old-mailbox approval validates the single-use capability.
4. Deploy the backend and frontend together. The frontend includes a Vercel
   rewrite for `/approve-email-change`. Other hosts must serve `index.html` there.
5. Schedule a private POST to the `email-change` Edge Function with JSON
   `{"action":"notify"}`, the project's `apikey`, and the `x-recovery-key`
   server secret, for example every five minutes. It retries durable completion
   notices that could not be sent immediately. Never put the secret in a URL.
   SMTP has no idempotency guarantee: a retry after an uncertain delivery or
   concurrent workers can send a duplicate completion notice. A stable Message-ID
   identifies the event; it does not guarantee that Gmail will deduplicate it.

No hosted configuration, credentials, migration, or deployment is changed by
adding these source files. Verify a real two-mailbox change in staging before
enabling the feature for tenants. Without the function and sender configuration,
email changes fail closed rather than updating an unverified address.

## Limits and failure handling

- Approval links and OTPs each last ten minutes; approval starts a fresh OTP window.
- Five wrong OTP guesses invalidate the code; resending requires a sixty-second wait.
- Five sends per account and destination email per hour, and twenty per IP per
  hour. Initial approval mail, approval-triggered OTP, and resends count as sends.
  Rate-limit reservations persist even if delivery fails; retry after cooldown.
- A new target email starts ownership verification again. Resending invalidates
  the previous approval link or code. Email scanners cannot approve through GET.
- One successful change per account per twenty-four hours. Only one request is
  pending per tenant. The backend never accepts a user ID supplied by the browser.
- The OTP uses a server-secret-bound digest; approval tokens have 256 bits of
  randomness. Raw OTPs and links are never stored in the database or logs.
- Auth's admin API performs the supported identity update. An Auth database
  trigger atomically consumes verification, synchronizes tenant assignments,
  deletes Auth sessions, and writes an audit event plus a durable notification.
  Database errors roll the entire transaction back. An unused verified request
  can be retried with its same code before expiry after a provider failure.
- The trigger blocks other tenant email-change paths until this verification
  succeeds. The tenant's permanent UUID and rental records are preserved.
- `current_session_active()` immediately rejects revoked sessions in API
  authentication and restoration, rather than waiting for access JWT expiry.
- Audit events include old/new email and user ID, but no credentials. Restrict
  access to service operators and apply your organization's retention policy.

## Verification

`npm run test:email-change` runs the SQL migration in an isolated in-memory
PostgreSQL engine and checks ownership steps, expiry, code reuse, attempt/send
limits, competing requests, database permissions, atomic rollback, and revocation.
`npx playwright test e2e/email-change.spec.js` checks tenant settings and approval
pages on desktop and mobile with mocked APIs. Neither command sends live email.
