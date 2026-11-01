const SHELL_CACHE = 'spartment-shell-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('spartment-shell-') && key !== SHELL_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

const cacheableAsset = url => url.origin === self.location.origin &&
  !url.pathname.startsWith('/api/') &&
  !url.pathname.includes('buildingScene') &&
  !url.pathname.includes('maintenance-attachments');

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!cacheableAsset(url)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(SHELL_CACHE).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }
  if (!['script', 'style', 'font', 'image'].includes(event.request.destination)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(SHELL_CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
