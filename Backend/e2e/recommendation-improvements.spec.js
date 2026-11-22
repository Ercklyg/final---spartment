import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';
import { buildRecommendationFacts, assembleRecommendations } from '../services/recommendationFacts.js';
import { recommendationRecords } from '../services/recommendationRecords.js';

const tenant='11111111-1111-4111-8111-111111111111';
const snapshot={cutoff:'2026-11-19',collected:49995,outstanding:6819,overdue:5319,occupancy:90,activeTenants:27,
  available:3,vacancyGap:7500,inventory:[],rows:[],
  selected:[{id:'november-rent',tenant_id:tenant,name:'Corpuz Family',bill_type:'rent',billing_period:'2026-11-01',due_date:'2026-11-30',room:'Building 2 / 202',total:2500,paid:1000,balance:1500,status:'Partially paid'}],
  late:[882,2500,1063,874].map((balance,index)=>({id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,tenant_id:tenant,name:'Corpuz Family',room:'Building 2 / 202',balance,total:balance,paid:0,bill_type:index===1?'rent':'utility',billing_period:index<2?'2026-08-01':index===2?'2026-09-01':'2026-10-01',due_date:index<2?'2026-08-31':index===2?'2026-09-30':'2026-10-31',status:'Late'})),
  collectionHealth:{repeatLatePayers:[{tenantId:tenant,lateBillCount:5}]},
  openRequests:[{id:'request-1',subject:'Leaking tap',kind:'maintenance',status:'New',created_at:'2026-11-18T01:00:00Z'},{id:'request-2',subject:'Door repair',kind:'maintenance',status:'Scheduled',created_at:'2026-11-18T02:00:00Z'}],
  openInquiries:[{id:'inquiry-1',status:'New',created_at:'2026-11-18T03:00:00Z'}]};
const choices=[{factId:'tenant:'+tenant,actionId:'discuss_payment_options'},{factId:'property:vacancy',actionId:'promote_rooms'},
  {factId:'property:requests',actionId:'respond_to_requests'},{factId:'property:collections',actionId:'review_collections'}];

test('insights explain their source and open the matching records without another AI request',async({page},testInfo)=>{
  if(testInfo.project.name==='mobile-chrome')await page.setViewportSize({width:320,height:740});
  await mockAdminApi(page,{startAuthenticated:true,analyticsData:{snapshot}});
  let aiCalls=0;
  await page.route('**/api/analytics/recommendations',route=>{
    aiCalls++;
    return route.fulfill({json:{items:assembleRecommendations(choices,buildRecommendationFacts(snapshot,'2026-11')),cached:true,source:'ai',
      updatedAt:'2026-11-19T12:01:00Z',figuresCheckedAt:'2026-11-20T01:15:00Z',figuresAsOf:'2026-11-19'}});
  });
  let current=snapshot;
  await page.route('**/api/analytics/recommendations/records?*',async route=>{
    const query=Object.fromEntries(new URL(route.request().url()).searchParams);
    const rows=Array.from({length:3},(_,i)=>({id:'room-'+i,room_number:String(101+i),status:'available',monthly_rate:2500,is_test:false,buildings:{name:'Building 2'}}));
    const db={rpc:async()=>({data:{snapshot:current}}),from(){return {select(){return this;},eq(){return this;},order(){return this;},async range(offset){return {data:offset===0?rows:[]};}};}};
    return route.fulfill({json:await recommendationRecords({role:'admin',query,db})});
  });
  await page.goto('/');
  const panel=page.getByRole('region',{name:'Insights & Recommendations'});
  await expect(panel.getByText(/Reason: This account has overdue bills and repeated late payments/)).toBeVisible();
  await expect(panel).toContainText('Actions generated November 19, 2026 at 8:01 PM');
  await expect(panel).toContainText('Figures checked November 20, 2026 at 9:15 AM');
  await expect(panel).toContainText('₱1,000.00 paid toward 2026-11 bills');
  await expect(panel).not.toContainText('49,995');
  const paymentAdvice=panel.getByRole('button',{name:/Discuss payment options/});
  await expect(paymentAdvice.getByText('Suggested steps',{exact:true})).toBeVisible();
  await expect(paymentAdvice.getByRole('listitem')).toHaveCount(3);
  await expect(paymentAdvice).toContainText('₱2,659.50 first and ₱2,659.50 second');
  await expect(paymentAdvice).toContainText('administrator approval and tenant agreement');
  await expect(panel.getByRole('button',{name:/View available rooms/})).toContainText('Promote the verified room listings');
  expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await panel.screenshot({path:testInfo.outputPath('improved-insights.png')});
  const before=aiCalls;
  await panel.getByRole('button',{name:/Review tenant's bills/}).click();
  let dialog=page.getByRole('dialog',{name:"Review tenant's bills"});
  await expect(dialog.getByRole('article')).toHaveCount(4);
  await expect(dialog).toContainText('₱882.00');
  await dialog.screenshot({path:testInfo.outputPath('tenant-bill-review.png')});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await panel.getByRole('button',{name:/View available rooms/}).click();
  dialog=page.getByRole('dialog',{name:'View available rooms'});
  await expect(dialog.getByRole('article')).toHaveCount(3);
  await dialog.getByRole('button',{name:'Close supporting records'}).click();
  await panel.getByRole('button',{name:/Review unresolved items/}).click();
  dialog=page.getByRole('dialog',{name:'Review unresolved items'});
  await expect(dialog.getByRole('article')).toHaveCount(3);
  await expect(dialog).toContainText('Leaking tap');
  await dialog.getByRole('button',{name:'Close supporting records'}).click();
  await panel.getByRole('button',{name:/Review this month's bills/}).click();
  dialog=page.getByRole('dialog',{name:"Review this month's bills"});
  await expect(dialog.getByRole('article')).toHaveCount(1);
  await expect(dialog).toContainText('Paid toward this bill: ₱1,000.00');
  await dialog.getByRole('button',{name:'Close supporting records'}).click();
  current={...snapshot,late:[],overdue:0};
  await panel.getByRole('button',{name:/Review tenant's bills/}).click();
  dialog=page.getByRole('dialog',{name:"Review tenant's bills"});
  await expect(dialog).toContainText('No matching records remain.');
  expect(aiCalls).toBe(before);
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
});
