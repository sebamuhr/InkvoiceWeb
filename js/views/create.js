import { getProfile, getClients, findClientByName, saveClient, saveInvoice,
         getInvoice, peekNextNumber, consumeNumber, uid, PDF_STYLES } from '../store.js';
import { compute, money, money2, currencySymbol, toInputDate, fromInputDate, todayMs, plusDaysMs, esc, toast, STATUSES } from '../util.js';
import { Icon } from '../icons.js';
import { mfield } from '../ui.js';

let draft = null;
let editingItem = -1;

function blankDraft(type='invoice'){
  const p = getProfile();
  return {
    id:uid(), isEdit:false, type,
    invoiceNumber:peekNextNumber(type),
    clientName:'', clientEmail:'', clientAddress:'', clientVatId:'', clientPhone:'',
    creationDateMillis:todayMs(), dueDateMillis:plusDaysMs(todayMs(),14),
    items:[], taxRatePercentage:p.defaultTaxPercentage||0, discountPercent:0, advancePayment:0,
    status:'Pending', notes:'', footerNotes:p.footerNotes||'',
    pdfStyle:p.preferredPdfStyle||'Professional',
    b2g:!!p.isB2GEnabled, buyerReference:'', departmentArea:'',
  };
}
function fromExisting(src, asDuplicate){
  const d = JSON.parse(JSON.stringify(src));
  d.items = (d.items||[]).map(i => ({ ...i, id:uid() }));
  d.b2g = !!(d.buyerReference || getProfile().isB2GEnabled);
  if(asDuplicate){
    d.id=uid(); d.isEdit=false; d.invoiceNumber=peekNextNumber(d.type);
    d.creationDateMillis=todayMs(); d.dueDateMillis=plusDaysMs(todayMs(),14); d.status='Pending';
  }else d.isEdit=true;
  return d;
}

export function html(ctx){
  const editId=ctx.params.get('edit'), dupId=ctx.params.get('duplicate');
  if(editId && getInvoice(editId))    draft=fromExisting(getInvoice(editId),false);
  else if(dupId && getInvoice(dupId))  draft=fromExisting(getInvoice(dupId),true);
  else                                 draft=blankDraft();
  if(ctx.params.get('as')==='invoice' && draft.type!=='invoice'){ draft.type='invoice'; draft.invoiceNumber=peekNextNumber('invoice'); }

  const clients = getClients();
  const p = getProfile();
  const isQ = draft.type==='quotation';

  return `<div class="screen">
    <div class="topbar">
      <button class="back" onclick="nav('/')">${Icon.back} Home</button>
    </div>

    <div class="summary" id="summary">${summaryInner()}</div>

    <div class="radios">
      <div class="radio ${!isQ?'on':''}" id="r-inv"><span class="dot"></span>Invoice</div>
      <div class="radio ${isQ?'on':''}" id="r-quo"><span class="dot"></span>Quotation</div>
    </div>

    ${mfield({id:'c-name',label:'Client Name',required:true,value:draft.clientName,list:'clients',attrs:'autocomplete="off"'})}
    <datalist id="clients">${clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
    ${mfield({id:'c-email',label:'Client Email',type:'email',value:draft.clientEmail})}
    ${mfield({id:'c-addr',label:'Client Address'+(draft.b2g?' *':''),textarea:true,value:draft.clientAddress,counter:90})}

    <div class="two">
      ${mfield({id:'d-date',label:'Creation Date',required:true,type:'date',value:toInputDate(draft.creationDateMillis)})}
      ${mfield({id:'d-due',label:'Due Date',type:'date',value:toInputDate(draft.dueDateMillis)})}
    </div>
    <div class="two">
      ${mfield({id:'f-adv',label:'Advance',type:'number',value:draft.advancePayment,prefix:currencySymbol(p.currency).trim()})}
      ${mfield({id:'f-disc',label:'Discount (%)',type:'number',value:draft.discountPercent})}
    </div>
    <div class="two">
      ${mfield({id:'f-tax',label:'Tax (%)',type:'number',value:draft.taxRatePercentage})}
      <div class="mfield">
        <label for="d-status">Status</label>
        <select id="d-status" class="ctrl">${STATUSES.map(s=>`<option ${draft.status===s?'selected':''}>${s}</option>`).join('')}</select>
        <span class="icon-r">${Icon.chev}</span>
      </div>
    </div>

    <div class="section-h">${isQ?'Quotation':'Invoice'} Items</div>
    <div class="section-sub" id="item-count">${draft.items.length}/20 items</div>
    <div id="items"></div>
    <button class="btn block" id="add-item" style="margin-top:10px">Add Item</button>

    <div class="mcard" style="margin-top:20px">
      <div style="font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px">${Icon.palette} PDF Style</div>
      <div class="two" style="grid-template-columns:1fr 1fr">
        ${PDF_STYLES.map(s=>`<button class="btn ${draft.pdfStyle===s?'':'ghost'}" data-style="${s}" style="font-size:14px;padding:12px">${s}</button>`).join('')}
      </div>
    </div>

    ${mfield({id:'d-notes',label:'Notes (shown on PDF)',textarea:true,value:draft.notes})}

    <div class="mcard" style="margin-top:8px">
      <label style="display:flex;align-items:center;gap:12px;font-size:17px">
        <input type="checkbox" id="b2g" ${draft.b2g?'checked':''} style="width:22px;height:22px"> Public sector (B2G)
      </label>
      <div id="b2g-fields" class="${draft.b2g?'':'hidden'}">
        ${mfield({id:'b-ref',label:'Buyer Reference',required:true,value:draft.buyerReference,onCard:true})}
        ${mfield({id:'b-dept',label:'Department / Area',value:draft.departmentArea,onCard:true})}
        ${mfield({id:'c-vat',label:'Client VAT / Tax ID',value:draft.clientVatId,onCard:true})}
      </div>
    </div>

    <button class="btn block" id="save-doc" style="margin-top:16px">${Icon.save} Save & Preview</button>

    <div id="item-modal" class="modal-overlay hidden">
      <div class="modal">
        <h3 style="margin:0 0 8px">Item</h3>
        ${mfield({id:'m-desc',label:'Description',onCard:true})}
        <div class="two">
          ${mfield({id:'m-qty',label:'Quantity',type:'number',onCard:true})}
          ${mfield({id:'m-price',label:'Unit Price',type:'number',onCard:true})}
        </div>
        <div class="two" style="margin-top:12px">
          <button class="btn ghost" id="m-cancel">Cancel</button>
          <button class="btn" id="m-save">Save</button>
        </div>
      </div>
    </div>
  </div>`;
}

function summaryInner(){
  const p = getProfile();
  const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);
  const cur = p.currency;
  const advance = Number(draft.advancePayment)||0;
  return `
    <div class="no">N<small>°</small> ${esc(draft.invoiceNumber.replace(/^N/,''))}</div>
    <button class="pdfbtn" id="pdf-quick">PDF</button>
    <div class="tot">
      <div>Subtotal: ${money2(t.subtotal,cur)}</div>
      <div>${draft.taxRatePercentage||0}%: ${money2(t.taxAmount,cur)}</div>
      <div class="g">Total: ${money2(t.grandTotal,cur)}</div>
      ${advance>0?`<div class="green">Advance: ${money2(advance,cur)}</div><div class="green">Due: ${money2(t.dueAmount,cur)}</div>`:''}
    </div>`;
}

export function mount(ctx){
  const p = getProfile();
  const $ = id => document.getElementById(id);

  const setType = (type) => {
    if(draft.type===type) return;
    draft.type = type;
    if(!draft.isEdit){ draft.invoiceNumber = peekNextNumber(type); }
    $('r-inv').classList.toggle('on', type==='invoice');
    $('r-quo').classList.toggle('on', type==='quotation');
    document.querySelector('.section-h').textContent = `${type==='quotation'?'Quotation':'Invoice'} Items`;
    refreshSummary();
  };
  $('r-inv').onclick = () => setType('invoice');
  $('r-quo').onclick = () => setType('quotation');

  $('c-name').addEventListener('input', e => {
    draft.clientName = e.target.value;
    const c = findClientByName(e.target.value);
    if(c){ $('c-email').value=c.email||''; $('c-addr').value=c.address||''; if($('c-vat'))$('c-vat').value=c.clientVatId||'';
      draft.clientEmail=c.email||''; draft.clientAddress=c.address||''; draft.clientVatId=c.clientVatId||''; }
  });
  bind('c-email','clientEmail'); bind('c-addr','clientAddress'); bind('d-notes','notes');
  if($('c-vat')) bind('c-vat','clientVatId');
  bind('b-ref','buyerReference'); bind('b-dept','departmentArea');
  $('d-status').addEventListener('input', e => draft.status = e.target.value);
  $('d-date').addEventListener('change', e => draft.creationDateMillis = fromInputDate(e.target.value));
  $('d-due').addEventListener('change', e => draft.dueDateMillis = fromInputDate(e.target.value));
  numBind('f-adv','advancePayment'); numBind('f-disc','discountPercent'); numBind('f-tax','taxRatePercentage');

  $('b2g').addEventListener('change', e => {
    draft.b2g = e.target.checked;
    $('b2g-fields').classList.toggle('hidden', !draft.b2g);
    if(draft.b2g && !p.phone) toast('Add a phone number in Profile for B2G');
  });

  document.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => {
    draft.pdfStyle = b.dataset.style;
    document.querySelectorAll('[data-style]').forEach(x => x.classList.toggle('ghost', x!==b));
  }));

  renderItems();
  $('add-item').addEventListener('click', () => openItem(-1));
  $('save-doc').addEventListener('click', () => save(ctx));
  $('pdf-quick').addEventListener('click', () => save(ctx));

  // item modal
  $('m-cancel').addEventListener('click', closeItem);
  $('m-save').addEventListener('click', saveItem);

  function bind(id,key){ const el=$(id); if(el) el.addEventListener('input',e=>draft[key]=e.target.value); }
  function numBind(id,key){ const el=$(id); if(el) el.addEventListener('input',e=>{ draft[key]=parseFloat(e.target.value)||0; refreshSummary(); }); }
  function refreshSummary(){ $('summary').innerHTML = summaryInner(); $('pdf-quick').addEventListener('click',()=>save(ctx)); }

  function renderItems(){
    $('item-count').textContent = `${draft.items.length}/20 items`;
    $('items').innerHTML = draft.items.map((it,i)=>{
      const line = (Number(it.quantity)||0)*(Number(it.unitPrice)||0);
      return `<div class="itemrow">
        <div style="min-width:0">
          <div class="t">${esc(it.description||'Item')}</div>
          <div class="d">Qty: ${it.quantity}, Price: ${money2(it.unitPrice,p.currency)}, Total: ${money2(line,p.currency)}</div>
        </div>
        <div class="acts">
          <button class="iconbtn" data-edit="${i}">${Icon.edit}</button>
          <button class="iconbtn danger" data-del="${i}">${Icon.trash}</button>
        </div>
      </div>`;
    }).join('');
    $('items').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openItem(+b.dataset.edit)));
    $('items').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{ draft.items.splice(+b.dataset.del,1); renderItems(); refreshSummary(); }));
  }
  function openItem(i){
    editingItem = i;
    const it = i>=0 ? draft.items[i] : { description:'', quantity:1, unitPrice:0 };
    $('m-desc').value = it.description; $('m-qty').value = it.quantity; $('m-price').value = it.unitPrice;
    $('item-modal').classList.remove('hidden');
  }
  function closeItem(){ $('item-modal').classList.add('hidden'); }
  function saveItem(){
    const it = { id:uid(), description:$('m-desc').value, quantity:parseFloat($('m-qty').value)||0, unitPrice:parseFloat($('m-price').value)||0 };
    if(editingItem>=0){ it.id = draft.items[editingItem].id; draft.items[editingItem]=it; }
    else draft.items.push(it);
    closeItem(); renderItems(); refreshSummary();
  }
}

function save(ctx){
  const p = getProfile();
  if(!draft.clientName.trim()){ toast('Client name is required'); return; }
  if(!draft.items.some(i=>i.description.trim())){ toast('Add at least one item'); return; }
  if(draft.b2g){
    if(!draft.buyerReference.trim()){ toast('Buyer reference required for B2G'); return; }
    if(!draft.clientVatId.trim()){ toast('Client VAT/Tax ID required for B2G'); return; }
    if(!draft.clientAddress.trim()){ toast('Client address required for B2G'); return; }
    if(!p.phone){ toast('Add a phone number in Profile (B2G)'); return; }
  }
  let client = findClientByName(draft.clientName);
  if(!client){ client = { id:uid(), name:draft.clientName.trim(), email:draft.clientEmail, clientVatId:draft.clientVatId, address:draft.clientAddress, phoneNumber:draft.clientPhone }; saveClient(client); }

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
  toast(draft.isEdit?'Updated':'Saved');
  ctx.navigate('/view/'+inv.id);
}
