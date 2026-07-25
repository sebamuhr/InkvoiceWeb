// ===== Inkvoice local store (localStorage, fully offline) =====
import { uid } from './util.js';

const K = { PROFILE:'inkvoice_profile', CLIENTS:'inkvoice_clients', INVOICES:'inkvoice_invoices' };

// Tax-number colour palette (same order as the Android app)
export const TAX_COLORS = ['#2196F3','#4CAF50','#FF9800','#9C27B0'];

// PDF styles — these match the four Android layouts.
export const PDF_STYLES = ['Professional','Elegant','Minimalist','Classic'];

export const CURRENCIES = ['USD','EUR','GBP','CHF','CAD','AUD','JPY'];
export const LANGUAGES = ['English','German','Spanish','French'];

export const DEFAULT_PROFILE = {
  businessName:'', ownerName:'', address:'', email:'', website:'', phone:'',
  taxNumbers:[],                 // [{label, number, color}]
  bankingInformation:'',
  defaultTaxPercentage:0,
  footerNotes:'',
  notes:'',
  currency:'USD',
  logoUri:'',
  preferredPdfStyle:'Professional',
  startFromInvoiceNumber:1,
  lastInvoiceNumberUsed:0,
  lastQuotationNumberUsed:0,
  isB2GEnabled:false,
  advancedSharingOptions:false,
  appLanguage:'English',
  invoiceLanguage:'English',
};

const read = (k, fallback) => {
  try{ const d = localStorage.getItem(k); return d ? JSON.parse(d) : fallback; }
  catch{ return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ----- Change bus (drives device sync) -----
// Every local write emits a change so the sync layer can broadcast it to a
// connected device. While `muted` (applying a remote change) we DON'T emit,
// which prevents an infinite echo between the two devices.
const K_CARD = 'inkvoice_card_color';
const _changeCbs = new Set();
let _muted = false;
export const onStoreChange = (cb) => { _changeCbs.add(cb); return () => _changeCbs.delete(cb); };
function emit(evt){ if(!_muted) _changeCbs.forEach(cb => { try{ cb(evt); }catch{} }); }
const silently = (fn) => { const prev = _muted; _muted = true; try{ return fn(); } finally { _muted = prev; } };

// ----- Biz-card colour (routed through the store so it syncs) -----
export const getCardColor = () => localStorage.getItem(K_CARD) || '#FFFFFF';
export function saveCardColor(hex){ localStorage.setItem(K_CARD, hex); emit({entity:'card',action:'upsert',payload:{color:hex}}); }

// ----- Full mirror: snapshot / apply (phone is boss) -----
export function snapshot(){
  return { profile:read(K.PROFILE,{}), clients:read(K.CLIENTS,[]), invoices:read(K.INVOICES,[]), card:getCardColor() };
}
export function applySnapshot(s){
  silently(() => {
    if(s.profile)  write(K.PROFILE, { ...DEFAULT_PROFILE, ...s.profile });
    if(s.clients)  write(K.CLIENTS, s.clients);
    if(s.invoices) write(K.INVOICES, s.invoices);
    if(s.card)     localStorage.setItem(K_CARD, s.card);
  });
}
// Apply one incoming change from the peer (never re-broadcast).
export function applyOp(op){
  if(!op) return;
  silently(() => {
    if(op.entity==='invoice' && op.action==='delete') deleteInvoice(op.payload.id);
    else if(op.entity==='invoice') saveInvoice(op.payload);
    else if(op.entity==='profile') saveProfile(op.payload);
    else if(op.entity==='client')  saveClient(op.payload);
    else if(op.entity==='card')    localStorage.setItem(K_CARD, op.payload.color);
  });
}

// ----- Profile -----
export const getProfile = () => ({ ...DEFAULT_PROFILE, ...(read(K.PROFILE, {})) });
export function saveProfile(p){ const merged = { ...DEFAULT_PROFILE, ...p }; write(K.PROFILE, merged); emit({entity:'profile',action:'upsert',payload:merged}); return merged; }

// ----- Clients -----
export const getClients = () => read(K.CLIENTS, []);
export function saveClient(c){
  const list = getClients();
  const i = list.findIndex(x => x.id === c.id);
  if(i>=0) list[i] = c; else list.push(c);
  write(K.CLIENTS, list);
  emit({entity:'client',action:'upsert',payload:c});
  return c;
}
export const findClientByName = (name) =>
  getClients().find(c => (c.name||'').trim().toLowerCase() === (name||'').trim().toLowerCase());

// ----- Invoices -----
export const getInvoices = () => read(K.INVOICES, []);
export const getInvoice = (id) => getInvoices().find(i => i.id === id);
export function saveInvoice(inv){
  const list = getInvoices();
  const i = list.findIndex(x => x.id === inv.id);
  if(i>=0) list[i] = inv; else list.push(inv);
  try {
    write(K.INVOICES, list);
  } catch(e){
    // localStorage is full (typically a large embedded logo). Signal a clear, CATCHABLE error
    // so the caller can warn the user AND skip consuming the number → no lost/burned document.
    const err = new Error('Storage is full'); err.code = 'STORAGE_FULL'; throw err;
  }
  emit({entity:'invoice',action:'upsert',payload:inv});
  return inv;
}
export function deleteInvoice(id){
  write(K.INVOICES, getInvoices().filter(i => i.id !== id));
  emit({entity:'invoice',action:'delete',payload:{id}});
}

// Wipe ALL document/profile data on THIS device. Used ONLY by the laptop/guest terminal,
// which must never keep a copy across sessions — it holds data only while live-mirroring
// the phone, and forgets everything the instant it disconnects. Uses direct removeItem so
// it emits NO sync op → it can never propagate a delete/wipe to the phone. The pairing keys
// (device/pair key) are deliberately kept so reconnect stays seamless.
// NEVER call this on the phone (the boss) — it would erase the real, only copy of the data.
export function wipeLocalData(){
  localStorage.removeItem(K.PROFILE);
  localStorage.removeItem(K.CLIENTS);
  localStorage.removeItem(K.INVOICES);
  localStorage.removeItem(K_CARD);
}

// ===== Data safety: persistent storage, backup / restore, backup reminder =====
// The app is deliberately no-cloud, so on-device localStorage is the only copy. It can be
// evicted under storage pressure or wiped when the user clears "site data". Two safeguards:

// 1) Ask the browser to make our storage PERSISTENT so it is not auto-evicted. (Does NOT
//    stop a manual "clear site data" — only a restorable backup protects against that.)
export async function requestPersistentStorage(){
  try{
    if(navigator.storage && navigator.storage.persist){
      if(await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  }catch{}
  return false;
}

// 2) Backup / restore — a JSON file the user keeps OFF the device (Drive / email). This is
//    the real safety net: it survives a wipe, a lost phone, or moving to a new device.
export function backupData(){
  return {
    app:'inkvoice-web', ts:Date.now(),
    profile: localStorage.getItem(K.PROFILE),
    clients: localStorage.getItem(K.CLIENTS),
    invoices: localStorage.getItem(K.INVOICES),
    card: localStorage.getItem(K_CARD),
  };
}
export function downloadBackup(){
  const blob = new Blob([JSON.stringify(backupData(), null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inkvoice-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  resetBackupReminder();
}
// Restore a backup file. Accepts values as raw JSON strings (our format) or parsed objects.
// Throws if the file isn't a usable Inkvoice backup so the caller can warn the user.
export function importBackup(data){
  if(!data || typeof data !== 'object') throw new Error('Not a valid Inkvoice backup file.');
  if(!['profile','clients','invoices','card'].some(k => data[k] != null)) throw new Error('This file has no Inkvoice data.');
  const put = (key, val) => {
    if(val == null) return;
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    JSON.parse(str);                    // validate before writing (throws → caught by caller)
    localStorage.setItem(key, str);
  };
  put(K.PROFILE, data.profile);
  put(K.CLIENTS, data.clients);
  put(K.INVOICES, data.invoices);
  if(data.card != null) localStorage.setItem(K_CARD, String(data.card));
  resetBackupReminder();
}

// Backup reminder: nudge after every 5 NEW documents created since the last backup.
const K_BACKUP_CT = 'inkvoice_docs_since_backup';
export function noteDocumentCreated(){
  const n = (parseInt(localStorage.getItem(K_BACKUP_CT) || '0', 10) || 0) + 1;
  localStorage.setItem(K_BACKUP_CT, String(n));
  return n;
}
export const docsSinceBackup = () => parseInt(localStorage.getItem(K_BACKUP_CT) || '0', 10) || 0;
export function resetBackupReminder(){ localStorage.setItem(K_BACKUP_CT, '0'); }

// ----- Sequential numbering (per type, like the Android counters) -----
const pad = (n) => String(n).padStart(3,'0');
// Highest number already used by a saved document of this type. Used as a floor so a
// new number can NEVER collide with an existing one, even if the profile counter drifted
// (e.g. from older builds that overwrote in place without consuming a number).
function maxUsedNumber(type){
  return getInvoices()
    .filter(i => (i.type||'invoice')===type)
    .reduce((m,i)=>{ const n = parseInt(String(i.invoiceNumber||'').replace(/\D/g,''),10); return (!isNaN(n)&&n>m)?n:m; }, 0);
}
export function peekNextNumber(type='invoice'){
  const p = getProfile();
  const used = maxUsedNumber(type);
  if(type==='quotation'){
    const next = Math.max(1, (p.lastQuotationNumberUsed||0)+1, used+1);
    return 'Q'+pad(next);
  }
  const base = p.startFromInvoiceNumber||1;
  const next = Math.max(base, (p.lastInvoiceNumberUsed||0)+1, used+1);
  return 'N'+pad(next);
}
// Record that a number was consumed (call on NEW documents only).
export function consumeNumber(type, numberStr){
  const p = getProfile();
  const n = parseInt(String(numberStr).replace(/\D/g,''),10);
  if(isNaN(n)) return;
  if(type==='quotation'){ if(n > (p.lastQuotationNumberUsed||0)) p.lastQuotationNumberUsed = n; }
  else { if(n > (p.lastInvoiceNumberUsed||0)) p.lastInvoiceNumberUsed = n; }
  saveProfile(p);
}

export { uid };
