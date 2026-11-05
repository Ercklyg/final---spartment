import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('admin previews the three reminder audiences and sends one guarded bulk request', async ({ page }, testInfo) => {
  await mockAdminApi(page, { startAuthenticated: true });
  const previews = [], sends = [];
  let release;
  await page.route('**/api/billing/reminders/**', async route => {
    if (route.request().method() === 'GET') {
      const query = Object.fromEntries(new URL(route.request().url()).searchParams);
      previews.push(query);
      return route.fulfill({ json: { matchedBills: 32, eligibleBills: 30, tenantCount: 26, skippedBills: 2, balance: 9000, recipients: [{ name: 'Example Tenant', bills: 2, balance: 600 }] } });
    }
    sends.push(route.request().postDataJSON());
    await new Promise(resolve => { release = resolve; });
    return route.fulfill({ json: { sentTenants: 26, sentBills: 30, skippedBills: 2, failedBills: 0, failures: [] } });
  });
  await page.goto('/');
  await page.locator('button[aria-label="Billing"]:visible').click();
  await page.getByRole('button', { name: 'Send reminders', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Send payment reminders' });
  await expect(dialog).toBeVisible();
  const select = dialog.getByLabel('Remind tenants with');
  await expect(select).toHaveValue('overdue');
  await expect(select.locator('option')).toHaveText(['All unpaid', 'Overdue only', 'Partially paid']);
  await expect(dialog).toContainText('26');
  await expect(dialog).toContainText('across every page');
  expect(sends).toHaveLength(0);
  const month = dialog.getByLabel('Billing month', { exact: true });
  await expect(month).toHaveValue(previews.at(-1).month);
  await month.fill('2026-09');
  await expect.poll(() => previews.at(-1)?.month).toBe('2026-09');
  await expect(dialog).toContainText('Rent bills · September 2026');
  await select.selectOption('all_unpaid');
  await expect.poll(() => previews.at(-1)?.audience).toBe('all_unpaid');
  await select.selectOption('partially_paid');
  await expect.poll(() => previews.at(-1)?.audience).toBe('partially_paid');
  const send = dialog.getByRole('button', { name: 'Send to 26 tenant(s)', exact: true });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(month).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Sending reminders…' })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBeTruthy();
  expect(sends).toHaveLength(1);
  expect(sends[0]).toMatchObject({ type: 'rent', audience: 'partially_paid', month: previews.at(-1).month });
  expect(sends[0].month).toBe('2026-09');
  expect(sends[0].id).toMatch(/^[0-9a-f-]{36}$/);
  release();
  await expect(dialog).toContainText('Notified 26 tenant(s) about 30 bill(s)');
  await expect(dialog).toContainText('Skipped 2 bill(s)');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Utility Billing', exact: true }).click();
  await page.getByRole('button', { name: 'Send reminders', exact: true }).click();
  await expect.poll(() => previews.at(-1)?.type).toBe('utility');
  await expect(dialog.getByLabel('Billing month', { exact: true })).toHaveValue(previews.at(-1).month);
  await expect(dialog.getByLabel('Remind tenants with')).toHaveValue('overdue');
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('bulk-reminders.png') });
});

test('empty audiences cannot send, and uncertain sends retry with the same operation ID', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  const sends = [];
  await page.route('**/api/billing/reminders/**', async route => {
    if (route.request().method() === 'GET') {
      const empty = new URL(route.request().url()).searchParams.get('audience') === 'overdue';
      return route.fulfill({ json: { matchedBills: empty ? 0 : 1, eligibleBills: empty ? 0 : 1, tenantCount: empty ? 0 : 1, skippedBills: 0, balance: empty ? 0 : 100, recipients: [] } });
    }
    sends.push(route.request().postDataJSON());
    if (sends.length === 1) return route.fulfill({ status: 503, json: { error: 'Unable to confirm reminder delivery. Retry without changing the selection.' } });
    return route.fulfill({ json: { sentTenants: 1, sentBills: 1, skippedBills: 0, failedBills: 0, failures: [] } });
  });
  await page.goto('/');
  await page.locator('button[aria-label="Billing"]:visible').click();
  await page.getByRole('button', { name: 'Send reminders', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Send payment reminders' });
  await expect(dialog).toContainText('No eligible bills to remind');
  await expect(dialog.getByRole('button', { name: 'Send to 0 tenant(s)' })).toBeDisabled();
  await dialog.getByLabel('Remind tenants with').selectOption('all_unpaid');
  await dialog.getByRole('button', { name: 'Send to 1 tenant(s)' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Unable to confirm');
  await dialog.getByRole('button', { name: 'Send to 1 tenant(s)' }).click();
  await expect(dialog).toContainText('Notified 1 tenant(s)');
  expect(sends).toHaveLength(2);
  expect(sends[0].id).toBe(sends[1].id);
});
