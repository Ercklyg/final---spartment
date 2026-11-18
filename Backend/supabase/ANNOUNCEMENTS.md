# Announcements

Apply `migrations/202611180001_announcements.sql` before deploying the updated backend and frontend. This adds the announcements table, admin read policy, recipient uniqueness index, and transactional publish/edit/delete functions. It does not modify existing tenant or notification data.

The migration was applied to the linked project on November 18, 2026, with user approval. A subsequent dry run confirmed the remote database is up to date. It also passed isolated PostgreSQL-compatible model tests. For other environments, review `npm run db:preview` and apply the reviewed migration with `npm run db:push` from `Backend` using normal deployment credentials. No service-role credential is sent to the browser.

Admins use `GET /api/announcements?limit=20&offset=0`, `POST /api/announcements`, `PATCH /api/announcements/:id`, and `DELETE /api/announcements/:id`. Posts contain `{ id, title, message }` with a stable UUID reused for retries. Edits require the title and message. Lists return `{ data, total, offset, limit }`; posts and edits return the announcement including `recipient_count`. Title and message limits are 150 and 5,000 characters.

Recipients are the active tenant assignments at publication. Editing preserves the original recipients, notification IDs and posting dates, updates the text, and clears read/seen/acknowledged states. An identical edit retry does not clear them again. Deletion removes only this announcement's notifications. All mutations are database transactions; a recipient failure rolls back the whole operation. New tenants do not receive old announcements retroactively.

Tenant feeds refresh through the existing polling and manual refresh controls. Announcements use the Account browser-notification preference; in-app notifications remain available regardless of that preference. Posting invokes existing best-effort push delivery. Editing does not invoke push delivery or create new notifications.

Validation commands:

```powershell
node --test models/announcements.test.js services/announcements.test.js models/notifications.test.js
npx playwright test e2e/announcements.spec.js
```

Before release, smoke-test one announcement with an admin and an active tenant: publish, refresh the tenant feed, mark read, edit and verify unread, then delete and verify removal. Check the backend's existing request-error logs for publication failures.
