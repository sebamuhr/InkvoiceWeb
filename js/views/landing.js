// Shown when Inkvoice is opened in a normal browser tab (desktop or phone).
// The full app runs only when launched as an installed PWA (see app.js). This keeps
// Inkvoice a phone app: visitors get an install page, not a second un-synced copy.

const shareGlyph = `<svg class="ios-share" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;

export function html(){
  return `<div class="landing">
    <div class="landing-inner">
      <div class="landing-mark">Inkvoice.</div>
      <p class="landing-tag">Professional invoices, quotes &amp; business cards — created right on your iPhone, and fully offline.</p>

      <div class="landing-card">
        <h2>Add Inkvoice to your iPhone</h2>
        <ol class="landing-steps">
          <li>Open <b>app.inkvoiceapp.com</b> in <b>Safari</b> on your iPhone.</li>
          <li>Tap the <b>Share</b> button ${shareGlyph} in Safari's toolbar.</li>
          <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
          <li>Open <b>Inkvoice</b> from your Home Screen — that's it.</li>
        </ol>
      </div>

      <p class="landing-note">Inkvoice is made for your phone and works with no internet. Your invoices and clients stay on your device.</p>
      <p class="landing-android">On Android: open this page in Chrome, then menu (⋮) → <b>Install app</b> / <b>Add to Home screen</b>.</p>
    </div>
  </div>`;
}
