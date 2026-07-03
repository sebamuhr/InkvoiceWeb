# Inkvoice Web (PWA)

The iPhone / on-the-go companion to the **Inkvoice** Android app — the same app, on the
web. Create invoices, quotations and business cards, generate real PDFs, and share them.

Built as an installable **PWA** so iPhone (and Android/desktop) users can "Add to Home
Screen" and use it like a native app.

## Refreshingly few ads
Most free invoice apps bury you in ads. Inkvoice doesn't. You'll see **no ads at all until
you've created your first 5 invoices**, then just one — so you can open the app in front of
a client and send an invoice on the spot, with no interruptions.

## Works offline — connects only for ads
- You can **create invoices and quotes with no internet** and keep them on the device.
- The app reaches the internet **only to display ads** (like the Android app). Everything
  else — writing, editing, PDF generation, sharing — works fully offline.
- **Your data stays on your device.** Your invoices, clients and business profile live in
  your browser's local storage and are **never uploaded** to us or any cloud. Nothing is
  synced; no account or sign-in.

## Free & ad-supported
Inkvoice is completely free, kept free by a few unobtrusive ads. No subscription, no
sign-up. On the web the ads are served by a web ad network (the Android app uses Google
AdMob, which is a native-only SDK and can't run on the web); the ad may use an advertising
identifier — see the Privacy Policy for details. Your invoice data is never part of that.

## Highlights
- Mobile-first UI with an Android-style bottom tab bar; your **logo on the home screen**.
- Four PDF styles that match the Android app: **Professional, Elegant, Minimalist, Classic**.
- Real `.pdf` generation on-device (jsPDF) — share via the iOS share sheet (Mail / Files /
  AirDrop) or save a copy.
- Same invoice math as Android: line totals → subtotal → discount → tax → grand total → due.
- Invoices **and** quotations with separate sequential numbering, status, edit, duplicate,
  convert quote→invoice, search.
- **Digital business card** with a background-colour slider — shared as a PNG image.
- Business profile with logo, multiple labelled tax numbers, banking, currency, B2G toggle
  (B2G / XRechnung-ready structured fields for public-sector billing).
- Installs and runs offline after first load (service worker caches the app shell).

## No build step
Plain HTML/CSS/JS (ES modules) — nothing to compile, no Node, no bundler. Everything it
needs (the PDF library, icons, fonts) ships in the repo.

## Run locally
Any static server works, e.g.:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Open via `http://`/`https://`, not `file://`, so the service worker and modules load.)

## Deploy to GitHub Pages
1. Push these files to the `main` branch of the repo.
2. GitHub → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`.
3. The app goes live at `https://<user>.github.io/<repo>/` (HTTPS, required for PWA install).
4. On iPhone: open that URL in **Safari** → Share → **Add to Home Screen**.

The manifest and service worker use **relative paths**, so they work under the `/<repo>/`
subpath GitHub Pages serves from. (A custom domain — e.g. `app.elorate.net` via a `CNAME` —
is what ad networks require instead of a free `*.github.io` host.)

## Turning ads on
Ads are **off by default** and wired to be config-driven. To enable them, paste your ad
network's banner snippet into `js/ads.js` (`AD_CONFIG.adHtml`) and set `enabled: true`. The
slot renders one ad after every 5th document in the Invoices/Quotations lists, only when
online — offline the app shows nothing there and keeps working.

## Privacy
Your invoices, clients and business profile are stored **only on your device** in local
storage — never uploaded to us or synced to any cloud. No registration, no sign-in, no
analytics. The only data leaving your device is what the ad network uses to show ads (an
advertising identifier / approximate location from IP), and only while you're online.
Clearing browser data or switching devices starts fresh — the trade-off for staying private.

## Files
```
index.html              app shell + PWA meta
manifest.webmanifest    installable PWA manifest
sw.js                   service worker (offline cache)
css/styles.css          mobile-first styles
vendor/jspdf.umd.min.js bundled PDF engine (offline)
vendor/fonts.js         embedded Roboto / Noto Serif (pixel-tight PDFs)
icons/                  app icons
js/
  app.js                router + bottom tab bar + back chevron
  store.js              local data (profile, clients, invoices)
  util.js               money/date/invoice math
  pdf.js                the four PDF styles (port of the Android generator)
  ads.js                optional web ad slots (off by default)
  icons.js              inline SVG icons
  ui.js                 Material field helpers
  views/                dashboard, create, list, view, profile, cards
```
