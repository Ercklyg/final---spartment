import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('dashboard and analytics allow only months containing report data, including gaps', async ({ page }, testInfo) => {
  const availableMonths=['2025-12','2026-07','2026-09'];
  await mockAdminApi(page,{startAuthenticated:true,analyticsData:{availableMonths,reportMonth:'2026-09'}});
  await page.goto('/');
  await page.getByRole('button',{name:'Reporting month: September 2026'}).click();
  const calendar=page.getByRole('dialog',{name:'Choose reporting month'});
  for(const name of ['Jan','Aug','Oct','Nov','Dec'])await expect(calendar.getByRole('button',{name,exact:true})).toBeDisabled();
  for(const name of ['Jul','Sep'])await expect(calendar.getByRole('button',{name,exact:true})).toBeEnabled();
  await expect(calendar.getByRole('button',{name:'Next year'})).toBeDisabled();
  await calendar.getByRole('button',{name:'Previous year'}).click();
  await expect(calendar.getByRole('button',{name:'Dec',exact:true})).toBeEnabled();
  await expect(calendar.getByRole('button',{name:'Jul',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
  const select=page.getByRole('button',{name:'Report ending month',exact:true});
  await expect(select).toContainText('September 2026');
  await select.click();
  const analyticsCalendar=page.getByRole('dialog',{name:'Choose reporting month'});
  await expect(analyticsCalendar.getByRole('button',{name:'Aug',exact:true})).toBeDisabled();

  const requested=page.waitForRequest(request=>request.url().includes('/api/analytics?')&&new URL(request.url()).searchParams.get('month')==='2026-07');
  await analyticsCalendar.getByRole('button',{name:'Jul',exact:true}).click();
  await requested;
  await expect(select).toContainText('July 2026');
  await select.click();
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

test('report calendar stays compact and inside the viewport on narrow phones and desktop', async ({ page }, testInfo) => {
  await mockAdminApi(page,{startAuthenticated:true});
  await page.goto('/');
  await page.locator('button[aria-label="Analytics & Reports"]:visible').click();
  for(const width of [320,393,1280]){
    await page.setViewportSize({width,height:800});
    const trigger=page.getByRole('button',{name:'Report ending month',exact:true});
    await trigger.click();
    const calendar=page.getByRole('dialog',{name:'Choose reporting month'});
    await expect(calendar).toBeVisible();
    const bounds=await calendar.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(12);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(width-11);
    expect(bounds.y).toBeGreaterThanOrEqual(12);
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(800);
    expect(bounds.width).toBeLessThanOrEqual(320);
    expect(await calendar.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`report-calendar-${width}.png`)});
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});
