import { getInvoice, saveInvoice, deleteInvoice } from '../store.js';
import { pdfBlob, pdfFilename } from '../pdf.js';
import { money, esc, toast, STATUSES } from '../util.js';
import { Icon } from '../icons.js';

function currentId(ctx){ return ctx.path.split('/')[2]; }

export function html(ctx){
  const inv = getInvoice(currentId(ctx));
  if(!inv) return `<div class="screen"><div class="empty">${Icon.doc}<div>Document not found.</div>
    <button class="btn ghost" style="margin-top:12px" onclick="nav('/invoices')">Back to list</button></div></div>`;

  const isQuote = inv.type==='quotation';
  return `<div class="screen">
    <div class="topbar">
      <button class="back" onclick="nav('/${isQuote?'quotations':'invoices'}')">${Icon.back} ${isQuote?'Quotes':'Invoices'}</button>
      <span class="badge ${inv.status}">${inv.status}</span>
    </div>
    <h1 style="margin:0 0 4px;font-size:22px">${esc(inv.invoiceNumber)}</h1>
    <div class="sub" style="color:var(--muted);margin-bottom:14px">${esc(inv.clientName)} · ${money(inv.grandTotal, inv.currency)}</div>

    <div class="view-actions">
      <button class="btn" id="share">${Icon.share} Send PDF</button>
      <button class="btn ghost" id="save">${Icon.download} Save</button>
    </div>

    <iframe id="pdf" class="pdf-frame" title="PDF preview"></iframe>

    <div class="card" style="margin-top:14px">
      <div class="field"><label>Status</label>
        <select id="status">${STATUSES.map(s=>`<option ${inv.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="row">
        <button class="btn ghost" onclick="nav('/create?edit=${inv.id}')">${Icon.edit} Edit</button>
        <button class="btn ghost" id="dup">${Icon.copy} Duplicate</button>
      </div>
      ${isQuote ? `<button class="btn ghost block" id="convert" style="margin-top:10px">${Icon.arrowRight} Convert to invoice</button>`:''}
      <button class="btn danger block" id="del" style="margin-top:10px">${Icon.trash} Delete</button>
    </div>
  </div>`;
}

export function mount(ctx){
  const inv = getInvoice(currentId(ctx));
  if(!inv) return;

  // Render the PDF into the iframe (preview == the exported file).
  // Blob URLs render PDFs more reliably than data URIs on iOS Safari.
  try{
    const url = URL.createObjectURL(pdfBlob(inv));
    document.getElementById('pdf').src = url;
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }catch(e){ toast('PDF engine still loading — try again'); }

  document.getElementById('share').addEventListener('click', async () => {
    try{
      const blob = pdfBlob(inv);
      const file = new File([blob], pdfFilename(inv), { type:'application/pdf' });
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:inv.invoiceNumber });
      }else{
        downloadBlob(blob, pdfFilename(inv));
        toast('Saved — use Files/Share to send');
      }
    }catch(e){ /* user cancelled share */ }
  });

  document.getElementById('save').addEventListener('click', () => {
    downloadBlob(pdfBlob(inv), pdfFilename(inv));
    toast('PDF saved');
  });

  document.getElementById('status').addEventListener('change', e => {
    inv.status = e.target.value; saveInvoice(inv);
    document.querySelector('.badge').className = 'badge '+inv.status;
    document.querySelector('.badge').textContent = inv.status;
    toast('Status updated');
  });

  document.getElementById('dup').addEventListener('click', () => ctx.navigate('/create?duplicate='+inv.id));

  const conv = document.getElementById('convert');
  if(conv) conv.addEventListener('click', () => ctx.navigate('/create?duplicate='+inv.id+'&as=invoice'));

  document.getElementById('del').addEventListener('click', () => {
    if(confirm('Delete this document? This cannot be undone.')){
      deleteInvoice(inv.id); toast('Deleted');
      ctx.navigate('/'+(inv.type==='quotation'?'quotations':'invoices'));
    }
  });
}

function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}
