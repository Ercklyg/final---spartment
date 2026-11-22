import test from 'node:test';
import assert from 'node:assert/strict';
import { unreadAnnouncements, acknowledgeAnnouncement } from './announcements.js';
const id = '66666666-6666-4666-8666-666666666666';
function fixture(result) {
  const calls = [];
  const query = {};
  for (const method of ['select','eq','order','range','update','maybeSingle']) query[method] = (...args) => { calls.push([method,...args]); return query; };
  query.then = resolve => resolve(result);
  return { calls, req: { role: 'tenant', user: { id: 'tenant-id' }, params: { id }, body: { revision: 2 }, query: { offset: '25', limit: '25' }, db: { from(table) { assert.equal(table,'notifications'); return query; } } } };
}
test('unread announcement pagination is scoped to the tenant and oldest first', async () => {
  const { calls, req } = fixture({ data: [{ id }], count: 30 });
  assert.deepEqual(await unreadAnnouncements(req), { data: [{ id }], total: 30, offset: 25, limit: 25 });
  assert.ok(calls.some(call => call[0]==='eq' && call[1]==='tenant_id' && call[2]==='tenant-id'));
  assert.ok(calls.some(call => call[0]==='eq' && call[1]==='is_read' && call[2]===false));
  assert.deepEqual(calls.slice(-3), [['order','created_at',{ascending:true}],['order','id'],['range',25,49]]);
});
test('acknowledgement checks ownership, announcement kind, and displayed revision', async () => {
  const { calls, req } = fixture({ data: { id } });
  assert.deepEqual(await acknowledgeAnnouncement(req), { ok: true });
  assert.ok(calls.some(call => call[0]==='eq' && call[1]==='announcement_revision' && call[2]===2));
  assert.ok(calls.some(call => call[0]==='eq' && call[1]==='tenant_id' && call[2]==='tenant-id'));
  assert.equal(calls[0][1].is_read, true);
  await assert.rejects(acknowledgeAnnouncement(fixture({ data: null }).req), error => error.status===409);
});
test('non-tenant callers and invalid pagination or revisions are rejected', async () => {
  for (const role of ['admin', undefined]) {
    await assert.rejects(unreadAnnouncements({ role }), error => error.status===403);
    await assert.rejects(acknowledgeAnnouncement({ role }), error => error.status===403);
  }
  await assert.rejects(unreadAnnouncements({ ...fixture({}).req, query:{limit:101} }), error => error.status===400);
  await assert.rejects(acknowledgeAnnouncement({ ...fixture({}).req, body:{revision:0} }), error => error.status===400);
});
