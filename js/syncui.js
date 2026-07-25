// ===== Inkvoice — sync UI (pairing + auto-reconnect) =====
//
// FIRST pairing: phone shows a 6-digit code, laptop types it, phone taps Accept.
//   On success the phone hands the laptop a persistent secret DEVICE KEY.
// AFTER that: the laptop remembers the key and silently rejoins whenever the
//   phone is back — no code, no prompt. The phone, once it has paired at least
//   once, quietly re-advertises under its device key while idle and auto-accepts
//   a peer that knows the key (knowing the long secret IS the trust).

import { Sync, SyncLog, APP_VERSION } from './sync.js';
import { wipeLocalData } from './store.js';
import { toast } from './util.js';

// The laptop is a TERMINAL, not a second copy: it holds NO data of its own. It shows the
// phone's data only while connected (a live mirror) and FORGETS everything the moment it
// disconnects — so it can never come back later with stale data and overwrite the phone.
// This runs ONLY in the guest role; the phone (role 'phone') never wipes. A phone can never
// even reach the guest code path (see app.js device gating), so the real data is safe.
// Wipe the laptop's DATA (invoices/profile/clients/card) — it only ever held a live mirror
// of the phone. Deliberately KEEPS the remembered-phones list so reconnecting stays one tap.
function guestForgetAll(){ if (role === 'guest') wipeLocalData(); }

const DEVICE_KEY = 'inkvoice_device_id';   // phone: our stable secret room key
const PAIR_KEY   = 'inkvoice_pair_key';    // laptop: the phone's device key we paired with
const HAS_PAIRED = 'inkvoice_has_paired';  // phone: have we ever completed a pairing?

// The laptop is an ephemeral terminal for its DATA (wipes invoices/profile/clients/card on
// disconnect), but it REMEMBERS the phone(s) it has paired with so reconnecting is one tap.
// When more than one phone is remembered (multi-phone household) the laptop shows a SELECTOR
// first so you pick WHICH phone before reconnecting — this is what stops a reconnect from
// cross-wiring to the wrong phone. A NEW phone still needs its 6-digit code + Accept (so a
// stranger at work can't connect). While a laptop is connected the phone locks itself behind
// the hub screen, so only one device is ever the active editor.

let role = 'phone';
let bootApp = () => {};
let appEl = null;
let booted = false;        // guest: is the full app currently shown?
let advertising = false;   // phone: a background reconnect offer is standing
let manualMode = false;    // phone: the manual "Connect a device" modal is active
let reconnectToken = 0;    // guest: bumps to cancel a running reconnect loop
let hiddenGraceTimer = null; // guest: pending drop while the laptop tab is backgrounded

// How long the laptop (guest) keeps the live link alive after its tab goes to the
// background before it drops. So switching tabs, or opening the generated PDF in a
// new tab, does NOT instantly disconnect — the user has time to come back. Tune here.
const GUEST_HIDDEN_GRACE_MS = 180000; // 3 minutes

// Shown ONLY when a connection times out (not up-front) — a VPN on either device
// blocks the local Wi-Fi peer-to-peer link even on the same network.
const VPN_TIP = 'Check your VPN — disconnect it, or add Inkvoice as a trusted app.';

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
const getPairKey = () => localStorage.getItem(PAIR_KEY) || '';   // legacy single-phone key

// The laptop remembers a LIST of phones it has paired with, so you can pick which one to
// reconnect to. Each entry = { key: <phone's device key>, name: <business/owner name> }.
const PHONES_KEY = 'inkvoice_phones';
function getPhones() {
  try { const a = JSON.parse(localStorage.getItem(PHONES_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function savePhone(key, name) {
  if (!key) return;
  const list = getPhones();
  const i = list.findIndex(p => p.key === key);
  const nm = name || (i >= 0 ? list[i].name : '') || 'My phone';
  if (i >= 0) list[i] = { key, name: nm }; else list.push({ key, name: nm });
  localStorage.setItem(PHONES_KEY, JSON.stringify(list));
}
function forgetPhoneKey(key) {
  localStorage.setItem(PHONES_KEY, JSON.stringify(getPhones().filter(p => p.key !== key)));
}
// One-time migration: older builds stored a single phone under PAIR_KEY → fold it into the list.
(() => { const legacy = getPairKey(); if (legacy && !getPhones().some(p => p.key === legacy)) savePhone(legacy, ''); })();
const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const phoneNameFrom = m => { const p = m && m.snap && m.snap.profile; return (p && (p.businessName || p.ownerName)) || ''; };

// Which remembered phone we're currently connecting to (set when you pick one, or when the
// phone sends its pairkey), plus the latest name seen in a snapshot — used to remember it.
let activeReconnectKey = '';
let currentPhoneKey = '';
let latestPhoneName = '';

// ---------------- PHONE: "Connect a device" modal (first pairing) ----------------
export async function openHostModal() {
  manualMode = true; advertising = false;      // pause background reconnect while pairing a new device
  removeEl('sync-modal'); removeEl('phone-recon-btn');
  document.body.appendChild(elFrom(`
    <div class="modal-overlay" id="sync-modal"><div class="modal">
      <h3 style="margin:0 0 12px">Connect a device</h3>
      <div id="sync-body" class="sync-body"></div>
      <button class="btn ghost block" id="sync-close" style="margin-top:14px">Close</button>
    </div></div>`));
  $('sync-close').onclick = () => {
    if (Sync.state !== 'connected') { Sync.disconnect(); releaseWake(); }
    removeEl('sync-modal');
    manualMode = false;
    setTimeout(() => { advertiseTick(); renderHub(); renderPhoneReconnectBtn(); }, 800);   // resume hub advertising / lock screen
  };
  hostBody('starting');
  // Hold the screen awake while the code is on display — the screen auto-locking
  // while the user walks over and types on the laptop kills the pairing.
  acquireWake();
  try {
    const code = await Sync.host();            // random 6-digit, needs human Accept
    hostBody('waiting', { code });
  } catch {
    hostBody('error', { msg: 'Could not reach the pairing server. Check your connection and try again.' });
  }
}

// PHONE, already paired: reconnect the SAME laptop with no code. Hosts under the
// device key and waits; the laptop presses "Re-Connect" and this shows Accept.
export async function openReconnectHost() {
  manualMode = true; advertising = false;
  removeEl('sync-modal'); removeEl('phone-recon-btn');
  document.body.appendChild(elFrom(`
    <div class="modal-overlay" id="sync-modal"><div class="modal">
      <h3 style="margin:0 0 12px">Reconnect your laptop</h3>
      <div id="sync-body" class="sync-body"></div>
      <button class="btn ghost block" id="sync-newdev" style="margin-top:12px">Pair a NEW device (show a code)</button>
      <button class="btn ghost block" id="sync-close" style="margin-top:10px">Close</button>
    </div></div>`));
  $('sync-close').onclick = () => {
    if (Sync.state !== 'connected') { Sync.disconnect(); releaseWake(); }
    removeEl('sync-modal'); manualMode = false;
    setTimeout(() => { advertiseTick(); renderHub(); renderPhoneReconnectBtn(); }, 800);
  };
  $('sync-newdev').onclick = openHostModal;
  hostBody('reconnect-waiting');
  acquireWake();   // keep the screen on while waiting for the laptop
  // Auto-accept: the user deliberately tapped "Reconnect my laptop", so no extra
  // confirm — the laptop links as soon as it presses Re-Connect.
  try { await Sync.host({ code: deviceId(), autoAccept: true }); hostBody('reconnect-waiting'); }
  catch { hostBody('error', { msg: 'Could not reach the pairing server. Check your connection and try again.' }); }
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
  } else if (kind === 'reconnect-waiting') {
    body.innerHTML = `
      <div class="sync-note">On your laptop, open Inkvoice and press <b>Re-Connect</b>. No code needed.</div>
      <div class="sync-note muted" style="margin-top:8px">Keep this screen on — waiting for your laptop…</div>`;
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

// The "hub" lock screen — shown ONLY while a laptop is actively connected. The
// laptop is the active device, so the phone locks itself behind this screen (a
// mostly-black page also looks dim and saves OLED power). The ONE way off it is
// "Use this phone instead" (disconnects the laptop). No tap-to-dismiss — dismissing
// would let both devices be edited at once. When NOT connected the phone is fully
// usable (this function just clears the screen).
function renderHub() {
  if (role !== 'phone') return;
  if (Sync.state !== 'connected') { removeEl('sync-hub'); return; }
  let hub = $('sync-hub');
  if (!hub) { hub = elFrom(`<div id="sync-hub" class="sync-hub"></div>`); document.body.appendChild(hub); }
  hub.innerHTML = `
    <div class="hub-dot"></div>
    <div class="hub-title">In use on your laptop</div>
    <div class="hub-sub">This phone is the hub. Work on your laptop — keep this open on the same Wi-Fi.</div>
    <div class="hub-warn">Use <b>either</b> your phone or your laptop — never both at once.</div>
    <button class="btn block" id="hub-reclaim" style="max-width:320px;margin-top:18px">Use this phone instead</button>
    <button class="btn ghost block" id="hub-unpair" style="max-width:320px;margin-top:10px">Unpair / forget laptop</button>
    ${diagLink}`;
  $('hub-reclaim').onclick = reclaimPhone;
  $('hub-unpair').onclick = unpairPhone;
  wireDiag();
}

// Hand control to THIS phone: drop the laptop and become the active editor again.
// The laptop won't reconnect on its own — it waits on its Re-Connect screen until
// the user presses it — so this cleanly hands control back to the phone.
function reclaimPhone() {
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

// PHONE: fully unpair — forget the laptop and start clean. New device key means any
// old laptop must pair again from a fresh code. If a laptop is connected right now, tell
// it to forget us too (so it stops offering "Re-Connect"); `propagate=false` when we're
// acting on an unpair the OTHER side already sent us.
function unpairPhone(propagate = true) {
  SyncLog.add('[ui] unpair phone (forget laptop, new device key)');
  const notify = propagate && Sync.state === 'connected';
  if (notify) Sync.send({ t: 'unpair' });
  // Clear the pairing IMMEDIATELY so the teardown's 'closed' event can't re-advertise
  // or re-show the reconnect button in the gap.
  advertising = false;
  localStorage.removeItem(HAS_PAIRED);
  localStorage.removeItem(DEVICE_KEY);     // regenerate a fresh secret next pairing
  const finish = () => {
    Sync.disconnect();
    removeEl('sync-hub'); removeEl('sync-modal');
    renderPhoneReconnectBtn();             // unpaired → hide the "Reconnect my laptop" button
    toast('Device unpaired — start a new connection any time');
  };
  // Give the unpair message a moment to flush over the data channel before we tear down.
  notify ? setTimeout(finish, 250) : finish();
}

// LAPTOP: forget the phone we paired with → back to a clean "enter a code" screen. If the
// phone is connected right now, tell it to forget us too. `propagate=false` when the phone
// is the one that told US to forget.
function forgetPhone(propagate = true) {
  SyncLog.add('[ui] forget phone (remove from remembered list)');
  const notify = propagate && Sync.state === 'connected';
  if (notify) Sync.send({ t: 'unpair' });
  // Drop THIS phone from the remembered list immediately so a 'closed' event in the gap
  // can't offer Re-Connect to it.
  reconnectToken++;                        // stop any running reconnect loop
  const key = activeReconnectKey || currentPhoneKey;
  if (key) forgetPhoneKey(key);
  localStorage.removeItem(PAIR_KEY);       // clear the legacy single key too
  activeReconnectKey = ''; currentPhoneKey = '';
  booted = false;
  guestForgetAll();                        // drop this session's mirrored data
  const finish = () => {
    Sync.disconnect();
    if (getPhones().length) mountPhonePicker(appEl);   // still have other phones → pick one
    else mountConnectScreen(appEl, 'Forgotten. Enter a fresh code from your phone to connect again.');
  };
  notify ? setTimeout(finish, 250) : finish();
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
const diagLink = `<button class="linkbtn cs-diag" id="cs-diag" style="margin-top:14px;opacity:.6;font-size:12px">Connection diagnostics · Inkvoice ${APP_VERSION}</button>`;
function wireDiag() {
  const b = $('cs-diag'); if (b) b.onclick = showDiag;
}

// ---------------- PHONE: background reconnect advertising ----------------
function canAdvertise() {
  return role === 'phone' && localStorage.getItem(HAS_PAIRED) && !manualMode
    && document.visibilityState === 'visible'
    && ['idle', 'closed', 'error'].includes(Sync.state);
}
async function advertiseTick() {
  if (advertising || !canAdvertise()) return;
  advertising = true;
  // Stand a "reconnect" offer under our device key and AUTO-accept a peer that
  // knows the key (the long secret IS the trust). So the laptop's Re-Connect can
  // link up on its own whenever Inkvoice is open on the phone.
  try { await Sync.host({ code: deviceId(), autoAccept: true }); } catch {}
}

// PHONE: a big, obvious "Reconnect my laptop" button shown whenever we're paired but
// NOT connected — the thing the user kept (rightly) asking for. Tapping it stands a
// fresh, deliberate offer (like the code flow that works) and auto-accepts the laptop.
function renderPhoneReconnectBtn() {
  if (role !== 'phone') return;
  const show = localStorage.getItem(HAS_PAIRED) && Sync.state !== 'connected'
    && window.__route === '/profile'          // only on the Profile tab — annoying elsewhere
    && !manualMode && !$('sync-modal') && !$('sync-hub');
  const existing = $('phone-recon-btn');
  if (!show) { if (existing) existing.remove(); return; }
  if (existing) return;
  const btn = elFrom(`<button id="phone-recon-btn" class="btn" style="position:fixed;left:50%;transform:translateX(-50%);bottom:80px;z-index:350;box-shadow:0 4px 18px rgba(0,0,0,.28);max-width:92%">🔗 Reconnect my laptop</button>`);
  btn.onclick = openReconnectHost;
  document.body.appendChild(btn);
}

// ---------------- LAPTOP/TABLET: entry point ----------------
export function mountGuestStart(container) {
  appEl = container;
  // Start BLANK (the phone's snapshot refills the data on connect) but KEEP the remembered
  // phones so we can offer easy reconnect.
  guestForgetAll();
  if (getPhones().length) mountPhonePicker(container);   // remembered phone(s) → pick one
  else mountConnectScreen(container);                    // none yet → type a code
}

// LAPTOP: pick which remembered phone to reconnect to (or add a new one via its code). This
// is the multi-phone-household fix: you EXPLICITLY choose the phone, so a reconnect can never
// cross-wire to the wrong one.
function mountPhonePicker(container) {
  appEl = container; booted = false; reconnectToken++;
  const phones = getPhones();
  if (!phones.length) { mountConnectScreen(container); return; }
  const rows = phones.map((p, i) => `
    <div style="display:flex;gap:8px;align-items:center;width:100%;margin:8px 0">
      <button class="btn phone-pick" data-i="${i}" style="flex:1;text-align:left">🔗 Reconnect to <b>${escapeHtml(p.name || 'My phone')}</b></button>
      <button class="btn ghost phone-drop" data-i="${i}" aria-label="Forget this phone" style="width:46px">✕</button>
    </div>`).join('');
  container.innerHTML = `
    <div class="connect-screen">
      <div class="cs-brand">Inkvoice<span style="color:var(--accent,#f4a52b)">.</span></div>
      <h1>Which phone?</h1>
      <p class="cs-lede">Pick the phone to connect to — or add a new one with its 6-digit code.</p>
      <div style="width:100%;max-width:340px">${rows}</div>
      <button class="btn ghost block" id="pp-new" style="max-width:340px;margin-top:14px">➕ Connect a new phone (enter code)</button>
      ${diagLink}
    </div>`;
  wireDiag();
  container.querySelectorAll('.phone-pick').forEach(b => b.onclick = () => startGuestReconnect(container, '', phones[+b.dataset.i]));
  container.querySelectorAll('.phone-drop').forEach(b => b.onclick = () => { forgetPhoneKey(phones[+b.dataset.i].key); mountPhonePicker(container); });
  $('pp-new').onclick = () => mountConnectScreen(container);
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
      ${getPhones().length ? '<button class="btn ghost" id="cc-back" style="max-width:320px;margin-top:12px">‹ Back to my phones</button>' : ''}
      <p class="cs-foot">Both devices must be on the same Wi-Fi. Data stays on your devices — the connection is peer-to-peer.</p>
      ${diagLink}
    </div>`;
  wireDiag();
  const code = $('cc-code'), go = $('cc-go'), status = $('cc-status');
  $('cc-back')?.addEventListener('click', () => mountPhonePicker(appEl));
  code.focus();
  code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); });
  code.addEventListener('keydown', e => { if (e.key === 'Enter') doConnect(); });
  go.onclick = doConnect;

  async function doConnect() {
    const c = code.value.replace(/\D/g, '');
    if (c.length !== 6) { status.textContent = 'Enter the 6-digit code from your phone.'; return; }
    status.textContent = 'Connecting…'; go.disabled = true;
    const off = Sync.onMessage(m => { if (m.t === 'snapshot') { off(); booted = true; bootApp(); toastConnected(m); } });
    const ok = await Sync.join(c);
    if (!ok) { off(); go.disabled = false; status.textContent = Sync.error || 'Could not connect.'; }
  }
}

// Laptop: tell the user which phone they just linked to (name comes from the
// incoming snapshot's profile — no store timing to worry about).
function toastConnected(m) {
  const p = m && m.snap && m.snap.profile;
  const name = (p && (p.businessName || p.ownerName)) || 'your phone';
  toast('Connected to ' + name);
}

// Returning device (already paired): a deliberate "Re-Connect" button. Pressing it
// joins the phone's standing offer and asks the user to confirm ON THE PHONE — no
// code, but a clear push on both ends (auto-reconnect proved unreliable).
export function startGuestReconnect(container, note = '', phone = null) {
  appEl = container; booted = false; reconnectToken++;   // cancel any in-flight attempt
  const list = getPhones();
  const p = phone || list[0] || null;
  activeReconnectKey = p ? p.key : getPairKey();
  currentPhoneKey = activeReconnectKey;
  latestPhoneName = p ? (p.name || '') : '';
  if (!activeReconnectKey) { mountConnectScreen(container, note); return; }
  const nm = escapeHtml(p && p.name ? p.name : 'your phone');
  container.innerHTML = `
    <div class="connect-screen">
      <div class="cs-brand">Inkvoice<span style="color:var(--accent,#f4a52b)">.</span></div>
      <h1>Reconnect to ${nm}</h1>
      <p class="cs-lede">${note ? '<b>' + escapeHtml(note) + '</b><br>' : ''}Open <b>Inkvoice on ${nm}</b> (same Wi-Fi), press <b>Re-Connect</b>, then <b>tap Accept on the phone</b>. No code needed.</p>
      <button class="btn block" id="rc-go" style="max-width:320px">🔗 Re-Connect</button>
      <div id="rc-status" class="cs-status"></div>
      ${list.length > 1 ? '<button class="btn ghost" id="rc-back" style="max-width:320px;margin-top:16px">‹ Choose a different phone</button>' : ''}
      <button class="btn ghost" id="rc-manual" style="max-width:320px;margin-top:10px">Enter a code instead</button>
      <button class="btn ghost" id="rc-forget" style="max-width:320px;margin-top:10px">Forget this phone</button>
      ${diagLink}
    </div>`;
  $('rc-go').onclick = doReconnect;
  $('rc-back')?.addEventListener('click', () => mountPhonePicker(container));
  $('rc-manual').onclick = () => mountConnectScreen(container);
  $('rc-forget').onclick = forgetPhone;
  wireDiag();
}

async function doReconnect() {
  const key = activeReconnectKey || getPairKey();
  if (!key) { mountConnectScreen(appEl); return; }
  const btn = $('rc-go');
  const token = ++reconnectToken; booted = false;
  const setStatus = t => { const el = $('rc-status'); if (el) el.textContent = t; };
  if (btn) btn.disabled = true;
  setStatus('Looking for your phone…');
  SyncLog.add('[ui] Re-Connect pressed → polling for the phone');
  const off = Sync.onMessage(m => {
    if (m.t === 'snapshot' && token === reconnectToken) { off(); booted = true; bootApp(); toastConnected(m); }
  });
  // Keep trying for ~40s (like re-typing the code until it takes). The phone stands
  // a standing offer under the device key whenever Inkvoice is open on it.
  const deadline = Date.now() + 40000;
  while (token === reconnectToken && !booted && Date.now() < deadline) {
    const ok = await Sync.join(key);
    if (token !== reconnectToken) { off(); return; }
    if (ok) {
      setStatus('Found your phone — now tap Accept on it.');
      // Wait for the phone's Accept + first snapshot; bail to retry if the link dies.
      for (let i = 0; i < 90 && token === reconnectToken && !booted
        && Sync.state !== 'closed' && Sync.state !== 'error'; i++) await sleep(500);
      if (booted || token !== reconnectToken) { off(); return; }
      setStatus('Looking for your phone…');   // link dropped before Accept → try again
    } else {
      await sleep(1500);                        // phone not advertising yet → wait and retry
    }
  }
  off();
  if (token !== reconnectToken || booted) return;
  if (btn) btn.disabled = false;
  setStatus('Timed out — couldn’t reach your phone. ' + VPN_TIP + ' Make sure Inkvoice is open on your phone, then press Re-Connect again.');
}

// ---------------- global wiring ----------------
export function initSyncUI(opts) {
  role = opts.role;
  bootApp = opts.bootApp || (() => {});
  appEl = opts.appEl || null;
  window.__syncVersion = APP_VERSION;
  SyncLog.add(`Inkvoice ${APP_VERSION} — sync init (role: ${role})`);

  // Keep the screen awake while actively connected (both roles); let it sleep otherwise.
  Sync.onState(s => { if (s === 'connected') acquireWake(); else if (s === 'closed' || s === 'error') releaseWake(); });

  // Sleep/wake handling — the biggest cause of "it won't reconnect":
  //  • Going HIDDEN (screen lock / app switch): drop the link NOW so the other
  //    side learns instantly instead of waiting for a timeout.
  //  • Coming back VISIBLE: the phone re-advertises so a searching device can
  //    reconnect (and we ask you to confirm with the Reconnect prompt).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (role === 'phone') {
        // The phone's OS suspends the PWA when the screen turns off, which kills the
        // link anyway — drop it cleanly NOW (best-effort 'bye') so the laptop learns
        // instantly; we re-advertise the moment we're visible again.
        if (['connected', 'connecting', 'accept', 'waiting'].includes(Sync.state)) Sync.disconnect();
        return;
      }
      // GUEST (laptop): do NOT drop the link just because the tab lost focus — the user
      // is almost always switching tabs or opening the generated PDF in a new tab and
      // will be right back. Keep the live mirror and only disconnect if they stay away
      // past the grace window. (A still-forming handshake is dropped now, as before.)
      if (Sync.state === 'connected') {
        clearTimeout(hiddenGraceTimer);
        hiddenGraceTimer = setTimeout(() => {
          hiddenGraceTimer = null;
          if (document.visibilityState === 'hidden' && Sync.state === 'connected') Sync.disconnect();
        }, GUEST_HIDDEN_GRACE_MS);
      } else if (['connecting', 'accept', 'waiting'].includes(Sync.state)) {
        Sync.disconnect();
      }
      return;
    }
    // Back in the foreground → cancel any pending grace-drop, then re-check the link.
    clearTimeout(hiddenGraceTimer); hiddenGraceTimer = null;
    const reallyConnected = Sync.state === 'connected' && Sync.pc && Sync.pc.connectionState === 'connected';
    if (role === 'phone') {
      if (reallyConnected) { acquireWake(); renderHub(); return; }
      // Not genuinely connected. If paired, anything lingering is stale (a dead link
      // the events missed, or an offer that expired while suspended): clear it and the
      // advertising guard, then stand a fresh offer so the laptop's Re-Connect finds us.
      if (localStorage.getItem(HAS_PAIRED)) {
        advertising = false;
        if (Sync.state !== 'idle' && Sync.state !== 'closed' && Sync.state !== 'error') Sync.disconnect();
        setTimeout(() => { advertiseTick(); renderHub(); renderPhoneReconnectBtn(); }, 200);
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
    // First time → show a code. Already paired → reconnect the known laptop (no code).
    window.__syncConnect = () => { if (localStorage.getItem(HAS_PAIRED)) openReconnectHost(); else openHostModal(); };
    window.__syncUnpair = unpairPhone;
    window.__syncPaired = () => !!localStorage.getItem(HAS_PAIRED);
    window.__syncDiag = showDiag;
    window.__syncOnNav = renderPhoneReconnectBtn;   // re-check button visibility on each tab change
    // If the laptop unpairs, forget it here too (no new-key echo back).
    Sync.onMessage(m => { if (m.t === 'unpair') unpairPhone(false); });
    Sync.onState((s, err) => {
      if ($('sync-modal')) {                    // pairing / reconnect-host modal is open → drive its UI
        if (s === 'accept') hostBody('accept');
        else if (s === 'error') hostBody('error', { msg: (err || 'Timed out.') + ' ' + VPN_TIP });
        else if (s === 'closed') hostBody('error', { msg: 'The device disconnected.' });
        // 'connected' is handled below → we swap the modal for the hub lock screen
      }
      if (s === 'connected') {                  // any successful connection (first pairing or reconnect)
        localStorage.setItem(HAS_PAIRED, '1');
        manualMode = false; advertising = false;
        Sync.send({ t: 'pairkey', key: deviceId() });   // (re)confirm our key so the guest can rejoin
        removeEl('sync-modal'); removeEl('sync-accept-modal');
        renderHub();                            // now connected → lock the phone
        renderPhoneReconnectBtn();              // connected → hide the reconnect button
        toast('Device connected');
      }
      if (s === 'closed' || s === 'error') {    // connection ended → phone usable again + re-advertise
        advertising = false;
        removeEl('sync-accept-modal');
        renderHub();                            // not connected → clears the lock screen
        if (!manualMode) setTimeout(advertiseTick, 800);   // stand a fresh offer so the next Re-Connect finds us
        setTimeout(renderPhoneReconnectBtn, 200);          // show the "Reconnect my laptop" button
      }
    });
    setTimeout(() => { advertiseTick(); renderHub(); renderPhoneReconnectBtn(); }, 600);   // paired phone: advertise + show reconnect button
  } else { // guest
    window.__syncDiag = showDiag;
    window.__syncForget = forgetPhone;
    Sync.onMessage(m => {
      // Remember which phone this is: the phone sends its device key ('pairkey') and its name
      // arrives in the snapshot. Save the pair so it shows up in the selector next time.
      if (m.t === 'snapshot') { latestPhoneName = phoneNameFrom(m) || latestPhoneName; if (currentPhoneKey) savePhone(currentPhoneKey, latestPhoneName); }
      else if (m.t === 'pairkey' && m.key) { currentPhoneKey = m.key; savePhone(currentPhoneKey, latestPhoneName); }
      else if (m.t === 'unpair') forgetPhone(false);   // phone dropped us → forget it + back to the picker
    });
    Sync.onState((s, err) => {
      if ((s === 'closed' || s === 'error') && booted) {
        booted = false;
        // Disconnected → wipe the live DATA mirror immediately (it only ever mirrored the
        // phone), but KEEP the remembered phones so reconnecting is one tap.
        guestForgetAll();
        if (err) toast(err);
        if (getPhones().length) mountPhonePicker(appEl);
        else mountConnectScreen(appEl, err || 'Connection lost.');
      } else if ((s === 'closed' || s === 'error') && !booted) {
        // A pairing attempt died mid-connect: don't leave the connect screen
        // stuck on a disabled "Connecting…" forever — hand the button back.
        const go = $('cc-go'), st = $('cc-status');
        if (go && go.disabled) {
          go.disabled = false;
          if (st) st.textContent = 'Timed out. ' + VPN_TIP + ' Make sure the code screen is open on your phone, then press Connect again.';
        }
      }
    });
  }
}
