import test from 'node:test';
import assert from 'node:assert/strict';
import { listAnnouncements, saveAnnouncement, deleteAnnouncement } from './announcements.js';

const id = '66666666-6666-4666-8666-666666666666';
const base = () => ({ role: 'admin', body: { id, title: ' Notice ', message: ' Message\nSecond line ' }, params: { id }, query: {} });

test('service refuses non-admin callers before using the database', async () => {
  for (const role of ['tenant', undefined]) {
    for (const fn of [listAnnouncements, saveAnnouncement, deleteAnnouncement]) {
      await assert.rejects(fn({ ...base(), role }), error => error.status === 403);
    }
  }
});

test('validates input, trims text, and sends a stable ID to the transactional RPC', async () => {
  const calls = [];
  const req = { ...base(), db: { rpc: async (name, args) => { calls.push({ name, args }); return { data: { id } }; } } };
  assert.deepEqual(await saveAnnouncement(req), { id });
  await saveAnnouncement(req, true);
  await deleteAnnouncement(req);
  assert.deepEqual(calls, [
    { name: 'post_announcement', args: { p_id: id, p_title: 'Notice', p_message: 'Message\nSecond line' } },
    { name: 'edit_announcement', args: { p_id: id, p_title: 'Notice', p_message: 'Message\nSecond line' } },
    { name: 'delete_announcement', args: { p_id: id } },
  ]);
  for (const body of [{}, { id, title: ' ', message: 'x' }, { id, title: 'x'.repeat(151), message: 'x' }, { id, title: 'Title', message: 'x'.repeat(5001) }, { id: 'invalid', title: 'Title', message: 'Text' }]) {
    await assert.rejects(saveAnnouncement({ ...req, body }), error => error.status === 400);
  }
  assert.equal(calls.length, 3);
});

test('maps known failures to actionable status codes without exposing provider errors', async () => {
  for (const [code, status, message] of [['42501', 403], ['P0002', 404], ['23505', 409], ['22023', 400], ['P0001', 400, 'No current tenants to notify'], ['XX000', 503, 'internal detail']]) {
    const req = { ...base(), db: { rpc: async () => ({ error: { code, message } }) } };
    await assert.rejects(saveAnnouncement(req), error => error.status === status && !error.message.includes('internal detail'));
  }
});

test('announcement list uses bounded pagination and deterministic newest-first ordering', async () => {
  const calls = [];
  const query = {};
  for (const method of ['select', 'order', 'range']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.then = resolve => resolve({ data: [{ id }], count: 41 });
  const req = { ...base(), query: { limit: '20', offset: '20' }, db: { from: table => { assert.equal(table, 'announcements'); return query; } } };
  assert.deepEqual(await listAnnouncements(req), { data: [{ id }], total: 41, offset: 20, limit: 20 });
  assert.deepEqual(calls.slice(1), [['order', 'created_at', { ascending: false }], ['order', 'id'], ['range', 20, 39]]);
  await assert.rejects(listAnnouncements({ ...req, query: { limit: 1000 } }), error => error.status === 400);
});
