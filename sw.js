/* Inkvoice service worker — offline-first, app-shell cache.
   Bump CACHE version whenever shell files change so clients update. */
const CACHE = 'inkvoice-v2';

// All paths relative to the SW scope (works on GitHub Pages subpaths).
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './vendor/jspdf.umd.min.js',
  './js/app.js',
  './js/store.js',
  './js/util.js',
  './js/icons.js',
  './js/ui.js',
  './js/pdf.js',
  './js/views/dashboard.js',
  './js/views/create.js',
  './js/views/list.js',
  './js/views/view.js',
  './js/views/profile.js',
  './js/views/cards.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for our own assets; network only used to fill the cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
