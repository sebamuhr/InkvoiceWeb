/* Inkvoice service worker.
   NETWORK-FIRST + cache-BYPASS: every online fetch uses {cache:'reload'} so the
   browser's HTTP cache (GitHub Pages sends max-age=600) can never serve stale JS.
   The app always gets the freshest code when online; cache is only the offline
   fallback. This fixes "refresh shows no change for ~10 minutes after a deploy". */
const CACHE = 'inkvoice-v19';

const SHELL = [
  './', './index.html', './css/styles.css', './vendor/jspdf.umd.min.js', './vendor/fonts.js',
  './js/app.js', './js/store.js', './js/util.js', './js/icons.js', './js/ui.js', './js/pdf.js', './js/ads.js',
  './js/sync.js', './js/syncbridge.js', './js/syncui.js',
  './js/views/dashboard.js', './js/views/create.js', './js/views/list.js',
  './js/views/view.js', './js/views/profile.js', './js/views/cards.js', './js/views/landing.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/maskable-512.png',
  './pdfsamples/professional.png', './pdfsamples/elegant.png', './pdfsamples/minimalist.png', './pdfsamples/classic.png'
];

self.addEventListener('install', (e) => {
  // Precache with {cache:'reload'} so a new worker never stores stale (HTTP-cached) files.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
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

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Never touch cross-origin requests (e.g. the Adsterra ad script) — let them go
  // straight to the network so third-party code runs normally and is never cached.
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    // {cache:'reload'} bypasses the browser HTTP cache so we always hit the network.
    fetch(req, { cache: 'reload' })
      .then((res) => {
        // refresh cache with the latest successful same-origin response
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
