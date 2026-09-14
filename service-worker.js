const CACHE = 'pls-urgence-v3-illustrations';
const ASSETS = ["./", "./index.html", "./main.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./images/align.svg", "./images/call.svg", "./images/farArm.svg", "./images/glasses.svg", "./images/head.svg", "./images/knee.svg", "./images/leg.svg", "./images/monitor.svg", "./images/mouth.svg", "./images/nearArm.svg", "./images/roll.svg", "./images/supine.svg", "./images/withdraw.svg"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pls-urgence-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => {
    if (event.request.mode === 'navigate') return caches.match('./main.html');
    return Response.error();
  })));
});
