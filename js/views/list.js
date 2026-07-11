import { getInvoices, saveInvoice, deleteInvoice, getProfile } from '../store.js';
import { openInvoicePdf } from '../pdf.js';
import { money, money2, fmtISO, esc, toast, dialog } from '../util.js';
import { Icon } from '../icons.js';
import { mountAdSlot } from '../ads.js';

let filterStatus = 'All';

export function html(ctx){
  const type = ctx.arg || 'invoice';
  const p = getProfile();
  let docs = getInvoices()
    .filter(i => (i.type||'invoice')===type)
    // Newest at TOP, ordered by the numeric part of the document number descending
    // (N001, N002… / Q001, Q002…). Matches the Android app, which sorts on the number
    // — NOT on the creation date (that field is day-granular, so same-day documents
    // would tie and fall back to insertion order = oldest-first, the "wrong way around"
    // the user reported). creationDateMillis is only a tiebreaker for equal numbers.
    .sort((a,b)=> (docNum(b)-docNum(a)) || ((b.creationDateMillis||0)-(a.creationDateMillis||0)));
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

// Extract the integer from a document number like "N001"/"Q061"/"N°7" → 1/61/7.
// Mirrors Android's extractNumber(); used to order the list newest-first by number.
function docNum(inv){
  const m = String(inv && inv.invoiceNumber || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
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
    <div style="min-width:0;flex:1;cursor:pointer" data-open="${inv.id}">
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

  // Tapping a card: invoices open the PDF straight in the browser (Android has no edit
  // for invoices). Quotations open a "Select Action" dialog — View / Share or Edit —
  // matching the Android QuotationListScreen action dialog. There is no custom in-app
  // viewer; "view" just opens the real PDF in the browser (native Share/Save lives there).
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', async () => {
    const id = el.dataset.open;
    const inv = getInvoices().find(i => i.id === id);
    if(!inv) return;
    if((inv.type||'invoice') !== 'quotation'){ openInvoicePdf(inv); return; }
    const choice = await dialog({
      title:'Select Action',
      message:'What do you want to do with this quotation?',
      buttons:[
        { label:'Edit', value:'edit', class:'ghost' },
        { label:'View / Share', value:'view' },
      ],
    });
    if(choice==='view') openInvoicePdf(inv);
    else if(choice==='edit') ctx.navigate('/create?edit='+id);
  }));

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
