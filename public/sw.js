/* AlertCitizen service worker (hand-rolled, zero dependencies).
 * - Precache: app shell routes, manifest, icons, i18n JSON.
 *   (Knowledge-base JSON in /data is bundled into the JS chunks at build
 *   time — it ships inside _next/static and is cached by the generic
 *   same-origin handler below, so no separate /data/* precache is needed.
 *   If a later phase fetches /data/*.json at runtime, move them under
 *   public/data/ and re-add them here.)
 * - Runtime: /audio/** cache-first (max 50); /result queries network-first
 *   with cache fallback (last 10 kept); navigations fall back to offline page.
 * - Version: 'ac-v1'. Old caches are purged on activate.
 */
const VERSION = 'ac-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const AUDIO_CACHE = `${VERSION}-audio`;
const QUERY_CACHE = `${VERSION}-queries`;
const ALL_CACHES = [SHELL_CACHE, AUDIO_CACHE, QUERY_CACHE];
const OFFLINE_URL = '/offline.html';
const MAX_AUDIO = 50;
const MAX_QUERIES = 10;

const PRECACHE = [
  '/',
  '/home',
  '/result',
  '/complaint',
  '/announcements',
  '/quiz',
  '/lc-initiatives',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/i18n/en.json',
  '/i18n/lg.json',
  '/i18n/sw.json',
  '/fonts/public-sans-latin-wght-normal.woff2',
  '/fonts/public-sans-latin-ext-wght-normal.woff2',
  '/fonts/public-sans-latin-wght-italic.woff2',
  '/fonts/public-sans-latin-ext-wght-italic.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        // Resilient: future routes 404 until their phase lands — cache the rest.
        await Promise.all(
          PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
        );
        await cache.add(OFFLINE_URL).catch(() => undefined);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  while (keys.length > max) {
    await cache.delete(keys[0]);
    keys.shift();
  }
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone());
      await trimCache(cacheName, MAX_QUERIES);
    }
    return fresh;
  } catch {
    const hit = await caches.match(request);
    if (hit) return hit;
    if (fallback) {
      const page = await caches.match(fallback);
      if (page) return page;
    }
    throw new Error('offline');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Audio prompts: cache-first, capped at 50 entries.
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.match(request).then(async (hit) => {
        if (hit) return hit;
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(AUDIO_CACHE);
          cache.put(request, fresh.clone());
          await trimCache(AUDIO_CACHE, MAX_AUDIO);
        }
        return fresh;
      }),
    );
    return;
  }

  // Result queries: network-first, keep last 10 for offline replay.
  if (url.pathname.startsWith('/result')) {
    event.respondWith(networkFirst(request, QUERY_CACHE, null));
    return;
  }

  // Navigations: network-first, offline page fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, OFFLINE_URL));
    return;
  }

  // Everything else same-origin: cache-first, then network.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((fresh) => {
        if (fresh && fresh.ok && url.protocol.startsWith('http')) {
          const copy = fresh.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return fresh;
      });
    }),
  );
});
