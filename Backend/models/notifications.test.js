import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNotifications } from './notifications.js';

test('tenant feed orders unread before dates and highlights only unpaid bills', async () => {
  const orders = [];
  const notices = ['unpaid', 'paid'].map((id, index) => ({ id, kind: 'bill', source_id: id, is_read: false, created_at: `2026-10-${20 + index}T00:00:00Z` }));
  const client = { from(table) {
    let head = false;
    const query = {
      select(columns, options) { head = !!options?.head; return query; },
      eq() { return query; }, lte() { return query; }, in() { return query; },
      order(column, options) { orders.push([column, options?.ascending ?? true]); return query; },
      range() { return query; },
      then(resolve, reject) {
        const result = table === 'bills' ? { data: [
          { id: 'unpaid', due_date: '2020-01-01', rent_amount: 100, electricity_amount: 0, water_amount: 0, payments: [] },
          { id: 'paid', due_date: '2020-01-01', rent_amount: 100, electricity_amount: 0, water_amount: 0, payments: [{ amount: 100 }] },
        ] } : { data: head ? null : notices, count: 2 };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  } };
  const result = await loadNotifications(client, 'tenant', { p_offset: 0, p_limit: 25 }, '2026-10-31T00:00:00Z');
  assert.deepEqual(orders, [['is_read', true], ['created_at', false], ['id', true]]);
  assert.equal(result.data[0].alert, 'Payment overdue');
  assert.equal(result.data[1].alert, null);
  assert.equal(result.unreadCount, 2);
});
