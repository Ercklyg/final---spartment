import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '11111111-1111-4111-8111-111111111111';
const tenant = '22222222-2222-4222-8222-222222222222';
let db;
async function as(id, role = 'authenticated') {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.sub',$1,false)", [id]);
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql as $$select current_user::text$$;
    grant usage on schema auth to authenticated,anon;
    grant execute on all functions in schema auth to authenticated,anon;`);
  await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
  // The baseline export predates attachments, but the existing workspace projects them.
  await db.exec(`create table public.maintenance_attachments(id uuid,request_id uuid,original_name text,mime_type text,size_bytes integer,created_at timestamptz,uploaded_by uuid);
    grant select on public.maintenance_attachments to authenticated;
    insert into auth.users(id) values('${admin}'),('${tenant}');
    update public.profiles set role='admin' where id='${admin}';
    insert into public.inquiries(full_name,email,message) values('Existing guest','existing@example.test','Room question');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611230001_guest_general_messages.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });

test('anonymous guests can store messages with email, phone or both, but cannot read or update them', async () => {
  await as('', 'anon');
  for (const [email, phone] of [['guest@example.test', null], [null, '09123456789'], ['guest@example.test', '09123456789']]) {
    await db.query("insert into public.inquiries(inquiry_type,full_name,email,phone,subject,message) values('general','Guest',$1,$2,'Question','Hello')", [email, phone]);
  }
  await assert.rejects(db.query('select * from public.inquiries'));
  await assert.rejects(db.query("update public.inquiries set status='Resolved'"));
});
test('database rejects bypasses of contact, content and initial-status rules', async () => {
  await as('', 'anon');
  for (const [email, phone, subject, message, status] of [[null,null,'Question','Hello','New'], ['bad','09123456789','Question','Hello','New'], [null,'abc','Question','Hello','New'], [null,'09123456789','','Hello','New'], [null,'09123456789','Question','','New'], [null,'09123456789','Question','Hello','Resolved']]) {
    await assert.rejects(db.query("insert into public.inquiries(inquiry_type,full_name,email,phone,subject,message,status) values('general','Guest',$1,$2,$3,$4,$5)", [email,phone,subject,message,status]));
  }
  await assert.rejects(db.query("insert into public.inquiries(full_name,email,phone,message) values('Guest',null,'09123456789','Room question')"));
});
test('tenants cannot read guest messages; admin workspace includes contacts, types, subjects and pagination', async () => {
  await as(tenant);
  assert.equal((await db.query('select * from public.inquiries')).rows.length, 0);
  await assert.rejects(db.query("select public.request_workspace_page('Inquiry',0,20)"));
  await as(admin);
  const page = (await db.query("select public.request_workspace_page('Inquiry',0,2) result")).rows[0].result;
  assert.equal(page.total, 4);
  assert.equal(page.inquiries.length, 2);
  assert.ok(page.inquiries.every(row => 'inquiry_type' in row && 'subject' in row && 'phone' in row));
  const messages = (await db.query("select * from public.inquiries where inquiry_type='general'")).rows;
  await db.query("update public.inquiries set status='Contacted' where id=$1", [messages[0].id]);
  await db.query("update public.inquiries set status='Resolved' where id=$1", [messages[0].id]);
  assert.equal((await db.query("select inquiry_type from public.inquiries where email='existing@example.test'")).rows[0].inquiry_type, 'room');
});
