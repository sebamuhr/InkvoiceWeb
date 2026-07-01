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

// ----- Profile -----
export const getProfile = () => ({ ...DEFAULT_PROFILE, ...(read(K.PROFILE, {})) });
export const saveProfile = (p) => write(K.PROFILE, { ...DEFAULT_PROFILE, ...p });

// ----- Clients -----
export const getClients = () => read(K.CLIENTS, []);
export function saveClient(c){
  const list = getClients();
  const i = list.findIndex(x => x.id === c.id);
  if(i>=0) list[i] = c; else list.push(c);
  write(K.CLIENTS, list);
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
  return inv;
}
export function deleteInvoice(id){
  write(K.INVOICES, getInvoices().filter(i => i.id !== id));
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
