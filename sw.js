/* Inkvoice service worker.
   NETWORK-FIRST + cache-BYPASS: every online fetch uses {cache:'reload'} so the
   browser's HTTP cache (GitHub Pages sends max-age=600) can never serve stale JS.
   The app always gets the freshest code when online; cache is only the offline
   fallback. This fixes "refresh shows no change for ~10 minutes after a deploy". */
const CACHE = 'inkvoice-v49';

const SHELL = [
  './', './index.html', './css/styles.css', './vendor/jspdf.umd.min.js', './vendor/fonts.js',
  './js/app.js', './js/store.js', './js/util.js', './js/icons.js', './js/ui.js', './js/pdf.js', './js/ads.js',
  './js/sync.js', './js/syncbridge.js', './js/syncui.js',
  './js/views/dashboard.js', './js/views/create.js', './js/views/list.js',
  './js/views/view.js', './js/views/profile.js', './js/views/cards.js', './js/views/landing.js',
  './manifest.json',
  './icons/icon-192-v5.png', './icons/icon-512-v5.png', './icons/apple-touch-icon.png', './icons/maskable-512-v6.png',
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
  const url = new URL(req.url);
  // Never touch cross-origin requests (e.g. the Adsterra ad script) — let them go
  // straight to the network so third-party code runs normally and is never cached.
  if (url.origin !== self.location.origin) return;
  // NEVER intercept the manifest or the app icons. The browser fetches these while
  // it builds the installed home-screen icon; if this worker mediates them it can
  // return an empty/slow response and the launcher falls back to the generic Android
  // icon (seen on real devices once a worker is registered — a fresh browser with no
  // worker always got the real icon). Letting them go straight to the network (they
  // are HTTP-cached for 7 days) guarantees the real teal icon on install/re-install.
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/favicon.ico') || url.pathname.includes('/icons/')) return;
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
      .catch(() => caches.match(req).then((hit) => {
        if (hit) return hit;
        // Only fall back to the app shell for PAGE navigations. NEVER return HTML for
        // an asset request (icon, manifest, script): handing HTML back for an icon or
        // manifest corrupts it — that's what made the installed icon revert to the
        // default Android icon after an update.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      }))
  );
});
