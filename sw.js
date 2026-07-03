/* Inkvoice service worker.
   NETWORK-FIRST: always try the network so updated code loads immediately when
   online; fall back to cache only when offline. This avoids "blank page after
   update" caused by a stale cache-first worker. */
const CACHE = 'inkvoice-v12';

const SHELL = [
  './', './index.html', './css/styles.css', './vendor/jspdf.umd.min.js', './vendor/fonts.js',
  './js/app.js', './js/store.js', './js/util.js', './js/icons.js', './js/ui.js', './js/pdf.js', './js/ads.js',
  './js/views/dashboard.js', './js/views/create.js', './js/views/list.js',
  './js/views/view.js', './js/views/profile.js', './js/views/cards.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/maskable-512.png',
  './pdfsamples/professional.png', './pdfsamples/elegant.png', './pdfsamples/minimalist.png', './pdfsamples/classic.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  e.respondWith(
    fetch(req)
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
