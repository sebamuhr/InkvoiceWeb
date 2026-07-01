import { getProfile, saveProfile, DEFAULT_PROFILE, CURRENCIES, PDF_STYLES, TAX_COLORS } from '../store.js';
import { esc, toast } from '../util.js';
import { Icon } from '../icons.js';

let logoData = '';
let taxNumbers = [];

export function html(){
  const p = getProfile();
  logoData = p.logoUri || '';
  taxNumbers = Array.isArray(p.taxNumbers) ? JSON.parse(JSON.stringify(p.taxNumbers)) : [];

  return `<div class="screen">
    <div class="topbar"><h1>Business Profile</h1></div>

    <div class="card">
      <h3>${Icon.image} Branding</h3>
      <div class="logo-drop" id="logo-drop">
        <input type="file" id="logo-input" accept="image/png,image/jpeg" class="hidden">
        <div id="logo-prev">${logoPrev(logoData)}</div>
        <div class="section-hint">Tap to upload your logo (PNG or JPG)</div>
        ${logoData ? `<button type="button" class="btn ghost btn-sm" id="logo-remove" style="margin-top:8px">Remove</button>`:''}
      </div>
    </div>

    <div class="card">
      <h3>${Icon.building} Basic information</h3>
      ${field('Business Name','businessName',p.businessName,true)}
      ${field('Owner / Contact','ownerName',p.ownerName)}
      <div class="field"><label>Address</label><textarea name="address">${esc(p.address)}</textarea></div>
      <div class="row">${field('Email','email',p.email,true,'email')}${field('Phone','phone',p.phone)}</div>
      ${field('Website','website',p.website)}
    </div>

    <div class="card">
      <h3>${Icon.doc} Tax numbers</h3>
      <div id="tax-list">${taxRows()}</div>
      <button type="button" class="btn ghost btn-sm" id="tax-add" ${taxNumbers.length>=4?'disabled':''}>+ Add tax number</button>
    </div>

    <div class="card">
      <h3>${Icon.calc} Defaults</h3>
      <div class="row">
        <div class="field"><label>Currency</label>
          <select name="currency">${CURRENCIES.map(c=>`<option ${p.currency===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Default Tax %</label>
          <input name="defaultTaxPercentage" type="number" inputmode="decimal" value="${p.defaultTaxPercentage}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Start invoices at #</label>
          <input name="startFromInvoiceNumber" type="number" inputmode="numeric" value="${p.startFromInvoiceNumber}"></div>
        <div class="field"><label>Default PDF style</label>
          <select name="preferredPdfStyle">${PDF_STYLES.map(s=>`<option ${p.preferredPdfStyle===s?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
    </div>

    <div class="card">
      <h3>${Icon.doc} Banking & footer</h3>
      <div class="field"><label>Banking information</label><textarea name="bankingInformation" placeholder="Bank, IBAN, BIC…">${esc(p.bankingInformation)}</textarea></div>
      <div class="field"><label>Default footer notes</label><textarea name="footerNotes" placeholder="Payment terms, thank-you note…">${esc(p.footerNotes)}</textarea></div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:6px">
        <input type="checkbox" name="isB2GEnabled" ${p.isB2GEnabled?'checked':''} style="width:auto"> Enable B2G (public-sector) fields
      </label>
    </div>

    <button class="btn block" id="save-profile">${Icon.save} Save profile</button>
    <button class="btn ghost block" style="margin-top:10px" onclick="nav('/cards')">${Icon.card} Business cards</button>
  </div>`;
}

const field = (label,name,val,req=false,type='text') =>
  `<div class="field"><label>${label} ${req?'<span class="req">*</span>':''}</label>
   <input name="${name}" type="${type}" value="${esc(val)}"></div>`;

const logoPrev = (d) => d
  ? `<img src="${d}" alt="logo">`
  : `<div class="logo-ph">${Icon.image}</div>`;

function taxRows(){
  if(!taxNumbers.length) return `<div class="section-hint" style="margin-bottom:10px">No tax numbers yet.</div>`;
  return taxNumbers.map((t,i)=>`
    <div class="taxrow">
      <span class="swatch-sm" style="background:${TAX_COLORS[i]||TAX_COLORS[0]}"></span>
      <input data-tax="${i}" data-k="label" placeholder="Label (e.g. VAT)" value="${esc(t.label)}" style="flex:1">
      <input data-tax="${i}" data-k="number" placeholder="Number" value="${esc(t.number)}" style="flex:1.4">
      <button type="button" class="iconbtn danger" data-tax-del="${i}">${Icon.x}</button>
    </div>`).join('');
}

export function mount(ctx){
  // Logo
  const drop = document.getElementById('logo-drop');
  const input = document.getElementById('logo-input');
  drop.addEventListener('click', e => { if(e.target.id!=='logo-remove') input.click(); });
  input.addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 2*1024*1024){ toast('Image too large (max 2MB)'); return; }
    const r = new FileReader();
    r.onload = ev => { logoData = ev.target.result;
      document.getElementById('logo-prev').innerHTML = logoPrev(logoData); };
    r.readAsDataURL(f);
  });
  const rm = document.getElementById('logo-remove');
  if(rm) rm.addEventListener('click', e => { e.stopPropagation(); logoData='';
    document.getElementById('logo-prev').innerHTML = logoPrev(''); rm.remove(); });

  // Tax numbers
  const refreshTax = () => {
    document.getElementById('tax-list').innerHTML = taxRows();
    document.getElementById('tax-add').disabled = taxNumbers.length>=4;
    wireTax();
  };
  function wireTax(){
    document.querySelectorAll('[data-tax]').forEach(el =>
      el.addEventListener('input', e => {
        taxNumbers[+el.dataset.tax][el.dataset.k] = e.target.value; }));
    document.querySelectorAll('[data-tax-del]').forEach(b =>
      b.addEventListener('click', () => { taxNumbers.splice(+b.dataset.taxDel,1); refreshTax(); }));
  }
  document.getElementById('tax-add').addEventListener('click', () => {
    if(taxNumbers.length>=4) return;
    taxNumbers.push({ label:'', number:'', color:TAX_COLORS[taxNumbers.length] }); refreshTax(); });
  wireTax();

  // Save
  document.getElementById('save-profile').addEventListener('click', () => {
    const g = n => (document.querySelector(`[name="${n}"]`)||{}).value || '';
    const p = {
      ...getProfile(),
      businessName:g('businessName').trim(),
      ownerName:g('ownerName').trim(),
      address:g('address'),
      email:g('email').trim(),
      phone:g('phone').trim(),
      website:g('website').trim(),
      currency:g('currency'),
      defaultTaxPercentage:parseFloat(g('defaultTaxPercentage'))||0,
      startFromInvoiceNumber:parseInt(g('startFromInvoiceNumber'),10)||1,
      preferredPdfStyle:g('preferredPdfStyle'),
      bankingInformation:g('bankingInformation'),
      footerNotes:g('footerNotes'),
      isB2GEnabled:document.querySelector('[name="isB2GEnabled"]').checked,
      taxNumbers:taxNumbers.filter(t=>t.label||t.number).map((t,i)=>({...t,color:TAX_COLORS[i]||TAX_COLORS[0]})),
      logoUri:logoData,
    };
    if(!p.businessName){ toast('Business name is required'); return; }
    saveProfile(p);
    toast('Profile saved');
  });
}
