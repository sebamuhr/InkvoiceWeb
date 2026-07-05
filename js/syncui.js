// ===== Inkvoice — sync UI (pairing screens for both roles) =====
//
// PHONE (host): a "Connect a device" modal that shows the 6-digit code, then an
//   Accept/Reject prompt when a device asks to join, then a Connected state.
// LAPTOP/TABLET (guest): a full-page "enter the code" screen that replaces the
//   old desktop dead-end. On connect it waits for the phone's snapshot, then
//   boots the full app. If the link drops it returns here to reconnect.

import { Sync } from './sync.js';
import { toast } from './util.js';

let role = 'phone';
let bootApp = () => {};
let appEl = null;
let booted = false;   // guest: is the full app currently shown?

const $ = id => document.getElementById(id);
const elFrom = html => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const removeEl = id => { const e = $(id); if (e) e.remove(); };

// ---------------- PHONE: "Connect a device" modal ----------------
export async function openHostModal() {
  removeEl('sync-modal');
  document.body.appendChild(elFrom(`
    <div class="modal-overlay" id="sync-modal"><div class="modal">
      <h3 style="margin:0 0 12px">Connect a device</h3>
      <div id="sync-body" class="sync-body"></div>
      <button class="btn ghost block" id="sync-close" style="margin-top:14px">Close</button>
    </div></div>`));
  $('sync-close').onclick = () => {
    if (Sync.state !== 'connected') Sync.disconnect();  // cancel an in-progress pairing
    removeEl('sync-modal');
  };
  hostBody('starting');
  try {
    const code = await Sync.host();
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
      <div class="sync-note">✓ <b>Connected.</b> Your invoices, quotations, profile and card are now shared with this device while it stays on the same Wi-Fi. Nothing leaves your devices.</div>
      <button class="btn block" id="sync-disc" style="margin-top:14px">Disconnect</button>`;
    $('sync-disc').onclick = () => { Sync.disconnect(); removeEl('sync-modal'); };
  } else if (kind === 'error') {
    body.innerHTML = `<div class="sync-note">${data.msg || 'Something went wrong.'}</div>`;
  }
}

// ---------------- LAPTOP/TABLET: connect screen ----------------
export function mountConnectScreen(container, note = '') {
  appEl = container;
  booted = false;
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
    // Boot the app only once the phone's full snapshot has arrived, so the
    // laptop opens already populated (and not blocked by the empty-profile gate).
    const off = Sync.onMessage(m => { if (m.t === 'snapshot') { off(); booted = true; bootApp(); } });
    const ok = await Sync.join(c);
    if (!ok) { off(); go.disabled = false; status.textContent = Sync.error || 'Could not connect.'; }
  }
}

// ---------------- global wiring ----------------
export function initSyncUI(opts) {
  role = opts.role;
  bootApp = opts.bootApp || (() => {});
  appEl = opts.appEl || null;

  if (role === 'phone') {
    window.__syncConnect = openHostModal;   // Profile's "Connect a device" button calls this
    Sync.onState((s, err) => {
      if (!$('sync-modal')) return;         // only react while the modal is open
      if (s === 'accept') hostBody('accept');
      else if (s === 'connected') { hostBody('connected'); toast('Device connected'); }
      else if (s === 'error') hostBody('error', { msg: err || 'Connection error.' });
      else if (s === 'closed') hostBody('error', { msg: 'The device disconnected.' });
    });
  } else { // guest
    Sync.onState((s, err) => {
      if ((s === 'closed' || s === 'error') && booted) {
        booted = false;
        mountConnectScreen(appEl, err || 'Connection lost — enter the code again when your phone is back.');
      }
    });
  }
}
