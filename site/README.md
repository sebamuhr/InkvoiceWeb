# Inkvoice — marketing site

A static marketing/landing page for Inkvoice, kept inside the **InkvoiceWeb** repo
under `site/`. The app itself (the installable PWA) is served from the repo root at
**app.elorate.net**; this folder is the polished "download it" page with a Google
Play link and iPhone install directions.

## Structure
```
site/
├─ index.html          # the whole page (invoice mockups are inline HTML/CSS)
├─ css/styles.css      # styles (theme-aware light/dark, responsive)
└─ icons/              # brand icons / favicon
```

## Two things to edit before/after launch
1. **Google Play URL** — currently
   `https://play.google.com/store/apps/details?id=com.elorate.invoicefree`.
   It appears in `index.html` in a few places (search for `play.google.com`). If the
   app isn't public yet, that link 404s until it goes live.
2. **Canonical domain** — the placeholder is `inkvoice.example`. Search `index.html`
   and replace it with the real URL once decided.

The iPhone install steps point at **app.elorate.net** (the live PWA) — leave as-is.

## Where it's served
Because it lives in the InkvoiceWeb repo, GitHub Pages serves it at
**app.elorate.net/site/**. If you later want it on its own purchased domain, either
move this folder to a separate repo/host, or make it the repo root and move the app
under a subpath (one GitHub Pages site = one domain per repo).

Locally: with a server running at the repo root, open `/site/`
(e.g. `python3 -m http.server` → http://localhost:8000/site/).
