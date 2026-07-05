// ===== Inkvoice — sync bridge (glue between the transport and the data) =====
//
// Wires js/sync.js (WebRTC transport) to js/store.js (localStorage data):
//  - On connect, the HOST (phone, the boss) pushes a full snapshot; the guest
//    overwrites its local data with it.
//  - Any local write emits a change → broadcast as an `op` to the peer.
//  - Any incoming `op`/`snapshot` is applied silently (no re-broadcast) and the
//    current screen is re-rendered if it's a safe (non-form) view.

import { Sync } from './sync.js';
import { snapshot, applySnapshot, applyOp, onStoreChange } from './store.js';

let _rerender = () => {};

export function initSyncBridge(rerender){
  _rerender = typeof rerender === 'function' ? rerender : (() => {});

  // Local change → tell the peer.
  onStoreChange(op => Sync.send({ t: 'op', op, ts: Date.now() }));

  // Incoming messages from the peer.
  Sync.onMessage(msg => {
    if(msg.t === 'snapshot'){ applySnapshot(msg.snap); _rerender(); }
    else if(msg.t === 'op'){ applyOp(msg.op); _rerender(); }
  });

  // The instant this device becomes connected AS the host, push the full mirror.
  Sync.onState((state) => {
    if(state === 'connected' && Sync.role === 'host'){
      Sync.send({ t: 'snapshot', snap: snapshot() });
    }
  });
}
