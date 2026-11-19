import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { collectionForecast, forecastValidation } from './collectionForecast.js';
import { buildRecommendationFacts } from '../services/recommendationFacts.js';
import { collectedForSelectedBills } from '../../Frontend/src/lib/adminAnalytics.js';

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
  await as(admin);
});
after(async()=>{await db?.close();});

test('dashboard bill-month collections exclude older bills, test accounts, and payments after cutoff', async()=>{
  await db.exec('begin');
  try {
    await db.exec('reset role');
    const insertBill=async(lease,month)=>scalar("insert into public.bills(lease_id,bill_type,billing_period,due_date,electricity_amount,water_amount) values($1,'utility',$2,$2::date+29,540,300) returning id result",[lease,month]);
    const current=await insertBill(realLease,'2026-11-01');
    const earlier=await insertBill(realLease,'2026-10-01');
    const sample=await insertBill(testLease,'2026-11-01');
    for(const [bill,amount,date] of [[current,500,'2026-11-05'],[current,40,'2026-10-31'],[current,300,'2026-12-01'],[earlier,90,'2026-11-05'],[sample,200,'2026-11-05']]) {
      await db.query('insert into public.payments(bill_id,amount,payment_date) values($1,$2,$3)',[bill,amount,date]);
    }
    await as(admin);
    const report=await scalar("select public.analytics_report('2026-11-01','Monthly',false) result");
    assert.equal(report.snapshot.collected,590);
    assert.equal(collectedForSelectedBills(report.snapshot),540);
    assert.equal(report.snapshot.selected.length,1);
    assert.equal(report.snapshot.selected[0].id,current);
  } finally {await db.exec('rollback');}
});

test('migration excludes exactly the confirmed test inventory and its linked account, retaining all records',async()=>{
  const report=await scalar("select public.analytics_report('2026-11-01','Monthly',true) result");
  assert.equal(report.roomCount,30); assert.equal(report.snapshot.occupancy,90);
  assert.equal(report.snapshot.available,3); assert.equal(report.snapshot.vacancyGap,7500);
  assert.equal(report.snapshot.activeTenants,1);
  assert.ok(report.snapshot.rows.every(b=>b.tenant_id===real));
  const facts=buildRecommendationFacts(report.snapshot,'2026-11');
  assert.equal(facts.find(f=>f.kind==='vacancy').metrics.availableRooms,3);
  assert.equal(await scalar('select count(*)::int result from public.rooms'),32);
  assert.equal(await scalar('select is_test result from public.profiles where id=$1',[tenant]),true);
});

test('forecast and backtest use only actual payments while preserving their billing months',async()=>{
  const rows=(await db.query('select * from public.forecast_payments()')).rows.map(r=>({...r,billing_period:r.billing_period.toISOString().slice(0,10),payment_date:r.payment_date.toISOString().slice(0,10)}));
  assert.equal(rows.length,4);
  const forecast=collectionForecast(rows,'2026-11','2026-11-19');
  assert.equal(forecast.forecast,86003);
  const backtest=forecastValidation(rows,'2026-11','2026-11-19');
  assert.equal(backtest.testedMonths,1); assert.equal(backtest.rows[0].forecast,88770.67);
  assert.equal(backtest.smaMae,1556.67); assert.equal(backtest.benchmarkMae,4539.5);
});

test('admin test filter shows excluded bills without changing operational card totals',async()=>{
  const hidden=await scalar("select public.billing_page_v2('2026-09-01','rent') result");
  const visible=await scalar("select public.billing_page_v2('2026-09-01','rent','All','',0,25,true) result");
  assert.equal(hidden.total,1); assert.equal(visible.total,2);
  assert.deepEqual(visible.totals,hidden.totals); assert.equal(visible.totals.paid,91753.5);
  assert.ok(visible.bills.some(b=>b.is_test&&b.paid===3000&&b.payments.length===1));
  const reminders=await db.query("select * from public.bill_reminder_candidates('2026-11-01','rent','all_unpaid')");
  assert.equal(reminders.rows.length,0);
});

test('test tenant retains own profile, room, bill and payment access and cannot reclassify itself',async()=>{
  await as(tenant);
  assert.equal(await scalar('select is_test result from public.profiles where id=$1',[tenant]),true);
  assert.equal(await scalar('select count(*)::int result from public.rooms where id=$1',[testRoom]),1);
  assert.equal(await scalar('select count(*)::int result from public.bills'),3);
  assert.equal(await scalar('select count(*)::int result from public.payments'),2);
  await assert.rejects(db.query("select public.set_test_record('tenant',$1,false)",[tenant]),/Administrator/);
  await assert.rejects(db.exec('select * from public.forecast_payments()'),/Administrator/);
  // RLS refuses direct profile edits even though admins have column access.
  await db.query('update public.profiles set is_test=false where id=$1',[tenant]);
  assert.equal(await scalar('select is_test result from public.profiles where id=$1',[tenant]),true);
  await as('', 'anon');
  assert.equal(await scalar('select count(*)::int result from public.rooms'),3);
  await as(admin);
});

test('admin classification changes are reversible, audited, and inherited by future test tenancies',async()=>{
  await db.query("select public.set_test_record('room',$1,false)",[otherTestRoom]);
  assert.equal((await scalar("select public.analytics_report('2026-11-01') result")).roomCount,31);
  await db.query("select public.set_test_record('room',$1,true)",[otherTestRoom]);
  assert.equal(await scalar('select count(*)::int result from public.test_record_changes'),2);
  await as('', 'service_role');
  const fresh='44444444-4444-4444-8444-444444444444';
  await db.exec('reset role');
  await db.query('insert into auth.users(id) values($1)',[fresh]);
  await db.query("insert into public.leases(tenant_id,room_id,move_in_date) values($1,$2,'2026-11-01')",[fresh,otherTestRoom]);
  assert.equal(await scalar('select is_test result from public.profiles where id=$1',[fresh]),true);
  await as(admin);
});

test('tenant directory hides tests by default and includes their full account balances on request',async()=>{
  await db.exec('reset role');
  for(const [id,room,name] of [[real,realRoom,'Actual tenant'],[tenant,testRoom,'Test tenant']]) {
    await db.query("update public.rooms set status='available' where id=$1",[room]);
    await db.query(`insert into public.tenant_assignments(id,room_id,full_name,email,phone,monthly_rent,move_in,emergency_name,emergency_phone,relationship)
      values($1,$2,$3,$4,'09123456789',3000,'2026-07-01','Contact','09123456789','Family')`,[id,room,name,id+'@example.test']);
  }
  await as(admin);
  const normal=await scalar('select public.tenant_directory_search_page_v2() result');
  const all=await scalar("select public.tenant_directory_search_page_v2('',0,30,true) result");
  assert.equal(normal.total,1); assert.equal(all.total,2);
  const account=all.data.find(t=>t.id===tenant);
  assert.equal(account.is_test,true); assert.equal(account.billing.balance,3000);
  assert.equal(account.test_account,true); assert.equal(account.room_is_test,true);
});
