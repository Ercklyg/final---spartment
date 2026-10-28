import { useEffect, useState } from 'react';

export const uiStatePrefix = 'spartment-ui:';

export function useSessionState(key, initialValue) {
  const storageKey = uiStatePrefix + key;
  const [value, setValue] = useState(() => {
    const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved === null ? fallback : JSON.parse(saved);
    } catch { return fallback; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* UI state persistence is optional. */ }
  }, [storageKey, value]);
  return [value, setValue];
}

export function clearSessionUiState() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(uiStatePrefix)) sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be disabled. */ }
}
