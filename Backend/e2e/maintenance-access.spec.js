import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

const assistant = page => page.getByRole('dialog', { name: 'Spartment customer service' });
const maintenance = page => assistant(page).getByRole('button', { name: /Maintenance Request/ });

async function mockPublicApi(page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/auth/session' ? null : path === '/api/public/config' ? { idleTimeoutMinutes: 15 } : [] });
  });
}

test('landing and guest assistants hide maintenance', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Open Spartment Assistant/ }).click();
  await expect(assistant(page).getByRole('button', { name: /Unit Inquiry/ })).toBeVisible();
  await expect(maintenance(page)).toHaveCount(0);
  await assistant(page).getByRole('button', { name: /Close/ }).click();
  await page.getByRole('button', { name: /Continue as Guest/i }).click();
  await page.getByRole('button', { name: /Open Spartment Assistant/ }).click();
  await expect(assistant(page).getByRole('button', { name: /Unit Inquiry/ })).toBeVisible();
  await expect(maintenance(page)).toHaveCount(0);
});

for (const assigned of [true, false]) {
  test(`tenant maintenance access with ${assigned ? 'an assigned room' : 'no room'}`, async ({ page }) => {
    await mockTenantApi(page);
    await page.route('**/api/billing?view=overview', route => route.fulfill({ json: {
      bills: [], summary: { balance: 0, count: 0, byType: {}, months: {} },
    } }));
    if (!assigned) await page.route('**/api/account', route => route.fulfill({ json: { role: 'tenant', full_name: 'Test Tenant', room: null } }));
    await page.goto('/');
    for (const section of [null, 'Billing', 'Settings']) {
      if (section) await page.getByRole('button', { name: section, exact: true }).first().click();
      await page.getByRole('button', { name: 'Open Spartment Assistant', exact: true }).click();
      await expect(assistant(page)).toBeVisible();
      if (assigned) {
        await expect(maintenance(page)).toBeVisible();
        await maintenance(page).click();
        await expect(assistant(page).getByRole('button', { name: /Submit Request/i })).toBeVisible();
      } else await expect(maintenance(page)).toHaveCount(0);
      await assistant(page).getByRole('button', { name: /Close/ }).click();
    }
  });
}

test('direct maintenance view stays blocked until allowed and closes when access is removed', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Open Spartment Assistant/ }).waitFor();
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: Chatbox } = await import('/src/components/chatbox/Chatbox.jsx');
    const host = document.createElement('div');
    document.body.append(host);
    const root = ReactDOM.createRoot(host);
    window.renderMaintenanceAccess = allowed => root.render(React.createElement(Chatbox, {
      onClose() {}, initialView: 'maintenance', prefilledRoom: '209', canRequestMaintenance: allowed,
    }));
    window.renderMaintenanceAccess(false);
  });
  await expect(assistant(page).getByRole('button', { name: /Unit Inquiry/ })).toBeVisible();
  await expect(assistant(page).getByRole('form')).toHaveCount(0);
  await page.evaluate(() => window.renderMaintenanceAccess(true));
  await expect(assistant(page).getByRole('button', { name: /Submit Request/i })).toBeVisible();
  await page.evaluate(() => window.renderMaintenanceAccess(false));
  await expect(maintenance(page)).toHaveCount(0);
  await expect(assistant(page).getByRole('button', { name: /Submit Request/i })).toHaveCount(0);
});
