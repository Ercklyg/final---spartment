import { HttpError } from '../middleware/errors.js';
import { finishRecovery, sendRecoveryEmail, verifyRecoveryLink } from '../models/passwordRecovery.js';

export function normalizeRecoveryEmail(body) {
  if (typeof body?.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
    throw new HttpError(400, 'Enter a valid email address.');
  return body.email.trim().toLowerCase();
}

export async function requestReset(body) {
  await sendRecoveryEmail(normalizeRecoveryEmail(body));
  return { message: 'If this email belongs to an account, a password reset link will be sent. Check your inbox and spam folder.' };
}

export async function verifyReset(body) {
  // Supabase owns the email-token format (currently 56 characters).
  // It is separate from our 64-character recovery ticket. Bound the input here;
  // verifyOtp checks token validity, recovery purpose, expiry and prior use.
  if (typeof body?.tokenHash !== 'string' || !body.tokenHash.length
    || body.tokenHash.length > 1024 || /\s/.test(body.tokenHash))
    throw new HttpError(400, 'This reset link is invalid. Request a new link.');
  return verifyRecoveryLink(body.tokenHash);
}

export async function resetPassword(body) {
  if (typeof body?.ticket !== 'string' || !/^[a-f0-9]{64}$/i.test(body.ticket))
    throw new HttpError(401, 'This reset session is invalid. Request a new link.');
  if (typeof body.password !== 'string' || typeof body.confirmPassword !== 'string')
    throw new HttpError(400, 'Enter and confirm your new password.');
  if (body.password !== body.confirmPassword) throw new HttpError(400, 'Your passwords do not match.');
  if (body.password.length < 8 || body.password.length > 128 || !/[a-z]/.test(body.password)
    || !/[A-Z]/.test(body.password) || !/\d/.test(body.password) || !/[^A-Za-z0-9]/.test(body.password))
    throw new HttpError(400, 'Use 8–128 characters with uppercase and lowercase letters, a number, and a symbol.');
  return finishRecovery(body.ticket, body.password);
}
