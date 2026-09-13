# Integration audit

Payment corrections are deployed in migration 202609130005_payment_corrections.sql.
Admin Billing → View payments → Correct payment / history accepts corrected amount,
date and reference with a required reason. The protected function locks the bill,
rejects stale edits and overpayments, saves before/after values and administrator
identity, recomputes bill status and notifies the tenant atomically. Retry IDs avoid
duplicate corrections. Authenticated clients cannot edit/delete the audit trail.
Corrections retain the payment ID; receipts and analytics use corrected values.
Historical reports therefore reflect current corrected records, not a frozen ledger.
This is a correction workflow, not a refund or payment-void workflow.

## Verification completed

- Live integration suite: tenant creation/login, assignments, bills, partial/full
  payments, requests, notifications, analytics, receipts and audited corrections.
- Cross-tenant access and admin-only mutation checks; stale correction, duplicate
  retry, audit tampering and overpayment rejection.
- Headless Edge at 1440px and 390px: actual sign-in, admin billing and correction
  history, receipt preview/PDF rendering, CSV download, tenant dashboard/settings.
- Mobile guest inquiry prefill and account-recovery guidance.
- Build, targeted lint and five calculation/receipt tests passed.
- Temporary users, rooms, leases, bills, payments, inquiries, requests, notifications
  and correction audits were removed after integration checks.

## Audit fixes

- Removed the reachable room grid's sample fallback. Legacy mock components remain
  in unused source files; they are not imported by active application routes.
- Guest inquiry now prefills building and room name instead of database UUID.
- Removed the disconnected Remember me checkbox; the app uses its existing saved
  session behavior. Forgot Password displays administrator recovery guidance.
- Guest Support opens chat. Inert Privacy/Terms buttons were replaced with guidance
  to ask management for its policies; no legal policy text was invented.

## Remaining limits

- Native printer selection and physical output need a manual device check. PDF
  generation was exercised in Chromium, not every supported browser/printer.
- Self-service forgotten-password email recovery is not implemented; recovery is
  administrator-assisted. Custom SMTP, legal policy content and production hosting
  remain deployment/operational decisions.
- Bills are created manually. There is no recurring scheduler, refunds/voids,
  automated move-out workflow, or historical occupancy ledger.
- Views refresh on navigation/manual refresh, not realtime subscriptions.
- This audit covers the workflows above, not an exhaustive security or load audit.

To repeat browser tests, start Vite on 127.0.0.1:5173 and run npm install in Backend, then set RUN_BROWSER=1 and run
node supabase/verify-tenants.mjs with the Supabase CLI signed in. Credentials stay
in memory. The browser runner uses installed Edge and isolated test accounts.
