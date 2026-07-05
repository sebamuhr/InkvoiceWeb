// ===== Inkvoice — sync UI (pairing + auto-reconnect) =====
//
// FIRST pairing: phone shows a 6-digit code, laptop types it, phone taps Accept.
//   On success the phone hands the laptop a persistent secret DEVICE KEY.
// AFTER that: the laptop remembers the key and silently rejoins whenever the
//   phone is back — no code, no prompt. The phone, once it has paired at least
//   once, quietly re-advertises under its device key while idle and auto-accepts
//   a peer that knows the key (knowing the long secret IS the trust).

import { Sync, SyncLog } from './sync.js';
import { toast } from './util.js';

const DEVICE_KEY = 'inkvoice_device_id';   // phone: our stable secret room key
const PAIR_KEY   = 'inkvoice_pair_key';    // laptop: the phone's device key we paired with
const HAS_PAIRED = 'inkvoice_has_paired';  // phone: have we ever completed a pairing?
const MODE_KEY   = 'inkvoice_mode';        // phone: 'hub' (locked, laptop is active) | 'solo' (this phone is active)

// Mutual exclusion — only ONE device may be used at a time (else two people edit
// the same books and numbering collides). In 'hub' mode the phone is the data host
// but its own screen is locked ("in use on your laptop") and it advertises for the
// laptop; in 'solo' mode the phone is the active editor and does NOT advertise, so
// the laptop stays disconnected until the phone hands control back.
const getMode = () => localStorage.getItem(MODE_KEY) || 'solo';
const setMode = m => localStorage.setItem(MODE_KEY, m);
let soloNote = '';                          // guest: reason shown on the reconnect screen

let role = 'phone';
let bootApp = () => {};
let appEl = null;
let booted = false;        // guest: is the full app currently shown?
let advertising = false;   // phone: a background reconnect offer is standing
let manualMode = false;    // phone: the manual "Connect a device" modal is active
let reconnectToken = 0;    // guest: bumps to cancel a running reconnect loop

const $ = id => document.getElementById(id);
const elFrom = html => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const removeEl = id => { const e = $(id); if (e) e.remove(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Screen Wake Lock — a phone's screen turning off is the #1 reason the OS
// suspends the PWA and drops the link. Hold the screen awake ONLY while a device
// is actively connected (to save battery), and re-acquire it when the app comes
// back to the foreground (the lock auto-releases whenever the page is hidden).
let wakeLock = null;
async function acquireWake() {
  try {
    if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {}
}
async function releaseWake() { try { const w = wakeLock; wakeLock = null; if (w) await w.release(); } catch {} }

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
const getPairKey = () => localStorage.getItem(PAIR_KEY) || '';
const setPairKey = k => { if (k) localStorage.setItem(PAIR_KEY, k); };

// ---------------- PHONE: "Connect a device" modal (first pairing) ----------------
export async function openHostModal() {
  manualMode = true; advertising = false;      // pause background reconnect while pairing a new device
  removeEl('sync-modal');
  document.body.appendChild(elFrom(`
    <div class="modal-overlay" id="sync-modal"><div class="modal">
      <h3 style="margin:0 0 12px">Connect a device</h3>
      <div id="sync-body" class="sync-body"></div>
      <button class="btn ghost block" id="sync-close" style="margin-top:14px">Close</button>
    </div></div>`));
  $('sync-close').onclick = () => {
    if (Sync.state !== 'connected') Sync.disconnect();
    removeEl('sync-modal');
    manualMode = false;
    setTimeout(() => { advertiseTick(); renderHub(); }, 800);   // resume hub advertising / lock screen
  };
  hostBody('starting');
  try {
    const code = await Sync.host();            // random 6-digit, needs human Accept
    hostBody('waiting', { code });
  } catch {
    hostBody('error', { msg: 'Could not reach the pairing server. Check your connection and try again.' });
  }
}

function hostBody(kind, data = {}) {
  const body = $('sync-body'); if (!body) return;
  if (kind === 'starting') {
    body.innerHTML = `<div class="sync-note muted">Starting…</div>`;
  } else if (kind === 'waiting') {
    body.innerHTML = `
      <div class="sync-note">On your other device, open Inkvoice and enter this code:</div>
      <div class="sync-code">${data.code}</div>
      <div class="sync-note muted">Waiting for a device to connect…</div>`;
  } else if (kind === 'accept') {
    body.innerHTML = `
      <div class="sync-note"><b>A device wants to connect.</b><br>Only accept if this is your own device.</div>
      <div class="two" style="margin-top:14px">
        <button class="btn ghost" id="sync-reject">Reject</button>
        <button class="btn" id="sync-accept">Accept</button></div>`;
    $('sync-accept').onclick = () => Sync.accept();
    $('sync-reject').onclick = () => Sync.reject();
  } else if (kind === 'error') {
    body.innerHTML = `<div class="sync-note">${data.msg || 'Something went wrong.'}</div>`;
  }
}

// The "hub" lock screen. While the phone is in HUB mode the laptop is the active
// device, so the phone locks itself behind this screen (a mostly-black page also
// looks dim and saves OLED power). It shows whether the laptop is connected or
// still linking, and the ONE way off it: "Use this phone instead" (which hands
// control back to the phone and disconnects the laptop). No tap-to-dismiss —
// dismissing would let both devices be edited at once.
function renderHub() {
  if (role !== 'phone') return;
  if (getMode() !== 'hub') { removeEl('sync-hub'); return; }
  const connected = Sync.state === 'connected';
  let hub = $('sync-hub');
  if (!hub) { hub = elFrom(`<div id="sync-hub" class="sync-hub"></div>`); document.body.appendChild(hub); }
  hub.innerHTML = `
    <div class="hub-dot${connected ? '' : ' waiting'}"></div>
    <div class="hub-title">${connected ? 'In use on your laptop' : 'Waiting for your laptop…'}</div>
    <div class="hub-sub">${connected
      ? 'This phone is the hub. Work on your laptop — keep this open on the same Wi-Fi.'
      : 'Open Inkvoice on your laptop (same Wi-Fi). It reconnects on its own — no code needed.'}</div>
    <div class="hub-warn">Use <b>either</b> your phone or your laptop — never both at once.</div>
    <button class="btn block" id="hub-reclaim" style="max-width:320px;margin-top:18px">Use this phone instead</button>
    <button class="btn ghost block" id="hub-newdev" style="max-width:320px;margin-top:10px">Pair a different device</button>
    <button class="btn ghost block" id="hub-unpair" style="max-width:320px;margin-top:10px">Unpair / forget laptop</button>
    ${diagLink}`;
  $('hub-reclaim').onclick = reclaimPhone;
  $('hub-newdev').onclick = () => { removeEl('sync-hub'); openHostModal(); };
  $('hub-unpair').onclick = unpairPhone;
  wireDiag();
}

// Hand control to THIS phone: stop being a hub, drop the laptop, become the active
// editor. The phone stops advertising so the laptop can't silently grab it back.
function reclaimPhone() {
  setMode('solo');
  advertising = false;
  try { Sync.send({ t: 'solo' }); } catch {}   // tell the laptop why it's about to drop
  Sync.disconnect();
  removeEl('sync-hub'); removeEl('sync-modal');
  toast('Using this phone — laptop disconnected');
}

// PHONE: the laptop pressed "Re-Connect" and joined our standing offer → ask the
// user to confirm (no code — knowing the device key is the trust). Sits above the
// hub lock screen (z-index).
function showReconnectAccept() {
  if ($('sync-modal') || $('sync-accept-modal')) return;
  const el = elFrom(`
    <div class="modal-overlay" id="sync-accept-modal" style="z-index:500"><div class="modal">
      <h3 style="margin:0 0 10px">🔗 Reconnect your laptop?</h3>
      <div class="sync-note">Your laptop is asking to reconnect over Wi-Fi. Only accept if it's your own device.</div>
      <div class="two" style="margin-top:16px">
        <button class="btn ghost" id="ra-reject">Not now</button>
        <button class="btn" id="ra-accept">Accept</button></div>
    </div></div>`);
  document.body.appendChild(el);
  $('ra-accept').onclick = () => { Sync.accept(); removeEl('sync-accept-modal'); };
  $('ra-reject').onclick = () => { Sync.reject(); removeEl('sync-accept-modal'); };
}

// Hand control back to the laptop: become a hub again and start advertising so the
// laptop's next "Re-Connect" can find us.
function resumeLaptop() {
  SyncLog.add('[ui] resumeLaptop → hub mode, advertising');
  setMode('hub');
  advertising = false;
  manualMode = false;
  renderHub();
  setTimeout(advertiseTick, 100);
}

// PHONE: fully unpair — forget the laptop and start clean. New device key means any
// old laptop must pair again from a fresh code.
function unpairPhone() {
  SyncLog.add('[ui] unpair phone (forget laptop, new device key)');
  Sync.disconnect();
  advertising = false;
  setMode('solo');
  localStorage.removeItem(HAS_PAIRED);
  localStorage.removeItem(DEVICE_KEY);   // regenerate a fresh secret next pairing
  removeEl('sync-hub'); removeEl('sync-modal');
  toast('Device unpaired — start a new connection any time');
}

// LAPTOP: forget the phone we paired with → back to a clean "enter a code" screen.
function forgetPhone() {
  SyncLog.add('[ui] forget phone (clear pair key)');
  reconnectToken++;                      // stop any running reconnect loop
  Sync.disconnect();
  localStorage.removeItem(PAIR_KEY);
  booted = false;
  mountConnectScreen(appEl, 'Forgotten. Enter a fresh code from your phone to connect again.');
}

// On-device diagnostics — a live view of what the connection is doing, so issues on
// a real phone/laptop can be read (and shared) without a computer or dev tools.
function showDiag() {
  removeEl('sync-diag');
  const el = elFrom(`
    <div class="modal-overlay" id="sync-diag" style="z-index:600"><div class="modal" style="max-width:560px">
      <h3 style="margin:0 0 8px">Connection diagnostics</h3>
      <div class="sync-note muted" style="margin-bottom:8px">Newest at the bottom. Screenshot or copy this if something won't connect.</div>
      <pre id="diag-log" style="background:#0d0d0d;color:#b7d3b7;font-size:11px;line-height:1.45;padding:10px;border-radius:8px;max-height:46vh;overflow:auto;white-space:pre-wrap;word-break:break-word"></pre>
      <div class="two" style="margin-top:12px">
        <button class="btn ghost" id="diag-copy">Copy</button>
        <button class="btn ghost" id="diag-clear">Clear</button>
      </div>
      <button class="btn block" id="diag-close" style="margin-top:10px">Close</button>
    </div></div>`);
  document.body.appendChild(el);
  const pre = $('diag-log');
  const paint = () => { if (!$('diag-log')) return; pre.textContent = SyncLog.text() || '(nothing logged yet)'; pre.scrollTop = pre.scrollHeight; };
  paint();
  const off = SyncLog.onChange(paint);
  $('diag-copy').onclick = () => { navigator.clipboard?.writeText(SyncLog.text()).then(() => toast('Log copied'), () => {}); };
  $('diag-clear').onclick = () => SyncLog.clear();
  $('diag-close').onclick = () => { off(); removeEl('sync-diag'); };
}
const diagLink = '<button class="linkbtn cs-diag" id="cs-diag" style="margin-top:14px;opacity:.6;font-size:12px">Connection diagnostics</button>';
function wireDiag() { const b = $('cs-diag'); if (b) b.onclick = showDiag; }

// ---------------- PHONE: background reconnect advertising ----------------
function canAdvertise() {
  return role === 'phone' && getMode() === 'hub' && !manualMode
    && document.visibilityState === 'visible'
    && ['idle', 'closed', 'error'].includes(Sync.state);
}
async function advertiseTick() {
  if (advertising || !canAdvertise()) return;
  advertising = true;
  // Stand a "reconnect" offer under our device key. When the laptop presses
  // Re-Connect it joins this offer and the phone asks the user to confirm (no
  // auto-accept — reconnection is a deliberate action on both devices).
  try { await Sync.host({ code: deviceId(), autoAccept: false }); } catch {}
}

// ---------------- LAPTOP/TABLET: entry point ----------------
export function mountGuestStart(container) {
  appEl = container;
  if (getPairKey()) startGuestReconnect(container);   // been here before → Re-Connect button
  else mountConnectScreen(container);                  // first time → type a code
}

// First-time (or "enter a code instead") manual connect screen.
export function mountConnectScreen(container, note = '') {
  appEl = container; booted = false; reconnectToken++;   // cancel any reconnect loop
  container.innerHTML = `
    <div class="connect-screen">
      <div class="cs-brand">Inkvoice<span style="color:var(--accent,#f4a52b)">.</span></div>
      <h1>Connect to your phone</h1>
      <p class="cs-lede">Your data lives on your phone. On your phone open <b>Inkvoice → Profile → Connect a device</b>, then type the 6-digit code below.</p>
      <input id="cc-code" class="cc-input" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="––––––" aria-label="6-digit code">
      <button class="btn block" id="cc-go" style="max-width:320px">Connect</button>
      <div id="cc-status" class="cs-status">${note}</div>
      <p class="cs-foot">Both devices must be on the same Wi-Fi. Data stays on your devices — the connection is peer-to-peer.</p>
      ${diagLink}
    </div>`;
  wireDiag();
  const code = $('cc-code'), go = $('cc-go'), status = $('cc-status');
  code.focus();
  code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); });
  code.addEventListener('keydown', e => { if (e.key === 'Enter') doConnect(); });
  go.onclick = doConnect;

  async function doConnect() {
    const c = code.value.replace(/\D/g, '');
    if (c.length !== 6) { status.textContent = 'Enter the 6-digit code from your phone.'; return; }
    status.textContent = 'Connecting…'; go.disabled = true;
    const off = Sync.onMessage(m => { if (m.t === 'snapshot') { off(); booted = true; soloNote = ''; bootApp(); } });
    const ok = await Sync.join(c);
    if (!ok) { off(); go.disabled = false; status.textContent = Sync.error || 'Could not connect.'; }
  }
}

// Returning device (already paired): a deliberate "Re-Connect" button. Pressing it
// joins the phone's standing offer and asks the user to confirm ON THE PHONE — no
// code, but a clear push on both ends (auto-reconnect proved unreliable).
export function startGuestReconnect(container, note = '') {
  appEl = container; booted = false; reconnectToken++;   // cancel any in-flight attempt
  container.innerHTML = `
    <div class="connect-screen">
      <div class="cs-brand">Inkvoice<span style="color:var(--accent,#f4a52b)">.</span></div>
      <h1>Reconnect to your phone</h1>
      <p class="cs-lede">${note ? '<b>' + note + '</b><br>' : ''}Open <b>Inkvoice on your phone</b> (same Wi-Fi), press <b>Re-Connect</b>, then <b>tap Accept on your phone</b>. No code needed.</p>
      <button class="btn block" id="rc-go" style="max-width:320px">🔗 Re-Connect</button>
      <div id="rc-status" class="cs-status"></div>
      <button class="btn ghost" id="rc-manual" style="max-width:320px;margin-top:16px">Enter a code instead</button>
      <button class="btn ghost" id="rc-forget" style="max-width:320px;margin-top:10px">Forget this phone &amp; start over</button>
      ${diagLink}
    </div>`;
  $('rc-go').onclick = doReconnect;
  $('rc-manual').onclick = () => mountConnectScreen(container);
  $('rc-forget').onclick = forgetPhone;
  wireDiag();
}

async function doReconnect() {
  const key = getPairKey();
  if (!key) { mountConnectScreen(appEl); return; }
  const btn = $('rc-go'), status = $('rc-status');
  const token = ++reconnectToken; booted = false;
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Connecting… now tap Accept on your phone.';
  const off = Sync.onMessage(m => {
    if (m.t === 'snapshot' && token === reconnectToken) { off(); booted = true; soloNote = ''; bootApp(); }
  });
  const ok = await Sync.join(key);
  if (!ok) {
    off();
    if (token !== reconnectToken) return;
    if (btn) btn.disabled = false;
    if (status) status.textContent = Sync.error === 'No device is offering that code'
      ? 'Couldn’t reach your phone. Open Inkvoice on it (same Wi-Fi), then press Re-Connect again.'
      : (Sync.error || 'Could not connect. Try again.');
    return;
  }
  // Joined — wait for the phone's Accept + first snapshot (up to ~45s).
  for (let i = 0; i < 90 && token === reconnectToken && !booted
    && Sync.state !== 'closed' && Sync.state !== 'error'; i++) await sleep(500);
  if (!booted && token === reconnectToken) {
    off();
    if (btn) btn.disabled = false;
    if (status) status.textContent = 'Not confirmed on your phone. Press Re-Connect and tap Accept.';
  }
}

// ---------------- global wiring ----------------
export function initSyncUI(opts) {
  role = opts.role;
  bootApp = opts.bootApp || (() => {});
  appEl = opts.appEl || null;

  // Keep the screen awake while actively connected (both roles); let it sleep otherwise.
  Sync.onState(s => { if (s === 'connected') acquireWake(); else if (s === 'closed' || s === 'error') releaseWake(); });

  // Sleep/wake handling — the biggest cause of "it won't reconnect":
  //  • Going HIDDEN (screen lock / app switch): drop the link NOW so the other
  //    side learns instantly instead of waiting for a timeout.
  //  • Coming back VISIBLE: the phone re-advertises so a searching device can
  //    reconnect (and we ask you to confirm with the Reconnect prompt).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Going to the background — the OS suspends the phone, and desktop browsers
      // throttle/discard inactive tabs, either of which silently kills the link.
      // Drop it cleanly NOW (best-effort 'bye') so the other side learns instantly
      // and is ready; we reconnect automatically the moment we're visible again.
      if (['connected', 'connecting', 'accept', 'waiting'].includes(Sync.state)) Sync.disconnect();
      return;
    }
    // Back in the foreground → reconnect immediately.
    const reallyConnected = Sync.state === 'connected' && Sync.pc && Sync.pc.connectionState === 'connected';
    if (role === 'phone') {
      if (reallyConnected) { acquireWake(); renderHub(); return; }
      // In solo mode this phone is the active editor — leave it alone. In hub mode,
      // anything that isn't a genuinely live link is stale (a dead link the events
      // missed, or a standing offer that expired while suspended): clear it and the
      // advertising guard, then re-advertise so the laptop can find us again.
      if (getMode() === 'hub') {
        advertising = false;
        Sync.disconnect();
        setTimeout(() => { advertiseTick(); renderHub(); }, 200);
      }
      return;
    }
    // guest
    if (reallyConnected) { acquireWake(); }
    else if (booted) { Sync.disconnect(); }                       // was live but the tab got killed → drop → shows the Re-Connect button
    // otherwise we're already on the Re-Connect screen; the user presses the button when ready.
  });

  if (role === 'phone') {
    // "Connect a device": first time shows a code; once paired it just re-shares to
    // the known laptop (hub mode), which reconnects automatically without a code.
    window.__syncConnect = () => { if (localStorage.getItem(HAS_PAIRED)) resumeLaptop(); else openHostModal(); };
    window.__syncUnpair = unpairPhone;
    window.__syncPaired = () => !!localStorage.getItem(HAS_PAIRED);
    window.__syncDiag = showDiag;
    Sync.onState((s, err) => {
      if ($('sync-modal')) {                    // first-pairing manual modal is open → drive its UI
        if (s === 'accept') hostBody('accept');
        else if (s === 'error') hostBody('error', { msg: err || 'Connection error.' });
        else if (s === 'closed') hostBody('error', { msg: 'The device disconnected.' });
        // 'connected' is handled below → we swap the modal for the hub lock screen
      } else if (s === 'accept') {
        showReconnectAccept();                  // laptop pressed Re-Connect → confirm on the phone
      }
      if (s === 'connected') {                  // any successful connection (first pairing or reconnect)
        localStorage.setItem(HAS_PAIRED, '1');
        setMode('hub');                         // a live laptop → this phone becomes the locked hub
        manualMode = false; advertising = false;
        Sync.send({ t: 'pairkey', key: deviceId() });   // (re)confirm our key so the guest can rejoin
        removeEl('sync-modal'); removeEl('sync-accept-modal');
        renderHub();
        toast('Device connected');
      }
      if (s === 'closed' || s === 'error') {    // connection ended
        advertising = false;
        removeEl('sync-accept-modal');
        renderHub();                            // hub mode → show "waiting…"; solo mode → clears the screen
        if (!manualMode && getMode() === 'hub') setTimeout(advertiseTick, 800);   // re-advertise so the next Re-Connect finds us
      }
    });
    setTimeout(() => { advertiseTick(); renderHub(); }, 600);   // resume hub mode on launch if that's how we left it
  } else { // guest
    window.__syncDiag = showDiag;
    window.__syncForget = forgetPhone;
    Sync.onMessage(m => {
      if (m.t === 'pairkey' && m.key) setPairKey(m.key);
      if (m.t === 'solo') soloNote = 'Your phone is in use right now. Use either your phone OR this computer — not both.';
    });
    Sync.onState((s, err) => {
      if ((s === 'closed' || s === 'error') && booted) {
        booted = false;
        const note = soloNote || err || 'Connection lost — reconnecting…';
        if (getPairKey()) startGuestReconnect(appEl, note);
        else mountConnectScreen(appEl, note);
      }
    });
  }
}
