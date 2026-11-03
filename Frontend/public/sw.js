const SHELL_CACHE = 'spartment-shell-v3';
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

const networkFirst = (event, request, cacheKey, fallbackKey) => {
  let resolveResponse;
  let rejectResponse;
  const clientResponse = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });
  const background = fetch(request).then(async response => {
    // Clone before releasing the original response to the browser.
    const copy = response.ok ? response.clone() : null;
    resolveResponse(response);
    if (copy) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(cacheKey, copy);
    }
  }).catch(async error => {
    const cached = fallbackKey ? await caches.match(fallbackKey) : null;
    if (cached) resolveResponse(cached);
    else rejectResponse(error);
  });
  event.respondWith(clientResponse);
  event.waitUntil(background.catch(() => undefined));
};

const cacheFirst = (event, request) => {
  let resolveResponse;
  let rejectResponse;
  const clientResponse = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });
  const background = caches.match(request).then(cached => {
    if (cached) {
      resolveResponse(cached);
      return undefined;
    }
    return fetch(request).then(async response => {
      // Clone before releasing the original response to the browser.
      const copy = response.ok ? response.clone() : null;
      resolveResponse(response);
      if (copy) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, copy);
      }
    });
  }).catch(rejectResponse);
  event.respondWith(clientResponse);
  event.waitUntil(background.catch(() => undefined));
};

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!cacheableAsset(url)) return;
  if (event.request.mode === 'navigate') {
    networkFirst(event, event.request, '/index.html', '/index.html');
    return;
  }
  if (!['script', 'style', 'font', 'image'].includes(event.request.destination)) return;
  cacheFirst(event, event.request);
});

self.addEventListener('push',event=>{
  let data={title:'Spartment update',body:'You have a new account update.',url:'/?page=dashboard',tag:'spartment-update'};
  try{if(event.data)data={...data,...event.data.json()};}catch{/* Use the safe default message. */}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/favicon.svg',badge:'/favicon.svg',tag:data.tag,data:{url:data.url}}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>client.url.startsWith(self.location.origin));if(existing){existing.navigate(target);return existing.focus();}return self.clients.openWindow(target);}));
});
