import { getProfile, getClients, findClientByName, saveClient, saveInvoice,
         getInvoice, peekNextNumber, consumeNumber, uid, PDF_STYLES,
         noteDocumentCreated, downloadBackup } from '../store.js';
import { openInvoicePdf } from '../pdf.js';
import { compute, money2, currencySymbol, toInputDate, fromInputDate, todayMs, plusDaysMs, esc, toast, isEmail } from '../util.js';
import { Icon } from '../icons.js';
import { mfield } from '../ui.js';
import { t as tr } from '../i18n.js';   // aliased: `t` is already used locally for compute() totals

let draft = null;
let editingItem = -1;

function blankDraft(type='invoice'){
  const p = getProfile();
  return {
    id:uid(), isEdit:false, type, invoiceNumber:peekNextNumber(type),
    clientName:'', clientEmail:'', clientAddress:'', clientVatId:'', clientPhone:'',
    creationDateMillis:todayMs(), dueDateMillis:null,
    items:[], taxRatePercentage:p.defaultTaxPercentage||0, discountPercent:0, advancePayment:0,
    // Snapshot the profile Notes into the invoice at creation (matches Android:
    // profile.notes → invoice.notes, printed centered at the bottom of the PDF).
    status:'Pending', notes:p.notes||'', footerNotes:p.footerNotes||'',
    pdfStyle:p.preferredPdfStyle||'Professional',
    b2g:false, buyerReference:'', departmentArea:'',
    // Which of the profile's tax numbers prints on this document (index into
    // profile.taxNumbers). Only offered as a choice when the profile has more than one.
    selectedTaxIndex:0,
  };
}
function fromExisting(src, dup){
  const d = JSON.parse(JSON.stringify(src));
  d.items = (d.items||[]).map(i => ({ ...i, id:uid() }));
  d.b2g = !!d.buyerReference;
  // Matches Android: there is NO in-place edit. Generating a PDF ALWAYS mints a new
  // document with the next number of its type; editing/duplicating only pre-fills the
  // form, and the original document is never touched. So BOTH edit and duplicate get a
  // fresh id + the next number. (Editing Q1 and regenerating therefore yields Q2, and
  // numbers can never repeat — see store.peekNextNumber, which floors on the max used.)
  d.id = uid();
  d.isEdit = false;
  d.invoiceNumber = peekNextNumber(d.type);
  d.status = 'Pending';
  d.selectedTaxIndex = 0;
  if(dup){ d.creationDateMillis = todayMs(); d.dueDateMillis = null; }
  // Ensure the string fields the form/validation touch always exist, even if the source
  // document (older data / a synced peer) didn't have them — otherwise `.trim()` throws.
  ['clientName','clientEmail','clientAddress','clientVatId','clientPhone',
   'buyerReference','departmentArea','notes','footerNotes'].forEach(k => { if(d[k]==null) d[k]=''; });
  return d;
}

export function html(ctx){
  const editId=ctx.params.get('edit'), dupId=ctx.params.get('duplicate');
  if(editId && getInvoice(editId))    draft=fromExisting(getInvoice(editId),false);
  else if(dupId && getInvoice(dupId))  draft=fromExisting(getInvoice(dupId),true);
  else                                 draft=blankDraft();
  if(ctx.params.get('as')==='invoice' && draft.type!=='invoice'){ draft.type='invoice'; draft.invoiceNumber=peekNextNumber('invoice'); }

  const p = getProfile();
  const clients = getClients();
  const isQ = draft.type==='quotation';
  const cur = currencySymbol(p.currency).trim();

  return `<div class="screen">
    <div class="summary" id="summary">${summaryInner()}</div>

    <div class="radios">
      <div class="radio ${!isQ?'on':''}" id="r-inv"><span class="dot"></span>${tr('Invoice')}</div>
      <div class="radio ${isQ?'on':''}" id="r-quo"><span class="dot"></span>${tr('Quotation')}</div>
    </div>

    <div class="rowhead">
      <h3 class="section-h" style="margin:0">${tr('Client Information')}</h3>
      <label class="b2g-check"><input type="checkbox" id="b2g" ${draft.b2g?'checked':''}> B2G <span class="help">${Icon.help}</span></label>
    </div>

    ${mfield({id:'c-name',label:tr('Client Name'),required:true,value:draft.clientName,list:'clients',attrs:'autocomplete="off" autocapitalize="words"'})}
    <datalist id="clients">${clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
    ${mfield({id:'c-email',label:tr('Email'),type:'email',value:draft.clientEmail})}
    <div class="field-warn hidden" id="warn-cemail">${tr('Enter a valid email — like name@example.com')}</div>
    ${mfield({id:'c-vat',label:tr('Tax Number')+(draft.b2g?' *':''),value:draft.clientVatId})}
    ${mfield({id:'c-addr',label:tr('Address')+(draft.b2g?' *':''),textarea:true,value:draft.clientAddress,counter:90})}

    <div id="b2g-fields" class="${draft.b2g?'':'hidden'}">
      ${mfield({id:'b-ref',label:tr('Buyer Reference'),required:true,value:draft.buyerReference})}
      ${mfield({id:'b-dept',label:tr('Department/Area'),value:draft.departmentArea})}
    </div>

    <div class="two">
      ${mfield({id:'d-date',label:tr('Creation'),required:true,type:'date',value:toInputDate(draft.creationDateMillis),iconRight:Icon.calendar})}
      ${mfield({id:'d-due',label:tr('Due')+(draft.b2g?' *':''),type:'date',value:draft.dueDateMillis?toInputDate(draft.dueDateMillis):'',iconRight:Icon.calendar})}
    </div>
    <div class="two">
      ${mfield({id:'f-adv',label:tr('Advance'),type:'number',value:draft.advancePayment,prefix:cur,attrs:Number(draft.advancePayment)?'':'data-zero="1"'})}
      ${mfield({id:'f-disc',label:tr('Discount'),type:'number',value:draft.discountPercent,attrs:Number(draft.discountPercent)?'':'data-zero="1"'})}
    </div>

    <h3 class="section-h">${isQ?tr('Quotation Items'):tr('Invoice Items')}</h3>
    <div class="section-sub" id="item-count">${draft.items.length}/20 ${tr('items')}</div>
    <div id="items"></div>

    <div class="two" style="margin-top:18px">
      <button class="btn" id="add-item">${tr('Add Item')}</button>
      <button class="btn" id="pdf-btn" ${draft.items.length?'':'disabled'}>PDF</button>
    </div>

    <div id="item-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3 style="margin:0 0 14px">${tr('Add New Item')}</h3>
        ${mfield({id:'m-desc',label:tr('Description'),onCard:true})}
        <div class="two">
          ${mfield({id:'m-qty',label:tr('Quantity'),type:'number',onCard:true})}
          ${mfield({id:'m-price',label:tr('Price'),type:'number',onCard:true})}
        </div>
        <div class="two" style="margin-top:14px">
          <button class="btn ghost" id="m-cancel">${tr('Cancel')}</button>
          <button class="btn" id="m-save">${tr('Add')}</button>
        </div>
      </div>
    </div>

    <div id="pdf-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3 style="margin:0 0 14px">${tr('Select Invoice PDF Style')}</h3>
        <div id="style-list">
          ${PDF_STYLES.map(s=>`
            <div class="style-card ${draft.pdfStyle===s?'on':''}" data-style="${s}">
              <img src="pdfsamples/${s.toLowerCase()}.png" alt="${s}">
              <span class="rad"></span><span class="nm">${tr(s)}</span>
            </div>`).join('')}
        </div>
        <div class="two" style="margin-top:14px">
          <button class="btn ghost" id="pdf-cancel">${tr('Cancel')}</button>
          <button class="btn" id="pdf-gen">${tr('Generate & View PDF')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function summaryInner(){
  const p = getProfile();
  const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);
  const cur = currencySymbol(p.currency).trim();
  const m = v => cur + (Number(v)||0).toFixed(1);
  const advance = Number(draft.advancePayment)||0;
  const prefix = draft.type==='quotation' ? 'Q' : 'N';
  const num = String(draft.invoiceNumber).replace(/^[NQ]/,'');
  // With more than one tax number, show a colourful label right under the number (in the
  // tax number's own colour) that opens a picker — exactly like the Android app.
  const taxOpts = Array.isArray(p.taxNumbers) ? p.taxNumbers.filter(x=>(x.number||'').trim()) : [];
  let taxLabel = '';
  if(taxOpts.length > 1){
    const idx = Math.min(Math.max(draft.selectedTaxIndex||0, 0), taxOpts.length-1);
    const sel = taxOpts[idx];
    const color = sel.color || '#2D9132';
    const label = (sel.label||'').trim() || 'Tax Number';
    taxLabel = `
      <div class="taxpick">
        <span id="tax-label" style="color:${esc(color)}">${esc(label)} ▾</span>
        <select id="tax-select" aria-label="Tax number for this document">
          ${taxOpts.map((x,i)=>`<option value="${i}" ${i===idx?'selected':''}>${esc((x.label||'Tax Number')+' — '+x.number)}</option>`).join('')}
        </select>
      </div>`;
  }
  return `
    <div class="no-wrap">
      <div class="no">${prefix}°${esc(num)}</div>
      ${taxLabel}
    </div>
    <div class="tot">
      <div>Subtotal: ${m(t.subtotal)}</div>
      ${draft.taxRatePercentage>0?`<div>${draft.taxRatePercentage}%: ${m(t.taxAmount)}</div>`:''}
      <div class="g">Total: ${m(t.grandTotal)}</div>
      ${advance>0?`<div class="green">Advance: ${m(advance)}</div><div class="green">Due: ${m(t.dueAmount)}</div>`:''}
    </div>`;
}

export function mount(ctx){
  const p = getProfile();
  const $ = id => document.getElementById(id);

  const setType = (type) => {
    if(draft.type===type) return;
    draft.type = type;
    // A document always carries the NEXT number of its current type; switching type just
    // re-peeks that type's next number. (No in-place edit anymore — see fromExisting.)
    draft.invoiceNumber = peekNextNumber(type);
    $('r-inv').classList.toggle('on', type==='invoice');
    $('r-quo').classList.toggle('on', type==='quotation');
    document.querySelectorAll('.section-h')[1].textContent = `${type==='quotation'?'Quotation':'Invoice'} Items`;
    refreshSummary();
  };
  $('r-inv').onclick = () => setType('invoice');
  $('r-quo').onclick = () => setType('quotation');

  // Wire the colourful tax-number picker under the number. Re-run after every summary
  // re-render (the <select> is recreated each time) so selection keeps working.
  const wireTaxSelect = () => {
    const sel = $('tax-select'), lab = $('tax-label');
    if(!sel) return;
    sel.addEventListener('change', e => {
      draft.selectedTaxIndex = parseInt(e.target.value,10)||0;
      const opts = Array.isArray(p.taxNumbers) ? p.taxNumbers.filter(x=>(x.number||'').trim()) : [];
      const s = opts[draft.selectedTaxIndex];
      if(s && lab){ lab.textContent = ((s.label||'').trim()||'Tax Number') + ' ▾'; lab.style.color = s.color || '#2D9132'; }
    });
  };
  wireTaxSelect();

  $('c-name').addEventListener('input', e => {
    draft.clientName = e.target.value;
    const c = findClientByName(e.target.value);
    if(c){ $('c-email').value=c.email||''; $('c-addr').value=c.address||''; $('c-vat').value=c.clientVatId||'';
      draft.clientEmail=c.email||''; draft.clientAddress=c.address||''; draft.clientVatId=c.clientVatId||''; }
  });
  bind('c-email','clientEmail'); bind('c-vat','clientVatId'); bind('c-addr','clientAddress');
  bind('b-ref','buyerReference'); bind('b-dept','departmentArea');
  // Live email-format warning on the client email.
  const cEmail = $('c-email'), cWarn = $('warn-cemail');
  if(cEmail && cWarn){ const chk = () => cWarn.classList.toggle('hidden', !(cEmail.value.trim() && !isEmail(cEmail.value))); cEmail.addEventListener('input', chk); cEmail.addEventListener('blur', chk); }
  $('d-date').addEventListener('change', e => draft.creationDateMillis = fromInputDate(e.target.value));
  $('d-due').addEventListener('change', e => draft.dueDateMillis = fromInputDate(e.target.value));
  numBind('f-adv','advancePayment'); numBind('f-disc','discountPercent');
  // Advance/Discount show a greyed "0" that clears on focus and returns on blur.
  [['f-adv','advancePayment'],['f-disc','discountPercent']].forEach(([id,key]) => {
    const el = $(id); if(!el) return;
    el.addEventListener('focus', () => { if(el.dataset.zero){ el.value=''; delete el.dataset.zero; } });
    el.addEventListener('input', () => { delete el.dataset.zero; });
    el.addEventListener('blur', () => {
      if(el.value.trim()===''){ el.value='0'; el.dataset.zero='1'; draft[key]=0; refreshSummary(); }
    });
  });

  $('b2g').addEventListener('change', e => {
    draft.b2g = e.target.checked;
    $('b2g-fields').classList.toggle('hidden', !draft.b2g);
    // Due / Tax Number / Address become required (get a *) only under B2G — matches Android.
    const star = (id, base) => { const l = document.querySelector(`label[for="${id}"]`); if(l) l.textContent = base + (draft.b2g ? ' *' : ''); };
    star('d-due','Due'); star('c-vat','Tax Number'); star('c-addr','Address');
    if(draft.b2g && !p.phone) toast(tr('Add a phone number in Profile for B2G'));
  });

  // Greyed "0" behaviour for the item Price field (same as Advance/Discount).
  const priceEl = $('m-price');
  priceEl.addEventListener('focus', () => { if(priceEl.dataset.zero){ priceEl.value=''; delete priceEl.dataset.zero; } });
  priceEl.addEventListener('input', () => { delete priceEl.dataset.zero; });
  priceEl.addEventListener('blur', () => { if(priceEl.value.trim()===''){ priceEl.value='0'; priceEl.dataset.zero='1'; } });

  renderItems();
  $('add-item').addEventListener('click', () => openItem(-1));
  $('pdf-btn').addEventListener('click', openPdf);
  $('m-cancel').addEventListener('click', closeItem);
  $('m-save').addEventListener('click', saveItem);
  $('pdf-cancel').addEventListener('click', () => $('pdf-modal').classList.add('hidden'));
  $('pdf-gen').addEventListener('click', () => generate(ctx));
  document.querySelectorAll('.style-card').forEach(c => c.addEventListener('click', () => {
    draft.pdfStyle = c.dataset.style;
    document.querySelectorAll('.style-card').forEach(x => x.classList.toggle('on', x===c));
  }));

  function bind(id,key){ const el=$(id); if(el) el.addEventListener('input',e=>draft[key]=e.target.value); }
  function numBind(id,key){ const el=$(id); if(el) el.addEventListener('input',e=>{ draft[key]=parseFloat(e.target.value)||0; refreshSummary(); }); }
  function refreshSummary(){ $('summary').innerHTML = summaryInner(); wireTaxSelect(); }

  function renderItems(){
    $('item-count').textContent = `${draft.items.length}/20 items`;
    $('items').innerHTML = draft.items.map((it,i)=>{
      const line=(Number(it.quantity)||0)*(Number(it.unitPrice)||0);
      const cur=currencySymbol(p.currency).trim();
      return `<div class="itemrow">
        <div style="min-width:0">
          <div class="t">${esc(it.description||'Item')}</div>
          <div class="d">Qty: ${it.quantity}, Price: ${cur}${(Number(it.unitPrice)||0).toFixed(2)}, Total: ${cur}${line.toFixed(2)}</div>
        </div>
        <div class="acts">
          <button class="iconbtn" data-edit="${i}">${Icon.edit}</button>
          <button class="iconbtn danger" data-del="${i}">${Icon.trash}</button>
        </div></div>`;
    }).join('');
    $('items').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openItem(+b.dataset.edit)));
    $('items').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{ draft.items.splice(+b.dataset.del,1); renderItems(); refreshSummary(); syncPdfBtn(); }));
  }
  function syncPdfBtn(){ $('pdf-btn').disabled = draft.items.length===0; }
  function openItem(i){
    editingItem=i;
    const it = i>=0 ? draft.items[i] : { description:'', quantity:1, unitPrice:0 };
    $('m-desc').value=it.description; $('m-qty').value=it.quantity;
    // Price shows a greyed "0" that clears on focus and returns on blur (matches Advance/Discount).
    const price = $('m-price');
    if(Number(it.unitPrice)){ price.value=it.unitPrice; delete price.dataset.zero; }
    else { price.value='0'; price.dataset.zero='1'; }
    $('item-modal').classList.remove('hidden');
  }
  function closeItem(){ $('item-modal').classList.add('hidden'); }
  function saveItem(){
    // A description is required — otherwise the item counts toward "N/20 items" and
    // enables the PDF button, but PDF validation (which needs a description) rejects it,
    // producing the confusing "Add at least one item" after items were clearly added.
    const desc = $('m-desc').value.trim();
    if(!desc){ toast(tr('Add a description for this item')); $('m-desc').focus(); return; }
    const it={ id:uid(), description:desc, quantity:parseFloat($('m-qty').value)||0, unitPrice:parseFloat($('m-price').value)||0 };
    if(editingItem>=0){ it.id=draft.items[editingItem].id; draft.items[editingItem]=it; } else draft.items.push(it);
    closeItem(); renderItems(); refreshSummary(); syncPdfBtn();
  }
  function openPdf(){
    if(!validate()) return;
    $('pdf-modal').classList.remove('hidden');
  }
  function validate(){
    if(!draft.clientName.trim()){ toast(tr('Client name is required')); return false; }
    if(draft.clientEmail.trim() && !isEmail(draft.clientEmail)){ toast(tr('Enter a valid client email or leave it empty')); $('warn-cemail')?.classList.remove('hidden'); return false; }
    if(!draft.items.some(i=>i.description.trim())){ toast(tr('Add at least one item')); return false; }
    if(draft.b2g){
      if(!draft.dueDateMillis){ toast(tr('Due date is required for B2G')); return false; }
      if(!draft.buyerReference.trim()){ toast(tr('Buyer reference required for B2G')); return false; }
      if(!draft.clientVatId.trim()){ toast(tr('Client Tax ID required for B2G')); return false; }
      if(!draft.clientAddress.trim()){ toast(tr('Client address required for B2G')); return false; }
      if(!p.phone){ toast(tr('Add a phone number in Profile (B2G)')); return false; }
    }
    return true;
  }
}

// The single tax number chosen for this document (Android puts one selected tax number on
// the doc, not all of them). 0 tax numbers → none; 1 → that one; >1 → the picked index.
function selectedTaxNumbers(p){
  const opts = Array.isArray(p.taxNumbers) ? p.taxNumbers.filter(t => (t.number||'').trim()) : [];
  if(!opts.length) return [];
  const i = Math.min(Math.max(0, draft.selectedTaxIndex||0), opts.length-1);
  return [opts[i]];
}

function generate(ctx){
  const p = getProfile();
  let client = findClientByName(draft.clientName);
  if(!client){ client={ id:uid(), name:draft.clientName.trim(), email:draft.clientEmail, clientVatId:draft.clientVatId, address:draft.clientAddress, phoneNumber:draft.clientPhone }; saveClient(client); }
  const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);
  // A generated document is an IMMUTABLE SNAPSHOT: it freezes a full copy of the business
  // profile, the client, the items AND the computed totals as they are RIGHT NOW. Nothing
  // here is read live at render time, so changing your profile (name, address, currency,
  // tax numbers…) later can never alter a document that was already created. Deep-copied
  // where the source is an object/array so no shared reference can mutate it afterwards.
  const inv = {
    id:draft.id, type:draft.type, invoiceNumber:draft.invoiceNumber.trim(), clientId:client.id,
    clientName:draft.clientName.trim(), clientEmail:draft.clientEmail, clientAddress:draft.clientAddress,
    clientVatId:draft.clientVatId, clientPhone:draft.clientPhone,
    businessName:p.businessName, ownerName:p.ownerName, businessAddress:p.address, businessEmail:p.email,
    businessWebsite:p.website, businessPhone:p.phone, bankingInformation:p.bankingInformation,
    footerNotes:draft.footerNotes||p.footerNotes, logoUri:p.logoUri, currency:p.currency,
    invoiceLanguage:p.invoiceLanguage,   // frozen: the PDF renders in the language chosen at creation
    taxNumbers:JSON.parse(JSON.stringify(selectedTaxNumbers(p))),
    creationDateMillis:draft.creationDateMillis, dueDateMillis:draft.dueDateMillis,
    items:draft.items.map(({id,description,quantity,unitPrice})=>({id,description,quantity:Number(quantity)||0,unitPrice:Number(unitPrice)||0})),
    // Frozen totals — the PDF renders THESE, never a fresh recomputation (see pdf.frozenTotals).
    subtotal:t.subtotal, discountPercent:Number(draft.discountPercent)||0, discountAmount:t.discountAmount,
    taxRatePercentage:Number(draft.taxRatePercentage)||0, taxBasis:t.taxBasis, taxAmount:t.taxAmount,
    advancePayment:Number(draft.advancePayment)||0, grandTotal:t.grandTotal, dueAmount:t.dueAmount,
    status:draft.status, notes:draft.notes, pdfStyle:draft.pdfStyle,
    buyerReference:draft.b2g?draft.buyerReference:'', departmentArea:draft.b2g?draft.departmentArea:'',
  };
  // Save FIRST — only if it succeeds do we consume the number. That way a failed save (e.g.
  // storage full) never burns a document number or silently loses the document.
  try {
    saveInvoice(inv);
  } catch(err){
    toast(err && err.code === 'STORAGE_FULL'
      ? tr('Storage full — your business logo is too large. Open Profile, tap Save (it shrinks the logo), or delete some old documents, then try again.')
      : tr('Could not save the document — please try again.'));
    return;
  }
  consumeNumber(draft.type, draft.invoiceNumber);
  const docCount = noteDocumentCreated();   // for the "back up every 5 documents" reminder
  // Web version: no custom in-app viewer. Open the real PDF straight in the browser
  // (its native viewer has Share/Save/Print), then send the app to the matching list so
  // the just-saved document is at the top when the user switches back.
  const how = openInvoicePdf(inv);
  if(how==='downloaded') toast(tr('PDF saved — open it to share'));
  ctx.navigate(inv.type==='quotation' ? '/quotations' : '/invoices');
  // Every 5 documents, remind the user to back up (their data lives only on this device).
  if(docCount > 0 && docCount % 5 === 0) remindBackup(docCount);
}

// Backup nudge shown after every 5th created document. Body-level overlay so it survives
// the navigation above.
function remindBackup(n){
  if(document.getElementById('backup-remind')) return;
  const el = document.createElement('div');
  el.id = 'backup-remind'; el.className = 'modal-overlay';
  el.innerHTML = `<div class="modal">
    <h3 style="margin:0 0 8px">${tr('Back up your data')} 🔒</h3>
    <p class="sync-note" style="margin:0">${tr('Your invoices live only on this device — download a backup so a phone reset or cleared history can never wipe them. Keep it in Drive or email it to yourself.')}</p>
    <div class="two" style="margin-top:16px">
      <button class="btn ghost" id="br-later">${tr('Later')}</button>
      <button class="btn" id="br-now">${tr('Back up now')}</button>
    </div></div>`;
  document.body.appendChild(el);
  el.querySelector('#br-later').onclick = () => el.remove();
  el.querySelector('#br-now').onclick = () => { downloadBackup(); el.remove(); toast(tr('Backup downloaded')); };
}
