import { HttpError } from '../middleware/errors.js';
import { readSessionCookie } from './sessionCookies.js';

export async function emailChange(req, action, fetcher = fetch) {
  if (action !== 'approve' && req.role !== 'tenant') throw new HttpError(403, 'A tenant account is required.');
  const body = req.body || {};
  if (action === 'start' && (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())))
    throw new HttpError(400, 'Enter a valid email address.');
  if (action === 'approve' && (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token))) throw new HttpError(400, 'Invalid approval link.');
  if (action === 'verify' && (typeof body.otp !== 'string' || !/^\d{6}$/.test(body.otp))) throw new HttpError(400, 'Enter the six-digit verification code.');
  if (!process.env.RECOVERY_STORAGE_SECRET) throw new HttpError(503, 'Email change is temporarily unavailable.');
  let response, data;
  try {
    response = await fetcher(new URL('/functions/v1/email-change', process.env.SUPABASE_URL), {
      method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'x-recovery-key': process.env.RECOVERY_STORAGE_SECRET },
      body: JSON.stringify({ action, email: action === 'start' ? body.email.trim().toLowerCase() : undefined,
        otp: action === 'verify' ? body.otp : undefined, token: action === 'approve' ? body.token : undefined,
        accessToken: action !== 'approve' ? readSessionCookie(req, 'access') : undefined, ip: req.ip }),
    });
    data = await response.json();
  } catch { throw new HttpError(503, 'Email change is temporarily unavailable.'); }
  if (!response.ok) throw new HttpError([400, 401, 403, 409, 429].includes(response.status) ? response.status : 503,
    typeof data.error === 'string' ? data.error : 'Unable to change your email.');
  return data;
}
