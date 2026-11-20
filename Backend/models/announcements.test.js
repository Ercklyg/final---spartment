import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '11111111-1111-4111-8111-111111111111';
const tenant = '22222222-2222-4222-8222-222222222222';
const second = '33333333-3333-4333-8333-333333333333';
const former = '44444444-4444-4444-8444-444444444444';
const unassigned = '55555555-5555-4555-8555-555555555555';
const id = '66666666-6666-4666-8666-666666666666';
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create table public.profiles(id uuid primary key, role text not null);
    create table public.tenant_assignments(id uuid primary key references public.profiles(id), status text not null);
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
    create table public.notifications(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.profiles(id),
      title text not null,message text not null,kind text,source_id uuid,is_read boolean not null default false,
      seen_at timestamptz,acknowledged_at timestamptz,created_at timestamptz not null default now());
    alter table public.notifications enable row level security;
    grant select on public.notifications to authenticated;
    grant update(is_read,seen_at,acknowledged_at) on public.notifications to authenticated;
    create policy notice_read on public.notifications for select to authenticated using (tenant_id=auth.uid() or public.is_admin());
    create policy notice_update on public.notifications for update to authenticated using (tenant_id=auth.uid()) with check (tenant_id=auth.uid());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202611180001_announcements.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611200001_former_tenant_notifications.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  await db.exec('reset role; truncate public.notifications,public.announcements,public.tenant_assignments,public.profiles cascade;');
  await db.query("insert into public.profiles values($1,'admin'),($2,'tenant'),($3,'tenant'),($4,'tenant'),($5,'tenant')", [admin, tenant, second, former, unassigned]);
  await db.query("insert into public.tenant_assignments values($1,'active'),($2,'active'),($3,'ended')", [tenant, second, former]);
  await asUser(admin);
});
after(async () => { await db?.close(); });
async function asUser(user, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.sub',$1,false)", [user]);
}
async function post(title = 'Water interruption', message = 'Water will be off at noon.\nPlease prepare.') {
  return (await db.query('select public.post_announcement($1,$2,$3) result', [id, title, message])).rows[0].result;
}
async function edit(title = 'Water interruption updated', message = 'Water will be off at 1 PM.') {
  return (await db.query('select public.edit_announcement($1,$2,$3) result', [id, title, message])).rows[0].result;
}
const remove = () => db.query('select public.delete_announcement($1) result', [id]);
const notices = async () => (await db.query('select * from public.notifications order by tenant_id')).rows;

test('posts once per active tenant and preserves multiline plain text', async () => {
  const row = await post();
  assert.equal(row.recipient_count, 2);
  assert.equal(row.author_id, admin);
  assert.deepEqual((await notices()).map(n => n.tenant_id), [tenant, second]);
  for (const n of await notices()) {
    assert.equal(n.kind, 'announcement'); assert.equal(n.source_id, id); assert.equal(n.is_read, false);
    assert.equal(n.message, 'Water will be off at noon.\nPlease prepare.');
  }
});

test('a repeated submission returns the original result without notifying new tenants', async () => {
  const original = await post();
  await db.exec('reset role');
  await db.query("insert into public.tenant_assignments values($1,'active')", [unassigned]);
  await asUser(admin);
  assert.deepEqual(await post(), original);
  assert.equal((await notices()).length, 2);
  await assert.rejects(post('Changed retry'), error => error.code === '23505');
});

test('zero current tenants rolls back the post', async () => {
  await db.exec("reset role; update public.tenant_assignments set status='ended';");
  await asUser(admin);
  await assert.rejects(post(), /No current tenants/);
  assert.equal((await db.query('select * from public.announcements')).rows.length, 0);
  assert.equal((await notices()).length, 0);
});

test('a notification insertion failure rolls back all recipients and the announcement', async () => {
  await db.exec(`reset role;
    create function public.fail_announcement_test() returns trigger language plpgsql as $$ begin
      if new.tenant_id='${second}' then raise exception 'Simulated notification failure'; end if; return new; end $$;
    create trigger fail_announcement_test before insert on public.notifications for each row execute function public.fail_announcement_test();`);
  try {
    await asUser(admin);
    await assert.rejects(post(), /Simulated notification failure/);
    assert.equal((await db.query('select * from public.announcements')).rows.length, 0);
    assert.equal((await notices()).length, 0);
  } finally { await db.exec('reset role; drop trigger fail_announcement_test on public.notifications; drop function public.fail_announcement_test();'); }
});

test('edit alerts current original recipients and preserves former tenants notification history', async () => {
  const original = await post();
  const initial = await notices();
  await db.exec("reset role; update public.notifications set is_read=true,seen_at=now(),acknowledged_at=now();");
  await db.query("insert into public.tenant_assignments values($1,'active')", [unassigned]);
  await db.query("update public.tenant_assignments set status='ended' where id=$1", [second]);
  await asUser(admin);
  const updated = await edit();
  assert.equal(updated.created_at, original.created_at);
  assert.notEqual(updated.updated_at, original.updated_at);
  assert.equal(updated.recipient_count, 2);
  const rows = await notices();
  assert.equal(rows.length, 2);
  rows.forEach((n, i) => {
    assert.equal(n.id, initial[i].id); assert.equal(n.created_at.toISOString(), initial[i].created_at.toISOString());
    if (n.tenant_id === second) {
      assert.equal(n.title, initial[i].title); assert.equal(n.message, initial[i].message);
      assert.equal(n.is_read, true); assert.ok(n.seen_at); assert.ok(n.acknowledged_at);
    } else {
      assert.equal(n.title, updated.title); assert.equal(n.message, updated.message);
      assert.equal(n.is_read, false); assert.equal(n.seen_at, null); assert.equal(n.acknowledged_at, null);
    }
  });
  await db.exec('reset role; update public.notifications set is_read=true;');
  await asUser(admin);
  assert.deepEqual(await edit(), updated);
  assert.equal((await notices()).every(n => n.is_read), true, 'retrying the same edit does not reset read status twice');
});

test('delete removes only matching announcement notifications', async () => {
  await post();
  await db.exec('reset role;');
  await db.query("insert into public.notifications(tenant_id,title,message,kind,source_id) values($1,'Bill','Pay rent','bill',$2)", [tenant, id]);
  await asUser(admin);
  await remove();
  assert.equal((await db.query('select * from public.announcements')).rows.length, 0);
  assert.deepEqual((await notices()).map(n => n.kind), ['bill']);
  await assert.rejects(edit(), error => error.code === 'P0002');
  await assert.rejects(remove(), error => error.code === 'P0002');
});

test('edit and delete roll back completely if a recipient notification mutation fails', async () => {
  await post();
  const original = await notices();
  await db.exec(`reset role;
    create function public.fail_announcement_test() returns trigger language plpgsql as $$ begin raise exception 'Simulated mutation failure'; end $$;
    create trigger fail_announcement_test before update or delete on public.notifications for each row execute function public.fail_announcement_test();`);
  try {
    await asUser(admin);
    await assert.rejects(edit(), /Simulated mutation failure/);
    await assert.rejects(remove(), /Simulated mutation failure/);
    assert.deepEqual(await notices(), original);
    assert.equal((await db.query('select title from public.announcements')).rows[0].title, 'Water interruption');
  } finally { await db.exec('reset role; drop trigger fail_announcement_test on public.notifications; drop function public.fail_announcement_test();'); }
});

test('tenants cannot read admin announcements or mutate them and see only their own notification', async () => {
  await post();
  await asUser(tenant);
  assert.equal((await db.query('select * from public.announcements')).rows.length, 0);
  assert.equal((await notices()).length, 1);
  await assert.rejects(post(), error => error.code === '42501');
  await assert.rejects(edit(), error => error.code === '42501');
  await assert.rejects(remove(), error => error.code === '42501');
  await assert.rejects(db.query('update public.announcements set title=$1 where id=$2', ['Forged', id]), /permission denied/);
  await assert.rejects(db.query('delete from public.announcements where id=$1', [id]), /permission denied/);
  await assert.rejects(db.query("insert into public.announcements(id,title,message,author_id) values(gen_random_uuid(),'Forged','Text',$1)", [tenant]), /permission denied/);
  const changed = await db.query('update public.notifications set is_read=true returning tenant_id');
  assert.deepEqual(changed.rows.map(row => row.tenant_id), [tenant]);
  await assert.rejects(db.exec("update public.notifications set title='Forged'"), /permission denied/);
  await asUser('', 'anon');
  await assert.rejects(post(), /permission denied/);
  await assert.rejects(db.query('select * from public.announcements'), /permission denied/);
});

test('database rejects empty or oversized content and duplicate recipient notifications', async () => {
  for (const [title, message] of [[' ', 'Text'], ['Title', ' '], ['\n\t', 'Text'], ['Title', '\n\t'], ['x'.repeat(151), 'Text'], ['Title', 'x'.repeat(5001)]]) {
    await assert.rejects(post(title, message), error => error.code === '22023');
  }
  await post();
  await db.exec('reset role;');
  await assert.rejects(db.query("insert into public.notifications(tenant_id,title,message,kind,source_id) values($1,'Copy','Copy','announcement',$2)", [tenant, id]), error => error.code === '23505');
});
