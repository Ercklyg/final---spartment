import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsSnapshot,periodSeries,forecastCollections,analyticsCsv} from './adminAnalytics.js';
const data={rooms:[{id:'r',status:'occupied',room_number:'101',monthly_rate:6500},{id:'v',status:'available',monthly_rate:8000},{id:'m',status:'maintenance',monthly_rate:9000}],profiles:[{id:'t',full_name:'=SUM(1,2)',role:'tenant'}],leases:[{id:'l',tenant_id:'t',room_id:'r',status:'active'}],bills:[{id:'b',lease_id:'l',bill_type:'rent',billing_period:'2026-01-01',due_date:'2026-01-15',rent_amount:100.30,electricity_amount:0,water_amount:0}],payments:[{id:'p',bill_id:'b',payment_date:'2026-01-20',amount:20.10},{id:'q',bill_id:'b',payment_date:'2026-02-02',amount:80.20}],requests:[{id:'x',status:'Open',kind:'maintenance'},{id:'y',status:'Resolved'}],inquiries:[]};
test('Historical balances exclude later payments; cents and current inventory are correct',()=>{
  const s=analyticsSnapshot(data,'2026-01','2026-03-01');
  assert.equal(s.collected,20.10);assert.equal(s.outstanding,80.20);assert.equal(s.overdue,80.20);
  assert.equal(s.activeTenants,1);assert.equal(s.available,1);assert.equal(s.vacancyGap,8000);
  assert.equal(s.openRequests.length,1);assert.equal(s.selected[0].status,'Late');
  const later=analyticsSnapshot(data,'2026-02','2026-03-01');assert.equal(later.outstanding,0);assert.equal(later.rows[0].status,'Paid');
});
test('Grouping uses payment dates and selected-month cutoff',()=>{
  const january=periodSeries(data,'2026-01','Quarterly').at(-1);
  assert.equal(january.value,20.10);assert.equal(january.billed,100.30);
  assert.equal(periodSeries(data,'2026-02','Quarterly').at(-1).value,100.30);
  assert.equal(periodSeries(data,'2026-02','Monthly').at(-1).billed,0);
});
test('Empty database is zero, no forecast, safe CSV encoding',()=>{
  const empty=Object.fromEntries(Object.keys(data).map(key=>[key,[]]));
  assert.equal(analyticsSnapshot(empty,'2026-01').occupancy,0);
  assert.equal(forecastCollections(empty,'2026-01'),null);
  const csv=analyticsCsv(analyticsSnapshot(data,'2026-01','2026-03-01'),periodSeries(data,'2026-01'),'2026-01');
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
});
