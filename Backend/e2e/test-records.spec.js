import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';
const sample='33333333-3333-4333-8333-333333333333';
const room=(id,number)=>({id,room_number:number,floor:1,status:'available',size_sqm:8,capacity:'2-3 persons',monthly_rate:2500,buildings:{name:'Main Building'}});
const json=(route,data)=>route.fulfill({json:data});
const navigate=(page,name)=>page.locator(`button[aria-label="${name}"]:visible`).click();

test('all rooms are ordinary inventory and edits do not send classification flags',async({page})=>{
 await mockAdminApi(page,{startAuthenticated:true});const rooms=[room('22222222-2222-4222-8222-222222222222','101'),room(sample,'454')];
 await page.route('**/api/rooms',route=>json(route,rooms));
 await page.route('**/api/rooms/'+sample,route=>{const body=route.request().postDataJSON();expect(body).not.toHaveProperty('isTest');rooms[1].description=body.notes;return json(route,rooms[1]);});
 await page.goto('/');await navigate(page,'Rooms');
 await expect(page.getByRole('row',{name:'Room 101 in Main Building'})).toBeVisible();
 const row=page.getByRole('row',{name:'Room 454 in Main Building'});await expect(row).toBeVisible();
 await expect(page.getByLabel('Show test records')).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Room filters'})).toContainText('2 total rooms');
 await row.getByRole('button',{name:'Actions for room 454 in Main Building'}).click();await page.getByRole('menuitem',{name:'Edit room',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Edit room'});await expect(dialog.getByLabel('Test room')).toHaveCount(0);
 await dialog.getByLabel('Room description & amenities').fill('Ordinary room inventory');await dialog.getByRole('button',{name:'Save changes'}).click();await expect(dialog).toHaveCount(0);
});

test('tenant records are available without a test filter or reclassification control',async({page})=>{
 await mockAdminApi(page,{startAuthenticated:true});
 const tenant={id:sample,full_name:'Existing tenant',email:'tenant@example.test',room_id:sample,rooms:{room_number:'454'},monthly_rent:3000,billing:{status:'Pending',balance:3000,billCount:1}};
 await page.route('**/api/tenants?*',route=>{expect(new URL(route.request().url()).searchParams.has('includeTest')).toBe(false);return json(route,{data:[tenant],total:1,offset:0,limit:9});});
 await page.route('**/api/tenants/*/leases',route=>json(route,[]));
 await page.goto('/');await navigate(page,'Tenants');await expect(page.getByLabel('Show test records')).toHaveCount(0);
 await page.getByRole('button',{name:'View details',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog).toContainText('Existing tenant');await expect(dialog.getByRole('button',{name:/test account flag|Mark as test/})).toHaveCount(0);
});

test('billing includes every returned bill and normal totals without test controls',async({page})=>{
 await mockAdminApi(page,{startAuthenticated:true});
 await page.route('**/api/billing/workspace?*',route=>{
  const query=new URL(route.request().url()).searchParams,month=query.get('month');expect(query.has('includeTest')).toBe(false);
  const bill={id:sample,bill_type:'rent',billing_period:month+'-01',due_date:month+'-28',total:3000,paid:0,balance:3000,displayStatus:'Pending',payments:[],leases:{profiles:{full_name:'Existing billing account'},rooms:{room_number:'454',buildings:{name:'Main Building'}}}};
  return json(route,{bills:[bill],summary:{months:{[month]:{rent:{total:3000,paid:0,balance:3000,overdue:0}}}},total:1,periodTotal:1,offset:0,limit:25});
 });
 await page.goto('/');await navigate(page,'Billing');await expect(page.getByText('Existing billing account',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Show test records')).toHaveCount(0);await expect(page.getByRole('article').filter({hasText:'Total billed'})).toContainText('3,000.00');
});
