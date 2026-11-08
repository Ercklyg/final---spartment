import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { emailChangeMailConfig, sendEmailChangeMail } from '../_shared/emailChangeMail.ts';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
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
    // Durable completion notifications can be retried by a scheduled private POST.
    async function notify() {
      const { data, error } = await db.from('tenant_email_events').select('id,old_email,new_email').is('notified_at', null).order('created_at').limit(10);
      if (error) throw new Error('Storage unavailable');
      for (const event of data || []) {
        await sendEmailChangeMail(event.old_email, 'Your Spartment email was changed',
          `Your Spartment account email was changed to ${event.new_email}. If you did not authorize this, contact your apartment administrator immediately.`, `email-change-notice-${event.id}`);
        const saved = await db.from('tenant_email_events').update({ notified_at: new Date().toISOString() }).eq('id', event.id);
        if (saved.error) throw new Error('Storage unavailable');
      }
    }
    if (body.action === 'notify') { await notify(); return reply(200, { ok: true }); }
    if (!['start', 'resend', 'status', 'approve', 'verify'].includes(body.action)) return reply(400, { error: 'Invalid action' });
    let userId: string | null = null;
    if (body.action !== 'approve') {
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
    if (body.action === 'approve' && (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token))) return reply(400, { error: 'Invalid approval link.' });
    if (body.action === 'verify' && (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp))) return reply(400, { error: 'Enter the six-digit verification code.' });
    let email = body.email;
    if (body.action === 'start' && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) return reply(400, { error: 'Enter a valid email address.' });
    const approval = hex(), otp = code();
    const digestOtp = (value: string) => hash(`${secret}:email-change:${userId}:${value}`);
    // Approval has no session: derive its OTP binding from the request's user ID.
    if (body.action === 'approve') {
      const pending = await db.from('tenant_email_changes').select('user_id').eq('approval_hash', await hash(body.token)).maybeSingle();
      if (pending.error) throw new Error('Storage unavailable');
      userId = pending.data?.user_id || null;
    }
    let approvalUrl: URL | undefined;
    if (['start', 'resend', 'approve'].includes(body.action)) {
      emailChangeMailConfig();
      approvalUrl = new URL(Deno.env.get('EMAIL_CHANGE_APPROVAL_URL') || '');
      if (approvalUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(approvalUrl.hostname)) throw new Error('Invalid URL');
      approvalUrl.hash = new URLSearchParams({ token: approval }).toString();
    }
    const { data: result, error } = await db.rpc('tenant_email_change', {
      p_action: body.action, p_user: userId, p_email: typeof email === 'string' ? email.trim().toLowerCase() : null,
      p_approval: await hash(body.action === 'approve' ? body.token : approval),
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
      // The trigger has already revoked sessions and queued the notification.
      try { await notify(); } catch { console.warn('[email-change] Completion notification queued for retry'); }
      return reply(200, { ok: true });
    }
    if (body.action !== 'status') {
      if (result.stage === 'approval') await sendEmailChangeMail(result.oldEmail, 'Approve your Spartment email change',
        `A change to ${result.newEmail} was requested for your Spartment account. Open this link and select Approve email change within 10 minutes:\n\n${approvalUrl}\n\nIf you did not request this, do not approve it and contact your apartment administrator.`, `email-change-approval-${await hash(approval)}`);
      else await sendEmailChangeMail(result.newEmail, 'Your Spartment verification code',
        `Your Spartment email verification code is ${otp}. It expires in 10 minutes. Do not share this code.`, `email-change-otp-${crypto.randomUUID()}`);
    }
    // Never return old-email credentials, OTPs, or approval links to the browser.
    return reply(200, { stage: result.stage, newEmail: result.newEmail, expiresAt: result.expiresAt, resendAt: result.resendAt });
  } catch { return reply(503, { error: 'Email change is temporarily unavailable. Please retry. If an email was not delivered, wait 60 seconds before resending.' }); }
});
