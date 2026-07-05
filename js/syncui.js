// ===== Inkvoice — sync UI (pairing + auto-reconnect) =====
//
// FIRST pairing: phone shows a 6-digit code, laptop types it, phone taps Accept.
//   On success the phone hands the laptop a persistent secret DEVICE KEY.
// AFTER that: the laptop remembers the key and silently rejoins whenever the
//   phone is back — no code, no prompt. The phone, once it has paired at least
//   once, quietly re-advertises under its device key while idle and auto-accepts
//   a peer that knows the key (knowing the long secret IS the trust).

import { Sync } from './sync.js';
import { toast } from './util.js';

const DEVICE_KEY = 'inkvoice_device_id';   // phone: our stable secret room key
const PAIR_KEY   = 'inkvoice_pair_key';    // laptop: the phone's device key we paired with
const HAS_PAIRED = 'inkvoice_has_paired';  // phone: have we ever completed a pairing?

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
    setTimeout(advertiseTick, 800);            // resume background reconnect advertising
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
  } else if (kind === 'connected') {
    body.innerHTML = `
      <div class="sync-note">✓ <b>Connected.</b> This device now mirrors your phone over Wi-Fi, and will reconnect on its own next time. Nothing leaves your devices.</div>
      <div class="sync-note muted" style="margin-top:8px">Keep Inkvoice open on this phone to stay connected — it reconnects automatically when you come back.</div>
      <button class="btn block" id="sync-disc" style="margin-top:14px">Disconnect</button>`;
    $('sync-disc').onclick = () => { Sync.disconnect(); removeEl('sync-modal'); manualMode = false; };
  } else if (kind === 'error') {
    body.innerHTML = `<div class="sync-note">${data.msg || 'Something went wrong.'}</div>`;
  }
}

// ---------------- PHONE: background reconnect advertising ----------------
function canAdvertise() {
  return role === 'phone' && localStorage.getItem(HAS_PAIRED) && !manualMode
    && ['idle', 'closed', 'error'].includes(Sync.state);
}
async function advertiseTick() {
  if (advertising || !canAdvertise()) return;
  advertising = true;
  // Stand a "reconnect" offer under our device key; auto-accept a peer that knows it.
  try { await Sync.host({ code: deviceId(), autoAccept: true }); } catch {}
}

// ---------------- LAPTOP/TABLET: entry point ----------------
export function mountGuestStart(container) {
  appEl = container;
  if (getPairKey()) startGuestReconnect(container);   // been here before → silent reconnect
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
    </div>`;
  const code = $('cc-code'), go = $('cc-go'), status = $('cc-status');
  code.focus();
  code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); });
  code.addEventListener('keydown', e => { if (e.key === 'Enter') doConnect(); });
  go.onclick = doConnect;

  async function doConnect() {
    const c = code.value.replace(/\D/g, '');
    if (c.length !== 6) { status.textContent = 'Enter the 6-digit code from your phone.'; return; }
    status.textContent = 'Connecting…'; go.disabled = true;
    const off = Sync.onMessage(m => { if (m.t === 'snapshot') { off(); booted = true; bootApp(); } });
    const ok = await Sync.join(c);
    if (!ok) { off(); go.disabled = false; status.textContent = Sync.error || 'Could not connect.'; }
  }
}

// Silent auto-reconnect using the stored device key.
export async function startGuestReconnect(container, note = '') {
  appEl = container; booted = false;
  const token = ++reconnectToken;
  container.innerHTML = `
    <div class="connect-screen">
      <div class="cs-brand">Inkvoice<span style="color:var(--accent,#f4a52b)">.</span></div>
      <h1>Reconnecting to your phone…</h1>
      <p class="cs-lede">${note ? note + '<br>' : ''}Make sure Inkvoice is open on your phone and both are on the same Wi-Fi.</p>
      <div id="rc-status" class="cs-status">Looking for your phone…</div>
      <button class="btn ghost" id="rc-manual" style="max-width:320px;margin-top:20px">Enter a code instead</button>
    </div>`;
  $('rc-manual').onclick = () => mountConnectScreen(container);

  const key = getPairKey();
  const off = Sync.onMessage(m => { if (m.t === 'snapshot' && token === reconnectToken) { off(); booted = true; bootApp(); } });
  while (token === reconnectToken && !booted) {
    const ok = await Sync.join(key);
    if (ok) {                                   // offer found → give the connection time to settle
      for (let i = 0; i < 16 && token === reconnectToken && !booted
        && Sync.state !== 'closed' && Sync.state !== 'error'; i++) await sleep(500);
    }
    if (booted || token !== reconnectToken) { off(); return; }
    await sleep(2500);                          // phone not advertising yet → wait and retry
  }
  off();
}

// ---------------- global wiring ----------------
export function initSyncUI(opts) {
  role = opts.role;
  bootApp = opts.bootApp || (() => {});
  appEl = opts.appEl || null;

  // Keep the screen awake while actively connected (both roles); let it sleep otherwise.
  Sync.onState(s => { if (s === 'connected') acquireWake(); else if (s === 'closed' || s === 'error') releaseWake(); });

  // Coming back to the foreground: re-take the wake lock if still connected, and
  // if we're the phone, immediately re-advertise so a waiting device reconnects fast.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Sync.state === 'connected') acquireWake();
    else if (role === 'phone') advertiseTick();
  });

  if (role === 'phone') {
    window.__syncConnect = openHostModal;
    Sync.onState((s, err) => {
      if ($('sync-modal')) {                    // manual modal is open → drive its UI
        if (s === 'accept') hostBody('accept');
        else if (s === 'connected') { hostBody('connected'); toast('Device connected'); }
        else if (s === 'error') hostBody('error', { msg: err || 'Connection error.' });
        else if (s === 'closed') hostBody('error', { msg: 'The device disconnected.' });
      }
      if (s === 'connected') {                  // any successful connection (manual or reconnect)
        localStorage.setItem(HAS_PAIRED, '1');
        manualMode = false; advertising = false;
        Sync.send({ t: 'pairkey', key: deviceId() });   // (re)confirm our key so the guest can rejoin
        if (!$('sync-modal')) toast('Device reconnected');
      }
      if (s === 'closed' || s === 'error') {    // connection ended → resume background advertising
        advertising = false;
        if (!manualMode) setTimeout(advertiseTick, 1200);
      }
    });
    setTimeout(advertiseTick, 600);             // if we've paired before, start listening for a reconnect
  } else { // guest
    Sync.onMessage(m => { if (m.t === 'pairkey' && m.key) setPairKey(m.key); });
    Sync.onState((s, err) => {
      if ((s === 'closed' || s === 'error') && booted) {
        booted = false;
        if (getPairKey()) startGuestReconnect(appEl, err || 'Connection lost — reconnecting…');
        else mountConnectScreen(appEl, err || 'Connection lost — enter the code again.');
      }
    });
  }
}
