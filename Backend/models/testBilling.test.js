import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBillingLeases, createBill, summarizeBill } from './billing.js';

const real={id:'11111111-1111-4111-8111-111111111111',tenant_id:'a',profiles:{is_test:false},rooms:{monthly_rate:2500,is_test:false}};
const testRoom={id:'22222222-2222-4222-8222-222222222222',tenant_id:'b',profiles:{is_test:false},rooms:{monthly_rate:3000,is_test:true}};
const testAccount={id:'33333333-3333-4333-8333-333333333333',tenant_id:'c',profiles:{is_test:true},rooms:{monthly_rate:4000,is_test:false}};
function database() {
  const writes=[];
  return {writes,from(table){
    const query={select(){return query;},order(){return query;},eq(){return query;},async range(offset){return {data:offset?[]:table==='leases'?[real,testRoom,testAccount]:[]};}};
    return query;
  },async rpc(name,args){assert.equal(name,'create_bill');writes.push(args);return {error:null};}};
}
test('bulk billing excludes both test accounts and test rooms while explicit test billing remains available',async()=>{
  const db=database();
  assert.equal((await loadBillingLeases(db)).length,1);
  const all=await loadBillingLeases(db,null,null,true);
  assert.equal(all.length,3); assert.equal(all.filter(l=>l.is_test).length,2);
  const form={lease:'all',type:'rent',period:'2026-11',due:'2026-11-30'};
  assert.equal((await createBill(db,form)).created,1);
  assert.equal(db.writes[0].p_lease,real.id);
  await createBill(db,{...form,lease:testRoom.id,rent:3000});
  assert.equal(db.writes[1].p_lease,testRoom.id);
});
test('test bill labels follow either linked account or room without losing payments',()=>{
  for(const lease of [testRoom,testAccount]) {
    const bill=summarizeBill({leases:lease,rent_amount:3000,electricity_amount:0,water_amount:0,payments:[{amount:1000}],due_date:'2099-01-01'});
    assert.equal(bill.is_test,true); assert.equal(bill.paid,1000); assert.equal(bill.balance,2000);
  }
});
