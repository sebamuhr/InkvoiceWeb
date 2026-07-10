import { getProfile, getClients, findClientByName, saveClient, saveInvoice,
         getInvoice, peekNextNumber, consumeNumber, uid, PDF_STYLES } from '../store.js';
import { compute, money2, currencySymbol, toInputDate, fromInputDate, todayMs, plusDaysMs, esc, toast, isEmail } from '../util.js';
import { Icon } from '../icons.js';
import { mfield } from '../ui.js';

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
  };
}
function fromExisting(src, dup){
  const d = JSON.parse(JSON.stringify(src));
  d.items = (d.items||[]).map(i => ({ ...i, id:uid() }));
  d.b2g = !!d.buyerReference;
  if(dup){ d.id=uid(); d.isEdit=false; d.invoiceNumber=peekNextNumber(d.type);
    d.creationDateMillis=todayMs(); d.dueDateMillis=null; d.status='Pending'; }
  else {
    d.isEdit=true;
    // Remember the original identity so that if the user switches the type (e.g. turns
    // this quotation into an invoice) we CREATE a new document and leave the original
    // untouched — instead of overwriting it. Switching back restores editing it.
    d.origType=src.type; d.origId=src.id; d.origNumber=src.invoiceNumber;
  }
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
      <div class="radio ${!isQ?'on':''}" id="r-inv"><span class="dot"></span>Invoice</div>
      <div class="radio ${isQ?'on':''}" id="r-quo"><span class="dot"></span>Quotation</div>
    </div>

    <div class="rowhead">
      <h3 class="section-h" style="margin:0">Client Information</h3>
      <label class="b2g-check"><input type="checkbox" id="b2g" ${draft.b2g?'checked':''}> B2G <span class="help">${Icon.help}</span></label>
    </div>

    ${mfield({id:'c-name',label:'Client Name',required:true,value:draft.clientName,list:'clients',attrs:'autocomplete="off" autocapitalize="words"'})}
    <datalist id="clients">${clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
    ${mfield({id:'c-email',label:'Email',type:'email',value:draft.clientEmail})}
    <div class="field-warn hidden" id="warn-cemail">Enter a valid email — like name@example.com</div>
    ${mfield({id:'c-vat',label:'Tax Number'+(draft.b2g?' *':''),value:draft.clientVatId})}
    ${mfield({id:'c-addr',label:'Address'+(draft.b2g?' *':''),textarea:true,value:draft.clientAddress,counter:90})}

    <div id="b2g-fields" class="${draft.b2g?'':'hidden'}">
      ${mfield({id:'b-ref',label:'Buyer Reference',required:true,value:draft.buyerReference})}
      ${mfield({id:'b-dept',label:'Department / Area',value:draft.departmentArea})}
    </div>

    <div class="two">
      ${mfield({id:'d-date',label:'Creation',required:true,type:'date',value:toInputDate(draft.creationDateMillis),iconRight:Icon.calendar})}
      ${mfield({id:'d-due',label:'Due'+(draft.b2g?' *':''),type:'date',value:draft.dueDateMillis?toInputDate(draft.dueDateMillis):'',iconRight:Icon.calendar})}
    </div>
    <div class="two">
      ${mfield({id:'f-adv',label:'Advance',type:'number',value:draft.advancePayment,prefix:cur,attrs:Number(draft.advancePayment)?'':'data-zero="1"'})}
      ${mfield({id:'f-disc',label:'Discount',type:'number',value:draft.discountPercent,attrs:Number(draft.discountPercent)?'':'data-zero="1"'})}
    </div>

    <h3 class="section-h">${isQ?'Quotation':'Invoice'} Items</h3>
    <div class="section-sub" id="item-count">${draft.items.length}/20 items</div>
    <div id="items"></div>

    <div class="two" style="margin-top:18px">
      <button class="btn" id="add-item">Add Item</button>
      <button class="btn" id="pdf-btn" ${draft.items.length?'':'disabled'}>PDF</button>
    </div>

    <div id="item-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3 style="margin:0 0 14px">Add New Item</h3>
        ${mfield({id:'m-desc',label:'Description',onCard:true})}
        <div class="two">
          ${mfield({id:'m-qty',label:'Quantity',type:'number',onCard:true})}
          ${mfield({id:'m-price',label:'Price',type:'number',onCard:true})}
        </div>
        <div class="two" style="margin-top:14px">
          <button class="btn ghost" id="m-cancel">Cancel</button>
          <button class="btn" id="m-save">Add</button>
        </div>
      </div>
    </div>

    <div id="pdf-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3 style="margin:0 0 14px">Select Invoice PDF Style</h3>
        <div id="style-list">
          ${PDF_STYLES.map(s=>`
            <div class="style-card ${draft.pdfStyle===s?'on':''}" data-style="${s}">
              <img src="pdfsamples/${s.toLowerCase()}.png" alt="${s}">
              <span class="rad"></span><span class="nm">${s}</span>
            </div>`).join('')}
        </div>
        <div class="two" style="margin-top:14px">
          <button class="btn ghost" id="pdf-cancel">Cancel</button>
          <button class="btn" id="pdf-gen">Generate &amp; View PDF</button>
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
  return `
    <div class="no">${prefix}°${esc(num)}</div>
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
    if(draft.origId != null){
      // Editing an existing document. Switching to the OTHER type = convert → a NEW
      // document (new id, next number of that type); the original stays. Switching back
      // to the original type restores editing it in place.
      if(type === draft.origType){
        draft.id = draft.origId; draft.invoiceNumber = draft.origNumber; draft.isEdit = true;
      }else{
        draft.id = draft.convId || (draft.convId = uid());
        draft.invoiceNumber = peekNextNumber(type); draft.isEdit = false;
      }
    }else if(!draft.isEdit){
      draft.invoiceNumber = peekNextNumber(type);
    }
    $('r-inv').classList.toggle('on', type==='invoice');
    $('r-quo').classList.toggle('on', type==='quotation');
    document.querySelectorAll('.section-h')[1].textContent = `${type==='quotation'?'Quotation':'Invoice'} Items`;
    refreshSummary();
  };
  $('r-inv').onclick = () => setType('invoice');
  $('r-quo').onclick = () => setType('quotation');

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
    if(draft.b2g && !p.phone) toast('Add a phone number in Profile for B2G');
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
  function refreshSummary(){ $('summary').innerHTML = summaryInner(); }

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
    if(!desc){ toast('Add a description for this item'); $('m-desc').focus(); return; }
    const it={ id:uid(), description:desc, quantity:parseFloat($('m-qty').value)||0, unitPrice:parseFloat($('m-price').value)||0 };
    if(editingItem>=0){ it.id=draft.items[editingItem].id; draft.items[editingItem]=it; } else draft.items.push(it);
    closeItem(); renderItems(); refreshSummary(); syncPdfBtn();
  }
  function openPdf(){
    if(!validate()) return;
    $('pdf-modal').classList.remove('hidden');
  }
  function validate(){
    if(!draft.clientName.trim()){ toast('Client name is required'); return false; }
    if(draft.clientEmail.trim() && !isEmail(draft.clientEmail)){ toast('Enter a valid client email or leave it empty'); $('warn-cemail')?.classList.remove('hidden'); return false; }
    if(!draft.items.some(i=>i.description.trim())){ toast('Add at least one item'); return false; }
    if(draft.b2g){
      if(!draft.dueDateMillis){ toast('Due date is required for B2G'); return false; }
      if(!draft.buyerReference.trim()){ toast('Buyer reference required for B2G'); return false; }
      if(!draft.clientVatId.trim()){ toast('Client Tax ID required for B2G'); return false; }
      if(!draft.clientAddress.trim()){ toast('Client address required for B2G'); return false; }
      if(!p.phone){ toast('Add a phone number in Profile (B2G)'); return false; }
    }
    return true;
  }
}

function generate(ctx){
  const p = getProfile();
  let client = findClientByName(draft.clientName);
  if(!client){ client={ id:uid(), name:draft.clientName.trim(), email:draft.clientEmail, clientVatId:draft.clientVatId, address:draft.clientAddress, phoneNumber:draft.clientPhone }; saveClient(client); }
  const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);
  const inv = {
    id:draft.id, type:draft.type, invoiceNumber:draft.invoiceNumber.trim(), clientId:client.id,
    clientName:draft.clientName.trim(), clientEmail:draft.clientEmail, clientAddress:draft.clientAddress,
    clientVatId:draft.clientVatId, clientPhone:draft.clientPhone,
    businessName:p.businessName, ownerName:p.ownerName, businessAddress:p.address, businessEmail:p.email,
    businessWebsite:p.website, businessPhone:p.phone, bankingInformation:p.bankingInformation,
    footerNotes:draft.footerNotes||p.footerNotes, logoUri:p.logoUri, currency:p.currency, taxNumbers:p.taxNumbers,
    creationDateMillis:draft.creationDateMillis, dueDateMillis:draft.dueDateMillis,
    items:draft.items.map(({id,description,quantity,unitPrice})=>({id,description,quantity:Number(quantity)||0,unitPrice:Number(unitPrice)||0})),
    subtotal:t.subtotal, discountPercent:Number(draft.discountPercent)||0, taxRatePercentage:Number(draft.taxRatePercentage)||0,
    taxAmount:t.taxAmount, advancePayment:Number(draft.advancePayment)||0, grandTotal:t.grandTotal,
    status:draft.status, notes:draft.notes, pdfStyle:draft.pdfStyle,
    buyerReference:draft.b2g?draft.buyerReference:'', departmentArea:draft.b2g?draft.departmentArea:'',
  };
  if(!draft.isEdit) consumeNumber(draft.type, draft.invoiceNumber);
  saveInvoice(inv);
  ctx.navigate('/view/'+inv.id);
}
