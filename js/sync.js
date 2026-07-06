// ===== Inkvoice — device sync (WebRTC data channel, LAN peer-to-peer) =====
//
// Two devices holding the same 6-digit code shake hands through signal.php
// (handshake only — ~1KB of SDP/ICE), then talk PEER-TO-PEER over the local
// WiFi. No invoice data ever touches the server.
//
// Roles:
//   HOST  = the phone (the boss). Generates the code, waits, and must tap
//           "Accept" before any data is shared.
//   GUEST = the laptop/tablet. Types the code, connects, receives the mirror.
//
// This module is transport + handshake only. The data mirror (snapshot + live
// deltas) is layered on top via onMessage()/send() by the app (Phase 2). The
// wire format is plain JSON so a future native Android client can speak it too.

// Bumped every sync change so the running build is visible on-screen — if this
// doesn't match the latest, the deploy/service-worker cache didn't update.
export const APP_VERSION = 'v39';

const SIGNAL_URL = window.__INKVOICE_SIGNAL_URL || 'https://inkvoiceapp.com/signal.php';

// Same-WiFi peer-to-peer. A STUN server is used ONLY during connection setup so
// each device can learn how to be reached — it never sees any invoice data (all
// real data flows strictly peer-to-peer over the LAN). We use Cloudflare's STUN
// (not Google's) and NO TURN, so data is never relayed through anyone. Pure
// no-STUN (mDNS-only) failed on real networks that block client-to-client
// multicast, so STUN is the pragmatic minimum for reliable pairing.
const ICE_SERVERS = [{ urls: 'stun:stun.cloudflare.com:3478' }];

const POLL_MS = 900;      // how often each side re-asks the mailbox during setup
const SETUP_TIMEOUT = 90_000;
const CHUNK_SIZE = 12_000; // chars per data-channel frame (safely under SCTP limits)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const digits6 = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

// ---- diagnostic ring buffer (viewable on-device via the "Diagnostics" link) ----
export const SyncLog = {
  lines: [],
  add(msg) {
    const t = new Date().toISOString().slice(11, 23);
    this.lines.push(`${t}  ${msg}`);
    if (this.lines.length > 200) this.lines.shift();
    try { console.log('[sync]', msg); } catch {}
    this._cbs.forEach(cb => { try { cb(); } catch {} });
  },
  text() { return this.lines.join('\n'); },
  clear() { this.lines = []; this._cbs.forEach(cb => { try { cb(); } catch {} }); },
  _cbs: new Set(),
  onChange(cb) { this._cbs.add(cb); return () => this._cbs.delete(cb); },
};
const dbg = m => SyncLog.add(m);

// ---- tiny signaling client (talks to signal.php) ----
async function sig(action, code, { method = 'GET', body = null, params = {} } = {}) {
  const qs = new URLSearchParams({ a: action, code, ...params }).toString();
  let res;
  try {
    res = await fetch(`${SIGNAL_URL}?${qs}`, {
      method,
      headers: body != null ? { 'Content-Type': 'text/plain' } : undefined,
      body: body != null ? body : undefined,
    });
  } catch (e) { dbg(`sig ${method} ${action} → NETWORK FAIL (${e.message})`); throw e; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { dbg(`sig ${method} ${action} → ${res.status} ${data.error || ''}`); const e = new Error(data.error || `signal ${res.status}`); e.status = res.status; throw e; }
  return data;
}

class SyncManager {
  constructor() {
    this.state = 'idle';           // idle|waiting|connecting|accept|connected|error|closed
    this.role = null;              // 'host' | 'guest'
    this.code = null;
    this.error = null;
    this.pc = null;
    this.channel = null;
    this._alive = false;           // setup loops run while true
    this._stateCbs = new Set();
    this._msgCbs = new Set();
    this._peerCbs = new Set();     // fires with the peer's `hello` info (host: on request; guest: on welcome)
  }

  onState(cb) { this._stateCbs.add(cb); return () => this._stateCbs.delete(cb); }
  onMessage(cb) { this._msgCbs.add(cb); return () => this._msgCbs.delete(cb); }
  onPeer(cb) { this._peerCbs.add(cb); return () => this._peerCbs.delete(cb); }

  _set(state, error = null) {
    if (state !== this.state) dbg(`state: ${this.state} → ${state}${error ? ' (' + error + ')' : ''}`);
    this.state = state; this.error = error;
    clearTimeout(this._connWatch);
    // If we start connecting but never finish (ICE fails / peer vanished), don't
    // hang forever holding a claimed room — bail so we can re-advertise/retry.
    if (state === 'connecting') {
      this._connWatch = setTimeout(() => { if (this.state === 'connecting') this._teardown('error', 'Connection timed out'); }, 20000);
    }
    if (state === 'connected') this._startHeartbeat(); else this._stopHeartbeat();
    this._stateCbs.forEach(cb => { try { cb(state, error); } catch {} });
  }

  // Heartbeat: a dead peer (phone suspended, WiFi dropped) often leaves the state
  // stuck at 'connected' with no event. Ping every 5s; if nothing has arrived for
  // 15s, declare the link dead so both sides fall back to reconnect/advertise.
  _startHeartbeat() {
    this._stopHeartbeat();
    this._lastRx = Date.now();
    this._hb = setInterval(() => {
      // A gone/closed channel (e.g. after the OS suspended us) means the link is
      // DEAD — declare it so, don't silently sit in a stale 'connected' state.
      if (!this.channel || this.channel.readyState !== 'open') { this._teardown('closed'); return; }
      if (Date.now() - this._lastRx > 9000) { this._teardown('closed'); return; }
      try { this.channel.send(JSON.stringify({ t: '__ping' })); } catch { this._teardown('closed'); }
    }, 3000);
  }
  _stopHeartbeat() { clearInterval(this._hb); this._hb = null; }

  // Send an app-level protocol message over the P2P channel. Large messages
  // (e.g. a full snapshot with base64 logos) are split into chunks that stay
  // safely under the data-channel's per-message size limit, then reassembled
  // on the far side.
  send(obj) {
    if (!(this.channel && this.channel.readyState === 'open')) return false;
    const s = JSON.stringify(obj);
    if (s.length <= CHUNK_SIZE) { this.channel.send(s); return true; }
    const id = Math.random().toString(36).slice(2);
    const n = Math.ceil(s.length / CHUNK_SIZE);
    for (let i = 0; i < n; i++) {
      this.channel.send(JSON.stringify({ __c: id, i, n, d: s.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE) }));
    }
    return true;
  }

  _newPC() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onconnectionstatechange = () => {
      dbg(`pc: ${pc.connectionState}`);
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && this.state === 'connected') {
        this._teardown('closed');
      }
    };
    pc.oniceconnectionstatechange = () => dbg(`ice: ${pc.iceConnectionState}`);
    return pc;
  }

  _wireChannel(ch) {
    this.channel = ch;
    this._chunks = {};   // id -> { n, parts:[] }
    ch.onmessage = (e) => {
      this._lastRx = Date.now();        // any inbound traffic = the link is alive
      let raw; try { raw = JSON.parse(e.data); } catch { return; }
      if (raw && raw.__c) {              // a chunk of a larger message
        const b = (this._chunks[raw.__c] ||= { n: raw.n, parts: [] });
        b.parts[raw.i] = raw.d;
        if (b.parts.filter(x => x !== undefined).length === b.n) {
          delete this._chunks[raw.__c];
          let msg; try { msg = JSON.parse(b.parts.join('')); } catch { return; }
          this._dispatch(msg);
        }
        return;
      }
      this._dispatch(raw);
    };
    ch.onclose = () => { if (this.state === 'connected') this._teardown('closed'); };
  }

  _dispatch(msg) {
    if (msg && msg.t === '__ping') { try { this.channel.send(JSON.stringify({ t: '__pong' })); } catch {} return; }
    if (msg && msg.t === '__pong') return;   // liveness only — already refreshed _lastRx
    this._handleControl(msg);
    this._msgCbs.forEach(cb => { try { cb(msg); } catch {} });
  }

  // Handshake messages the transport itself understands; everything else is
  // passed through to the app via onMessage.
  _handleControl(msg) {
    if (msg.t === 'hello' && this.role === 'host') {
      this._pendingPeer = msg;
      // Trusted reconnect (known device key) → connect straight away; otherwise
      // a first-time device must be Accepted by the human.
      if (this.autoAccept) { this.accept(); return; }
      this._set('accept');
      this._peerCbs.forEach(cb => { try { cb(msg); } catch {} });
    } else if (msg.t === 'welcome' && this.role === 'guest') {
      this._set('connected');
      this._peerCbs.forEach(cb => { try { cb(msg); } catch {} });
    } else if (msg.t === 'rejected' && this.role === 'guest') {
      this._teardown('error', 'The phone declined this device');
    } else if (msg.t === 'bye') {
      this._teardown('closed');
    }
  }

  // ---- HOST (phone) ----
  // opts.code    — fixed room key (used for auto-reconnect under the device key);
  //                omitted → a fresh random 6-digit code for first pairing.
  // opts.autoAccept — skip the human Accept prompt (trusted reconnect only).
  async host({ code = null, autoAccept = false, _retried = false } = {}) {
    this._reset('host');
    this._alive = true;
    this.autoAccept = autoAccept;
    this.code = code || digits6();
    dbg(`host: ${code ? 'device-key' : 'random-code'} auto=${autoAccept}${_retried ? ' (retry)' : ''}`);
    // For a FIXED device-key room, a previous attempt may have left it "claimed but
    // dead" — which would 409 our offer and 410 the laptop's join (a deadlock the
    // random-code path never hits). Clear it first so every advertise is fresh.
    if (code && !_retried) { try { await sig('close', this.code, { method: 'POST' }); } catch {} }
    this.pc = this._newPC();
    const ch = this.pc.createDataChannel('inkvoice', { ordered: true });
    this._wireChannel(ch);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    try {
      await sig('offer', this.code, { method: 'POST', body: JSON.stringify(offer) });
    } catch (e) {
      // 409 = a room already exists under this code.
      if (e.status === 409 && !code) return this.host({ autoAccept });   // random code → just pick another
      if (e.status === 409 && code && !_retried) {
        // Our own fixed device key still has a stale (claimed, dead) room — clear it and retry once.
        try { await sig('close', this.code, { method: 'POST' }); } catch {}
        return this.host({ code, autoAccept, _retried: true });
      }
      this._teardown('error', 'Could not reach the pairing server'); throw e;
    }

    this._set('waiting');
    this._trickleOut('host');
    this._pollAnswerAndIce();
    return this.code;   // show this to the user
  }

  // Host accepts the peer — either the user tapped Accept (state 'accept') or a
  // trusted reconnect auto-accepted (state 'connecting'). Either way: send the
  // welcome that completes the handshake and go connected. Idempotent.
  accept() {
    if (this.state === 'connected') return;
    this.send({ t: 'welcome', app: 'inkvoice-web' });
    this._set('connected');
  }
  reject() {
    if (this.state !== 'accept') return;
    this.send({ t: 'rejected' });
    this._teardown('closed');
  }

  async _pollAnswerAndIce() {
    const started = Date.now();
    while (this._alive && !this.pc.currentRemoteDescription) {
      if (Date.now() - started > SETUP_TIMEOUT) return this._teardown('error', 'No device connected in time');
      try {
        const { answer } = await sig('answer', this.code);
        if (answer) {
          await this.pc.setRemoteDescription(JSON.parse(answer));
          this._set('connecting');
          break;
        }
      } catch (e) { if (e.status === 404) return this._teardown('error', 'Pairing expired'); }
      await sleep(POLL_MS);
    }
    this._pollRemoteIce('host');
  }

  // ---- GUEST (laptop/tablet) ----
  async join(code) {
    this._reset('guest');
    this._alive = true;
    // Accept either a 6-digit pairing code or a long alphanumeric device key
    // (auto-reconnect), matching signal.php's 6–64 char validation.
    this.code = String(code).replace(/[^a-zA-Z0-9]/g, '');
    dbg(`join: ${this.code.length > 8 ? 'device-key' : 'code ' + this.code}`);
    if (this.code.length < 6) { this._set('error', 'Enter the 6-digit code'); return false; }
    this.pc = this._newPC();
    this.pc.ondatachannel = (e) => {
      this._wireChannel(e.channel);
      e.channel.onopen = () => { this.linked = true; this.send({ t: 'hello', app: 'inkvoice-web', ua: navigator.userAgent.slice(0, 120) }); };
    };

    this._set('connecting');
    let offer;
    try {
      ({ offer } = await sig('offer', this.code));   // claims it (one-time)
    } catch (e) {
      const m = e.status === 404 ? 'No device is offering that code'
              : e.status === 410 ? 'That code was already used' : 'Could not reach the pairing server';
      this._set('error', m); return false;
    }
    dbg('join: claimed offer, sending answer');
    await this.pc.setRemoteDescription(JSON.parse(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await sig('answer', this.code, { method: 'POST', body: JSON.stringify(answer) });

    this._trickleOut('guest');
    this._pollRemoteIce('guest');
    return true;
  }

  // ---- shared ICE plumbing ----
  _trickleOut(from) {
    this.pc.onicecandidate = (e) => {
      if (e.candidate && this._alive) {
        sig('ice', this.code, { method: 'POST', params: { from }, body: JSON.stringify(e.candidate) }).catch(() => {});
      }
    };
  }
  async _pollRemoteIce(from) {
    let since = 0;
    while (this._alive && this.state !== 'connected' && this.state !== 'closed') {
      try {
        const { ice, next } = await sig('ice', this.code, { params: { from, since } });
        for (const c of (ice || [])) { try { await this.pc.addIceCandidate(JSON.parse(c)); } catch {} }
        since = next ?? since;
      } catch (e) { if (e.status === 404) break; }
      await sleep(POLL_MS);
    }
  }

  // ---- lifecycle ----
  _reset(role) {
    this._teardownQuiet();
    this.role = role; this.error = null; this._pendingPeer = null;
  }
  _teardownQuiet() {
    this._alive = false;
    this.linked = false;
    this._stopHeartbeat();
    clearTimeout(this._connWatch);
    try { this.channel && this.channel.close(); } catch {}
    try { this.pc && this.pc.close(); } catch {}
    this.channel = null; this.pc = null;
  }
  _teardown(state, error = null) {
    if (this.code && this.role === 'host') sig('close', this.code, { method: 'POST' }).catch(() => {});
    this._teardownQuiet();
    this._set(state, error);
  }
  disconnect() { try { this.send({ t: 'bye' }); } catch {} this._teardown('closed'); }
}

export const Sync = new SyncManager();
