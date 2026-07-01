// ===== Inkvoice utilities: ids, money, dates, invoice math =====

export const uid = () =>
  (crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxxxxxx4xxxyxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });

const CURRENCY_SYMBOL = { USD:'$', EUR:'€', GBP:'£', CHF:'CHF ', CAD:'$', AUD:'$', JPY:'¥' };
export const currencySymbol = (c) => CURRENCY_SYMBOL[c] || (c ? c + ' ' : '$');

// Money for the UI (uses locale grouping)
export function money(amount, currency='USD'){
  const n = Number(amount)||0;
  try{
    return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n);
  }catch{
    return currencySymbol(currency) + n.toFixed(2);
  }
}
// Plain symbol + fixed (used inside generated PDFs for predictable width)
export const money2 = (amount, currency='USD') =>
  currencySymbol(currency) + (Number(amount)||0).toFixed(2);

export function fmtDate(ms){
  if(!ms) return '';
  const d = new Date(Number(ms));
  if(isNaN(d)) return '';
  return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}
// ISO yyyy-mm-dd (matches the Android list/date display)
export function fmtISO(ms){ if(!ms) return ''; const d=new Date(Number(ms)); return isNaN(d)?'':d.toISOString().split('T')[0]; }
export const todayMs = () => { const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); };
export const plusDaysMs = (ms,days) => Number(ms) + days*86400000;
export const toInputDate = (ms) => { const d=new Date(Number(ms)); return isNaN(d)?'':d.toISOString().split('T')[0]; };
export const fromInputDate = (s) => s ? new Date(s+'T00:00:00').getTime() : null;

// ----- Invoice math (mirrors the Android app exactly) -----
// line = qty*price ; subtotal = Σline ; discountAmt = subtotal*disc% ;
// taxBasis = subtotal-discountAmt ; taxAmt = taxBasis*tax% ;
// grandTotal = taxBasis+taxAmt ; due = grandTotal-advance
export function compute(items, taxPct=0, discountPct=0, advance=0){
  const subtotal = (items||[]).reduce((s,i)=> s + (Number(i.quantity)||0)*(Number(i.unitPrice)||0), 0);
  const discountAmount = subtotal * (Number(discountPct)||0)/100;
  const taxBasis = subtotal - discountAmount;
  const taxAmount = taxBasis * (Number(taxPct)||0)/100;
  const grandTotal = taxBasis + taxAmount;
  const dueAmount = grandTotal - (Number(advance)||0);
  return { subtotal, discountAmount, taxBasis, taxAmount, grandTotal, dueAmount };
}

export const STATUSES = ['Pending','Paid','Overdue','Cancelled'];

// Escape user text for safe HTML injection
export function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

let toastTimer;
export function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
