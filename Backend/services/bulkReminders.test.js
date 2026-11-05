import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reminderScope, previewBulkReminders, sendBulkReminders } from './bulkReminders.js';
import { addReminderTimes } from '../models/notifications.js';

test('bulk reminder scope accepts only the three requested audiences and a valid type/month', () => {
  for (const audience of ['all_unpaid', 'overdue', 'partially_paid']) {
    assert.deepEqual(reminderScope({ month: '2026-11', type: 'rent', audience }), { p_month: '2026-11-01', p_type: 'rent', p_audience: audience });
  }
  for (const input of [null, {}, { month: '2026-13', type: 'rent', audience: 'overdue' }, { month: '2026-11', type: 'other', audience: 'overdue' }, { month: '2026-11', type: 'rent', audience: 'Paid' }]) assert.throws(() => reminderScope(input), { status: 400 });
});

test('preview is read-only and ignores table pagination/search/status filters', async () => {
  const result = { eligibleBills: 30, tenantCount: 26, skippedBills: 2 };
  const db = { async rpc(name, args) {
    assert.equal(name, 'preview_bill_reminders');
    assert.deepEqual(args, { p_month: '2026-11-01', p_type: 'utility', p_audience: 'overdue' });
    return { data: result };
  } };
  assert.deepEqual(await previewBulkReminders({ db, query: { month: '2026-11', type: 'utility', audience: 'overdue', offset: 25, search: 'one tenant', status: 'Paid' } }), result);
});

test('send passes a stable operation ID with server-controlled scope, not client bill lists', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const body = { month: '2026-11', type: 'rent', audience: 'all_unpaid', id, billIds: ['untrusted'] };
  const db = { async rpc(name, args) {
    assert.equal(name, 'send_bulk_bill_reminders');
    assert.deepEqual(args, { p_month: '2026-11-01', p_type: 'rent', p_audience: 'all_unpaid', p_id: id });
    return { data: { sentTenants: 1, sentBills: 2 } };
  } };
  assert.equal((await sendBulkReminders({ db, body })).sentBills, 2);
  await assert.rejects(sendBulkReminders({ db, body: { ...body, id: 'invalid' } }), { status: 400 });
});

test('database errors produce safe preview/send messages', async () => {
  const db = { async rpc() { return { error: { message: 'Internal database detail' } }; } };
  const scope = { month: '2026-11', type: 'rent', audience: 'overdue' };
  await assert.rejects(previewBulkReminders({ db, query: scope }), { status: 503, message: 'Unable to preview reminders. Please retry.' });
  await assert.rejects(sendBulkReminders({ db, body: { ...scope, id: '11111111-1111-4111-8111-111111111111' } }), { status: 503, message: 'Unable to confirm reminder delivery. Retry without changing the selection.' });
});

test('ledger reminder times include bills covered by grouped notifications', async () => {
  const db = { async rpc(name, args) {
    assert.equal(name, 'bill_reminder_times');
    assert.deepEqual(args, { p_ids: ['bill-one', 'bill-two'] });
    return { data: [{ bill_id: 'bill-one', created_at: '2026-11-05T00:00:00Z' }, { bill_id: 'bill-two', created_at: '2026-11-05T00:00:00Z' }] };
  } };
  const result = await addReminderTimes(db, [{ id: 'bill-one' }, { id: 'bill-two' }]);
  assert.equal(result[1].last_reminded_at, result[0].last_reminded_at);
});

test('bulk SQL includes authorization, shared cooldowns, grouping, locks and idempotent batch results', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202611050001_bulk_bill_reminders.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /batch\.admin_id<>auth\.uid\(\)/);
  assert.match(sql, /if batch\.result is not null then return batch\.result/);
  assert.match(sql, /order by b\.id for update/);
  assert.match(sql, /where not cooling_down group by tenant_id/);
  assert.match(sql, /interval '5 minutes'/);
  assert.match(sql, /n\.reminder_bill_ids @> array\[p_bill\]/);
  assert.match(sql, /p_audience='partially_paid' and paid\.amount>0/);
  assert.match(sql, /p_audience='overdue' and b\.due_date</);
  const routes = readFileSync(new URL('../routes/apiRoutes.js', import.meta.url), 'utf8');
  assert.match(routes, /router\.get\('\/billing\/reminders\/preview',requireAdmin/);
  assert.match(routes, /router\.post\('\/billing\/reminders\/bulk',requireAdmin/);
});
