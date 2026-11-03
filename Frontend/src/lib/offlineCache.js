const DATABASE = 'spartment-offline-v1';
const DATABASE_VERSION = 2;
const STORE = 'responses';
// Offline copies are deliberately short-lived and limited to the three tenant
// views that need them. Admin workspaces, analytics, notifications, receipts,
// attachments and preference/configuration endpoints must never be persisted.
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_RECORDS = 12;
const MAX_RESPONSE_BYTES = 256_000;
const offlineSessionKey = 'spartment-offline-account';

const eligible = path => {
  try {
    const pathname = new URL(path, window.location.origin).pathname;
    return pathname === '/account' || pathname === '/billing' || pathname === '/requests';
  } catch { return false; }
};

const openDatabase = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) { reject(new Error('Offline storage unavailable.')); return; }
  const request = indexedDB.open(DATABASE, DATABASE_VERSION);
  request.onupgradeneeded = event => {
    const store = event.oldVersion === 0
      ? request.result.createObjectStore(STORE, { keyPath: 'key' })
      : request.transaction.objectStore(STORE);
    // Version 1 cached nearly every authenticated GET. Remove those broad
    // copies instead of carrying potentially sensitive legacy data forward.
    if (event.oldVersion > 0) store.clear();
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function saveOfflineResponse(userId, path, data) {
  if (!userId || !eligible(path)) return;
  try {
    if (new Blob([JSON.stringify(data)]).size > MAX_RESPONSE_BYTES) return;
    const db = await openDatabase();
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    store.put({ key: `${userId}:${path}`, userId, path, data, savedAt: Date.now() });
    const allRequest = store.getAll();
    allRequest.onsuccess = () => allRequest.result.sort((a,b)=>b.savedAt-a.savedAt).slice(MAX_RECORDS).forEach(record=>store.delete(record.key));
    await new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});
    db.close();
  } catch { /* Offline storage is optional. */ }
}

export async function loadOfflineResponse(userId, path) {
  if (!userId || !eligible(path)) return null;
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(`${userId}:${path}`);
    const record = await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    if (!record || Date.now() - record.savedAt > MAX_AGE) {
      if (record) {
        const cleanup = db.transaction(STORE, 'readwrite');
        cleanup.objectStore(STORE).delete(`${userId}:${path}`);
        await new Promise((resolve,reject)=>{cleanup.oncomplete=resolve;cleanup.onerror=()=>reject(cleanup.error);});
      }
      db.close();
      return null;
    }
    db.close();
    return record;
  } catch { return null; }
}

export async function clearOfflineData() {
  try { localStorage.removeItem(offlineSessionKey); } catch { /* Storage may be disabled. */ }
  try { const db=await openDatabase(); const transaction=db.transaction(STORE,'readwrite'); transaction.objectStore(STORE).clear(); await new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);}); db.close(); } catch { /* Already clear or unavailable. */ }
}

export function saveOfflineSession(value) {
  if (!value?.user?.id) return;
  try { localStorage.setItem(offlineSessionKey, JSON.stringify({userId:value.user.id,expiresAt:value.expires_at,savedAt:Date.now()})); } catch { /* Storage may be disabled. */ }
}

export function loadOfflineSession() {
  try {
    const value = JSON.parse(localStorage.getItem(offlineSessionKey) || 'null');
    const userId = value?.userId || value?.user?.id;
    if (!userId || Date.now() - value.savedAt > MAX_AGE) {
      localStorage.removeItem(offlineSessionKey);
      return null;
    }
    // Rewrite version-1 entries so an email address is not retained locally.
    if (value.user) localStorage.setItem(offlineSessionKey, JSON.stringify({userId,expiresAt:value.expires_at,savedAt:value.savedAt}));
    return {user:{id:userId},expires_at:value.expiresAt ?? value.expires_at,offline:true};
  } catch { return null; }
}
