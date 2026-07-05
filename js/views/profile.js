import { getProfile, saveProfile, CURRENCIES, LANGUAGES, TAX_COLORS } from '../store.js';
import { esc, toast, isEmail, isWebsite } from '../util.js';
import { Icon } from '../icons.js';
import { mfield, mselect } from '../ui.js';

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

    ${mfield({id:'businessName',label:'Business Name',value:p.businessName,attrs:'autocapitalize="words"'})}
    ${mfield({id:'ownerName',label:'Owner Name',value:p.ownerName,attrs:'autocapitalize="words"'})}
    <div class="counter" style="margin-top:-2px">Enter your business name, your name, or both <span style="color:var(--red)">*</span></div>
    ${mfield({id:'email',label:'Email',required:true,type:'email',value:p.email})}
    <div class="field-warn hidden" id="warn-email">Enter a valid email — like name@example.com</div>
    ${mfield({id:'website',label:'Website',value:p.website})}
    <div class="field-warn hidden" id="warn-website">Enter a valid website — like www.example.com</div>
    ${mfield({id:'phone',label:'Phone Number <span class="hint-b2g">(B2G only *)</span>',value:p.phone})}
    ${mfield({id:'address',label:'Address',textarea:true,value:p.address,counter:90})}

    <h3 class="section-h" style="font-size:20px">Tax Number</h3>
    <div id="tax-list">${taxRows()}</div>
    <button class="btn block" id="tax-add" ${taxNumbers.length>=4?'disabled':''} style="margin-top:4px">${taxNumbers.length ? '+ Add Another Tax Number' : '+ Add a Tax Number'}</button>

    <div class="two" style="margin-top:14px">
      ${mfield({id:'defaultTaxPercentage',label:'Default Tax Rate (%)',type:'number',value:p.defaultTaxPercentage})}
      ${mselect({id:'currency',label:'Currency',options:CURRENCIES,value:p.currency})}
    </div>
    <div class="two">
      ${mselect({id:'appLanguage',label:'App Language',options:LANGUAGES,value:p.appLanguage})}
      ${mselect({id:'invoiceLanguage',label:'Invoice Language',options:LANGUAGES,value:p.invoiceLanguage})}
    </div>

    ${mfield({id:'bankingInformation',label:'Banking Information',textarea:true,value:p.bankingInformation,counter:120})}
    ${mfield({id:'notes',label:'Notes',textarea:true,value:p.notes,counter:150})}

    <label class="b2g-check" style="margin:16px 2px">
      <input type="checkbox" id="advancedSharingOptions" ${p.advancedSharingOptions?'checked':''}> Advanced Sharing Options <span class="help">${Icon.help}</span>
    </label>

    <div class="startno">
      <div>Start from invoice N°<div class="startno-warn">This can't be undone.</div></div>
      <input id="startFromInvoiceNumber" class="ctrl startno-input" type="number" value="${p.startFromInvoiceNumber}">
    </div>

    <button class="btn block" id="sync-connect-btn" style="margin-top:16px">${Icon.link || ''} Connect a device</button>
    <div class="section-sub" style="margin:6px 2px 0">Use your laptop or tablet to create invoices — it mirrors this phone over the same Wi-Fi.</div>

    <div class="two" style="margin-top:16px">
      <button class="btn" id="backup">Backup Now</button>
      <button class="btn" id="save-profile">Save Profile</button>
    </div>
    <div class="links"><button class="linkbtn">Privacy Policy</button><button class="linkbtn">Contact Us</button></div>
  </div>`;
}

const logoInner = (d) => d ? `<img src="${d}" alt="logo">` : '';

function taxRows(){
  return taxNumbers.map((t,i)=>`
    <div class="taxrow">
      <span class="sw" style="background:${TAX_COLORS[i]||TAX_COLORS[0]}"></span>
      <div class="mfield" style="flex:1;margin:6px 0"><input class="ctrl" placeholder=" " data-tax="${i}" data-k="label" value="${esc(t.label)}"><label>Label</label></div>
      <div class="mfield" style="flex:1.4;margin:6px 0"><input class="ctrl" placeholder=" " data-tax="${i}" data-k="number" value="${esc(t.number)}"><label>Number</label></div>
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

  const refreshTax = () => {
    $('tax-list').innerHTML = taxRows();
    $('tax-add').disabled = taxNumbers.length>=4;
    $('tax-add').textContent = taxNumbers.length ? '+ Add Another Tax Number' : '+ Add a Tax Number';
    wireTax();
  };
  function wireTax(){
    document.querySelectorAll('[data-tax]').forEach(el => el.addEventListener('input', () => { taxNumbers[+el.dataset.tax][el.dataset.k] = el.value; }));
    document.querySelectorAll('[data-tax-del]').forEach(b => b.addEventListener('click', () => { taxNumbers.splice(+b.dataset.taxDel,1); refreshTax(); }));
  }
  $('tax-add').addEventListener('click', () => { if(taxNumbers.length>=4) return; taxNumbers.push({label:'',number:'',color:TAX_COLORS[taxNumbers.length]}); refreshTax(); });
  wireTax();

  // Live format validation: warn when a field has content but the format is wrong.
  const liveWarn = (fieldId, warnId, ok) => {
    const f = $(fieldId), w = $(warnId); if(!f || !w) return;
    const check = () => w.classList.toggle('hidden', !(f.value.trim() && !ok(f.value)));
    f.addEventListener('input', check); f.addEventListener('blur', check);
  };
  liveWarn('email', 'warn-email', isEmail);
  liveWarn('website', 'warn-website', isWebsite);

  $('sync-connect-btn')?.addEventListener('click', () => {
    if(window.__syncConnect) window.__syncConnect();
    else toast('Device connect is available in the installed phone app');
  });

  $('backup').addEventListener('click', () => {
    const data = { profile:localStorage.getItem('inkvoice_profile'), clients:localStorage.getItem('inkvoice_clients'), invoices:localStorage.getItem('inkvoice_invoices') };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='inkvoice-backup.json'; a.click();
    toast('Backup downloaded');
  });

  $('save-profile').addEventListener('click', () => {
    const g = id => ($(id)||{}).value || '';
    const p = {
      ...getProfile(),
      businessName:g('businessName').trim(), ownerName:g('ownerName').trim(), email:g('email').trim(),
      website:g('website').trim(), phone:g('phone').trim(), address:g('address'),
      currency:g('currency'), defaultTaxPercentage:parseFloat(g('defaultTaxPercentage'))||0,
      startFromInvoiceNumber:parseInt(g('startFromInvoiceNumber'),10)||1,
      appLanguage:g('appLanguage'), invoiceLanguage:g('invoiceLanguage'),
      bankingInformation:g('bankingInformation'), notes:g('notes'),
      advancedSharingOptions:$('advancedSharingOptions').checked,
      taxNumbers:taxNumbers.filter(t=>t.label||t.number).map((t,i)=>({...t,color:TAX_COLORS[i]||TAX_COLORS[0]})),
      logoUri:logoData,
    };
    // Mandatory fields must match the tab-gate (isProfileValid): a business OR owner
    // name, plus a valid email. Otherwise the profile would "save" but the tabs would
    // stay locked with no explanation.
    const nameOk = p.businessName || p.ownerName;
    if(!nameOk){ toast('Business or owner name is required'); return; }
    if(!isEmail(p.email)){ toast('A valid email is required — like name@example.com'); $('warn-email')?.classList.remove('hidden'); return; }
    if(p.website && !isWebsite(p.website)){ toast('Enter a valid website (e.g. www.example.com) or leave it empty'); $('warn-website')?.classList.remove('hidden'); return; }
    saveProfile(p);
    toast('Profile saved');
    // Profile is now valid → go to Home. The re-render unlocks Create/Invoices/Biz Card
    // and shows the logo (if set) in place of the wordmark.
    window.nav('/');
  });
}
