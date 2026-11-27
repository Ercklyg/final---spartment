import { openDashboardInsights } from './helpers/dashboard.js';
import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const insight = title => ({
  items: [{ evidenceVersion: 1, factId: 'property:collections', actionId: 'review_collections', subject: 'Collections for 2026-11', evidence: '₱1,000.00 collected · ₱500.00 outstanding', title, text: 'Review the property records.', category: 'insight', page: 'Billing' }],
  updatedAt: new Date().toISOString(), source: 'ai', cached: false, stale: false,
});

test('saved recommendations remain visible during a manual refresh and after a refresh error', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let release, fail = false;
  await page.route('**/api/analytics/recommendations', async route => {
    if (route.request().postDataJSON().force) {
      await new Promise(resolve => { release = resolve; });
      if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Temporarily unavailable' }) });
      return route.fulfill({ json: insight('Updated recommendation') });
    }
    return route.fulfill({ json: insight('Saved recommendation') });
  });
  await page.goto('/');
  const panel = await openDashboardInsights(page);
  await expect(panel.getByText('Saved recommendation', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Refresh insights' }).click();
  await expect(panel.getByRole('status')).toContainText('Refreshing insights');
  await expect(panel.getByText('Saved recommendation', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(panel.getByText('Updated recommendation', { exact: true })).toBeVisible();
  release = null;
  fail = true;
  await panel.getByRole('button', { name: 'Refresh insights' }).click();
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(panel.getByText('AI insights are temporarily unavailable.', { exact: false })).toBeVisible();
  await expect(panel.getByText('Updated recommendation', { exact: true })).toBeVisible();
});

test('expired cached insights display while fresh recommendations load in the background', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let release;
  await page.route('**/api/analytics/recommendations', async route => {
    if (route.request().postDataJSON().force) {
      await new Promise(resolve => { release = resolve; });
      return route.fulfill({ json: insight('Fresh insight') });
    }
    return route.fulfill({ json: { ...insight('Last available insight'), cached: true, stale: true, refreshRecommended: true } });
  });
  await page.goto('/');
  const panel = await openDashboardInsights(page);
  await expect(panel.getByText('Last available insight', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toContainText('Showing saved recommendations');
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(panel.getByText('Fresh insight', { exact: true })).toBeVisible();
  await expect(panel.getByText('Last available insight', { exact: true })).toHaveCount(0);
});
