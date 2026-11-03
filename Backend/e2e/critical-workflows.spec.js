import { test, expect } from '@playwright/test';
import { mockAdminApi, mockTenantApi } from './helpers/mockApi.js';

const adminNavigationButton=(page,name)=>page.locator(`button[aria-label="${name}"]:visible`);

test('sign-in handles invalid credentials and opens the admin application',async({page})=>{
  await mockAdminApi(page);
  await page.goto('/');

  await page.getByLabel('Email').fill('admin@example.test');
  await page.locator('input#password').fill('wrong-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('form [role="alert"]')).toContainText('email or password is incorrect');

  await page.locator('input#password').fill('correct-test-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(adminNavigationButton(page,'Dashboard')).toBeVisible();
});

test('customer requests are filtered and paginated by the server',async({page})=>{
  const api=await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await adminNavigationButton(page,'Customer Requests').click();

  await expect(page.getByText('Leaking faucet 1',{exact:true})).toBeVisible();
  await expect(page.getByText('1–20 of 25')).toBeVisible();
  await page.getByRole('button',{name:'Next'}).click();
  await expect(page.getByText('Leaking faucet 21',{exact:true})).toBeVisible();
  await expect(page.getByText('21–25 of 25')).toBeVisible();

  await page.getByRole('button',{name:'Inquiry',exact:true}).click();
  await expect(page.getByText('Guest User',{exact:true})).toBeVisible();
  await expect(page.getByText('1–1 of 1')).toBeVisible();
  expect(api.calls.some(call=>call.path==='/requests/workspace'&&call.search.includes('filter=Inquiry')&&call.search.includes('offset=0'))).toBeTruthy();
});

test('an administrator can save a maintenance request update',async({page})=>{
  const api=await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await adminNavigationButton(page,'Customer Requests').click();
  await page.getByRole('button',{name:'View information'}).first().click();

  await page.getByLabel(/Status/).selectOption('Scheduled');
  await page.getByLabel('Update visible to tenant').fill('A plumber is scheduled for tomorrow.');
  await page.getByRole('button',{name:'Save update'}).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  const update=api.calls.find(call=>call.method==='PATCH'&&call.path.startsWith('/requests/'));
  expect(update?.body).toEqual({status:'Scheduled',admin_note:'A plumber is scheduled for tomorrow.'});
});

test('an administrator can create a tenant account',async({page})=>{
  const api=await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await adminNavigationButton(page,'Tenants').click();
  await page.getByRole('button',{name:'Add Tenant'}).click();
  await page.getByLabel('Full name',{exact:true}).fill('New Test Tenant');
  await page.getByLabel('Email / sign-in address').fill('new.tenant@example.test');
  await page.getByLabel('Phone number',{exact:true}).fill('09123456789');
  await page.getByLabel('Assigned room').selectOption('33333333-3333-4333-8333-333333333333');
  const moveIn = page.getByLabel('Move-in date');
  const manilaToday = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  await expect(moveIn).toHaveAttribute('max', manilaToday);
  await moveIn.fill('9999-12-31');
  await page.getByLabel('Contact full name').fill('Emergency Contact');
  await page.getByLabel('Contact phone number').fill('09987654321');
  await page.getByLabel('Relationship to tenant').fill('Sibling');
  await page.getByRole('button',{name:'Create tenant account'}).click();
  expect(await moveIn.evaluate(input => input.validity.rangeOverflow)).toBeTruthy();
  expect(api.calls.some(call=>call.method==='POST'&&call.path==='/tenants')).toBeFalsy();
  await moveIn.fill(manilaToday);
  await page.getByRole('button',{name:'Create tenant account'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const create=api.calls.find(call=>call.method==='POST'&&call.path==='/tenants');
  expect(create?.body).toMatchObject({name:'New Test Tenant',email:'new.tenant@example.test',phone:'09123456789',room:'33333333-3333-4333-8333-333333333333',rent:2500});
});

test('an administrator can record a payment and open its receipt',async({page})=>{
  const api=await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await adminNavigationButton(page,'Billing').click();
  await page.getByRole('button',{name:'Record payment'}).first().click();
  await page.getByLabel('Amount',{exact:true}).fill('500');
  await page.getByLabel('Reference note').fill('E2E payment');
  await page.getByRole('button',{name:'Save payment'}).click();
  await expect.poll(()=>api.calls.some(call=>call.method==='POST'&&call.path==='/billing/payments')).toBeTruthy();
  await page.getByRole('button',{name:'Payments / receipts'}).first().click();
  await page.getByRole('button',{name:'Open receipt'}).click();
  await expect(page.getByTitle('Printable payment receipt')).toBeVisible();
});

test('a tenant can submit maintenance with a photo attachment',async({page})=>{
  const api=await mockTenantApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Open Spartment Assistant'}).click();
  await page.getByRole('button',{name:/Maintenance Request/}).click();
  await page.getByLabel('Issue type').fill('Leaking faucet');
  await page.getByLabel('High').check();
  await page.getByLabel('Describe the problem').fill('Water is leaking under the kitchen sink.');
  await page.getByLabel(/Photos or documents/).setInputFiles({name:'leak.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});
  await expect(page.getByAltText('Preview of leak.png')).toBeVisible();
  await page.getByRole('button',{name:'Submit request'}).click();
  await expect(page.getByText('Request submitted',{exact:true})).toBeVisible();
  expect(api.calls.some(call=>call.method==='POST'&&call.path==='/requests/submit')).toBeTruthy();
  expect(api.calls.some(call=>call.method==='POST'&&/\/requests\/[^/]+\/attachments$/.test(call.path))).toBeTruthy();
});

test('password recovery confirms a reset request without exposing account status',async({page})=>{
  const api=await mockAdminApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Forgot password?'}).click();
  await page.getByLabel('Email').fill('person@example.test');
  await page.getByRole('button',{name:'Send reset link'}).click();
  await expect(page.locator('form [role="status"]')).toContainText('If an account matches that email');
  expect(api.calls.find(call=>call.path==='/auth/forgot-password')?.body).toEqual({email:'person@example.test'});
});

test('customer service dialog supports keyboard focus and Escape',async({page})=>{
  await mockAdminApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:/Open Spartment Assistant/}).click();
  const dialog=page.getByRole('dialog',{name:'Spartment customer service'});
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button',{name:'Close chat'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Open Spartment Assistant/})).toBeFocused();
});
