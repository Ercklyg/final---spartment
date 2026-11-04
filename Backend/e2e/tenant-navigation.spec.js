import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

test('tenant navigation links all three pages and preserves the active page on reload', async ({ page }, testInfo) => {
  await mockTenantApi(page);
  await page.route('**/api/billing?view=overview', route => route.fulfill({ json: { bills: [], summary: { balance: 0, count: 0, months: {} } } }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const mobile = testInfo.project.name === 'mobile-chrome';
  const nav = page.getByRole('navigation', { name: mobile ? 'Tenant mobile navigation' : 'Tenant navigation', exact: true });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button')).toHaveCount(3);
  await expect(nav.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('button', { name: 'Billing', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Billing', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /Billing/i }).first()).toBeVisible();

  await nav.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Manage your account' })).toBeVisible();
  await page.reload();
  await expect(nav.getByRole('button', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: /Account menu/ }).click();
  await expect(page.getByRole('menuitem', { name: 'Logout' })).toBeVisible();
  await page.keyboard.press('Escape');
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Open Spartment Assistant' })).toBeVisible();

  if (mobile) {
    const navBox = await nav.boundingBox();
    const launcher = await page.getByRole('button', { name: 'Open Spartment Assistant' }).boundingBox();
    expect(launcher.y + launcher.height).toBeLessThan(navBox.y);
  } else {
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await nav.getByRole('button', { name: 'Billing', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('tenant-navigation.png'), fullPage: true });
});
