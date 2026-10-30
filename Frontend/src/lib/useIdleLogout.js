import { useEffect, useRef } from 'react';

export const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;
export const DEFAULT_IDLE_TIMEOUT_MS = DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000;
export function formatIdleTimeout(minutes) {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  const value = Number.isInteger(minutes) ? minutes : minutes.toFixed(1);
  return `${value} minute${minutes === 1 ? '' : 's'}`;
}

const STORAGE_KEY = 'spartment-last-activity';
const PERSIST_INTERVAL_MS = 1000;
const CHECK_INTERVAL_MS = 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

function readMarker() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return value && typeof value.userId === 'string' && Number.isFinite(value.at) ? value : null;
  } catch { return null; }
}

function writeMarker(userId, at) {
  try {
    const current = readMarker();
    if (current?.userId === userId && current.at >= at) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, at }));
  } catch { /* Storage is optional. */ }
}

export function clearIdleMarker() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
}

export function resetIdleMarker(userId) {
  if (userId) writeMarker(userId, Date.now());
}

// Signs the current user out after a period without keyboard, pointer, or scroll
// input. Activity is stored per user so reloads and other tabs share one clock.
export function useIdleLogout({ enabled, userId, onIdle, timeoutMs = DEFAULT_IDLE_TIMEOUT_MS }) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

  useEffect(() => {
    if (!enabled || !userId || typeof window === 'undefined') return undefined;

    const now = Date.now();
    const marker = readMarker();
    let lastActivity = marker?.userId === userId ? Math.min(marker.at, now) : now;

    if (marker?.userId === userId && now - lastActivity >= timeoutMs) {
      clearIdleMarker();
      onIdleRef.current?.();
      return undefined;
    }

    writeMarker(userId, lastActivity);

    let fired = false;
    let lastPersisted = lastActivity;
    let frame = 0;
    let timer = 0;
    let cleanup = () => {};

    const persist = at => {
      if (at - lastPersisted < PERSIST_INTERVAL_MS) return;
      lastPersisted = at;
      writeMarker(userId, at);
    };

    const record = (at = Date.now()) => {
      if (fired) return;
      lastActivity = at;
      persist(at);
    };

    const onActivity = () => record();
    const onPointerMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; record(); });
    };
    const onStorage = event => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (value?.userId === userId && Number.isFinite(value.at)) lastActivity = Math.max(lastActivity, value.at);
      } catch { /* Ignore malformed markers written by other tabs. */ }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
      else writeMarker(userId, lastActivity);
    };
    const onPageHide = () => writeMarker(userId, lastActivity);

    const check = () => {
      if (fired) return;
      if (Date.now() - lastActivity < timeoutMs) return;
      fired = true;
      clearIdleMarker();
      cleanup();
      onIdleRef.current?.();
    };

    cleanup = () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('scroll', onActivity, true);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (frame) cancelAnimationFrame(frame);
      clearInterval(timer);
    };

    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { capture: true, passive: true });
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    window.addEventListener('scroll', onActivity, { capture: true, passive: true });
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    timer = setInterval(check, CHECK_INTERVAL_MS);

    return cleanup;
  }, [enabled, userId, timeoutMs]);

  return undefined;
}
