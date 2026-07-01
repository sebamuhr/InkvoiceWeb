import { getProfile, getClients, findClientByName, saveClient, saveInvoice,
         getInvoice, peekNextNumber, consumeNumber, uid, PDF_STYLES } from '../store.js';
import { compute, money, money2, toInputDate, fromInputDate, todayMs, plusDaysMs, esc, toast, STATUSES } from '../util.js';
import { Icon } from '../icons.js';

let draft = null;

function blankDraft(type='invoice'){
  const p = getProfile();
  return {
    id:uid(), isEdit:false, type,
    invoiceNumber:peekNextNumber(type),
    clientName:'', clientEmail:'', clientAddress:'', clientVatId:'', clientPhone:'',
    creationDateMillis:todayMs(), dueDateMillis:plusDaysMs(todayMs(),14),
    items:[{ id:uid(), description:'', quantity:1, unitPrice:0 }],
    taxRatePercentage:p.defaultTaxPercentage||0, discountPercent:0, advancePayment:0,
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
    d.id = uid(); d.isEdit = false;
    d.invoiceNumber = peekNextNumber(d.type);
    d.creationDateMillis = todayMs(); d.dueDateMillis = plusDaysMs(todayMs(),14);
    d.status = 'Pending';
  }else{
    d.isEdit = true;
  }
  return d;
}

export function html(ctx){
  const editId = ctx.params.get('edit');
  const dupId  = ctx.params.get('duplicate');
  if(editId && getInvoice(editId))      draft = fromExisting(getInvoice(editId), false);
  else if(dupId && getInvoice(dupId))   draft = fromExisting(getInvoice(dupId), true);
  else                                  draft = blankDraft();

  // "Convert to invoice" from a quotation
  if(ctx.params.get('as')==='invoice' && draft.type!=='invoice'){
    draft.type = 'invoice';
    draft.invoiceNumber = peekNextNumber('invoice');
  }

  const clients = getClients();
  const styleSwatch = { Professional:'background:#fff', Elegant:'background:#f0f0f0;border-color:#cbd5e1',
                        Minimalist:'background:#93c47d', Classic:'background:#fff;border-left:5px solid #0d9488' };

  return `<div class="screen">
    <div class="topbar">
      <button class="back" onclick="nav('/')">${Icon.back} Back</button>
      <div class="seg">
        <button id="t-inv" class="${draft.type==='invoice'?'on':''}">Invoice</button>
        <button id="t-quo" class="${draft.type==='quotation'?'on':''}">Quote</button>
      </div>
    </div>
    <h1 style="margin:0 0 14px;font-size:22px">${draft.isEdit?'Edit':'New'} ${draft.type==='quotation'?'Quotation':'Invoice'}</h1>

    <div class="card">
      <h3>${Icon.user} Client</h3>
      <div class="field"><label>Name <span class="req">*</span></label>
        <input id="c-name" list="clients" value="${esc(draft.clientName)}" placeholder="Search or add new">
        <datalist id="clients">${clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist></div>
      <div class="row">
        <div class="field"><label>Email</label><input id="c-email" type="email" value="${esc(draft.clientEmail)}"></div>
        <div class="field"><label>VAT / Tax ID ${b2gStar()}</label><input id="c-vat" value="${esc(draft.clientVatId)}"></div>
      </div>
      <div class="field"><label>Address ${b2gStar()}</label><textarea id="c-addr">${esc(draft.clientAddress)}</textarea></div>
    </div>

    <div class="card">
      <label style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="b2g" ${draft.b2g?'checked':''} style="width:auto"> Public sector (B2G)
      </label>
      <div id="b2g-fields" class="${draft.b2g?'':'hidden'}" style="margin-top:12px">
        <div class="row">
          <div class="field"><label>Buyer reference <span class="req">*</span></label><input id="b-ref" value="${esc(draft.buyerReference)}"></div>
          <div class="field"><label>Department / area</label><input id="b-dept" value="${esc(draft.departmentArea)}"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>${Icon.doc} Details</h3>
      <div class="row">
        <div class="field"><label>Number</label><input id="d-num" value="${esc(draft.invoiceNumber)}"></div>
        <div class="field"><label>Status</label>
          <select id="d-status">${STATUSES.map(s=>`<option ${draft.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="row">
        <div class="field"><label>Date</label><input id="d-date" type="date" value="${toInputDate(draft.creationDateMillis)}"></div>
        <div class="field"><label>Due date</label><input id="d-due" type="date" value="${toInputDate(draft.dueDateMillis)}"></div>
      </div>
    </div>

    <div class="card">
      <h3>${Icon.list} Items</h3>
      <div class="item-head"><span>Description</span><span style="text-align:center">Qty</span><span style="text-align:center">Price</span><span></span></div>
      <div id="items"></div>
      <button class="btn ghost btn-sm" id="add-item" style="margin-top:6px">+ Add item</button>
    </div>

    <div class="card">
      <h3>${Icon.calc} Summary</h3>
      <div class="totals" id="totals"></div>
    </div>

    <div class="card">
      <h3>${Icon.palette} PDF style</h3>
      <div class="templates">
        ${PDF_STYLES.map(s=>`
          <div class="tpl ${draft.pdfStyle===s?'on':''}" data-style="${s}">
            <div class="swatch" style="${styleSwatch[s]}"></div>
            <div class="name">${s}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="field"><label>Notes (shown on PDF)</label><textarea id="d-notes">${esc(draft.notes)}</textarea></div>
    </div>

    <button class="btn block" id="save-doc">${Icon.save} Save & preview</button>
  </div>`;
}

const b2gStar = () => draft && draft.b2g ? '<span class="req">*</span>' : '';

export function mount(ctx){
  const p = getProfile();
  const $ = id => document.getElementById(id);

  // type toggle (update in place so the form isn't wiped)
  const setType = (type) => {
    if(draft.type===type) return;
    draft.type = type;
    if(!draft.isEdit){ draft.invoiceNumber = peekNextNumber(type); $('d-num').value = draft.invoiceNumber; }
    $('t-inv').classList.toggle('on', type==='invoice');
    $('t-quo').classList.toggle('on', type==='quotation');
    document.querySelector('h1').textContent = `${draft.isEdit?'Edit':'New'} ${type==='quotation'?'Quotation':'Invoice'}`;
  };
  $('t-inv').addEventListener('click', () => setType('invoice'));
  $('t-quo').addEventListener('click', () => setType('quotation'));

  // client autofill
  $('c-name').addEventListener('input', e => {
    draft.clientName = e.target.value;
    const c = findClientByName(e.target.value);
    if(c){ $('c-email').value=c.email||''; $('c-addr').value=c.address||''; $('c-vat').value=c.clientVatId||'';
      draft.clientEmail=c.email||''; draft.clientAddress=c.address||''; draft.clientVatId=c.clientVatId||''; }
  });
  bind('c-email','clientEmail'); bind('c-vat','clientVatId'); bind('c-addr','clientAddress');
  bind('d-num','invoiceNumber'); bind('d-notes','notes');
  $('d-status').addEventListener('change', e => draft.status = e.target.value);
  $('d-date').addEventListener('change', e => draft.creationDateMillis = fromInputDate(e.target.value));
  $('d-due').addEventListener('change', e => draft.dueDateMillis = fromInputDate(e.target.value));

  // B2G toggle
  $('b2g').addEventListener('change', e => {
    draft.b2g = e.target.checked;
    $('b2g-fields').classList.toggle('hidden', !draft.b2g);
    if(draft.b2g && !p.phone) toast('Add a phone number in Profile for B2G');
  });
  bind('b-ref','buyerReference'); bind('b-dept','departmentArea');

  // style picker
  document.querySelectorAll('[data-style]').forEach(el =>
    el.addEventListener('click', () => {
      draft.pdfStyle = el.dataset.style;
      document.querySelectorAll('[data-style]').forEach(x=>x.classList.toggle('on', x===el));
    }));

  // items + totals
  renderItems();
  renderTotals();
  $('add-item').addEventListener('click', () => {
    draft.items.push({ id:uid(), description:'', quantity:1, unitPrice:0 }); renderItems(); renderTotals();
  });

  $('save-doc').addEventListener('click', () => save(ctx));

  function bind(id, key){ const el=$(id); if(el) el.addEventListener('input', e => draft[key]=e.target.value); }

  function renderItems(){
    const wrap = $('items');
    wrap.innerHTML = draft.items.map((it,i)=>`
      <div class="item">
        <input data-i="${i}" data-k="description" placeholder="Description" value="${esc(it.description)}">
        <input data-i="${i}" data-k="quantity" type="number" inputmode="decimal" value="${it.quantity}">
        <input data-i="${i}" data-k="unitPrice" type="number" inputmode="decimal" value="${it.unitPrice}">
        <button class="iconbtn danger" data-del="${i}">${Icon.trash}</button>
      </div>`).join('');
    wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', e => {
      const it = draft.items[+e.target.dataset.i]; const k=e.target.dataset.k;
      it[k] = k==='description' ? e.target.value : (parseFloat(e.target.value)||0);
      renderTotals();
    }));
    wrap.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      draft.items.splice(+b.dataset.del,1);
      if(!draft.items.length) draft.items.push({ id:uid(), description:'', quantity:1, unitPrice:0 });
      renderItems(); renderTotals();
    }));
  }

  function renderTotals(){
    const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);
    const cur = p.currency;
    $('totals').innerHTML = `
      <div class="ln"><span>Subtotal</span><span>${money(t.subtotal,cur)}</span></div>
      <div class="ln"><span>Discount %</span><input id="f-disc" type="number" inputmode="decimal" value="${draft.discountPercent}"></div>
      <div class="ln"><span>Tax %</span><input id="f-tax" type="number" inputmode="decimal" value="${draft.taxRatePercentage}"></div>
      <div class="ln"><span>Advance paid</span><input id="f-adv" type="number" inputmode="decimal" value="${draft.advancePayment}"></div>
      <div class="ln grand"><span>Total</span><span>${money(t.grandTotal,cur)}</span></div>
      ${ (Number(draft.advancePayment)||0)>0 ? `<div class="ln"><span>Due</span><span>${money(t.dueAmount,cur)}</span></div>`:'' }`;
    $('f-disc').addEventListener('input', e => { draft.discountPercent=parseFloat(e.target.value)||0; renderTotals(); keepFocus('f-disc'); });
    $('f-tax').addEventListener('input',  e => { draft.taxRatePercentage=parseFloat(e.target.value)||0; renderTotals(); keepFocus('f-tax'); });
    $('f-adv').addEventListener('input',  e => { draft.advancePayment=parseFloat(e.target.value)||0; renderTotals(); keepFocus('f-adv'); });
  }
  function keepFocus(id){ const el=$(id); if(el){ el.focus(); const v=el.value; el.value=''; el.value=v; } }
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

  // upsert client
  let client = findClientByName(draft.clientName);
  if(!client){ client = { id:uid(), name:draft.clientName.trim(), email:draft.clientEmail,
      clientVatId:draft.clientVatId, address:draft.clientAddress, phoneNumber:draft.clientPhone }; saveClient(client); }

  const t = compute(draft.items, draft.taxRatePercentage, draft.discountPercent, draft.advancePayment);

  const inv = {
    id:draft.id, type:draft.type, invoiceNumber:draft.invoiceNumber.trim(),
    clientId:client.id,
    clientName:draft.clientName.trim(), clientEmail:draft.clientEmail,
    clientAddress:draft.clientAddress, clientVatId:draft.clientVatId, clientPhone:draft.clientPhone,
    // business snapshot
    businessName:p.businessName, ownerName:p.ownerName, businessAddress:p.address,
    businessEmail:p.email, businessWebsite:p.website, businessPhone:p.phone,
    bankingInformation:p.bankingInformation, footerNotes:draft.footerNotes||p.footerNotes,
    logoUri:p.logoUri, currency:p.currency,
    taxNumbers:p.taxNumbers,
    // data
    creationDateMillis:draft.creationDateMillis, dueDateMillis:draft.dueDateMillis,
    items:draft.items.map(({id,description,quantity,unitPrice})=>({id,description,quantity:Number(quantity)||0,unitPrice:Number(unitPrice)||0})),
    subtotal:t.subtotal, discountPercent:Number(draft.discountPercent)||0,
    taxRatePercentage:Number(draft.taxRatePercentage)||0, taxAmount:t.taxAmount,
    advancePayment:Number(draft.advancePayment)||0, grandTotal:t.grandTotal,
    status:draft.status, notes:draft.notes, pdfStyle:draft.pdfStyle,
    buyerReference:draft.b2g?draft.buyerReference:'', departmentArea:draft.b2g?draft.departmentArea:'',
  };

  if(!draft.isEdit) consumeNumber(draft.type, draft.invoiceNumber);
  saveInvoice(inv);
  toast(draft.isEdit ? 'Updated' : 'Saved');
  ctx.navigate('/view/'+inv.id);
}
