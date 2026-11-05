import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('room and tenant entry forms keep their contents after outside clicks and still close explicitly', async ({ page }) => {
  const api=await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await page.locator('button[aria-label="Rooms"]:visible').click();
  await page.getByRole('button',{name:'Add Room',exact:true}).click();
  const room=page.getByRole('dialog',{name:'Add room',exact:true});
  await room.getByLabel('Room number',{exact:true}).fill('999');
  await room.getByLabel('Room description & amenities').fill('Keep this unsaved room description.');
  await page.mouse.click(2,2);
  await expect(room).toBeVisible();
  await expect(room.getByLabel('Room number',{exact:true})).toHaveValue('999');
  await expect(room.getByLabel('Room description & amenities')).toHaveValue('Keep this unsaved room description.');
  await room.getByRole('button',{name:'Close room form'}).click();
  await expect(room).toBeHidden();
  await page.locator('button[aria-label="Tenants"]:visible').click();
  await page.getByRole('button',{name:'Add Tenant',exact:true}).click();
  const tenant=page.getByRole('dialog',{name:'Add tenant',exact:true});
  await tenant.getByLabel('Full name',{exact:true}).fill('Unsaved Test Tenant');
  await tenant.getByLabel('Email / sign-in address').fill('unsaved@example.test');
  await page.mouse.click(2,2);
  await expect(tenant).toBeVisible();
  await expect(tenant.getByLabel('Full name',{exact:true})).toHaveValue('Unsaved Test Tenant');
  await expect(tenant.getByLabel('Email / sign-in address')).toHaveValue('unsaved@example.test');
  await tenant.getByRole('button',{name:'Close add tenant'}).click();
  await expect(tenant).toBeHidden();
  expect(api.calls.filter(call=>call.method==='POST'&&['/rooms','/tenants'].includes(call.path))).toHaveLength(0);
});

test('other dialogs retain outside-click dismissal', async ({ page }) => {
  await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await page.locator('button[aria-label="Billing"]:visible').click();
  await page.getByRole('button',{name:'Send reminders',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Send payment reminders'});
  await expect(dialog).toBeVisible();
  await page.mouse.click(2,2);
  await expect(dialog).toBeHidden();
});
