// ===== Inkvoice PDF generation (jsPDF, offline) =====
// Faithful port of the Android PdfGenerator.kt (point-for-point). A4 in POINTS
// (595 x 842), origin top-left, drawText y = text baseline — matching Android's
// Canvas. Four styles (Professional, Elegant, Minimalist, Classic), each with its
// own 2-page pagination rule (page 2 always carries >=2 items).
import { compute } from './util.js';
import { registerFonts } from '../vendor/fonts.js';

// Font families match Android: SANS_SERIF -> Roboto, SERIF -> Noto Serif.
const SANS = 'Roboto', SERIF = 'NotoSerif';

const PAGE_W = 595, PAGE_H = 842;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function jsPDFCtor(){
  const ns = window.jspdf || window.jsPDF;
  if(!ns) throw new Error('jsPDF not loaded');
  return ns.jsPDF || ns;
}

// ---- low-level canvas-like helpers over a jsPDF doc ----
function setFont(doc, family, size, bold){ doc.setFont(family, bold ? 'bold':'normal'); doc.setFontSize(size); }
// draw text: y is the baseline (matches Android canvas.drawText)
function T(doc, s, x, y, size, family, bold, color, align){
  setFont(doc, family, size, bold);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(String(s ?? ''), x, y, align ? { align } : undefined);
}
function measure(doc, s, size, family, bold){ setFont(doc, family, size, bold); return doc.getTextWidth(String(s ?? '')); }
function fillRect(doc, l, t, r, b, color){ doc.setFillColor(color[0],color[1],color[2]); doc.rect(l, t, r-l, b-t, 'F'); }
function line(doc, x1, y1, x2, y2, color, w){ doc.setDrawColor(color[0],color[1],color[2]); doc.setLineWidth(w); doc.line(x1,y1,x2,y2); }
function strokeRect(doc, l, t, r, b, color, w){ doc.setDrawColor(color[0],color[1],color[2]); doc.setLineWidth(w); doc.rect(l,t,r-l,b-t,'S'); }

function fmtDate(ms){
  if(ms==null || ms==='') return '';
  const d = new Date(Number(ms));
  if(isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`;
}
function currencySym(code){
  return ({ USD:'$', EUR:'€', GBP:'£', JPY:'¥', CAD:'CA$', AUD:'A$' })[code] || code || '';
}
function money(v, cur){ return cur + (Number(v)||0).toFixed(2); }
function fmt2(v){ return (Number(v)||0).toFixed(2); }
function fmt1(v){ return (Number(v)||0).toFixed(1); }
// Mirror Kotlin Double.toString(): whole numbers render with a trailing ".0".
function qtyStr(q){ const n = Number(q)||0; return Number.isInteger(n) ? n.toFixed(1) : String(n); }

// Fit a logo (contain, centred) into a square box — matches drawBitmapFit.
function drawLogo(doc, cx, cy, size, logoUri){
  if(!logoUri) return;
  try{
    const fmt = /png/i.test(logoUri) ? 'PNG' : /jpe?g/i.test(logoUri) ? 'JPEG' : 'PNG';
    const p = doc.getImageProperties(logoUri);
    const scale = Math.min(size/p.width, size/p.height);
    const w = p.width*scale, h = p.height*scale;
    doc.addImage(logoUri, fmt, cx - w/2, cy - h/2, w, h);
  }catch{ /* no logo drawn on failure — matches Android (empty space) */ }
}

// Smart line-spacing/font by contact line count → returns font size (spacing unused).
function smartFont(lineCount){
  if(lineCount <= 5) return 13;
  if(lineCount <= 8) return 12;
  return 11;
}

function wrap42(s){
  return s.length > 42 ? [s.substring(0,42), s.substring(42,84)] : [s];
}

function buildFrom(inv){
  const a = [];
  const push = v => { if(v && String(v).trim()) a.push(String(v)); };
  push(inv.businessName); push(inv.ownerName); push(inv.businessEmail);
  push(inv.businessPhone); push(inv.businessWebsite);
  (inv.taxNumbers||[]).forEach(t => {
    const n = t && (t.number||'').trim();
    if(n) a.push(t.label ? `${t.label}: ${n}` : n);
  });
  if(inv.taxNumber && String(inv.taxNumber).trim()) a.push(String(inv.taxNumber));
  if((inv.businessAddress||'').trim()) inv.businessAddress.split('\n').filter(l=>l.trim()).forEach(l=>a.push(l));
  return a;
}
function buildTo(inv, full){
  const a = [];
  const push = v => { if(v && String(v).trim()) a.push(String(v)); };
  push(inv.clientName);
  if(full){
    if(inv.buyerReference && inv.buyerReference.trim()) wrap42(inv.buyerReference).forEach(l=>a.push(l));
    if(inv.departmentArea && inv.departmentArea.trim()) wrap42(inv.departmentArea).forEach(l=>a.push(l));
  }
  push(inv.clientEmail);
  if(full) push(inv.clientVatId);
  if((inv.clientAddress||'').trim()) inv.clientAddress.split('\n').filter(l=>l.trim()).forEach(l=>a.push(l));
  return a;
}

// Pagination: single-page up to `breakAt`, else page1=total-2 (<=11) or 10, page2=rest.
function pageBudget(total, pageNum, breakAt){
  const firstPageCount = total <= breakAt ? total : (total <= 11 ? total - 2 : 10);
  const maxThis = total <= breakAt ? total : (pageNum === 1 ? firstPageCount : total - firstPageCount);
  return maxThis;
}

function bankLines(inv, take){
  return (inv.bankingInformation || '').split('\n').slice(0, take);
}
function hasBank(lines){ return lines.some(l => l.trim()); }

function wrapCentered(doc, text, size, family, bold, maxWidth){
  setFont(doc, family, size, bold);
  const words = String(text).split(' ');
  const lines = []; let cur = '';
  for(const w of words){
    const app = cur ? `${cur} ${w}` : w;
    if(doc.getTextWidth(app) <= maxWidth) cur = app;
    else { if(cur) lines.push(cur); cur = w; }
  }
  if(cur) lines.push(cur);
  return lines;
}

// ===================== PROFESSIONAL =====================
function professional(doc, inv, t, pageNum, startIndex){
  const HEL = SANS;
  const black = [28,28,28], midGray = [234,234,234], rowGray = [240,240,240], border = [200,200,200];
  const margin = 42, pageW = PAGE_W;
  doc.setFillColor(255,255,255); doc.rect(0,0,pageW,PAGE_H,'F');
  strokeRect(doc, 8, 8, pageW-8, PAGE_H-8, border, 2);

  let y = 50; const leftX = margin + 14;
  const items = (inv.items||[]).slice(0,20);
  const cur = currencySym(inv.currency);

  if(pageNum === 1){
    const prefix = inv.type==='quotation' ? 'Q°':'N°';
    const num = String(inv.invoiceNumber||'').replace(/^Q/,'').replace(/^N/,'');
    T(doc, `${prefix} ${num}`, leftX, y+38, 38, HEL, true, black);

    T(doc, 'Date', leftX, y+85, 13, HEL, false, black);
    T(doc, 'Due', leftX+120, y+85, 13, HEL, false, black);
    T(doc, fmtDate(inv.creationDateMillis), leftX, y+108, 13, HEL, false, black);
    T(doc, fmtDate(inv.dueDateMillis), leftX+120, y+108, 13, HEL, false, black);

    const logoSize = 160;
    drawLogo(doc, pageW - margin - logoSize/1.5, y + logoSize/2, logoSize, inv.logoUri);
    const logoBottomY = (y + logoSize/2) + logoSize/2;

    const dateLineY = y + 128;
    line(doc, leftX, dateLineY, leftX+190, dateLineY, midGray, 3);

    y = Math.max(dateLineY + 33, logoBottomY + 16);

    const from = buildFrom(inv), to = buildTo(inv, true);
    const maxLines = Math.max(from.length, to.length);
    const fs = smartFont(maxLines);
    let maxFromW = 0; from.forEach(l => { const w = measure(doc, l, fs, HEL, false); if(w>maxFromW) maxFromW = w; });
    const defaultToX = leftX/2 + 220, maxToX = pageW - margin - 160;
    const toX = maxFromW>0 ? Math.min(Math.max(defaultToX, leftX+maxFromW+30), maxToX) : defaultToX;

    if(from.length) T(doc, 'From:', leftX, y, 16, HEL, true, black);
    if(to.length)   T(doc, 'To:', toX, y, 16, HEL, true, black);
    if(from.length || to.length) y += 16 + 3;

    const lh = fs*1.4; let fy = y+lh, ty = y+lh;
    for(let i=0;i<maxLines;i++){
      if(i<from.length) T(doc, from[i], leftX, fy, fs, HEL, false, black);
      if(i<to.length)   T(doc, to[i], toX, ty, fs, HEL, false, black);
      fy += lh; ty += lh;
    }
    y += lh*maxLines + (maxLines>0 ? 15 : 0);
  } else {
    y = margin + 20;
  }

  // table header (every page)
  let cy = y;
  line(doc, margin, cy, pageW-margin, cy, midGray, 3);
  const descX = margin+10, qtyX = pageW/2.1, subX = pageW-160;
  cy += 22;
  T(doc, 'Description', descX, cy, 16, HEL, true, black);
  T(doc, 'Quantity', qtyX, cy, 16, HEL, true, black);
  T(doc, 'Subtotal', subX, cy, 16, HEL, true, black);
  cy += 8;
  line(doc, margin, cy, pageW-margin, cy, midGray, 3);
  cy += 24;

  const total = items.length;
  const maxThis = pageBudget(total, pageNum, 7);
  const rowStep = 26 + 2;
  let drawn = 0, needsNext = false, lastIdx = startIndex - 1;
  for(let idx=startIndex; idx<total; idx++){
    if(drawn >= maxThis){ needsNext = true; break; }
    const rowTop = cy + drawn*rowStep;
    const it = items[idx];
    fillRect(doc, margin, rowTop, pageW-margin, rowTop+26, rowGray);
    T(doc, it.description||'', descX, rowTop+18, 13, HEL, true, black);
    T(doc, qtyStr(it.quantity), qtyX, rowTop+18, 13, HEL, true, black);
    T(doc, money(it.quantity*it.unitPrice, cur), subX, rowTop+18, 13, HEL, true, black);
    drawn++; lastIdx = idx;
  }
  cy += drawn*rowStep + 25;

  if(!needsNext){
    const bankY = cy + 1;
    const bl = bankLines(inv, 5); const bank = hasBank(bl);
    if(bank){
      T(doc, 'Bank Information:', leftX, bankY, 13, HEL, true, black);
      bl.forEach((l,i)=>{ if(l.trim()) T(doc, l, leftX, bankY+16+16*i, 13, HEL, false, black); });
    }
    const lx = subX-100;
    T(doc, `Tax ${fmt1(inv.taxRatePercentage)}%:`, lx, bankY, 13, HEL, false, black);
    T(doc, money(t.taxAmount, cur), subX, bankY, 13, HEL, false, black);
    T(doc, 'Subtotal:', lx, bankY+22, 13, HEL, false, black);
    T(doc, money(t.subtotal, cur), subX, bankY+22, 13, HEL, false, black);
    let off = 0;
    if(Number(inv.discountPercent)>0){
      T(doc, 'Discount (%):', lx, bankY+44, 13, HEL, false, black);
      T(doc, `${fmt2(inv.discountPercent)}%`, subX, bankY+44, 13, HEL, false, black);
      off += 22;
    }
    T(doc, 'Total:', lx, bankY+44+off, 13, HEL, true, black);
    T(doc, money(t.grandTotal, cur), subX, bankY+44+off, 13, HEL, true, black);
    if(Number(inv.advancePayment)>0){
      off += 22;
      T(doc, 'Advance:', lx, bankY+44+off, 13, HEL, false, black);
      T(doc, money(inv.advancePayment, cur), subX, bankY+44+off, 13, HEL, false, black);
      off += 22;
      const due = Math.max(t.grandTotal - inv.advancePayment, 0);
      T(doc, 'Balance due:', lx, bankY+44+off, 13, HEL, true, black);
      T(doc, money(due, cur), subX, bankY+44+off, 13, HEL, true, black);
    }
    const bankH = bank ? bl.length*16 : 0;
    const totalsH = 44 + off;
    const lineY = bankY + Math.max(bankH, totalsH) + 10;
    line(doc, margin, lineY, pageW-margin, lineY, midGray, 3);
    if(inv.notes && inv.notes.trim()){
      const lines = wrapCentered(doc, inv.notes, 13, HEL, false, pageW - margin*2);
      let ny = lineY + 24;
      lines.forEach(l => { T(doc, l, pageW/2, ny, 13, HEL, false, black, 'center'); ny += 22; });
    }
  }
  return { hasMorePages: needsNext, nextItemIndex: needsNext ? lastIdx+1 : total };
}

// ===================== ELEGANT =====================
function elegantCorners(doc, color){
  const cs = 70, m = 15, pageW = PAGE_W, pageH = PAGE_H;
  const L = (x1,y1,x2,y2)=>line(doc,x1,y1,x2,y2,color,2);
  L(m,m,m+cs,m); L(m,m,m,m+cs); L(m+10,m,m+10,m+10); L(m,m+10,m+10,m+10);
  L(pageW-m-cs,m,pageW-m,m); L(pageW-m,m,pageW-m,m+cs); L(pageW-m-10,m,pageW-m-10,m+10); L(pageW-m-10,m+10,pageW-m,m+10);
  L(m,pageH-m-cs,m,pageH-m); L(m,pageH-m,m+cs,pageH-m); L(m,pageH-m-10,m+10,pageH-m-10); L(m+10,pageH-m-10,m+10,pageH-m);
  L(pageW-m-cs,pageH-m,pageW-m,pageH-m); L(pageW-m,pageH-m-cs,pageW-m,pageH-m); L(pageW-m-10,pageH-m-10,pageW-m,pageH-m-10); L(pageW-m-10,pageH-m-10,pageW-m-10,pageH-m);
}
function elegant(doc, inv, t, pageNum, startIndex){
  const SER = SERIF;
  const cream = [248,248,245], dark = [45,45,45], lightGray = [220,220,220], border = [180,180,180];
  const margin = 45, pageW = PAGE_W;
  doc.setFillColor(cream[0],cream[1],cream[2]); doc.rect(0,0,pageW,PAGE_H,'F');
  elegantCorners(doc, border);

  let y = margin - 5; const leftX = margin+20, rightX = pageW - margin - 20;
  const items = (inv.items||[]).slice(0,20);
  const cur = currencySym(inv.currency);

  if(pageNum === 1){
    const prefix = inv.type==='quotation' ? 'Q°':'N°';
    const num = String(inv.invoiceNumber||'').replace(/^Q/,'').replace(/^N/,'');
    T(doc, `${prefix} ${num}`, leftX, y+45, 42, SER, true, dark);
    T(doc, 'Date', rightX, y+20, 14, SER, false, dark, 'right');
    T(doc, fmtDate(inv.creationDateMillis), rightX, y+40, 14, SER, false, dark, 'right');
    T(doc, 'Due', rightX, y+70, 14, SER, false, dark, 'right');
    T(doc, fmtDate(inv.dueDateMillis), rightX, y+90, 14, SER, false, dark, 'right');

    const logoSize = 120, logoCY = y + 80;
    drawLogo(doc, pageW/2, logoCY, logoSize, inv.logoUri);

    y = logoCY + logoSize/2 + 40;
    const from = buildFrom(inv), to = buildTo(inv, true);
    const maxLines = Math.max(from.length, to.length);
    const fs = smartFont(maxLines);
    let maxFromW = 0; from.forEach(l => { const w = measure(doc, l, fs, SER, false); if(w>maxFromW) maxFromW = w; });
    const defaultToX = leftX/2 + 220, maxToX = pageW - margin - 160;
    const toX = maxFromW>0 ? Math.min(Math.max(defaultToX, leftX+maxFromW+30), maxToX) : defaultToX;

    if(from.length) T(doc, 'From:', leftX, y, 16, SER, true, dark);
    if(to.length)   T(doc, 'To:', toX, y, 16, SER, true, dark);
    if(from.length || to.length) y += fs + 3;

    const lh = fs*1.4; let fy = y+lh, ty = y+lh;
    for(let i=0;i<maxLines;i++){
      if(i<from.length) T(doc, from[i], leftX, fy, fs, SER, false, dark);
      if(i<to.length)   T(doc, to[i], toX, ty, fs, SER, false, dark);
      fy += lh; ty += lh;
    }
    y += lh*maxLines + (maxLines>0 ? 5 : 0);
    line(doc, margin, y, pageW-margin, y, border, 1);
    y += 30;
  } else {
    y = margin + 20;
  }

  let cy = y;
  const descX = leftX, qtyX = pageW/2.2, subX = pageW - margin - 80;
  T(doc, 'Description', descX, cy, 15, SER, true, dark);
  T(doc, 'Quantity', qtyX, cy, 15, SER, true, dark);
  T(doc, 'Subtotal', subX, cy, 15, SER, true, dark);
  cy += 15;

  const total = items.length;
  const maxThis = pageBudget(total, pageNum, 6);
  const rowStep = 26 + 2;
  let drawn = 0, needsNext = false, lastIdx = startIndex - 1;
  for(let idx=startIndex; idx<total; idx++){
    if(drawn >= maxThis){ needsNext = true; break; }
    const rowTop = cy + drawn*rowStep;
    const it = items[idx];
    if(idx % 2 === 0) fillRect(doc, margin, rowTop-5, pageW-margin, rowTop+26, lightGray);
    T(doc, it.description||'', descX, rowTop+20, 13, SER, false, dark);
    T(doc, qtyStr(it.quantity), qtyX, rowTop+20, 13, SER, false, dark);
    T(doc, money(it.quantity*it.unitPrice, cur), subX, rowTop+20, 13, SER, false, dark);
    drawn++; lastIdx = idx;
  }
  cy += drawn*rowStep + 20;

  if(!needsNext){
    const bl = bankLines(inv, 4); const bank = hasBank(bl);
    const infoY = cy; let bankH = 0;
    if(bank){
      T(doc, 'Bank Information', leftX, infoY, 14, SER, true, dark);
      bl.forEach((l,i)=>{ if(l.trim()) T(doc, l, leftX, infoY+18+i*18, 12, SER, false, dark); });
      bankH = 18 + bl.length*18;
    }
    let totalsH = 75;
    if(Number(inv.advancePayment)>0) totalsH += 22;
    if(Number(inv.discountPercent)>0) totalsH += 22;
    const blockH = Math.max(bankH, totalsH);

    const lx = pageW - margin - 200, vx = subX;
    T(doc, `Tax ${fmt1(inv.taxRatePercentage)}%:`, lx, infoY, 12, SER, false, dark);
    T(doc, money(t.taxAmount, cur), vx, infoY, 12, SER, false, dark);
    T(doc, 'Subtotal:', lx, infoY+25, 12, SER, false, dark);
    T(doc, money(t.subtotal, cur), vx, infoY+25, 12, SER, false, dark);
    let ro = 0;
    if(Number(inv.discountPercent)>0){
      T(doc, 'Discount (%):', lx, infoY+50, 12, SER, false, dark);
      T(doc, `${fmt2(inv.discountPercent)}%`, vx, infoY+50, 12, SER, false, dark);
      ro += 22;
    }
    T(doc, 'Total:', lx, infoY+50+ro, 12, SER, true, dark);
    T(doc, money(t.grandTotal, cur), vx, infoY+50+ro, 12, SER, true, dark);
    if(Number(inv.advancePayment)>0){
      ro += 22;
      T(doc, 'Advance:', lx, infoY+50+ro, 12, SER, false, dark);
      T(doc, money(inv.advancePayment, cur), vx, infoY+50+ro, 12, SER, false, dark);
      ro += 22;
      const due = Math.max(t.grandTotal - inv.advancePayment, 0);
      T(doc, 'Balance due:', lx, infoY+50+ro, 12, SER, true, dark);
      T(doc, money(due, cur), vx, infoY+50+ro, 12, SER, true, dark);
    }
    let afterY = infoY + blockH + 10;
    line(doc, margin, afterY, pageW-margin, afterY, border, 1);
    afterY += 10;
    if(inv.notes && inv.notes.trim()){
      const lines = wrapCentered(doc, inv.notes, 13, SER, false, pageW - margin*2);
      let ny = afterY + 15;
      lines.forEach(l => { T(doc, l, pageW/2, ny, 13, SER, false, dark, 'center'); ny += 18; });
    }
  }
  return { hasMorePages: needsNext, nextItemIndex: needsNext ? lastIdx+1 : total };
}

// ===================== MINIMALIST =====================
function minimalist(doc, inv, t, pageNum, startIndex){
  const HEL = SANS;
  const green = [137,188,120], black = [0,0,0], rowGreen = [155,205,140];
  const margin = 44, pageW = PAGE_W;
  doc.setFillColor(green[0],green[1],green[2]); doc.rect(0,0,pageW,PAGE_H,'F');

  let y = margin;
  const items = (inv.items||[]).slice(0,20);
  const cur = currencySym(inv.currency);

  if(pageNum === 1){
    const logoSize = 120;
    drawLogo(doc, margin + logoSize/2, margin + logoSize/2, logoSize, inv.logoUri);

    const prefix = inv.type==='quotation' ? 'Q°':'N°';
    const num = String(inv.invoiceNumber||'').replace(/^Q/,'').replace(/^N/,'');
    T(doc, `${prefix} ${num}`, pageW - margin - 120 - 7, margin+35, 32, HEL, true, black);

    T(doc, 'Date', pageW - margin - 120 - 20, margin+70, 14, HEL, true, black);
    T(doc, 'Due', pageW - margin - 60, margin+70, 14, HEL, true, black);
    T(doc, fmtDate(inv.creationDateMillis), pageW - margin - 120 - 20, margin+90, 13, HEL, false, black);
    T(doc, fmtDate(inv.dueDateMillis), pageW - margin - 60, margin+90, 13, HEL, false, black);

    const yFT = margin + logoSize + 20;
    const from = buildFrom(inv), to = buildTo(inv, true);
    const maxLines = Math.max(from.length, to.length);
    const fs = smartFont(maxLines);
    let maxFromW = 0; from.forEach(l => { const w = measure(doc, l, fs, HEL, false); if(w>maxFromW) maxFromW = w; });
    const defaultToX = margin/2 + 180, maxToX = pageW - margin - 140;
    const toX = maxFromW>0 ? Math.min(Math.max(defaultToX, margin+4+maxFromW+30), maxToX) : defaultToX;

    if(from.length) T(doc, 'From:', margin+4, yFT+30, 16, HEL, true, black);
    if(to.length)   T(doc, 'To:', toX, yFT+30, 16, HEL, true, black);
    const lh = fs*1.4; let fy = yFT+30+lh, ty = yFT+30+lh;
    for(let i=0;i<maxLines;i++){
      if(i<from.length) T(doc, from[i], margin+4, fy, fs, HEL, false, black);
      if(i<to.length)   T(doc, to[i], toX, ty, fs, HEL, false, black);
      fy += lh; ty += lh;
    }
    const lineY = yFT + 50 + maxLines*14 + 15;
    line(doc, margin, lineY-10, pageW-margin, lineY-10, black, 1);
    y = yFT + 50 + maxLines*14 + 30;
  } else {
    y = margin + 20;
  }

  let cy = y;
  T(doc, 'Description', margin+8, cy, 16, HEL, true, black);
  T(doc, 'Quantity', pageW/2 - 30, cy, 16, HEL, true, black);
  T(doc, 'Subtotal', pageW - margin - 80, cy, 16, HEL, true, black);
  cy += 20;

  const total = items.length;
  const maxThis = pageBudget(total, pageNum, 7);
  const rowStep = 28 + 3;
  let drawn = 0, needsNext = false, lastIdx = startIndex - 1;
  for(let idx=startIndex; idx<total; idx++){
    if(drawn >= maxThis){ needsNext = true; break; }
    const rowTop = cy + drawn*rowStep;
    const it = items[idx];
    if(idx % 2 === 0) fillRect(doc, margin, rowTop-3, pageW-margin, rowTop+28-3, rowGreen);
    T(doc, it.description||'', margin+8, rowTop+18, 12, HEL, false, black);
    T(doc, qtyStr(it.quantity), pageW/2 - 30, rowTop+18, 12, HEL, false, black);
    T(doc, money(it.quantity*it.unitPrice, cur), pageW - margin - 80, rowTop+18, 12, HEL, false, black);
    drawn++; lastIdx = idx;
  }
  cy += drawn*rowStep + 20;

  if(!needsNext){
    const bl = bankLines(inv, 4); const bank = hasBank(bl);
    if(bank){
      T(doc, 'Bank Information:', margin+8, cy, 14, HEL, true, black);
      bl.forEach((l,i)=>{ if(l.trim()) T(doc, l, margin+8, cy+18+i*15, 12, HEL, false, black); });
    }
    const lx = pageW - margin - 200, vx = pageW - margin - 80;
    T(doc, `Tax ${fmt1(inv.taxRatePercentage)}%:`, lx, cy, 12, HEL, false, black);
    T(doc, money(t.taxAmount, cur), vx, cy, 12, HEL, false, black);
    T(doc, 'Subtotal:', lx, cy+25, 12, HEL, false, black);
    T(doc, money(t.subtotal, cur), vx, cy+25, 12, HEL, false, black);
    let off = 0;
    if(Number(inv.discountPercent)>0){
      T(doc, 'Discount (%):', lx, cy+50+off, 12, HEL, false, black);
      T(doc, `${fmt2(inv.discountPercent)}%`, vx, cy+50+off, 12, HEL, false, black);
      off += 22;
    }
    T(doc, 'Total:', lx, cy+50+off, 12, HEL, true, black);
    T(doc, money(t.grandTotal, cur), vx, cy+50+off, 12, HEL, true, black);
    off += 22;
    if(Number(inv.advancePayment)>0){
      T(doc, 'Advance:', lx, cy+50+off, 12, HEL, false, black);
      T(doc, money(inv.advancePayment, cur), vx, cy+50+off, 12, HEL, false, black);
      off += 22;
      const due = Math.max(t.grandTotal - inv.advancePayment, 0);
      T(doc, 'Balance due:', lx, cy+50+off, 12, HEL, true, black);
      T(doc, money(due, cur), vx, cy+50+off, 12, HEL, true, black);
      off += 10;
    }
    const afterLine = cy + Math.max(bank ? bl.length*15+18 : 0, 50+off) + 10;
    line(doc, margin, afterLine, pageW-margin, afterLine, black, 1);
    if(inv.notes && inv.notes.trim()){
      const lines = wrapCentered(doc, inv.notes, 12, HEL, false, pageW - margin*2);
      lines.forEach((l,i) => T(doc, l, pageW/2, afterLine+24+14*i, 12, HEL, false, black, 'center'));
    }
  }
  return { hasMorePages: needsNext, nextItemIndex: needsNext ? lastIdx+1 : total };
}

// ===================== CLASSIC =====================
function classic(doc, inv, t, pageNum, startIndex){
  const HEL = SANS;
  const blue = [96,193,224], black = [34,34,34], rowGray = [245,245,245];
  const margin = 42, pageW = PAGE_W;
  doc.setFillColor(255,255,255); doc.rect(0,0,pageW,PAGE_H,'F');

  let y = margin;
  const items = (inv.items||[]).slice(0,20);
  const cur = currencySym(inv.currency);

  if(pageNum === 1){
    const prefix = inv.type==='quotation' ? 'Q°':'N°';
    const num = String(inv.invoiceNumber||'').replace(/^Q/,'').replace(/^N/,'');
    T(doc, `${prefix} ${num}`, pageW - margin - 140, margin+38, 36, HEL, true, black);

    const logoSize = 92;
    drawLogo(doc, margin + logoSize/2, margin + logoSize/2, logoSize, inv.logoUri);

    T(doc, 'Date', margin+logoSize+24, margin+30, 14, HEL, true, black);
    T(doc, 'Due', pageW/2 + 22, margin+30, 14, HEL, true, black);
    T(doc, fmtDate(inv.creationDateMillis), margin+logoSize+24, margin+50, 13, HEL, false, black);
    T(doc, fmtDate(inv.dueDateMillis), pageW/2 + 22, margin+50, 13, HEL, false, black);

    const yFT = margin + logoSize + 70;
    const from = buildFrom(inv), to = buildTo(inv, false);
    const maxLines = Math.max(from.length, to.length);
    const fs = smartFont(maxLines);
    let maxFromW = 0; from.forEach(l => { const w = measure(doc, l, fs, HEL, false); if(w>maxFromW) maxFromW = w; });
    const defaultToX = margin/2 + 220, maxToX = pageW - margin - 160;
    const toX = maxFromW>0 ? Math.min(Math.max(defaultToX, margin+6+maxFromW+28), maxToX) : defaultToX;

    if(from.length) T(doc, 'From:', margin+6, yFT, 16, HEL, true, black);
    if(to.length)   T(doc, 'To:', toX, yFT, 16, HEL, true, black);
    let coff = yFT;
    if(from.length || to.length) coff += fs + 4;
    const lh = fs*1.35; let fy = coff, ty = coff;
    for(let i=0;i<maxLines;i++){
      if(i<from.length) T(doc, from[i], margin+6, fy, fs, HEL, false, black);
      if(i<to.length)   T(doc, to[i], toX, ty, fs, HEL, false, black);
      fy += lh; ty += lh;
    }
    const lineY = coff + maxLines*14 + 15;
    line(doc, margin, lineY-10, pageW-margin, lineY-10, blue, 4);
    y = coff + maxLines*14 + 30;
  } else {
    y = margin + 20;
  }

  let cy = y;
  T(doc, 'Description', margin+8, cy, 16, HEL, true, black);
  T(doc, 'Quantity', pageW/2 - 24, cy, 16, HEL, true, black);
  T(doc, 'Subtotal', pageW - margin - 82, cy, 16, HEL, true, black);
  cy += 20;

  const total = items.length;
  const maxThis = pageBudget(total, pageNum, 7);
  const rowStep = 28 + 2;
  let drawn = 0, needsNext = false, lastIdx = startIndex - 1;
  for(let idx=startIndex; idx<total; idx++){
    if(drawn >= maxThis){ needsNext = true; break; }
    const rowTop = cy + drawn*rowStep;
    const it = items[idx];
    if(idx % 2 === 0) fillRect(doc, margin, rowTop-2, pageW-margin, rowTop+28-2, rowGray);
    T(doc, it.description||'', margin+8, rowTop+18, 12, HEL, false, black);
    T(doc, qtyStr(it.quantity), pageW/2 - 24, rowTop+18, 12, HEL, false, black);
    T(doc, money(it.quantity*it.unitPrice, cur), pageW - margin - 82, rowTop+18, 12, HEL, false, black);
    drawn++; lastIdx = idx;
  }
  cy += drawn*rowStep + 40;

  if(!needsNext){
    const bl = bankLines(inv, 4); const bank = hasBank(bl);
    if(bank){
      T(doc, 'Bank Information:', margin+8, cy, 14, HEL, true, black);
      bl.forEach((l,i)=>{ if(l.trim()) T(doc, l, margin+8, cy+18+i*15, 12, HEL, false, black); });
    }
    const lx = pageW - margin - 200, vx = pageW - margin - 80;
    T(doc, `Tax ${fmt1(inv.taxRatePercentage)}%:`, lx, cy, 12, HEL, false, black);
    T(doc, money(t.taxAmount, cur), vx, cy, 12, HEL, false, black);
    T(doc, 'Subtotal:', lx, cy+25, 12, HEL, false, black);
    T(doc, money(t.subtotal, cur), vx, cy+25, 12, HEL, false, black);
    let off = 0, gapAfterDue = 0;
    if(Number(inv.discountPercent)>0){
      T(doc, 'Discount (%):', lx, cy+50+off, 12, HEL, false, black);
      T(doc, `${fmt2(inv.discountPercent)}%`, vx, cy+50+off, 12, HEL, false, black);
      off += 22;
    }
    T(doc, 'Total:', lx, cy+50+off, 12, HEL, true, black);
    T(doc, money(t.grandTotal, cur), vx, cy+50+off, 12, HEL, true, black);
    if(Number(inv.advancePayment)>0){
      off += 22;
      T(doc, 'Advance:', lx, cy+50+off, 12, HEL, false, black);
      T(doc, money(inv.advancePayment, cur), vx, cy+50+off, 12, HEL, false, black);
      off += 22;
      const due = Math.max(t.grandTotal - inv.advancePayment, 0);
      T(doc, 'Balance due:', lx, cy+50+off, 12, HEL, true, black);
      T(doc, money(due, cur), vx, cy+50+off, 12, HEL, true, black);
      gapAfterDue = 10;
    }
    const totalsH = 50 + off + gapAfterDue;
    const bankH = bank ? 18 + bl.length*15 : 0;
    const blueLineY = cy + Math.max(totalsH, bankH) + 5;
    line(doc, margin, blueLineY, pageW-margin, blueLineY, blue, 4);
    if(inv.notes && inv.notes.trim()){
      const lines = wrapCentered(doc, inv.notes, 12, HEL, false, pageW - margin*2);
      lines.forEach((l,i) => T(doc, l, pageW/2, blueLineY+24+i*15, 12, HEL, false, black, 'center'));
    }
  }
  return { hasMorePages: needsNext, nextItemIndex: needsNext ? lastIdx+1 : total };
}

const RENDERERS = { Professional:professional, Elegant:elegant, Minimalist:minimalist, Classic:classic };

export function buildPdf(inv){
  const JsPDF = jsPDFCtor();
  const doc = new JsPDF({ unit:'pt', format:[PAGE_W, PAGE_H], compress:true });
  registerFonts(doc);
  const t = compute(inv.items, inv.taxRatePercentage, inv.discountPercent, inv.advancePayment);
  const render = RENDERERS[inv.pdfStyle] || professional;

  let pageNum = 1, more = true, startIdx = 0;
  while(more){
    if(pageNum > 1) doc.addPage([PAGE_W, PAGE_H], 'p');
    const res = render(doc, inv, t, pageNum, startIdx);
    startIdx = res.nextItemIndex;
    more = res.hasMorePages;
    pageNum++;
    if(pageNum > 10) more = false;
  }
  return doc;
}

export function pdfDataUri(inv){ return buildPdf(inv).output('datauristring'); }
export function pdfBlob(inv){ return buildPdf(inv).output('blob'); }
export function pdfFilename(inv){
  const kind = inv.type==='quotation' ? 'Quote' : 'Invoice';
  return `${kind}-${(inv.invoiceNumber||'').replace(/\s/g,'')}.pdf`;
}
