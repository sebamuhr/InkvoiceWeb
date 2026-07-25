// ===== Inkvoice — sync bridge (glue between the transport and the data) =====
//
// Wires js/sync.js (WebRTC transport) to js/store.js (localStorage data):
//  - On connect, the HOST (phone, the boss) pushes a full snapshot; the guest
//    overwrites its local data with it.
//  - Any local write emits a change → broadcast as an `op` to the peer.
//  - Any incoming `op`/`snapshot` is applied silently (no re-broadcast) and the
//    current screen is re-rendered if it's a safe (non-form) view.

import { Sync, SyncLog } from './sync.js';
import { snapshot, applySnapshot, applyOp, onStoreChange } from './store.js';

let _rerender = () => {};

export function initSyncBridge(rerender){
  _rerender = typeof rerender === 'function' ? rerender : (() => {});

  // Local change → tell the peer.
  onStoreChange(op => Sync.send({ t: 'op', op, ts: Date.now() }));

  // Incoming messages from the peer.
  Sync.onMessage(msg => {
    if(msg.t === 'snapshot'){
      // THE BOSS PROTECTS ITS OWN DATA. A full snapshot REPLACES every invoice, the profile
      // (logo, numbers…), clients and card colour. Only a GUEST (the laptop terminal) may
      // accept that — it's how the laptop mirrors the phone. The HOST (phone = the single
      // source of truth) must NEVER let a peer overwrite its whole dataset, or a laptop
      // running old/stale code could revert the phone to old invoices/logo/numbers on
      // reconnect (exactly the "it went back to the old version" bug). Guard by an explicit
      // allowlist: apply ONLY when we are definitely the guest.
      if(Sync.role !== 'guest'){
        try{ SyncLog.add('[bridge] IGNORED incoming snapshot (I am the boss — my data stays)'); }catch{}
        return;
      }
      applySnapshot(msg.snap); _rerender();
    } else if(msg.t === 'op'){
      // The boss also won't let a peer overwrite its PROFILE or CARD colour (logo, business
      // name, currency, invoice/quotation numbers, branding) — those live on the phone only.
      // Invoices and clients STILL flow up, so the laptop can create documents while connected.
      // The phone's numbering floors on its own saved invoices, so it stays correct without the
      // guest's counter/profile op. This stops a stale laptop from reverting the logo/numbers.
      if(Sync.role === 'host' && msg.op && (msg.op.entity === 'profile' || msg.op.entity === 'card')){
        try{ SyncLog.add('[bridge] IGNORED guest ' + msg.op.entity + ' op (phone owns its profile/branding)'); }catch{}
        return;
      }
      applyOp(msg.op); _rerender();
    }
  });

  // The instant this device becomes connected AS the host, push the full mirror.
  Sync.onState((state) => {
    if(state === 'connected' && Sync.role === 'host'){
      Sync.send({ t: 'snapshot', snap: snapshot() });
    }
  });
}
