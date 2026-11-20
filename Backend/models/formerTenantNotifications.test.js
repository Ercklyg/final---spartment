import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const tenant='22222222-2222-4222-8222-222222222222';
const lease='33333333-3333-4333-8333-333333333333';
const bill='44444444-4444-4444-8444-444444444444';
const futureBill='55555555-5555-4555-8555-555555555555';
const request='66666666-6666-4666-8666-666666666666';
before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create table public.announcements(id uuid primary key,title text,message text,updated_at timestamptz);
    create table public.tenant_assignments(id uuid primary key,status text);
    create table public.leases(id uuid primary key,tenant_id uuid,status text,lease_end_date date,room_id uuid);
    create table public.profiles(id uuid primary key,full_name text);
    create table public.rooms(id uuid primary key,room_number text);
    create table public.bills(id uuid primary key,lease_id uuid,bill_type text,billing_period date,due_date date,
      rent_amount numeric default 100,electricity_amount numeric default 0,water_amount numeric default 0);
    create table public.payments(id uuid primary key default gen_random_uuid(),bill_id uuid,amount numeric,payment_date date);
    create table public.tenant_requests(id uuid primary key,tenant_id uuid,subject text,status text,admin_note text);
    create table public.notifications(id uuid primary key default gen_random_uuid(),tenant_id uuid,title text,message text,
      kind text,source_id uuid,created_at timestamptz default now(),reminder_bill_ids uuid[] default '{}');
    create function public.is_admin() returns boolean language sql as $$select true$$;
    create function public.is_test_lease(uuid) returns boolean language sql as $$select false$$;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611200001_former_tenant_notifications.sql',import.meta.url),'utf8'));
  await db.exec(`create trigger notify_payment after insert on public.payments for each row execute function public.notify_tenant_event();
    create trigger notify_request after update on public.tenant_requests for each row execute function public.notify_tenant_event();
    insert into public.profiles values('${tenant}','Former tenant');
    insert into public.tenant_assignments values('${tenant}','ended');
    insert into public.leases values('${lease}','${tenant}','ended','2026-10-15',null);
    insert into public.bills(id,lease_id,bill_type,billing_period,due_date) values
      ('${bill}','${lease}','rent','2026-10-01','2026-10-31'),
      ('${futureBill}','${lease}','rent','2026-11-01','2026-11-30');
    insert into public.tenant_requests values('${request}','${tenant}','Old repair','In progress','');`);
});
after(async()=>{await db?.close();});

test('former tenants receive outstanding reminders and payment confirmation until settlement',async()=>{
  assert.equal((await db.query("select * from public.bill_reminder_candidates('2026-10-01','rent','all_unpaid')")).rows.length,1);
  await db.query('select public.send_bill_reminder($1)',[bill]);
  await db.query("insert into public.payments(bill_id,amount,payment_date) values($1,100,'2026-11-01')",[bill]);
  const notices=(await db.query('select kind from public.notifications order by created_at')).rows;
  assert.deepEqual(notices.map(n=>n.kind),['bill','payment']);
  assert.equal((await db.query("select * from public.bill_reminder_candidates('2026-10-01','rent','all_unpaid')")).rows.length,0);
  await assert.rejects(db.query('select public.send_bill_reminder($1)',[bill]),/fully paid/);
});

test('both bulk candidates and individual reminders exclude periods after move-out',async()=>{
  assert.equal((await db.query("select * from public.bill_reminder_candidates('2026-11-01','rent','all_unpaid')")).rows.length,0);
  await assert.rejects(db.query('select public.send_bill_reminder($1)',[futureBill]),/after the tenancy ended/);
});

test('open request and final resolution notify; later edits to closed requests stay silent',async()=>{
  await db.query("update public.tenant_requests set admin_note='Work scheduled' where id=$1",[request]);
  await db.query("update public.tenant_requests set status='Resolved' where id=$1",[request]);
  await db.query("update public.tenant_requests set admin_note='Internal follow-up' where id=$1",[request]);
  assert.equal((await db.query("select * from public.notifications where kind='request'")).rows.length,2);
});
