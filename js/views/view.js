import { getInvoice } from '../store.js';
import { pdfBlob, pdfFilename } from '../pdf.js';
import { toast } from '../util.js';
import { Icon } from '../icons.js';

function currentId(ctx){ return ctx.path.split('/')[2]; }
let blobUrl = null;

export function html(ctx){
  const inv = getInvoice(currentId(ctx));
  if(!inv) return `<div class="screen"><div class="empty">${Icon.doc}<div>Document not found.</div>
    <button class="btn" style="margin-top:14px" onclick="nav('/invoices')">Back to list</button></div></div>`;

  const isQuote = inv.type==='quotation';
  // Clean full-screen PDF viewer — matches the Android PdfViewerActivity:
  // empty title, single Share button, chrome-less PDF with zoom/pan.
  return `<div class="pdf-screen">
    <div class="pdf-topbar">
      <button class="iconbtn" onclick="nav('/${isQuote?'quotations':'invoices'}')" aria-label="Back">${Icon.back}</button>
      <button class="btn btn-share" id="share">${Icon.share} Share PDF</button>
    </div>
    <div class="pdf-stage">
      <iframe id="pdf" class="pdf-doc" title="Invoice PDF"></iframe>
    </div>
  </div>`;
}

export function mount(ctx){
  const inv = getInvoice(currentId(ctx));
  if(!inv) return;

  try{
    if(blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(pdfBlob(inv));
    // #toolbar=0&navpanes=0&scrollbar=0 hides the browser PDF chrome → clean page with pinch-zoom + pan
    document.getElementById('pdf').src = blobUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';
  }catch(e){ toast('PDF engine still loading — try again'); }

  document.getElementById('share').addEventListener('click', async () => {
    try{
      const blob = pdfBlob(inv);
      const file = new File([blob], pdfFilename(inv), { type:'application/pdf' });
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:inv.invoiceNumber });
      }else{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download=pdfFilename(inv);
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 4000);
        toast('Saved — use Files/Share to send');
      }
    }catch(e){ /* user cancelled */ }
  });
}
