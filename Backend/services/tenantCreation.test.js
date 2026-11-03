import test from 'node:test';
import assert from 'node:assert/strict';
import { moveInDateError } from '../supabase/functions/_shared/tenancyDates.js';
import { createTenant } from './resourceService.js';

test('move-in dates use Manila midnight and allow today and earlier dates', () => {
  const beforeMidnight = new Date('2026-11-03T15:59:59Z');
  const afterMidnight = new Date('2026-11-03T16:00:00Z');
  assert.equal(moveInDateError('2026-11-02', beforeMidnight), null);
  assert.equal(moveInDateError('2026-11-03', beforeMidnight), null);
  assert.match(moveInDateError('2026-11-04', beforeMidnight), /cannot be in the future/);
  assert.equal(moveInDateError('2026-11-04', afterMidnight), null);
  assert.match(moveInDateError('2026-11-05', afterMidnight), /cannot be in the future/);
});

test('missing malformed and impossible move-in dates are rejected', () => {
  for (const date of [undefined, null, '', 20261103, '11/03/2026', '2026-02-30', '2026-11-03T00:00:00Z']) {
    assert.equal(moveInDateError(date), 'Enter a valid move-in date.');
  }
});

test('tenant API rejects future dates before invoking account provisioning', async () => {
  let invoked = false;
  const db = { functions: { invoke: async () => { invoked = true; return { data: { ok: true } }; } } };
  await assert.rejects(createTenant(db, {
    phone: '09123456789', emergencyPhone: '09987654321', moveIn: '9999-12-31',
  }), error => error.status === 400 && /cannot be in the future/.test(error.message));
  assert.equal(invoked, false);
});

test('tenant API accepts a move-in today with a future optional lease end', async () => {
  const moveIn = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const body = { phone: '09123456789', emergencyPhone: '09987654321', moveIn, leaseEnd: '9999-12-31' };
  let submitted;
  const db = { functions: { invoke: async (name, args) => {
    submitted = { name, ...args }; return { data: { ok: true } };
  } } };
  assert.deepEqual(await createTenant(db, body), { ok: true });
  assert.deepEqual(submitted, { name: 'create-tenant', body });
});
