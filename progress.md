# Inkvoice Web — Progress & Handoff

> **Purpose of this file:** a single, self-contained brief so work can resume after the
> window/terminal is closed. Read this top-to-bottom to get back in context.
> **Convention:** keep this updated every prompt. "Current state" is the truth; the
> dated **Changelog** at the bottom is the history (newest on top).

---

## 1. What this is

- **Product:** **Inkvoice Web** — an iPhone / on-the-go **PWA** companion to the
  **Inkvoice** Android app (on the Play Store). Same app, different platform.
- **Goal:** the web app should look and behave **exactly like the Android app**, and its
  generated **PDFs must be pixel-tight** to the app's PDFs.
- **Non-negotiable constraints:**
  - Fully **offline / on-device**. No cloud, no accounts, no tracking/analytics. **Free.**
  - **No build step** — plain **HTML + CSS + ES modules**, served as static files.
  - Data lives in **localStorage** only.

## 2. Locations, hosting, how to run

| Thing | Value |
|---|---|
| **This app (only thing we modify)** | `/home/sebastian/Documents/APPS/InkvoiceWeb` |
| **Android reference — READ ONLY, never modify** | `/home/sebastian/Documents/APPS/Inkvoice` (Kotlin/Compose) |
| **Git** | remote `origin` → `https://github.com/sebamuhr/InkvoiceWeb.git`, branch **`main`** |
| **Hosting** | GitHub Pages → live at **https://sebamuhr.github.io/InkvoiceWeb/** |
| **Run locally** | `cd InkvoiceWeb && python3 -m http.server 8000` → http://localhost:8000 |
| **GitHub identity** | user `sebamuhr`, email `muhrmuhr@gmail.com` |

> ⚠️ **The Android folder is strictly read-only.** We only ever read it as the source of
> truth for layout/mechanics/PDF logic. Never edit anything under `.../APPS/Inkvoice`.

## 3. Deploy / workflow

- Every change is committed and **pushed to `main`**; GitHub Pages redeploys in ~1 min.
- **Service worker is network-first** (`sw.js`): it always tries the network first so new
  code loads immediately when online, and falls back to cache when offline. On any file
  change bump the cache constant `const CACHE = 'inkvoice-vNN'` so old caches are purged.
  **Current: `inkvoice-v10`.**
- If you add/remove a file, also update the `SHELL` array in `sw.js`.

---

## 4. Current architecture (file map)

```
index.html · manifest.webmanifest · sw.js · README.md · progress.md · .gitignore
css/styles.css
vendor/jspdf.umd.min.js        (jsPDF, UMD → window.jspdf)
vendor/fonts.js                (~120KB base64 of embedded device fonts; registerFonts(doc))
icons/{icon-192,icon-512,apple-touch-icon,maskable-512}.png
pdfsamples/{professional,elegant,minimalist,classic}.png   (style-picker thumbnails)
js/
  app.js         router + bottom tab bar + top-left back chevron + SW registration
  store.js       localStorage model (profile, clients, invoices), numbering
  util.js        formatting/date/money/compute helpers
  ui.js          mfield() / mselect() Material floating-label field builders
  icons.js       inline SVG icon set (Icon.*)
  pdf.js         faithful port of Android PdfGenerator.kt (the core deliverable)
  ads.js         optional web ad slots (off by default)
  views/
    dashboard.js  Home: business logo (if set) else "Inkvoice." wordmark
    create.js     Create invoice/quotation screen
    list.js       Invoices / Quotations lists (shared, arg = 'invoice'|'quotation')
    view.js       Full-screen clean PDF viewer + Share PDF
    profile.js    Business profile (logo, fields, tax numbers, settings)
    cards.js      Business card: colour slider + Share as PNG
```

### Data model (`store.js`)
- Keys: `inkvoice_profile`, `inkvoice_clients`, `inkvoice_invoices`, plus `inkvoice_card_color`
  (biz-card background colour, written by `cards.js`).
- `DEFAULT_PROFILE` is merged on read/write. Constants: `PDF_STYLES`
  (Professional/Elegant/Minimalist/Classic), `CURRENCIES` (USD/EUR/GBP/CHF/CAD/AUD/JPY),
  `LANGUAGES` (English/German/Spanish/French), `TAX_COLORS` (4 swatches).
- Functions: `getProfile/saveProfile`, `getClients/saveClient/findClientByName`,
  `getInvoices/getInvoice/saveInvoice/deleteInvoice`, `peekNextNumber(type)` /
  `consumeNumber(type,numberStr)` (sequential N°/Q° numbering), `uid`.

### Routing (`app.js`)
Routes: `/` Home · `/create` · `/invoices` (arg `invoice`) · `/quotations` (arg
`quotation`) · `/cards` · `/profile` · `/view/:id` (PDF viewer).
Bottom tabs (4): **Profile · Create · Invoices · Biz Card**.
**Top-left `‹` back chevron** (`.backhome`) shows on every screen **except** Home and the
PDF viewer, and navigates to Home (`nav('/')`). `#app.with-back` adds top padding so the
chevron clears content.

---

## 5. Current state of each feature (what works today)

- **Home (`dashboard.js`):** shows the **business logo** (round, `object-fit:cover`) when
  `profile.logoUri` is set; otherwise the **"Inkvoice."** monospace wordmark. "Set up your
  business" button appears when no business name yet.
- **PDF generation (`pdf.js`) — THE core deliverable, verified pixel-tight:**
  - Point-for-point port of Android `PdfGenerator.kt`. A4 in **POINTS (595×842)**, origin
    top-left, baseline text (matches Android Canvas). Uses embedded **Roboto** (SANS) /
    **Noto Serif** (SERIF) via `vendor/fonts.js` so metrics/layout match exactly.
  - **4 styles:** Professional (white, grey border, grey+bold rows), Elegant (serif, cream
    bg, corner brackets, right-aligned dates, alternating grey), Minimalist (green bg,
    lighter-green alt rows, N° top-right), Classic (white, blue accent lines, grey rows).
  - **Per-style pagination, max 2 pages, ≤20 items** (page 2 always ≥2 items): Prof/Min/
    Classic single-page ≤7; Elegant ≤6. Header repeats on page 2; background repaints.
  - Totals order: **Tax% → Subtotal → Discount(as %) → Total → Advance → Balance due**
    (Discount/Advance rows only when > 0). Dates `dd.MMM.yyyy`. Quantities print like
    Kotlin `Double.toString()` (whole numbers → `2.0`) via `qtyStr()`.
  - Verified against real-app PDFs (pulled from emulator app cache): headers pixel-perfect,
    body within a few px = anti-aliasing only. `pdffonts` confirmed font embedding per style.
- **PDF viewer (`view.js`):** full-screen, chrome-less (`iframe src=blob#toolbar=0&
  navpanes=0&scrollbar=0&view=FitH`), navy top bar with **back + Share PDF** (Web Share API
  file, download fallback). No PDF.js dependency.
- **Create (`create.js`):** summary card (N° + Subtotal/Total); Invoice/Quotation radios;
  Client Information + B2G checkbox; fields Client Name*/Email/Tax Number/Address/Creation*/
  Due*/Advance/Discount; **Add Item** + **PDF** buttons. Tapping **PDF** opens a style dialog
  (4 thumbnails from `pdfsamples/`) → Generate & View. Client name autocomplete via
  `datalist`. **Due date is NOT prefilled** (starts empty, required on save). **Advance &
  Discount** show a **greyed `0`** that clears on focus and restores on blur. Creation/Due
  date fields don't overlap on small screens.
- **Lists (`list.js`):** shared for Invoices/Quotations; total card, status filter, doc
  cards with paid toggle + delete + search. Optional ad slot after every 5th doc (see Ads).
- **Profile (`profile.js`):** logo circle (tap to pick; **logo now fills the whole circle**),
  Material fields (Business*/Owner*/Email*/Website/Phone (B2G)/Address), **Tax Numbers**
  (multi, up to 4, coloured; add button reads **"+ Add a Tax Number"** when none, **"+ Add
  Another Tax Number"** after), Default Tax Rate, Currency, App/Invoice Language, Banking
  Information, Notes, Advanced Sharing toggle, "Start from invoice N°", Default PDF Style,
  Backup Now (downloads JSON), Save Profile.
- **Business card (`cards.js`):** horizontal card (logo left / info right) that mirrors the
  Android `BusinessCardContent`. **Background-colour slider** using the same ~55-colour
  palette as Android; text colour auto-flips black/white by **luminance**; chosen colour
  **persists** (`inkvoice_card_color`). **Share Card** draws the card on a **1000×650
  canvas** and shares a **PNG** via Web Share API (download fallback) — replaces the old
  "take a screenshot" behaviour. Matches Android `captureBusinessCardAsBitmap`.
- **Ads (`ads.js`) — OFF by default:** AdMob (Android) can't run on web/PWA, so this is a
  config-driven *script-tag* slot. `AD_CONFIG = { enabled:false, adHtml:'' }`. When disabled/
  unconfigured/offline it renders **nothing** (no dev placeholder). Interleaved after every
  5th document in the lists (5,10,15…) so ad count grows with the list; `{SLOT}` token →
  per-placement index. To enable: paste a Monetag/Adsterra "Banner" snippet into `adHtml`,
  set `enabled:true`. **Blocker:** Monetag rejects free-hosted domains (github.io); needs a
  custom domain, or use Adsterra, or a "Pro unlock/tip" model instead (undecided — see Open).

---

## 6. Tooling & verification harness

- **Playwright (chromium)** at `~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`;
  `playwright-core` imported from
  `/home/sebastian/.npm/_npx/5c6d8c4f680fcd0a/node_modules/playwright-core/index.js`.
  Pattern: launch → 360×800 (or 400×860) viewport → seed `localStorage.inkvoice_profile` /
  invoices → `page.evaluate(r=>window.nav(r), route)` → screenshot. Scratchpad `*.mjs`
  scripts are throwaway (not committed).
- **Android emulator (ground truth):** app package `com.elorate.invoicefree.personal`
  (personalDebug). Boot via a scratchpad `start_emu.sh`; drive via adb (uiautomator dumps
  for bounds, tap at keyboard-up positions). Generated PDFs live in the app's internal cache
  — pull with `run-as com.elorate.invoicefree.personal cat cache/invoice_*.pdf`.
- **PDF diffing:** `pdftoppm` to rasterize at 100 DPI, PIL/ImageChops to diff, `pdffonts` to
  confirm embedded fonts.
- **Fonts:** device fonts came from `/system/fonts` on the emulator. Roboto is a **variable
  font** — instance it at `wght=400`/`700` (fonttools `varLib.instancer`), then `pyftsubset`
  to Latin + `€ ° £ ¥`, base64 into `vendor/fonts.js`.

---

## 7. Key gotchas / decisions (don't re-learn these)

- **PDFs must be in POINTS, not mm** — Android Canvas is 595×842 pt. mm broke all positioning.
- **Font drift = layout drift:** the "To:" column X is measured from "From" width, so wrong
  fonts shift geometry. Must embed the exact Roboto **variable** font (not the 2017 static).
- **Kotlin `Double.toString()`** prints `2.0` for whole quantities → `qtyStr()`.
- **Did NOT vendor PDF.js** (CDN download blocked as untrusted) — the `#toolbar=0` iframe
  shows the real file WYSIWYG, offline, no dependency.
- **Native `<input type=date>`** has a min intrinsic width that overflowed the 2-col grid →
  fixed with `min-width:0` on grid cells; also hid the double calendar glyph.
- **SW is network-first on purpose** — a cache-first worker caused "blank page after update".
- Occasionally the Bash safety classifier is briefly unavailable ("model temporarily
  unavailable") — just retry.

---

## 8. Open questions / not done yet

- **Ads/monetization decision pending:** Monetag needs a non-free domain (github.io is
  rejected). Options: (A) buy a cheap custom domain (~$10/yr) + CNAME to GitHub Pages, apply
  to Adsterra; (B) skip ads, add a one-time "Pro unlock"/tip; (C) keep iPhone PWA clean and
  monetize only the Android app. **Awaiting user's choice.**
- **XRechnung/ZUGFeRD XML** (B2G EN16931) — Android has it, web doesn't yet.
- **Multi-language** UI/invoice (EN/DE/ES/FR) — fields exist in profile, not wired to output.
- Ongoing: keep chasing exact UI/mechanics parity as the user spots differences.

---

## 9. Changelog (newest first)

### 2026-07-02/03 — Home logo + mechanics parity pass (biz card, dates, logo, nav, zero)
Compared against Android `MainActivity.kt` (`BusinessCardDialog` / `BusinessCardContent` /
`captureBusinessCardAsBitmap`) and matched several mechanics:
- **Home** now shows the business logo (round, filled) when set; else the "Inkvoice." wordmark.
- **Business card:** background-colour **slider** (Android palette) + **Share = PNG** drawn on
  a 1000×650 canvas via Web Share API; luminance-based text colour; colour persists. Replaced
  the old "take a screenshot" flow.
- **Profile logo** fills the whole circle (`object-fit:cover`, round clip on `#logo-inner`).
- **Tax button** label: "+ Add a Tax Number" (none) / "+ Add Another Tax Number" (after).
- **Create dates** don't overlap on small screens; **Due no longer prefilled**.
- **Advance/Discount** prefilled `0` is greyed and clears on focus.
- **iPhone back nav:** top-left `‹` chevron → Home (except Home / PDF viewer).
- Ads slot hidden until a real tag is configured. **SW → v9, then v10.**
- Commits: `b39d512`, `3d7d6f7`.

### 2026-07-01 (g) — All 4 PDF styles verified pixel-tight vs the live app + ad system
- Drove the real app for Elegant/Minimalist/Classic, pulled from cache, diffed at 100 DPI:
  ~1.0–1.3% differing pixels (anti-aliasing only). `pdffonts`: Elegant→Noto Serif,
  Min/Classic→Roboto. Added config-driven ad slots (`ads.js`), interleaved every 5th doc,
  off by default. **SW → v8.** Commit `2eb8a44`.

### 2026-07-01 (f) — Pixel-tight PDF: embedded device fonts + emulator ground-truth diff
- Embedded exact device fonts (`vendor/fonts.js`): Roboto variable instanced at 400/700 +
  Noto Serif, subset, base64, `registerFonts(doc)`. Header pixel-perfect vs real app; body
  within a few px. Fixed quantity `2` → `2.0`. **SW → v7.**

### 2026-07-01 (e) — Faithful PDF port from Android PdfGenerator.kt
- Rewrote `pdf.js` as a point-for-point port. Switched mm → **points (595×842)**. Per-style
  2-page pagination (page 2 ≥2 items). All From/To fields + Bank Info + Balance due. Totals
  order fixed; discount shown as %. **SW → v6.**

### 2026-07-01 (d) — Clean PDF viewer + multi-page PDFs + auto-capitalize
- Rebuilt `view.js` as a chrome-less full-screen PDF viewer (iframe `#toolbar=0`, back +
  Share only). Multi-page pagination. `autocapitalize="words"` on name fields. **SW → v5.**

### 2026-07-01 (c) — Emulator ground-truth + parity pass 2
- Booted the real app in an emulator; corrected nav to **4 tabs**, Home = wordmark, Create =
  summary card + PDF-opens-style-dialog, Profile fields, Biz Card layout, dark-navy buttons.

### 2026-07-01 (b) — UI parity re-skin to Material 3
- Re-skinned to Material 3 (lavender bg, notched floating-label fields, radios, cards);
  added `ui.js` (`mfield`); set up the Playwright screenshot harness.

### 2026-07-01 (a) — Repo + parity kickoff
- Set up GitHub repo `sebamuhr/InkvoiceWeb`, pushed the clean rebuild, added this log.

### 2026-06-30 — Clean rebuild
- Removed AI-Studio cruft + dead React/triple-codebase. Built the no-build PWA: mobile UI +
  bottom tab bar; 4 PDF styles; Android invoice math; invoices+quotations, sequential
  numbering, status, edit, duplicate, quote→invoice, search; profile w/ logo + multi tax
  numbers + B2G; Send PDF via iOS share sheet + Save.
