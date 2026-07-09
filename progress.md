# Inkvoice Web — Progress & Handoff

> **Purpose of this file:** a single, self-contained brief so work can resume after the
> window/terminal is closed. Read this top-to-bottom to get back in context.
> **Convention:** keep this updated every prompt. "Current state" is the truth; the
> dated **Changelog** at the bottom is the history (newest on top).

---

## 🔴 ACTIVE ISSUE — PWA home-screen icon on Android (READ THIS FIRST)

**As of 2026-07-09, v47 is BUILT and awaiting upload**
(`_upload/inkvoice-app-COMPLETE-v47.zip`). ⭐ **v47 ENDS the recurring "icon broke
again" problem PERMANENTLY.** Root cause finally pinned: the server cached icons/favicon
for days (the repo `.htaccess` only revalidated the *manifest*, not the icons), so after
any redeploy the browser kept serving a stale icon under the SAME filename. v47 does BOTH:
(a) republishes the identical icon bytes under fresh filenames (`icon-192-v5`,
`icon-512-v5`, `maskable-512-v6`) to fix it NOW, AND (b) adds a `Cache-Control:
max-age=0, must-revalidate` rule for `*.png`/`*.ico` to `.htaccess` so a changed icon is
picked up immediately from now on — **no more renaming icons every release.** ⚠️ The
v47 bundle now INCLUDES `.htaccess` (it didn't before) — the user must extract it too.
Below is the v46 pairing-UI work:
**(previous) v46 tidied the pairing UI per user:**
(1) REMOVED the "📱 This device IS my phone — make it the host" rescue link (the
UA-based role detection since v44 makes it unnecessary and the user found it confusing);
(2) the VPN advice no longer sits up-front — it now appears ONLY inside the timeout/
failure message ("Timed out — Check your VPN, disconnect it or add Inkvoice as a trusted
app…"), both roles; (3) the laptop shows a "Connected to [phone name]" toast on connect.
**KNOWN GOOD BEHAVIOUR (confirmed by the user):** a VPN on either device blocks the LAN
peer-to-peer link even on the same Wi-Fi — normal WebRTC, NOT a bug (pure P2P, no TURN
relay). Older context below:
**(previous) v45/v44/v43 were BUILT and awaiting upload**
(`_upload/inkvoice-app-COMPLETE-v43.zip`, 48 files). v43 = v42 + THREE surgical fixes
for the user's real-device pairing breakage (screenshots showed their PHONE booting as
a GUEST — the code/Accept flow can't work then): (1) `app.js` role gate: mobile-UA
device (Android/iPhone) with data or installed is ALWAYS the phone; a no-touch
non-mobile device can NEVER be the phone (stray `inkvoice_force_phone` on a laptop is
auto-cleared → heals to guest screen); (2) wake lock held while the phone's pairing/
reconnect modal is open (screen sleeping mid-type killed pairings); (3) laptop's
Connect no longer hangs "Connecting…" forever — on a dead attempt the button returns
with a clear message. Verified: 4 role tests + pairing/reconnect regressions + boot,
all green. Older context below:
**(previous) v42 was BUILT and awaiting upload**
(`_upload/inkvoice-app-COMPLETE-v42.zip`, 48 files). **v42 = v39 code (byte-verified) +
the SAME v39 icons under fresh filenames** (`icon-192-v4` / `icon-512-v4` /
`maskable-512-v5`, byte-identical copies) because the user's device icon cache got
poisoned AGAIN during the v40/v41 redeploy churn (folder briefly empty → cached
failure → wrong icon; same illness as the v37 robot saga, same cure).
Context: the v40 pairing rework was ROLLED BACK — user reported it "went wrong" on real
devices ("stuck" screen; exact symptom still unknown) and v39 "was working amazingly
well". v41 (= v39 + version bump) was rejected by the user as "not the same"; then
v39-EXACT (git archive of 983bdef, hash-verified) surfaced the icon-cache problem.
⚠️ Do NOT re-apply the v40 approach wholesale; ONE small change at a time, verified by
the user on real hardware. ⚠️ User is (rightly) upset after many redeploys — keep
changes minimal, provable (hashes), and never tell them to EMPTY the app folder first
(the empty-folder window is what re-poisons device icon caches); extract-over-top only.
**v39 = icons rebuilt from the REAL Android app resources** (user compared v38 with the
native launcher icon: "pretty much the same but not… the legend" — the swirl artwork
differed slightly). Icons are now `mipmap-xxxhdpi/ic_launcher_{background,foreground}`
composited + center-72dp-of-108dp crop (exactly what a launcher renders), scaled to
512/192: `icons/icon-{192,512}-v3.png`, `icons/maskable-512-v4.png`, favicon.ico
regenerated. Teal + bg colours verified identical (#069a8b / black), disc = 76% (in the
80% maskable safe zone). REMAINING possible diff the web can't fix: Firefox pin-shortcuts
carry a small Firefox BADGE on the icon corner — that's added by Firefox/Android, not
removable from our side.

### Symptoms (from the user, on their real phone)
- **iPhone / Safari:** ✅ icon is correct. (Uses `icons/apple-touch-icon.png`.)
- **Android Chrome:** installs the teal icon, BUT the launcher icon "has some blue
  edges that look horrible." → This is the **maskable icon** being badly designed.
- **Android Firefox ("Mozilla", their daily driver):** ❌ shows the **generic green
  Android robot** icon. The wrong icon appears **in Firefox's own Add-to-Home-screen
  preview dialog, before tapping Add** — so Firefox never gets the real icon.
  Persists **even after** clearing all site data AND after v35.

### TWO SEPARATE BUGS — both still open

**BUG A — maskable icon is ugly (Chrome "blue edges" + splash logo).** ✅ FIXED in v36 (awaiting upload).
- Was: `icons/maskable-512.png` = blue square border + black square + teal circle +
  swirl → Android masking produced blue/black edges on the launcher icon AND on the
  splash-screen logo (Android builds the splash from the same maskable icon).
- **FIX SHIPPED IN BUNDLE (2026-07-06):** regenerated `maskable-512.png` as **full-bleed
  teal** (#069a8b to every edge) with the black swirl extracted from `icon-512.png` and
  centered at the same visual proportion (~58% ≈ 298px, well inside the ~80%/409px safe
  zone). Method: numpy alpha-extraction of the swirl (anti-aliased) + composite on flat
  teal. Verified by eye under circle AND squircle mask previews — clean, no edges.
  `any` icons (icon-192/512) untouched — the user likes them.
- NOTE: already-installed PWAs cache their icon — user must remove from home screen and
  re-add after uploading to see the fix.
- **DESIGN CORRECTION (v38):** the user wants the icon **"surrounded by a black edge"**
  (like the real Inkvoice icon), NOT full-bleed teal. New `icons/maskable-512-v3.png` =
  `icon-512.png` flattened opaque onto black (teal disc is 397/512 ≈ 77.5% — inside the
  80% safe zone), so masking yields teal disc + black ring. New filename again because
  browsers cache icons BY URL (the v37 lesson). Verified with circle+squircle previews.

**BUG B — Firefox Android robot icon.** ROOT CAUSE FOUND (2026-07-06): **Firefox's own
local icon cache is poisoned** — v37 busts it with NEW icon URLs. Awaiting confirmation.
- **Proof from the user:** v36 (better link tags + favicon.ico) did NOT help, BUT
  **reinstalling Firefox fixed the icon** (and Chrome was always eventually fine). So the
  server/manifest are fine; Firefox cached a broken/generic icon for the OLD icon URLs
  (poisoned back when the pre-v35 service worker corrupted icon fetches) and never
  refetches — clearing site data does NOT clear Firefox's icon DB; only reinstall did.
  The user will NOT reinstall Firefox again — hence the URL bust.
- **FIX in v37:** icons copied to NEW names `icons/icon-192-v2.png` / `icon-512-v2.png` /
  `maskable-512-v2.png`; `manifest.json` + `index.html` link tags point at the `-v2`
  names (`favicon.ico?v=37` in the link tag; the bare-URL auto-request can't be renamed);
  `sw.js` SHELL updated. Firefox has never seen these URLs → cannot serve them from its
  poisoned cache → must fetch fresh. OLD icon files kept on the server so nothing 404s
  for already-installed PWAs. `apple-touch-icon.png` untouched (iPhone works).
- **If the robot STILL shows after v37** (would mean their Firefox keys its icon cache by
  domain, not URL): Firefox Settings → Delete browsing data → tick ONLY "Cached images
  and files" → delete, then re-add to home screen. Less drastic than reinstalling.
- **Could not reproduce on the emulator.** Emulator Firefox **152** shows the correct
  teal icon in its install dialog (see below). So this is **device/Firefox-version
  specific** to the user's phone.
- Note a dialog difference: on the emulator, Firefox showed its OWN dialog titled
  "Firefox" with the teal icon. The user's screenshot showed the **Android system
  pin-shortcut dialog** titled "Add to Home screen" ("Touch and hold the widget…") with
  the generic icon. Different code path → suspect the user's Firefox is creating a plain
  pinned shortcut (not a PWA install) and passing a generic icon, OR their Firefox
  version chokes on the current maskable/icon. **Next step: find out the user's exact
  Firefox version, and whether their menu shows "Add app to Home screen" vs only
  "Add to shortcuts".** Bug A's clean maskable may or may not also fix this.

### What is CONFIRMED CORRECT (do not re-investigate)
- **Server:** `https://app.inkvoiceapp.com` is LiteSpeed/Hostinger, **no CDN/edge cache**
  (checked headers — your phone gets the same bytes as curl). `manifest.json` served as
  `application/manifest+json`; all icons are valid non-interlaced 8-bit PNGs with correct
  dimensions matching the manifest. `manifest.json` has a stable `id`.
- **Emulator install test (v34/v35):** first install, remove + re-install, and even
  OFFLINE re-install ALL show the correct teal icon on BOTH Firefox 152 and Chrome.
  Screenshots exist (see scratchpad). So clean code does NOT drop the icon.
- **Incognito/private tab installs always give a generic icon** — that's normal browser
  behaviour (install disabled in private mode: Chrome reported `in-incognito`). Not a bug.

### Fixes ALREADY SHIPPED for this (don't redo)
- v34: manifest moved `manifest.webmanifest` → **`manifest.json`** (server serves it
  natively; no dependency on hidden `.htaccess`). Added manifest `id`. SW no longer
  returns `index.html`/HTML for failed asset requests.
- v35: **service worker no longer intercepts `/manifest.json` or `/icons/…`** — they go
  straight to the network (verified: `fromServiceWorker:false` for icons, `true` for
  js/css). This was aimed at Bug B (worker mediating the icon fetch) but **did NOT fix
  the user's Firefox.** So Bug B is NOT the service worker.
- `.htaccess` (in `public_html/app/`) forces manifest MIME + `Cache-Control: max-age=0,
  must-revalidate` on the manifest. Icons are served `max-age=604800` (7 days).

### Emulator is SET UP for testing (use it)
- SDK: `~/Android/Sdk`. adb: `~/Android/Sdk/platform-tools/adb`.
- AVDs: **`inkvoice_test`** (Android 15 / API 35, x86_64, has Play Store + Chrome).
  Boot: `emulator -avd inkvoice_test -no-audio -no-window -gpu swiftshader_indirect &`
- **Firefox 152 is installed** on it (`org.mozilla.firefox`, x86_64 APK from
  ftp.mozilla.org/pub/fenix/releases/152.0.4/…). Drive it via `adb shell input tap` +
  `adb exec-out screencap -p`. An Inkvoice PWA is/was installed on its home screen
  showing the CORRECT teal icon.
- To test an install: open the site in Chrome/Firefox → menu → (Chrome) "Install app" /
  (Firefox) menu → More → "Add app to Home screen" → the dialog PREVIEWS the icon.
- The emulator may still be running from the last session; if not, reboot it.

### Deploy reminder for THIS repo
- App is uploaded **manually** to Hostinger `public_html/app/`. Build a COMPLETE bundle
  (never partial — see memory `deploy-complete-bundle.md`). Last bundle:
  `_upload/inkvoice-app-COMPLETE-v42.zip` (48 files, boot-tested: 0 errors, all icons +
  favicon.ico + manifest 200). After a fix, bump `sw.js` `CACHE` + `js/sync.js`
  `APP_VERSION` together, rebuild the full zip, tell the user to upload + extract into
  `public_html/app/`. On-screen version marker confirms deploy. **favicon.ico is now part
  of the bundle** (root-level, next to index.html).

### Suggested next steps for a fresh session
1. **v47 uploaded?** User extracts `inkvoice-app-COMPLETE-v47.zip` OVER `public_html/app/`
   (do NOT empty the folder first!) — **including the `.htaccess`** (it's in the zip now
   and carries the icon-revalidation fix). Confirm on-screen "v47", then remove + re-add
   the home-screen icon once. After v47's `.htaccess` is live, icons should NOT break on
   future redeploys (they revalidate); if one ever does, the cure is still fresh filenames
   + identical bytes, but it shouldn't be needed anymore.
2. **The user's REQUIRED sync flow (2026-07-09, do NOT deviate):** phone browser →
   INSTALL page first (download to run offline); once installed the phone is the boss;
   Profile → "Connect a device" → CODE on phone → paste on laptop browser → ACCEPT button
   ON THE PHONE → connected → DIMMED screen ON THE PHONE while the laptop is active; any
   connection loss → close/disconnect immediately (no half-made invoices). All verified in
   scratchpad tests (roletest / pairtest_v39 / disconnecttest).
3. **VPN caveat (confirmed real):** a VPN on either device breaks LAN pairing; the app now
   shows "disconnect your VPN" on both pairing screens. If asked to make it work THROUGH a
   VPN, that needs a TURN relay = data through a 3rd party = breaks the no-cloud promise;
   only do it if the user explicitly accepts that trade-off.
2. **Pairing friction is still an OPEN wish** (first pairing can take a few code tries)
   but the v40 batch-fix made things WORSE on real devices and was rolled back. Before
   any retry: get from the user WHAT went wrong with v40 exactly (no connect at all?
   modal stuck? battery? laptop side or phone side?), then change one small thing at a
   time. Candidate low-risk first step: wake lock while the code modal is open, nothing
   else. Test scripts for pairing live in the scratchpad pattern `pairtest*.mjs` +
   `mock_signal.py` (throwaway, rewrite as needed).
3. **KEY LESSON for any future icon change:** browsers (Firefox especially) cache icons
   BY URL and never refetch — every icon content change MUST ship under a NEW filename
   (bump -vN) in manifest.json + index.html + sw.js SHELL, keeping the old files on the
   server. (Do NOT suggest reinstalling Firefox — user refused.)

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
| **Hosting — app (primary)** | **Hostinger** → **https://app.inkvoiceapp.com** (repo-root files in `public_html/app/`). Manual upload. |
| **Hosting — marketing site** | **Hostinger** → **https://inkvoiceapp.com** (`site/` contents in `public_html/`). Manual upload. |
| **Hosting — app (legacy)** | GitHub Pages → **https://app.elorate.net** (kept for existing installs; fed by `git push`) |
| **Run locally** | `cd InkvoiceWeb && python3 -m http.server 8000` → http://localhost:8000 (app) · `/site/` (marketing) |
| **GitHub identity** | user `sebamuhr`, email `muhrmuhr@gmail.com` |

> ⚠️ **The Android folder is strictly read-only.** We only ever read it as the source of
> truth for layout/mechanics/PDF logic. Never edit anything under `.../APPS/Inkvoice`.

## 3. Deploy / workflow

- Every change is committed and **pushed to `main`**; GitHub Pages redeploys in ~1 min.
- **Service worker is network-first** (`sw.js`): it always tries the network first so new
  code loads immediately when online, and falls back to cache when offline. On any file
  change bump the cache constant `const CACHE = 'inkvoice-vNN'` so old caches are purged.
  **Current: `inkvoice-v35`.** There is ALSO `export const APP_VERSION` in `js/sync.js` — keep it
  in sync with the SW number; it's shown on-screen (connect/reconnect/hub/Profile diag link) so a
  deploy can be verified at a glance ("Inkvoice vNN"). If the on-screen version is stale, it's a
  deploy/SW-cache problem, not a code problem.
- If you add/remove a file, also update the `SHELL` array in `sw.js`.

---

## 4. Current architecture (file map)

```
index.html · manifest.webmanifest · sw.js · README.md · progress.md · .gitignore
css/styles.css
site/            marketing landing page for inkvoiceapp.com (self-contained, own CSS +
                 assets/screens/ app screenshots + assets/*.png PDF style renders)
vendor/jspdf.umd.min.js        (jsPDF, UMD → window.jspdf)
vendor/fonts.js                (~120KB base64 of embedded device fonts; registerFonts(doc))
icons/{icon-192,icon-512,apple-touch-icon,maskable-512}.png
pdfsamples/{professional,elegant,minimalist,classic}.png   (style-picker thumbnails)
js/
  app.js         router + bottom tab bar + top-left back chevron + SW registration +
                 phone-only gate (desktop/tablet get a "phone app" notice; ?app forces app)
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
  Due/Advance/Discount; **Add Item** + **PDF** buttons. Tapping **PDF** opens a style dialog
  (4 thumbnails from `pdfsamples/`) → Generate & View. Client name autocomplete via
  `datalist`. **Due date is NOT prefilled and is required ONLY when B2G is enabled** (the `*`
  on Due / Tax Number / Address appears/disappears live with the B2G toggle — matches Android
  v25). **Advance & Discount** show a **greyed `0`** that clears on focus and restores on blur.
  Creation/Due date fields don't overlap on small screens.
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

- **Ads DECISION (2026-07-03):** keep the SAME model as the Android app — app is offline for
  all invoicing, connects to the internet **only to show ads**; all client/invoice data stays
  on device. AdMob (Android) can't run on web, so the web uses a **web ad network** instead.
  The user already owns **`elorate.net`** (Netlify), so the free-host blocker is gone: point a
  subdomain (e.g. `app.elorate.net`) at GitHub Pages via `CNAME`. **Adsterra** is the intended
  network (approves utility sites; AdSense often won't). **TODO to go live:** (1) set the
  custom domain, (2) user signs up at Adsterra + gives the banner snippet, (3) paste into
  `js/ads.js` `AD_CONFIG.adHtml` + `enabled:true`. README updated to reflect this model.
  (Ad revenue on an offline PWA will be small; that's accepted.)
- **XRechnung/ZUGFeRD XML** (B2G EN16931) — Android has it, web doesn't yet.
- **Multi-language** UI/invoice (EN/DE/ES/FR) — fields exist in profile, not wired to output.
- Ongoing: keep chasing exact UI/mechanics parity as the user spots differences.

---

## 9. Changelog (newest first)

### 2026-07-09 — v47: PERMANENT icon-cache fix (.htaccess revalidates icons) + fresh icon filenames
The home-screen icon "broke again" after the v46 deploy. Verified our side was 100%
correct (all icon files valid teal PNGs, and manifest.json/index.html/sw.js references all
consistent and present in the bundle). So it was the browser/PWA cache once more — but the
REAL root cause was finally identified: the repo `.htaccess` only set `max-age=0,
must-revalidate` on the *manifest*, NOT the icons, so icons took the server default cache
(days). Same filename + long cache = a stale icon sticks after every redeploy; only a new
filename escaped it (which is why it kept recurring — v42→v46 reused v4/v5 names).
- Fix (both belt AND suspenders): (a) copied the identical icon bytes to `icon-192-v5`,
  `icon-512-v5`, `maskable-512-v6` and pointed manifest.json + index.html + sw.js SHELL at
  them (immediate fix, escapes the current stale cache); (b) added a `<FilesMatch
  "\.(png|ico)$">` `Cache-Control: max-age=0, must-revalidate` block to `.htaccess` so
  from now on a changed icon is revalidated (cheap 304) and picked up immediately — ends
  the recurrence. favicon.ico?v=47. The deploy BUNDLE now INCLUDES `.htaccess` (previously
  excluded) — user must extract it.
- Boot-tested: all new icon URLs 200, app boots clean. **SW → v47 / APP_VERSION v47.**
  Bundle: `_upload/inkvoice-app-COMPLETE-v47.zip`.

### 2026-07-09 — v46: remove "This device IS my phone" link, VPN advice only on timeout, "Connected to [name]"
Three UI tweaks the user asked for after seeing v45:
- **Removed** the `📱 This device IS my phone — make it the host` rescue link from both
  guest screens (+ its `phoneLink` const and `cs-imphone` wiring). It was a workaround for
  the old viewport misdetection; UA-based detection (v44) makes it obsolete and the user
  found it confusing/ugly. (`inkvoice_force_phone` is still read in app.js as a harmless
  vestige + laptop auto-heal; nothing sets it via UI now.)
- **VPN advice moved into the timeout path only** — removed the always-on `.sync-vpn`
  amber box (all 4 screens) + its CSS. New `VPN_TIP` const ("Check your VPN — disconnect
  it, or add Inkvoice as a trusted app.") is appended to: the phone modal error, the
  laptop connect-attempt-died message, and the laptop Re-Connect give-up message. So the
  VPN nudge only shows when a connection actually times out.
- **Laptop "Connected to [phone name]" toast** — new `toastConnected(m)` reads
  `m.snap.profile.businessName || ownerName` from the incoming snapshot; called on both
  first-connect and reconnect.
- **Verified** (Playwright + mock signaler): no phone link / no up-front VPN box on
  laptop-connect, laptop-reconnect, phone-code screens; full pairing shows "Connected to
  Sunrise Studio" toast; pairing happy-path + Re-Connect regressions green; app boots
  clean. **SW → v46 / APP_VERSION v46.** Bundle: `_upload/inkvoice-app-COMPLETE-v46.zip`.

### 2026-07-09 — v45: "disconnect your VPN" hint on the pairing screens
User asked why the Accept button only appears with the VPN off (even on the same Wi-Fi).
Diagnosis: NORMAL — the sync is pure LAN peer-to-peer (STUN-only, no TURN relay), and a
VPN puts the phone on a different virtual network / blocks LAN access, so ICE can't find
a direct path → data channel never opens → no `hello` → no Accept. Not a bug; VPN-off
fixes it instantly. User asked for an on-screen hint on both sides.
- `js/syncui.js`: added a `.sync-vpn` note — laptop connect + Re-Connect screens say
  "Please disconnect your VPN to connect to your phone"; phone code + reconnect-host
  modals say "…to connect to your laptop". `css/styles.css`: `.sync-vpn` amber note,
  light + dark. Text-only/UI, no logic change.
- **Verified** (Playwright): both hints render on their respective screens; app boots
  clean, 0 errors. **SW → v45 / APP_VERSION v45.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v45.zip` (48 files).

### 2026-07-09 — v44: restore install-first gate (v43 regressed it) — phone browser → install page
v43 fixed the phone being misdetected as a laptop, but OVER-corrected: its `HAS_DATA`
shortcut (`UA_PHONE && (STANDALONE || HAS_DATA)`) booted the FULL APP in a plain phone
browser tab, so the app "opened in the browser" instead of showing the Add-to-Home-Screen
install page. The user requires: phone in a browser → INSTALL page first (download → runs
fully offline); only the INSTALLED (standalone) phone is the boss.
- `js/app.js`: removed `HAS_DATA` + the extra first-branch condition. Gate is back to the
  v39 structure — `if (FORCE || FORCE_PHONE || (STANDALONE && IS_PHONE))` phone/boss;
  `else if (!IS_PHONE)` guest; `else` (phone, not installed) → `Landing.html()`. Kept
  `IS_PHONE = UA_PHONE || (TOUCH && vmin<=560)` so the phone is never misread as a laptop,
  and the stray-`inkvoice_force_phone`-on-a-laptop auto-heal.
- Unchanged from v43 (kept): wake lock while the pairing/reconnect modal is open; guest
  Connect button un-sticks (no more frozen "Connecting…").
- **Verified** (Playwright, mock signaler): roletest (installed phone→app; phone browser
  w/ data→INSTALL page; fresh visitor→install; laptop stray-flag heals; laptop→guest) +
  pairing happy-path (code→Accept-on-phone→laptop boots→phone hub) + Re-Connect regression
  + disconnecttest (lock phone → laptop drops immediately → phone dimmed screen clears) +
  app boot. ALL GREEN. **SW → v44 / APP_VERSION v44.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v44.zip` (48 files).

### 2026-07-09 — v43: phone-is-always-the-phone + wake lock while pairing + no stuck "Connecting…"
User screenshots proved their PHONE was booting as a GUEST (the laptop connect screen,
"Inkvoice v39" visible) — so no code hosting, no Accept prompt, no hub/dim screen, no
disconnect-on-lock: ALL the "missing features" were role misdetection, not missing code.
Their laptop also hung on a disabled "Connecting…" when the phone side died mid-pairing.
- `js/app.js`: role gate rebuilt. `UA_PHONE` (Android/iPhone UA) + `TOUCH`; a mobile-UA
  device that is installed OR already has data always boots as the phone (browser tab
  included); fresh phone visitors still get the install page; a no-touch non-mobile
  device auto-clears a stray `inkvoice_force_phone` and heals back to the guest screen.
- `js/syncui.js`: wake lock while the pairing/reconnect-host modal is open (screen
  auto-lock mid-type was killing pairings — the ONE piece of the reverted v40 that the
  user's symptoms directly demanded); guest onState now re-enables the Connect button
  with a message when a non-booted attempt dies (was: stuck forever).
- **Verified:** roletest (4 checks: misdetected phone boots app; fresh visitor gets
  install page; stray-flag laptop heals; normal laptop unchanged) + pairing happy path +
  reclaim/Re-Connect regression + boot test — ALL GREEN. **SW → v43 / APP_VERSION v43.**
  Bundle: `_upload/inkvoice-app-COMPLETE-v43.zip` (48 files).

### 2026-07-09 — v42: v39 code + same icons under FRESH filenames (cache re-poisoned)
- After the v41 rollback the user reported "not the same / app does not work / stuck" →
  shipped `inkvoice-app-COMPLETE-v39-EXACT.zip` (pure `git archive 983bdef`,
  sha256-verified per file) with instructions to EMPTY `public_html/app/` first. Icons
  then broke on their device — the empty-folder window let the browser cache a FAILED
  fetch for the icon URLs (exactly the v36 robot mechanism). Server bytes were proven
  identical to good v39; the corruption is device-side, keyed by URL.
- **v42 =** v39 code (syncui.js hash-identical; sync.js differs only in the
  APP_VERSION line) + byte-identical icon copies as `icon-192-v4.png`,
  `icon-512-v4.png`, `maskable-512-v5.png`; manifest.json + index.html
  (favicon.ico?v=42) + sw.js SHELL updated; CACHE/APP_VERSION v42. Boot-tested clean.
- **RULES REINFORCED:** (1) never instruct emptying the live app folder — extract over
  the top; (2) any icon breakage after deploy churn = republish identical bytes under
  new filenames; (3) deltas to a "known-good" build must be provable with hashes.

### 2026-07-09 — v41: ROLLBACK of the v40 pairing rework (user request)
- v40 (same day) tried to fix "first pairing needs several code attempts" with a batch
  of changes: wake lock while the code modal is open, silent same-code re-hosting on
  any failure (`restandHost`), a ~45s polling Connect on the laptop, pc `failed` made
  terminal in any state, and a 15s connect watchdog. All of it passed the headless
  Playwright suite (incl. new phone-sleeps-mid-typing + burnt-room recovery tests) BUT
  **on the user's real devices it "went wrong"** (exact failure mode not yet known) and
  the user asked for a full revert: "it was actually working amazingly well before".
- `git revert` of commit `66494bd` → `js/sync.js` + `js/syncui.js` byte-identical to
  v39 behaviour; only `CACHE`/`APP_VERSION` bumped to v41. Re-verified after revert:
  happy-path pairing + reclaim/Re-Connect regression tests green, app boot clean.
  **SW → v41 / APP_VERSION v41.** Bundle: `_upload/inkvoice-app-COMPLETE-v41.zip`.
- **Lesson:** headless-green ≠ real-device-good for WebRTC pairing changes. Next
  attempt (if any) must be ONE small change per release, verified by the user on real
  hardware before the next.

### 2026-07-06 — v39: icons = EXACT native Android launcher artwork
- User compared the v38 web icon with the native app icon side by side ("pretty much the
  same but not") → rebuilt all icons from the Android app's own adaptive-icon resources
  (READ-ONLY source): composite `ic_launcher_background+foreground` (432px xxxhdpi),
  crop the launcher-visible center 72dp of 108dp, scale → `icon-192-v3` / `icon-512-v3`
  / `maskable-512-v4` + favicon.ico. Colours verified identical; disc 76% < 80% safe
  zone. New filenames again (icon-cache rule). Old teal-only + first black-ring
  maskables kept on server. Boot-tested: 0 errors. **SW → v39 / APP_VERSION v39.**
  Bundle: `_upload/inkvoice-app-COMPLETE-v39.zip` (45 files).
- NOTE: the Firefox-badge overlay on the shortcut icon is added by Firefox itself
  (pinned-shortcut path) and cannot be removed by the site.

### 2026-07-06 — v38: maskable = teal disc + BLACK edge (user's requested design)
- v37 CONFIRMED: the -v2 URL rename fixed Firefox's robot icon (cache was the culprit).
- But the user wants the icon "surrounded by a black edge" (the real Inkvoice look), not
  full-bleed teal → `icons/maskable-512-v3.png` = icon-512 flattened opaque on black
  (disc 77.5% < 80% safe zone → masks to teal disc + black ring; previews verified on
  circle + squircle). NEW filename because icon URLs are cached forever (v37 lesson).
  manifest.json + sw.js SHELL updated; old files kept. **SW → v38 / APP_VERSION v38.**
  Bundle: `_upload/inkvoice-app-COMPLETE-v38.zip` (42 files, boot-tested 0 errors).

### 2026-07-06 — v37: bust Firefox's poisoned icon cache with NEW icon URLs (Bug B root cause)
- User feedback on v36: robot icon persists in Firefox; **reinstalling Firefox fixed it**
  → root cause = Firefox's LOCAL icon cache holds a broken icon for the old URLs
  (poisoned by the pre-v35 SW), unaffected by clearing site data. Server was never the
  problem (matches: emulator fresh-Firefox always showed the right icon).
- Fix: icons duplicated to `icons/{icon-192,icon-512,maskable-512}-v2.png`;
  `manifest.json` + `index.html` now reference only the `-v2` URLs (+`favicon.ico?v=37`);
  `sw.js` SHELL updated; old files kept so existing installs don't 404;
  apple-touch-icon untouched (iPhone fine). Fallback if it persists: Firefox Settings →
  Delete browsing data → "Cached images and files" only.
- Boot-tested the bundle (0 errors, all -v2 icons 200). **SW → v37 / APP_VERSION v37.**
  Bundle: `_upload/inkvoice-app-COMPLETE-v37.zip` (41 files). Awaiting upload.

### 2026-07-06 — v36: clean maskable icon (Bug A) + Firefox page-icon fixes (Bug B attempt)
- **`icons/maskable-512.png` regenerated**: full-bleed teal + centered black swirl
  (extracted from icon-512 with anti-aliased alpha, ~58% of frame = inside the safe
  zone). Kills the blue/black edges on the Chrome Android launcher icon AND the
  splash-screen logo. Verified with circle + squircle mask previews.
- **Firefox fallback-shortcut icon**: `index.html` icon links upgraded (192+512 PNG with
  `sizes`/`type`, `shortcut icon`), new multi-size **`favicon.ico`** at app root;
  `sw.js` never intercepts `/favicon.ico`. Firefox's plain pin-shortcut path uses the
  page icon, not the manifest — this is the best-guess fix; needs on-device confirmation.
- Boot-tested repo AND the bundle tree headlessly: app renders, 0 pageerrors, all
  icons/favicon/manifest 200. **SW → v36 / APP_VERSION v36.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v36.zip` (38 files). Awaiting manual Hostinger upload.

### 2026-07-05 — Small UI fixes + DEVICE SYNC design locked (big feature planned)
Four quick fixes shipped, and the multi-device sync feature designed & approved (build next).
- **Quotation list cards show `Q°`** (were `N°`): `js/views/list.js` `card()` now picks the
  prefix from `inv.type`. Also fixed a latent bug in the **Create summary** (`create.js`
  `summaryInner`) that rendered quotation numbers as `N°Q001` — now `Q°001` (prefix by type,
  strips `^[NQ]`). PDF already did this correctly (`pdf.js`).
- **Profile name is business OR owner** (either is enough): removed the misleading red `*`
  from both fields, added a hint "Enter your business name, your name, or both *". Save
  validation already used OR (`nameOk = businessName || ownerName`) — matches the tab-gate.
- **Add New Item → Price shows a greyed `0`** that clears on focus / restores on blur, same
  pattern as Advance/Discount (`create.js` `openItem` + focus/blur handlers on `#m-price`).
- **Creation/Due date overlap fixed** (`css/styles.css`): `.two` grid was `1fr 1fr`
  (= `minmax(auto,1fr)`), so the iOS date input's intrinsic min-content width blew out its
  track and overlapped the neighbour. Now `minmax(0,1fr) minmax(0,1fr)`. iOS-only symptom,
  can't repro in headless Chromium — verified the other three fixes via Playwright.
- **SW → v17.**

#### PLANNED (approved, not built yet): live "phone is boss" device sync
Goal: create invoices on a laptop/tablet that mirror the phone, so numbering never collides
and data stays local. **App is now LIVE / about to launch to many users — security matters.**
Decisions locked with the user:
- **Scope v1 = PWA/web only** (iPhone PWA = boss ↔ laptop/tablet browser). Native Android
  sync is a SEPARATE later update (new Play release) — protocol is designed platform-neutral
  (JSON over WebRTC data channel + same `signal.php`) so the native client can slot in.
- **Pairing:** a **6-digit code** (first pairing only) + a **phone "Accept this device?"**
  prompt before any data is sent. After first Accept, the guest stores a long device token
  and **auto-reconnects** whenever the phone reappears — no re-typing. Code TTL ~120s,
  one-time-use, server-side rate-limited.
- **Why a server at all:** a typed short code needs a rendezvous; two browsers can't discover
  each other on a LAN alone. So a **tiny `signal.php` mailbox on Hostinger** exchanges only
  the ~1KB WebRTC handshake (SDP/ICE) — **no invoice data ever transits it**; all real data
  is peer-to-peer over the WiFi via an `RTCDataChannel`.
- **Boss rule / full mirror:** on connect the phone pushes a full snapshot (profile, clients,
  invoices, card colour) — phone always wins. Then bidirectional live deltas
  (`op` = upsert/delete per entity), last-write-wins by ts. Laptop is a live terminal
  (connection-only, no independent data); disconnect → back to the code screen.
- **Architecture / files:** new `signal.php` (Hostinger, CORS for both app domains),
  `js/sync.js` (WebRTC + protocol), laptop connect screen (replaces the desktop/tablet
  "use your phone" **dead-end** in `app.js` — that becomes the *entry point* now), phone
  "Connect a device" modal; `store.js` gets a write-event bus + silent-apply path; current
  view re-renders on incoming ops; `SYNC_URL` const → `https://inkvoiceapp.com/signal.php`;
  bump SW + add files to SHELL. `sw.js` already bypasses cross-origin so signal.php is uncached.
- **Build in 3 phases:** (1) ✅ **DONE** signaling + raw data-channel connect + Accept prompt;
  (2) ✅ **DONE** full mirror + live deltas + store event bus; (3) ✅ **CORE DONE** laptop
  connect screen (replaces the desktop dead-end), phone "Connect a device" modal + Accept
  gate, disconnect→reconnect. **Still TODO in 3:** auto-reconnect token (skip re-typing) +
  the manual 2-device WiFi checklist for the user.
- **Phase 1 status (2026-07-05):** `signal.php` (repo root; deploy = manual upload to
  Hostinger `public_html/` → served at `https://inkvoiceapp.com/signal.php`, CROSS-origin from
  the app at app.inkvoiceapp.com, hence CORS in the file) + `js/sync.js` (WebRTC transport,
  `Sync` singleton: `host()`/`join(code)`/`accept()`/`reject()`/`send()`/`onMessage()`/
  `onState()`/`onPeer()`). Signaling is POLL-based (short reqs, LiteSpeed-safe), 6-digit code,
  one-time claim, 180s TTL, per-IP rate-limit. Wire msgs: `hello`(guest→host)→host shows
  Accept→`welcome`/`rejected`; `bye` teardown. `SIGNAL_URL` overridable via
  `window.__INKVOICE_SIGNAL_URL` (used by tests). **Verified:** (a) real 2-peer WebRTC data
  channel via a Playwright 2-context test against an API-identical Python mock signaler
  (connect, accept-gate, bidirectional ops, reject + wrong-code paths); (b) live `signal.php`
  on Hostinger PHP 8.3 curl-tested — all endpoints/edge cases pass. Test scripts are throwaway
  (scratchpad, not committed). **Gotcha:** don't load the app's `index.html` in unit tests —
  its SW `controllerchange` reloads the page and wipes injected globals; use a bare 404 doc.
- **Phase 2 status (2026-07-05):** data mirror plumbing. `store.js` gained a change bus
  (`onStoreChange`), a `_muted` flag + `silently()` so applying a remote change never echoes
  back, `snapshot()`/`applySnapshot()`/`applyOp()`, and `getCardColor()`/`saveCardColor()`
  (biz-card colour now routed through the store; `cards.js` emits only on slider `change`,
  not every drag frame). All four writers (saveInvoice/deleteInvoice/saveProfile/saveClient)
  now `emit`. `js/syncbridge.js` glues transport↔data: host pushes `snapshot()` on connect
  (phone is boss), local changes → `op` messages, incoming `op`/`snapshot` applied silently +
  `rerenderLive()`. `app.js` calls `initSyncBridge(rerenderLive)`; `rerenderLive` repaints the
  current view EXCEPT `/create`, `/profile`, `/view/*` (don't clobber a form mid-edit).
  `sync.js` send()/recv now **chunk** large messages (CHUNK_SIZE 12000) so a full snapshot with
  base64 logos doesn't blow the data-channel message limit. **SW → v18** (+sync.js, syncbridge.js
  in SHELL). **Verified** (Playwright 2-context, real WebRTC, mock signaler): snapshot mirror
  (name/counter/invoices/card), live new-invoice both directions, no echo loop (both converge
  to 3), delete + profile propagation, and a 300KB chunked logo snapshot arriving byte-intact.
  Real app boots clean with the new imports.
- **Phase 3 status (2026-07-05):** the pairing UI — now user-usable. `js/syncui.js`:
  `openHostModal()` (phone "Connect a device" modal → code → Accept/Reject → Connected/
  Disconnect), `mountConnectScreen()` (laptop/tablet full-page 6-digit entry; boots the app
  only after the snapshot arrives so it opens populated, not gated), `initSyncUI({role})`
  (phone sets `window.__syncConnect`; guest re-shows the connect screen if the link drops).
  `app.js` boot: phone (FORCE || standalone+phone) → `initSyncUI('phone')` + render; desktop/
  tablet (`!IS_PHONE`) → `initSyncUI('guest',{bootApp:render})` + `mountConnectScreen` (the OLD
  `bigScreenNotice` dead-end is GONE). `profile.js` has a "Connect a device" button →
  `window.__syncConnect()`. CSS `.connect-screen`/`.sync-code`/`.cc-input` added. **SW → v19**
  (+syncui.js). **Verified** (Playwright 2-context, real app UI, mock signaler): phone code
  modal, laptop connect screen, Accept prompt, laptop boots into mirrored data (sees N°003/
  Romeo), live phone-created invoice shows on laptop, disconnect returns laptop to the connect
  screen. Screens screenshotted — look clean/on-brand. **Test gotcha:** set
  `window.__swReloaded=true` via addInitScript or app.js's one-time SW `controllerchange`
  reload wipes body-level modals mid-test.
- **WiFi-only decision (2026-07-05):** `sync.js` `ICE_SERVERS = []` — NO STUN/TURN, nothing
  external contacted; pairing uses local host/mDNS `.local` candidates only, so it works only
  when both devices share a WiFi. **CAVEAT:** the headless sandbox CANNOT validate the no-STUN
  path (its net namespace blocks local-candidate/multicast between browser contexts) — only the
  STUN path was reproducible. So real-device testing is the validator. **One-line fallback** if
  a user's network blocks local P2P: set `ICE_SERVERS = [{urls:'stun:stun.l.google.com:19302'}]`
  (STUN is metadata-only, setup-only — no data through it). **SW → v20.**
- **✅ REAL-DEVICE CONFIRMED (2026-07-05):** pure no-STUN got stuck at "Connecting" on the
  user's real network (local multicast/mDNS blocked). Added **Cloudflare STUN**
  (`stun:stun.cloudflare.com:3478`, setup-only, no data, no TURN) → **phone+laptop paired
  successfully over WiFi, live mirror working.** **SW → v21.** Core device sync (Phases 1–3)
  is DONE and validated on real hardware. Deployed to Hostinger `public_html/app/` (v21).
  **Remaining:** (a) ~~auto-reconnect~~ ✅ DONE (below); (b) bring the native Android app into
  the mesh (separate Kotlin/Play effort, protocol is already platform-neutral).
- **✅ AUTO-RECONNECT DONE (2026-07-05):** type the 6-digit code ONCE; after that the laptop
  reconnects silently. Mechanism: on first pairing the phone sends the guest a persistent
  secret **device key** (`inkvoice_device_id`, 32 hex, in the phone's localStorage); guest
  stores it as `inkvoice_pair_key`. Phone, once it has ever paired (`inkvoice_has_paired`),
  **background-advertises** under its device key while idle (`Sync.host({code:deviceId,
  autoAccept:true})`, refreshed on each terminal state) and **auto-accepts** a peer that knows
  the key (knowing the long secret = trust; no Accept prompt). Guest on load →
  `SyncUI.mountGuestStart`: if it has a pair key → `startGuestReconnect` (silent retry loop,
  "Reconnecting…" screen + "Enter a code instead" escape), else the code screen. None of these
  keys are in the store snapshot, so they don't sync. **signal.php CHANGED** (must be
  re-uploaded): code validation now `[A-Za-z0-9]{6,64}` (was exactly 6 digits) to allow the
  device key, and `offer` POST now overwrites an UNCLAIMED room (blocks only if `claimed`) so
  the phone can refresh its standing advertise offer. **Two bugs found & fixed during testing:**
  (1) `join()` did `replace(/\D/g,'')` which stripped the hex letters out of the device key →
  now `[^A-Za-z0-9]` + min-length 6; (2) `accept()` guarded `state!=='accept'` so the
  auto-accept (state 'connecting') bailed and never sent `welcome` → now guards only
  `state==='connected'`. **SW → v22.** **Verified** (Playwright, real app UI + WebRTC + mock):
  pair → disconnect → silent auto-reconnect (no code, no prompt) → data mirrored → live deltas;
  manual pairing + full-mirror regressions still green.
- **Connection-longevity mitigations (2026-07-05):** real-world report — the phone (host) PWA
  got suspended after a few minutes (screen auto-lock) and the link dropped. HARD LIMIT: a web
  app CANNOT hold a connection while the phone is locked/backgrounded (JS is suspended); only a
  native background service could — that's the Android-app path. Mitigations added in
  `syncui.js`: (1) **Screen Wake Lock** (`navigator.wakeLock`) held ONLY while actively
  connected (both roles), re-acquired on `visibilitychange`→visible (locks auto-release when
  hidden) — stops the screen auto-lock that was the main killer; (2) on the phone, coming back
  to the foreground **immediately re-advertises** (`advertiseTick`) so a waiting laptop
  reconnects in seconds; (3) phone "connected" panel now hints "keep Inkvoice open". **SW → v23.**
  Verified no regressions (reconnect + boot). signal.php UNCHANGED this round (app bundle only).
- **Dark "hub" screen + warnings (2026-07-05):** the web can't set screen brightness (no API)
  and can't keep a link alive once the phone leaves Inkvoice/locks — accepted. Best-effort UX:
  phone "connected" panel now has a **🌙 Dim & keep awake (hub)** button → `showHubScreen()` in
  `syncui.js`: a full black overlay (`.sync-hub`, `z-index:400`, appended to body so it survives
  app re-renders) with a pulsing dot + "Connected" + keep-on + disconnect warning, tap anywhere
  to exit. Mostly-black = looks dim + saves OLED power; wake lock (held while connected) keeps it
  awake. Cleared automatically on disconnect (+ toast). Laptop reconnect screen copy clarified
  ("open Inkvoice on your phone… links back automatically, no code"). **SW → v24.** Verified:
  reconnect regression green; hub screen screenshotted, looks right. NOTE: true always-on
  (phone locked / app closed) still needs the native Android background service.
- **Reconnect robustness + format validation (2026-07-05):** fixed a real "laptop loops
  'Looking for your phone' and never reconnects" bug + added email/website warnings.
  - **Reconnect bug root causes & fixes (`sync.js`):** (1) after the phone was suspended it sat
    at a STALE `state:'connected'` (dead peer, no event) so it never re-advertised → added a
    **heartbeat** (`__ping`/`__pong` every 5s; if no inbound for 15s → `_teardown('closed')`),
    plus `visibilitychange` on the phone force-drops a stale 'connected' when
    `pc.connectionState!=='connected'` and re-advertises. (2) an ICE failure left a side stuck
    at `'connecting'` forever holding a `claimed` room → added a **20s connect watchdog** in
    `_set`. (3) the phone couldn't re-advertise because its OWN stale claimed room under the
    device key returned 409 → `host()` now `sig('close')`+retries once on a 409 with a fixed
    code. `__ping`/`__pong` are filtered in `_dispatch` (never reach the app). **Verified:**
    abrupt peer-death (pc.close, no `bye`) auto-recovers in ~3s with live sync restored; clean
    reconnect + mirror + UI regressions all still green.
  - **Email/website validation (`util.js` `isEmail`/`isWebsite`, `.field-warn` CSS):** live
    inline warnings under Profile email + website and Create client-email; Save blocks on a bad
    email (required) or a non-empty bad website; PDF generation blocks on a bad client email.
    Website accepts optional `http(s)://` + `www.`, requires `domain.tld`. **Verified** (17
    checks: regex truth table + UI warnings show/hide + save/PDF blocked). **SW → v25.**
- **Instant auto-reconnect on tab-switch/sleep (2026-07-05):** real-world — desktop browsers
  throttle/discard BACKGROUND TABS, so switching away from the laptop tab drops the link after a
  few seconds (on top of phone-sleep). Requirement: reconnect must be AUTOMATIC + INSTANT (no
  tap). (Briefly built a phone "Reconnect" prompt then reverted per user — reconnect is
  auto-accept.) `syncui.js`: on `visibilitychange`→**hidden**, BOTH roles `Sync.disconnect()`
  (best-effort `bye`) so the peer learns instantly and is ready; on →**visible**, the phone
  re-advertises (`autoAccept:true`) and the guest immediately kicks a reconnect
  (`startGuestReconnect`, or drops a stale link first). Guest reconnect loop retries every ~1s
  (was 2.5s); phone re-advertises 800ms after a drop. `sync.js` heartbeat tightened to
  ping 3s / dead-after 9s (was 5s/15s) as the backstop. `Sync.linked` flag added (guest data
  channel open). **Verified:** dedicated tab-switch test (hide laptop tab → drops; return →
  auto-reconnects ~instantly + live sync restored), plus auto-reconnect/mirror/UI/abrupt-death/
  boot/validation regressions all green. **SW → v26.** NOTE: phone-locked/app-closed still needs
  native Android; this makes the common tab-switch case seamless.
- **FIX: phone stuck "connected", laptop forever "Looking for your phone" (2026-07-05):**
  reported on BOTH Android & iPhone (⇒ logic bug, not platform). After the phone was
  suspended/locked and reopened, the laptop never reconnected (manual "Enter code" worked). Two
  root causes: (1) `sync.js` heartbeat did `if(channel not open) return` — a dead/closed channel
  after suspension left the phone in a STALE `state:'connected'` that never tore down → now it
  `_teardown('closed')` on a gone/closed channel or a failed ping. (2) `canAdvertise` requires
  state ∈ {idle,closed,error}, so a stale 'connected' (or stuck `advertising` flag / expired
  standing offer) blocked re-advertising → the `visibilitychange`→visible handler now, for the
  phone, treats anything that isn't a genuinely live connection (`pc.connectionState==='connected'`)
  as stale: resets `advertising=false`, `Sync.disconnect()`, re-advertises. **Reproduced
  headlessly** (force stale-connected + dead pc → laptop stuck → reopen phone → recovers ~1.3s);
  full suite green. **SW → v27.**
- **Mutual exclusion — only ONE device active at a time (2026-07-05):** two devices editing the
  same books at once collides numbering, so the phone & laptop are now mutually exclusive.
  New persistent phone flag `inkvoice_mode` ∈ {`solo`,`hub`} (default solo). On first pairing the
  phone flips to **hub**: it's the data host but its own screen is LOCKED behind the black hub
  "In use on your laptop / Waiting for your laptop…" overlay (no tap-to-dismiss) — the laptop is
  the sole editor. Button **"Use this phone instead"** (`reclaimPhone`) → sends `{t:'solo'}`,
  disconnects the laptop, sets mode solo, unlocks the phone; in solo mode `canAdvertise` is
  false so the laptop **cannot** silently grab it back (laptop shows "Your phone is in use…").
  **"Connect a device"** now: first time → code modal; once paired → `resumeLaptop` (mode hub +
  advertise, laptop auto-reconnects, no code). Also "Pair a different device" link on the hub for
  a new device. `sync.js` unchanged. NOTE: on connect the pairing modal is REPLACED by the hub
  screen (tests no longer click `#sync-close`). **Verified** `mutex_test` (lock after pairing →
  reclaim drops laptop → solo blocks reconnect → resume auto-reconnects) + full suite green.
  **SW → v28.**
- **Unpair/reset + on-device diagnostics + stale-room fix (2026-07-05):** user: device-key
  auto-reconnect fails on real devices (first-pair via code works), and there was NO way to
  fully unpair/forget → laptop could get stuck. Three parts:
  (1) **Likely root cause fix** — the FIXED device-key room on `signal.php` can be left
  "claimed but dead" (409s the phone's re-advertise, 410s the laptop's join = deadlock the
  fresh-random-code path never hits). `sync.js host()` now does a best-effort `sig('close')` on
  the device-key room BEFORE posting each offer, so every advertise is a clean room.
  (2) **Unpair/forget** — phone `unpairPhone()` (clears HAS_PAIRED + regenerates DEVICE_KEY +
  mode solo; buttons on hub screen & Profile "Unpair / forget laptop"); laptop `forgetPhone()`
  (clears PAIR_KEY → fresh code screen; "Forget this phone & start over" on the reconnect
  screen). Profile shows "Reconnect laptop" vs "Connect a device" by pair state.
  (3) **On-device diagnostics** — `SyncLog` ring buffer in `sync.js` logs state transitions,
  host/join, pc/ice states, sig failures; a "Connection diagnostics" link on the connect /
  reconnect / hub screens + Profile opens a live, copyable log overlay (`showDiag`, z-index 600
  so it sits above the z-400 hub). So real-device failures can be READ/shared without a computer.
  `window.__syncUnpair/__syncForget/__syncDiag/__syncPaired` exposed for Profile. **Verified**
  `reset_test` (diag shows lines, laptop forget → code screen, phone unpair clears keys) + full
  suite green. **SW → v29.**
- **⚠️ DEPLOY LESSON — always ship a COMPLETE bundle (2026-07-05):** shipping partial zips
  (only the changed js/css) broke a live device: extracting them over the app folder left a
  MISMATCHED mix of old+new files, and new `syncui.js`'s `import { SyncLog }` against an old
  cached `sync.js` (no such export) threw → whole app dead, "won't connect at all". The partial
  zips also lacked `icons/`+`manifest.webmanifest`, so the installed PWA reverted to the default
  Android icon. FIX: the deploy bundle is now the FULL app payload — `index.html`,
  `manifest.webmanifest`, `sw.js`, `css/ js/ icons/ vendor/ pdfsamples/` (NOT `signal.php` /
  `site/` / `CNAME` / docs). Boot-tested the bundle end-to-end (app renders, 3 manifest icons,
  icon-192 loads, 0 pageerrors, 0 4xx). **ALWAYS build `_upload/app/` = complete tree; never a
  subset.** Icon note: an already-installed PWA caches its icon — the user must reinstall
  (remove from home screen → reopen → re-add) to pick the Inkvoice icon back up.
- **Auto-reconnect REPLACED by an explicit "Re-Connect" button (2026-07-05):** auto-reconnect
  was unreliable on real devices ("if i insert the code again it works but if i do nothing it
  doesn't") so per user we dropped it entirely for a deliberate push on both ends: first time =
  code; after that = press **Re-Connect** on the laptop → **Accept** on the phone (no code).
  Changes in `syncui.js`: `advertiseTick` now `autoAccept:false` (phone still stands a device-key
  offer in hub mode, but a join prompts). New `showReconnectAccept()` modal (z-500, above hub)
  shown on phone `onState==='accept'` when not first-pairing. `startGuestReconnect` no longer
  loops — it renders a static "🔗 Re-Connect" button screen (+ Enter-a-code / Forget / Diag);
  `doReconnect()` does ONE `join(deviceKey)`, shows "confirm on your phone", waits ~45s for the
  Accept+snapshot, and re-enables the button with a helpful message on failure. Guest
  visibilitychange no longer auto-joins (just drops a dead link → button). Phone still
  re-advertises on visible so the offer is ready. **All reconnect tests rewritten to the manual
  flow** (press #rc-go → phone #ra-accept) — reconnect/mutex/tabswitch/stuck/deaddrop/reset +
  sync2/3/valid/boot all green. Bundle shipped as COMPLETE app payload. **SW → v30.**
- **ROOT-CAUSE FIX: paired phone now always advertises (2026-07-05):** "does not connect at
  all" (reconnect) was caused by the mutual-exclusion `inkvoice_mode` flag: advertising was
  gated on `mode==='hub'`, but mode DEFAULTS to `solo`, so a paired phone that booted (or an
  existing user post-update) never advertised → the laptop's Re-Connect found nothing. Every
  test went through fresh pairing (which set hub), so it was never caught. FIX: removed the
  persistent mode flag entirely. `canAdvertise` now gates on `HAS_PAIRED` — a paired phone stands
  a device-key offer whenever it's foreground + not connected. Mutual exclusion is enforced by
  DESIGN instead: reconnect needs a press on BOTH ends (laptop Re-Connect + phone Accept), and
  `renderHub` shows the lock screen ONLY while actually connected (phone is fully usable
  otherwise). `reclaimPhone` = just disconnect (laptop waits on its manual Re-Connect screen, no
  auto-grab). Removed `resumeLaptop`, the `{t:'solo'}` message, and the "Reconnect laptop"
  Profile relabel. **New regression `paired_boot_test`** (reopen both apps → laptop Re-Connect +
  phone Accept works with NO toggle on the phone) — this would have caught it. Full suite green.
  **SW → v31.**
- **Robust reconnect: polling + on-screen version + no-code-when-paired (2026-07-05):** user
  still hit "press Re-Connect, nothing happens" and couldn't tell if deploys were even landing.
  Three changes: (1) **On-screen version** `APP_VERSION` (`js/sync.js`, = SW number) shown on
  every sync screen + Profile diag link, so a stale deploy is obvious immediately. (2) **Polling
  Re-Connect** — `doReconnect()` now retries `join(deviceKey)` for ~40s with live status
  ("Looking for your phone…" → "Found — tap Accept") instead of one shot that silently failed on
  timing; so you can press Re-Connect first and wake the phone after. (3) **Paired phone shows NO
  code** — `window.__syncConnect` → `openReconnectHost()` when HAS_PAIRED (hosts the device key
  with a "Reconnect your laptop / waiting…" screen + a "Pair a NEW device (show a code)" link);
  only first pairing shows a code. New tests: `poll_test` (press Re-Connect while phone asleep →
  connects when it wakes) + `nocode` check. Full suite (12) green. **SW → v32 / APP_VERSION v32.**
- **Visible phone Reconnect button + role-detection fix (2026-07-05):** user screenshots (BOTH
  from the laptop) showed reconnect failing with nothing happening on the phone. Two things:
  (1) **Role detection** used `window.screen.width <= 500`, but many phones report screen.width in
  PHYSICAL px (e.g. 1080) → a real phone could be misclassified as a laptop and boot as a guest
  (no host at all). Switched to VIEWPORT px (`innerWidth/innerHeight <= 560`) in `js/app.js`, and
  added a manual override (`inkvoice_force_phone` + a "📱 This device IS my phone" link on the
  guest screens → `role_test`). (2) **The phone now shows a big visible "🔗 Reconnect my laptop"
  button** whenever paired + not connected (`renderPhoneReconnectBtn`, fixed bottom, z-350) — the
  thing the user kept asking for. Tapping it → `openReconnectHost` (device-key host) with
  **autoAccept:true**, and background `advertiseTick` is autoAccept:true again — so the laptop's
  polling Re-Connect links up with NO extra confirm tap (the phone-button tap / laptop press are
  the consent). Removed the separate `showReconnectAccept` prompt trigger. New tests
  `phonebtn_test` + updated all reconnect tests (no #ra-accept). Full suite (13) green.
  **SW → v33 / APP_VERSION v33.**
  - ⚠️ **GitHub Pages deploy is failing on every push** (emails to the user): Pages serves the
    now-OBSOLETE `app.elorate.net` (see `CNAME`); the real app is on Hostinger
    (`app.inkvoiceapp.com`). Build succeeds, deploy fails (GitHub-side/custom-domain). Fix is in
    GitHub repo Settings → Pages → Source: None (can't be done from the repo). Not a code bug.
- **Numbering worry solved:** laptop reads the phone's synced counters live, so `peekNextNumber`
  is always correct. (Rare simultaneous-create race → later hardening: phone as sole number
  issuer.) **Can't fully test real-LAN WebRTC headlessly** → user does a 2-device WiFi check.


### 2026-07-04 — Marketing site + own domain (inkvoiceapp.com) + phone-only gate
Gave Inkvoice a professional public face on its **own domain**, and moved the app to a
matching subdomain so nothing user-facing points at the developer's `elorate.net` anymore.
Hosted on **Hostinger** (manual file upload), separate from the GitHub Pages deploy.
- **Marketing site** (`site/`, no build): standalone static landing page. Hero shows a live
  **crossfade slideshow of real app screenshots** (Home / Invoices / Quotations / Biz Card /
  Profile) inside a phone frame, with the four real PDF styles fanned behind it. Screenshots
  were captured **headlessly** (Playwright) from seeded fake "John Doe" localStorage data —
  no real user data. Plus features grid, install section (Google Play badge + iPhone
  Add-to-Home-Screen steps), FAQ, and the "few small ads, we promise" microcopy. Theme-aware,
  responsive. Slideshow auto-activates from `site/assets/screens/*.png`.
- **Profile save fix** (`js/views/profile.js`): Save now validates the same fields the
  tab-gate needs (business **or** owner name + a valid email) and **navigates to Home** on
  success, so Create/Invoices/Biz Card unlock and the logo shows in one step. SW → **v16**.
- **Own domain, live on Hostinger:**
  - **`inkvoiceapp.com`** → the marketing site (`site/` contents in `public_html/`).
  - **`app.inkvoiceapp.com`** → the app (repo-root files in `public_html/app/`).
  - `app.elorate.net` (GitHub Pages) left **intact** for existing installs; new users come in
    via the new domain. Install links across the marketing site AND the app's own landing
    (`js/views/landing.js`) now point at **app.inkvoiceapp.com**. (`com.elorate.invoicefree`
    is the **Play package id**, not a domain — left unchanged.)
- **Phone-only gate** (`js/app.js`): the app runs ONLY when standalone **and** on a
  phone-sized touch screen (`maxTouchPoints>0` / `pointer:coarse` **and** shorter screen side
  ≤ 500px). Desktop/tablet — even if installed — get a "📱 Inkvoice is a phone app, open
  inkvoiceapp.com on your phone" notice, because data is device-only with **no sync yet**.
  `?app` still forces the app (for previews/screenshots).
- **Verified LIVE** (headless Playwright vs the real URLs): inkvoiceapp.com 200; app on
  desktop → phone notice; app on iPhone → install page; `?app` → app runs; marketing → 3×
  app.inkvoiceapp.com links; zero leftover `app.elorate.net` on the marketing site.
- **Deploy = manual upload** to Hostinger: `site/` contents → `public_html/`, repo app files
  → `public_html/app/`. Local staging in `_upload/` (gitignored). This is separate from the
  GitHub Pages / `git push` flow that still feeds app.elorate.net.

### 2026-07-04 — Adsterra banner wired in (ads phase 2)
- `js/ads.js`: enabled an **Adsterra 320×50 banner** (key `5df1a997…`), matching the Android
  `AdSize.BANNER`. Each placement renders in its **own srcdoc iframe** so multiple banners on
  one page don't collide over Adsterra's global `atOptions`. Shows after every 5th document,
  online only. Verified 2 isolated iframes on a 12-doc list, no errors.
- `sw.js`: now **bypasses cross-origin requests** so the ad script runs untouched / uncached.
- **DONE + verified live:** Adsterra website `app.elorate.net` (site ID `5892619`) added; ad
  unit `30100194` "Banner 320x50" is **Active** (approved). On `https://app.elorate.net/invoices`
  with 12 seeded docs, **both banners fired their `invoke.js`** to highperformanceformat.com — the
  chain works. (First GitHub Pages deploy hit a transient "try again later"; an empty re-push
  fixed it → v13 live.)
- **Notes:** `30100194` is the *ad unit* ID, not an ads.txt publisher line — **ads.txt skipped**
  (optional for Adsterra; can add later for a small revenue bump, get the block from the Adsterra
  Telegram manager). Real ad *fill* depends on Adsterra serving to real user traffic; a headless/
  datacenter IP may show blank. To SEE an ad in-app you need **6+ documents** (first ad after #5).
  User still to tick "Enforce HTTPS" in repo Settings → Pages (cert is ready).

### 2026-07-04 — Custom domain app.elorate.net live (ads phase 1)
- Added DNS record at the domain's DNS host (Canva/Tucows, nameservers `systemdns.com`):
  `CNAME app → sebamuhr.github.io`. Left the existing `@`/`www`/`TXT` (Netlify + AdMob
  `app-ads.txt`) untouched.
- Committed `CNAME` file (`app.elorate.net`) → GitHub Pages auto-registers the custom domain.
- Verified: `app.elorate.net` resolves to GitHub Pages (185.199.108–111.153); HTTP serves the
  app (`<title>Inkvoice</title>`, manifest + js load 200). **HTTPS cert issuing** (GitHub auto,
  a few min). Next: enable "Enforce HTTPS" in repo Settings → Pages.
- **Remaining for ads:** user signs up at Adsterra → adds `https://app.elorate.net` → creates a
  Banner unit → sends the snippet + ads.txt line → paste into `js/ads.js` (`enabled:true`) + add
  `ads.txt` at site root.


### 2026-07-03 — parity with Android PUBLISHING_PROGRESS.md (§10) + floating back arrow
Compared the Android app's post-launch notes against the web app:
- **Due date now required only when B2G is on** (was always required). The `*` on Due /
  Tax Number / Address toggles live with the B2G checkbox. Matches Android v25 (§10-D).
- **Ad slots anchor from the OLDEST item** (`below = len-1-i; below % 5 == 0`), so an ad
  stays put between the same document pair (#5/#6, #10/#11…) as new docs are added on top.
  Matches Android `InvoiceListScreen.kt` (§10-A). Verified: 12 docs → ads after N°011 and
  N°006, top 2 newest carry none.
- **Back chevron** reworked: floats on top of everything, semi-transparent (opacity ~.68,
  blurred), **no reserved vertical space** (removed the `with-back` top-padding). SW → v11→v12.
- Confirmed already-matching: Home business logo, minimal in-feed-only ad philosophy.
- Note: Android's future "one-time remove-ads purchase" can't use Play Billing on a PWA;
  ties into the still-open web monetization decision.


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
