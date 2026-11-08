import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { requireActiveSession } from './activeSession.js';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';
const hash = char => char.repeat(64);
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text not null);
    create unique index auth_email_unique on auth.users(lower(email));
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,role text);
    create table public.tenant_assignments(id uuid primary key references auth.users(id) on delete cascade,email text unique);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202611080001_tenant_email_change.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await db.exec('truncate auth.users cascade; truncate public.tenant_email_send_limits;');
  await db.query(`insert into auth.users values($1,'old@example.test'),($2,'other@example.test')`, [id, other]);
  await db.query(`insert into public.profiles values($1,'tenant'),($2,'tenant')`, [id, other]);
  await db.query(`insert into public.tenant_assignments values($1,'old@example.test'),($2,'other@example.test')`, [id, other]);
  await db.query('insert into auth.sessions values($1,$2)', [sessionId, id]);
});
after(async () => { await db?.close(); });
async function action(name, overrides = {}) {
  const p = { user: id, email: 'new@example.test', approval: hash('a'), otp: hash('b'), ip: hash('c'), ...overrides };
  const result = await db.query('select public.tenant_email_change($1,$2,$3,$4,$5,$6) result', [name, p.user, p.email, p.approval, p.otp, p.ip]);
  return result.rows[0].result;
}
async function ageSend() { await db.exec("update public.tenant_email_changes set sent_at=now()-interval '61 seconds'"); }
async function ready() { await action('start'); await action('approve'); return action('verify'); }
async function email() { return (await db.query('select email from auth.users where id=$1', [id])).rows[0].email; }

test('old-mailbox approval and new-mailbox OTP are both required; completion is atomic', async () => {
  assert.equal((await action('verify')).status, 400);
  assert.equal((await action('start')).stage, 'approval');
  assert.equal((await action('verify')).status, 400);
  await assert.rejects(db.query('update auth.users set email=$1 where id=$2', ['new@example.test', id]), /verification required/);
  assert.equal((await action('approve')).stage, 'otp');
  assert.equal(await email(), 'old@example.test');
  assert.equal((await action('verify')).newEmail, 'new@example.test');
  await db.query('update auth.users set email=$1 where id=$2', ['new@example.test', id]);
  assert.equal(await email(), 'new@example.test');
  assert.equal((await db.query('select email from public.tenant_assignments where id=$1', [id])).rows[0].email, 'new@example.test');
  assert.equal((await db.query('select count(*)::int n from auth.sessions')).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int n from public.tenant_email_events where notified_at is null')).rows[0].n, 1);
  assert.equal((await action('start', { email: 'next@example.test' })).status, 429);
  assert.equal((await action('verify')).status, 429);
});

test('rejects unchanged, malformed and occupied email addresses without leaking registration', async () => {
  assert.match((await action('start', { email: 'OLD@example.test' })).error, /current email/);
  assert.equal((await action('start', { email: 'other@example.test' })).error, 'This email cannot be used.');
  assert.equal((await action('start', { email: 'invalid' })).status, 400);
  assert.equal((await action('start', { email: 'a'.repeat(255) + '@test.com' })).status, 400);
});

test('codes and approval links expire and approvals are single use', async () => {
  await action('start');
  await db.exec("update public.tenant_email_changes set expires_at=now()-interval '1 second'");
  assert.equal((await action('approve')).status, 400);
  assert.equal((await action('status')).stage, 'expired');
  await ageSend(); await action('start'); await action('approve');
  assert.equal((await action('approve')).status, 400);
  await db.exec("update public.tenant_email_changes set expires_at=now()-interval '1 second'");
  assert.equal((await action('verify')).status, 400);
  assert.equal((await action('resend')).status, 400);
});

test('five incorrect attempts invalidate even the correct code', async () => {
  await action('start'); await action('approve');
  for (let i = 0; i < 5; i++) assert.match((await action('verify', { otp: hash('e') })).error, /Incorrect/);
  assert.match((await action('verify')).error, /no longer valid/);
  assert.equal(await email(), 'old@example.test');
});

test('resends have cooldowns, rotate codes and approval tokens, and retain account limits', async () => {
  await action('start');
  assert.equal((await action('resend')).status, 429);
  await ageSend(); await action('resend', { approval: hash('e') });
  assert.equal((await action('approve')).status, 400);
  await action('approve', { approval: hash('e') });
  await ageSend(); await action('resend', { otp: hash('f') });
  assert.equal((await action('verify')).status, 400);
  assert.equal((await action('verify', { otp: hash('f') })).newEmail, 'new@example.test');
  await ageSend(); await action('resend', { otp: hash('e') });
  await ageSend(); assert.equal((await action('start', { email: 'different@example.test' })).status, 429);
});

test('changing the target requires a new approval and invalidates the prior OTP', async () => {
  await ready(); await ageSend();
  assert.equal((await action('start', { email: 'different@example.test', approval: hash('e') })).stage, 'approval');
  assert.equal((await action('verify')).status, 400);
  assert.equal((await action('approve')).status, 400);
  await assert.rejects(db.query('update auth.users set email=$1 where id=$2', ['new@example.test', id]), /verification required/);
});

test('database rejects a duplicate claimed after verification without consuming request or revoking sessions', async () => {
  await ready();
  await db.query('insert into auth.users values(gen_random_uuid(),$1)', ['new@example.test']);
  await assert.rejects(db.query('update auth.users set email=$1 where id=$2', ['new@example.test', id]));
  assert.equal(await email(), 'old@example.test');
  assert.equal((await action('status')).stage, 'ready');
  assert.equal((await db.query('select count(*)::int n from auth.sessions')).rows[0].n, 1);
  assert.equal((await db.query('select count(*)::int n from public.tenant_email_events')).rows[0].n, 0);
});

test('overlapping start requests keep one pending request and one send reservation', async () => {
  const results = await Promise.all([action('start'), action('start', { email: 'different@example.test' })]);
  assert.equal(results.filter(r => r.stage === 'approval').length, 1);
  assert.equal(results.filter(r => r.status === 429).length, 1);
  assert.equal((await db.query('select count(*)::int n from public.tenant_email_changes')).rows[0].n, 1);
});

test('destination and IP limits apply across accounts and reset after the hour', async () => {
  const emailKey = 'email:' + createHash('sha256').update('new@example.test').digest('hex');
  await db.query("insert into public.tenant_email_send_limits values($1,5,now()+interval '1 hour')", [emailKey]);
  assert.equal((await action('start')).status, 429);
  assert.equal((await action('start', { user: other, ip: hash('e') })).status, 429);
  await db.exec('truncate public.tenant_email_send_limits');
  await db.query("insert into public.tenant_email_send_limits values($1,20,now()+interval '1 hour')", ['ip:' + hash('c')]);
  assert.equal((await action('start')).status, 429);
  await db.exec("update public.tenant_email_send_limits set expires_at=now()-interval '1 second'");
  assert.equal((await action('start')).stage, 'approval');
});

test('browser database roles cannot inspect credentials or authorize changes', async () => {
  await action('start');
  try {
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.tenant_email_changes'), /permission denied/);
    await assert.rejects(action('approve'), /permission denied/);
  } finally { await db.exec('reset role'); }
});

test('revoked access JWT sessions are rejected immediately', async () => {
  await db.query("select set_config('request.jwt.sub',$1,false),set_config('request.jwt.claims',$2,false)", [id, JSON.stringify({ session_id: sessionId })]);
  assert.equal((await db.query('select public.current_session_active() active')).rows[0].active, true);
  await ready(); await db.query('update auth.users set email=$1 where id=$2', ['new@example.test', id]);
  assert.equal((await db.query('select public.current_session_active() active')).rows[0].active, false);
  await assert.rejects(requireActiveSession({ rpc: async () => ({ data: false }) }), error => error.status === 401);
  await assert.rejects(requireActiveSession({ rpc: async () => ({ error: {} }) }), error => error.status === 503);
});
