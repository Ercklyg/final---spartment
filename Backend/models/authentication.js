import { HttpError } from '../middleware/errors.js';

// Only an explicit credentials error means the submitted email/password is wrong.
// Keep provider details private while preserving actionable sign-in failures.
export async function signInWithPassword(client, email, password, invalidMessage = 'The email or password is incorrect.') {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'invalid_credentials')
      throw new HttpError(401, invalidMessage, 'invalid_credentials');
    if (error.code === 'email_not_confirmed')
      throw new HttpError(403, 'Please confirm your email before signing in.', 'email_not_confirmed');
    if (error.code === 'user_banned')
      throw new HttpError(403, 'This account is disabled. Contact your administrator.', 'user_banned');
    if (error.status === 429 || error.code === 'over_request_rate_limit')
      throw new HttpError(429, 'Too many sign-in attempts. Please wait before trying again.', 'over_request_rate_limit');
    // Log identifiers only: never credentials, tokens, account data, or raw provider responses.
    const safeCode = value => typeof value === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(value) ? value : undefined;
    console.warn('[auth] Sign-in provider failure', {
      status: Number.isInteger(error.status) ? error.status : undefined,
      code: safeCode(error.code),
      type: safeCode(error.name),
      networkCode: safeCode(error.cause?.code || error.originalError?.cause?.code),
    });
    throw new HttpError(503, 'Authentication is temporarily unavailable. Please try again later.', 'auth_unavailable');
  }
  if (!data?.session?.access_token || !data?.user)
    throw new HttpError(503, 'Authentication is temporarily unavailable. Please try again later.', 'auth_unavailable');
  return data;
}
