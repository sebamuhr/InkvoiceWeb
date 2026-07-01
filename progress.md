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

### 2026-07-01 (f) — Pixel-tight PDF: embedded device fonts + emulator ground-truth diff
- **Root cause of any drift = fonts.** Android draws with Roboto (SANS_SERIF) + Noto Serif
  (SERIF); jsPDF defaulted to Helvetica/Times, which also shifts *layout* (the dynamic "To:"
  column X is computed from measured "From" width).
- **Embedded the EXACT device fonts** into jsPDF (`vendor/fonts.js`, ~120 KB):
  pulled `/system/fonts/Roboto-Regular.ttf` (variable font) from the emulator, instanced it at
  `wght=400` and `wght=700`, pulled Noto Serif Regular/Bold, subset all four to Latin + € ° £ ¥
  with fonttools, base64 + `registerFonts(doc)`. `pdf.js` now uses `Roboto`/`NotoSerif`.
- **Ground-truth diff vs the real app:** booted the emulator, drove the actual Inkvoice app to
  create an invoice (My Company / Globex GmbH / Consulting ×2 @ $150), generated the Professional
  PDF, pulled it from the app cache (`run-as`). `pdffonts` confirmed it embeds Roboto — validating
  the font choice. Rasterized both at 100 DPI and overlaid:
  - **"N° 001" header and the Description/Quantity/Subtotal table headers are pixel-perfect (0 px).**
  - Body text within 1–4 px (sub-millimetre); remaining difference is text-edge anti-aliasing.
- **Fixed quantity formatting:** Android's Kotlin `Double.toString()` prints whole numbers as
  "2.0"; web printed "2". Added `qtyStr()` (integer → trailing ".0") across all four styles.
- Verified side-by-side: Android vs web are visually indistinguishable. SW bumped to `inkvoice-v7`
  (caches `vendor/fonts.js`). App loads with zero console errors.
### 2026-07-01 (g) — All 4 styles verified pixel-tight vs the live app + ad system
- Drove the real app to generate **Elegant, Minimalist, Classic** for the same invoice, pulled each
  from cache (`run-as`), rasterized at 100 DPI and diffed vs web. All ~1.0–1.3% differing pixels
  (anti-aliasing only) — visually indistinguishable. Per-style font embedding confirmed by
  `pdffonts`: Elegant → Noto Serif, Minimalist/Classic → Roboto. **All four styles now match.**
- **Ads:** AdMob (Android) can't run on web/PWA. Added config-driven web ad slots via `js/ads.js`,
  **interleaved after every 5th document** (5,10,15…) in the Invoices/Quotations lists — ad count
  grows with the list, none if <5. Off by default (`enabled:false`, labelled placeholder); to turn
  on, paste a Monetag/Adsterra "Banner" snippet into `adHtml` + `enabled:true`. `{SLOT}` token →
  per-placement index for unique ids. Ads are online-only; invoice data never leaves the device.
  SW → `inkvoice-v8`. Verified interleave (12 invoices → ads after #5 and #10) with no console errors.

### 2026-07-01 (e) — Faithful PDF port from Android PdfGenerator.kt
- Read the Android **`PdfGenerator.kt`** (4279 lines, read-only) and rewrote `js/pdf.js`
  as a point-for-point port so the web PDFs match the app exactly.
- **Coordinate system fixed:** switched from mm to **POINTS (A4 = 595×842)**, origin
  top-left, baseline text — same as Android Canvas. This fixes all mispositioning.
- **Per-style pagination (max 2 pages, ≤20 items), matching Android:**
  - Professional / Minimalist / Classic: single page up to **7** items; 8–11 → page1 = total−2,
    page2 = 2; 12–20 → page1 = 10, page2 = rest.
  - Elegant: single page up to **6**; 7–11 → total−2 / 2; 12–20 → 10 / rest.
  - So page 2 **always carries ≥2 items**. Table header repeats on page 2; style background
    repaints. Verified boundaries (Prof 7→1pg, 8→2pg; Elegant 6→1pg, 7→2pg) via pdftoppm.
- **All missing info now present** in From (business, owner, email, phone, website, tax numbers,
  address) and To (client, buyer ref, department, email, VAT, address — Classic omits ref/dept/VAT
  like Android). Bank Information block + Balance due added.
- **Totals order matches Android exactly:** Tax% → Subtotal → Discount (shown as **%**, not amount)
  → Total → Advance → Balance due. Discount/Advance rows only when > 0.
- **Per-style fidelity:** Professional (white, grey border, every row grey+bold), Elegant (serif,
  cream bg, corner brackets, right-aligned dates, alternating grey), Minimalist (green bg, lighter-
  green alternating rows, number top-right), Classic (white, blue accent lines, light-grey rows).
  Exact colors/margins/font sizes/x-positions ported from the Kotlin.
- Dates `dd.MMM.yyyy`; currency symbols USD/EUR/GBP/JPY/CAD/AUD; logo = contain-fit centered,
  nothing drawn when absent (matches Android — no "Logo" placeholder in generated PDFs).
- SW bumped to `inkvoice-v6`. All 4 styles rendered + visually verified against the Kotlin spec.

### 2026-07-01 (d) — Clean PDF viewer + multi-page PDFs + auto-capitalize
- **Invoice view screen rebuilt as a CLEAN PDF viewer** (matches Android `PdfViewerActivity`):
  removed the browser PDF toolbar/scrollbars AND the Status/Pending/Edit/Duplicate/Delete card.
  Now: fixed full-screen viewer, navy top bar with only **← back + Share PDF**, and the real
  generated PDF shown chrome-less via `iframe src=blob#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
  (browser gives native pinch-zoom + pan). New CSS `.pdf-screen/.pdf-topbar/.pdf-stage/.pdf-doc`.
  Files: `js/views/view.js` (rewritten), `css/styles.css`. SW bumped to `inkvoice-v5`.
  - Did NOT vendor PDF.js — its CDN download was blocked as untrusted; the `#toolbar=0` iframe
    approach is WYSIWYG (shows the actual file), needs no new dependency, works offline.
- **Multi-page PDFs** (`js/pdf.js` rewritten): rows now paginate across A4 pages, the table
  header repeats on each page, and totals + Bank Info/Notes flow with page-break guards. Each
  new page repaints the per-style background (Elegant frame, Minimalist green). Verified with
  22-item invoices → 2 pages, all four styles, via `pdftoppm` rasterization (no overlap, correct
  totals: Subtotal→Discount→Tax→Total→Advance→Due). Single-page invoices still anchor totals
  near the bottom as before.
- **Auto-capitalize** (`autocapitalize="words"`) on Client Name (create) + Business/Owner Name
  (profile) → iOS keyboard title-cases names ("typo capitals").
- Verified end-to-end in Playwright (seeded invoice → `/view/id`) with zero console errors.
- Note: client-name memory/autocomplete already worked (datalist `#clients` + `findClientByName`
  + `saveClient` on generate); PDF button already gated (disabled until an item exists).

### 2026-07-01 (c) — Emulator ground-truth + parity pass 2
- Booted the REAL Inkvoice app in an Android emulator (built `personalDebug` APK read-only,
  copied to `scratchpad/inkvoice.apk`; fresh AVD `inkvoice_test`; APK + emulator via adb).
- Captured real screens (scratchpad `r-*.png`) and corrected big differences:
  - Bottom nav is **4 tabs: Profile · Create · Invoices · Biz Card** (not 5, no big FAB).
  - Home = bold **"Inkvoice."** wordmark (monospace), not a LOGO circle.
  - Create: summary card `N° + Subtotal/Total` (no PDF circle); "Client Information" + B2G
    checkbox row; fields Client Name*/Email/Tax Number/Address/Creation*/Due*/Advance/Discount;
    bottom **Add Item + PDF** buttons. **PDF options appear only after tapping PDF** — a dialog
    listing the 4 styles with the real preview thumbnails (copied to `pdfsamples/`), then
    "Generate & View PDF". Removed inline style picker + status/tax/notes from create.
  - Profile: empty logo circle + pencil; Material floating-label fields; "(B2G only *)" red
    hint; added App/Invoice Language, Advanced Sharing, Notes, Backup Now, Privacy/Contact.
  - Biz Card screen: horizontal card (logo left, info right), matches Android canvas.
  - Colors → dark-navy primary buttons; lighter lavender bg.
- Playwright web screenshots confirm strong match on Home/Create/Profile/Biz Card/nav.
- Emulator: use `scratchpad/start_emu.sh` to boot; app pkg `com.elorate.invoicefree.personal`.

### 2026-07-01 (b) — UI parity re-skin to Material 3
- Studied real Android screens (`play-store-assets/phone_screenshots/`): home = big LOGO
  circle; **3-item bottom nav = Profile · Create⊕ · Invoices**; lavender bg; grey rounded
  cards; **Material-3 outlined fields** (notched floating labels); Invoice/Quotation radios;
  Create has a grey summary card (N° + blue PDF circle + totals); List has a total card +
  status filter + doc cards with a red/green paid toggle + trash.
- Re-skinned the web to match: rewrote `css/styles.css`, added `js/ui.js` (mfield helper),
  changed nav to 3 items, home→LOGO screen, rebuilt create/list/profile/dashboard views.
- Set up Playwright (chromium at `~/.cache/ms-playwright/chromium-1223`) screenshot harness:
  `scratchpad/shot.mjs` (seeds localStorage, caps home/create/list/profile/cards/view at
  400x860). Compared vs Android — **strong match** on all screens. Dates in list now ISO
  (yyyy-mm-dd) to match Android.
- To re-run screenshots: `cd InkvoiceWeb && SP=<scratchpad> node <scratchpad>/shot.mjs web`
  (import path to playwright-core is hard-coded in shot.mjs; server must run on :8000).

### 2026-07-02 — mechanics parity pass (biz card, dates, logo, nav)
Compared against Android source (`MainActivity.kt` BusinessCardDialog / BusinessCardContent /
captureBusinessCardAsBitmap) and reworked several mechanics to match:
- **Business card**: replaced "take a screenshot" with the real Android flow — a
  **background-color slider** (same ~55-colour palette as Android) + **Share Card** that
  draws the card on a 1000×650 canvas and shares a **PNG** via the Web Share API (download
  fallback). Text colour auto-flips black/white by luminance; chosen colour persists in
  localStorage. Verified generated PNG + light/dark preview via Playwright.
- **Profile logo**: now fills the whole circle (`object-fit:cover`, clipped round on
  `#logo-inner`) instead of floating small with padding.
- **Tax-number button**: label is now "+ Add a Tax Number" when none exist, "+ Add Another
  Tax Number" afterwards (updates live on add/remove).
- **Create dates**: Creation/Due no longer overlap on small screens (`min-width:0` on grid
  cells + hid the double native calendar glyph). **Due date is no longer prefilled** (starts
  empty, still required on save).
- **Advance/Discount**: the prefilled `0` is now greyed and clears on focus, restoring on blur.
- **iPhone back nav**: added a small top-left `‹` chevron on every screen (except Home and
  the PDF viewer) that returns to Home.
- Ads slot renders nothing until a real tag is configured (no dev placeholder for users).
- SW cache bumped to v9.

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
