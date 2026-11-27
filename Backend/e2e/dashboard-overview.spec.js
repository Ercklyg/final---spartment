import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const notices=Array.from({length:9},(_,index)=>({id:`n-${index}`,category:['Payments','Leases','Requests','Rooms','Inquiries'][index%5],title:`Priority property update ${index}: tenant account requiring review`,text:'A long tenant name in Main Building / Room 101 requires your review. '.repeat(3),priority:['High','Normal','Informational'][index%3],time:'Due November 30, 2026'}));
const items=Array.from({length:6},(_,index)=>({evidenceVersion:1,category:['warning','opportunity','attention','insight'][index%4],title:`Recommended action ${index}: review outstanding tenant accounts`,subject:'Alexandra Santos with a long tenant name',evidence:'PHP 12,000 outstanding across several unpaid bills, including rent and utility charges',text:'Review the complete payment history and contact the tenant to discuss a realistic payment arrangement. '.repeat(4),reason:'Several bills are outstanding.',suggestedSteps:['Check recorded payments','Contact the tenant','Record the agreed follow-up'],page:'Billing'}));
async function setup(page,{empty=false,fallback=false,recommendationCount=6}={}){
 await mockAdminApi(page,{startAuthenticated:true,analyticsData:{snapshot:{cutoff:'2026-11-27',selected:[{paid:123456789.12}],rows:[],late:[{id:'late-1'}],overdue:22000,outstanding:30000,collected:123456789.12,occupancy:89.5,activeTenants:27,available:3,inventory:[],openRequests:[{},{}],openInquiries:[{}],collectionHealth:{repeatLatePayers:[]}}}});
 let fail=false;
 await page.route('**/api/analytics?*',route=>fail ? route.fulfill({status:503,json:{error:'A long server error message. '.repeat(40)}}) : route.fallback());
 await page.route('**/api/notifications/admin',route=>route.fulfill({json:empty?[]:notices}));
 await page.route('**/api/analytics/recommendations',route=>route.fulfill({json:{items:empty?[]:items.slice(0,recommendationCount),fallback,source:fallback?'cache':'ai',reason:fallback?'quota':null,updatedAt:'2026-11-27T01:00:00Z',figuresCheckedAt:'2026-11-27T02:00:00Z'}}));
 await page.goto('/');
 await expect(page.getByRole('region',{name:'Property metrics'})).toBeVisible();
 return {setFail:value=>{fail=value;}};
}
async function noOverflow(page){
 const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,panels:[...document.querySelectorAll('.dashboard-heading,.dashboard-metrics,.dashboard-attention,.dashboard-notifications,.dashboard-insights')].map(e=>({bottom:e.getBoundingClientRect().bottom,scroll:e.scrollHeight,height:e.clientHeight}))}));
 expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
 expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height+1);
 for(const panel of layout.panels){expect(panel.bottom).toBeLessThanOrEqual(layout.height);expect(panel.scroll).toBeLessThanOrEqual(panel.height+1);}
}

test('desktop overview fits supported screens without scrolling and retains full lists',async({page},testInfo)=>{
 await page.setViewportSize({width:1280,height:720});await setup(page);
 const notifications=page.getByRole('region',{name:'Admin notifications',exact:true});
 const insights=page.getByRole('region',{name:'Insights summary',exact:true});
 await expect(insights.getByText('Showing 3 of 6 recommendations')).toBeVisible();
 await expect(notifications.getByRole('button',{name:/View notification:/})).toHaveCount(3);
 for(const [width,height] of [[1280,720],[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  if(height >= 900){await expect.poll(()=>notifications.getByRole('button',{name:/View notification:/}).count()).toBeGreaterThan(2);await expect.poll(()=>insights.locator('.dashboard-preview-row').count()).toBeGreaterThan(2);}
  await noOverflow(page);
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Expand sidebar'})).toBeVisible();
  await page.waitForTimeout(250);await noOverflow(page);
  await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
 }
 await page.setViewportSize({width:1280,height:720});
 await expect(notifications.getByRole('button',{name:/View notification:/})).toHaveCount(3);
 await expect(notifications.locator('.dashboard-preview-row').first()).toHaveClass(/border-l-rose-500/);
 await expect(notifications.locator('.dashboard-preview-row').nth(1)).toHaveClass(/border-l-amber-400/);
 await expect(insights.locator('.dashboard-preview-row').first()).toHaveClass(/border-l-blue-500/);
 await expect(insights.locator('.dashboard-preview-row').nth(1)).toHaveClass(/border-l-emerald-500/);
 await page.screenshot({path:testInfo.outputPath('one-screen-dashboard.png')});
 const all=notifications.getByRole('button',{name:'View all',exact:true});await all.click();
 const dialog=page.getByRole('dialog',{name:'All notifications',exact:true});
 await expect(dialog.getByRole('button',{name:/View notification:/})).toHaveCount(9);
 await page.keyboard.press('Escape');await expect(all).toBeFocused();
 await insights.getByRole('button',{name:items[0].title,exact:false}).click();
 const advice=page.getByRole('dialog',{name:'All insights & recommendations'});
 await expect(advice.getByRole('heading',{level:3})).toHaveCount(6);
 await expect(advice.getByText('Suggested steps',{exact:true}).first()).toBeVisible();
 await page.keyboard.press('Escape');await noOverflow(page);
});

test('compact saved insights remain within the viewport',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await setup(page,{fallback:true});
 await expect(page.getByText('Showing saved insights. Open View all for status and details.')).toBeVisible();await noOverflow(page);
 await page.getByRole('region',{name:'Insights summary'}).getByRole('button',{name:'View all',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'All insights & recommendations'})).toContainText('AI usage limit reached');
 await page.keyboard.press('Escape');
});

test('smaller windows retain a readable scrolling dashboard',async({page})=>{
 await page.setViewportSize({width:412,height:915});await setup(page);
 await expect(page.getByRole('heading',{name:'Good morning, Admin'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(true);
 await page.setViewportSize({width:1280,height:650});
 await expect(page.getByRole('heading',{name:'Good morning, Admin'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(true);
});

test('empty compact dashboard does not grow beyond one screen',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await setup(page,{empty:true});await noOverflow(page);
});

test('a failed dashboard refresh keeps a compact readable error and saved figures',async({page})=>{
 await page.setViewportSize({width:1280,height:720});const {setFail}=await setup(page);
 await expect(page.getByRole('region',{name:'Insights summary'}).getByText('Showing 3 of 6 recommendations')).toBeVisible();
 setFail(true);await page.getByRole('button',{name:'Refresh dashboard',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Showing saved dashboard figures'})).toBeVisible();
 await noOverflow(page);
 setFail(false);await page.getByRole('button',{name:'Refresh dashboard',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Showing saved dashboard figures'})).toHaveCount(0);await noOverflow(page);
});

test('notification filters preserve dialog dimensions and three insight cards fit without scrolling',async({page},testInfo)=>{
 await page.setViewportSize({width:1280,height:720});await setup(page,{recommendationCount:3});
 const notifications=page.getByRole('region',{name:'Admin notifications',exact:true});
 await expect(notifications.getByRole('button',{name:/View notification:/})).toHaveCount(3);
 await notifications.getByRole('button',{name:'View all',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'All notifications',exact:true});
 const initial=await dialog.boundingBox();
 for(const category of ['Payments','Rooms','Inquiries','All']){
  await dialog.getByRole('button',{name:new RegExp('^'+category+':')}).click();
  const size=await dialog.boundingBox();
  expect(size.height).toBe(initial.height);expect(size.width).toBe(initial.width);expect(size.y).toBe(initial.y);
  expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 }
 await page.screenshot({path:testInfo.outputPath('fixed-notification-dialog.png')});
 await page.keyboard.press('Escape');
 await page.getByRole('region',{name:'Insights summary'}).getByRole('button',{name:'View all',exact:true}).click();
 const insights=page.getByRole('dialog',{name:'All insights & recommendations'});
 await expect(insights.getByRole('article')).toHaveCount(3);
 await expect(insights.getByRole('heading',{level:2})).toHaveCount(1);
 const cards=await insights.getByRole('article').all();
 const first=await cards[0].boundingBox();
 let previousBottom=0;
 for(const item of cards){
  await expect(item).toBeInViewport();
  const bounds=await item.boundingBox();expect(bounds.x).toBe(first.x);expect(bounds.width).toBe(first.width);expect(bounds.y).toBeGreaterThanOrEqual(previousBottom);previousBottom=bounds.y+bounds.height;
 }
 expect(await insights.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 expect(await insights.locator('.insights-dialog-cards').evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('three-insight-dialog.png')});
 await page.keyboard.press('Escape');await noOverflow(page);
});
