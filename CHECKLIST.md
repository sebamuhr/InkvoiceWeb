# Inkvoice Web — Handoff Checklist

> Quick actionable status so work can continue in a new window. Full detail lives in
> `progress.md` (changelog, top build note) and the memory files. Latest build: **v68**.

---

## 🟢 Where things are

- **App = phone/tablet only, one domain.** Runs at **inkvoiceapp.com/app** (files in
  `public_html/app/`). Marketing/welcome page at **inkvoiceapp.com** (`site/` → `public_html/`).
  The `app.inkvoiceapp.com` subdomain is being retired.
- **Laptop sync is SHELVED** (removed from the UI; code kept in repo). App is offline, on-device only.
- **🚀 LAUNCHED (2026-07-26): the marketing page is LIVE & indexed by Google** (`index,follow` +
  JSON-LD + robots.txt + sitemap.xml; GSC Domain property verified, sitemap Success, page indexed).
  The **app page `/app` KEEPS `noindex`** permanently — that's intentional, do not change it.
- Latest built bundle: **`_upload/inkvoice-app-COMPLETE-v68.zip`** (app) and
  **`_upload/inkvoice-welcome-site.zip`** (marketing). Both are built but may not be deployed yet.

## ✅ Done recently (v58 → v68, mostly UNDEPLOYED — verify what's live)

- v58 icon fix · v59 laptop-grace · v60 boss-protection · v61 phone-only · v62 one-domain+tablet ·
  v63 bigger home icon · v64 **CRITICAL "can't make >4 invoices"** (logo compression + quota + number
  burn) + about:blank fix + Adsterra key · v65 splash logo (shrank "any" icons) · v66 **app language
  (EN/DE/ES/FR) across the whole UI + invoice PDF output language in all 4 styles** · v67 **German PDF
  "Zwischensumme" crop fix** — split the shared `Subtotal` key: line-item column header now `Amount`
  (Betrag / Importe / Montant), totals label now `Summe` (DE). ES/FR verified unchanged & correct. ·
  v68 **e-invoicing XML on WEB** (`js/einvoice.js`) — faithful port of the Android `ZugferdGenerator`
  (EN 16931 / XRechnung CII, the version that passes the online validator). Wired to "Share XML" /
  "Both PDF & XML" via the Profile → Advanced Sharing toggle. XRechnung-valid for **B2G** invoices
  (buyer reference + 4-line address + IBAN). Sample validated well-formed + all mandatory fields.

---

## 1. DEPLOY (do this to get v68 live)

- [ ] Upload **`_upload/inkvoice-app-COMPLETE-v68.zip`** → extract into `public_html/app/` (over the
      top; don't empty the folder). 47 files incl. `.htaccess`, `installed.txt`, `js/i18n.js`.
- [ ] Upload **`_upload/inkvoice-welcome-site.zip`** → extract into `public_html/` (the welcome page,
      SEO'd + noindexed; its install links point to `/app`). Do NOT delete `public_html/app/`.
- [ ] **Verify it landed** (before trusting it):
      `curl -s https://inkvoiceapp.com/app/js/sync.js | grep APP_VERSION` → must say **v68**.
      `curl -s https://inkvoiceapp.com/app/manifest.json | grep maskable` → `?v=65`.
- [ ] On the phone: **remove + re-add the home-screen icon ONCE** (Android bakes the icon + splash
      into the installed app; reinstall is the only way to pick up the new icon/splash).
- [ ] (Optional) Retire the `app.inkvoiceapp.com` subdomain in Hostinger, or leave it as an alias.
- [ ] Ads only FILL once the Adsterra site `inkvoiceapp.com` is **Approved**, loaded from the live
      domain, with no ad blocker (test in Chrome).

## 2. REMAINING DEV WORK (small, optional)

- [ ] `js/views/landing.js` (pre-install page) is still English — no profile exists yet, so translate
      it via `navigator.language` if desired.
- [ ] Show language names natively ("Deutsch / Español / Français") in the App/Invoice Language
      dropdowns instead of English words. (Keep the stored VALUE English — see i18n gotchas.)
- [ ] Visual spot-check of **ES/FR** invoice PDFs (German verified clean in all 4 styles; v67 header
      is now "Importe"/"Montant" — a quick on-device eyeball of the ES/FR PDF header fit is still open).
- [ ] Wife's stuck test data (if any): re-save Profile (shrinks the logo) + delete old test invoices,
      or clear app data — the v64 fix prevents it recurring.

## 3. LAUNCH GATE — ✅ DONE (2026-07-26)

- [x] SEO copy matches reality (invoice-language + e-invoicing now true on web/Android).
- [x] **Removed the noindex from `site/index.html`** → marketing page is live/indexable.
      (The app page `/app` keeps noindex permanently.)
- [x] Added `sitemap.xml` + `robots.txt`; submitted sitemap to Google Search Console → **Success**;
      homepage **indexed**.
- [ ] Optional TODO: Bing Webmaster Tools (imports from GSC); a content/blog section for high-intent
      keywords (e.g. "XRechnung kostenlos erstellen").

---

## Key reminders / gotchas

- **Never ship a partial zip** — always the COMPLETE bundle (memory `deploy-complete-bundle`).
- **localStorage logo bloat** — every invoice embeds the logo; keep it compressed + quota-safe or the
  app caps at ~4 invoices (memory `localstorage-logo-bloat`).
- **Phone is boss** — the sync bridge guards against a peer overwriting the phone's data (memory
  `sync-model`, `invoice-immutability`) — even though sync is shelved.
- **i18n** — `t('English string')` (app language) / `t(str, lang)` for the invoice PDF; add web-only
  strings to `WEB_TR*` in `js/i18n.js` (memory `i18n-system`). `create.js`/`pdf.js`/`cards.js` import
  the translator as `tr` (they use `t` locally). Invoice PDF "To" = An/Para/À (NOT Bis/Hasta).
- **On-screen version** is on the Profile screen ("Inkvoice v66") — use it to confirm a deploy landed.

## Read next

- `progress.md` → §9 Changelog (newest first) has the full story of each version.
- Memory dir: `deploy-complete-bundle`, `pwa-icon-root-cause`, `invoice-immutability`, `sync-model`,
  `localstorage-logo-bloat`, `prelaunch-seo`, `i18n-system`.
