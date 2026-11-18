import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

test('tenant rules popup works across pages, breakpoints, and keyboard controls', async ({ page }, testInfo) => {
  await mockTenantApi(page);
  await page.route('**/api/billing?view=overview', route => route.fulfill({ json: { bills: [], summary: { balance: 0, count: 0, months: {} } } }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const mobileProject = testInfo.project.name === 'mobile-chrome';
  const sizes = mobileProject ? [320, 393, 1023] : [1024, 1280];
  const dialog = page.getByRole('dialog', { name: 'Rules & Regulations', exact: true });
  const close = page.getByRole('button', { name: 'Close rules', exact: true });

  for (const width of sizes) {
    await page.setViewportSize({ width, height: 800 });
    const mobile = width < 1024;
    const nav = page.getByRole('navigation', { name: mobile ? 'Tenant mobile navigation' : 'Tenant navigation', exact: true });
    const opener = mobile ? page.locator('.tenant-rules-launcher') : nav.getByRole('button', { name: 'Rules & Regulations', exact: true });
    await expect(nav.getByRole('button')).toHaveCount(mobile ? 3 : 4);

    for (const label of ['Dashboard', 'Billing', 'Settings']) {
      await nav.getByRole('button', { name: label, exact: true }).click();
      await expect(opener).toBeVisible();
      if (mobile) {
        const rulesBox = await opener.boundingBox();
        const chatBox = await page.getByRole('button', { name: 'Open Spartment Assistant' }).boundingBox();
        const navBox = await nav.boundingBox();
        expect(Math.abs(chatBox.y - (rulesBox.y + rulesBox.height) - 12)).toBeLessThan(2);
        expect(chatBox.y + chatBox.height).toBeLessThanOrEqual(navBox.y);
      }
      await page.evaluate(() => window.scrollTo(0, 100));
      const scrollY = await page.evaluate(() => window.scrollY);
      await opener.click();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('listitem')).toHaveCount(9);
      await expect(dialog.getByRole('heading', { level: 3 })).toHaveText([
        'Rent Payment', 'Cleanliness', 'Noise Control', 'Visitors and Guests',
        'Property Maintenance', 'Pets Policy', 'Property Modifications', 'Move-Out Notice', 'Fire Safety',
      ]);
      await expect(dialog).toContainText('especially from 10:00 PM to 6:00 AM.');
      await expect(close).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('region', { name: 'Tenant rules list' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('region', { name: 'Tenant rules list' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 15);
      if (!mobile) {
        expect(bounds.width).toBeGreaterThanOrEqual(Math.min(1200, width - 64));
        await expect(dialog.getByRole('heading', { name: 'Fire Safety', exact: true })).toBeInViewport();
      }
      const content = dialog.locator('div.overflow-y-auto');
      await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await expect(dialog.getByRole('heading', { name: 'Fire Safety', exact: true })).toBeInViewport();
      await expect(close).toBeInViewport();
      if (label === 'Dashboard') await page.screenshot({ path: testInfo.outputPath(`tenant-rules-${width}.png`) });
      await close.click();
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
      await expect(nav.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    await opener.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await opener.click();
    await page.mouse.click(2, 2);
    await expect(dialog).not.toBeVisible();
    if (!mobile) {
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await expect(opener).toHaveAttribute('title', 'Rules & Regulations');
      await opener.click();
      await expect(dialog).toBeVisible();
      await close.click();
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
    }
    await page.getByRole('button', { name: 'Open Spartment Assistant' }).click();
    await expect(page.getByRole('dialog', { name: 'Spartment customer service' })).toBeVisible();
    if (mobile) await expect(opener).not.toBeVisible();
    await page.getByRole('button', { name: 'Close chat', exact: true }).click();
    await expect(opener).toBeVisible();
  }
  expect(errors).toEqual([]);
});
