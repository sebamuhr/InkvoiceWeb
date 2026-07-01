// ===== Inkvoice PDF generation (jsPDF, offline) =====
// Reproduces the four Android invoice styles: Professional, Elegant,
// Minimalist, Classic. Returns a jsPDF doc you can preview / share / save.
import { money2, fmtDate, compute } from './util.js';

const A4 = { w:210, h:297 };
const M = 16; // page margin (mm)
const CONTENT_W = A4.w - M*2;

const TEAL = [13,148,136];
const GREY_ROW = [224,224,224];
const GREY_LIGHT = [236,236,236];
const ELEGANT_BG = [240,240,240];
const MINIMAL_BG = [147,196,125]; // the green page
const INK = [17,17,17];
const MUTED = [90,90,90];

function jsPDFCtor(){
  const ns = window.jspdf || window.jsPDF;
  if(!ns) throw new Error('jsPDF not loaded');
  return ns.jsPDF || ns;
}

// Fit an image inside a box (centred), preserving aspect ratio.
function addImageFit(doc, dataUrl, cx, cy, maxW, maxH){
  try{
    const fmt = /png/i.test(dataUrl) ? 'PNG' : /jpe?g/i.test(dataUrl) ? 'JPEG' : 'PNG';
    const props = doc.getImageProperties(dataUrl);
    let w = maxW, h = (props.height/props.width)*w;
    if(h > maxH){ h = maxH; w = (props.width/props.height)*h; }
    doc.addImage(dataUrl, fmt, cx - w/2, cy - h/2, w, h);
    return true;
  }catch{ return false; }
}

// Logo: image if present, else a circle outline with "Logo".
function drawLogo(doc, cx, cy, r, logoUri){
  if(logoUri && addImageFit(doc, logoUri, cx, cy, r*2, r*2)) return;
  doc.setDrawColor(120); doc.setLineWidth(0.3);
  doc.circle(cx, cy, r, 'S');
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120);
  doc.text('Logo', cx, cy+1, { align:'center' });
}

function setInk(doc){ doc.setTextColor(INK[0],INK[1],INK[2]); }
function setMuted(doc){ doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]); }

// "N° " + number (strip a leading invoice "N", keep "Q" for quotations)
function headerNumber(inv){
  const raw = String(inv.invoiceNumber||'');
  const shown = raw.replace(/^N(?=\d)/,'');
  return 'N° ' + shown;
}

function partyLines(title, name, address, email, extra){
  const lines = [];
  if(name) lines.push({ t:name, bold:true });
  (address||'').split('\n').filter(Boolean).forEach(l => lines.push({ t:l }));
  if(email) lines.push({ t:email, muted:true });
  (extra||[]).filter(Boolean).forEach(l => lines.push({ t:l, muted:true }));
  return lines;
}

function drawParty(doc, x, y, label, lines, w){
  doc.setFont('helvetica','bold'); doc.setFontSize(11); setInk(doc);
  doc.text(label, x, y);
  let yy = y + 6;
  doc.setFontSize(9.5);
  lines.forEach(ln => {
    doc.setFont('helvetica', ln.bold ? 'bold' : 'normal');
    ln.muted ? setMuted(doc) : setInk(doc);
    const wrapped = doc.splitTextToSize(ln.t, w);
    wrapped.forEach(wl => { doc.text(wl, x, yy); yy += 4.6; });
  });
  return yy;
}

// Item table. variant: 'rows' (grey first row), 'boxed' (Classic), 'plain'
function drawTable(doc, x, yStart, items, currency, variant){
  const right = x + CONTENT_W;
  const qtyX = x + CONTENT_W*0.66;
  const subX = right;
  let y = yStart;

  // header
  doc.setFont('helvetica','normal'); doc.setFontSize(11); setInk(doc);
  doc.text('Description', x, y);
  doc.text('Qty', qtyX, y, { align:'center' });
  doc.text('subtotal', subX, y, { align:'right' });
  y += 2.5;
  doc.setDrawColor(180); doc.setLineWidth(0.3);
  doc.line(x, y, right, y);
  y += 7;

  doc.setFontSize(10.5);
  (items.length ? items : [{description:'',quantity:0,unitPrice:0}]).forEach((it, idx) => {
    const line = (Number(it.quantity)||0)*(Number(it.unitPrice)||0);
    const rowH = 9;
    if(variant==='rows' && idx===0){
      doc.setFillColor(GREY_ROW[0],GREY_ROW[1],GREY_ROW[2]);
      doc.rect(x-2, y-6, CONTENT_W+4, rowH, 'F');
    }
    if(variant==='boxed'){
      const f = idx===0 ? GREY_ROW : GREY_LIGHT;
      doc.setFillColor(f[0],f[1],f[2]);
      doc.rect(x-2, y-6, CONTENT_W*0.6, rowH, 'F');                 // description cell
      doc.rect(x+CONTENT_W*0.62, y-6, CONTENT_W*0.16, rowH, 'F');   // qty cell
      doc.rect(right-CONTENT_W*0.18, y-6, CONTENT_W*0.18, rowH, 'F');// subtotal cell
    }
    setInk(doc);
    doc.setFont('helvetica', idx===0 ? 'bold':'normal');
    const desc = doc.splitTextToSize(it.description||'', CONTENT_W*0.6);
    doc.text(desc[0]||'', x, y);
    doc.setFont('helvetica','normal');
    doc.text(String(it.quantity ?? 0), qtyX, y, { align:'center' });
    doc.text(money2(line, currency), subX, y, { align:'right' });
    y += rowH + 2;
  });
  return y;
}

function drawTotals(doc, rightX, y, t, inv){
  const lbl = rightX - 38;
  doc.setFontSize(11);
  const ln = (label, val, bold) => {
    doc.setFont('helvetica', bold?'bold':'normal');
    setInk(doc);
    doc.text(label, lbl, y, { align:'right' });
    doc.text(val, rightX, y, { align:'right' });
    y += 6.5;
  };
  if(t.discountAmount>0) ln('Subtotal:', money2(t.subtotal, inv.currency));
  if(t.discountAmount>0) ln(`Discount (${inv.discountPercent}%):`, '-'+money2(t.discountAmount, inv.currency));
  ln('Tax%:', String(inv.taxRatePercentage||0));
  ln('Total:', money2(t.grandTotal, inv.currency), true);
  if((Number(inv.advancePayment)||0)>0){
    ln('Advance:', '-'+money2(inv.advancePayment, inv.currency));
    ln('Due:', money2(t.dueAmount, inv.currency), true);
  }
  return y;
}

function bankAndNotes(doc, inv, opts){
  const { center, x, y } = opts;
  let yy = y;
  const banking = inv.bankingInformation || '';
  const notes = inv.notes || inv.footerNotes || '';
  const align = center ? 'center' : 'left';
  const tx = center ? A4.w/2 : x;
  if(banking){
    doc.setFont('helvetica','normal'); doc.setFontSize(11); setInk(doc);
    doc.text('Bank Information', tx, yy, { align });
    yy += 5;
    doc.setFontSize(9); setMuted(doc);
    doc.splitTextToSize(banking, CONTENT_W*0.8).forEach(l => { doc.text(l, tx, yy, { align }); yy += 4; });
    yy += 2;
  }
  if(notes){
    doc.setFont('helvetica','normal'); doc.setFontSize(11); setInk(doc);
    doc.text('Notes', tx, yy, { align });
    yy += 5;
    doc.setFontSize(9); setMuted(doc);
    doc.splitTextToSize(notes, CONTENT_W*0.8).forEach(l => { doc.text(l, tx, yy, { align }); yy += 4; });
  }
}

// ---------- Styles ----------
function professional(doc, inv, t){
  setInk(doc);
  doc.setFont('helvetica','bold'); doc.setFontSize(30);
  doc.text(headerNumber(inv), M, 30);
  drawLogo(doc, A4.w - M - 22, 30, 22, inv.logoUri);

  doc.setFont('helvetica','normal'); doc.setFontSize(11); setInk(doc);
  doc.text(`Date  ${fmtDate(inv.creationDateMillis)}`, M, 42);
  doc.text(`Due  ${fmtDate(inv.dueDateMillis)}`, M+62, 42);
  doc.setDrawColor(40); doc.setLineWidth(0.4);
  doc.line(M, 46, M+CONTENT_W*0.55, 46);

  const colW = CONTENT_W*0.45;
  drawParty(doc, M, 56, 'From:', partyLines('From', inv.businessName, inv.businessAddress, inv.businessEmail, [inv.businessPhone, inv.businessWebsite]), colW);
  drawParty(doc, M+CONTENT_W*0.5, 56, 'To:', partyLines('To', inv.clientName, inv.clientAddress, inv.clientEmail, [inv.clientVatId]), colW);

  const afterTable = drawTable(doc, M, 110, inv.items, inv.currency, 'rows');
  drawTotals(doc, A4.w - M, Math.max(afterTable+10, 235), t, inv);
  bankAndNotes(doc, inv, { center:true, y:268 });
}

function elegant(doc, inv, t){
  doc.setFillColor(ELEGANT_BG[0],ELEGANT_BG[1],ELEGANT_BG[2]);
  doc.rect(0,0,A4.w,A4.h,'F');
  // double-line frame
  doc.setDrawColor(170); doc.setLineWidth(0.6);
  doc.rect(8,8,A4.w-16,A4.h-16);
  doc.setLineWidth(0.3);
  doc.rect(11,11,A4.w-22,A4.h-22);

  setInk(doc);
  doc.setFont('helvetica','bold'); doc.setFontSize(28);
  doc.text(headerNumber(inv), M+4, 36);
  drawLogo(doc, A4.w/2, 30, 17, inv.logoUri);
  doc.setFont('helvetica','normal'); doc.setFontSize(11);
  doc.text(`Date  ${fmtDate(inv.creationDateMillis)}`, A4.w - M - 4, 26, { align:'right' });
  doc.text(`Due  ${fmtDate(inv.dueDateMillis)}`, A4.w - M - 4, 34, { align:'right' });

  const colW = CONTENT_W*0.42;
  drawParty(doc, M+4, 56, 'From:', partyLines('From', inv.businessName, inv.businessAddress, inv.businessEmail, [inv.businessPhone]), colW);
  drawParty(doc, A4.w/2+4, 56, 'To:', partyLines('To', inv.clientName, inv.clientAddress, inv.clientEmail, [inv.clientVatId]), colW);

  doc.setDrawColor(150); doc.setLineWidth(0.3);
  doc.line(M+4, 100, A4.w-M-4, 100);
  const afterTable = drawTable(doc, M+4, 112, inv.items, inv.currency, 'rows');
  drawTotals(doc, A4.w - M - 4, Math.max(afterTable+10, 232), t, inv);
  bankAndNotes(doc, inv, { center:true, y:262 });
}

function minimalist(doc, inv, t){
  doc.setFillColor(MINIMAL_BG[0],MINIMAL_BG[1],MINIMAL_BG[2]);
  doc.rect(0,0,A4.w,A4.h,'F');
  drawLogo(doc, M+22, 34, 22, inv.logoUri);
  setInk(doc);
  doc.setFont('helvetica','bold'); doc.setFontSize(28);
  doc.text(headerNumber(inv), A4.w - M, 30, { align:'right' });
  doc.setFont('helvetica','normal'); doc.setFontSize(11);
  doc.text(`Date  ${fmtDate(inv.creationDateMillis)}`, A4.w - M - 40, 42, { align:'left' });
  doc.text(`Due  ${fmtDate(inv.dueDateMillis)}`, A4.w - M, 42, { align:'right' });

  const colW = CONTENT_W*0.42;
  drawParty(doc, M, 64, 'From:', partyLines('From', inv.businessName, inv.businessAddress, inv.businessEmail, [inv.businessPhone]), colW);
  drawParty(doc, A4.w/2, 64, 'To:', partyLines('To', inv.clientName, inv.clientAddress, inv.clientEmail, [inv.clientVatId]), colW);

  const afterTable = drawTable(doc, M, 112, inv.items, inv.currency, 'plain');
  drawTotals(doc, A4.w - M, Math.max(afterTable+10, 232), t, inv);
  bankAndNotes(doc, inv, { center:true, y:262 });
}

function classic(doc, inv, t){
  setInk(doc);
  drawLogo(doc, M+16, 28, 16, inv.logoUri);
  // teal accent bar + number top-right
  doc.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); doc.setLineWidth(1.2);
  doc.line(A4.w - M - 52, 22, A4.w - M - 52, 36);
  doc.setFont('helvetica','bold'); doc.setFontSize(28); setInk(doc);
  doc.text(headerNumber(inv), A4.w - M, 34, { align:'right' });
  doc.setDrawColor(TEAL[0],TEAL[1],TEAL[2]); doc.setLineWidth(0.6);
  doc.line(M, 46, A4.w - M, 46);

  doc.setFont('helvetica','bold'); doc.setFontSize(12); setInk(doc);
  doc.text('Date', M, 56); doc.text('Due', A4.w/2, 56);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text(fmtDate(inv.creationDateMillis), M+16, 56);
  doc.text(fmtDate(inv.dueDateMillis), A4.w/2+14, 56);

  const colW = CONTENT_W*0.42;
  drawParty(doc, M, 66, 'From:', partyLines('From', inv.businessName, inv.businessAddress, inv.businessEmail, [inv.businessPhone]), colW);
  drawParty(doc, A4.w/2, 66, 'To:', partyLines('To', inv.clientName, inv.clientAddress, inv.clientEmail, [inv.clientVatId]), colW);

  const afterTable = drawTable(doc, M, 116, inv.items, inv.currency, 'boxed');
  // bottom rule
  const baseY = Math.max(afterTable+14, 236);
  drawTotals(doc, A4.w - M, baseY, t, inv);
  doc.setDrawColor(60); doc.setLineWidth(0.3);
  doc.line(M, baseY+10, A4.w - M, baseY+10);
  bankAndNotes(doc, inv, { center:false, x:M, y:baseY+18 });
}

const RENDERERS = { Professional:professional, Elegant:elegant, Minimalist:minimalist, Classic:classic };

export function buildPdf(inv){
  const JsPDF = jsPDFCtor();
  const doc = new JsPDF({ unit:'mm', format:'a4', compress:true });
  const t = compute(inv.items, inv.taxRatePercentage, inv.discountPercent, inv.advancePayment);
  (RENDERERS[inv.pdfStyle] || professional)(doc, inv, t);
  return doc;
}

export function pdfDataUri(inv){ return buildPdf(inv).output('datauristring'); }
export function pdfBlob(inv){ return buildPdf(inv).output('blob'); }
export function pdfFilename(inv){
  const kind = inv.type==='quotation' ? 'Quote' : 'Invoice';
  return `${kind}-${(inv.invoiceNumber||'').replace(/\s/g,'')}.pdf`;
}
