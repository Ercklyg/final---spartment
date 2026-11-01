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
