import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationRecords } from './recommendationRecords.js';

const tenant='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const bill=(id,tenant_id,name,balance)=>({id:`00000000-0000-4000-8000-${String(id.charCodeAt(0)).padStart(12,'0')}`,tenant_id,name,balance,paid:0,total:balance,bill_type:'utility',billing_period:'2026-08-01',due_date:'2026-08-31',room:'Building 2 / 202',status:'Late'});
const snapshot={cutoff:'2026-11-19',late:[bill('a',tenant,'Same name',882),bill('b',other,'Same name',874)],overdue:1756,
  selected:[{...bill('c',tenant,'Same name',1500),billing_period:'2026-11-01',due_date:'2026-11-30',paid:1000,total:2500,status:'Partially paid'}],
  outstanding:3256,collected:49995,available:1,vacancyGap:2500,
  openRequests:[{id:'r',subject:'Leaking tap',status:'New',created_at:'2026-11-18T10:00:00Z'},{id:'done',subject:'Fixed tap',status:'Resolved'}],
  openInquiries:[{id:'q',status:'Contacted',created_at:'2026-11-18T09:00:00Z'}]};
function request(factId,values=snapshot){
  return {role:'admin',query:{month:'2026-11',factId},db:{rpc:async(name)=>{
    assert.equal(name,'analytics_report');return {data:{snapshot:values}};
  }}};
}

test('tenant review filters by account ID even when display names match',async()=>{
  const result=await recommendationRecords(request('tenant:'+tenant));
  assert.deepEqual(result.records.map(row=>row.id),[snapshot.late[0].id]);
  assert.equal(result.records[0].amount,882);assert.equal(result.records[0].paid,0);
  assert.equal(result.financialCutoff,'2026-11-19');assert.ok(Date.parse(result.checkedAt));
});

test('saved tenant actions remain reviewable outside the current top five accounts',async()=>{
  const higherBalances=Array.from({length:6},(_,index)=>bill(String.fromCharCode(100+index),`33333333-3333-4333-8333-${String(index).padStart(12,'0')}`,'Other tenant',10000));
  const result=await recommendationRecords(request('tenant:'+tenant,{...snapshot,late:[...higherBalances,...snapshot.late]}));
  assert.deepEqual(result.records.map(row=>row.id),[snapshot.late[0].id]);
  assert.equal(result.fact.subject,'Same name');
});

test('property overdue and collection reviews use their correct source bills',async()=>{
  assert.equal((await recommendationRecords(request('property:overdue'))).records.length,2);
  const result=await recommendationRecords(request('property:collections'));
  assert.deepEqual(result.records.map(row=>row.id),[snapshot.selected[0].id]);assert.equal(result.records[0].amount,1000);
  assert.match(result.fact.evidence,/1,000\.00 paid toward 2026-11 bills/);
});

test('request review includes unresolved tenant requests and guest inquiries only',async()=>{
  const result=await recommendationRecords(request('property:requests'));
  assert.deepEqual(result.records.map(row=>row.id),['r','q']);
  assert.equal(result.records[0].title,'Leaking tap');assert.equal(result.records[1].title,'Guest inquiry');
});

test('available-room review excludes test rooms and other room statuses',async()=>{
  const req=request('property:vacancy');
  const rows=[{id:'room',status:'available',room_number:'103',monthly_rate:2500,is_test:false,buildings:{name:'Building 2'}},
    {id:'test',status:'available',is_test:true},{id:'occupied',status:'occupied',is_test:false}];
  const filters=[];
  req.db.from=name=>{
    assert.equal(name,'rooms');
    return {select(){return this;},eq(field,value){filters.push([field,value]);return this;},order(){return this;},async range(offset){return {data:offset===0?rows:[]};}};
  };
  const result=await recommendationRecords(req);
  assert.deepEqual(result.records.map(row=>row.id),['room']);assert.equal(result.records[0].amount,2500);
  assert.ok(filters.some(([field,value])=>field==='is_test'&&value===false));
});

test('changed situations return an empty review rather than stale records',async()=>{
  const result=await recommendationRecords(request('tenant:'+tenant,{...snapshot,late:[],overdue:0}));
  assert.deepEqual(result.records,[]);assert.equal(result.fact,null);
});

test('non-admins and invalid review scopes are rejected before any database read',async()=>{
  const db={rpc(){assert.fail('must not read records');}};
  await assert.rejects(recommendationRecords({role:'tenant',query:{},db}),{status:403});
  for(const query of [{month:'bad',factId:'property:overdue'},{month:'2026-11',factId:'tenant:invalid'},{month:'2026-11',factId:'property:unknown'}]) {
    await assert.rejects(recommendationRecords({role:'admin',query,db}),{status:400});
  }
});

test('record lookup failures do not produce invented evidence',async()=>{
  const req=request('property:overdue');req.db.rpc=async()=>({error:{}});
  await assert.rejects(recommendationRecords(req),{status:503});
});
