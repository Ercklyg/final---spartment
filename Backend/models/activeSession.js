import { HttpError } from '../middleware/errors.js';

export async function requireActiveSession(client) {
  const { data, error } = await client.rpc('current_session_active');
  if (error) throw new HttpError(503, 'Authentication is temporarily unavailable. Please try again later.', 'auth_unavailable');
  if (data !== true) throw new HttpError(401, 'Your session expired. Please sign in again.');
}
