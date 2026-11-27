import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const room = (id, number, building, extra = {}) => ({ id, room_number: number, floor: 1, status: 'available', monthly_rate: 2500, size_sqm: 12, capacity: '2-3 persons', buildings: { name: building }, ...extra });
const inventory = [
  room('room-1', '102', 'Main Building'),
  room('room-2', '101', 'Main Building', { status: 'occupied', tenant_assignments: [{ full_name: 'Alexandra Santos with a longer tenant name' }] }),
  room('room-3', '101', 'Annex', { floor: 2, status: 'reserved' }),
];
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
async function openRooms(page, rooms = inventory) {
  await mockAdminApi(page, { startAuthenticated: true });
  await page.route('**/api/rooms', route => json(route, rooms));
  await page.goto('/');
  await page.locator('button[aria-label="Rooms"]:visible').click();
  await expect(page.getByRole('table')).toBeVisible();
}
const actions = (page, number, building) => page.getByRole('button', { name: `Actions for room ${number} in ${building}`, exact: true });

test('rooms table combines filters, clears them, and sorts duplicate room numbers', async ({ page }) => {
  await openRooms(page);
  const rows = page.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toHaveAccessibleName('Room 101 in Annex');
  await page.getByLabel('Building', { exact: true }).selectOption('Main Building');
  await page.getByLabel('Room status').selectOption('Occupied');
  await page.getByLabel('Search rooms', { exact: true }).fill('alexandra');
  await expect(rows).toHaveCount(1);
  await page.getByRole('button', { name: 'More filters' }).click();
  await page.getByLabel('Floor', { exact: true }).selectOption('1');
  await page.getByLabel('Sort by').selectOption('status');
  await page.getByLabel('Floor', { exact: true }).press('Escape');
  await expect(page.getByRole('button', { name: 'More filters' })).toBeFocused();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(rows).toHaveCount(3);
  await page.getByLabel('Search rooms', { exact: true }).fill('missing');
  await expect(page.getByRole('heading', { name: 'No matching rooms' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(rows).toHaveCount(3);
});

test('room actions support keyboard use and protect lease-managed rooms', async ({ page }) => {
  await openRooms(page);
  const trigger = actions(page, '101', 'Main Building');
  await trigger.click();
  await expect(page.getByRole('menuitem', { name: 'Edit room', exact: true })).toBeFocused();
  await expect(page.getByRole('menuitem', { name: 'Change status' })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: 'Delete room' })).toBeDisabled();
  await expect(page.getByRole('menu')).toContainText('Managed by lease');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await actions(page, '102', 'Main Building').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Change status' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitemradio', { name: 'Reserved', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('row', { name: 'Room 102 in Main Building' })).toContainText('Available');
});

test('status saves persist and failures restore the previous status', async ({ page }) => {
  await openRooms(page);
  let fail = false;
  await page.route('**/api/rooms/room-1/status', route => fail ? json(route, { error: 'Unavailable' }, 500) : json(route, { ...inventory[0], status: route.request().postDataJSON().status }));
  const change = async status => {
    await actions(page, '102', 'Main Building').click();
    await page.getByRole('menuitem', { name: 'Change status' }).click();
    await page.getByRole('menuitemradio', { name: status, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm change', exact: true }).click();
  };
  await change('Maintenance');
  const row = page.getByRole('row', { name: 'Room 102 in Main Building' });
  await expect(row).toContainText('Maintenance');
  await expect(actions(page, '102', 'Main Building')).toBeEnabled();
  fail = true;
  await change('Available');
  await expect(page.getByRole('alert').filter({ hasText: 'previous status was restored' })).toBeVisible();
  await expect(row).toContainText('Maintenance');
});

test('table stays within mobile viewport and menus remain usable after scrolling', async ({ page }) => {
  await openRooms(page);
  const region = page.getByRole('region', { name: 'Rooms table, scroll horizontally for more columns' });
  await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  await actions(page, '102', 'Main Building').click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.keyboard.press('Escape');
  const pinned = await page.getByRole('row', { name: 'Room 102 in Main Building' }).getByRole('rowheader').boundingBox();
  const viewport = await region.boundingBox();
  expect(Math.abs(pinned.x - viewport.x)).toBeLessThan(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('rooms-table.png'), fullPage: true });
});

test('empty inventory offers a clear starting point', async ({ page }) => {
  await openRooms(page, []);
  await expect(page.getByRole('heading', { name: 'No rooms yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Room', exact: true })).toBeVisible();
});

test('deleting an unassigned room uses the existing confirmation', async ({ page }) => {
  await openRooms(page);
  await page.route('**/api/rooms/room-1', route => json(route, { ok: true, id: 'room-1' }));
  await actions(page, '102', 'Main Building').click();
  await page.getByRole('menuitem', { name: 'Delete room' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete room 102?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete room', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row', { name: 'Room 102 in Main Building' })).toHaveCount(0);
});
