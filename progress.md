# Inkvoice Web — Progress Log

> Running log so work can resume if the PC loses power / the terminal closes.
> Newest entry on top. Updated every prompt.

## Project
- **What:** iPhone/on-the-go **PWA** companion to the **Inkvoice** Android app (Play Store).
- **Reference (do NOT modify):** `/home/sebastian/Documents/APPS/Inkvoice` (Kotlin/Compose).
- **This app (only thing we modify):** `/home/sebastian/Documents/APPS/InkvoiceWeb`.
- **Constraints:** fully offline, on-device, no cloud, no tracking, free, ad-free, no build step (plain HTML/CSS/ES-modules).
- **Hosting:** GitHub Pages → https://github.com/sebamuhr/InkvoiceWeb → site at https://sebamuhr.github.io/InkvoiceWeb/
- **Run locally:** `cd InkvoiceWeb && python3 -m http.server 8000` → http://localhost:8000

## Current architecture
```
index.html · manifest.webmanifest · sw.js · css/styles.css
vendor/jspdf.umd.min.js · icons/*
js/{app,store,util,pdf,icons}.js
js/views/{dashboard,create,list,view,profile,cards}.js
```
Data in localStorage. 4 PDF styles (Professional/Elegant/Minimalist/Classic) via jsPDF.

## Log

### 2026-07-01
- Set up GitHub repo `sebamuhr/InkvoiceWeb` and pushed the clean rebuild.
- Added this `progress.md` (to be updated every prompt).
- Started **UI parity work**: comparing Android UI (reference screenshots in
  `Inkvoice/play-store-assets/phone_screenshots/`) vs the web app screen-by-screen,
  using Playwright (chromium) at an iPhone-sized viewport to capture the web side.
  Goal: make the web screens visually match the Android screens. (in progress)

### 2026-06-30
- Full Android-vs-web comparison.
- Clean rebuild of InkvoiceWeb: removed AI Studio cruft + dead React/js triple-codebase.
- Built no-build PWA: mobile-first UI + Android-style bottom tab bar; 4 matching PDF
  styles; Android invoice math; invoices+quotations, sequential numbering, status,
  edit, duplicate, convert quote→invoice, search; profile w/ logo + multi tax numbers
  + B2G toggle; Send PDF via iOS share sheet + Save. Verified PDF rendering in Node.

## Not done yet (future)
- Pixel-perfect UI parity iteration (active).
- XRechnung/ZUGFeRD XML (B2G EN16931) — Android has it, web doesn't.
- Multi-language (EN/DE/ES/FR).
