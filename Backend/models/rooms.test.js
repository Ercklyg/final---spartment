import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, updateRoom, deleteRoom } from './rooms.js';

const id = '11111111-1111-4111-8111-111111111111';
const input = { room: '102', building: 'Main Building', floor: 1, size: 9, rate: 6500.25, capacity: '2-3', notes: 'Updated description' };

function database(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        insert(value) { call.insert = value; return query; },
        update(value) { call.update = value; return query; },
        delete() { call.delete = true; return query; },
        async maybeSingle() { assert.ok(results.length, 'Unexpected database query'); return results.shift(); },
        async single() { return query.maybeSingle(); },
      };
      return query;
    },
  };
}

test('Room edits target one room and cannot overwrite occupancy, IDs or tenant rent', async () => {
  const updated = { id, room_number: '102', status: 'occupied' };
  const db = database([{ data: { id } }, { data: { id: 'building-id' } }, { data: updated }]);
  assert.deepEqual(await updateRoom(db, id, { ...input, status: 'available', id: 'other', monthly_rent: 1 }), updated);
  const mutation = db.calls[2];
  assert.deepEqual(mutation.filters, [['id', id]]);
  assert.deepEqual(mutation.update, {
    room_number: '102', building_id: 'building-id', floor: 1, size_sqm: 9,
    monthly_rate: 6500.25, capacity: '2-3 persons', description: 'Updated description',
  });
  assert.ok(db.calls.every(call => ['rooms', 'buildings'].includes(call.table)));
});

test('Adding a room still creates an available listing', async () => {
  const db = database([{ data: { id: 'building-id' } }, { data: { id } }]);
  await createRoom(db, { ...input, status: 'occupied' });
  assert.equal(db.calls[1].insert.status, 'available');
});

test('Duplicate room numbers return a conflict with an actionable message', async () => {
  const db = database([{ data: { id } }, { data: { id: 'building-id' } }, { error: { code: '23505' } }]);
  await assert.rejects(updateRoom(db, id, input), error => error.status === 409 && /already exists/.test(error.message));
});

test('Invalid room details do not write to the database', async () => {
  for (const invalid of [{ floor: 1.5 }, { size: 7.99 }, { size: 14.01 }, { rate: -1 }, { capacity: '5' }, { room: 'abc' }]) {
    const db = database([{ data: { id } }]);
    await assert.rejects(updateRoom(db, id, { ...input, ...invalid }), error => error.status === 400);
    assert.ok(db.calls.every(call => !call.update && !call.insert));
  }
});

test('Missing rooms cannot be edited or reported as successfully deleted', async () => {
  await assert.rejects(updateRoom(database([{ data: null }]), id, input), error => error.status === 404);
  await assert.rejects(deleteRoom(database([{ data: null }]), id), error => error.status === 404);
});

test('Larger 13 and 14 sqm rooms can be created and edited', async () => {
  for (const size of [13, 14]) {
  const createDb = database([{ data: { id: 'building-id' } }, { data: { id } }]);
  await createRoom(createDb, { ...input, size });
  assert.equal(createDb.calls[1].insert.size_sqm, size);
  const updateDb = database([{ data: { id } }, { data: { id: 'building-id' } }, { data: { id } }]);
  await updateRoom(updateDb, id, { ...input, size });
  assert.equal(updateDb.calls[2].update.size_sqm, size);
  }
});

test('Room deletion respects database protection of tenant and lease history', async () => {
  const db = database([{ error: { code: '23503', message: 'Foreign key violation' } }]);
  await assert.rejects(deleteRoom(db, id), error => error.status === 409 && /cannot be deleted/.test(error.message));
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].table, 'rooms');
  assert.deepEqual(db.calls[0].filters, [['id', id]]);
});

test('Unreferenced rooms can be deleted', async () => {
  const db = database([{ data: { id } }]);
  assert.deepEqual(await deleteRoom(db, id), { ok: true, id });
  assert.equal(db.calls[0].delete, true);
});

test('Invalid room IDs are rejected before querying', async () => {
  const db = database([]);
  await assert.rejects(deleteRoom(db, 'invalid'), error => error.status === 400);
  await assert.rejects(updateRoom(db, 'invalid', input), error => error.status === 400);
  assert.equal(db.calls.length, 0);
});
