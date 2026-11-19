# Test records

Rooms and tenant profiles have an explicit `is_test` flag. Historical bills and
payments keep their original records and inherit exclusion through their lease's
room or tenant. No account, room, bill, receipt, or payment is deleted.

Admin Rooms, Tenants, and Billing hide test records by default. Select **Show test
records** to open and manage them. Edit a room's **Test room** checkbox, or use
**Mark as test account** in tenant details. Operational summary cards continue to
exclude tests when the filter is enabled. Individual test bills and payments are
supported; bulk billing and bulk reminders exclude them. Test tenants retain sign-in
and access to their own records. Public room listings exclude test rooms.

Analytics, exported reports, occupancy, collection health, SMA history and
backtesting exclude test records. Saved AI action selections are reassembled from
the current operational facts on every request without a Gemini call. Their
original AI selection timestamp is preserved. Stale saved selections wait for an
explicit **Refresh insights** click instead of automatically using quota. If the
current report cannot be verified, no saved amounts are displayed.

## Deployment

Apply `202611190003_test_records.sql` before deploying the backend and frontend.
The migration classifies the two confirmed test room IDs (`4545` and `65465465`)
and tenant profiles linked to them. It adds an admin-only classification RPC,
change audit, and test inheritance for new leases. The prior raw billing-facts
function remains available behind its existing RLS for tenants' own histories.

From `Backend`, run `npm run db:preview` and verify that this is the only pending
migration, then `npm run db:push`. Deploy both app services together and reload
the browser so older cached reports are discarded. For a new installation, use
the existing schema setup followed by all subsequent migrations.

Verify the live inventory is 30 rooms, with the two test rooms visible only with
the filter enabled. Recheck live collections and forecasts after deployment:
their amounts depend on the latest payments and classifications, not fixed values.
Removing a room flag does not remove a tenant's independent test-account flag;
review both when restoring an account to operational use.

## Local verification

`node --test models/testRecords.test.js models/testBilling.test.js` exercises the
real SQL migration and RLS on an isolated PGlite database plus bulk billing
behavior. `npx playwright test e2e/test-records.spec.js` checks desktop and mobile
admin controls with mocked API responses. No live payments, reminders, or Gemini
requests are made by these checks.
