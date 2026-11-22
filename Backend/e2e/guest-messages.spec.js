import { test, expect } from '@playwright/test';
import { mockAdminApi, mockTenantApi } from './helpers/mockApi.js';

const assistant = page => page.getByRole('dialog', { name: 'Spartment customer service' });
async function openMessage(page) {
  await page.getByRole('button', { name: /Open Spartment Assistant/ }).click();
  await assistant(page).getByRole('button', { name: /Something Else/ }).click();
}

test('public general message requires contact, preserves errors and retries one ID', async ({ page }) => {
  await mockAdminApi(page);
  const submissions = [];
  let fail = true;
  await page.route('**/api/public/messages', route => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill(fail ? { status: 503, json: { error: 'Please retry later.' } } : { status: 201, json: { ok: true } });
  });
  await page.goto('/');
  await openMessage(page);
  const form = assistant(page);
  await form.getByLabel('Full name', { exact: true }).fill('Guest Visitor');
  await form.getByLabel('Subject', { exact: true }).fill('Visiting hours');
  await form.getByLabel('Message', { exact: true }).fill('When can I speak with management?');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('alert')).toContainText('Provide an email address or contact number');
  expect(submissions).toHaveLength(0);
  await form.getByLabel('Contact number', { exact: true }).fill('091234567890abc');
  await expect(form.getByLabel('Contact number', { exact: true })).toHaveValue('09123456789');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('alert')).toContainText('Please retry later.');
  await expect(form.getByLabel('Subject', { exact: true })).toHaveValue('Visiting hours');
  fail = false;
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form).toContainText('Your message has been saved for the administrator.');
  expect(submissions).toHaveLength(2);
  expect(submissions[0].id).toBe(submissions[1].id);
  expect(submissions[1].form).toMatchObject({ fullName: 'Guest Visitor', contact: '09123456789', email: '' });
});

test('guest page accepts email-only general messages without using tenant submission', async ({ page }) => {
  const api = await mockAdminApi(page);
  let sent;
  await page.route('**/api/public/rooms', route => route.fulfill({ json: [] }));
  await page.route('**/api/public/messages', route => { sent = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { ok: true } }); });
  await page.goto('/');
  await page.getByRole('button', { name: /Continue as Guest/i }).click();
  await openMessage(page);
  const form = assistant(page);
  await form.getByLabel('Full name', { exact: true }).fill('Email Guest');
  await form.getByLabel('Email address', { exact: true }).fill('guest@example.test');
  await form.getByLabel('Subject', { exact: true }).fill('Office hours');
  await form.getByLabel('Message', { exact: true }).fill('What are your office hours?');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form).toContainText('Request submitted');
  expect(sent.form.email).toBe('guest@example.test');
  expect(sent.form.contact).toBe('');
  expect(api.calls.some(call => call.path === '/requests/submit')).toBe(false);
});

test('tenant general messages still use their account without guest contact fields', async ({ page }) => {
  const api = await mockTenantApi(page);
  await page.goto('/');
  await openMessage(page);
  const form = assistant(page);
  await expect(form.getByLabel('Full name', { exact: true })).toHaveCount(0);
  await form.getByLabel('Subject', { exact: true }).fill('Gate access');
  await form.getByLabel('Message', { exact: true }).fill('Please check my gate key.');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form).toContainText('Request submitted');
  expect(api.calls.find(call => call.path === '/requests/submit')?.body).toMatchObject({ kind: 'other', form: { subject: 'Gate access' } });
});

test('administrator can review and resolve guest messages with their contact information', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let status = 'New';
  const id = '77777777-7777-4777-8777-777777777777';
  await page.route('**/api/requests/workspace?*', route => route.fulfill({ json: { requests: [], inquiries: [{ id, inquiry_type: 'general', subject: 'Guest office question', full_name: 'Guest Visitor', email: null, phone: '09123456789', message: 'Please call me about visiting hours.', status, created_at: new Date().toISOString() }], total: 1, offset: 0, limit: 20 } }));
  await page.route(`**/api/inquiries/${id}`, route => { status = route.request().postDataJSON().status; return route.fulfill({ json: { id } }); });
  await page.goto('/');
  await page.locator('button[aria-label="Customer Requests"]:visible').click();
  await page.getByRole('button', { name: 'Inquiry', exact: true }).click();
  const card = page.locator('article').filter({ hasText: 'Guest office question' });
  await expect(card).toContainText('Guest message');
  await card.getByRole('button', { name: 'View information' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guest office question' });
  await expect(dialog).toContainText('09123456789');
  await expect(dialog).toContainText('Not provided');
  await expect(dialog).not.toContainText('Preferred room');
  await dialog.getByLabel(/Status/).selectOption('Resolved');
  await dialog.getByRole('button', { name: 'Save update' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toContainText('Resolved');
});
