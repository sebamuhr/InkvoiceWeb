/* KILL SWITCH — do not delete.
   On 2026-10-11 the app bundle was accidentally extracted into public_html/ (the domain root)
   instead of public_html/app/. For a few minutes the root served the APP's index.html, which
   registered the app's cache-first service worker at scope "/". Any browser that got it would
   keep showing the cached app page instead of this marketing page.
   This file replaces that worker: browsers re-check /sw.js on their next visit, install this,
   and it unregisters itself and reloads the page from the network. It deliberately does NOT
   delete caches — the real app at /app/ shares this origin's Cache Storage. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});
