import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('inquiry contact is limited to eleven digits for typing, pasting and submission',async({page})=>{
  const api=await mockAdminApi(page);
  await page.route('**/api/public/rooms',route=>route.fulfill({json:[]}));
  await page.goto('/');
  await page.getByRole('button',{name:/Open Spartment Assistant/}).click();
  const dialog=page.getByRole('dialog',{name:'Spartment customer service'});
  await dialog.getByRole('button',{name:/Unit Inquiry/}).click();
  const contact=dialog.getByLabel('Contact number');
  await contact.pressSequentially('0912345678999999');
  await expect(contact).toHaveValue('09123456789');
  await contact.fill('');
  await contact.pressSequentially('abc0912xyz');
  await expect(contact).toHaveValue('0912');
  await contact.fill('');
  expect(await contact.evaluate(el=>el.checkValidity())).toBe(true);
  await contact.evaluate(el=>{
    const clipboardData=new DataTransfer();
    clipboardData.setData('text/plain','0912 345 6789 9999');
    el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData}));
  });
  await expect(contact).toHaveValue('09123456789');
  await dialog.getByLabel('Full name',{exact:true}).fill('Guest Tester');
  await dialog.getByLabel('Email',{exact:true}).fill('guest@example.test');
  await dialog.getByLabel('Message',{exact:true}).fill('I would like to ask about availability.');
  await dialog.getByRole('button',{name:'Send inquiry',exact:true}).click();
  await expect(dialog.getByText('Inquiry submitted',{exact:true})).toBeVisible();
  const submitted=api.calls.find(call=>call.path==='/public/inquiries');
  expect(submitted?.body.form.contact).toBe('09123456789');
});
