# Inkvoice Web — Progress & Handoff

> **Purpose of this file:** a single, self-contained brief so work can resume after the
> window/terminal is closed. Read this top-to-bottom to get back in context.
> **Convention:** keep this updated every prompt. "Current state" is the truth; the
> dated **Changelog** at the bottom is the history (newest on top).

---

## 🔴 ACTIVE ISSUE — PWA home-screen icon on Android (READ THIS FIRST)

**Latest build: v72** (usage counter ping.php/stats.php) on top of **v71** (ads: slot visible again — v69 hidden-slot regression). Prior: **v68** (`_upload/inkvoice-app-COMPLETE-v68.zip`, INCLUDES `.htaccess`) — **e-invoicing
XML on the WEB** (`js/einvoice.js`): a faithful port of the Android `ZugferdGenerator.kt` (EN 16931 /
XRechnung CII — the exact generator that passes the online validator). Reachable via Profile →
Advanced Sharing → "Share XML" / "Both PDF & XML". XRechnung-valid for **B2G** invoices. See v68
changelog. On:

**v67** — **German PDF "Zwischensumme" crop fix**: split the shared `Subtotal` key so the line-item
column header is now `Amount` (Betrag / Importe / Montant) and the totals label is `Summe` (DE). On:

**v66** — **APP LANGUAGE (i18n)** across the main screens (EN/DE/ES/FR), reusing the Android app's real
translations. INVOICE PDF-output language is still TODO. See v66 changelog. Builds on:

**v65** — splash logo no longer clipped (shrank the "any" icons to 60%, home-screen icons untouched)
+ Adsterra key for inkvoiceapp.com + SEO'd (hidden) marketing page + noindex. And:

**v64** — **CRITICAL fixes:** the "can't create more than 4 invoices" data-loss bug (logo bloat filled
localStorage + number-burn), PDF opening about:blank (noopener), ads (were blocked by the 4-doc cap).
Builds on:

**v63** — bigger Android home-screen icon (maskable disc 59%→66%, icon `?v=58`→`?v=63`). And:

**v62 — ONE-DOMAIN + phone/tablet.** The app now lives under the MAIN domain at **inkvoiceapp.com/app** (retire the
`app.inkvoiceapp.com` subdomain + `app.elorate.net`); the marketing welcome page stays at the root
`inkvoiceapp.com/`. Gating simplified to "installed (standalone) OR `?app` → run the app; else the
install page" so **tablets** work too (was phone-size-only). All app paths are relative → works at
any subpath (verified at `/app`). Builds on v61 (phone-only, laptop sync shelved). Carries the v58
icon fix. On-screen version on Profile ("Inkvoice v62").

**Prior: v61** = phone-only launch build: laptop/device sync SHELVED (removed the "Connect a device"
button, 6-digit code screen, guest/desktop connect path, all sync wiring). sync.js/syncbridge.js/
syncui.js remain in the repo, just not wired in (see app.js to revive).

> ⚠️ **DEPLOY REALITY CHECK (2026-07-12):** the live server was found running **v57** — **v58
> was built but NEVER uploaded** (the recurring "icon still broken" cause). The fix is only live
> once the bundle actually lands. After uploading v59, VERIFY from a terminal BEFORE trusting it:
> `curl -s https://app.inkvoiceapp.com/js/sync.js | grep APP_VERSION` → must say **v59**;
> `curl -s https://app.inkvoiceapp.com/manifest.json | grep maskable` → must say **?v=58**.
> If they don't, the extract didn't overwrite (Hostinger sometimes unzips into a subfolder).

**Prior build: v58** (`_upload/inkvoice-app-COMPLETE-v58.zip`, INCLUDES `.htaccess`) —
maskable icon safe-zone fix (Firefox no longer crops the icon shape); icon query bumped
`?v=54`→`?v=58`. Carries v57 (sync terminal), v56 (immutability), v55, v54.
**v58 was never deployed — folded into v59.**

**Prior build: v57** (`_upload/inkvoice-app-COMPLETE-v57.zip`, INCLUDES `.htaccess`) —
device-sync model fix: the laptop is now an EPHEMERAL TERMINAL that wipes its data on
disconnect so it can never overwrite the phone (the boss/only store). See v57 changelog +
memory `sync-model`. Carries v56 (immutability), v55 (numbering/tax/date), v54 (icon).

**Prior build: v56** (`_upload/inkvoice-app-COMPLETE-v56.zip`, INCLUDES `.htaccess`) —
invoice/quotation IMMUTABILITY hardening (frozen totals + list currency leak fix); see v56
changelog and memory `invoice-immutability`. Carries v55 (numbering/tax/date) and the v54
icon fix (icons + `?v=54` unchanged).

**Prior build: v55** (`_upload/inkvoice-app-COMPLETE-v55.zip`, INCLUDES `.htaccess`) —
numbering + tax-picker + date-field fixes (see v55 changelog). Carries the v54 icon fix
(icons + `?v=54` unchanged in v55). See prior note below for the v54 icon details.

**Prior build: v54** (`_upload/inkvoice-app-COMPLETE-v54.zip`, INCLUDES `.htaccess`) —
REAL icon root-cause fix (see v54 changelog + memory `pwa-icon-root-cause`). The v51 "stable
filename" theory was WRONG (manifest/icon URLs were byte-identical v51→v53 yet the icon still
broke). Two actual defects fixed: (1) maskable slot pointed at a full-bleed non-safe image →
now `maskable-512.png` only; (2) `.htaccess` forced `must-revalidate` on icons → now
`immutable` long-cache. Icon URLs bumped `?v=51`→`?v=54` to force a clean re-mint. Also
carries v53 (PDF opens in browser) and v52 (list order). Root cause of the endless "lost the icon again": I kept RENAMING
icon files every release (icon-…-v2…v6) and telling the user to re-add the home-screen
icon each deploy — every re-add re-fetched and could hit a stale cache; and the fix
depended on a HIDDEN `.htaccess` that may never have extracted on the server.
v51 fixes it permanently (see "ICON POLICY" below). v50 (2026-07-10) delivered the
edit-quote→invoice fix (the "2 invoices N1" cause) + share-opens-file-not-about:blank.
**Below is older context.**

### 🔒 ICON POLICY — do NOT break this again (2026-07-11)
- **Canonical, STABLE filenames, never renamed again:** `icons/icon-192.png`,
  `icons/icon-512.png`, `icons/maskable-512.png`, `icons/apple-touch-icon.png`,
  `favicon.ico`. These hold the FINAL approved artwork (teal disc + black edge = the
  native Android look). The old `…-v2..v6` files are kept on the server so existing
  installs don't 404, but are dead — do not reference them.
- **Cache-busting is done with a QUERY STRING, not renames:** manifest.json + index.html
  reference `icons/icon-512.png?v=51` etc. This busts caches WITHOUT depending on the
  hidden `.htaccess`, and works on every browser. The `?v=NN` is an **ICON revision that
  is INDEPENDENT of APP_VERSION** — leave it FIXED across normal releases so the installed
  icon PERSISTS untouched. **Only bump `?v=` (in manifest.json AND index.html AND, if you
  changed the bytes, the file itself) when the icon ARTWORK actually changes.** Never
  rename the physical files.
- **Consequence:** because the icon URLs no longer change every release, the installed
  home-screen icon survives app updates on its own. The user should NOT be told to
  reinstall/re-add on every deploy anymore — only ONCE, right after v51, to escape the
  currently-broken state.

**(2026-07-09) v48** = v47 + **unpair now propagates**: if either side unpairs/forgets while connected, it sends `{t:'unpair'}` over
the live channel so the OTHER side also forgets (laptop → code screen, phone → HAS_PAIRED
cleared + reconnect button hidden) — no more stale "Re-Connect". **OPEN ITEM the user
reported (NOT a code bug — needs their action):** their Linux laptop pairs with both the
Android phone and the wife's iPhone fine, but NEITHER phone can pair to the wife's **Mac**
(tried Safari AND Firefox). Both-browsers-fail-on-one-machine ⇒ macOS **Local Network
privacy** blocking the browser (System Settings → Privacy & Security → Local Network →
enable the browser) and/or the macOS firewall. The sync is pure LAN P2P (STUN-only, no
TURN), so if macOS blocks LAN access there's no fallback by design. See §8 open items.
Below is the v47 icon-cache fix (still relevant):
**v47 ENDED the recurring "icon broke again" problem PERMANENTLY.** Root cause finally pinned: the server cached icons/favicon
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
1. **v51 uploaded?** User extracts `inkvoice-app-COMPLETE-v51.zip` OVER `public_html/app/`
   (do NOT empty the folder first). `.htaccess` is nice-to-have but the icon fix does NOT
   depend on it. Confirm on-screen "v51". Then re-add the home-screen icon ONE last time —
   after this, updates keep the icon automatically (see ICON POLICY). **Never rename icons
   again; if the art changes, bump only the `?v=` query.**
2. **Verify on the real phone:** editing a quotation and switching it to an invoice makes a
   NEW invoice (quote stays), invoice numbers stay correlative (no more duplicate N1);
   Share PDF/Card opens the share sheet on Chrome, or opens the PDF/PNG (not about:blank) on
   Firefox — if still not a share sheet on Firefox that's a Firefox-Android Web-Share
   limitation (no file support), confirmable via the diag/console.
3. **Mac pairing (still open):** likely macOS Local Network permission for the browser
   (Sonoma+), not code. TURN relay would fix it but routes data off-device — only with consent.
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
| **Hosting — app (primary)** | **Hostinger** → **https://inkvoiceapp.com/app** (repo-root files in `public_html/app/`). Manual upload. **(v62: the `app.inkvoiceapp.com` subdomain is retired — one domain now.)** |
| **Hosting — marketing site** | **Hostinger** → **https://inkvoiceapp.com** (welcome page; `site/` contents in `public_html/`). Its "Get the app / Install" links point to `/app`. Manual upload. |
| **Hosting — app (legacy)** | GitHub Pages → **https://app.elorate.net** — being retired (v62). |
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

### 2026-10-16 — v72: real usage counter — ping.php + stats.php
- (Built 10-12 as a second "v71"; the user had already uploaded the first v71 on 10-11, so the
  PHP never went live → stats.php 404. Renumbered to v72: same VERSION = phones never update.)
- Replaces the one-shot `installed.txt` hit (needed log digging; Hostinger keeps few days).
- `js/app.js` `trackUsage()` (installed/standalone only): POSTs `ping.php` → "install" once per
  device (`prev=1` if the device already had documents / the old `inkvoice_install_pinged`
  flag, so pre-existing users aren't counted as new), then "open" max once per calendar day
  (also on returning to foreground). Random UUID device id; flags written only on server OK.
- `ping.php`: strict whitelist validation, appends JSON lines to monthly
  `events-YYYY-MM.jsonl` in `domains/inkvoiceapp.com/inkvoice-stats/` (OUTSIDE public_html,
  survives redeploys), fallback `app/stats-data/` (web-denied). No IP, no UA.
- `stats.php?k=<key>`: totals, active today/7d/30d, by month, platform, language, version,
  by day + CSV. Key lives in `stats-config.php` — **gitignored, shipped only in the bundle**.
  Wrong/missing key → 404. `sw.js` never intercepts `*.php`.
- Tested with PHP 8.3 (Docker) + browser emulating an installed iPhone: existing user →
  install prev=1; new → prev=0; reload → no extra ping; Safari tab → none; junk → 400.

### 2026-10-11 — v71: REAL cause of "no ads anywhere" — the hidden slot (v69 regression)
- User: no ads, not even the slot, on iPhone on ALDI TALK (O2 network, NOT Telekom) with v70.
- check-host.net: `highperformanceformat.com` answers 200 from 8 countries. Fetched the live
  `invoke.js` via archive.org (54 KB obfuscated): it now pulls the ad from a SECOND domain
  (`kettledroopingcontinuation.com/watch.*`, plus `protrafficinspector.com/stats`) — also
  blocked by Telekom. The watch page records frame/window sizes (`innerWidth`, `fr`, sw1..sw7).
- **Root cause:** v69 made the slot `display:none` until it filled. Measured: inside a hidden
  slot the ad script sees `innerWidth/innerHeight/offsetHeight = 0×0`. Adsterra does not serve
  to an invisible 0×0 frame → the fill never comes → slot removed. Ads last worked (Aug 1) when
  the slot was visible. v70's longer timeout could not help.
- **Fix (`js/ads.js`):** slot VISIBLE at real size from the start (like ≤v68); removed only on
  script `onerror` or no fill after 20s. Debug mode can now be toggled INSIDE the installed app:
  tap "Inkvoice v71" in Profile 5× (iPhone PWA storage is separate from Safari, so `?addebug` in
  Safari shows an empty list). Debug adds a test slot at the top of the list.
- Verified e2e (7 seeded invoices): slot after N°006 visible at t=0.8s; filled → stays; blocked
  → gone at once; no fill → gone at 22s; 5-tap toggle works; 0 page errors. Bundle boot-tested.
- **Deploy incident:** the v70 zip was first extracted into `public_html/` (root) → overwrote the
  marketing page. Restored with a rebuilt `inkvoice-welcome-site.zip` that now also contains
  `site/sw.js` = KILL SWITCH (unregisters the app worker that got registered at scope "/").
  Keep that file. Stray app files (js/, vendor/, pdfsamples/, manifest.json, installed.txt) may
  still sit in public_html/ root — harmless, delete when convenient.
- `app.inkvoiceapp.com` serves the SAME folder as `inkvoiceapp.com/app` (both went v69→v70 together).
- **SW VERSION → v71 / APP_VERSION → v71.** Bundle: `_upload/inkvoice-app-COMPLETE-v71.zip`.

### 2026-10-11 — v70: ads no longer thrown away on slow mobile data + ad diagnostic mode
- **Bug:** user reported NO ads on iPhone even on 3G (not just Telekom wifi). v69's collapse logic
  removed the slot after ~4s; on 3G the Adsterra script + ad request often takes longer, so real ads
  were discarded. Ads were last confirmed on iPhone cellular on 2026-08-01 — BEFORE v69 shipped.
- `js/ads.js`: wait up to **20s** for a fill (slot stays hidden meanwhile); collapse immediately on
  script `onerror` (blocked host). Fill check now looks for any visual element in the srcdoc.
- **Diagnostic mode:** open `inkvoiceapp.com/app/?app&addebug` → slots never hide, label shows
  `script: loaded|error|pending · filled · seconds · online`. Sticky via localStorage
  `inkvoice.adDebug`; `?app&addebug=0` turns it off.
- `js/app.js` install counter: the "pinged" flag is now set only after `installed.txt` returns OK
  (before, an install first opened offline was never counted).
- Verified in headless Chromium with mocked invoke.js: fast → shown; 8s slow → shown at 8.5s (v69
  would have removed it); blocked → removed at once; debug labels correct.
- **SW VERSION → v70 / APP_VERSION → v70.** Bundle: `_upload/inkvoice-app-COMPLETE-v70.zip`
  (same file set as v69; only ads.js, app.js, sync.js, sw.js differ).

### 2026-08-01 — v69: PWA opens offline (iPhone blank-screen fix) + ads collapse when blocked

**1. Ads "not showing" = Deutsche Telekom blocks the ad host.** Not a code/key/Adsterra problem.
Measured from the dev's Telekom line: `http://www.highperformanceformat.com/…` → `302
https://block.telekom.net/de/warn.html`, and HTTPS fails the TLS handshake ("wrong version number")
on **all 14** of its IPs. Scoped to that one host — `adsterra.com`, `pagead2.googlesyndication.com`,
`example.com` all fine. Confirmed by the user: iPhone AND Android both show ads on mobile data and
neither on the Telekom wifi — same wifi is the only shared factor. The live key is correct
(`c7ac468f…`, site 5920358, unit 30311824) and `/app/js/ads.js` serves `enabled:true`. **Decision:
do not engineer around it** — ask the Adsterra manager for an alternative serving domain, otherwise
ignore (one ISP, one country, cents of CPM). See memory `adsterra-telekom-block`.

**2. `ads.js` now COLLAPSES an unfilled slot.** Before, the label was written up-front so a blocked
ad left a bordered empty "ADVERTISEMENT" box — which is what the user actually reported seeing. The
slot now starts `display:none` and is revealed only on a real fill; polled every 500ms × 8 (~4s),
then `container.remove()`. The srcdoc doc is same-origin so we can inspect it — but **must ignore
our own two `<script>` children**, otherwise every slot looks filled (first attempt failed exactly
this way). Verified both directions: blocked (real, on the Telekom line) → slot removed, 7 cards
intact; stubbed fill → slot visible with label.

**3. THE REAL ONE — installed iPhone PWA opened BLANK with no connection.** ROOT CAUSE: `sw.js` was
**network-first for everything**, including `index.html` — every launch waited on a network
round-trip before painting. Desktop Chrome survives this (a failed fetch rejects instantly → cache
fallback; a live offline test of production passed, 33 entries cached, app booted). iOS does not:
WebKit terminates idle service workers aggressively, so a cold home-screen launch had to boot the
worker AND let its fetch fail before anything rendered. Fix: **rewrote `sw.js` cache-first**
(app-shell + stale-while-revalidate) — navigations are served from the cached `index.html` without
touching the network, shell assets cache-first with a background refresh, everything else
network-first with cache fallback. Added an 8s `NET_TIMEOUT` so a dead-but-connected network
(captive portal, weak signal) can't leave a fetch hanging. Freshness after deploy still comes from
bumping `VERSION` → new worker precaches → skipWaiting/claim → `controllerchange` reload.

**4. Two robustness bugs found while verifying (both real, both silent):**
- `cache.addAll()` is **atomic** — one 404 in SHELL rejected the whole install, the worker never
  activated and the app had NO offline support at all, with no error anywhere. Now precaches
  per-file via `Promise.allSettled`.
- **`serviceWorker.register()` lived in `js/app.js`**, the head of a static import graph. Proved by
  test: with one module 404ing, `SW: NONE` — app.js never executed, so the app never registered a
  worker and cached **0** files. Moved registration into a plain inline `<script>` in `index.html`
  (no modules, always runs). Same test now: SW active, **31/32** cached. This is the
  `deploy-complete-bundle` failure mode made survivable.

**Verified** (Playwright, against the built bundle — not just the repo): (A) offline cold launch →
32/32 cached, tabbar renders, 0 errors; (B) offline with the worker force-stopped → app boots;
(C) 404 in shell → 31/32 cached, worker still active; (D) first-ever visit offline → browser offline
page, **unavoidable** (no worker exists yet — every PWA needs one successful online load).
**SW VERSION → v69 / APP_VERSION → v69.** Bundle: `_upload/inkvoice-app-COMPLETE-v69.zip`
(+.htaccess, 48 files, file set identical to v68). Icons + `?v=65` UNCHANGED.

### 2026-07-26 — 🚀 LAUNCH: marketing page live & indexed by Google
The `inkvoiceapp.com` marketing page is no longer hidden. Deployed and confirmed live.
- **`site/index.html`** — robots meta flipped `noindex,nofollow` → `index, follow,
  max-image-preview:large, …`. The app shell (`index.html` → `/app`) KEEPS `noindex` (intentional).
- **SEO pass**: full Open Graph + Twitter cards; **JSON-LD `@graph`** = `WebSite` +
  `SoftwareApplication` + `FAQPage` (all 8 on-page FAQs mirrored — keep in sync with the visible FAQ).
- **`site/robots.txt`** (Allow all + Sitemap ref) and **`site/sitemap.xml`** added; both live at the
  domain root. `/app` deliberately NOT Disallowed so Google can crawl it and honour its noindex.
- **Google Search Console**: Domain property `inkvoiceapp.com` (DNS-verified), sitemap submitted →
  **Success**, homepage **URL is on Google / Page is indexed**. Verified from CLI that the live
  sitemap/robots return 200 (incl. to the Googlebot UA). Bing Webmaster Tools = optional TODO.
- Also live from earlier this session (site): double-install FAQ, auto-advancing feature slideshow
  with arrows, footer contact email `inkvoice.app@gmail.com`.
- No app-version bump (marketing-site-only change); latest app build stays **v68**.


### 2026-07-25 — v68: EN 16931 / XRechnung e-invoice XML on the web
The web app now generates the e-invoice XML, matching the Android app (which passes the XRechnung
online validator). Previously the web app only printed the B2G fields into the PDF — it produced no
XML at all, so it could never pass an XRechnung test.
- **`js/einvoice.js`** — new. A faithful 1:1 port of the Android `ZugferdGenerator.kt`
  (`~/Documents/APPS/Inkvoice/app/src/main/java/com/example/inkvoice/ZugferdGenerator.kt`): CII
  (`rsm:CrossIndustryInvoice`) syntax, guideline id `…xrechnung_3.0.1`, identical element ORDER,
  namespaces, `0.00` decimal format, XML escaping (incl. `'`→`&apos;`), line-based address parsing
  (line 0 street / 1 city / 2 postcode / 3 country→DE), VAT country-prefixing, IBAN regex out of the
  free-text banking block, seller `DefinedTradeContact` (BR-DE-5), PEPPOL business-process id for B2G.
  Web-specific: the seller VAT comes from the first frozen `taxNumbers[]` entry (Android had a single
  `taxNumber`). Exposes `buildEinvoiceXml`, `einvoiceBlob/Filename`, `openInvoiceXml`, `shareInvoiceXml`.
- **`js/views/list.js`** — tapping a document now routes through `shareDoc()`: with Profile → Advanced
  Sharing ON it offers PDF / XML / Both; OFF keeps the old behaviour (open PDF). Quotation dialog
  unchanged (Edit / View-Share → same chooser).
- **`sw.js`** — `./js/einvoice.js` added to SHELL; CACHE v67→**v68**. **`js/sync.js`** APP_VERSION →v68.
- **Validated**: sample B2G invoice → well-formed XML + all 18 mandatory/expected fields present
  (Java DOM + XPath, mirroring `ZugferdValidator.kt`). Structure is byte-faithful to the Android
  output. NOTE: XRechnung (BR-DE) validity requires a **B2G** invoice — buyer reference, a 4-line
  address (street/city/postcode/country), and an IBAN in the banking field. Run the sample through the
  same online validator that passed for Android for the official green check.
- Bundle: `_upload/inkvoice-app-COMPLETE-v68.zip` (v67 bundle removed).

### 2026-07-25 — v67: German PDF "Zwischensumme" crop fix (label split)
The German line-item column header ("Zwischensumme") was too wide and cropped off the right edge in
some PDF styles. Root cause: one shared `Subtotal` i18n key drove BOTH the per-row column header and
the totals-block label, so German rendered the long word in both spots — and the header (left-aligned
near the page edge, wider than the money values below it) overran the margin.
- **`js/i18n.js`** — split the concept. DE `Subtotal` → **"Summe"** (was "Zwischensumme"); added
  **`Amount`** key: DE **"Betrag"**, ES **"Importe"**, FR **"Montant"**.
- **`js/pdf.js`** — the 4 line-item column headers (all styles) now call `PL('Amount')`; the 4
  totals-block labels keep `PL('Subtotal')`. Totals label is right-aligned so it never cropped.
- Semantics improved: the per-row column is an *amount* (Betrag/Importe/Montant), not a subtotal.
- Verified: `node --check` on both files; translation resolution across EN/DE/ES/FR; bundle contents.
  ES/FR were already correct and are unchanged (their totals stay Subtotal / Sous-total). Not yet
  pixel-verified in a real PDF (no browser here) — "Betrag" (6 chars) is narrower than the money
  values already in that column, so it cannot crop; still worth one on-device eyeball post-deploy.
- Version bumped v66 → **v67** (`sw.js` CACHE + `js/sync.js` APP_VERSION). Bundle:
  `_upload/inkvoice-app-COMPLETE-v67.zip` (47 files, same set as v66).

### 2026-07-18 — v66: APP LANGUAGE (i18n) across the main screens (EN/DE/ES/FR)
Started the language work (the killer differentiator). This is APP language (the UI); INVOICE
language (translating the PDF OUTPUT) is still TODO — see below.
- **`js/i18n.js`** — new. `t('English string')` returns the string in the user's App Language
  (Profile → App Language), falling back to English if untranslated (so wrapping is always safe).
  The DE/ES/FR maps are the REAL human translations reused from the Android `strings.xml`
  (values-de/-es/-fr, 192 keys), keyed by the English text. A small `WEB_TR` supplement adds
  web-only strings (empty states, restore, status Overdue/Cancelled, validation hints…).
  `currentLang()` maps profile.appLanguage (English/German/Spanish/French) → en/de/es/fr.
- **Converted to `t()`:** the bottom tab bar (`app.js`), Home (`dashboard.js`), the invoices/
  quotations list (`list.js` — totals, filter labels [values stay English], radios, doc cards,
  action dialog, delete confirm), Profile (`profile.js` — every field label + buttons), and Create
  (`create.js` — radios, client fields, B2G fields, dates, items, item modal, PDF-style modal).
  create.js imports the translator as `tr` (it already uses `t` locally for compute() totals).
  Language applies on the next render (Save Profile navigates Home → re-render).
- **Verified (Playwright):** tabs/list/profile/create all render correctly in DE (and ES/FR spot-
  checked); English fallback intact; 0 errors, 0 4xx; v66 bundle boots clean. `i18n.js` added to the
  SW SHELL. **SW → v66 / APP_VERSION v66.** Bundle: `_upload/inkvoice-app-COMPLETE-v66.zip` (47 files).
- **INVOICE PDF OUTPUT LANGUAGE — DONE (the differentiator!).** The invoice now renders in its OWN
  frozen `invoiceLanguage`, not the app language. `i18n.t(s, lang)` gained an optional language arg
  + `langCode()`; `pdf.js` imports it as `tr`, sets `_plang = langCode(inv.invoiceLanguage)` in
  `buildPdf`, and a `PL(s)` helper translates every label. All ~56 label literals across the 4 styles
  (Date/Due/From/To/Description/Quantity/Subtotal/Total/Discount/Advance/Balance due/Bank Information/
  Tax) were wrapped. `create.js generate()` now FREEZES `invoiceLanguage` onto the invoice (immutable).
  Fixed: 'To' → 'An'/'Para'/'À' (Android's `to`='Bis'/'Hasta' is the date-range word — overridden in
  WEB_TR); the 'Tax %' label; and LAYOUT — totals labels are now RIGHT-aligned 8pt before the value in
  all 4 styles so long German/Spanish labels ("Zwischensumme:", "Saldo pendiente:") can't collide with
  the amount. **Verified (Playwright + pdftoppm):** German invoices in ALL 4 styles render clean
  (Von:/An:, Steuer, Zwischensumme, Gesamt, Restbetrag, right-aligned, no overflow); English PDF
  unchanged; 0 errors. Screenshots in scratchpad.
- **UI strings — now COMPLETE across the app.** Also wrapped + translated: all create.js validation
  toasts (12), profile.js toasts + restore confirm (11), cards.js (whole screen + share toasts),
  app.js PROFILE_MSG + discard dialog, taxRows() Label/Number placeholders, the storage-full message,
  and the backup-reminder modal. New human DE/ES/FR translations for the ~40 web-only strings live in
  `WEB_TR`/`WEB_TR2`/`WEB_TR3` in i18n.js (merged over the Android map). Verified: full nav across
  every screen in Spanish = 0 errors; German toasts/cards/dialogs all translate.
- **STILL TODO (minor):** `landing.js` (the pre-install page — English; no profile yet, so it'd need
  `navigator.language`); optionally show language names natively in the App/Invoice Language dropdowns
  (currently English words); a full ES/FR PDF visual spot-check (DE verified in all 4 styles). See
  memory `i18n-system`.

### 2026-07-18 — v65: splash logo no longer clipped + Adsterra key for inkvoiceapp.com
- **Startup/splash logo clipped on the edges.** The PWA splash is Chrome-generated from the manifest
  icon + `background_color`. Chrome uses the **"any"** icons (icon-192/512, teal disc at 76% of a
  black square) for the splash and applies its icon mask, which clipped the disc edges. User did NOT
  want the background changed — wanted the LOGO smaller. Fix: shrank the disc in **icon-192 + icon-512
  to 60%** (re-centered on black → generous margin, mask can't clip it). **Left the home-screen icons
  untouched** — `maskable-512` stays 66% (Android home) and `apple-touch-icon` stays 78% (iPhone
  home), so the icons the user liked are unchanged. `background_color` stays `#ffffff` (a brief
  earlier switch to black was reverted per the user). Icon `?v=63`→`?v=65` (manifest + index).
- **Adsterra key** updated to the new `inkvoiceapp.com` unit (website id 5920358, key `c7ac468f…`);
  the old key was for the retired `app.elorate.net`.
- **PRE-LAUNCH: site hidden from search.** Was fully crawlable (no robots.txt, no noindex, and the
  marketing page had full SEO meta). Added `<meta name="robots" content="noindex, nofollow">` to BOTH
  `index.html` (app) and `site/index.html` (marketing). Deliberately NOT using robots.txt Disallow —
  that lets Google list the bare URL and would BLOCK it from seeing the noindex. noindex keeps it out
  of the index while testers can still use it. **TO GO LIVE: remove that one meta line from
  `site/index.html`** (marketing page); the app page (`/app`) can keep noindex permanently.
- **SEO'd the marketing page (`site/index.html`) while hidden.** Verified both claims are REAL in the
  flagship Android app before writing copy: `invoiceLanguage` feeds `PdfGenerator.kt`, and
  `ZugferdGenerator.kt`/`ZugferdValidator.kt` do EN 16931 Factur-X/ZUGFeRD. Changes: new title +
  meta description + OG + keywords injecting the differentiator & e-invoicing terms; a prominent
  **"Invoice in your client's language"** band (reuses `.cta-strip`); the generic "Currencies &
  languages" feature card split into a **language** card + a **B2G/e-invoicing** card (XRechnung /
  Factur-X / ZUGFeRD / EN 16931, "Available in the Android app"); two new FAQ entries (languages,
  e-invoicing) for long-tail keywords. Rebuilt `_upload/inkvoice-welcome-site.zip` (still noindexed).
  ⚠️ **PARITY GAP:** the WEB/iPhone PWA has the invoice-language SELECTOR but doesn't translate output
  yet (progress §8), and has NO e-invoicing XML. The B2G copy says "Android"; the language copy is
  product-level. Before un-hiding, either wire web invoice-language output or keep launch
  Android-primary so iPhone users aren't misled. See memory `prelaunch-seo`.
- **SW → v65 / APP_VERSION v65.** Bundle: `_upload/inkvoice-app-COMPLETE-v65.zip` (+.htaccess, 46
  files). Boots 0 errors/0 4xx. NOTE: Android bakes the splash into the installed WebAPK — the user
  must **reinstall** (remove + re-add) to see the new splash + icon. Marketing page ships separately
  in `_upload/inkvoice-welcome-site.zip` → `public_html/`.


### 2026-07-17 — v64: CRITICAL — "can't create more than 4 invoices" + about:blank + ads
Wife hit a hard wall at 4 documents (5th wouldn't save, then got stuck burning numbers); PDFs opened
about:blank on convert; ads not showing.
- **Bug #1 — max 4 docs (data loss).** ROOT CAUSE: every invoice embeds a full copy of the business
  **logo as uncompressed base64** (`create.js` `logoUri:p.logoUri`), the logo upload did NO
  downscaling (up to 2MB file → ~2.7MB base64), and `store.write` had NO quota handling — so
  localStorage (~5MB) filled after ~4 invoices and the 5th `setItem` threw uncaught. WORSE:
  `generate()` ran `consumeNumber` BEFORE `saveInvoice`, so a failed save BURNED the number (counter
  advanced, doc lost → stuck one number ahead, still failing). Reproduced exactly: 1MB logo →
  **4 saved then STORAGE_FULL**. Fixes: (a) `profile.js shrinkLogo()` downscales the logo to ≤300px
  on upload AND shrinks an oversized stored logo on Save (PNG for transparency, white-flattened JPEG
  for big photos) — measured 291KB→57KB, a real 2MB photo → ~50-80KB, so ~50-150 invoices fit now.
  (b) `saveInvoice` catches the quota error and throws a clean `code:'STORAGE_FULL'`. (c) `generate()`
  saves FIRST, only consumes the number on success, and on failure shows a clear message + keeps the
  number available (no burn). (d) `saveProfile` failure is caught in the UI too.
- **Bug #3 — PDF opens about:blank (esp. on convert / standalone PWA).** `pdf.js openInvoicePdf`
  used `window.open(url,'_blank','noopener')`; the `noopener` flag makes browsers drop the blob: URL
  → about:blank. Removed the flag (kept the null→download fallback).
- **Bug #2 — no ads.** The every-5th-doc ad math is correct (verified: 6 docs → 1 slot). It wasn't
  showing because of Bug #1 — with only ~4 saved docs no list reaches 6, so the slot never renders.
  Fixed by #1. On Android the user DID reach 6 but saw only an empty box — that was his ad blocker /
  Firefox (works in Chrome). Also: the Adsterra ad unit was still keyed to the retired
  `app.elorate.net`; **updated `ads.js` key+invoke to the new `inkvoiceapp.com` unit** (website id
  5920358, key `c7ac468f…`). Ads only FILL once that Adsterra site is Approved + loaded from the
  live domain with no ad blocker.
- **Existing stuck data:** the wife's 4 already-saved invoices still hold big logos, so storage stays
  near-full until she re-saves her Profile (shrinks the profile logo) AND deletes the old test
  invoices (or clears app data) — it's throwaway test data.
- Verified (Playwright): compression drop; quota → clean STORAGE_FULL at 4; number not burned; ad
  slot at 6; no noopener; v64 boots 0 errors/0 4xx. **SW → v64 / APP_VERSION v64.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v64.zip` (+.htaccess, 46 files). Icons + `?v=63` UNCHANGED.


### 2026-07-17 — v63: also — hide bottom bar on Create & Profile (match real Inkvoice)
Checked the Android app (`MainActivity.kt` bottomBar: shown EXCEPT on Profile, Create, privacy;
`CreateInvoiceScreen.kt:721` BackHandler → unconditional "Discard changes?" dialog;
`ProfileScreen.kt:181` BackHandler → just navigates Home, NO confirm). Web now matches:
- `app.js render()` hides `tabbar()` on `/create` and `/profile` (adds `#app.no-tabbar`, CSS trims
  the reserved bottom padding). Shown on Home/Invoices/Quotations/Biz Card.
- **Create** already had (and keeps) the popstate "Discard changes?" guard → confirms on back.
  **Profile** leaves without a prompt (Save Profile persists + navigates Home; logo auto-saves) —
  exactly like Android. NOTE: user asked for confirm on BOTH; the real app only confirms on Create,
  so we matched the real app. Offered to add a Profile confirm (needs dirty-tracking to avoid
  prompting when nothing changed) if they want to deviate.
- Verified (Playwright): bar hidden on Create/Profile, shown elsewhere; Create back → dialog;
  Profile back → no dialog, goes Home; 0 errors. Folded into the v63 bundle.

### 2026-07-17 — v63: bigger Android home-screen icon (maskable disc 59%→66%)
User: the installed web icon looked smaller than the original Android app icon. Measured (teal disc
as % of canvas): original Android ~69% (legacy) / 77% (playstore); web `any`/apple-touch 76-78%
(iPhone — already matches); web **maskable 59%** — the one Android uses for installed PWAs, too
small. v58 had shrunk it to 59% to stop Firefox cropping; that overshot.
- Regenerated `icons/maskable-512.png` from `icon-512.png` scaled so the teal disc is **66%** of the
  512 canvas on opaque black — bigger, closer to the original, still inside the maskable safe zone
  (even with Firefox's ~1.15× adaptive zoom, 66%×1.15≈76% < 80% guaranteed-visible circle → not
  cropped). `any` icons (icon-192/512) + apple-touch UNCHANGED (iPhone already matched).
- Bumped the icon cache-buster **`?v=58`→`?v=63`** in manifest.json + index.html so devices re-mint
  the icon. Per ICON POLICY, users remove+re-add the home-screen icon ONCE to pick it up.
- **Install signal (two parts):** (1) manifest `start_url` → `./?source=homescreen` so home-screen
  OPENS are distinguishable from browser visits in the logs. (2) **Anonymous install COUNTER** —
  `app.js pingInstallOnce()` fires ONE beacon to `installed.txt` the first time the app runs
  standalone, then sets `localStorage inkvoice_install_pinged` so it counts once PER DEVICE, not per
  open. `?app` previews (not standalone) never count. Nothing personal is sent. **Count installs =
  number of `/app/installed.txt` hits in the Hostinger access log.** Added 1-byte `installed.txt` to
  the app root (46 files now). Verified: 1 ping on first standalone load, 0 on reload, 0 for `?app`.
- **SW → v63 / APP_VERSION v63.** Bundle: `_upload/inkvoice-app-COMPLETE-v63.zip` (+.htaccess, 45
  files). Boots 0 pageerrors, all icon URLs 200. See memory `pwa-icon-root-cause`.

### 2026-07-17 — v62: one domain (app under inkvoiceapp.com/app) + tablet support
User: since laptop sync is gone, we don't need the `app.` subdomain — make it one domain. Keep
`inkvoiceapp.com` as the nice welcome page; the app moves under it. Phone OR tablet, no device
sharing.
- **One domain.** The app now lives at **inkvoiceapp.com/app** (files already sit in
  `public_html/app/`, so this is just dropping the `app.inkvoiceapp.com` subdomain alias). The
  marketing welcome page stays at the root. The app is fully relative (`manifest` scope `./`), so it
  works at any subpath — verified serving it under `/app` (manifest scoped to `/app/`, 0 errors).
- **Links repointed.** `site/index.html` "Get the app / Install" CTAs now go to `/app` (was
  `https://app.inkvoiceapp.com`); the app's own install page (`landing.js`) says
  `inkvoiceapp.com/app`. No `app.` subdomain refs remain in shipping code.
- **Tablet support + simpler gating (`app.js`).** Dropped the phone-size/UA sniffing (it was for the
  old sync role detection). New rule: **installed (standalone) OR `?app` → run the app; otherwise →
  the install/welcome page.** So an installed PWA runs on a phone OR a tablet (any size) — verified
  a standalone large/tablet viewport boots the full app, a plain browser tab gets the install page.
- Retiring `app.elorate.net` (legacy GitHub Pages) and the (already-unused) `signal.php`.
- **Verified (Playwright):** app boots at `/app` subpath (tablet viewport) with tab bar + 0 errors;
  standalone large screen → full app; packaged bundle clean. **SW → v62 / APP_VERSION v62.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v62.zip` (+.htaccess, 45 files). Icons + `?v=58` UNCHANGED.
  **Deploy:** app zip → `public_html/app/`; updated `site/` → `public_html/`; then remove the
  `app.inkvoiceapp.com` subdomain in Hostinger (or leave it as a harmless alias).

### 2026-07-17 — v61: PHONE-ONLY launch — laptop connection shelved
User: the laptop connection "just does not work" and blocks launch — strip it for now, ship
phone-only (same as the real Inkvoice), revisit sync in a later update. "We need to launch soon so
we can start making money."
- **Removed the entry points, kept the code.** `app.js`: dropped the `initSyncUI`/`initSyncBridge`
  imports + calls, the `rerenderLive` bridge hook, and the `__route`/`__syncOnNav` nav hook. Gating
  is now 2-way: installed phone (or `?app`/force) → the app; **everything else → the Landing/install
  page** (the old desktop `role:'guest'` 6-digit connect screen is gone). `profile.js`: removed the
  "Connect a device" button, its description, the Unpair and Connection-diagnostics buttons, and
  their handlers. `sync.js`/`syncbridge.js`/`syncui.js` are untouched and remain in the repo +
  `sw.js` SHELL — re-add the app.js imports/calls to bring sync back.
- **No more data-wipe risk:** the guest path (`mountGuestStart`→`guestForgetAll`→`wipeLocalData`) is
  never reached now, and the phone never receives snapshots/ops. The v60 boss-protection guards stay
  in `syncbridge.js` for when sync returns.
- **On-screen version** moved to a plain "Inkvoice v61" line at the bottom of Profile (imports just
  `APP_VERSION` from sync.js — no connection code runs) so deploys can still be verified at a glance.
- **Verified (Playwright):** `?app` boots the full app with NO connect/reconnect/diag buttons and no
  6-digit screen, version "v61" shown; desktop (no `?app`) shows the install page, no sync globals;
  packaged bundle boots 0 pageerrors / 0 4xx. **SW → v61 / APP_VERSION v61.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v61.zip` (+.htaccess, 45 files). Icons + `?v=58` UNCHANGED.

### 2026-07-13 — v60: CRITICAL — the phone (boss) can no longer be reverted by a peer
User (furious): "when I update, my wife's app goes back to the old version — old invoices, old logo,
old numbers… information that shouldn't even be saved." Watched it revert live on update.
- **Root cause (found by exhaustive search):** `syncbridge.js` applied an incoming `snapshot`
  (and any `op`) with **NO role check** — "phone is boss" was only a convention (the SENDER checks
  `role==='host'`; the RECEIVER applied blindly). A single `snapshot` REPLACES the whole dataset
  (invoices + profile/logo + numbers + card) at once — which is exactly the all-at-once revert the
  user saw. Trigger: the app auto-reloads on deploy (`sw.js skipWaiting` + `app.js`
  `controllerchange → location.reload()` = "it updates in front of my eyes"); during that
  reload/reconnect churn a laptop running old/stale cached code (Firefox caches the SW hard) sends a
  snapshot, and the phone applied it → reverted to the laptop's stale copy. No IndexedDB/migration/
  seed involved (ruled out) — the ONLY wholesale-overwrite path is `applySnapshot`.
- **Fix (`syncbridge.js`):** enforce boss-ness at the APPLY layer.
  - Incoming `snapshot` is applied ONLY when `Sync.role === 'guest'` (the laptop mirroring the
    phone). The HOST/phone NEVER accepts a snapshot — its data can only be replaced by itself.
  - Incoming `profile`/`card` ops are IGNORED on the host (logo, business name, currency, numbers,
    branding belong to the phone). `invoice`/`client` ops STILL flow up, so the laptop can create
    documents while connected. The phone's numbering floors on its own saved invoices
    (`maxUsedNumber`), so it stays correct without the guest's counter/profile op.
  - Ignored messages are logged to the on-device diagnostics ("IGNORED incoming snapshot …").
- **Verified (Playwright, `boss.mjs`):** as host, an incoming snapshot AND a profile op leave the
  phone's NEW name/logo untouched, while an invoice op is still accepted (+1); as guest, a snapshot
  is applied (mirror). **SW → v60 / APP_VERSION v60.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v60.zip` (+.htaccess, 45 files). Icons + `?v=58` UNCHANGED.
  ⚠️ Both devices must reach v60 — especially the wife's LAPTOP (Firefox caches the old SW; hard-
  refresh it) — for the guard to take effect on the sending side too. See memory `sync-model`.

### 2026-07-12 → 07-13 — v59: sync reconnect UX, data safety, tax label, deploy discovery
A batch of user-driven fixes. **SW → v59 / APP_VERSION v59.** Bundle:
`_upload/inkvoice-app-COMPLETE-v59.zip` (+.htaccess, 45 files). Icons + `?v=58` UNCHANGED (carries
the v58 maskable fix). Boots 0 pageerrors, all assets 200. **Supersedes the never-deployed v58.**
- **DEPLOY DISCOVERY:** the live server was running v57 — v58 was built but never uploaded. That
  is the real reason the icon "kept breaking": the fix was never on the server. Live-verify curls
  added to the top note. No code fix — a process fix (actually upload + verify the version).
- **Laptop tab-switch grace (`syncui.js`).** The `visibilitychange` handler dropped the link the
  instant the tab was hidden — so switching tabs, or opening a generated PDF in a new tab (which
  backgrounds the app tab), disconnected the laptop. Now: the PHONE still drops instantly (its OS
  suspends the PWA on screen-off), but the GUEST keeps the live link for a **3-minute grace window**
  (`GUEST_HIDDEN_GRACE_MS`) and only drops if you stay away past it. Coming back cancels the drop.
- **Multi-phone selector (`syncui.js`) — the "reverts to last saved version" root cause.** In a 2+
  phone household (Oppo + iPhone) the laptop stored ONE phone's key and auto-reconnected/cross-wired
  to the WRONG phone, pulling its snapshot. NOT version drift (both fresh v58). Fix: the laptop now
  remembers a LIST of phones (`localStorage inkvoice_phones` = `[{key,name}]`; old single PAIR_KEY
  migrates in); `mountPhonePicker()` shows a "Which phone?" SELECTOR; you pick which phone to
  reconnect to (name from the snapshot profile). A NEW phone still needs its code + Accept (security
  kept). On disconnect the laptop wipes its DATA but KEEPS the phone list (easy reconnect). Guest
  `onMessage` saves `{key,name}` on connect. See memory `sync-model` (do NOT make it stateless again
  — an earlier "always type the code" attempt was rejected).
- **Data safety (`store.js`, `app.js`, `profile.js`, `create.js`) — "if I clear Firefox I lose
  everything?"** (1) `requestPersistentStorage()` (`navigator.storage.persist()`) on phone boot so
  the browser won't auto-evict the data. (2) **Restore was MISSING** — Backup Now downloaded a JSON
  that could never be loaded back. Added `importBackup()` + a **"Restore from a backup file"** button
  in Profile (validates the file, confirm before replacing, reloads). Backup now also includes the
  card colour + a dated filename. (3) **Backup reminder every 5 documents** — `noteDocumentCreated()`
  counts docs since last backup; `create.js` shows a "Back up your data 🔒" modal at 5/10/15…; a
  backup (or restore) resets the counter. Verified: reminder fires at 5 & 10, restore round-trips,
  junk files rejected.
- **Colourful tax label under the number (`create.js`, `styles.css`).** When the profile has >1 tax
  number, a coloured label (the tax number's label in its own colour + ▾) now sits directly under
  the invoice/quotation number in the summary card and opens a picker — matches Android
  `CreateInvoiceScreen.kt` (lines ~779-890). Replaced the old plain dropdown-below-the-card. The
  selected number still prints on the PDF. 0/1 tax numbers → nothing extra.
- **Reconnect button only on Profile (`app.js`, `syncui.js`).** The floating "🔗 Reconnect my
  laptop" button was showing on every screen. The router now sets `window.__route` + calls
  `window.__syncOnNav`; `renderPhoneReconnectBtn()` only shows when `window.__route === '/profile'`.
- Verified (Playwright): tax label colour swaps on pick; reconnect btn shows only on Profile
  (Create/Invoices hidden); data-safety suite green; v59 bundle boots 0 pageerrors / 0 4xx.


### 2026-07-12 — v58: maskable icon safe-zone fix (Firefox stops cropping the shape)
User: the Firefox home-screen icon is slightly bigger than the correct one and the outer shape
is cropped. Cause: `maskable-512.png` was IDENTICAL to the `any` icon — a teal disc filling
~80% of the canvas. Firefox/Android treat maskable icons as adaptive icons and zoom them ~1.15×
to fill, cropping the outer ~10-18% → it ate the disc/shape edge. Fix: regenerated
`maskable-512.png` (Pillow) with the disc shrunk to ~59% of the 512 canvas, centered on full
black, so it sits inside the adaptive safe zone (~66%) and can't be cropped. The `any` icons
(icon-192/512) are UNCHANGED (they render correctly). Icon query bumped `?v=54`→`?v=58` in
manifest + index to force a clean re-mint. **SW → v58 / APP_VERSION v58.** Bundle:
`_upload/inkvoice-app-COMPLETE-v58.zip` (+.htaccess). Boots 0 pageerrors; all icon URLs 200
image/png. See memory `pwa-icon-root-cause` (maskable safe-zone note).

### 2026-07-12 — v57: sync = phone is boss, laptop is an ephemeral terminal
User report: batch B (invoices the wife recreated after her data was evicted) vanished after
reconnecting a laptop that still held the old batch A; also her profile "got deleted." Root
cause: the laptop PERSISTED its own copy and could push stale data to the phone (and every
laptop invoice generation pushed the laptop's WHOLE profile via the counter bump, overwriting
the phone's). User's required model: the PHONE is the single source of truth; the laptop is
ONLY a bigger screen to write on, not a second copy.
- **New model:** while connected, share EVERYTHING both ways (unchanged — the phone saves it
  all live). The safety comes from the laptop being EPHEMERAL: it holds no data of its own and
  **wipes all Inkvoice data on disconnect and on startup**, so it can never come back with
  stale data and clobber the phone. "If it's not on the phone, it didn't exist."
- **`store.wipeLocalData()`** — silent (direct `removeItem`, emits NO sync op) clear of
  invoices/profile/clients/card; KEEPS pairing keys for seamless reconnect. Must never run on
  the phone.
- **`syncui.js guestForgetAll()`** = `if(role==='guest') wipeLocalData()`. Called on guest
  startup (`mountGuestStart`), guest disconnect (`onState` closed/error while booted), and
  `forgetPhone`. The phone role never calls it.
- **Safety:** a phone can NEVER reach the guest code path — `app.js` gating sends an installed
  phone to `role:'phone'` and a phone-in-browser to the Landing page; only a non-phone hits
  `role:'guest'`. So the wipe can only touch the laptop.
- **Verified (scratchpad `terminal.mjs`):** laptop (no `?app`, desktop) wipes
  invoices/profile/clients/card on startup but KEEPS its pairing key; the phone (`?app`) keeps
  ALL its data; `wipeLocalData` emits 0 sync ops (can't propagate a delete to the phone). Full
  regression + immutability + numbering + ordering + pdf-flow suites all green; bundle boots 0
  pageerrors. **SW → v57 / APP_VERSION v57.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v57.zip` (+.htaccess). Icons + `?v=54` UNCHANGED. See memory
  `sync-model`.

### 2026-07-12 — v56: invoice/quotation IMMUTABILITY hardened (frozen forever)
User report: a saved N1 (5 items) showed different info after an app update. Requirement: a
document, once created, must NEVER change — not on profile changes (name/currency/address/
tax numbers) nor app updates. Matches Android (snapshots everything into the saved invoice;
its PDF generator reads only the saved invoice).
- **Investigation:** `pdf.js` has NEVER read the live profile (only its `inv` argument),
  `generate()` has snapshotted the business fields since commit 1, and `compute()` never
  changed — so the PDF path was already immutable vs the profile. The real historical cause:
  **before v55, editing an invoice OVERWROTE it and re-snapshotted the CURRENT profile**, so
  editing/regenerating an old invoice after a rebrand stamped it with new data. v55 already
  made editing create a NEW document; v56 hardens the rest.
- **Frozen totals.** `pdf.js` used to RECOMPUTE amounts from items at render (`compute()`),
  so a future formula change would alter old invoices. New `frozenTotals(inv)` renders the
  STORED totals; `generate()` now snapshots the full breakdown (subtotal, discountAmount,
  taxBasis, taxAmount, grandTotal, dueAmount). Legacy docs without them fall back to compute.
- **List currency leak fixed.** `list.js card()` showed each doc's total in the LIVE profile
  currency (`p.currency`); now uses `inv.currency` (the frozen one). Real "changes when you
  change your profile" bug.
- **Snapshot deep-copied.** `generate()` deep-copies `taxNumbers` (items already mapped) so
  no shared reference can mutate a saved doc later.
- **Proof test (scratchpad `immutable.mjs`):** create an invoice, then DRASTICALLY change the
  profile (rebrand + new currency + new tax numbers) → the saved invoice's fields, its totals,
  and its **byte-identical PDF** (ignoring the jsPDF date/ID metadata) are all UNCHANGED; the
  list shows € not the new ¥; editing spawns a new doc and leaves the original untouched.
- **Note:** already-corrupted historical invoices can't be retroactively restored (the
  original profile-at-creation is gone) — but from v56 on they are locked. B2G + advanced
  sharing fields were already snapshotted (buyerReference, departmentArea, clientVatId, due
  date) and are unaffected. UI regression + PDF-flow + ordering + numbering suites all green;
  bundle boots 0 pageerrors. **SW → v56 / APP_VERSION v56.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v56.zip` (+.htaccess). Icons + `?v=54` UNCHANGED. See memory
  `invoice-immutability`.

### 2026-07-12 — v55: numbering (edit=new doc), tax-number picker, date-field overlap
Three fixes, all checked against the Android reference (`CreateInvoiceScreen.kt`).
- **Numbering — editing now creates a NEW document.** Android has NO in-place edit: every
  PDF generation does `invoice.copy(id = UUID.randomUUID())` with the next number
  (`CreateInvoiceScreen.kt:1814`, numbers from `getLastNumber(type)+1`). The web used to
  OVERWRITE when `isEdit`, so editing Q1 kept Q1. Now `fromExisting()` (edit AND duplicate)
  always assigns a fresh `uid()` + `peekNextNumber(type)`, and `generate()` ALWAYS
  `consumeNumber()`. Editing Q1 → generates Q2, Q1 stays, counter increments. Removed the
  v50 `isEdit/origId/origType/convId` in-place-edit + convert bookkeeping (`setType` just
  re-peeks the next number of the chosen type).
- **No repeats — collision-proof numbering.** `store.peekNextNumber` now floors on
  `maxUsedNumber(type)` (highest number among saved docs of that type) as well as the
  profile counter, so a new number can never collide even if the counter drifted from older
  buggy builds. Combined with v52 (list sorts by number desc) this gives correlative numbers
  with the smallest at the BOTTOM for quotations too.
- **Tax-number picker on Create.** Android shows a dropdown when the profile has >1 tax
  number and puts the ONE selected number on the doc (`selectedTaxNumber`,
  `CreateInvoiceScreen.kt:802,1733`). Web: `create.js` renders `#tax-select` (label — number)
  only when `profile.taxNumbers` has >1 entry; `generate()` writes just the chosen entry to
  `inv.taxNumbers` (`selectedTaxNumbers()`), so the PDF prints only that one. 0/1 tax numbers
  → no picker, same as before.
- **Date fields overlapping on small screens.** Native `input[type=date]` carries an
  intrinsic min width and paints its value wider than the box on iOS/Android unless
  `appearance` is reset — so the two side-by-side date fields overlapped. CSS now sets
  `-webkit-appearance:none; appearance:none; min-width:0; width:100%; overflow:hidden` on
  date inputs → they shrink to the column and truncate instead of spilling over (user
  accepted truncation over overlap).
- **Robustness:** `fromExisting()` now defaults the string fields (clientEmail, address, …)
  so editing an older/synced doc that lacks them can't crash `validate()`/`generate()` on
  `.trim()`.
- **Verified (Playwright):** edit-Q1→Q2 (Q1 stays, no repeat); two fresh quotations → Q001,
  Q002; tax picker appears only when >1 and the selected number lands on the doc; date fields
  don't overlap at 320px with appearance reset. UI regression + PDF-flow + ordering suites all
  green; built bundle boots 0 pageerrors. **SW → v55 / APP_VERSION v55.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v55.zip` (+.htaccess). Icons + `?v=54` UNCHANGED.

### 2026-07-12 — v54: REAL PWA-icon root cause found (maskable + immutable caching)
The home-screen icon reverted to the generic Android icon after almost every deploy for many
releases. Every prior "fix" (rename icons v2..v6; v51 "stable filenames + ?v= query") failed
because it chased the wrong cause. **Proof the old theory was wrong:** manifest.json,
index.html icon refs, and the icon files were BYTE-IDENTICAL v51→v53
(`git diff 97233a1 HEAD -- manifest.json index.html .htaccess` = empty) yet the icon still
broke on v53. So "keep the URL stable and it persists" was never it.
- **Defect 1 — broken maskable icon.** manifest declared `icon-192.png` (a full-bleed image,
  NO safe-zone padding) as `purpose:"maskable"`. Android's adaptive-icon mask crops maskable
  icons hard, so a non-safe image renders wrong / drops to the generic icon. **Fix:** the
  maskable slot now uses ONLY `maskable-512.png` (proper maskable art); `icon-192`/`icon-512`
  are `purpose:"any"`. Manifest icon list went 4→3 entries.
- **Defect 2 — fragile icon caching.** `.htaccess` forced `Cache-Control: max-age=0,
  must-revalidate` on all png/ico. `must-revalidate` FORBIDS using the cached icon without a
  successful server round-trip → any offline moment / network blip / server hiccup while the
  OS re-rendered the icon after an update dropped it to generic. **Fix:** icons →
  `max-age=31536000, immutable` (safe because `?v=NN` cache-busts on real art changes). Once
  the device has the icon it never needs the network again.
- **Recovery:** bumped the icon query `?v=51`→`?v=54` (manifest + index) to force a clean
  re-mint so the corrected/immutable icon is fetched fresh. After deploying v54 the user
  should remove + re-add the home-screen shortcut ONCE; subsequent updates must not touch it.
- **Policy (do NOT relitigate):** canonical stable filenames; bump `?v=` ONLY for new art or
  to recover a broken install (decoupled from APP_VERSION); icons `immutable`, manifest
  `must-revalidate`; maskable → maskable-512 only; SW keeps BYPASSING /icons/+manifest (never
  mediate icons via the worker — that caused empty/slow → generic before). Captured in memory
  `pwa-icon-root-cause`.
- **Verified:** manifest valid (3 icons), all icon URLs (with `?v=54`) return 200 image/png;
  built bundle boots 0 pageerrors, 0 4xx. **SW → v54 / APP_VERSION v54.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v54.zip` (+.htaccess).

### 2026-07-11 — v53: no custom in-app PDF viewer — open PDFs straight in the browser
The old `/view` screen faked Android's `PdfViewerActivity` with an `<iframe>`, a custom Share
button, AND the app's bottom tab bar. On phones the iframe can't render a PDF inline (shows a
download placeholder), the bottom menu shouldn't be there, and Share fell back to
`window.open` — so the PDF opened, then opened AGAIN on Share = a confusing double step (worse
on Firefox Android, which can't Web-Share files at all). **User's decision:** on the web
version, for ALL browsers, drop the fake viewer and just show the real PDF in the browser's
own viewer (which has native Share/Save/Print). Users know how to share a PDF from the browser.
- **New `openInvoicePdf(inv)` in `js/pdf.js`:** builds the blob and opens it ONCE in a new
  browser tab (`window.open`), falling back to a download only if the tab is blocked. Must be
  called from a user gesture (it is, in every path below).
- **`create.js` `generate()`:** after saving, calls `openInvoicePdf(inv)` and navigates the
  app to `/invoices` (or `/quotations`) so the just-saved doc is at the top when the user
  switches back. No more `navigate('/view/…')`.
- **`list.js`:** invoice tap → `openInvoicePdf`; quotation "Select Action" → View / Share →
  `openInvoicePdf` (Edit still → `/create?edit=`). Dialog behaviour unchanged.
- **Removed:** `js/views/view.js` (deleted), its `/view` route + `isView`/`/view` special-
  casing in `app.js`, the `/view` entry in `sw.js` SHELL, and the `.pdf-screen/.pdf-topbar/
  .btn-share/.pdf-stage/.pdf-doc` CSS. `shareFile()` stays in `util.js` — still used by the
  **business card** share (`cards.js`), which is unchanged.
- **Consequence (by design):** because the app is an installed standalone PWA, the PDF opens
  in the real browser (a separate tab), NOT inside the app window — that's where the browser's
  Share/Save lives. The invoice is already saved and listed; the user switches back to the app.
- **Verified (Playwright):** invoice tap, quotation View/Share, and Create→Generate each open
  exactly one `blob:` PDF tab (no `/view`, no double); Generate saves +1 invoice and lands on
  `/invoices` with the new doc on top; a legacy `/view/<id>` deep-link no longer crashes
  (falls through to Home). Full UI regression + ordering suites green; built bundle boots 0
  pageerrors, 0 4xx. **SW → v53 / APP_VERSION v53.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v53.zip` (+.htaccess). Icons + `?v=51` UNCHANGED.

### 2026-07-11 — v52: invoice/quotation list ordering fixed (newest at top, by NUMBER)
The lists were "the wrong way around": on any given day the newest document appeared at the
BOTTOM. Root cause — the web sorted by `creationDateMillis` DESC, but that field is
**day-granular** (midnight): same-day documents tie, so the sort fell back to insertion order
(oldest-first). The Android reference does NOT sort by date — it sorts by the **numeric part
of the document number, descending** (`extractNumber("N"/"Q", …)`, `InvoiceListScreen.kt` /
`QuotationListScreen.kt`), so the highest number is always at the top.
- **Fix (`js/views/list.js`):** sort by `docNum(inv)` (integer parsed from `N001`/`Q061`)
  descending, with `creationDateMillis` only as a tiebreaker for equal numbers. Added a small
  `docNum()` helper mirroring Android's `extractNumber()`.
- **Ads were already correct** and left unchanged: `cardsWithAds()` anchors one ad every 5
  documents counted from the OLDEST (bottom) — `below = len-1-i; if(below>0 && below%5===0)` —
  byte-for-byte the same math as Android (`invoicesBelow = size-1-index`). This is Adsterra on
  web (AdMob can't run in a browser), but the placement policy matches.
- **Verified (Playwright):** for 11 invoices the rendered order top→bottom is
  `11, AD, 10,9,8,7,6, AD, 5,4,3,2,1` — i.e. bottom→top `1,2,3,4,5,AD,6,7,8,9,10,AD,11`,
  exactly the user's spec. 4 and 5 docs show no ad; 6 docs show one ad between 5 and 6. The
  full UI regression suite stays green; built bundle boots 0 pageerrors, 0 4xx. **SW → v52 /
  APP_VERSION v52.** Bundle: `_upload/inkvoice-app-COMPLETE-v52.zip` (+.htaccess). Icon files
  and `?v=51` query are UNCHANGED (artwork didn't change — per the ICON POLICY, only bump
  `?v=` when the artwork changes), so the home-screen icon persists across this update.

### 2026-07-11 — v51: PERMANENT icon fix — stable filenames + query cache-bust (stop renaming!)
The icon broke on updates because the "cure" (renaming icon files every release + telling
the user to re-add) was itself the disease: each re-add re-fetched and could hit a stale
cache, and the header fix lived in a HIDDEN `.htaccess` that may never have deployed.
- **Consolidated to canonical, permanent filenames** (`icons/icon-192.png`,
  `icon-512.png`, `maskable-512.png`) holding the final approved artwork (copied from the
  good v5/v6 bytes). Old `-v2..v6` files kept on the server for existing installs; no longer
  referenced.
- **Cache-bust via a fixed `?v=51` query** in manifest.json + index.html (icons + favicon +
  apple-touch), NOT via renames and NOT dependent on `.htaccess`. The query is an ICON
  revision decoupled from APP_VERSION — it stays fixed across releases, so the installed
  icon URL never changes and the home-screen icon persists through updates. Bump `?v=` only
  when the artwork changes. sw.js SHELL updated to canonical names.
- **Verified:** manifest valid, `id` stable (`./`); every manifest icon + HTML-linked icon
  (with `?v=51`) returns 200 `image/png`; app boots 0 pageerrors, 0 4xx. **SW → v51 /
  APP_VERSION v51.** Bundle: `_upload/inkvoice-app-COMPLETE-v51.zip` (+.htaccess).
- **Deploy note:** re-add the icon ONCE after v51; future updates keep it automatically.

### 2026-07-10 — v50: edit-quote→invoice keeps the quote (fixes "2 invoices N1") + share opens file not about:blank
- **Edit a quotation and switch it to an invoice → NEW invoice, quote preserved**
  (`js/views/create.js`). Was: editing kept the SAME `draft.id` and (when converting) the
  old number with `isEdit=true`, so `generate()` OVERWROTE the quotation as an invoice AND
  skipped `consumeNumber` — so the invoice counter never advanced and the next real invoice
  reused the number → the user's "2 invoices N1". Fix: `fromExisting` records
  `origType/origId/origNumber`; `setType` now, for an edited doc, converts to a NEW document
  (fresh `convId` + `peekNextNumber(newType)`, `isEdit=false`) when the type differs from the
  original, and restores in-place editing when switched back. So convert = new invoice with
  the next number, original quote untouched, quote counter intact.
  NOTE: the plain numbering code (`store.js peek/consumeNumber`) was verified CORRECT — the
  duplicate came only from this convert path.
- **Share fallback opens the file, not a blank tab** (`js/util.js shareFile`). When the
  browser can't share files (Firefox Android), it now `window.open(blobURL)` so the actual
  PDF/PNG opens (renders in the browser's viewer to share/save) instead of the `<a download>`
  that popped an about:blank tab in a standalone PWA. Anchor-download only if the pop-up is
  blocked. Toast updated ("Sharing files isn't supported here — opened the … so you can
  share or save it"). Native share sheet path (Chrome) unchanged.
- **Verified** (Playwright): numtest — 10 checks (two invoices N001/N002 correlative, no
  duplicates, convert-quote shows N003 + quote preserved + new invoice, next quote Q002,
  in-place quote edit doesn't spawn a doc); v49 UI suite (16) still green incl. share
  fallback; pairing/unpair regressions green; boot 0 errors. **Test gotcha discovered:** a
  Playwright `addInitScript` seed re-runs inside the blob: PDF iframe (same origin → shares
  localStorage) and resets seeded counters — guard the seed with a flag. **SW → v50 /
  APP_VERSION v50.** Bundle: `_upload/inkvoice-app-COMPLETE-v50.zip` (+.htaccess).

### 2026-07-10 — v49: six UI/behaviour parity fixes
All matched to the Android reference. New reusable helpers in `js/util.js`:
`dialog({title,message,buttons})` (promise-based modal) and `shareFile(file,title)`
(native share sheet with download fallback, gesture-safe).
1. **Quotation list → single-tap "Select Action" dialog** (`js/views/list.js`): tapping a
   quotation opens Edit / View-Share (labels + body text match `QuotationListScreen.kt`).
   Invoices keep tapping straight to the viewer (Android invoices have no Edit). Card body
   now uses `data-open` + a mount handler instead of an inline `onclick`.
2. **Invoice viewer share button** — already top-right (`.pdf-topbar` is space-between); no
   change needed beyond confirming.
3. **"Add at least one item" false error** (`js/views/create.js` `saveItem`): the counter/
   PDF-button used `items.length` but `validate()` needs a non-empty description, so an
   item saved with a blank description looked added but failed. Fix: require a description
   when saving the item (toast + keep modal open otherwise). Now count/button/validation
   agree.
4. **System back → blank, + Create discard dialog** (`js/app.js`): ROOT CAUSE was no
   History API — nav only mutated in-memory state, so system/gesture back exited the SPA.
   Now hash-based History: `navigate()` push/replaceState, a `popstate` handler renders the
   previous route, `startApp()` establishes Home as the base, and the chevron (`goBack()`)
   uses `history.back()`. Leaving `/create` via back (chevron OR system) shows Android's
   "Discard changes?" dialog (exact text) — Cancel stays, Discard leaves.
5. **Biz card centered** (`js/views/cards.js` + `.card-screen`/`.card-center` CSS): card +
   slider + Share button block is now vertically + horizontally centered in the viewport.
6. **Share PDF / Send Card** (`view.js`, `cards.js`): both use the new `shareFile` helper —
   calls `navigator.share({files})` whenever `share` exists (not gated on `canShare`),
   downloads only if share is absent/errors, surfaces a toast on download. Card PNG is now
   PRE-RENDERED on load/colour-change so the Share tap calls `navigator.share`
   synchronously (an `await` before it dropped the gesture → forced-download on Android).
   NOTE: if the user's Android browser is Firefox, Web Share may lack file support → download
   is the only possible outcome there (Chrome supports it) — verify on device.
- **Verified** (Playwright, `?app`, seeded): 16 checks green — quotation dialog + Edit/View
  routes, invoice direct-to-viewer, blank-desc item blocked / with-desc generates, system
  back → discard dialog (Cancel stays / Discard leaves), normal back returns to prior screen
  (not blank), card centered, share download-fallback. Sync pairing/unpair/role regressions
  still green; boot test 0 pageerrors. **SW → v49 / APP_VERSION v49.** Bundle:
  `_upload/inkvoice-app-COMPLETE-v49.zip` (+.htaccess).

### 2026-07-09 — v48: unpair propagates to the other side + Mac-pairing diagnosis
- **Unpair/forget now notifies the connected peer.** Before, unpair on one side left the
  other still showing "Re-Connect" (with a now-invalid key). `js/syncui.js`: `unpairPhone`
  and `forgetPhone` gained a `propagate` param — when connected they `Sync.send({t:'unpair'})`,
  clear their OWN pairing state IMMEDIATELY (so a 'closed' event in the gap can't
  re-advertise/re-show the button), then tear down 250ms later to let the message flush.
  New onMessage handlers: phone `{t:'unpair'}` → `unpairPhone(false)`, guest `{t:'unpair'}`
  → `forgetPhone(false)` (no echo). Verified (Playwright 2-context, mock signaler):
  phone-unpair → laptop drops to the CODE screen (not Re-Connect) + both keys cleared;
  laptop-forget → phone HAS_PAIRED cleared + reconnect button gone; pairing regression
  still green. (Caveat: only propagates while connected — an unpair done offline can't
  tell the other side; acceptable.)
- **Mac pairing (diagnosis only, no code change):** user reports Linux laptop pairs with
  both phones, but neither phone pairs to the wife's Mac on Safari OR Firefox. Two browsers
  failing on one machine points to macOS **Local Network privacy** (Sonoma+) blocking the
  browser's LAN access, and/or the macOS firewall — not an app bug (pure LAN P2P, STUN-only,
  no TURN, so a blocked LAN has no fallback). Advised: enable Local Network for the browser.
- **SW → v48 / APP_VERSION v48.** Bundle: `_upload/inkvoice-app-COMPLETE-v48.zip` (+.htaccess).

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
