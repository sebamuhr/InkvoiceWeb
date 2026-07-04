// ===== Inkvoice web ads (Invoices / Quotations tabs) =====
// The Android app monetises with a single AdMob 320x50 banner shown after every 5th
// document. AdMob is a native SDK and cannot run on the web, so the web build uses the
// equivalent script-tag banner — an Adsterra 320x50 unit — in the same spots.
//
// Behaviour (offline-first, private — by design):
//  - Ads need the network, so they show ONLY when online. Offline the app works fully
//    and simply shows nothing here. Invoice/client data never leaves the device.
//  - Each banner runs inside its OWN iframe (srcdoc). Adsterra's snippet configures a
//    GLOBAL `atOptions`, so several banners on one page would otherwise clash and only
//    one would render; the isolated iframe gives every placement its own document.
//
// To change the ad unit: replace `key` + `invoke` (from Adsterra → your banner's code).
// To turn ads off entirely: set `enabled: false`.

export const AD_CONFIG = {
  enabled: true,
  // Adsterra 320x50 banner — matches the Android AdSize.BANNER unit.
  key: '5df1a997b75b756b71ad4dd516f4e5c4',
  width: 320,
  height: 50,
  invoke: 'https://www.highperformanceformat.com/5df1a997b75b756b71ad4dd516f4e5c4/invoke.js',
};

export function mountAdSlot(container){
  if(!container) return;
  // Render nothing unless ads are enabled AND we're online.
  if(!AD_CONFIG.enabled || !navigator.onLine){ container.remove(); return; }

  const { key, width, height, invoke } = AD_CONFIG;
  container.innerHTML = '<div class="ad-label">Advertisement</div>';

  const frame = document.createElement('iframe');
  frame.className = 'ad-frame';
  frame.width = width; frame.height = height;
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('frameborder', '0');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'Advertisement';
  // Own document per banner → own `atOptions`, so multiple banners coexist.
  frame.srcdoc =
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
    '<script>window.atOptions=' + JSON.stringify({ key, format: 'iframe', height, width, params: {} }) + ';<\/script>' +
    '<script src="' + invoke + '"><\/script>' +
    '</body></html>';
  container.appendChild(frame);
}
