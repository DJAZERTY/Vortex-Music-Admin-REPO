/* public/sw.js */
const CACHE = 'app-cache-v1';
const PRECACHE = [
  '/',               // adapte selon ton app
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

/* --- Install / Activate --- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* --- Fetch: ne casse pas l’audio, WS/SSE, ni les POST --- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Bypass méthodes non-GET (POST/PUT/DELETE…)
  if (req.method !== 'GET') return;

  // 2) Bypass WebSocket & SSE
  const accept = req.headers.get('accept') || '';
  if (req.headers.get('upgrade') === 'websocket' || accept.includes('text/event-stream')) {
    return;
  }

  // 3) Bypass requêtes media fragmentées (audio/video Range)
  if (req.headers.has('range')) return;

  // 4) Ne traite que HTTP(S)
  if (!req.url.startsWith('http')) return;

  // Stale-while-revalidate simple pour les assets statiques
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((resp) => {
        if (resp.ok && new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then((c) => c.put(req, resp.clone())).catch(() => {});
        }
        return resp;
      }).catch(() => cached || Promise.reject('offline'));
      return cached || fetchPromise;
    })
  );
});

/* ---------------------------
   TON CODE D’ORIGINE: CONSERVÉ
   Sert à afficher l’overlay audio en broadcast
---------------------------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skip') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          action: 'skip',
          direction: event.data.direction
        });
      });
    });
  }
});

/* --- Petit extra optionnel --- */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  // Permet de forcer l'activation d’une nouvelle version du SW
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});
