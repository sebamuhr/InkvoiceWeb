import { getProfile, saveProfile, CURRENCIES, PDF_STYLES, TAX_COLORS } from '../store.js';
import { esc, toast } from '../util.js';
import { Icon } from '../icons.js';
import { mfield } from '../ui.js';

let logoData = '';
let taxNumbers = [];

export function html(){
  const p = getProfile();
  logoData = p.logoUri || '';
  taxNumbers = Array.isArray(p.taxNumbers) ? JSON.parse(JSON.stringify(p.taxNumbers)) : [];

  return `<div class="screen">
    <input type="file" id="logo-input" accept="image/png,image/jpeg" class="hidden">
    <div class="profile-logo">
      <div class="circle" id="logo-circle">
        <div id="logo-inner">${logoInner(logoData)}</div>
        <div class="pencil">${Icon.edit}</div>
      </div>
    </div>

    ${mfield({id:'businessName',label:'Business Name',required:true,value:p.businessName})}
    ${mfield({id:'ownerName',label:'Owner Name',required:true,value:p.ownerName})}
    ${mfield({id:'email',label:'Email',required:true,type:'email',value:p.email})}
    ${mfield({id:'website',label:'Website',value:p.website})}
    ${mfield({id:'phone',label:'Phone Number',value:p.phone})}
    ${mfield({id:'address',label:'Address',textarea:true,value:p.address,counter:90})}

    <div class="section-h" style="font-size:18px">Tax numbers</div>
    <div id="tax-list">${taxRows()}</div>
    <button class="btn ghost" id="tax-add" ${taxNumbers.length>=4?'disabled':''} style="margin-top:4px">+ Add tax number</button>

    <div class="two" style="margin-top:8px">
      ${mfield({id:'defaultTaxPercentage',label:'Default Tax Rate (%)',type:'number',value:p.defaultTaxPercentage})}
      <div class="mfield">
        <label for="currency">Currency</label>
        <select id="currency" class="ctrl">${CURRENCIES.map(c=>`<option ${p.currency===c?'selected':''}>${c}</option>`).join('')}</select>
        <span class="icon-r">${Icon.chev}</span>
      </div>
    </div>
    <div class="two">
      ${mfield({id:'startFromInvoiceNumber',label:'Start invoices at #',type:'number',value:p.startFromInvoiceNumber})}
      <div class="mfield">
        <label for="preferredPdfStyle">Default PDF Style</label>
        <select id="preferredPdfStyle" class="ctrl">${PDF_STYLES.map(s=>`<option ${p.preferredPdfStyle===s?'selected':''}>${s}</option>`).join('')}</select>
        <span class="icon-r">${Icon.chev}</span>
      </div>
    </div>

    ${mfield({id:'bankingInformation',label:'Banking Information',textarea:true,value:p.bankingInformation})}
    ${mfield({id:'footerNotes',label:'Default Footer Notes',textarea:true,value:p.footerNotes})}

    <label style="display:flex;align-items:center;gap:12px;font-size:17px;margin:14px 2px">
      <input type="checkbox" id="isB2GEnabled" ${p.isB2GEnabled?'checked':''} style="width:22px;height:22px"> Enable B2G (public-sector) fields
    </label>

    <button class="btn block" id="save-profile" style="margin-top:8px">${Icon.save} Save Profile</button>
    <button class="btn ghost block" style="margin-top:10px" onclick="nav('/cards')">${Icon.card} Business Cards</button>
  </div>`;
}

const logoInner = (d) => d ? `<img src="${d}" alt="logo">` : `<span>LOGO</span>`;

function taxRows(){
  if(!taxNumbers.length) return `<div class="section-sub">No tax numbers yet.</div>`;
  return taxNumbers.map((t,i)=>`
    <div class="taxrow">
      <span class="sw" style="background:${TAX_COLORS[i]||TAX_COLORS[0]}"></span>
      <div class="mfield" style="flex:1;margin:6px 0"><label>Label</label><input class="ctrl" data-tax="${i}" data-k="label" value="${esc(t.label)}"></div>
      <div class="mfield" style="flex:1.4;margin:6px 0"><label>Number</label><input class="ctrl" data-tax="${i}" data-k="number" value="${esc(t.number)}"></div>
      <button class="iconbtn danger" data-tax-del="${i}">${Icon.x}</button>
    </div>`).join('');
}

export function mount(){
  const $ = id => document.getElementById(id);
  const input = $('logo-input');
  $('logo-circle').addEventListener('click', () => input.click());
  input.addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 2*1024*1024){ toast('Image too large (max 2MB)'); return; }
    const r = new FileReader();
    r.onload = ev => { logoData = ev.target.result; $('logo-inner').innerHTML = logoInner(logoData); };
    r.readAsDataURL(f);
  });

  const refreshTax = () => { $('tax-list').innerHTML = taxRows(); $('tax-add').disabled = taxNumbers.length>=4; wireTax(); };
  function wireTax(){
    document.querySelectorAll('[data-tax]').forEach(el => el.addEventListener('input', () => {
      taxNumbers[+el.dataset.tax][el.dataset.k] = el.value; }));
    document.querySelectorAll('[data-tax-del]').forEach(b => b.addEventListener('click', () => { taxNumbers.splice(+b.dataset.taxDel,1); refreshTax(); }));
  }
  $('tax-add').addEventListener('click', () => { if(taxNumbers.length>=4) return; taxNumbers.push({label:'',number:'',color:TAX_COLORS[taxNumbers.length]}); refreshTax(); });
  wireTax();

  $('save-profile').addEventListener('click', () => {
    const g = id => ($(id)||{}).value || '';
    const p = {
      ...getProfile(),
      businessName:g('businessName').trim(), ownerName:g('ownerName').trim(), email:g('email').trim(),
      website:g('website').trim(), phone:g('phone').trim(), address:g('address'),
      currency:g('currency'), defaultTaxPercentage:parseFloat(g('defaultTaxPercentage'))||0,
      startFromInvoiceNumber:parseInt(g('startFromInvoiceNumber'),10)||1, preferredPdfStyle:g('preferredPdfStyle'),
      bankingInformation:g('bankingInformation'), footerNotes:g('footerNotes'),
      isB2GEnabled:$('isB2GEnabled').checked,
      taxNumbers:taxNumbers.filter(t=>t.label||t.number).map((t,i)=>({...t,color:TAX_COLORS[i]||TAX_COLORS[0]})),
      logoUri:logoData,
    };
    if(!p.businessName){ toast('Business name is required'); return; }
    saveProfile(p);
    toast('Profile saved');
  });
}
