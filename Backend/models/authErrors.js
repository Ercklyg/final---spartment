import { HttpError } from '../middleware/errors.js';

const invalidSessionCodes = new Set(['bad_jwt','session_not_found','session_expired','refresh_token_not_found','refresh_token_already_used','user_not_found','user_banned']);
const invalidRecoveryCodes = new Set(['otp_expired','otp_disabled','validation_failed','invalid_credentials','user_not_found']);
export function authFailure(error, recovery = false) {
  if (error.status === 429) return new HttpError(429, 'Too many authentication requests. Please wait and retry.');
  if (invalidSessionCodes.has(error.code) || (recovery && invalidRecoveryCodes.has(error.code)) || (error.status === 401 && error.code))
    return new HttpError(401, recovery ? 'This reset link has expired or has already been used. Request a new link.' : 'Session expired. Sign in again.');
  return new HttpError(503, 'Authentication is temporarily unavailable. Please try again later.', 'auth_unavailable');
}
