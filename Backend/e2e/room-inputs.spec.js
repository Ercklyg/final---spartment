import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('room form defaults to 2500, limits room digits and accepts numeric capacities and ranges', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  const saved = [];
  await page.route('**/api/rooms', route => {
    if (route.request().method() === 'POST') saved.push(route.request().postDataJSON());
    const body = saved.at(-1);
    const created = body && { id: 'new-room', room_number: body.room, floor: body.floor, status: 'available', monthly_rate: body.rate, capacity: body.capacity + ' persons', size_sqm: body.size, buildings: { name: body.building } };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().method() === 'POST' ? created : []) });
  });
  await page.goto('/');
  await page.locator('button[aria-label="Rooms"]:visible').click();
  for (const capacity of ['5', '4-6']) {
    await page.getByRole('button', { name: 'Add Room', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add room' });
    await expect(dialog.getByLabel('Monthly rate')).toHaveValue('2500');
    await dialog.getByLabel('Room number', { exact: true }).fill('123456789');
    await expect(dialog.getByLabel('Room number', { exact: true })).toHaveValue('123');
    await dialog.getByLabel('Capacity (persons)', { exact: true }).fill('wow');
    await dialog.getByRole('button', { name: 'Add available room' }).click();
    expect(saved).toHaveLength(capacity === '5' ? 0 : 1);
    await dialog.getByLabel('Capacity (persons)', { exact: true }).fill(capacity);
    await dialog.getByRole('button', { name: 'Add available room' }).click();
    await expect(dialog).toHaveCount(0);
    expect(saved.at(-1)).toMatchObject({ room: '123', capacity, rate: 2500 });
  }
});
