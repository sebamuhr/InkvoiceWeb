import { getProfile, getInvoices } from '../store.js';
import { money, esc } from '../util.js';
import { Icon } from '../icons.js';

export function html(){
  const p = getProfile();
  const invoices = getInvoices();

  if(!p.businessName){
    return `<div class="screen">
      <div class="welcome">
        <h2>Welcome to Inkvoice</h2>
        <p>Create invoices, quotes & business cards — free, private, fully offline.</p>
        <button class="btn" onclick="nav('/profile')">Set up your business</button>
      </div>
      <div class="empty">${Icon.doc}<div>Once your profile is set, tap <b>+</b> to create your first document.</div></div>
    </div>`;
  }

  const sum = (f) => invoices.filter(f).reduce((a,i)=> a + (Number(i.grandTotal)||0), 0);
  const total   = invoices.reduce((a,i)=> a + (Number(i.grandTotal)||0), 0);
  const pending = sum(i => i.status==='Pending');
  const paid    = sum(i => i.status==='Paid');
  const overdue = sum(i => i.status==='Overdue');

  const stat = (label, val, color, icon) => `
    <div class="stat">
      <div class="label"><span class="dot" style="background:${color}"></span>${label}</div>
      <div class="value">${money(val, p.currency)}</div>
    </div>`;

  const recent = [...invoices].sort((a,b)=> (b.creationDateMillis||0)-(a.creationDateMillis||0)).slice(0,6);
  const recentHtml = recent.length ? recent.map(rowItem).join('')
    : `<div class="empty">${Icon.doc}<div>No documents yet.</div></div>`;

  return `<div class="screen">
    <div class="topbar">
      <div><h1>Hi, ${esc(p.ownerName || p.businessName)}</h1><div class="sub">Here's your activity</div></div>
    </div>
    <div class="stats">
      ${stat('Total', total, '#2563EB', Icon.dollar)}
      ${stat('Pending', pending, '#d97706', Icon.clock)}
      ${stat('Paid', paid, '#16a34a', Icon.check)}
      ${stat('Overdue', overdue, '#dc2626', Icon.alert)}
    </div>
    <div class="card">
      <h3>${Icon.list} Recent documents</h3>
      <div class="list">${recentHtml}</div>
    </div>
  </div>`;
}

function rowItem(inv){
  const isInv = inv.type !== 'quotation';
  return `<div class="row-item" onclick="nav('/view/${inv.id}')">
    <div style="display:flex;align-items:center;gap:12px;min-width:0">
      <div class="avatar ${isInv?'inv':'qt'}">${isInv?'INV':'QT'}</div>
      <div style="min-width:0">
        <div class="num">${esc(inv.invoiceNumber)}</div>
        <div class="who">${esc(inv.clientName||'—')}</div>
      </div>
    </div>
    <div>
      <div class="amt">${money(inv.grandTotal, inv.currency)}</div>
      <div style="text-align:right;margin-top:4px"><span class="badge ${inv.status}">${inv.status}</span></div>
    </div>
  </div>`;
}
