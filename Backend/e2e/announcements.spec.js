import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { mockAdminApi, mockTenantApi } from './helpers/mockApi.js';

const timestamp = '2026-11-18T02:00:00.000Z';
const seedAnnouncement = index => ({ id: randomUUID(), title: `Announcement ${index}`, message: `Message ${index}`, author_id: '11111111-1111-4111-8111-111111111111', created_at: timestamp, updated_at: timestamp, recipient_count: 2 });
const navigation = page => page.locator('nav[aria-label="Admin navigation"]:visible, nav[aria-label="Admin mobile navigation"]:visible');
const reply = (route, json, status = 200) => route.fulfill({ status, json });

async function announcementApi(page, store) {
  await page.route(/\/api\/announcements(?:\/|\?|$)/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/')[3];
    const body = request.method() === 'DELETE' || request.method() === 'GET' ? {} : request.postDataJSON();
    if (request.method() === 'GET') {
      const offset = Number(url.searchParams.get('offset') || 0);
      return reply(route, { data: store.announcements.slice(offset, offset + 20), total: store.announcements.length, offset, limit: 20 });
    }
    if (request.method() === 'POST') {
      store.submissions.push(body.id);
      if (store.postError) { const error = store.postError; store.postError = ''; return reply(route, { error }, 400); }
      let announcement = store.announcements.find(item => item.id === body.id);
      if (!announcement) {
        announcement = { ...seedAnnouncement(0), ...body };
        store.announcements.unshift(announcement);
        store.notifications.unshift({ id: randomUUID(), title: body.title, message: body.message, kind: 'announcement', source_id: body.id, created_at: timestamp, is_read: false });
      }
      return reply(route, announcement, 201);
    }
    const announcement = store.announcements.find(item => item.id === id);
    if (!announcement) return reply(route, { error: 'Announcement not found.' }, 404);
    if (request.method() === 'PATCH') {
      Object.assign(announcement, { title: body.title, message: body.message, updated_at: '2026-11-18T03:00:00.000Z' });
      store.notifications.filter(item => item.source_id === id && item.kind === 'announcement').forEach(item => Object.assign(item, { title: body.title, message: body.message, is_read: false, seen_at: null, acknowledged_at: null }));
      return reply(route, announcement);
    }
    store.announcements = store.announcements.filter(item => item.id !== id);
    store.notifications = store.notifications.filter(item => item.source_id !== id || item.kind !== 'announcement');
    return reply(route, { ok: true, id });
  });
}

async function notificationsApi(page, store) {
  await page.route(/\/api\/notifications(?:\?|$|\/(?:read|engagement)$)/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      const offset = Number(url.searchParams.get('offset') || 0);
      const rows = [...store.notifications].sort((a, b) => Number(a.is_read) - Number(b.is_read) || b.created_at.localeCompare(a.created_at));
      return reply(route, { data: rows.slice(offset, offset + 25), total: rows.length, unreadCount: rows.filter(item => !item.is_read).length, asOf: new Date().toISOString() });
    }
    const body = request.postDataJSON();
    const selected = store.notifications.filter(item => body.all || body.ids?.includes(item.id));
    if (url.pathname.endsWith('/read')) selected.forEach(item => { item.is_read = true; });
    if (body.action === 'seen') selected.forEach(item => { item.seen_at = new Date().toISOString(); });
    return reply(route, { ok: true });
  });
}

test('admin posts, edits and deletes announcements reflected in tenant notifications', async ({ page, context }, testInfo) => {
  const store = { announcements: [], submissions: [], postError: 'Unable to post right now. Please retry.', notifications: Array.from({ length: 3 }, (_, index) => ({ id: randomUUID(), title: `Account update ${index + 1}`, message: 'An existing update.', kind: 'account', is_read: true, created_at: '2026-11-17T02:00:00.000Z' })) };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockAdminApi(page, { startAuthenticated: true });
  await announcementApi(page, store);
  await page.goto('/');
  const nav = navigation(page);
  await expect(nav.getByRole('button')).toHaveCount(7);
  await nav.getByRole('button', { name: 'Announcements', exact: true }).click();
  await expect(page.getByText('No announcements yet', { exact: true })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Announcements', exact: true })).toHaveAttribute('aria-current', 'page');
  if (testInfo.project.name === 'mobile-chrome') {
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 851 });
      const boxes = await nav.getByRole('button').evaluateAll(items => items.map(item => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height, labelFits: item.lastElementChild.scrollWidth <= item.lastElementChild.clientWidth })));
      expect(boxes.every(box => box.width >= 44 && box.height >= 44 && box.labelFits), JSON.stringify(boxes)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } else {
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(nav.getByRole('button', { name: 'Announcements', exact: true })).toHaveAttribute('title', 'Announcements');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
  }
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Post announcement', exact: true });
  await form.getByLabel('Title', { exact: true }).fill('Water interruption');
  await form.getByLabel('Message', { exact: true }).fill('Water will be off at noon.\nPlease prepare.');
  await form.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Unable to post');
  await expect(form.getByLabel('Title', { exact: true })).toHaveValue('Water interruption');
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue('Water will be off at noon.\nPlease prepare.');
  await form.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: '2 current tenants' })).toBeVisible();
  expect(store.submissions).toHaveLength(2);
  expect(store.submissions[0]).toBe(store.submissions[1]);
  await expect(page.getByRole('heading', { name: 'Water interruption', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-announcements.png') });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Announcements', exact: true })).toBeVisible();

  const tenant = await context.newPage();
  tenant.on('pageerror', error => errors.push(error.message));
  await mockTenantApi(tenant);
  await notificationsApi(tenant, store);
  await tenant.goto('/');
  const row = tenant.getByRole('button', { name: 'View notification: Water interruption', exact: true });
  await expect(row).toBeVisible();
  await expect(row.getByText('Announcement', { exact: true })).toBeVisible();
  await expect(tenant.getByText('1 unread', { exact: true })).toBeVisible();
  await row.click();
  const detail = tenant.getByRole('dialog', { name: 'Water interruption', exact: true });
  await expect(detail).toContainText('Please prepare.');
  await expect(detail.getByRole('button', { name: 'View billing' })).toHaveCount(0);
  await detail.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(detail.getByText('Read', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Close notifications', exact: true }).click();
  await tenant.getByRole('region', { name: 'Notifications', exact: true }).getByRole('button', { name: 'View all', exact: true }).click();
  const all = tenant.getByRole('dialog', { name: 'All notifications', exact: true });
  await expect(all.getByRole('button', { name: /^View notification:/ })).toHaveCount(4);
  await all.getByRole('button', { name: 'Close notifications', exact: true }).click();

  await page.getByRole('button', { name: 'Edit announcement: Water interruption', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Edit announcement', exact: true });
  await editor.getByLabel('Title', { exact: true }).fill('Water interruption updated');
  await editor.getByLabel('Message', { exact: true }).fill('Water will be off at 1 PM.\nThank you.');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByText(/Edited Nov/)).toBeVisible();
  await tenant.getByRole('button', { name: 'Refresh notifications', exact: true }).click();
  const updated = tenant.getByRole('button', { name: 'View notification: Water interruption updated', exact: true });
  await expect(updated).toBeVisible();
  await expect(tenant.getByText('1 unread', { exact: true })).toBeVisible();
  await updated.click();
  const updatedDetail = tenant.getByRole('dialog', { name: 'Water interruption updated', exact: true });
  await expect(updatedDetail).toContainText('Water will be off at 1 PM.');
  await updatedDetail.getByRole('button', { name: 'Close notifications', exact: true }).click();
  await tenant.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(tenant.getByText('0 unread', { exact: true })).toBeVisible();
  await tenant.screenshot({ path: testInfo.outputPath('tenant-announcement.png') });

  await page.getByRole('button', { name: 'Delete announcement: Water interruption updated', exact: true }).click();
  const deletion = page.getByRole('dialog', { name: 'Delete announcement?', exact: true });
  await deletion.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(store.announcements).toHaveLength(1);
  await page.getByRole('button', { name: 'Delete announcement: Water interruption updated', exact: true }).click();
  await deletion.getByRole('button', { name: 'Delete announcement', exact: true }).click();
  await expect(page.getByText('No announcements yet', { exact: true })).toBeVisible();
  await tenant.getByRole('button', { name: 'Refresh notifications', exact: true }).click();
  await expect(updated).toBeHidden();
  await expect(tenant.getByRole('button', { name: /^View notification: Account update/ })).toHaveCount(3);
  expect(errors).toEqual([]);
  await tenant.close();
});

test('announcement pagination, zero-recipient errors and form closing preserve usable state', async ({ page }, testInfo) => {
  const store = { announcements: Array.from({ length: 21 }, (_, index) => seedAnnouncement(index + 1)), notifications: [], submissions: [], postError: 'There are no current tenants to notify. Add an active tenant before posting.' };
  await mockAdminApi(page, { startAuthenticated: true });
  await announcementApi(page, store);
  await page.goto('/');
  await navigation(page).getByRole('button', { name: 'Announcements', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Announcement 21', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Delete announcement: Announcement 21', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete announcement', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Post announcement', exact: true });
  await dialog.getByLabel('Title', { exact: true }).fill(' ');
  await dialog.getByLabel('Message', { exact: true }).fill('Text');
  await dialog.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Enter a title and message.');
  expect(store.submissions).toHaveLength(0);
  await dialog.getByLabel('Title', { exact: true }).fill('Test announcement');
  await dialog.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('no current tenants');
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Test announcement');
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveAttribute('maxlength', '150');
  await expect(dialog.getByLabel('Message', { exact: true })).toHaveAttribute('maxlength', '5000');
  await page.screenshot({ path: testInfo.outputPath('announcement-form.png') });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Post announcement', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close announcement window', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Post announcement', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
});
