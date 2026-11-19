import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendationFacts, recommendationPrompt, assembleRecommendations } from './recommendationFacts.js';

const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const bill=(id,tenant_id,name,balance)=>({id:`00000000-0000-4000-8000-${String(id).padStart(12,'0')}`,tenant_id,name,balance,room:'Main / 101'});
const snapshot={cutoff:'2026-11-19',collected:44295,selected:[{paid:12345}],outstanding:50000,occupancy:84.8,available:5,vacancyGap:18000,overdue:42552,
  late:[bill(1,first,'Corpuz Family',3000),bill(2,first,'Corpuz Family',2319),bill(3,second,'Another Tenant',37233)],
  collectionHealth:{repeatLatePayers:[{tenantId:first,name:'Wrong label must not be used',lateBillCount:5,overdueBalance:999999}]},
  openRequests:[{},{},{},{}],openInquiries:[{}]};

test('tenant evidence groups bills by identity and never attaches property totals to a tenant',()=>{
  const facts=buildRecommendationFacts(snapshot,'2026-11');
  const tenant=facts.find(f=>f.id==='tenant:'+first);
  assert.equal(tenant.subject,'Corpuz Family'); assert.equal(tenant.metrics.overdue,5319); assert.equal(tenant.metrics.overdueBills,2);
  assert.equal(tenant.metrics.lateBillsSixMonths,5);
  assert.match(tenant.evidence,/5,319\.00/); assert.doesNotMatch(tenant.evidence,/42,552|999,999|37 late/);
  assert.equal(facts.find(f=>f.id==='property:overdue').metrics.overdue,42552);
  const cards=assembleRecommendations([{factId:tenant.id,actionId:'discuss_payment_options'}],facts);
  assert.equal(cards[0].tenantId,first); assert.equal(cards[0].subject,'Corpuz Family');
  assert.equal(cards[0].text,'Contact this tenant to discuss a manageable payment arrangement, subject to approval.');
});

test('identical display names stay separate; duplicate bills do not inflate a balance',()=>{
  const facts=buildRecommendationFacts({...snapshot,late:[bill(1,first,'Same name',100),bill(1,first,'Same name',100),bill(2,second,'Same name',200)]},'2026-11');
  assert.equal(facts.find(f=>f.id==='tenant:'+first).metrics.overdue,100);
  assert.equal(facts.find(f=>f.id==='tenant:'+second).metrics.overdue,200);
  assert.equal(facts.find(f=>f.id==='tenant:'+second).metrics.lateBillsSixMonths,undefined);
});

test('overdue rooms are retained when a tenant has bills for more than one room',()=>{
  const facts=buildRecommendationFacts({...snapshot,late:[bill(1,first,'Tenant',100),{...bill(2,first,'Tenant',200),room:'Annex / 202'}]},'2026-11');
  const tenant=facts.find(f=>f.id==='tenant:'+first);
  assert.equal(tenant.room,'Annex / 202, Main / 101'); assert.equal(tenant.metrics.overdue,300);
});

test('unknown, missing and inconsistent identities cannot produce named cards',()=>{
  const facts=buildRecommendationFacts({...snapshot,late:[bill(1,first,'Name A',100),bill(2,first,'Name B',200),bill(3,null,'Someone',300),bill(4,second,'Unknown tenant',100)]},'2026-11');
  assert.equal(facts.filter(f=>f.kind==='tenant_overdue').length,0);
});

test('Gemini receives facts and action IDs without tenant names, and cannot introduce prose or cross-scope actions',()=>{
  const facts=buildRecommendationFacts(snapshot,'2026-11');
  const prompt=recommendationPrompt(facts,'2026-11',snapshot.cutoff);
  assert.doesNotMatch(prompt,/Corpuz Family|Another Tenant|Main \/ 101|loyalty/i);
  const invalid=[
    {factId:'tenant:unknown',actionId:'follow_up_tenant'},
    {factId:'property:overdue',actionId:'discuss_payment_options'},
    {factId:'tenant:'+first,actionId:'review_collections'},
    {factId:'property:collections',actionId:'__proto__'},
    {factId:'property:vacancy',actionId:'promote_rooms',text:'Promise a discount of 20 percent'},
  ];
  assert.deepEqual(assembleRecommendations(invalid,facts),[]);
});

test('valid selections retain Gemini priority, enforce category limits and derive every visible field from the backend',()=>{
  const facts=buildRecommendationFacts(snapshot,'2026-11');
  const cards=assembleRecommendations([
    {factId:'property:vacancy',actionId:'promote_rooms'},
    {factId:'tenant:'+first,actionId:'follow_up_tenant'},
    {factId:'property:overdue',actionId:'review_overdue'},
    {factId:'property:requests',actionId:'respond_to_requests'},
    {factId:'property:collections',actionId:'review_collections'},
  ],facts);
  assert.equal(cards.length,4); assert.equal(cards[0].factId,'property:vacancy');
  assert.match(cards[0].evidence,/5 available rooms.*18,000\.00 potential monthly rent/);
  assert.match(cards[2].evidence,/4 unresolved tenant requests.*1 guest inquiry/);
  assert.match(cards[3].evidence,/12,345\.00 paid toward 2026-11 bills.*50,000\.00 outstanding across all bill months.*84.8% current occupancy/);
  assert.ok(cards.every(card=>card.evidenceVersion===1));
});

test('missing or invalid source values do not become invented zero-value facts',()=>{
  assert.deepEqual(buildRecommendationFacts({},'2026-11'),[]);
  assert.deepEqual(buildRecommendationFacts({collected:NaN,outstanding:0,available:-1,vacancyGap:100,overdue:Infinity},'2026-11'),[]);
  assert.deepEqual(buildRecommendationFacts({collected:100,outstanding:0},'2026-11'),[]);
  const facts=buildRecommendationFacts({selected:[],outstanding:0},'2026-11');
  assert.equal(facts.length,1); assert.match(facts[0].evidence,/0\.00/);
});

test('reasons and review labels come from verified facts, not model prose',()=>{
  const facts=buildRecommendationFacts(snapshot,'2026-11');
  const card=assembleRecommendations([{factId:'tenant:'+first,actionId:'discuss_payment_options'}],facts)[0];
  assert.match(card.reason,/overdue bills and repeated late payments/);
  assert.equal(card.actionLabel,"Review tenant's bills"); assert.equal(card.reportMonth,'2026-11');
  const withoutHistory=buildRecommendationFacts({...snapshot,collectionHealth:{}},'2026-11').find(fact=>fact.id==='tenant:'+first);
  assert.doesNotMatch(withoutHistory.reason,/repeated/);
  assert.match(withoutHistory.reason,/unpaid balance past its due date/);
});

test('collection facts use selected bill payments in cents and never payment-date receipts',()=>{
  const fact=buildRecommendationFacts({...snapshot,selected:[{paid:0.10},{paid:0.20}]},'2026-11').find(fact=>fact.kind==='collections');
  assert.equal(fact.metrics.collected,0.30); assert.doesNotMatch(fact.evidence,/44,295/);
  assert.ok(!buildRecommendationFacts({...snapshot,selected:[{paid:NaN}]},'2026-11').some(fact=>fact.kind==='collections'));
});
