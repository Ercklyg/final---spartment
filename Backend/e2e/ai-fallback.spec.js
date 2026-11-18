import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const items = [{ title: 'Review open requests', text: 'Review the four pending maintenance requests.', category: 'attention', page: 'requests' }];
const originalDate = '2026-11-18T16:07:00Z';
const result = (overrides = {}) => ({ items, updatedAt: originalDate, fallback: false, reason: null, source: 'ai', cached: false, refreshRecommended: false, ...overrides });
const respond = (route, body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

test('quota fallback survives reload and manual retry preserves cards until recovery', async ({ page }, testInfo) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let saved = result();
  let calls = 0;
  let recover = false;
  let release;
  await page.route('**/api/analytics/recommendations', async route => {
    calls++;
    if (route.request().postDataJSON().force) {
      if (recover) {
        await new Promise(resolve => { release = resolve; });
        saved = result({ items: [{ ...items[0], title: 'Updated recommendations' }], updatedAt: '2026-11-19T02:00:00Z' });
      } else saved = result({ fallback: true, reason: 'quota', source: 'cache', cached: true });
    }
    await respond(route, saved);
  });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Smart Recommendations' });
  await expect(panel.getByText(items[0].title, { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Provide Insight' }).click();
  const notice = 'AI usage limit reached. Showing the last generated recommendations from November 19, 2026 at 12:07 AM (Philippine time).';
  await expect(panel.getByRole('status')).toHaveText(notice);
  await expect(panel.getByText('Saved AI recommendations', { exact: true })).toBeVisible();
  await expect(panel).not.toContainText('Last generated');
  await page.reload();
  await expect(panel.getByRole('status')).toHaveText(notice);
  await expect(panel.getByText(items[0].title, { exact: true })).toBeVisible();
  expect(calls).toBe(3);
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: testInfo.outputPath('saved-recommendations.png') });
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  recover = true;
  await panel.getByRole('button', { name: 'Try again' }).click();
  await expect(panel.getByRole('button', { name: 'Generating...' })).toBeDisabled();
  await expect(panel.getByText(items[0].title, { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  await expect(panel.getByText('Updated recommendations', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toHaveCount(0);
  await expect(panel).toContainText('November 19, 2026 at 10:00 AM (Philippine time)');
  await expect(panel.getByRole('button', { name: 'Provide Insight' })).toBeEnabled();
});

test('quota without saved recommendations has no invented cards or timestamp', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let calls = 0;
  await page.route('**/api/analytics/recommendations', route => {
    calls++;
    return respond(route, result({ items: [], updatedAt: null, fallback: true, reason: 'quota', source: 'none' }));
  });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Smart Recommendations' });
  await expect(panel.getByRole('status')).toHaveText('AI usage limit reached. No previous AI recommendations are saved for this report yet.');
  await expect(panel.getByRole('button')).toHaveCount(1);
  await expect(panel).not.toContainText('Philippine time');
  expect(calls).toBe(1);
});

test('temporary API failure retains the preview with a generic dated notice', async ({ page }) => {
  await mockAdminApi(page, { startAuthenticated: true });
  let fail = false;
  await page.route('**/api/analytics/recommendations', route => fail
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service unavailable' }) })
    : respond(route, result()));
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Smart Recommendations' });
  await expect(panel.getByText(items[0].title, { exact: true })).toBeVisible();
  fail = true;
  await panel.getByRole('button', { name: 'Provide Insight' }).click();
  await expect(panel.getByRole('status')).toHaveText('AI insights are temporarily unavailable. Showing the last generated recommendations from November 19, 2026 at 12:07 AM (Philippine time).');
  await expect(panel.getByText(items[0].title, { exact: true })).toBeVisible();
});
