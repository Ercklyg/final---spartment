import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';

// Execute the deployed handler's actual source with injected provider/transport
// boundaries. No live Supabase account or mail service is used.
const source = stripTypeScriptTypes(await readFile(new URL('../supabase/functions/email-change/index.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\s*$/gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const userId = '11111111-1111-4111-8111-111111111111';
const digest = value => createHash('sha256').update(value).digest('hex');
async function fixture(options = {}) {
  const env = { RECOVERY_STORAGE_SECRET: 'private-test-secret', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
    EMAIL_CHANGE_SMTP_USER: 'accounts@gmail.com', EMAIL_CHANGE_SMTP_PASSWORD: 'test-app-password', EMAIL_CHANGE_APPROVAL_URL: 'https://example.test/approve-email-change', ...options.env };
  const calls = [], mails = [];
  let handler, updated = false;
  const db = {
    auth: { getUser: async token => ({ data: { user: token === 'valid-session' ? { id: userId } : null } }),
      admin: { updateUserById: async (id, attributes) => { calls.push({ update: id, attributes }); updated = true; return {}; } } },
    rpc: async (name, params) => {
      if (name === 'current_session_active') return { data: options.active !== false };
      calls.push(params);
      if (options.rpcError) return { data: { error: 'Too many verification emails.', status: 429 } };
      return { data: params.p_action === 'verify' ? { newEmail: 'new@example.test' } : {
        stage: ['start', 'resend'].includes(params.p_action) ? 'approval' : 'otp',
        oldEmail: 'old@example.test', newEmail: 'new@example.test', expiresAt: '2099-01-01', resendAt: '2099-01-01',
      } };
    },
    from(table) {
      const query = {
        select: () => query, eq: () => query, is: () => query, order: () => query,
        limit: async () => ({ data: [] }),
        single: async () => ({ data: { role: options.role || 'tenant' } }),
        maybeSingle: async () => ({ data: { user_id: userId } }),
      };
      assert.ok(['profiles', 'tenant_email_changes', 'tenant_email_events'].includes(table));
      return query;
    },
  };
  await new AsyncFunction('Deno', 'createClient', 'sendEmailChangeMail', 'emailChangeMailConfig', source)(
    { env: { get: key => env[key] }, serve: fn => { handler = fn; } }, () => db,
    async (...args) => { if (options.mailFails) throw new Error('Provider failure'); mails.push(args); },
    () => { if (!env.EMAIL_CHANGE_SMTP_USER || !env.EMAIL_CHANGE_SMTP_PASSWORD) throw new Error('Mail unavailable'); },
  );
  async function request(body, secret = env.RECOVERY_STORAGE_SECRET) {
    const response = await handler(new Request('https://example.test/functions/v1/email-change', {
      method: 'POST', headers: { 'x-recovery-key': secret }, body: JSON.stringify(body),
    }));
    return { status: response.status, data: await response.json() };
  }
  return { request, calls, mails, updated: () => updated };
}

test('Edge handler sends approval only to old email and a secret-bound OTP only to new email', async () => {
  const f = await fixture();
  const start = await f.request({ action: 'start', email: 'new@example.test', accessToken: 'valid-session', ip: '127.0.0.1' });
  assert.equal(start.status, 200);
  assert.equal(f.mails[0][0], 'old@example.test');
  const approval = f.mails[0][2].match(/#token=([a-f0-9]{64})/)[1];
  assert.equal(f.calls[0].p_approval, digest(approval));
  assert.equal(start.data.oldEmail, undefined);
  const approved = await f.request({ action: 'approve', token: approval, ip: '127.0.0.1' });
  assert.equal(approved.status, 200);
  assert.equal(f.mails[1][0], 'new@example.test');
  const otp = f.mails[1][2].match(/code is (\d{6})/)[1];
  assert.equal(f.calls[1].p_otp, digest(`private-test-secret:email-change:${userId}:${otp}`));
  assert.equal(f.calls[1].p_user, userId);
  const verified = await f.request({ action: 'verify', otp, accessToken: 'valid-session' });
  assert.equal(verified.status, 200);
  assert.deepEqual(verified.data, { ok: true });
  assert.equal(f.calls[2].p_otp, f.calls[1].p_otp);
  assert.equal(f.updated(), true);
  assert.ok(!JSON.stringify(start.data).includes(approval));
  assert.ok(!JSON.stringify(approved.data).includes(otp));
});

test('Edge handler rejects missing private authorization, revoked sessions, and non-tenant accounts', async () => {
  const unauthorized = await fixture();
  assert.equal((await unauthorized.request({ action: 'status' }, 'wrong-secret')).status, 401);
  assert.equal(unauthorized.calls.length, 0);
  assert.equal((await unauthorized.request({ action: 'start', email: 'new@example.test', accessToken: 'bad-session' })).status, 401);
  const revoked = await fixture({ active: false });
  assert.equal((await revoked.request({ action: 'status', accessToken: 'valid-session' })).status, 401);
  const admin = await fixture({ role: 'admin' });
  assert.equal((await admin.request({ action: 'status', accessToken: 'valid-session' })).status, 403);
});

test('Edge handler does not authorize an update when sending fails or rate limits reject a request', async () => {
  const failedMail = await fixture({ mailFails: true });
  assert.equal((await failedMail.request({ action: 'start', email: 'new@example.test', accessToken: 'valid-session' })).status, 503);
  assert.equal(failedMail.updated(), false);
  const noMailKey = await fixture({ env: { EMAIL_CHANGE_SMTP_PASSWORD: '' } });
  assert.equal((await noMailKey.request({ action: 'start', email: 'new@example.test', accessToken: 'valid-session' })).status, 503);
  assert.equal(noMailKey.calls.length, 0);
  const limited = await fixture({ rpcError: true });
  assert.equal((await limited.request({ action: 'start', email: 'new@example.test', accessToken: 'valid-session' })).status, 429);
  assert.equal(limited.mails.length, 0);
});
