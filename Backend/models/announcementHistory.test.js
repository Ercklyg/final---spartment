import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '11111111-1111-4111-8111-111111111111';
const tenant = '22222222-2222-4222-8222-222222222222';
const testTenant = '33333333-3333-4333-8333-333333333333';
const former = '44444444-4444-4444-8444-444444444444';
const id = '66666666-6666-4666-8666-666666666666';
let db, migrationRows;
async function as(user, role = 'authenticated') {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.sub',$1,false)", [user]);
}
async function post() { return (await db.query("select public.post_announcement($1,'Water notice','Please prepare water.') result", [id])).rows[0].result; }
const notices = async () => (await db.query("select * from public.notifications where kind='announcement' order by tenant_id")).rows;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;
    create table public.profiles(id uuid primary key,role text,is_test boolean default false);
    create table public.tenant_assignments(id uuid primary key references public.profiles(id),status text);
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
    create table public.notifications(id uuid primary key default gen_random_uuid(),tenant_id uuid references public.profiles(id),title text,message text,kind text,source_id uuid,is_read boolean default false,seen_at timestamptz,acknowledged_at timestamptz,created_at timestamptz default now());
    alter table public.notifications enable row level security;
    grant select on public.notifications to authenticated;
    grant update(is_read,seen_at,acknowledged_at) on public.notifications to authenticated;
    create policy own_read on public.notifications for select to authenticated using(tenant_id=auth.uid() or public.is_admin());
    create policy own_update on public.notifications for update to authenticated using(tenant_id=auth.uid()) with check(tenant_id=auth.uid());`);
  // Original announcement migration also grants to service_role.
  await db.exec('create role service_role bypassrls');
  await db.exec(await readFile(new URL('../supabase/migrations/202611180001_announcements.sql', import.meta.url), 'utf8'));
  await db.exec(`insert into public.profiles(id,role,is_test) values('${admin}','admin',false),('${tenant}','tenant',false),('${testTenant}','tenant',true);
    insert into public.tenant_assignments values('${tenant}','active');`);
  await as(admin); await post();
  await db.exec(`reset role; update public.notifications set is_read=true,acknowledged_at=now(); insert into public.tenant_assignments values('${testTenant}','active');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611230002_announcement_history.sql', import.meta.url), 'utf8'));
  migrationRows = await notices();
});
beforeEach(async () => {
  await db.exec(`reset role; truncate public.notifications,public.announcements,public.tenant_assignments,public.profiles cascade;
    insert into public.profiles(id,role,is_test) values('${admin}','admin',false),('${tenant}','tenant',false),('${testTenant}','tenant',true),('${former}','tenant',false);
    insert into public.tenant_assignments values('${tenant}','active'),('${former}','ended');`);
  await as(admin);
});
after(async () => { await db?.close(); });

test('migration fills active test-account history and preserves existing acknowledgement', () => {
  assert.equal(migrationRows.length, 2);
  assert.equal(migrationRows.find(row => row.tenant_id === tenant).is_read, true);
  assert.equal(migrationRows.find(row => row.tenant_id === testTenant).is_read, false);
});
test('new active test tenants receive old notices once, with original dates and updated counts', async () => {
  const announcement = await post();
  await db.exec(`reset role; insert into public.tenant_assignments values('${testTenant}','active')`);
  let rows = await notices();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].created_at.toISOString(), new Date(announcement.created_at).toISOString());
  await db.exec(`update public.notifications set is_read=true where tenant_id='${testTenant}'; update public.tenant_assignments set status='active' where id='${testTenant}'; select public.sync_announcement_history();`);
  rows = await notices();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].is_read, true);
  await as(admin);
  assert.equal((await post()).recipient_count, 2);
  assert.ok(!rows.some(row => row.tenant_id === former));
});
test('edits reset active recipients and revisions; returning tenants receive the latest content', async () => {
  await post();
  await db.exec(`reset role; insert into public.tenant_assignments values('${testTenant}','active'); update public.notifications set is_read=true,acknowledged_at=now(); update public.tenant_assignments set status='ended' where id='${testTenant}';`);
  await as(admin);
  await db.query("select public.edit_announcement($1,'Changed notice','Updated text')", [id]);
  let rows = await notices();
  assert.equal(rows[0].announcement_revision, 2); assert.equal(rows[0].is_read, false);
  assert.equal(rows[1].announcement_revision, 1); assert.equal(rows[1].is_read, true);
  await db.exec(`reset role; update public.tenant_assignments set status='active' where id='${testTenant}'`);
  rows = await notices();
  assert.equal(rows[1].title, 'Changed notice'); assert.equal(rows[1].announcement_revision, 2); assert.equal(rows[1].is_read, false);
  await as(admin); await db.query("select public.edit_announcement($1,'Changed notice','Updated text')", [id]);
  assert.equal((await notices())[0].announcement_revision, 2, 'same edit retry does not increment revision');
});
test('deleted announcements never return during activation or repeated synchronization', async () => {
  await post(); await db.query('select public.delete_announcement($1)', [id]);
  await db.exec(`reset role; insert into public.tenant_assignments values('${testTenant}','active'); select public.sync_announcement_history();`);
  assert.equal((await notices()).length, 0);
});
test('tenant and guest roles cannot call internal synchronization or read other notifications', async () => {
  await post();
  await as(testTenant);
  assert.equal((await notices()).length, 0);
  await assert.rejects(db.query('select public.sync_announcement_history()'), /permission denied/);
  await as('', 'anon');
  await assert.rejects(db.query('select public.sync_announcement_history()'), /permission denied/);
});
test('all recipient-changing operations use the same transaction lock', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202611230002_announcement_history.sql', import.meta.url), 'utf8');
  assert.equal((sql.match(/pg_advisory_xact_lock\(66341023\)/g) || []).length, 4);
});
