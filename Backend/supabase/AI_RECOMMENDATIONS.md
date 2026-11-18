# Saved AI recommendations

Apply `migrations/202611190001_saved_ai_recommendations.sql` before deploying the updated backend. The migration has been tested locally; it has not been applied to the linked database as part of this change.

The latest successful Gemini result is stored per administrator, report month, and reporting period. Only its owner can read it. Authenticated administrators write through validated database functions; tenants and anonymous callers cannot read or write these records. Recommendations can contain tenant information, so client previews remain in memory and are cleared on account changes rather than being persisted to browser storage.

A successful generation replaces that scope's saved cards and generation timestamp. Failed attempts update separate failure metadata and preserve the original cards and timestamp. Request start times prevent delayed requests from overwriting newer results. Existing results from the former process-memory cache cannot be recovered after that process has stopped; the first successful generation after this deployment starts the durable history.

On a usage-limit response, the dashboard shows the saved cards with their original generation date and time in Asia/Manila. Other failures show a temporary-unavailable message. If nothing has been saved, the dashboard explains that no previous AI recommendations exist for the report. It never creates local recommendations or a generation timestamp for a failed request.

Failed scopes do not retry automatically on reload. The administrator can choose **Try again**. The button is disabled while a request is in progress and saved cards stay visible. Successful recovery clears the failure notice. Successful cached results retain the existing twelve-hour refresh policy; failures stop that background refresh path. No quota reset time is assumed.

Validation:

```powershell
cd Backend
npm run test:ai-recommendations
npx playwright test e2e/ai-fallback.spec.js
```

The database tests execute the migration in PGlite, including row security, function permissions, payload validation, account/report isolation, and stale-request ordering. Service tests cover quota failures, unavailable providers, invalid responses, bounded attempts, restarts, and recovery. Browser tests cover desktop and mobile rendering, reload restoration, retry loading, and empty fallback states with mocked APIs.
