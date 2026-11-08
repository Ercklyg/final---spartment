# Tenant email change

In tenant settings, select **Change** beside Email, enter the new address, then
enter the six-digit OTP sent there. The server checks email format and account
availability before sending. Entering the OTP proves access to the new mailbox.
The current email remains active until verification succeeds.

No password, MFA, current-email approval, or current-email notification is used.
This intentionally allows a person controlling an authenticated tenant session
to change the email without access to the existing mailbox.

## Deployment

1. Keep `RECOVERY_STORAGE_SECRET` identical in the backend and Supabase Edge
   Function secrets. Gmail delivery additionally requires these private secrets:
   - `EMAIL_CHANGE_SMTP_USER`: the Gmail SMTP username.
   - `EMAIL_CHANGE_SMTP_PASSWORD`: a Gmail app password, never the normal account
     password. Enter it directly in Supabase Secrets; do not commit or share it.
   `EMAIL_CHANGE_APPROVAL_URL` is no longer used and can be removed separately.
2. Deploy `supabase functions deploy email-change --use-api` to stop old-mailbox
   delivery. The function authenticates its private backend secret and verifies
   the tenant's Auth user and active session for all supported actions.
3. Apply migrations through `202611080002_email_change_new_mailbox_only.sql`.
   The initial migration creates storage, the atomic completion trigger and
   `current_session_active()`. The second removes approval tokens, expires any
   unfinished approval requests, and starts new requests at the OTP step.
   Successful-change cooldowns, existing accounts, and rental history remain.
4. Deploy the backend and frontend. The old `/approve` API returns HTTP 410;
   tenants with an old link should open settings and start again.
5. Remove any scheduled `{"action":"notify"}` retry job. Until removed, the
   function safely returns `{"ok":true,"skipped":true}` without sending mail.

An initial rollout must finish step 3 before enabling the new frontend. During
the short function/migration upgrade window, requests against the old database
fail closed and can be retried once the migration completes.

Gmail uses `smtp.gmail.com:465` with implicit TLS and sender name `Spartment`.
Supabase Edge Functions block outgoing port 587; password resets can keep their
existing Supabase Auth SMTP settings on 587. Auth's stored app password is not
automatically shared with Edge Functions. If necessary, create another app
password while preserving the one used for password resets. No Resend account
or approval-page URL is required.

## Limits and consistency

- OTPs expire after ten minutes and allow five incorrect attempts.
- Wait sixty seconds before resending or starting a replacement request.
- Allow five sends per account and destination email per hour, and twenty per
  IP per hour. Delivery failures still consume the reservation.
- Resending replaces the old code. Changing the address sends a fresh code to
  that address. Only one request is pending per tenant.
- Allow one successful change per twenty-four hours. Validate uniqueness again
  at completion and enforce database constraints for competing requests.
- The server uses the authenticated user's ID, never a browser-supplied ID.
  OTP hashes are bound to that user and the private server secret. Only the
  private Edge Function can access verification storage.
- Auth's admin API updates the identity. A database trigger atomically updates
  the tenant directory, consumes verification, deletes Auth sessions, and records
  an audit event. Any database failure rolls the transaction back.
- After success, sign in again with the new email. API authentication checks the
  session record so revoked access JWTs cannot continue using the backend.
- Audit events retain the old/new email and tenant ID without credentials. The
  legacy `notified_at` column is retained for history; events are not sent as email.
- The tenant UUID remains unchanged, preserving rental and payment records.

## Verification

`npm run test:email-change` executes both migrations in isolated PostgreSQL and
checks migration compatibility, OTP completion, expiry, reuse, limits, database
permissions, atomic rollback, revocation, and the absence of old-mailbox sends.
`npx playwright test e2e/email-change.spec.js` verifies the dialog's direct OTP
flow on desktop and mobile with mocked APIs. Neither command sends live mail.
