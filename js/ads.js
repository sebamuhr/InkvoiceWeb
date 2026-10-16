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
  // Registered under the website inkvoiceapp.com (id 5920358). The old key was for the
  // retired app.elorate.net domain and would not serve on the new one.
  key: 'c7ac468ffdb4c6428f6faa1ffa6d5048',
  width: 320,
  height: 50,
  invoke: 'https://www.highperformanceformat.com/c7ac468ffdb4c6428f6faa1ffa6d5048/invoke.js',
};

// Diagnostic mode (see mountAdSlot). Toggled by tapping the version line in Profile 5×
// (works inside the installed iPhone app, whose storage is separate from Safari's), or by
// opening the app with `?addebug` / `?addebug=0`.
const DEBUG_KEY = 'inkvoice.adDebug';
export function adDebugOn(){
  try {
    const m = /[?&]addebug(=0)?/.exec(location.search);
    if (m) localStorage.setItem(DEBUG_KEY, m[1] ? '' : '1');
    return localStorage.getItem(DEBUG_KEY) === '1';
  } catch { return false; }
}
export function toggleAdDebug(){
  const on = !adDebugOn();
  try { localStorage.setItem(DEBUG_KEY, on ? '1' : ''); } catch {}
  return on;
}

export function mountAdSlot(container){
  if(!container) return;
  const debug = adDebugOn();
  // Render nothing unless ads are enabled AND we're online.
  if(!AD_CONFIG.enabled || (!navigator.onLine && !debug)){ container.remove(); return; }

  const { key, width, height, invoke } = AD_CONFIG;
  // The slot is VISIBLE, at its real 320x50 size, from the very start.
  // v69/v70 kept it display:none until an ad arrived — but a display:none iframe measures
  // 0x0, and Adsterra's script (and the ad page it loads) records the frame's size/visibility
  // to filter out fraud. An invisible slot is never served, so the wait for a fill could
  // never end: no ads on ANY phone. Ads last worked (Aug 2026) when the slot was visible.
  // We still collapse the slot when nothing arrives (blocked network / no ad) — see below.
  container.innerHTML = '<div class="ad-label">Advertisement</div>';
  const label = container.firstChild;

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
    // onload/onerror flags tell "ad server blocked/unreachable" (collapse at once) apart
    // from "script arrived, ad still on its way" (keep waiting).
    '<script src="' + invoke + '" onload="window.__adScript=\'loaded\'" onerror="window.__adScript=\'error\'"><\/script>' +
    '</body></html>';
  container.appendChild(frame);

  // Watch for the fill. The srcdoc document inherits our origin, so we can look inside it:
  // our own markup is only <script> tags, so any visual element is the ad network's.
  // Give up after 20s (slow 3G needs the time) or immediately if the script failed to load.
  const started = Date.now();
  const LIMIT = 20000;
  const check = setInterval(() => {
    let filled = false, state = 'pending';
    try {
      const win = frame.contentWindow, doc = frame.contentDocument;
      state = (win && win.__adScript) || 'pending';
      filled = !!doc && !!doc.querySelector('iframe, ins, img, a, div, object, embed, video, canvas');
    } catch { filled = true; state = 'cross-origin'; } // ad network took the frame over => filled
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (debug) label.textContent = `Ad debug · script: ${state} · filled: ${filled} · ${secs}s · online: ${navigator.onLine}`;
    if (filled) { clearInterval(check); return; }
    if (state === 'error' || Date.now() - started > LIMIT) {
      clearInterval(check);
      if (!debug) container.remove();
    }
  }, 500);
}
