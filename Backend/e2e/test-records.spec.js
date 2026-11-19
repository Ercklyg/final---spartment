import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const room=(id,number,is_test=false)=>({id,room_number:number,is_test,floor:1,status:'available',size_sqm:8,capacity:'2-3 persons',monthly_rate:2500,buildings:{name:'Main Building'}});
const actual=room('22222222-2222-4222-8222-222222222222','101');
const sample=room('33333333-3333-4333-8333-333333333333','4545',true);
const json=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
const navigate=(page,name)=>page.locator(`button[aria-label="${name}"]:visible`).click();

test('test rooms stay hidden by default, can be opened and edited, and do not change room totals',async({page})=>{
  await mockAdminApi(page,{startAuthenticated:true});
  const rooms=[actual,{...sample}];
  await page.route('**/api/rooms',route=>json(route,rooms));
  await page.route('**/api/rooms/'+sample.id,route=>{
    const body=route.request().postDataJSON();
    expect(body.isTest).toBe(true); rooms[1].description=body.notes;
    return json(route,rooms[1]);
  });
  await page.goto('/'); await navigate(page,'Rooms');
  await expect(page.getByRole('article',{name:'Room 101 in Main Building'})).toBeVisible();
  await expect(page.getByRole('article',{name:'Room 4545 in Main Building'})).toHaveCount(0);
  const counts=page.getByRole('region',{name:'Room filters'});
  await expect(counts.getByRole('button',{name:/All Rooms/})).toHaveText(/All Rooms1/);
  await page.getByLabel('Show test records').check();
  const card=page.getByRole('article',{name:'Room 4545 in Main Building'});
  await expect(card.getByText('Test',{exact:true})).toBeVisible();
  await expect(counts.getByRole('button',{name:/All Rooms/})).toHaveText(/All Rooms1/);
  await card.getByRole('button',{name:'Edit room 4545 in Main Building'}).click();
  const dialog=page.getByRole('dialog',{name:'Edit room'});
  await expect(dialog.getByLabel('Test room')).toBeChecked();
  await dialog.getByLabel('Room description & amenities').fill('Still available for testing');
  await dialog.getByRole('button',{name:'Save changes'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeVisible();
  await page.screenshot({path:test.info().outputPath('test-rooms.png'),fullPage:true});
});

test('admin tenant filter retrieves test accounts and permits opening their details',async({page})=>{
  await mockAdminApi(page,{startAuthenticated:true});
  const tenant={id:sample.id,full_name:'Sample account',email:'sample@example.test',room_id:sample.id,rooms:{room_number:'4545'},is_test:true,test_account:true,room_is_test:true,monthly_rent:3000,billing:{status:'Pending',balance:3000,billCount:1}};
  await page.route('**/api/tenants?*',route=>{
    const include=new URL(route.request().url()).searchParams.get('includeTest')==='true';
    return json(route,{data:include?[tenant]:[],total:include?1:0,offset:0,limit:30});
  });
  await page.route('**/api/tenants/*/leases',route=>json(route,[]));
  await page.goto('/'); await navigate(page,'Tenants');
  await expect(page.getByRole('heading',{name:'Sample account',exact:true})).toHaveCount(0);
  await page.getByLabel('Show test records').check();
  await expect(page.getByRole('article').getByText('Test',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View details'}).click();
  const details=page.getByRole('dialog');
  await expect(details).toContainText('Test records remain accessible');
  await expect(details.getByRole('button',{name:'Remove test account flag'})).toBeVisible();
});

test('billing filter reveals a test bill while operational totals remain unchanged',async({page})=>{
  await mockAdminApi(page,{startAuthenticated:true});
  await page.route('**/api/billing/workspace?*',route=>{
    const query=new URL(route.request().url()).searchParams,month=query.get('month');
    const include=query.get('includeTest')==='true';
    const bill={id:sample.id,is_test:true,bill_type:'rent',billing_period:month+'-01',due_date:month+'-30',total:3000,paid:0,balance:3000,displayStatus:'Pending',payments:[],leases:{profiles:{full_name:'Sample billing account'},rooms:{room_number:'4545',buildings:{name:'Test building'}}}};
    return json(route,{bills:include?[bill]:[],summary:{months:{[month]:{rent:{total:2500,paid:0,balance:2500,overdue:0}}}},total:include?1:0,periodTotal:1,offset:0,limit:25});
  });
  await page.goto('/'); await navigate(page,'Billing');
  await expect(page.getByText('Sample billing account',{exact:false})).toHaveCount(0);
  await page.getByLabel('Show test records').check();
  await expect(page.getByText('Sample billing account',{exact:false})).toBeVisible();
  await expect(page.getByText('Test',{exact:true})).toBeVisible();
  await expect(page.getByRole('article').filter({hasText:'Total billed'})).toContainText('2,500.00');
});
