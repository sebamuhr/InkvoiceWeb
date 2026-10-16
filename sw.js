/* Inkvoice service worker.

   CACHE-FIRST (app-shell pattern). Inkvoice is an offline app: every invoice, client and
   setting lives in localStorage on the device, so STARTING the app must never depend on the
   network. The shell (HTML/CSS/JS/fonts) is served straight from the Cache API and refreshed
   in the background — "stale-while-revalidate".

   This replaced a NETWORK-FIRST worker that fetched even index.html before rendering. That
   worked on desktop Chrome (a failed fetch rejects instantly and falls back to cache) but
   broke installed iPhone PWAs: WebKit terminates idle workers aggressively, so a cold
   home-screen launch had to boot the worker AND let its network fetch fail before anything
   painted — offline that showed a BLANK SCREEN. Cache-first never asks the network to start,
   so the app opens instantly, online or off.

   Freshness after a deploy is preserved by VERSION below: bump it, the new worker precaches
   everything fresh, skipWaiting()+claim() fire, and app.js's `controllerchange` handler
   reloads the page once onto the new code. ALWAYS bump VERSION when shipping. */
const VERSION = 'v72';
const CACHE = 'inkvoice-' + VERSION;

// How long a background/network request may hang before we give up. Without this a flaky
// mobile network (connected to wifi, no actual internet — captive portals, weak signal) can
// leave a fetch pending for minutes.
const NET_TIMEOUT = 8000;

const SHELL = [
  './', './index.html', './css/styles.css', './vendor/jspdf.umd.min.js', './vendor/fonts.js',
  './js/app.js', './js/store.js', './js/util.js', './js/icons.js', './js/ui.js', './js/pdf.js', './js/ads.js',
  './js/sync.js', './js/syncbridge.js', './js/syncui.js', './js/i18n.js', './js/einvoice.js',
  './js/views/dashboard.js', './js/views/create.js', './js/views/list.js',
  './js/views/profile.js', './js/views/cards.js', './js/views/landing.js',
  './manifest.json',
  // Canonical, STABLE icon filenames — these never change again (see progress.md icon policy).
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/maskable-512.png',
  './pdfsamples/professional.png', './pdfsamples/elegant.png', './pdfsamples/minimalist.png', './pdfsamples/classic.png'
];
const SHELL_URLS = new Set(SHELL.map((u) => new URL(u, self.location.href).href));

function timedFetch(req, ms = NET_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

self.addEventListener('install', (e) => {
  // Precache each file INDIVIDUALLY. cache.addAll() is atomic — a single 404 rejects the whole
  // install, the worker never activates and the app has NO offline support at all, silently.
  // Per-file means one missing asset costs only that asset.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(
        SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))
      ))
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

// Refresh one cache entry in the background. Never blocks what we already served, and never
// rejects — offline this simply does nothing.
function revalidate(req) {
  if (!self.navigator.onLine) return;
  timedFetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') caches.open(CACHE).then((c) => c.put(req, res.clone()));
    })
    .catch(() => {});
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch cross-origin requests (e.g. the Adsterra ad script) — let them go
  // straight to the network so third-party code runs normally and is never cached.
  if (url.origin !== self.location.origin) return;
  // NEVER intercept the manifest or the app icons. The browser fetches these while it builds
  // the installed home-screen icon; if this worker mediates them it can return an empty/slow
  // response and the launcher falls back to the generic Android icon (seen on real devices).
  // They are HTTP-cached immutable for a year (.htaccess), so the browser serves them offline
  // from its own cache anyway. See memory `pwa-icon-root-cause` — do not "fix" this.
  // Server endpoints (usage counter ping.php, private stats.php) always go straight to the
  // network — never cached, never answered from cache.
  if (url.pathname.endsWith('.php')) return;
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/favicon.ico') || url.pathname.includes('/icons/')) return;

  // ---- Page navigations: always the cached shell, instantly. ----
  // The app is a hash-router SPA, so every route is index.html. Serving it from cache without
  // touching the network is what makes an offline cold start work (and a warm start fast).
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then((hit) => {
          if (hit) { revalidate(new Request('./index.html')); return hit; }
          // Nothing cached yet (very first visit) — we have no choice but the network.
          return timedFetch(req).catch(() => new Response(
            '<!doctype html><meta charset="utf-8"><title>Inkvoice</title>' +
            '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
            '<h1>Inkvoice</h1><p>Connect to the internet once to finish installing the app. ' +
            'After that it works fully offline.</p></body>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          ));
        })
    );
    return;
  }

  // ---- Shell assets (CSS/JS/fonts): cache-first + background refresh. ----
  if (SHELL_URLS.has(url.href.split('?')[0]) || SHELL_URLS.has(url.href)) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) { revalidate(req); return hit; }
        return timedFetch(req).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // ---- Everything else same-origin: network-first, cache fallback. ----
  e.respondWith(
    timedFetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => {
        if (hit) return hit;
        // NEVER return HTML for an asset request (icon, manifest, script): handing HTML back
        // for an icon or manifest corrupts it — that's what made the installed icon revert to
        // the default Android icon after an update.
        return new Response('', { status: 504, statusText: 'Offline' });
      }))
  );
});
