import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';
import { buildRecommendationFacts, assembleRecommendations } from '../services/recommendationFacts.js';

test('recommendation cards separate tenant evidence from property totals on desktop and narrow phones',async({page},testInfo)=>{
  if(testInfo.project.name==='mobile-chrome')await page.setViewportSize({width:320,height:740});
  await mockAdminApi(page,{startAuthenticated:true});
  const tenantId='11111111-1111-4111-8111-111111111111';
  const facts=buildRecommendationFacts({
    late:[{id:'22222222-2222-4222-8222-222222222222',tenant_id:tenantId,name:'Corpuz Family',room:'Building 2 / 202',balance:5319}],
    collectionHealth:{repeatLatePayers:[{tenantId,lateBillCount:5}]},
    overdue:42552,available:5,vacancyGap:18000,collected:44295,outstanding:50000,occupancy:84.8,openRequests:[{},{},{},{}],openInquiries:[{}],
  },'2026-11');
  const items=assembleRecommendations([
    {factId:'tenant:'+tenantId,actionId:'discuss_payment_options'},
    {factId:'property:vacancy',actionId:'promote_rooms'},
    {factId:'property:requests',actionId:'respond_to_requests'},
    {factId:'property:collections',actionId:'review_collections'},
  ],facts);
  await page.route('**/api/analytics/recommendations',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({items,updatedAt:'2026-11-19T00:00:00Z',fallback:false,cached:true})}));
  await page.goto('/');
  const panel=page.getByRole('region',{name:'Insights & Recommendations'});
  const tenant=panel.getByRole('button',{name:/Discuss payment options/});
  await expect(tenant).toContainText('Corpuz Family · Building 2 / 202');
  await expect(tenant.locator('strong')).toHaveText('₱5,319.00 overdue');
  await expect(tenant).toContainText('5 late bills in the last 6 months');
  await expect(tenant).toContainText('Contact this tenant');
  await expect(tenant.getByText('Payments',{exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Refresh insights',exact:true})).toBeVisible();
  await expect(panel.getByText('Saved insights · Generated November 19, 2026 at 8:00 AM (Philippine time)',{exact:true})).toBeVisible();
  await expect(panel.getByText('Available rooms',{exact:true})).toHaveCount(0);
  await expect(panel.getByText('Unresolved requests and inquiries',{exact:true})).toHaveCount(0);
  await expect(panel).not.toContainText('Suggested action:');
  await expect(tenant).not.toContainText('42,552');
  await expect(panel.getByRole('button',{name:/Promote available rooms/})).toContainText('₱18,000.00 potential monthly rent');
  await expect(panel).not.toContainText('loyalty');
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await tenant.scrollIntoViewIfNeeded();
  await panel.screenshot({path:testInfo.outputPath('evidence-cards.png')});
  await tenant.click();
  await expect(page.getByRole('heading',{name:'Billing',exact:true})).toBeVisible();
});

test('unverified legacy cards are not shown by the dashboard',async({page})=>{
  await mockAdminApi(page,{startAuthenticated:true});
  await page.route('**/api/analytics/recommendations',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{title:'Unsupported claim',text:'Corpuz Family has 37 accounts',category:'warning'}],fallback:true,reason:'quota'})}));
  await page.goto('/');
  const panel=page.getByRole('region',{name:'Insights & Recommendations'});
  await expect(panel.getByRole('status')).toContainText('No previous AI recommendations are saved');
  await expect(panel).not.toContainText('Unsupported claim');
  await expect(panel).not.toContainText('Corpuz Family');
});
