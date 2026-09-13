import { randomBytes } from 'node:crypto';
import { createUserClient } from '../config/supabase.js';
import { HttpError } from '../middleware/errors.js';
import { authFailure } from './authErrors.js';
import { recoveryKey, recoveryState, encryptSession, decryptSession } from './recoveryState.js';

const lifetime = 10 * 60 * 1000;
const expired = () => new HttpError(401, 'This reset link has expired or has already been used. Request a new link.');

export async function sendRecoveryEmail(email) {
  const redirectTo = process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password';
  const { error } = await createUserClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    if (error.status === 429) throw new HttpError(429, 'Too many reset requests. Please wait before trying again.');
    if (['user_not_found', 'email_not_found'].includes(error.code)) return;
    const safeCode = value => typeof value === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(value) ? value : undefined;
    console.warn('[auth] Recovery email failure', {
      status: Number.isInteger(error.status) ? error.status : undefined,
      code: safeCode(error.code),
      type: safeCode(error.name),
      networkCode: safeCode(error.cause?.code || error.originalError?.cause?.code),
      stage: /sending.*email/i.test(error.message || '') ? 'email_delivery' : 'auth_request',
    });
    // Do not reveal provider details, credentials, or whether an account exists.
    throw new HttpError(503, 'Unable to send a reset email right now. Please try again later or contact your administrator.', 'recovery_email_unavailable');
  }
}

export async function verifyRecoveryLink(tokenHash) {
  const client = createUserClient();
  // The verification type is fixed by the server, never taken from the browser.
  const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error) throw authFailure(error,true);
  if (!data.session || !data.user) throw expired();
  const ticket = randomBytes(32).toString('hex');
  const expiresAt = Math.min(Date.now() + lifetime, data.session.expires_at * 1000);
  const key=recoveryKey(ticket);
  const ciphertext=encryptSession(key,{access_token:data.session.access_token,refresh_token:data.session.refresh_token});
  await recoveryState('put',key,{ciphertext,userId:data.user.id,expiresAt});
  // Supabase access and refresh tokens stay on the backend.
  return { ticket, expiresAt };
}

export async function finishRecovery(ticket, password) {
  const key = recoveryKey(ticket);
  const entry = await recoveryState('claim',key);
  const client = createUserClient();
  let consumed=false;
  try {
    const restored=await client.auth.setSession(decryptSession(key,entry.ciphertext));
    if(restored.error)throw authFailure(restored.error,true);
    const user = await client.auth.getUser();
    if(user.error)throw authFailure(user.error,true);
    if (user.data.user?.id !== entry.userId) {
      consumed=true;
      throw expired();
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      if (error.code === 'same_password') throw new HttpError(400, 'Choose a password different from your previous password.');
      if (error.code === 'weak_password') throw new HttpError(400, 'Choose a stronger password. This password does not meet the account security requirements.');
      if (error.status === 401 || error.code?.startsWith('reauthentication')) {
        consumed=true;
        throw expired();
      }
      throw new HttpError(400, 'The password update was not confirmed. Try again, or request a new reset link.');
    }
    // Keep a successful ticket consumed even if cleanup is temporarily unavailable.
    consumed=true;
    // Updating the password has succeeded; cleanup failure must not report it as a failed reset.
    try { await client.auth.signOut({ scope: 'global' }); } catch { /* Session expires through Supabase. */ }
    return { ok: true };
  } catch(error) {
    if(error.status===401)consumed=true;
    throw error;
  } finally {
    try{await recoveryState(consumed?'delete':'release',key);}catch{/* Fail closed: the claimed ticket stays busy until expiry. */}
  }
}
