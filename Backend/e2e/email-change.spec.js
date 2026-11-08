import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

test('tenant enters a new email, receives its OTP immediately, verifies, and signs out', async ({ page }) => {
  await mockTenantApi(page);
  let stage = 'none';
  const calls = [];
  await page.route('**/api/account/email-change/**', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    calls.push(action);
    if (action === 'start') {
      expect(route.request().postDataJSON()).toEqual({ email: 'new@example.test', otp: '' });
      stage = 'otp';
    }
    if (action === 'verify') {
      expect(route.request().postDataJSON().otp).toBe('123456');
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { stage, newEmail: 'new@example.test', expiresAt: new Date(Date.now() + 600000).toISOString(), resendAt: stage === 'none' ? null : new Date(Date.now() + 60000).toISOString() } });
  });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change email', exact: true })).toHaveCount(0);
  const change = page.getByRole('button', { name: 'Change email', exact: true });
  await change.click();
  await expect(page.getByRole('dialog', { name: 'Change email', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close email change' }).click();
  await expect(change).toBeFocused();
  await change.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Change email', exact: true })).toHaveCount(0);
  await change.click();
  await expect(page.getByRole('heading', { name: 'Change email', exact: true })).toBeVisible();
  await page.getByLabel('New email', { exact: true }).fill('new@example.test');
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'A verification code was sent to your new email.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /approval/i })).toHaveCount(0);
  await page.getByLabel('Verification code sent to your new email').fill('123456');
  await page.getByRole('button', { name: 'Verify and change email' }).click();
  await expect(page.getByText('Email updated. Sign in using your new email.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change email', exact: true })).toHaveCount(0);
  expect(calls).toContain('verify');
  expect(calls).not.toContain('approve');
});
