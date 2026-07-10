import { getInvoice } from '../store.js';
import { pdfBlob, pdfFilename } from '../pdf.js';
import { toast, shareFile } from '../util.js';
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
    let file;
    try{
      file = new File([pdfBlob(inv)], pdfFilename(inv), { type:'application/pdf' });
    }catch(e){ toast('PDF engine still loading — try again'); return; }
    const how = await shareFile(file, String(inv.invoiceNumber||'Invoice'));
    if(how==='opened') toast('Sharing files isn’t supported here — opened the PDF so you can share or save it');
  });
}
