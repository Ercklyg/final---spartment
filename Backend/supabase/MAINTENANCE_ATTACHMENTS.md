# Resolved maintenance attachments

Apply `migrations/202611190002_resolved_maintenance_attachments.sql` before deploying this behavior. It replaces the attachment registration function and the storage INSERT policy. It does not delete requests, attachment records, or existing files, and it leaves read and cleanup policies available after resolution.

The backend checks the authenticated user's authorized maintenance request before uploading bytes. A resolved request returns HTTP 409 with code `request_resolved` and a clear explanation. The database registration function locks the request row before checking its status, which serializes registration against admin status updates. If a request is resolved after file upload but before registration, registration fails and the backend removes the newly uploaded file. A storage rejection caused by resolution returns the same conflict response.

The tenant sees a green completion notice and completed progress line. Resolved requests have no upload controls, including the hidden file input. Existing files remain viewable. A multi-file upload stops on a resolved response and refreshes the request status. The visible page checks status every thirty seconds and on focus or visibility changes, without replacing the current list with a loading skeleton. Reopening the request restores its attachment controls and upload permission, within the existing five-file limit.

Validation:

```powershell
cd Backend
npm run test:maintenance-attachments
npx playwright test e2e/resolved-maintenance.spec.js
```

The database tests run the original attachment migration and the new migration in PGlite, then check storage policies, direct registration, participant permissions, post-resolution reading and cleanup, and reopening. Model tests check preflight rejection and resolution between upload stages. Browser tests cover desktop and narrow-phone notices, file viewing, polling, reopening, and stopping a multi-file queue.
