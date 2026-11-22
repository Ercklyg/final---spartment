import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendations } from './aiRecommendations.js';
import { generateContent } from '../models/gemini.js';
import { ACTIONS } from './recommendationFacts.js';
import { analytics } from './appService.js';
import { getRecommendationPreview, saveRecommendationPreview, clearRecommendationPreviews, formatInsightDate, recommendationFallbackMessage } from '../../Frontend/src/lib/aiRecommendations.js';

const snapshot = { cutoff: '2026-01-31', occupancy: 70, collected: 100, selected: [{paid:100}], outstanding: 0, rows: [], late: [] };
const selection = { factId: 'property:collections', actionId: 'review_collections' };
const item = { evidenceVersion: 1, ...selection, title: ACTIONS.review_collections.title, text: ACTIONS.review_collections.text, category: 'insight', subject: 'Collections for 2026-01', evidence: '₱100.00 collected' };
const success = (items = [selection]) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(items) }] } }] }));
function enableTestAi(t) {
  const previous = { AI_RECOMMENDATIONS_ENABLED: process.env.AI_RECOMMENDATIONS_ENABLED, GEMINI_API_KEY: process.env.GEMINI_API_KEY };
  process.env.AI_RECOMMENDATIONS_ENABLED = 'true'; process.env.GEMINI_API_KEY = 'test-only';
  t.after(() => { for (const [key,value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}
function request(user = 'admin', records = new Map()) {
  const stats = { reports: 0 };
  const db = {
    from(table) {
      assert.equal(table, 'saved_ai_recommendations');
      const filters = {};
      const query = { select() { return query; }, eq(field,value) { filters[field] = value; return query; },
        async maybeSingle() { assert.equal(filters.admin_id,user); return { data: records.get(user + '|' + filters.report_month + '|' + filters.period) || null }; } };
      return query;
    },
    async rpc(name,args) {
      if (name === 'analytics_report') { stats.reports++; return { data: { snapshot } }; }
      const key = user + '|' + args.p_month + '|' + args.p_period;
      const previous = records.get(key);
      const data = name === 'save_ai_recommendations'
        ? { items: args.p_items, generated_at: new Date(Date.now()).toISOString(), reporting_cutoff: args.p_cutoff, last_failure: null, failed_at: null }
        : { items: [], generated_at: null, ...previous, last_failure: args.p_reason, failed_at: new Date(Date.now()).toISOString() };
      assert.ok(['save_ai_recommendations','record_ai_recommendation_failure'].includes(name));
      records.set(key,data); return { data };
    },
  };
  return { role: 'admin', user: { id: user }, body: { month: '2026-01' }, db, stats, records };
}

test('saved installment advice is rebuilt from current balances and removed when paid',async t=>{
  enableTestAi(t);
  const originalLate=snapshot.late;
  t.after(()=>{snapshot.late=originalLate;});
  const tenantId='11111111-1111-4111-8111-111111111111';
  const choice={factId:'tenant:'+tenantId,actionId:'discuss_payment_options'};
  const provider=t.mock.method(globalThis,'fetch',async()=>success([choice]));
  snapshot.late=[{id:'22222222-2222-4222-8222-222222222222',tenant_id:tenantId,name:'Tenant',balance:3996.50}];
  const req=request('installment-admin');
  const initial=await recommendations(req);
  assert.match(initial.items[0].suggestedSteps[0],/1,998\.25 first and ₱1,998\.25 second/);
  snapshot.late=[{...snapshot.late[0],balance:100.01}];
  const refreshed=await recommendations(req);
  assert.match(refreshed.items[0].suggestedSteps[0],/50\.00 first and ₱50\.01 second/);
  assert.equal(refreshed.updatedAt,initial.updatedAt);
  assert.equal(provider.mock.callCount(),1);
  snapshot.late=[];
  assert.deepEqual((await recommendations(req)).items,[]);
  assert.equal(provider.mock.callCount(),1);
});

test('durable saved insights recheck operational facts without provider calls, expire without automatic generation and deduplicate forced refreshes', async t => {
  enableTestAi(t); let calls = 0;
  t.mock.method(globalThis,'fetch',async () => { calls++; return success(); });
  const req = request();
  const first = await recommendations(req);
  assert.equal(first.cached,false);
  const cached = await recommendations(req);
  assert.equal(cached.cached,true); assert.equal(cached.updatedAt,first.updatedAt);
  assert.equal(req.stats.reports,2); assert.equal(calls,1);
  const now = Date.now(); t.mock.method(Date,'now',() => now + 13*60*60*1000);
  const stale = await recommendations(req);
  assert.equal(stale.stale,true); assert.equal(stale.refreshRecommended,false); assert.equal(req.stats.reports,3);
  const forced = { ...req, body: { ...req.body, force:true } };
  const [fresh,same] = await Promise.all([recommendations(forced),recommendations(forced)]);
  assert.deepEqual(fresh,same); assert.equal(fresh.cached,false); assert.equal(calls,2); assert.equal(req.stats.reports,5);
});

test('quota failure preserves original generation time and survives a service restart without automatic retries', async t => {
  enableTestAi(t);
  const fetchMock = t.mock.method(globalThis,'fetch',async () => success());
  const req = request('quota-admin');
  const first = await recommendations(req);
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: { status:'RESOURCE_EXHAUSTED', message:'Quota' } }), { status:429 }));
  const failed = await recommendations({ ...req, body: { ...req.body, force:true } });
  assert.deepEqual(failed.items,first.items); assert.equal(failed.updatedAt,first.updatedAt);
  assert.equal(failed.fallback,true); assert.equal(failed.reason,'quota'); assert.equal(failed.source,'cache'); assert.equal(failed.refreshRecommended,false);
  const restarted = await import('./aiRecommendations.js?restart=' + Date.now());
  const restored = await restarted.recommendations(request('quota-admin',req.records));
  assert.deepEqual({...restored,figuresCheckedAt:null},{...failed,figuresCheckedAt:null}); assert.equal(fetchMock.mock.callCount(),2);
  assert.ok(Number.isFinite(Date.parse(restored.figuresCheckedAt)));
  fetchMock.mock.mockImplementation(async () => success());
  const now=Date.now(); t.mock.method(Date,'now',() => now+60000);
  const retry = await restarted.recommendations({ ...req, body: { ...req.body, force:true } });
  assert.equal(retry.fallback,false); assert.equal(retry.reason,null); assert.notEqual(retry.updatedAt,first.updatedAt);
  assert.equal((await recommendations(req)).reason,null);
});

test('no prior AI result stays empty on quota failure instead of substituting local suggestions', async t => {
  enableTestAi(t); let calls=0;
  t.mock.method(globalThis,'fetch',async () => { calls++; return new Response('{}',{status:429}); });
  const req=request('empty-limit');
  const result=await recommendations(req);
  assert.deepEqual(result.items,[]); assert.equal(result.reason,'quota'); assert.equal(result.updatedAt,null); assert.equal(result.fallback,true);
  assert.equal((await recommendations(req)).refreshRecommended,false); assert.equal(calls,1);
});

test('service failures, invalid responses, and disabled configuration retain saved AI cards', async t => {
  enableTestAi(t);
  const fetchMock=t.mock.method(globalThis,'fetch',async () => success());
  const req=request('failures'); const first=await recommendations(req);
  for(const response of [() => new Response('{}',{status:503}), () => new Response(JSON.stringify({candidates:[{content:{parts:[{text:'invalid JSON'}]}}]})), () => new Response(JSON.stringify({candidates:[{content:{parts:[{text:'[]'}]}}]})), () => new Response('{}',{status:401})]) {
    fetchMock.mock.mockImplementation(async () => response());
    const result=await recommendations({...req,body:{...req.body,force:true}});
    assert.equal(result.fallback,true); assert.deepEqual(result.items,first.items); assert.equal(result.updatedAt,first.updatedAt); assert.equal(result.refreshRecommended,false);
  }
  const before=fetchMock.mock.callCount(); delete process.env.GEMINI_API_KEY;
  const disabled=await recommendations(req);
  assert.equal(disabled.reason,'unavailable'); assert.equal(disabled.updatedAt,first.updatedAt); assert.equal(fetchMock.mock.callCount(),before);
});

test('saved recommendations are isolated by account, month and reporting period', async t => {
  enableTestAi(t); const records=new Map();
  const fetchMock=t.mock.method(globalThis,'fetch',async () => success());
  const req=request('owner',records); await recommendations(req);
  fetchMock.mock.mockImplementation(async () => new Response('{}',{status:429}));
  for(const other of [request('other',records),{...req,body:{month:'2026-02'}},{...req,body:{month:'2026-01',period:'Yearly'}}]) {
    const result=await recommendations(other); assert.equal(result.updatedAt,null); assert.deepEqual(result.items,[]);
  }
  assert.equal((await recommendations(req)).items.length,1);
  await assert.rejects(recommendations({...req,role:'tenant'}),error=>error.status===403);
});

test('provider attempts remain bounded and a slow attempt is aborted after fifteen seconds', async t => {
  enableTestAi(t); let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{ calls++; return new Response('{}',{status:503}); });
  const result=await recommendations(request('busy'));
  assert.equal(result.reason,'busy'); assert.deepEqual(result.items,[]); assert.equal(calls,2);
  t.mock.timers.enable({apis:['setTimeout']});
  t.mock.method(globalThis,'fetch',async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})));
  const promise=generateContent({apiKey:'test-only',model:'test',prompt:'test'});
  const rejected=assert.rejects(promise,{name:'AbortError'});
  t.mock.timers.tick(14999);
  t.mock.timers.tick(1); await rejected;
});

test('a valid seven-second Gemini response is allowed to finish', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  let requestSignal;
  t.mock.method(globalThis,'fetch',async(_url,{signal}) => {
    requestSignal=signal;
    return new Promise((resolve,reject) => {
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
      setTimeout(()=>resolve(success()),7000);
    });
  });
  const promise=generateContent({apiKey:'test-only',model:'test',prompt:'test'});
  t.mock.timers.tick(6000);
  assert.equal(requestSignal.aborted,false);
  t.mock.timers.tick(1000);
  assert.deepEqual(JSON.parse(await promise),[selection]);
});

test('unsupported AI associations cannot replace saved evidence-backed cards', async t => {
  enableTestAi(t);
  const fetchMock=t.mock.method(globalThis,'fetch',async()=>success());
  const req=request('unsupported'); const first=await recommendations(req);
  for (const output of [
    [{factId:'tenant:invented',actionId:'discuss_payment_options'}],
    [{...selection, text:'Corpuz Family owes 42552'}],
    [{...selection,actionId:'discuss_payment_options'}],
    [{title:'Loyalty discount',text:'Give a discount',category:'insight'}],
  ]) {
    fetchMock.mock.mockImplementation(async()=>success(output));
    const result=await recommendations({...req,body:{...req.body,force:true}});
    assert.equal(result.fallback,true); assert.deepEqual(result.items,first.items); assert.equal(result.updatedAt,first.updatedAt);
  }
});

test('legacy free-text cache is replaced on success and never exposed on failure', async t => {
  enableTestAi(t);
  const records=new Map();
  const req=request('legacy',records);
  const key='legacy|2026-01-01|Monthly';
  const legacy={items:[{title:'Old unverified claim',text:'Corpuz Family has 37 accounts',category:'warning',page:'Billing'}],generated_at:'2026-01-01T00:00:00Z'};
  records.set(key,legacy);
  const fetchMock=t.mock.method(globalThis,'fetch',async()=>success());
  const current=await recommendations(req);
  assert.equal(current.items[0].evidenceVersion,1); assert.equal(fetchMock.mock.callCount(),1);
  records.set(key,legacy);
  fetchMock.mock.mockImplementation(async()=>new Response('{}',{status:429}));
  const failed=await recommendations(req);
  assert.deepEqual(failed.items,[]); assert.equal(failed.updatedAt,null); assert.equal(failed.reason,'quota');
  await recommendations(req); assert.equal(fetchMock.mock.callCount(),2);
});

test('client previews preserve failure metadata and dates, separate periods and clear across account changes',()=>{
  clearRecommendationPreviews();
  saveRecommendationPreview('2026-01',{items:[item],fallback:true,reason:'quota',updatedAt:'2026-11-18T16:07:00Z'});
  const saved=getRecommendationPreview('2026-01'); assert.equal(saved.reason,'quota'); assert.equal(saved.updatedAt,'2026-11-18T16:07:00Z');
  assert.equal(getRecommendationPreview('2026-01','Yearly'),null); assert.equal(getRecommendationPreview('2026-02'),null);
  const message=recommendationFallbackMessage({reason:'quota',updatedAt:saved.updatedAt,hasItems:true});
  assert.equal(message,'AI usage limit reached. Showing the last generated recommendations from November 19, 2026 at 12:07 AM (Philippine time).');
  assert.equal(formatInsightDate('invalid'),null);
  assert.match(recommendationFallbackMessage({reason:'unavailable',hasItems:false}),/No previous AI recommendations/);
  clearRecommendationPreviews(); assert.equal(getRecommendationPreview('2026-01'),null);
});

test('saved AI selections use current operational evidence without consuming a model request',async t=>{
  enableTestAi(t);
  const req=request('operational-evidence');
  const old={...item,evidence:'Old totals including test payments'};
  req.records.set('operational-evidence|2026-01-01|Monthly',{items:[old],generated_at:'2026-01-01T00:00:00Z',reporting_cutoff:'2026-01-31',last_failure:null});
  const provider=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Provider must not be called');});
  const current=await recommendations(req);
  assert.notEqual(current.items[0].evidence,old.evidence);
  assert.match(current.items[0].evidence,/100\.00 paid toward 2026-01 bills/);
  assert.equal(current.figuresAsOf,'2026-01-31');
  assert.ok(Number.isFinite(Date.parse(current.figuresCheckedAt)));
  assert.ok(current.items[0].reason); assert.ok(current.items[0].actionLabel);
  assert.equal(current.updatedAt,'2026-01-01T00:00:00Z');
  assert.equal(current.refreshRecommended,false); assert.equal(provider.mock.callCount(),0);
  const rpc=req.db.rpc;
  req.db.rpc=(name,args)=>name==='analytics_report'?{error:{message:'Unavailable'}}:rpc(name,args);
  const unavailable=await recommendations(req);
  assert.deepEqual(unavailable.items,[]); assert.equal(unavailable.reason,'unavailable'); assert.equal(unavailable.figuresCheckedAt,null);
});

test('dashboard and saved recommendations share concurrent report work without calling Gemini', async t => {
  enableTestAi(t);
  const req = request('shared-dashboard');
  req.headers = { cookie: 'spartment-access=shared; __Host-spartment-access=shared' };
  req.records.set('shared-dashboard|2026-01-01|Monthly', { items: [item], generated_at: '2026-01-01T00:00:00Z', reporting_cutoff: '2026-01-31', last_failure: null });
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('saved recommendations must not call Gemini'); });
  const rpc = req.db.rpc;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  req.db.rpc = async (name, args) => {
    if (name === 'reporting_months') return { data: ['2026-01'] };
    const result = await rpc(name, args);
    if (name === 'analytics_report') await gate;
    return result;
  };
  const dashboard = analytics({ ...req, query: { month: '2026-01', view: 'dashboard' } });
  const insights = recommendations(req);
  await new Promise(resolve => setImmediate(resolve));
  release();
  const [data, ai] = await Promise.all([dashboard, insights]);
  assert.equal(req.stats.reports, 1);
  assert.equal(data.snapshot.collected, 100);
  assert.match(ai.items[0].evidence, /100\.00 paid toward 2026-01 bills/);
  assert.equal(ai.cached, true);
});
