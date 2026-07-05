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
  write(K.INVOICES, list);
  emit({entity:'invoice',action:'upsert',payload:inv});
  return inv;
}
export function deleteInvoice(id){
  write(K.INVOICES, getInvoices().filter(i => i.id !== id));
  emit({entity:'invoice',action:'delete',payload:{id}});
}

// ----- Sequential numbering (per type, like the Android counters) -----
const pad = (n) => String(n).padStart(3,'0');
export function peekNextNumber(type='invoice'){
  const p = getProfile();
  if(type==='quotation'){
    const next = Math.max(1, (p.lastQuotationNumberUsed||0)+1);
    return 'Q'+pad(next);
  }
  const base = p.startFromInvoiceNumber||1;
  const next = Math.max(base, (p.lastInvoiceNumberUsed||0)+1);
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
