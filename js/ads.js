// ===== Inkvoice web ads (Invoices / Quotations tabs) =====
// The Android app uses AdMob, which is a mobile-SDK product and CANNOT run on the
// web / PWA. On the web the equivalent is a *script-tag* ad network — Monetag,
// Adsterra, Google AdSense, etc. This module renders one unobtrusive banner slot.
//
// Important trade-offs (by design this app is offline + private):
//  - Ads need a network, so they only show when ONLINE. Offline the app still works
//    fully and simply shows nothing here.
//  - A third-party ad script loads remote code and can see the visitor's IP /
//    behaviour. Invoice data stays on-device (localStorage) and is never exposed,
//    but running ads does soften the "no tracking" promise — your call.
//
// HOW TO TURN ON (Monetag):
//  1. monetag.com → add your site → create a zone. For an in-tab banner pick
//     "Banner 300x250" (or "In-Page Push"). Monetag gives you a code snippet.
//  2. Paste that snippet into `adHtml` below and set `enabled: true`.
//  (Adsterra / AdSense work the same way — paste their unit snippet into adHtml.)
//
// This same snippet is rendered in EACH slot: the Invoices/Quotations lists show
// one ad after every 5th document (5, 10, 15…), so the ad count grows with the
// list. Most banner networks fill repeated placements fine; if yours needs a
// unique element id per placement, use the `slotIndex` passed to mountAdSlot.

export const AD_CONFIG = {
  enabled: false,
  // Paste the EXACT snippet your ad network gives you (may include <script>).
  adHtml: '',
};

export function mountAdSlot(container, slotIndex = 0){
  if(!container) return;
  // Show nothing at all unless a real ad tag is configured AND we're online.
  if(!AD_CONFIG.enabled || !AD_CONFIG.adHtml.trim() || !navigator.onLine){
    container.remove();
    return;
  }
  container.innerHTML = '<div class="ad-label">Advertisement</div><div class="ad-body"></div>';
  const body = container.querySelector('.ad-body');
  // An ad failure must never break the app. `{SLOT}` in adHtml → this slot's index,
  // so a snippet can build unique element ids across the repeated placements.
  try{ injectHtml(body, AD_CONFIG.adHtml.replace(/\{SLOT\}/g, slotIndex)); }
  catch{ container.remove(); }
}

// innerHTML does not execute <script>, so re-create any script nodes.
function injectHtml(target, html){
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    for(const a of old.attributes) s.setAttribute(a.name, a.value);
    s.text = old.textContent;
    old.replaceWith(s);
  });
  target.appendChild(tpl.content);
}
