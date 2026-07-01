import { getInvoices, deleteInvoice } from '../store.js';
import { money, fmtDate, esc, toast } from '../util.js';
import { Icon } from '../icons.js';

let search = '';

export function html(ctx){
  const type = ctx.arg || 'invoice';
  const term = search.trim().toLowerCase();
  let docs = getInvoices()
    .filter(i => (i.type||'invoice') === type)
    .sort((a,b)=> (b.creationDateMillis||0)-(a.creationDateMillis||0));
  if(term){
    docs = docs.filter(i =>
      (i.invoiceNumber||'').toLowerCase().includes(term) ||
      (i.clientName||'').toLowerCase().includes(term) ||
      (i.status||'').toLowerCase().includes(term));
  }

  const rows = docs.length ? docs.map(rowItem).join('')
    : `<div class="empty">${Icon.doc}<div>No ${type}s yet. Tap <b>+</b> to create one.</div></div>`;

  return `<div class="screen">
    <div class="topbar"><h1>Documents</h1></div>
    <div class="seg" style="margin-bottom:12px">
      <button class="${type==='invoice'?'on':''}" onclick="nav('/invoices')">Invoices</button>
      <button class="${type==='quotation'?'on':''}" onclick="nav('/quotations')">Quotations</button>
    </div>
    <div class="field" style="position:relative">
      <input id="search" placeholder="Search number, client, status…" value="${esc(search)}"
             style="padding-left:42px">
      <span style="position:absolute;left:13px;top:12px;color:var(--muted)">${Icon.search}</span>
    </div>
    <div class="card"><div class="list">${rows}</div></div>
  </div>`;
}

function rowItem(inv){
  const isInv = inv.type !== 'quotation';
  return `<div class="row-item">
    <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1" onclick="nav('/view/${inv.id}')">
      <div class="avatar ${isInv?'inv':'qt'}">${isInv?'INV':'QT'}</div>
      <div style="min-width:0">
        <div class="num">${esc(inv.invoiceNumber)} <span class="badge ${inv.status}" style="margin-left:4px">${inv.status}</span></div>
        <div class="who">${esc(inv.clientName||'—')} · ${fmtDate(inv.creationDateMillis)}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:2px">
      <div class="amt" style="margin-right:6px">${money(inv.grandTotal, inv.currency)}</div>
      <button class="iconbtn" title="Duplicate" data-dup="${inv.id}">${Icon.copy}</button>
      <button class="iconbtn danger" title="Delete" data-del="${inv.id}">${Icon.trash}</button>
    </div>
  </div>`;
}

export function mount(ctx){
  const s = document.getElementById('search');
  if(s){
    s.addEventListener('input', e => { search = e.target.value; });
    // re-render on debounce so the list filters live
    let t; s.addEventListener('input', () => { clearTimeout(t); t=setTimeout(()=>{
      const pos = s.selectionStart;
      ctx.navigate(ctx.path); // re-render current route
      const ns = document.getElementById('search');
      if(ns){ ns.focus(); ns.setSelectionRange(pos,pos); }
    }, 200); });
  }
  document.querySelectorAll('[data-dup]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); ctx.navigate('/create?duplicate='+b.dataset.dup); }));
  document.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', e => {
      e.stopPropagation();
      if(confirm('Delete this document? This cannot be undone.')){
        deleteInvoice(b.dataset.del); toast('Deleted'); ctx.navigate(ctx.path);
      }
    }));
}
