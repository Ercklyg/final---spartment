import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(await readFile(new URL('../supabase/functions/_shared/emailChangeMail.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\s*$/gm, '').replace(/export /g, '');
const create = new Function('Deno', 'nodemailer', source + '\nreturn {emailChangeMailConfig, sendEmailChangeMail};');
function fixture(overrides = {}, result = { accepted: ['tenant@example.test'] }) {
  const env = { EMAIL_CHANGE_SMTP_USER: 'sender@gmail.com', EMAIL_CHANGE_SMTP_PASSWORD: 'abcd efgh ijkl mnop', ...overrides };
  const calls = []; let closed = false;
  const mail = create({ env: { get: key => env[key] } }, { createTransport(config) {
    calls.push(config);
    return { sendMail: async message => { calls.push(message); if (result instanceof Error) throw result; return result; }, close() { closed = true; } };
  } });
  return { ...mail, calls, closed: () => closed };
}
test('Gmail sender uses TLS port 465 and the configured app password without logging', async () => {
  const mail = fixture();
  await mail.sendEmailChangeMail('tenant@example.test', 'Verification code', 'Code: 123456', 'email-change-otp-example');
  const [config, message] = mail.calls;
  assert.equal(config.host, 'smtp.gmail.com');
  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
  assert.equal(config.auth.pass, 'abcdefghijklmnop');
  assert.equal(config.tls.rejectUnauthorized, true);
  assert.equal(config.logger, false);
  assert.equal(config.debug, false);
  assert.deepEqual(message.from, { name: 'Spartment', address: 'sender@gmail.com' });
  assert.equal(message.to, 'tenant@example.test');
  assert.equal(message.messageId, '<email-change-otp-example@gmail.com>');
  assert.equal(message.disableFileAccess, true);
  assert.equal(message.disableUrlAccess, true);
  assert.equal(mail.closed(), true);
});
test('missing SMTP secrets fail before a connection and do not require Resend settings', () => {
  for (const env of [{ EMAIL_CHANGE_SMTP_PASSWORD: '' }, { EMAIL_CHANGE_SMTP_USER: '' }, { EMAIL_CHANGE_SMTP_USER: 'bad\r\naddress' }]) {
    const mail = fixture(env);
    assert.throws(() => mail.emailChangeMailConfig(), /Mail unavailable/);
    assert.equal(mail.calls.length, 0);
  }
  assert.equal(fixture().emailChangeMailConfig().auth.user, 'sender@gmail.com');
});
test('SMTP errors and rejected recipients fail privately and close the connection', async () => {
  for (const result of [new Error('Provider secret detail'), { accepted: [] }]) {
    const mail = fixture({}, result);
    await assert.rejects(mail.sendEmailChangeMail('tenant@example.test', 'Code', '123456', 'email-change-test'), error => error.message === 'Mail unavailable');
    assert.equal(mail.closed(), true);
  }
});
