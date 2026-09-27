const CACHE = 'pls-urgence-v5';
const ASSETS = ["./", "./index.html", "./main.html", "./apercu.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png", "./images/align.svg", "./images/call.svg", "./images/farArm.svg", "./images/glasses.svg", "./images/head.svg", "./images/knee.svg", "./images/leg.svg", "./images/monitor.svg", "./images/mouth.svg", "./images/nearArm.svg", "./images/roll.svg", "./images/supine.svg", "./images/withdraw.svg"];
// Version du cache : à changer à chaque publication pour tout recharger d’un coup.
// Même sans changement, chaque fichier est revérifié en arrière-plan (voir « fetch »).
self.addEventListener('install', event => {
  // cache: 'reload' contourne le cache HTTP du navigateur pour enregistrer les versions publiées.
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pls-urgence-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Affiche tout de suite la version en cache (rapide, et fonctionne hors ligne), puis vérifie
// le site en arrière-plan et met le cache à jour : une mise à jour publiée apparaît
// à l’ouverture suivante.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const navigate = request.mode === 'navigate';
  const cacheKey = navigate ? new URL(request.url).pathname : request;
  let saved = Promise.resolve();
  const network = fetch(request, { cache: 'no-cache' }).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      saved = caches.open(CACHE).then(cache => cache.put(cacheKey, copy));
    }
    return response;
  });
  event.waitUntil(network.then(() => saved).catch(() => {}));
  event.respondWith(caches.match(request, { ignoreSearch: navigate }).then(cached => cached || network.catch(() => {
    if (navigate) return caches.match('./main.html');
    return Response.error();
  })));
});
