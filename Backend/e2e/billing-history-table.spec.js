import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';
const json=(route,data,status=200)=>route.fulfill({json:data,status});
const makeBill=(index,month,type='rent')=>({id:`bill-${index}`,bill_type:type,billing_period:month+'-01',due_date:month+'-28',total:3500,paid:index%4===0?3500:index%4===2?1500:0,balance:index%4===0?0:index%4===2?2000:3500,displayStatus:['Paid','Pending','Partially paid','Late'][index%4],electricity_amount:2500,water_amount:1000,payments:index%4===0?[{id:'payment-1',amount:3500,payment_date:month+'-02',reference_note:'Cash receipt 123'}]:[],last_reminded_at:index===3?'2026-11-01T01:00:00Z':null,leases:{profiles:{full_name:index===0?'Alexandra Santos with a very long tenant name':`Tenant ${index}`},rooms:{room_number:String(101+index),buildings:{name:'Main Building with a long descriptive name'}}}});
async function setup(page){
  await mockAdminApi(page,{startAuthenticated:true});
  const requests=[];
  let fail=false;
  await page.route('**/api/billing/workspace?*',async route=>{
    const q=Object.fromEntries(new URL(route.request().url()).searchParams);requests.push(q);
    if(fail)return json(route,{error:'Temporary billing failure'},500);
    const all=Array.from({length:29},(_,index)=>makeBill(index,q.month,q.type));
    const matches=all.filter(b=>(q.status==='All'||b.displayStatus===q.status)&&(!q.search||b.leases.profiles.full_name.toLowerCase().includes(q.search.toLowerCase())));
    return json(route,{bills:matches.slice(Number(q.offset),Number(q.offset)+25),total:matches.length,periodTotal:29,summary:{months:{[q.month]:{[q.type]:{total:101500,paid:35000,balance:66500,overdue:10000,electricity:72500,water:29000}}}}});
  });
  await page.route('**/api/payments/payment-1/corrections',route=>json(route,[]));
  await page.goto('/');await page.locator('button[aria-label="Billing"]:visible').click();
  const history=page.getByRole('region',{name:'Billing history',exact:true});
  await expect(history.getByRole('table')).toBeVisible();
  return {history,requests,setFail:value=>{fail=value;}};
}
const action= (page,index)=>page.getByRole('button',{name:index===0?/View details \/ receipts for Alexandra Santos/:`View details / receipts for Tenant ${index}, room ${101+index}`,exact:index!==0});

test('billing history filters on the server and paginates with the selected month intact',async({page})=>{
  const {history,requests}=await setup(page);
  await expect(history.getByRole('columnheader')).toHaveText(['Tenant / Room','Billing Period','Billed','Collected','Balance','Status','Actions']);
  await expect(history.locator('tbody tr')).toHaveCount(25);
  const month=await page.getByLabel('History month').inputValue();
  await history.getByRole('button',{name:'Next',exact:true}).click();
  await expect(history.locator('tbody tr')).toHaveCount(4);
  expect(requests.at(-1).offset).toBe('25');
  await page.getByLabel('Bill status').selectOption('Late');
  await expect(history.locator('tbody tr')).toHaveCount(7);
  expect(requests.at(-1)).toMatchObject({status:'Late',offset:'0',month});
  await page.getByLabel('Search tenant or room').fill('Tenant 3');
  await expect(history.locator('tbody tr')).toHaveCount(1);
  await history.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(history.locator('tbody tr')).toHaveCount(25);
  await expect(page.getByLabel('History month')).toHaveValue(month);
  await page.getByLabel('Search tenant or room').fill('No such tenant');
  await expect(history.getByRole('heading',{name:'No matching bills'})).toBeVisible();
});

test('billing action icons support keyboard access, paid restrictions, details and corrections',async({page})=>{
  const {history}=await setup(page);
  const row=history.locator('tbody tr').first();
  await expect(row.getByRole('button')).toHaveCount(1);
  const trigger=action(page,0);
  await trigger.focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Payments and receipts'});
  await expect(dialog).toContainText('Alexandra Santos with a very long tenant name');
  await dialog.getByRole('button',{name:'Correct payment / history'}).click();
  const correction=page.getByRole('dialog',{name:'Correct payment',exact:true});
  await expect(correction.getByRole('button',{name:'Save correction'})).toBeEnabled();
  await correction.getByRole('button',{name:'Cancel',exact:true}).click();
  const unpaid=history.locator('tbody tr').nth(3);
  await expect(unpaid.getByRole('button')).toHaveCount(3);
  const reminder=unpaid.getByRole('button',{name:/Send reminder for Tenant 3/});
  await expect(reminder).toHaveAttribute('title',/Last reminded/);
  await unpaid.getByRole('button',{name:/Record payment/}).focus();
  await page.keyboard.press('Tab');await expect(reminder).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Send payment reminder?'})).toBeVisible();
});

test('utility history has a compact table, visible action icons, and a detailed breakdown',async({page},testInfo)=>{
  const {history}=await setup(page);
  await page.getByRole('button',{name:'Utility Billing',exact:true}).click();
  await expect(history.getByRole('table')).toHaveAccessibleName(/Utility billing history/);
  await expect(history.getByRole('columnheader')).toHaveCount(7);
  const region=page.getByRole('region',{name:'Billing history table, scroll horizontally for more columns'});
  await region.scrollIntoViewIfNeeded();
  await region.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
  await expect(action(page,0)).toBeVisible();
  const bounds=await action(page,0).boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  const pinned=await history.locator('tbody tr').first().getByRole('rowheader').boundingBox();
  const view=await region.boundingBox();expect(Math.abs(pinned.x-view.x)).toBeLessThan(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await region.evaluate(e=>{e.scrollLeft=0;});
  await page.screenshot({path:testInfo.outputPath('billing-history.png'),fullPage:true});
  await action(page,0).click();
  const dialog=page.getByRole('dialog',{name:'Payments and receipts'});
  await expect(dialog.getByText('Electricity',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Water',{exact:true})).toBeVisible();
  await expect(dialog).toContainText('2,500.00');await expect(dialog).toContainText('1,000.00');
});

test('failed refresh keeps the table and permits retry',async({page})=>{
  const {history,setFail}=await setup(page);
  setFail(true);
  await history.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Showing previously loaded records'})).toBeVisible();
  await expect(history.locator('tbody tr')).toHaveCount(25);
  setFail(false);
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Showing previously loaded records'})).toHaveCount(0);
  await expect(action(page,0)).toBeEnabled();
});
