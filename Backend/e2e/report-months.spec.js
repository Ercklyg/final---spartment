import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('dashboard and analytics allow only months containing report data, including gaps', async ({ page }, testInfo) => {
  const availableMonths=['2025-12','2026-07','2026-09'];
  await mockAdminApi(page,{startAuthenticated:true,analyticsData:{availableMonths,reportMonth:'2026-09'}});
  await page.goto('/');
  if(testInfo.project.name==='chrome'){
    await page.getByRole('button',{name:'Reporting month: September 2026'}).click();
    const calendar=page.getByRole('dialog',{name:'Choose reporting month'});
    for(const name of ['Jan','Aug','Oct','Nov','Dec'])await expect(calendar.getByRole('button',{name,exact:true})).toBeDisabled();
    for(const name of ['Jul','Sep'])await expect(calendar.getByRole('button',{name,exact:true})).toBeEnabled();
    await expect(calendar.getByRole('button',{name:'Next year'})).toBeDisabled();
    await calendar.getByRole('button',{name:'Previous year'}).click();
    await expect(calendar.getByRole('button',{name:'Dec',exact:true})).toBeEnabled();
    await expect(calendar.getByRole('button',{name:'Jul',exact:true})).toBeDisabled();
    await page.keyboard.press('Escape');
  }else{
    const filter=page.getByLabel('Dashboard month filter');
    await expect(filter.locator('option')).toHaveText(['September 2026','July 2026','December 2025']);
    await expect(filter).toHaveValue('2026-09');
  }
  await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
  const select=page.getByLabel('Report ending month');
  await expect(select.locator('option')).toHaveText(['September 2026','July 2026','December 2025']);
  await expect(select).toHaveValue('2026-09');
  const requested=page.waitForRequest(request=>request.url().includes('/api/analytics?')&&new URL(request.url()).searchParams.get('month')==='2026-07');
  await select.selectOption('2026-07');
  await requested;
  await expect(select).toHaveValue('2026-07');
  await page.screenshot({path:testInfo.outputPath('report-months.png')});
});

test('empty history disables reporting month choices and PDF export', async ({ page }) => {
  await mockAdminApi(page,{startAuthenticated:true,analyticsData:{availableMonths:[]}});
  await page.goto('/');
  await expect(page.getByText('No recorded bills or payments yet.',{exact:false})).toBeVisible();
  await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
  await expect(page.getByLabel('Report ending month')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toBeDisabled();
});
