/* Captura Web Recorder — Service Worker
 * Cache-First strategy with versioned cache and user-controlled update flow.
 */

const CACHE_NAME = 'captura-v1.2.0';

// Local assets that must be available offline.
// External CDN resources are cached dynamically on first request.
const ASSETS_TO_CACHE = [
  './',
  './recorder.css',
  './recorder.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  '/styles/styles.css',
  '/scripts/formatting.js',
];

// ── Install ──────────────────────────────────────────────────────────────────
// Pre-cache all local assets. Do NOT call skipWaiting() here so that the
// update is only activated when the user explicitly clicks "Update Now".
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Remove stale caches from previous versions, then claim all open clients.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
// Cache-First: serve from cache when available; fall back to network and
// cache the fresh response for future offline use.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache valid responses (200 OK or opaque cross-origin).
        if (!response || (response.status !== 200 && response.type !== 'opaque')) {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});

// ── Message ──────────────────────────────────────────────────────────────────
// When the page sends 'SKIP_WAITING', activate the waiting worker immediately.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
