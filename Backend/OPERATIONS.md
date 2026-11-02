# Spartment operations runbook

This runbook covers backups, restoration, deployment and incident response for
the Render backend, Vercel frontend and Supabase project. Keep provider access,
database passwords and recovery codes in a password manager, never in this file
or Git.

## Ownership and recovery targets

- Assign one primary administrator and one backup administrator for Render,
  Vercel, Supabase, GitHub and the domain registrar.
- For this small system, target a recovery time of four hours and a maximum of
  24 hours of data loss. Shorten those targets before relying on the application
  for higher-volume or legally sensitive operations.
- Review provider access and recovery methods every three months.

## Backup procedure

1. In Supabase, open **Database > Backups** and confirm the latest backup date.
   Paid projects receive managed daily backups; free projects should receive a
   manual logical export at least weekly.
2. Before a risky schema change, create a logical backup with the Supabase CLI
   using the current connection string from the dashboard. Export roles, schema
   and data as separate files following the official Supabase backup procedure.
3. Store backup files encrypted in a location outside Supabase. Record the UTC
   time, project reference, schema migration, application commit and operator.
4. Database backups contain Storage metadata but not the uploaded maintenance
   files themselves. Export the private `maintenance-attachments` bucket
   separately and keep its object paths unchanged so metadata still matches.
5. Keep at least four weekly exports and twelve monthly exports. Delete expired
   copies securely according to the property's retention policy.
6. Never place database URLs, access tokens, `.env` files or backup archives in
   this repository.

## Restore drill and emergency restoration

Test restoration into a separate Supabase project at least every three months.
Never test by overwriting production.

1. Announce maintenance and stop administrative writes such as billing,
   payments, tenant changes and request updates.
2. Select the most recent known-good backup from before the incident. Record the
   expected data-loss window.
3. Prefer the Supabase dashboard restore for a managed backup. For a logical
   backup, restore roles, schema and then data into a new project using the
   official CLI procedure.
4. Restore Storage objects separately, preserving bucket and object paths.
5. Apply any later repository migrations in order. Update Render's Supabase URL
   and key only after the replacement project passes validation.
6. Verify administrator and tenant sign-in, rooms, leases, bills, payments,
   requests, attachments, notifications and RLS isolation using test accounts.
7. Re-enable writes, monitor logs and document the actual recovery time and any
   missing records. Keep the old project read-only until sign-off.

## Deployment checklist

Before merging or pushing to `main`:

1. Run `node --test` in `Backend`.
2. Run `npm run test:e2e` in `Backend`.
3. Run `npm run lint` and `npm run build` in `Frontend`.
4. Preview database migrations before pushing them. Take a backup before any
   destructive or difficult-to-reverse migration.
5. Confirm new environment variables exist in Render/Vercel without copying
   their values into Git or logs.

After deployment:

1. Confirm Render reports a successful deploy and `GET /health` returns 200.
2. Confirm the production frontend loads, then smoke-test admin and tenant sign
   in, one read-only billing view and one test maintenance request.
3. Check Render logs for `[request-error]` and `[slow-request]`; use the request
   ID to correlate a user's failure.
4. If production behavior regresses, use Render **Deploys > Rollback** to select
   the last successful artifact. A dashboard rollback disables automatic deploys;
   re-enable them only after the bad change is corrected.

## Incident response

1. **Detect and classify.** Record start time, reporter, affected users and
   whether confidentiality, integrity or availability is affected.
2. **Contain.** For leaked credentials, revoke and replace them in the provider,
   update Render/Vercel, redeploy and invalidate active sessions when applicable.
   For a bad release, roll back. For suspected data corruption, stop writes.
3. **Preserve evidence.** Save relevant Render logs, request/error IDs, deploy
   commit, Supabase audit information and timestamps. Do not copy passwords,
   tokens, cookies or tenant documents into the incident notes.
4. **Recover.** Follow the restore procedure when data is damaged; otherwise
   deploy the smallest verified fix. Validate critical workflows before declaring
   recovery.
5. **Communicate.** Tell affected users what is unavailable, what they should
   avoid doing, and when the next update will be given. Do not speculate.
6. **Review.** Within two business days, document root cause, impact, timeline,
   corrective work and an owner/due date for every follow-up.

## Secret rotation checklist

The previously exposed Gemini key, VAPID private key, recovery storage secret
and recovery encryption key must be replaced. Generate new values in their
owning provider or approved local key generator, update Render first, redeploy,
verify the affected workflow, then revoke the old value. A new VAPID key pair
requires users to enable browser push again. Changing the recovery encryption
key invalidates password-recovery sessions created with the old key, so perform
it during a short announced maintenance window.

## Provider references

- Supabase database backups: https://supabase.com/docs/guides/platform/backups
- Supabase CLI backup/restore: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Render health checks: https://render.com/docs/health-checks
- Render rollbacks: https://render.com/docs/rollbacks
