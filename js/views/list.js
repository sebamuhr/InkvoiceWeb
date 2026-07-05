import { getInvoices, saveInvoice, deleteInvoice, getProfile } from '../store.js';
import { money, money2, fmtISO, esc, toast } from '../util.js';
import { Icon } from '../icons.js';
import { mountAdSlot } from '../ads.js';

let filterStatus = 'All';

export function html(ctx){
  const type = ctx.arg || 'invoice';
  const p = getProfile();
  let docs = getInvoices()
    .filter(i => (i.type||'invoice')===type)
    .sort((a,b)=> (b.creationDateMillis||0)-(a.creationDateMillis||0));
  if(filterStatus!=='All') docs = docs.filter(i => i.status===filterStatus);

  const total = docs.reduce((a,i)=> a+(Number(i.grandTotal)||0), 0);
  const tax   = docs.reduce((a,i)=> a+(Number(i.taxAmount)||0), 0);
  const taxPct = docs.length ? (docs[0].taxRatePercentage||0) : (p.defaultTaxPercentage||0);

  // Cards with an ad interleaved after every 5th document (5,10,15…).
  // Fewer than 5 → no ad; the number of ads grows with the list.
  const cards = docs.length ? cardsWithAds(docs)
    : `<div class="empty">${Icon.doc}<div>No ${type}s yet. Tap <b>Create</b> to add one.</div></div>`;

  const opts = ['All','Pending','Paid','Overdue','Cancelled']
    .map(s=>`<option ${filterStatus===s?'selected':''}>${s}</option>`).join('');

  return `<div class="screen">
    <div class="totalcard">
      <div>
        <div class="big">TOTAL: ${money2(total,p.currency)}</div>
        <div class="sub">Tax ${taxPct}%: ${money2(tax,p.currency)}</div>
      </div>
      <div class="filter">
        <select id="filter">${opts}</select>
        <span class="chev">${Icon.chev}</span>
      </div>
    </div>

    <div class="radios">
      <div class="radio ${type==='invoice'?'on':''}" onclick="nav('/invoices')"><span class="dot"></span>Invoices</div>
      <div class="radio ${type==='quotation'?'on':''}" onclick="nav('/quotations')"><span class="dot"></span>Quotations</div>
    </div>

    ${cards}
  </div>`;
}

const ADS_EVERY = 5;
function cardsWithAds(docs){
  // Anchor each ad to a boundary counted from the OLDEST item (list is newest-first),
  // so an ad stays put between the same document pair (#5/#6, #10/#11…) as new
  // documents are added on top — matches the Android app (InvoiceListScreen.kt).
  let out = '', ad = 0;
  docs.forEach((inv, i) => {
    out += card(inv);
    const below = docs.length - 1 - i;
    if(below > 0 && below % ADS_EVERY === 0) out += `<div class="ad-slot" id="ad-slot-${ad++}"></div>`;
  });
  return out;
}

function card(inv){
  const p = getProfile();
  const advance = Number(inv.advancePayment)||0;
  const due = (Number(inv.grandTotal)||0) - advance;
  const paid = inv.status==='Paid';
  const prefix = (inv.type==='quotation') ? 'Q' : 'N';
  return `<div class="doccard">
    <div style="min-width:0;flex:1;cursor:pointer" onclick="nav('/view/${inv.id}')">
      <div class="no">${prefix}° ${esc(String(inv.invoiceNumber).replace(/^[NQ]/,''))}</div>
      <div class="client">${esc(inv.clientName||'—')}</div>
      <div class="meta">Created: ${fmtISO(inv.creationDateMillis)}<br>Total: ${money2(inv.grandTotal,p.currency)}</div>
      ${advance>0?`<div class="due">Due: ${money2(due,p.currency)}</div>`:''}
    </div>
    <div class="right">
      <div class="toggle ${paid?'paid':''}" data-toggle="${inv.id}" title="${paid?'Paid':'Unpaid'}"><span class="knob"></span></div>
      <button class="iconbtn trash" data-del="${inv.id}">${Icon.trash}</button>
    </div>
  </div>`;
}

export function mount(ctx){
  document.querySelectorAll('.ad-slot').forEach((el, i) => mountAdSlot(el, i));

  const f = document.getElementById('filter');
  if(f) f.addEventListener('change', e => { filterStatus = e.target.value; ctx.navigate(ctx.path); });

  document.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const inv = getInvoices().find(i=>i.id===el.dataset.toggle);
    inv.status = inv.status==='Paid' ? 'Pending' : 'Paid';
    saveInvoice(inv);
    el.classList.toggle('paid', inv.status==='Paid');
  }));

  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if(confirm('Delete this document? This cannot be undone.')){
      deleteInvoice(b.dataset.del); toast('Deleted'); ctx.navigate(ctx.path);
    }
  }));
}
