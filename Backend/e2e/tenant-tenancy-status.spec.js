import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('tenancy badges, filters and move-out retain directory history', async ({ page }, testInfo) => {
  await mockAdminApi(page, { startAuthenticated: true });
  const tenant = (id, status, full_name) => ({id, status, full_name, email:`${id}@example.test`, phone:'09123456789',
    monthly_rent:6500, move_in:'2026-07-01', lease_end:status==='ended'?'2026-10-31':null,
    move_out_date:status==='ended'?'2026-10-31':null,
    rooms:{room_number:'103',buildings:{name:'Main Building'}},
    billing:{status:'Late',balance:1000,overdue:1000,billCount:4}});
  const records=[tenant('active-tenant','active','Alexandria Maria Long Tenant Name'),tenant('former-tenant','ended','Former Tenant')];
  const requests=[];
  await page.route('**/api/tenants**', async route => {
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/move-out')) {
      records[0]={...records[0],status:'ended',lease_end:'2026-11-01',move_out_date:'2026-11-01'};
      return route.fulfill({json:{ok:true}});
    }
    if(url.pathname.endsWith('/leases')) return route.fulfill({json:[{id:'lease-id',status:records[0].status,move_in_date:'2026-07-01',rooms:records[0].rooms}]});
    requests.push(url.searchParams);
    const tenancy=url.searchParams.get('tenancyStatus');
    const search=url.searchParams.get('search')?.toLowerCase()||'';
    const payment=url.searchParams.get('status');
    const data=records.filter(t=>(tenancy==='All'||t.status===(tenancy==='Active'?'active':'ended'))&&t.full_name.toLowerCase().includes(search)&&(payment!=='Paid'));
    return route.fulfill({json:{data,total:data.length,offset:0,limit:9}});
  });
  await page.goto('/');
  await page.locator('button[aria-label="Tenants"]:visible').click();
  await expect(page.getByLabel('Tenancy status')).toHaveValue('All');
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.locator('article').first().getByText('Active',{exact:true})).toBeVisible();
  await expect(page.locator('article').last().getByText('Moved out',{exact:true})).toBeVisible();
  await expect(page.locator('article').last().getByText('Previous room')).toBeVisible();
  await expect(page.getByText('2 tenants',{exact:true})).toBeVisible();
  if(testInfo.project.name==='mobile-chrome')await page.setViewportSize({width:320,height:740});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('tenant-status-directory.png'),fullPage:true});
  await page.getByLabel('Tenancy status').selectOption('MovedOut');
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByLabel('Payment status').selectOption('Paid');
  await expect(page.getByText('No matching tenants found')).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.getByLabel('Tenancy status')).toHaveValue('All');
  await expect(page.getByLabel('Payment status')).toHaveValue('All');
  await expect(page.locator('article')).toHaveCount(2);
  await page.locator('article').first().getByRole('button',{name:'View details'}).click();
  await page.getByRole('button',{name:'Move out',exact:true}).click();
  await page.getByLabel('Effective date').fill('2026-11-01');
  await page.getByRole('checkbox',{name:/Outstanding balance/}).check();
  await page.getByRole('button',{name:'Record move-out',exact:true}).click();
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.locator('article').first().getByText('Moved out',{exact:true})).toBeVisible();
  await page.locator('article').first().getByRole('button',{name:'View details'}).click();
  await expect(page.getByRole('button',{name:'Move out',exact:true})).toBeDisabled();
  await expect(page.getByRole('dialog').getByText('Outstanding balance',{exact:true})).toBeVisible();
  expect(requests.every(p=>p.get('tenancyStatus'))).toBe(true);
});
