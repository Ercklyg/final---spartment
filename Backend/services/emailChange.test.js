import test from 'node:test';
import assert from 'node:assert/strict';
import { emailChange } from './emailChangeService.js';

const req = (body = {}, role = 'tenant') => ({ body, role, ip: '127.0.0.1', headers: { cookie: 'spartment-access=server-cookie' } });
test('email change validates inputs and tenant role before contacting the provider', async () => {
  const never = () => assert.fail('Provider must not be called');
  await assert.rejects(emailChange(req({}, 'admin'), 'start', never), e => e.status === 403);
  await assert.rejects(emailChange(req({ email: 'invalid' }), 'start', never), e => e.status === 400);
  await assert.rejects(emailChange(req({ token: 'bad' }), 'approve', never), e => e.status === 400);
  await assert.rejects(emailChange(req({ otp: '12345' }), 'verify', never), e => e.status === 400);
});
test('email change takes identity and IP from server context and forwards only allowed fields', async () => {
  const previous = { secret: process.env.RECOVERY_STORAGE_SECRET, url: process.env.SUPABASE_URL, mode: process.env.NODE_ENV, secure: process.env.COOKIE_SECURE };
  Object.assign(process.env, { RECOVERY_STORAGE_SECRET: 'test-secret', SUPABASE_URL: 'https://example.supabase.co', NODE_ENV: 'test', COOKIE_SECURE: 'false' });
  try {
    const request = req({ email: ' NEW@example.test ', userId: 'victim', accessToken: 'attacker', ip: 'fake', action: 'approve' });
    const result = await emailChange(request, 'start', async (url, options) => {
      assert.equal(url.pathname, '/functions/v1/email-change');
      assert.deepEqual(JSON.parse(options.body), { action: 'start', email: 'new@example.test', accessToken: 'server-cookie', ip: '127.0.0.1' });
      return { ok: true, json: async () => ({ stage: 'otp' }) };
    });
    assert.equal(result.stage, 'otp');
  } finally {
    for (const [key, value] of Object.entries({ RECOVERY_STORAGE_SECRET: previous.secret, SUPABASE_URL: previous.url, NODE_ENV: previous.mode, COOKIE_SECURE: previous.secure })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
