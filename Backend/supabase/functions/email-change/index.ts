import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { emailChangeMailConfig, emailChangeOtpMessage, sendEmailChangeMail } from '../_shared/emailChangeMail.ts';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
// Rejection sampling avoids modulo bias in a six-digit code.
function code() { let n: number; do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= 4294000000); return String(n % 1000000).padStart(6, '0'); }

Deno.serve(async req => {
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  const secret = Deno.env.get('RECOVERY_STORAGE_SECRET');
  const supplied = req.headers.get('x-recovery-key');
  if (!secret || !supplied || supplied.length > 512) return reply(401, { error: 'Unauthorized' });
  const [a, b] = await Promise.all([hash(secret), hash(supplied)]);
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  if (difference) return reply(401, { error: 'Unauthorized' });
  try {
    const raw = await req.text(); if (raw.length > 8192) return reply(413, { error: 'Request too large' });
    const body = JSON.parse(raw);
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').spartment_production;
    if (!serviceKey) throw new Error('Storage unavailable');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    // Retired retry jobs must never send old-mailbox notifications.
    if (body.action === 'notify') return reply(200, { ok: true, skipped: true });
    if (!['start', 'resend', 'status', 'verify'].includes(body.action)) return reply(400, { error: 'Invalid action' });
    let userId: string | null = null;
    {
      if (typeof body.accessToken !== 'string' || body.accessToken.length > 4096) return reply(401, { error: 'Sign in to continue.' });
      const { data, error } = await db.auth.getUser(body.accessToken);
      if (error || !data.user) return reply(401, { error: 'Sign in to continue.' });
      const userDb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${body.accessToken}` } }, auth: { persistSession: false } });
      const active = await userDb.rpc('current_session_active');
      if (active.error) throw new Error('Storage unavailable');
      if (!active.data) return reply(401, { error: 'Your session expired. Sign in again.' });
      userId = data.user.id;
      const profile = await db.from('profiles').select('role').eq('id', userId).single();
      if (profile.error || profile.data?.role !== 'tenant') return reply(403, { error: 'A tenant account is required.' });
    }
    if (body.action === 'verify' && (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp))) return reply(400, { error: 'Enter the six-digit verification code.' });
    let email = body.email;
    if (body.action === 'start' && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) return reply(400, { error: 'Enter a valid email address.' });
    const otp = code();
    const digestOtp = (value: string) => hash(`${secret}:email-change:${userId}:${value}`);
    if (['start', 'resend'].includes(body.action)) {
      emailChangeMailConfig();
    }
    const { data: result, error } = await db.rpc('tenant_email_change', {
      p_action: body.action, p_user: userId, p_email: typeof email === 'string' ? email.trim().toLowerCase() : null,
      p_otp: await digestOtp(body.action === 'verify' ? body.otp : otp),
      p_ip: await hash(`${secret}:ip:${body.ip || 'unknown'}`),
    });
    if (error) throw new Error('Storage unavailable');
    if (result.error) return reply(result.status, { error: result.error });
    if (body.action === 'verify') {
      const updated = await db.auth.admin.updateUserById(userId!, { email: result.newEmail, email_confirm: true });
      if (updated.error) {
        if (['email_exists', 'email_address_not_authorized', 'email_address_invalid'].includes(updated.error.code || '')) return reply(400, { error: 'This email cannot be used.' });
        throw new Error('Email update unavailable');
      }
      // The trigger has already revoked sessions and recorded the audit event.
      return reply(200, { ok: true });
    }
    if (body.action !== 'status') {
      if (result.stage !== 'otp') throw new Error('Email change migration required');
      const message = emailChangeOtpMessage(otp);
      await sendEmailChangeMail(result.newEmail, message.subject, message.text,
        `email-change-otp-${crypto.randomUUID()}`, message.html);
    }
    // Never return OTPs to the browser.
    return reply(200, { stage: result.stage, newEmail: result.newEmail, expiresAt: result.expiresAt, resendAt: result.resendAt });
  } catch { return reply(503, { error: 'Email change is temporarily unavailable. Please retry. If an email was not delivered, wait 60 seconds before resending.' }); }
});
