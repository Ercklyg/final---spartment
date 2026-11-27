import { openDashboardInsights } from './helpers/dashboard.js';
import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('dashboard cards open without waiting for recommendations or fetching full forecast history', async ({ page }) => {
  const { calls } = await mockAdminApi(page, { startAuthenticated: true });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/analytics/recommendations', async route => {
    await gate;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [], fallback: true, reason: 'quota' }) });
  });
  try {
    await page.goto('/');
    await expect(page.getByText('Monthly Revenue', { exact: true })).toBeVisible();
    await expect(page.getByText('Occupancy Rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Active Tenants', { exact: true })).toBeVisible();
    const analytics = calls.filter(call => call.path === '/analytics');
    // The Vite development server replays effects under React StrictMode.
    // Every request, including an aborted first mount, must use the compact view.
    expect(analytics.length).toBeGreaterThan(0);
    expect(analytics.every(call => new URLSearchParams(call.search).get('view') === 'dashboard')).toBe(true);
  } finally { release(); }
  await openDashboardInsights(page);
  await expect(page.getByRole('region', { name: 'Insights & Recommendations', exact: true }).getByRole('status').filter({ hasText: 'AI usage limit reached' })).toBeVisible();
  if (await page.getByRole('dialog', { name: 'All insights & recommendations' }).count()) await page.keyboard.press('Escape');
  await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
  await expect.poll(() => calls.some(call => call.path === '/analytics' && !new URLSearchParams(call.search).has('view'))).toBe(true);
});
