import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAnalyticsReport } from './analyticsReport.js';

const args = { p_month: '2026-11-01', p_period: 'Monthly', p_export: false };
const request = (db, user = 'admin', token = 'session') => ({
  db, user: { id: user }, role: 'admin',
  headers: { cookie: `spartment-access=${token}; __Host-spartment-access=${token}` },
});

test('simultaneous reads share a calculation, while the next read reloads current records', async () => {
  let release, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const db = { async rpc(name, received) {
    assert.equal(name, 'analytics_report'); assert.deepEqual(received, args);
    const version = ++calls; await gate; return { data: { snapshot: { version } } };
  } };
  const first = loadAnalyticsReport(request(db), args);
  const second = loadAnalyticsReport(request(db), args);
  release();
  assert.deepEqual(await first, await second); assert.equal(calls, 1);
  assert.equal((await loadAnalyticsReport(request(db), args)).snapshot.version, 2);
});

test('reports stay isolated by account, session, month, grouping and export mode', async () => {
  let release, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const db = { async rpc() { const version = ++calls; await gate; return { data: { version } }; } };
  const tasks = [
    loadAnalyticsReport(request(db), args),
    loadAnalyticsReport(request(db, 'other-admin'), args),
    loadAnalyticsReport(request(db, 'admin', 'other-session'), args),
    loadAnalyticsReport(request(db), { ...args, p_month: '2026-10-01' }),
    loadAnalyticsReport(request(db), { ...args, p_period: 'Quarterly' }),
    loadAnalyticsReport(request(db), { ...args, p_export: true }),
  ];
  release();
  assert.equal(new Set((await Promise.all(tasks)).map(value => value.version)).size, 6);
});

test('failed shared queries are removed and can be retried', async () => {
  let calls = 0;
  const db = { async rpc() { return ++calls === 1 ? { error: {} } : { data: { recovered: true } }; } };
  const failures = await Promise.allSettled([loadAnalyticsReport(request(db), args), loadAnalyticsReport(request(db), args)]);
  assert.ok(failures.every(value => value.status === 'rejected' && value.reason.status === 503));
  assert.equal(calls, 1);
  assert.deepEqual(await loadAnalyticsReport(request(db), args), { recovered: true });
});
