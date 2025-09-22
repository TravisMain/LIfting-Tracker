const CACHE_NAME = 'lifting-tracker-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Web Share Target POST
  if (request.method === 'POST' && url.pathname.endsWith('/Lifting-Tracker/share-target')) {
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
          await cache.put('/Lifting-Tracker/shared-plan.json', new Response(jsonText, { headers: { 'Content-Type': 'application/json' } }));
          return Response.redirect('/Lifting-Tracker/?importSharedPlan=1', 303);
        }
      } catch (e) {
        // fall through to index
      }
      return Response.redirect('/Lifting-Tracker/', 303);
    })());
    return;
  }

  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache same-origin GETs
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
