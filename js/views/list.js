import { getInvoices, saveInvoice, deleteInvoice, getProfile } from '../store.js';
import { openInvoicePdf } from '../pdf.js';
import { openInvoiceXml } from '../einvoice.js';
import { money, money2, fmtISO, esc, toast, dialog } from '../util.js';
import { Icon } from '../icons.js';
import { mountAdSlot, adDebugOn } from '../ads.js';
import { t } from '../i18n.js';

let filterStatus = 'All';

// Open/share a document. With "Advanced Sharing Options" ON (Profile), the user first
// picks a format — PDF, the EN 16931 e-invoice XML (XRechnung/ZUGFeRD), or both. With it
// OFF (default) the behaviour is unchanged: the PDF opens straight in the browser.
async function shareDoc(inv){
  if(!getProfile().advancedSharingOptions){ openInvoicePdf(inv); return; }
  const fmt = await dialog({
    title:t('Share/Export Invoice'),
    buttons:[
      { label:t('Share PDF'),       value:'pdf'  },
      { label:t('Share XML'),       value:'xml'  },
      { label:t('Both PDF & XML'),  value:'both' },
    ],
  });
  if(fmt==='pdf')  openInvoicePdf(inv);
  else if(fmt==='xml')  openInvoiceXml(inv);
  else if(fmt==='both'){ openInvoicePdf(inv); openInvoiceXml(inv); }
}

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
  const emptyMsg = (type==='quotation' ? t('No quotations yet. Tap Create to add one.') : t('No invoices yet. Tap Create to add one.'));
  const cards = docs.length ? cardsWithAds(docs)
    : `<div class="empty">${Icon.doc}<div>${emptyMsg}</div></div>`;

  // The option VALUE stays English (status is stored in English); only the label is translated.
  const opts = ['All','Pending','Paid','Overdue','Cancelled']
    .map(s=>`<option value="${s}" ${filterStatus===s?'selected':''}>${t(s)}</option>`).join('');

  return `<div class="screen">
    <div class="totalcard">
      <div>
        <div class="big">${t('Total').toUpperCase()}: ${money2(total,p.currency)}</div>
        <div class="sub">${t('Tax')} ${taxPct}%: ${money2(tax,p.currency)}</div>
      </div>
      <div class="filter">
        <select id="filter">${opts}</select>
        <span class="chev">${Icon.chev}</span>
      </div>
    </div>

    <div class="radios">
      <div class="radio ${type==='invoice'?'on':''}" onclick="nav('/invoices')"><span class="dot"></span>${t('Invoices')}</div>
      <div class="radio ${type==='quotation'?'on':''}" onclick="nav('/quotations')"><span class="dot"></span>${t('Quotations')}</div>
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
  // Diagnostic mode: one test slot at the top so ads can be checked with any list size.
  if(adDebugOn()) out += `<div class="ad-slot" id="ad-slot-${ad++}"></div>`;
  docs.forEach((inv, i) => {
    out += card(inv);
    const below = docs.length - 1 - i;
    if(below > 0 && below % ADS_EVERY === 0) out += `<div class="ad-slot" id="ad-slot-${ad++}"></div>`;
  });
  return out;
}

function card(inv){
  const advance = Number(inv.advancePayment)||0;
  const due = (Number(inv.grandTotal)||0) - advance;
  const paid = inv.status==='Paid';
  const prefix = (inv.type==='quotation') ? 'Q' : 'N';
  // Use the invoice's OWN frozen currency, never the live profile — a saved document must
  // never change when the profile currency changes. (Legacy docs without one fall back.)
  const curr = inv.currency || getProfile().currency;
  return `<div class="doccard">
    <div style="min-width:0;flex:1;cursor:pointer" data-open="${inv.id}">
      <div class="no">${prefix}° ${esc(String(inv.invoiceNumber).replace(/^[NQ]/,''))}</div>
      <div class="client">${esc(inv.clientName||'—')}</div>
      <div class="meta">${t('Created')}: ${fmtISO(inv.creationDateMillis)}<br>${t('Total')}: ${money2(inv.grandTotal,curr)}</div>
      ${advance>0?`<div class="due">${t('Due')}: ${money2(due,curr)}</div>`:''}
    </div>
    <div class="right">
      <div class="toggle ${paid?'paid':''}" data-toggle="${inv.id}" title="${paid?t('Paid'):t('Unpaid')}"><span class="knob"></span></div>
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
    if((inv.type||'invoice') !== 'quotation'){ shareDoc(inv); return; }
    const choice = await dialog({
      title:t('Select Action'),
      message:t('What do you want to do with this quotation?'),
      buttons:[
        { label:t('Edit'), value:'edit', class:'ghost' },
        { label:t('View / Share'), value:'view' },
      ],
    });
    if(choice==='view') shareDoc(inv);
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
    if(confirm(t('Delete this document? This cannot be undone.'))){
      deleteInvoice(b.dataset.del); toast(t('Deleted')); ctx.navigate(ctx.path);
    }
  }));
}
