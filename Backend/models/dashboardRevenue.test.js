import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsSnapshot } from './adminAnalytics.js';
import { collectedForSelectedBills } from '../../Frontend/src/lib/adminAnalytics.js';

test('dashboard revenue counts payments for selected bills, including partial and advance payments', () => {
  const data = {
    rooms: [{ id: 'room', status: 'occupied', monthly_rate: 2500 }],
    profiles: [{ id: 'tenant', role: 'tenant' }],
    leases: [{ id: 'lease', room_id: 'room', tenant_id: 'tenant', status: 'active' }],
    bills: [
      { id: 'old', lease_id: 'lease', billing_period: '2026-01-01', due_date: '2026-01-31', rent_amount: 100 },
      { id: 'rent', lease_id: 'lease', billing_period: '2026-02-01', due_date: '2026-02-28', rent_amount: 2500 },
      { id: 'utility', lease_id: 'lease', billing_period: '2026-02-01', due_date: '2026-02-28', electricity_amount: 540, water_amount: 300 },
    ],
    payments: [
      { bill_id: 'old', amount: 100, payment_date: '2026-02-05' },
      { bill_id: 'rent', amount: 500.10, payment_date: '2026-02-06' },
      { bill_id: 'rent', amount: 99.90, payment_date: '2026-01-31' },
      { bill_id: 'utility', amount: 840, payment_date: '2026-02-10' },
      { bill_id: 'rent', amount: 1900, payment_date: '2026-03-01' },
    ],
    requests: [], inquiries: [],
  };
  const snapshot = analyticsSnapshot(data, '2026-02', '2026-03-02');
  assert.equal(snapshot.collected, 1440.10); // Receipts during February, including January arrears.
  assert.equal(collectedForSelectedBills(snapshot), 1440); // February bills through February 28.
  assert.equal(collectedForSelectedBills(analyticsSnapshot(data, '2025-12', '2026-03-02')), 0);
});

test('dashboard revenue sums decimal API amounts in cents and handles no selected bills', () => {
  assert.equal(collectedForSelectedBills({ selected: [{ paid: '0.10' }, { paid: '0.20' }, { paid: 0 }] }), 0.30);
  assert.equal(collectedForSelectedBills({ selected: [] }), 0);
  assert.equal(collectedForSelectedBills({}), 0);
});
