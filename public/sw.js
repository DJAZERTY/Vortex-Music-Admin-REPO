/* public/sw.js */
const CACHE = 'app-cache-v1';
const PRECACHE = [
  '/',               // adapte selon ton app/hosting
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

/* --- Install: précache --- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

/* --- Activate: cleanup + nav preload --- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Nettoyage anciens caches
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));

      // Active Navigation Preload si dispo (meilleur TTFB)
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch {}
      }
      await self.clients.claim();
    })()
  );
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

  // 5) Requêtes de navigation (SPA) : network-first avec preload, fallback index.html offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Réponse de navigation preload si dispo
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;

        // Sinon réseau
        const networkResp = await fetch(req);
        // Cache en arrière-plan l'index si même origine
        if (networkResp.ok && new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then((c) => c.put('/index.html', networkResp.clone())).catch(() => {});
        }
        return networkResp;
      } catch {
        // Offline: fallback vers l'index en cache
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) return cachedIndex;
        // Si pas d'index, renvoie n'importe quel cache disponible pour ne pas planter
        const any = await caches.match(req);
        if (any) return any;
        // Dernier recours : simple Response
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 6) GET non-navigation : stale-while-revalidate simple (même origine uniquement en cache)
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

/* --- Messages depuis/vers les pages (overlay audio + contrôle du SW) --- */
self.addEventListener('message', (event) => {
  const data = event.data || {};

  // Broadcast overlay audio "skip" vers toutes les fenêtres clientes
  if (data.action === 'skip') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ action: 'skip', direction: data.direction });
      });
    });
  }

  // Permettre à la page de forcer l'activation d'une nouvelle version
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
