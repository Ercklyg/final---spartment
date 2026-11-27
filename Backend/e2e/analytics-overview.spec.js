import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';
import { collectionForecast, forecastValidation } from '../models/collectionForecast.js';

const history=Array.from({length:10},(_,i)=>({billing_period:`2026-${String(i+1).padStart(2,'0')}-01`,amount:30000+i*1000}));
const risk=Array.from({length:10},(_,i)=>({tenantId:`tenant-${i}`,name:`Tenant ${i} with a long family name`,room:`${i<6?'Main Building':'Building 2'} / ${101+i}`,lateBillCount:2+i,overdueBalance:2500+i*100}));
const snapshot={cutoff:'2026-11-27',selected:[],rows:[],late:[],collected:44000,outstanding:22000,overdue:12000,occupancy:90.9,activeTenants:27,available:3,vacancyGap:7500,inventory:[{status:'occupied',count:30},{status:'available',count:3}],collectionHealth:{repeatLatePayers:risk,aging:[{label:'61+ days',balance:12000,billCount:5}],onTimeRate:80,collectionRate:90}};
async function setup(page,{empty=false}={}){
 const analyticsData={snapshot,...collectionForecast(history,'2026-11','2026-11-27'),forecastValidation:forecastValidation(history,'2026-11','2026-11-27'),series:Array.from({length:12},(_,i)=>({label:`2026-${String(i+1).padStart(2,'0')}`,billed:40000+i*1000,value:35000+i*900})),loadedAt:'2026-11-27T02:00:00Z'};
 if(empty){analyticsData.snapshot={...snapshot,collectionHealth:null,available:0,vacancyGap:0,occupancy:0};analyticsData.series=[];Object.assign(analyticsData,collectionForecast([],'2026-11','2026-11-27'));analyticsData.forecastValidation=forecastValidation([],'2026-11','2026-11-27');}
 const {calls}=await mockAdminApi(page,{startAuthenticated:true,analyticsData});
 await page.goto('/');await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
 await expect(page.getByRole('region',{name:'Revenue trend',exact:true})).toBeVisible();return {calls};
}
async function fits(page){
 await expect.poll(()=>page.evaluate(()=>({width:document.documentElement.scrollWidth<=innerWidth,height:document.documentElement.scrollHeight<=innerHeight+1,panels:[...document.querySelectorAll('.analytics-report-grid .analytics-panel')].every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)}))).toEqual({width:true,height:true,panels:true});
}

test('analytics fits five colored panels on desktop without Collection Health',async({page},testInfo)=>{
 await page.setViewportSize({width:1280,height:720});const {calls}=await setup(page);
 await expect(page.getByRole('region',{name:'Collection health'})).toHaveCount(0);
 await expect(page.locator('.analytics-report-grid .analytics-panel')).toHaveCount(5);
 for(const [width,height] of [[1280,720],[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});await fits(page);
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await page.waitForTimeout(250);await fits(page);
  await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
 }
 await page.setViewportSize({width:1280,height:720});await fits(page);
 for(const period of ['Quarterly','Yearly','Monthly']){
  await page.getByRole('button',{name:period,exact:true}).click();await expect.poll(()=>calls.some(call=>call.path==='/analytics'&&new URLSearchParams(call.search).get('period')===period)).toBe(true);await fits(page);
 }
 await page.screenshot({path:testInfo.outputPath('analytics-one-screen.png')});
});

test('risk details retain building filters and pagination, and forecast details preserve calculations',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await setup(page);
 const riskPanel=page.getByRole('region',{name:'Tenant payment risk',exact:true});
 await expect(riskPanel.locator('tbody tr')).toHaveCount(3);
 const trigger=riskPanel.getByRole('button',{name:'View all',exact:true});await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Tenant payment risk details',exact:true});
 await expect(dialog.getByRole('table').locator('tbody tr')).toHaveCount(5);
 await dialog.getByRole('button',{name:'Next',exact:true}).click();await expect(dialog).toContainText('Tenant 9');
 await dialog.getByLabel('Filter tenant payment risk by building').selectOption('Building 2');await expect(dialog.getByRole('table').locator('tbody tr')).toHaveCount(4);
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.getByRole('button',{name:'How this is calculated',exact:true}).click();
 const forecast=page.getByRole('dialog',{name:'Collection forecast details'});await expect(forecast).toContainText('Payments count toward the bill month');await expect(forecast).toContainText("÷ 3 =");
 await page.keyboard.press('Escape');await fits(page);
});

test('empty analytics fits desktop and small windows keep natural scrolling',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await setup(page,{empty:true});await fits(page);
 await expect(page.getByText('Not enough history',{exact:true})).toBeVisible();
 await page.setViewportSize({width:412,height:915});expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('PDF excludes collection health and aging while retaining risk and forecast sections',async({page},testInfo)=>{
 await setup(page);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();await page.getByRole('button',{name:'Download PDF',exact:true}).click();
 const file=await download;const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const content=Buffer.concat(chunks).toString();expect(content).not.toContain('Collection health');expect(content).not.toContain('Outstanding balance aging');expect(content).not.toContain('Collection performance');expect(content).not.toContain('On-time payment rate');
 for(const title of ['Revenue trend','Estimated Collections','Forecast vs Actual','Tenant payment risk','Current room inventory'])expect(content).toContain(title);
 await file.saveAs(testInfo.outputPath('analytics-without-health.pdf'));
});

test('refreshing and failed analytics keep the desktop overview within the viewport',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await setup(page);
 let release;
 const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/analytics?*',async route=>{await gate;await route.fulfill({status:503,json:{error:'An extended report error message. '.repeat(50)}});});
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await expect(page.getByText('Updating analytics...',{exact:true})).toBeVisible();await fits(page);
 await expect.poll(()=>Boolean(release)).toBe(true);release();
 await expect(page.getByRole('alert').filter({hasText:'Unable to refresh. Showing saved report figures.'})).toBeVisible();await fits(page);
});
