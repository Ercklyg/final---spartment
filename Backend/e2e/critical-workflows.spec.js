import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

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
