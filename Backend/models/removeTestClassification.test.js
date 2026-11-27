import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { collectionForecast } from './collectionForecast.js';

const admin='11111111-1111-4111-8111-111111111111';
const real='22222222-2222-4222-8222-222222222222';
const tenant='33333333-3333-4333-8333-333333333333';
const testRoom='1d434299-b5e4-4604-8fd2-9a90ac1be39e';
const otherTestRoom='4b3b39c3-ebc4-479b-a437-046a2a8d43e2';
let db,realRoom,realLease,testLease;
const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0].result;
async function as(id,role='authenticated') {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.sub',$1,false),set_config('request.jwt.role',$2,false)",[id,role]);
}
before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.role',true)$$;
    grant usage on schema auth to authenticated,anon;
    grant execute on all functions in schema auth to authenticated,anon;`);
  await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  await db.exec(`alter table public.notifications add column reminder_bill_ids uuid[] default '{}';
    insert into auth.users(id) values('${admin}'),('${real}'),('${tenant}');
    update public.profiles set role='admin' where id='${admin}';
    update public.profiles set full_name=case when id='${real}' then 'Actual tenant' else 'Test tenant' end where role='tenant';
    insert into public.buildings(name) values('Main');
    insert into public.rooms(building_id,room_number,floor,status,size_sqm,monthly_rate)
      select (select id from public.buildings),i::text,1,case when i<=127 then 'occupied'::public.room_status else 'available'::public.room_status end,8,2500
      from generate_series(101,130) i;
    insert into public.rooms(id,building_id,room_number,floor,size_sqm,monthly_rate)
      values('${testRoom}',(select id from public.buildings),'65465465',1,8,3000),
      ('${otherTestRoom}',(select id from public.buildings),'4545',1,8,2000);`);
  realRoom=await scalar("select id result from public.rooms where room_number='101'");
  realLease=await scalar("insert into public.leases(tenant_id,room_id,move_in_date) values($1,$2,'2026-07-01') returning id result",[real,realRoom]);
  testLease=await scalar("insert into public.leases(tenant_id,room_id,move_in_date) values($1,$2,'2026-07-01') returning id result",[tenant,testRoom]);
  // Paid history and unpaid test records exist before classification, just as
  // in an already running installation. Nothing is deleted or recomputed.
  for (const [month,amount] of [['07',95517],['08',79041.5],['09',91753.5],['10',87214]]) {
    const bill=await scalar("insert into public.bills(lease_id,bill_type,billing_period,due_date,rent_amount) values($1,'rent',$2,$2::date+29,$3) returning id result",[realLease,`2026-${month}-01`,amount]);
    await db.query('insert into public.payments(bill_id,amount,payment_date) values($1,$2,$3)',[bill,amount,`2026-${month}-15`]);
  }
  for(const [month,paid] of [['07',3000],['09',3000],['11',0]]) {
    const bill=await scalar("insert into public.bills(lease_id,bill_type,billing_period,due_date,rent_amount) values($1,'rent',$2,$2::date+29,3000) returning id result",[testLease,`2026-${month}-01`]);
    if(paid)await db.query('insert into public.payments(bill_id,amount,payment_date) values($1,$2,$3)',[bill,paid,`2026-${month}-15`]);
  }
  await db.exec(await readFile(new URL('../supabase/migrations/202611190003_test_records.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611200002_tenant_payment_filters.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611220001_tenant_directory_tenancy_status.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611270001_remove_test_classification.sql',import.meta.url),'utf8'));
  await as(admin);
});
after(async()=>{await db?.close();});


test('retirement preserves existing records and includes former test inventory and balances',async()=>{
 const report=await scalar("select public.analytics_report('2026-11-01','Monthly',true) result");
 assert.equal(report.roomCount,32);
 assert.equal(report.snapshot.activeTenants,2);
 assert.ok(report.snapshot.rows.some(row=>row.tenant_id===tenant));
 assert.equal(await scalar('select count(*)::int result from public.rooms'),32);
 assert.equal(await scalar('select count(*)::int result from public.profiles'),3);
 assert.equal(await scalar('select count(*)::int result from public.bills'),7);
 assert.equal(await scalar('select count(*)::int result from public.payments'),6);
 const bills=await scalar("select public.billing_page_v2('2026-09-01','rent') result");
 assert.equal(bills.total,2);assert.equal(bills.periodTotal,2);assert.equal(bills.totals.paid,94753.5);
 assert.ok(bills.bills.every(bill=>!('is_test' in bill)));
 const rows=(await db.query('select * from public.forecast_payments()')).rows.map(r=>({...r,billing_period:r.billing_period.toISOString().slice(0,10),payment_date:r.payment_date.toISOString().slice(0,10)}));
 assert.equal(rows.length,6);assert.equal(collectionForecast(rows,'2026-11','2026-11-19').forecast,87003);
 assert.ok((await scalar('select public.reporting_months() result')).includes('2026-11'));
});

test('classification controls and columns are retired while their audit history is retained',async()=>{
 assert.equal(await scalar("select count(*)::int result from information_schema.columns where table_schema='public' and table_name in ('rooms','profiles') and column_name='is_test'"),0);
 assert.equal(await scalar("select count(*)::int result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('set_test_record','is_test_lease','inherit_test_tenancy','guard_test_classification','audit_test_classification')"),0);
 assert.equal(await scalar('select count(*)::int result from public.test_record_changes'),3);
 const reminders=(await db.query("select * from public.bill_reminder_candidates('2026-11-01','rent','all_unpaid')")).rows;
 assert.equal(reminders.length,1);assert.equal(reminders[0].tenant_id,tenant);
});

test('public availability and tenant isolation continue to work after classification removal',async()=>{
 await as('', 'anon');
 const visible=await scalar('select count(*)::int result from public.rooms');
 assert.ok(visible>=4);
 await as(tenant);
 assert.equal(await scalar('select count(*)::int result from public.bills'),3);
 assert.equal(await scalar('select count(*)::int result from public.payments'),2);
 assert.equal(await scalar('select count(*)::int result from public.profiles where id=$1',[tenant]),1);
 await assert.rejects(db.exec('select * from public.forecast_payments()'),/Administrator/);
 await as(admin);
});


test('ordinary tenant directory signatures include former test accounts and balances',async()=>{
 await db.exec('begin; reset role');
 try {
  for(const [id,room,name] of [[real,realRoom,'Actual tenant'],[tenant,testRoom,'Former test tenant']]) {
   await db.query("update public.rooms set status='available' where id=$1",[room]);
   await db.query(`insert into public.tenant_assignments(id,room_id,full_name,email,phone,monthly_rent,move_in,emergency_name,emergency_phone,relationship)
    values($1,$2,$3,$4,'09123456789',3000,'2026-07-01','Contact','09123456789','Family')`,[id,room,name,id+'@example.test']);
  }
  await as(admin);
  for(const version of ['v2','v3','v4']) {
   const result=await scalar('select public.tenant_directory_search_page_'+version+'() result');
   assert.equal(result.total,2);
   const account=result.data.find(row=>row.id===tenant);
   assert.equal(account.billing.balance,3000);
   for(const key of ['is_test','test_account','room_is_test']) assert.ok(!(key in account));
  }
 } finally { await db.exec('rollback'); await as(admin); }
});
