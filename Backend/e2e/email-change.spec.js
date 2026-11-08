import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

test('tenant verifies a new email after old-mailbox approval, then signs out', async ({ page }) => {
  await mockTenantApi(page);
  let stage = 'none';
  const calls = [];
  await page.route('**/api/account/email-change/**', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    calls.push(action);
    if (action === 'start') {
      expect(route.request().postDataJSON()).toEqual({ email: 'new@example.test', otp: '' });
      stage = 'approval';
    }
    if (action === 'verify') {
      expect(route.request().postDataJSON().otp).toBe('123456');
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { stage, newEmail: 'new@example.test', expiresAt: new Date(Date.now() + 600000).toISOString(), resendAt: stage === 'none' ? null : new Date(Date.now() + 60000).toISOString() } });
  });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change email', exact: true })).toBeVisible();
  await page.getByLabel('New email', { exact: true }).fill('new@example.test');
  await page.getByRole('button', { name: 'Send approval link', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Approval link sent to your current email.' })).toBeVisible();
  await expect(page.getByLabel('Verification code sent to your new email')).toHaveCount(0);
  stage = 'otp';
  await page.getByRole('button', { name: 'Check approval status' }).click();
  await page.getByLabel('Verification code sent to your new email').fill('123456');
  await page.getByRole('button', { name: 'Verify and change email' }).click();
  await expect(page.getByText('Email updated. Sign in using your new email.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Change email', exact: true })).toHaveCount(0);
  expect(calls).toContain('verify');
});

test('approval link clears its token and requires an explicit click before sending an OTP', async ({ page }) => {
  let approvals = 0;
  const token = 'a'.repeat(64);
  await page.route('**/api/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/email-change/approve')) {
      approvals++;
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ token });
      return route.fulfill({ json: { stage: 'otp' } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/approve-email-change#token=' + token);
  await expect(page.getByRole('heading', { name: 'Approve email change', exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(approvals).toBe(0);
  await page.getByRole('button', { name: 'Approve email change', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Email change approved' })).toBeVisible();
  expect(approvals).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('approval errors remain visible and a missing token cannot submit', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 400, json: { error: 'This approval link has expired or has already been used.' } }));
  await page.goto('/approve-email-change#token=' + 'b'.repeat(64));
  await page.getByRole('button', { name: 'Approve email change', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('expired');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('missing');
  await expect(page.getByRole('button', { name: 'Approve email change', exact: true })).toHaveCount(0);
});
