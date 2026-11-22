import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const directory = async (status='All',offset=0,search='',includeTest=false,tenancyStatus='Active') =>
  (await db.query('select public.tenant_directory_search_page_v4($1,$2,9,$3,$4,$5) result',[search,offset,includeTest,status,tenancyStatus])).rows[0].result;
before(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create table public.profiles(id uuid primary key,is_test boolean default false);
    create table public.buildings(id uuid primary key,name text);
    create table public.rooms(id uuid primary key,room_number text,building_id uuid,is_test boolean default false);
    create table public.tenant_assignments(id uuid primary key,email text,full_name text,phone text,emergency_name text,
      emergency_phone text,relationship text,room_id uuid,monthly_rent numeric,move_in date,lease_end date,
      status text default 'active',created_at timestamptz default now());
    create table public.leases(id uuid primary key,tenant_id uuid,room_id uuid,status text,move_in_date date,lease_end_date date,created_at timestamptz default now());
    create table public.test_bill_facts(tenant_id uuid,balance numeric,paid numeric,status text);
    create function public.billing_facts() returns setof public.test_bill_facts language sql as $$select * from public.test_bill_facts$$;
    create function public.is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='true'$$;
    select set_config('test.admin','true',false);`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611200002_tenant_payment_filters.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611220001_tenant_directory_tenancy_status.sql',import.meta.url),'utf8'));
  for(let n=1;n<=16;n++){
    await db.query('insert into public.profiles values($1,$2)',[id(n),n===15]);
    await db.query('insert into public.buildings values($1,$2)',[id(n),n===1?'North':'South']);
    await db.query("insert into public.rooms(id,room_number,building_id) values($1,'203',$1)",[id(n)]);
    await db.query("insert into public.tenant_assignments(id,email,full_name,room_id,status) values($1,$2,$3,$1,$4)",[id(n),`tenant${n}@test.local`,`Tenant ${n}`,n===16?'ended':'active']);
    if(n<=10||n>=15) await db.query("insert into public.test_bill_facts values($1,100,0,'Late')",[id(n)]);
  }
  await db.query("update public.tenant_assignments set room_id=null,lease_end='2026-10-31' where id=$1",[id(16)]);
  await db.query("insert into public.leases(id,tenant_id,room_id,status,move_in_date,lease_end_date) values($1,$1,$1,'ended','2026-07-01','2026-10-31'),($2,$1,$2,'ended','2026-01-01','2026-06-30')",[id(16),id(1)]);
  await db.query("insert into public.test_bill_facts values($1,0,100,'Paid'),($2,100,0,'Pending'),($3,50,50,'Partially paid')",[id(11),id(12),id(13)]);
});
after(async()=>{await db?.close();});

test('status filtering precedes nine-item pagination and counts all matching tenants',async()=>{
  const first=await directory('Overdue');
  const second=await directory('Overdue',9);
  assert.equal(first.total,10); assert.equal(first.data.length,9);
  assert.equal(second.total,10); assert.equal(second.data.length,1);
  assert.equal(new Set([...first.data,...second.data].map(t=>t.id)).size,10);
  assert.ok([...first.data,...second.data].every(t=>t.billing.overdue>0));
});

test('paid, pending and partial balances remain distinct from no bills',async()=>{
  assert.deepEqual((await directory('Paid')).data.map(t=>t.id),[id(11)]);
  const pending=await directory('Pending');
  assert.deepEqual(pending.data.map(t=>t.id).sort(),[id(12),id(13)]);
  assert.deepEqual(pending.data.map(t=>t.billing.status).sort(),['Partially paid','Pending']);
  assert.equal((await directory()).total,14);
  assert.equal((await directory('Overdue',0,'',true)).total,11);
});

test('building search combines with payment filters and returns building with repeated room numbers',async()=>{
  const north=await directory('Overdue',0,'North');
  assert.equal(north.total,1);
  assert.equal(north.data[0].rooms.room_number,'203');
  assert.equal(north.data[0].rooms.buildings.name,'North');
  assert.equal((await directory('Paid',0,'North')).total,0);
});

test('invalid filters and non-admin callers are rejected',async()=>{
  await assert.rejects(directory('invalid'),/Invalid tenant filters/);
  await db.exec("select set_config('test.admin','false',false)");
  try { await assert.rejects(directory(),/Administrator access required/); }
  finally { await db.exec("select set_config('test.admin','true',false)"); }
  const grants=(await db.query("select has_function_privilege('anon','public.tenant_directory_search_page_v4(text,integer,integer,boolean,text,text)','execute') allowed")).rows[0];
  assert.equal(grants.allowed,false);
});

test('all tenants includes moved-out accounts with previous room, date and unpaid balances',async()=>{
  const all=await directory('All',0,'',false,'All');
  assert.equal(all.total,15);
  const moved=await directory('Overdue',0,'South',false,'MovedOut');
  assert.equal(moved.total,1);
  const tenant=moved.data[0];
  assert.equal(tenant.id,id(16));
  assert.equal(tenant.status,'ended');
  assert.equal(tenant.room_id,null);
  assert.equal(tenant.rooms.room_number,'203');
  assert.equal(tenant.rooms.buildings.name,'South');
  assert.equal(tenant.move_out_date,'2026-10-31');
  assert.equal(tenant.billing.balance,100);
  assert.equal((await directory('Paid',0,'',false,'MovedOut')).total,0);
  const pages=[all,await directory('All',9,'',false,'All')];
  assert.equal(new Set(pages.flatMap(p=>p.data.map(t=>t.id))).size,15);
});

test('missing former lease and bills remain available without inventing room or payment data',async()=>{
  await db.query("update public.tenant_assignments set room_id=null,status='ended' where id=$1",[id(14)]);
  try {
    const result=await directory('All',0,'Tenant 14',false,'MovedOut');
    assert.equal(result.total,1);
    assert.equal(result.data[0].rooms.room_number,null);
    assert.equal(result.data[0].move_out_date,null);
    assert.equal(result.data[0].billing.status,'No bills');
  } finally {await db.query("update public.tenant_assignments set room_id=id,status='active' where id=$1",[id(14)]);}
  await assert.rejects(directory('All',0,'',false,'invalid'),/Invalid tenant filters/);
});
