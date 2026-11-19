import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('monthly revenue uses payments allocated to selected bills instead of payment-date receipts', async ({ page }, testInfo) => {
  await mockAdminApi(page, {
    startAuthenticated: true,
    analyticsData: {
      snapshot: {
        cutoff: '2026-11-19', collected: 49995,
        selected: [{ bill_type: 'rent', billing_period: '2026-11-01', paid: 500.10 }, { bill_type: 'utility', billing_period: '2026-11-01', paid: 840 }],
        rows: [], late: [], outstanding: 0, overdue: 0, occupancy: 90, activeTenants: 27,
        available: 3, vacancyGap: 7500, openRequests: [], openInquiries: [],
      },
    },
  });
  await page.goto('/');
  const card = page.getByRole('button').filter({ has: page.getByText('Monthly Revenue', { exact: true }) });
  await expect(card).toContainText('₱1,340.10');
  await expect(card).toContainText("Collected for selected month's bills");
  await expect(card).not.toContainText('49,995');
  await page.screenshot({ path: testInfo.outputPath('monthly-revenue.png'), fullPage: true });
  await card.click();
  await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();
});
