import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const insight = title => ({
  items: [{ title, text: 'Review the property records.', category: 'insight', page: 'Billing' }],
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
  await expect(page.getByText('Saved recommendation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Provide Insight' }).click();
  await expect(page.getByRole('status')).toContainText('Updating insights in the background');
  await expect(page.getByText('Saved recommendation', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generating...' })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(page.getByText('Updated recommendation', { exact: true })).toBeVisible();
  release = null;
  fail = true;
  await page.getByRole('button', { name: 'Provide Insight' }).click();
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(page.getByText('AI insights are unavailable right now.', { exact: false })).toBeVisible();
  await expect(page.getByText('Updated recommendation', { exact: true })).toBeVisible();
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
  await expect(page.getByText('Last available insight', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Showing saved recommendations');
  await expect.poll(() => Boolean(release)).toBeTruthy();
  release();
  await expect(page.getByText('Fresh insight', { exact: true })).toBeVisible();
  await expect(page.getByText('Last available insight', { exact: true })).toHaveCount(0);
});
