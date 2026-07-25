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
