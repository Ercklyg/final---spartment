import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGuestMessage, submitGuestMessage } from './guestMessages.js';

const id = '77777777-7777-4777-8777-777777777777';
const form = { fullName: ' Guest Name ', email: 'GUEST@example.test', contact: '', subject: ' General question ', message: ' Hello\nManagement ' };
test('guest messages accept either contact method, normalize input and ignore client-controlled status', () => {
  for (const contact of [{ email: form.email, contact: '' }, { email: '', contact: '09123456789' }, { email: form.email, contact: '09123456789' }]) {
    const record = validateGuestMessage({ id, form: { ...form, ...contact, status: 'Resolved', room_id: id } });
    assert.equal(record.full_name, 'Guest Name');
    assert.equal(record.email, contact.email ? 'guest@example.test' : null);
    assert.equal(record.phone, contact.contact || null);
    assert.equal(record.status, 'New');
    assert.equal(record.room_id, null);
    assert.equal(record.subject, 'General question');
    assert.equal(record.message, 'Hello\nManagement');
  }
});
test('guest messages reject missing contacts, invalid supplied values and empty or oversized content', () => {
  for (const fields of [{ email: '', contact: '' }, { email: 'bad', contact: '09123456789' }, { contact: 'not-a-phone' }, { contact: '1'.repeat(12) }, { fullName: ' ' }, { subject: '' }, { subject: 'x'.repeat(161) }, { message: ' ' }, { message: 'x'.repeat(4001) }]) {
    assert.throws(() => validateGuestMessage({ id, form: { ...form, ...fields } }), error => error.status === 400);
  }
  assert.throws(() => validateGuestMessage({ id: 'bad', form }), error => error.status === 400);
});
test('submission retains its ID for retry and exposes safe storage errors', async () => {
  const records = [];
  let error;
  const client = { from(name) { assert.equal(name, 'inquiries'); return { async insert(record) { records.push(record); return { error }; } }; } };
  assert.deepEqual(await submitGuestMessage(client, { id, form }), { ok: true });
  error = { code: '23505' };
  assert.deepEqual(await submitGuestMessage(client, { id, form }), { ok: true });
  assert.equal(records[0].id, records[1].id);
  error = { code: '42501', message: 'private database details' };
  await assert.rejects(submitGuestMessage(client, { id, form }), e => e.status === 400 && !e.message.includes('private database'));
});
