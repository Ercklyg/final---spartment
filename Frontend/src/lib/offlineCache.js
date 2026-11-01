const DATABASE = 'spartment-offline-v1';
const STORE = 'responses';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 80;
const offlineSessionKey = 'spartment-offline-account';

const openDatabase = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) { reject(new Error('Offline storage unavailable.')); return; }
  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const eligible = path => !path.includes('/attachments/') && !path.startsWith('/public/') && path !== '/auth/session';

export async function saveOfflineResponse(userId, path, data) {
  if (!userId || !eligible(path)) return;
  try {
    if (JSON.stringify(data).length > 1_000_000) return;
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
    db.close();
    if (!record || Date.now() - record.savedAt > MAX_AGE) return null;
    return record;
  } catch { return null; }
}

export async function clearOfflineData() {
  try { localStorage.removeItem(offlineSessionKey); } catch { /* Storage may be disabled. */ }
  try { const db=await openDatabase(); const transaction=db.transaction(STORE,'readwrite'); transaction.objectStore(STORE).clear(); await new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);}); db.close(); } catch { /* Already clear or unavailable. */ }
}

export function saveOfflineSession(value) {
  if (!value?.user?.id) return;
  try { localStorage.setItem(offlineSessionKey, JSON.stringify({user:value.user,expires_at:value.expires_at,savedAt:Date.now()})); } catch { /* Storage may be disabled. */ }
}

export function loadOfflineSession() {
  try { const value=JSON.parse(localStorage.getItem(offlineSessionKey)||'null'); return value?.user?.id&&Date.now()-value.savedAt<=MAX_AGE?{...value,offline:true}:null; } catch { return null; }
}
