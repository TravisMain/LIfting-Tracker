const CACHE_NAME = 'lifting-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

const scopeURL = new URL(self.registration.scope);
const SHARE_TARGET_URL = new URL('./share-target', scopeURL);
const SHARED_PLAN_URL = new URL('./shared-plan.json', scopeURL);
const IMPORT_URL = new URL('./?importSharedPlan=1', scopeURL);
const START_URL = new URL('./', scopeURL);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of clients) {
        try { client.postMessage({ type: 'SW_UPDATED' }); } catch {}
      }
    })()
  );
});

// Allow clients to message the SW (e.g., to skip waiting)
self.addEventListener('message', (event) => {
  try {
    const data = event && event.data;
    if (!data) return;
    if (data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    // Other messages can be handled here in future (e.g., CLEAR_CACHE)
  } catch (e) {}
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const EXTERNAL_EXERCISE_HOST = 'raw.githubusercontent.com';
  const EXTERNAL_EXERCISE_PATH_CONTAINS = '/exercemus/exercises/minified/minified-exercises.json';

  // Handle Web Share Target POST
  if (
    request.method === 'POST' &&
    url.origin === SHARE_TARGET_URL.origin &&
    url.pathname === SHARE_TARGET_URL.pathname
  ) {
    event.respondWith((async () => {
      try {
        const formData = await request.formData();
        const files = formData.getAll('plans');
        // Find first JSON file
        const file = files && files.find(f => f && typeof f.name === 'string' && f.name.toLowerCase().endsWith('.json'));
        if (file) {
          const jsonText = await file.text();
          // Put into cache for retrieval by client
          const cache = await caches.open(CACHE_NAME);
          await cache.put(
            SHARED_PLAN_URL.toString(),
            new Response(jsonText, { headers: { 'Content-Type': 'application/json' } })
          );
          return Response.redirect(IMPORT_URL.toString(), 303);
        }
      } catch (e) {
        // fall through to index
      }
      return Response.redirect(START_URL.toString(), 303);
    })());
    return;
  }

  if (request.method !== 'GET') return;

  // Special handling for the external exercise dataset: network-first, fallback to cache
  if (url.host === EXTERNAL_EXERCISE_HOST && url.pathname.indexOf(EXTERNAL_EXERCISE_PATH_CONTAINS) !== -1) {
    event.respondWith((async () => {
      try {
        const netResp = await fetch(request);
        if (netResp && netResp.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, netResp.clone()).catch(() => {});
          return netResp;
        }
      } catch (e) {
        // network failed, fall through to cache
      }
      const cached = await caches.match(request);
      if (cached) return cached;
      // If nothing, return a 503 Response
      return new Response(JSON.stringify({ error: 'Offline and no cached exercise data' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }

  // Default: cache-first with network fallback and cache population for same-origin
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        try {
          const reqUrl = new URL(request.url);
          if (reqUrl.origin === location.origin) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          }
        } catch {}
        return response;
      }).catch(() => cached);
    })
  );
});
