import { showFeedback } from './actionFeedback.js';
import { browserRequest } from './http.js';

const storageKey = 'spartment-password-recovery';
const fragment = new URLSearchParams(window.location.hash.slice(1));
export const isRecoveryPage = window.location.pathname.replace(/\/$/, '') === '/reset-password'
  || fragment.get('type') === 'recovery';
let tokenHash = isRecoveryPage ? fragment.get('token_hash') : null;
const linkError = isRecoveryPage && (fragment.has('error') || new URLSearchParams(window.location.search).has('error'));
let verification;

if (isRecoveryPage) {
  // Remove link credentials before rendering, fetching, or navigating elsewhere.
  window.history.replaceState(null, '', '/reset-password');
  if (tokenHash || linkError || fragment.has('access_token')) clearRecovery();
}

async function post(path, body) {
  return browserRequest('/auth/'+path,{method:'POST',body:JSON.stringify(body)});
}

export function clearRecovery() {
  try { sessionStorage.removeItem(storageKey); } catch { /* In-memory reset still works. */ }
}

export async function requestPasswordReset(email) {
  try {
    const data = await post('forgot-password', { email });
    showFeedback(data.message, 'info');
    return data;
  } catch (error) { showFeedback(error.message, 'error'); throw error; }
}

export function beginRecovery() {
  // Share the exchange across React Strict Mode mounts; a recovery link is single-use.
  if (verification) return verification;
  verification = (async () => {
    if (linkError) throw new Error('This reset link has expired or is invalid. Request a new link.');
    if (tokenHash) {
      const token = tokenHash;
      tokenHash = null;
      const result = await post('verify-recovery', { tokenHash: token });
      try { sessionStorage.setItem(storageKey, JSON.stringify(result)); } catch { /* Keep it in memory. */ }
      return result;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (/^[a-f0-9]{64}$/i.test(saved?.ticket || '') && saved.expiresAt > Date.now()) return saved;
    } catch { /* Missing or unavailable tab storage requires a new link. */ }
    clearRecovery();
    throw new Error('Open the reset link from your email, or request a new link below.');
  })();
  return verification;
}

export async function saveRecoveredPassword(ticket, password, confirmPassword) {
  try {
    await post('reset-password', { ticket, password, confirmPassword });
    clearRecovery();
    showFeedback('Your password has been reset. Sign in with your new password.');
  } catch (error) { showFeedback(error.message, 'error'); throw error; }
}
