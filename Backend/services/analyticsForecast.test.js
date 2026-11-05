import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics } from './appService.js';

test('analytics overrides legacy database forecast months together with the forecast amount', async () => {
  const payments = [
    { payment_date: '2025-10-01', amount: 300 },
    { payment_date: '2025-11-01', amount: 600 },
    { payment_date: '2025-12-01', amount: 900 },
  ];
  const db = {
    async rpc(name) { if(name==='reporting_months')return {data:['2026-01']}; return { data: {
      snapshot: {}, series: [], forecast: 9999,
      forecastMonths: [{ label: '2026-01', value: 9999 }],
    } }; },
    from() { return {
      select() { return this; }, gte() { return this; }, lt() { return this; }, order() { return this; },
      async range(offset) { return { data: offset === 0 ? payments : [] }; },
    }; },
  };
  for (const period of ['Monthly', 'Quarterly', 'Yearly']) {
    const response = await analytics({ query: { month: '2026-01', period }, db });
    assert.equal(response.forecastMonth, '2026-01');
    assert.equal(response.forecast, 600);
    assert.deepEqual(response.forecastMonths.map(point => point.label), ['2025-10', '2025-11', '2025-12']);
  }
});

test('analytics and PDF requests use the latest available month instead of an unavailable selection', async () => {
  let reportArgs;
  const db={
    async rpc(name,args){
      if(name==='reporting_months')return {data:['2025-07','2025-09']};
      assert.equal(name,'analytics_report');reportArgs=args;return {data:{snapshot:{},series:[]}};
    },
    from(){return {select(){return this;},gte(){return this;},lt(){return this;},order(){return this;},async range(){return {data:[]};}};},
  };
  const response=await analytics({query:{month:'2099-01',period:'Quarterly',export:'pdf'},db});
  assert.deepEqual(reportArgs,{p_month:'2025-09-01',p_period:'Quarterly',p_export:true});
  assert.equal(response.reportMonth,'2025-09');
  assert.equal(response.forecastMonth,'2025-09');
  assert.deepEqual(response.availableMonths,['2025-07','2025-09']);
});
