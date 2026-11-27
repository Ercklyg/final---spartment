# Retired test-record classification

The test-account and test-room feature is removed by
`202611270001_remove_test_classification.sql`.

Existing accounts, rooms, leases, bills, payments, and receipts are preserved.
Formerly classified records become ordinary records included in directories,
public room availability, billing totals, bulk billing, reminders, analytics,
forecasts, and reports. Public listings still show available rooms only.

The migration removes classification controls, inheritance triggers, flags, and
classification-aware RPC parameters. It retains the old classification audit log
as historical evidence. Past migration files are retained for reproducible setup.
Tenant access policies and administrator-only financial operations remain intact.

Deploy the migration together with the matching backend and frontend updates.
The database change is transactional and does not delete business records.

Validation:

- `node --test models/removeTestClassification.test.js models/testBilling.test.js models/rooms.test.js`
- `npx playwright test e2e/test-records.spec.js`

The older `models/testRecords.test.js` covers historical migration behavior before
retirement; the removal test verifies the subsequent conversion and access rules.
