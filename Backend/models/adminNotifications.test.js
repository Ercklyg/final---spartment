import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminNotifications } from './adminNotifications.js';

test('alerts honor urgency, date windows, paid/resolved exclusions and stable IDs', () => {
  const bill = (id, due_date, balance) => ({ id, due_date, balance, payments: [] });
  const notices = buildAdminNotifications({
    bills: [bill('new', '2026-10-30', 100), bill('old', '2026-10-01', 100), bill('paid', '2026-09-01', 0), bill('soon', '2026-11-07', 100), bill('later', '2026-11-08', 100)],
    leases: [{ id: 'near', status: 'active', lease_end_date: '2026-11-02' }, { id: 'far', status: 'active', lease_end_date: '2026-12-01' }, { id: 'ended', status: 'ended', lease_end_date: '2026-10-01' }],
    rooms: [{ id: 'ready', status: 'available', created_at: '2026-10-29' }, { id: 'occupied', status: 'occupied' }],
    requests: [{ id: 'urgent', priority: 'Urgent', status: 'New', created_at: '2026-10-30' }, { id: 'done', priority: 'Urgent', status: 'Resolved' }],
    inquiries: [{ id: 'older', status: 'New', created_at: '2026-10-28' }, { id: 'newer', status: 'New', created_at: '2026-10-30' }],
  }, '2026-10-31');
  assert.deepEqual(notices.map(n => n.id), ['bill:old', 'bill:new', 'lease:near', 'request:urgent', 'bill:soon', 'inquiry:newer', 'room:ready', 'inquiry:older']);
  assert.equal(notices.find(n => n.id === 'bill:soon').priority, 'Normal');
});
