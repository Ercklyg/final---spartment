import { expect } from '@playwright/test';

export async function openDashboardInsights(page) {
  if (await page.evaluate(() => matchMedia('(min-width: 1280px) and (min-height: 720px)').matches)) {
    const summary = page.getByRole('region', { name: 'Insights summary', exact: true });
    await expect(summary).toBeVisible();
    await summary.getByRole('button', { name: 'View all', exact: true }).click();
  }
  const panel = page.getByRole('region', { name: 'Insights & Recommendations', exact: true });
  await expect(panel).toBeVisible();
  return panel;
}
