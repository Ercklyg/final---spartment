import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const tenant = '33333333-3333-4333-8333-333333333333';
const items = [{ title: 'Review collections', text: 'Review 100 collected this month.', category: 'insight', page: 'Billing' }];
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    create table public.profiles(id uuid primary key,role text not null);
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611190001_saved_ai_recommendations.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await db.exec('reset role; truncate public.profiles cascade;');
  await db.query("insert into public.profiles values($1,'admin'),($2,'admin'),($3,'tenant')", [owner, other, tenant]);
  await as(owner);
});
after(async () => { await db?.close(); });
async function as(id, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.sub',$1,false)", [id]);
}
async function save({ month = '2026-11-01', period = 'Monthly', data = items, started = '2026-11-19T00:00:00Z' } = {}) {
  return (await db.query('select public.save_ai_recommendations($1,$2,$3,$4,$5) result', [month, period, JSON.stringify(data), '2026-11-19', started])).rows[0].result;
}
async function fail({ month = '2026-11-01', period = 'Monthly', reason = 'quota', started = '2026-11-19T00:01:00Z' } = {}) {
  return (await db.query('select public.record_ai_recommendation_failure($1,$2,$3,$4) result', [month, period, reason, started])).rows[0].result;
}
const savedRows = async () => (await db.query('select * from public.saved_ai_recommendations')).rows;

test('saving and restoring retains the original generation time; failures only change failure metadata', async () => {
  const original = await save();
  assert.deepEqual(original.items, items); assert.equal(original.admin_id, owner);
  const failed = await fail();
  assert.deepEqual(failed.items, original.items); assert.equal(failed.generated_at, original.generated_at);
  assert.equal(failed.reporting_cutoff, original.reporting_cutoff); assert.equal(failed.last_failure, 'quota'); assert.ok(failed.failed_at);
  const again = await fail({ reason: 'busy', started: '2026-11-19T00:02:00Z' });
  assert.equal(again.generated_at, original.generated_at); assert.deepEqual(again.items, items);
  assert.equal((await savedRows()).length, 1);
  await as(other); await as(owner);
  assert.equal((await savedRows())[0].generated_at.toISOString(), new Date(original.generated_at).toISOString());
});

test('a failure without saved insights stores no fabricated generation date or recommendations', async () => {
  const failed = await fail();
  assert.equal(failed.generated_at, null); assert.deepEqual(failed.items, []);
  assert.equal(failed.last_failure, 'quota'); assert.equal((await savedRows()).length, 1);
});

test('successful refresh replaces cards and clears the failure while keeping only one result for the scope', async () => {
  await save(); await fail();
  const updated = await save({ data: [{ ...items[0], title: 'Updated recommendation' }], started: '2026-11-19T00:03:00Z' });
  assert.equal(updated.last_failure, null); assert.equal(updated.failed_at, null);
  assert.equal(updated.items[0].title, 'Updated recommendation'); assert.ok(updated.generated_at);
  assert.equal((await savedRows()).length, 1);
});

test('delayed older requests cannot overwrite newer success or failure state', async () => {
  const current = await save({ started: '2026-11-19T00:03:00Z' });
  const older = await fail({ started: '2026-11-19T00:02:00Z' });
  assert.deepEqual(older, current);
  const failure = await fail({ started: '2026-11-19T00:04:00Z' });
  assert.deepEqual(await save({ started: '2026-11-19T00:03:00Z' }), failure);
});

test('storage separates months, periods and admin accounts', async () => {
  await save(); await save({ month: '2026-10-01' }); await save({ period: 'Yearly' });
  assert.equal((await savedRows()).length, 3);
  await as(other);
  assert.equal((await savedRows()).length, 0);
  await save({ data: [{ ...items[0], title: 'Other admin' }] });
  assert.equal((await savedRows()).length, 1);
  await as(owner);
  assert.equal((await savedRows()).length, 3);
  assert.ok((await savedRows()).every(row => row.admin_id === owner));
});

test('tenant and anonymous database callers cannot read or write saved insights', async () => {
  await save();
  await as(tenant);
  assert.equal((await savedRows()).length, 0);
  await assert.rejects(save(), error => error.code === '42501');
  await assert.rejects(fail(), error => error.code === '42501');
  await assert.rejects(db.exec("update public.saved_ai_recommendations set items='[]'"), /permission denied/);
  await as('', 'anon');
  await assert.rejects(savedRows(), /permission denied/);
  await assert.rejects(save(), /permission denied/);
  await as(owner);
  await assert.rejects(db.exec('delete from public.saved_ai_recommendations'), /permission denied/);
});

test('database functions reject invalid scope and unsanitized recommendation payloads', async () => {
  for (const data of [{}, [], Array.from({ length: 5 }, () => items[0]), [{ ...items[0], title: '' }], [{ ...items[0], text: 'x'.repeat(141) }], [{ ...items[0], category: 'invented' }], [{ ...items[0], page: 'Unknown' }]]) {
    await assert.rejects(save({ data }), error => error.code === '22023');
  }
  await assert.rejects(save({ month: '2026-11-02' }), error => error.code === '22023');
  await assert.rejects(save({ period: 'Daily' }), error => error.code === '22023');
  await assert.rejects(fail({ reason: 'raw provider error' }), error => error.code === '22023');
  assert.equal((await savedRows()).length, 0);
});
