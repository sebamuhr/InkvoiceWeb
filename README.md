# Inkvoice Web (PWA)

The iPhone / on-the-go companion to the **Inkvoice** Android app. Create invoices,
quotations and business cards, generate real PDFs, and share them — **100% offline,
on-device, no account, no cloud, no tracking.**

Built as an installable **PWA** so iPhone (and Android/desktop) users can "Add to
Home Screen" and use it like a native app.

## Highlights
- Mobile-first UI with an Android-style bottom tab bar.
- Four PDF styles that match the Android app: **Professional, Elegant, Minimalist, Classic**.
- Real `.pdf` generation on-device (jsPDF) — share via the iOS share sheet (Mail / Files / AirDrop) or save a copy.
- Same invoice math as Android: line totals → subtotal → discount → tax → grand total → due.
- Invoices **and** quotations with separate sequential numbering, status, edit, duplicate, convert quote→invoice, search.
- Business profile with logo, multiple labelled tax numbers, banking, footer, currency, B2G toggle.
- Works fully offline after first load (service worker caches the app shell).

## No build step
Plain HTML/CSS/JS (ES modules) — nothing to compile, no Node, no bundler.
Everything it needs (the PDF library, icons, fonts) ships in the repo.

## Run locally
Any static server works, e.g.:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Open via `http://`/`https://`, not `file://`, so the service worker and modules load.)

## Deploy to GitHub Pages
1. Create a repo (e.g. `inkvoice-web`) and push these files to the `main` branch.
2. GitHub → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`.
3. Your app goes live at `https://<user>.github.io/<repo>/` (HTTPS, required for PWA install).
4. On iPhone: open that URL in **Safari** → Share → **Add to Home Screen**.

The manifest and service worker use **relative paths**, so they work correctly under
the `/<repo>/` subpath that GitHub Pages serves from.

## Privacy
All data lives in your browser's local storage on your device. Nothing is uploaded.
Clearing browser data or switching devices starts fresh — the trade-off for staying
fully private and offline.

## Files
```
index.html              app shell + PWA meta
manifest.webmanifest    installable PWA manifest
sw.js                   service worker (offline cache)
css/styles.css          mobile-first styles
vendor/jspdf.umd.min.js bundled PDF engine (offline)
icons/                  app icons
js/
  app.js                router + bottom tab bar
  store.js              local data (profile, clients, invoices)
  util.js               money/date/invoice math
  pdf.js                the four PDF styles
  icons.js              inline SVG icons
  views/                dashboard, create, list, view, profile, cards
```
