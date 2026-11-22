import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

const notice = index => ({ id: randomUUID(), source_id: randomUUID(), title: `Old announcement ${index}`, message: `Original announcement message ${index}.\nPlease review this information.`, created_at: `2026-10-${String(index).padStart(2,'0')}T01:00:00Z`, announcement_revision: 1, kind: 'announcement', is_read: false });
async function setup(page, store) {
  await mockTenantApi(page);
  await page.route('**/api/billing?view=overview', route => route.fulfill({ json: { bills: [], summary: { balance: 0, count: 0, months: {} } } }));
  await page.route('**/api/notifications/announcements?*', route => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset'));
    store.offsets.push(offset);
    const rows = store.items.filter(item => !item.is_read);
    return route.fulfill(store.unavailable ? { status: 503, json: { error: 'Unavailable' } } : { json: { data: rows.slice(offset,offset+25), total: rows.length, offset, limit: 25 } });
  });
  await page.route('**/api/notifications/announcements/*/acknowledge', route => {
    const id = new URL(route.request().url()).pathname.split('/')[4];
    const body = route.request().postDataJSON();
    store.attempts.push({ id, ...body });
    if (store.fail) return route.fulfill({ status: 503, json: { error: 'Unable to acknowledge. Please retry.' } });
    const item = store.items.find(item => item.id === id);
    if (!item || item.announcement_revision !== body.revision) return route.fulfill({ status: 409, json: { error: 'This announcement changed. Review the latest version.' } });
    item.is_read = true;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route(/\/api\/notifications\?/, route => route.fulfill({ json: { data: store.items.slice(0,25), total: store.items.length, unreadCount: store.items.filter(item => !item.is_read).length, asOf: new Date().toISOString() } }));
  await page.goto('/');
}
const storeFor = items => ({ items, offsets: [], attempts: [], fail: false, unavailable: false });

test('historical popup loads beyond 25, browses without reading, and acknowledges only after success', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') await page.setViewportSize({ width: 320, height: 740 });
  const store = storeFor(Array.from({ length: 27 }, (_,i) => notice(i+1)));
  await setup(page,store);
  let popup = page.getByRole('dialog', { name: 'Old announcement 1', exact: true });
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('27 unread announcements remaining');
  expect(store.offsets).toContain(25);
  await popup.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Old announcement 2');
  expect(store.attempts).toHaveLength(0);
  for (let i=2;i<27;i++) await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
  popup = page.getByRole('dialog', { name: 'Old announcement 27', exact: true });
  await expect(popup).toBeVisible();
  expect(await popup.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('announcement-popup.png') });
  store.fail = true;
  await popup.getByRole('button', { name: 'Acknowledge', exact: true }).click();
  await expect(popup.getByRole('alert')).toContainText('Please retry');
  expect(store.items[26].is_read).toBe(false);
  store.fail = false;
  await popup.getByRole('button', { name: 'Acknowledge', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Old announcement 1');
  expect(store.items[26].is_read).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Later', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Later persists across reload and pages, while edited or new versions open again', async ({ page }) => {
  const store = storeFor([notice(1)]);
  await setup(page,store);
  await page.getByRole('dialog').getByRole('button', { name: 'Later', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Spartment Assistant', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(store.items[0].is_read).toBe(false);
  for (const label of ['Billing','Settings']) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    store.items[0].announcement_revision++;
    store.items[0].title = `Updated on ${label}`;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const popup = page.getByRole('dialog', { name: `Updated on ${label}`, exact: true });
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
  }
  store.items.push(notice(2));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog', { name: 'Old announcement 2', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close announcements for now' }).click();
  // A fresh login clears this user's UI state through the existing auth cleanup.
  await page.evaluate(() => { for (const key of Object.keys(sessionStorage)) if (key.startsWith('spartment-ui:announcement-dismissed:')) sessionStorage.removeItem(key); });
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Updated on Settings', exact: true })).toBeVisible();
});

test('stale acknowledgements cannot dismiss edited notices and outages do not block the portal', async ({ page }) => {
  const store = storeFor([notice(1)]);
  store.unavailable = true;
  await setup(page,store);
  await expect(page.getByRole('button', { name: 'Open Spartment Assistant', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  store.unavailable = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog', { name: 'Old announcement 1' })).toBeVisible();
  store.items[0] = { ...store.items[0], title: 'Latest revision', announcement_revision: 2 };
  await page.getByRole('dialog').getByRole('button', { name: 'Acknowledge', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Latest revision' })).toBeVisible();
  expect(store.items[0].is_read).toBe(false);
  await page.getByRole('dialog').getByRole('button', { name: 'Acknowledge', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(store.items[0].is_read).toBe(true);
});
