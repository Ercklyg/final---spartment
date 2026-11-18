# Saved AI recommendations

Apply `migrations/202611190001_saved_ai_recommendations.sql` before deploying the updated backend. The saved-result table and functions are required even when Gemini is unavailable.

The latest successful Gemini result is stored per administrator, report month, and reporting period. Only its owner can read it. Authenticated administrators write through validated database functions; tenants and anonymous callers cannot read or write these records. Recommendations can contain tenant information, so client previews remain in memory and are cleared on account changes rather than being persisted to browser storage.

A successful generation replaces that scope's saved cards and generation timestamp. Failed attempts update separate failure metadata and preserve the original cards and timestamp. Request start times prevent delayed requests from overwriting newer results. Existing results from the former process-memory cache cannot be recovered after that process has stopped; the first successful generation after this deployment starts the durable history.

## Evidence and AI actions

The backend prepares facts and a catalog of allowed actions. Gemini selects and prioritizes up to four `{factId, actionId}` pairs, with at most one action per category. It does not write the displayed names, numbers, titles, or advice. The backend assembles those fields from the selected fact and approved action wording. The UI separates **Recorded** evidence from the **Suggested action**. The footer identifies these as AI-selected actions.

Overdue bills are grouped by tenant UUID, with duplicate bill IDs excluded. Six-month late-bill counts are joined by tenant UUID rather than display name. Property totals have distinct fact IDs and cannot be used for tenant-specific payment actions. Unsupported IDs, incompatible actions, extra free-text fields, and duplicate categories are rejected. Missing facts are omitted, rather than replaced with invented zeroes. Names and room references are not included in the Gemini prompt; the backend supplies them after selection. There is no loyalty-discount action or unsupported payment-history claim.

New saved cards include `evidenceVersion: 1`, the fact/action IDs, and their recorded evidence. This uses the existing JSON storage and needs no additional migration. Earlier free-text cards are excluded from display and fallback. A successful generation replaces them; a failed generation shows the empty fallback state until a valid result exists. Evidence in saved cards remains a snapshot at its original generation time, not a live promise that balances have stayed unchanged.

On a usage-limit response, the dashboard shows the saved cards with their original generation date and time in Asia/Manila. Other failures show a temporary-unavailable message. If nothing has been saved, the dashboard explains that no previous AI recommendations exist for the report. It never creates local recommendations or a generation timestamp for a failed request.

Failed scopes do not retry automatically on reload. The administrator can choose **Try again**. The button is disabled while a request is in progress and saved cards stay visible. Successful recovery clears the failure notice. Successful cached results retain the existing twelve-hour refresh policy; failures stop that background refresh path. No quota reset time is assumed.

Each model attempt allows up to fifteen seconds. The dashboard allows forty seconds for the two model attempts plus report loading and result storage. Restart or redeploy the backend after changing this request timeout.

Validation:

```powershell
cd Backend
npm run test:ai-recommendations
npx playwright test e2e/ai-fallback.spec.js
npx playwright test e2e/ai-evidence.spec.js
```

The database tests execute the migration in PGlite, including row security, function permissions, payload validation, evidence persistence, account/report isolation, and stale-request ordering. Service tests cover correct tenant attribution, duplicate bills/names, unsupported AI associations, legacy-card exclusion, quota failures, unavailable providers, invalid responses, bounded attempts, restarts, and recovery. Browser tests cover evidence labels, desktop and 320-pixel mobile rendering, navigation, reload restoration, retry loading, and empty fallback states with mocked APIs.
