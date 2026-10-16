import { getProfile, saveProfile, CURRENCIES, LANGUAGES, TAX_COLORS, downloadBackup, importBackup } from '../store.js';
import { APP_VERSION } from '../sync.js';   // version constant only (laptop sync is shelved)
import { t } from '../i18n.js';
import { esc, toast, isEmail, isWebsite } from '../util.js';
import { Icon } from '../icons.js';
import { adDebugOn, toggleAdDebug } from '../ads.js';
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

    ${mfield({id:'businessName',label:t('Business Name'),value:p.businessName,attrs:'autocapitalize="words"'})}
    ${mfield({id:'ownerName',label:t('Owner Name'),value:p.ownerName,attrs:'autocapitalize="words"'})}
    <div class="counter" style="margin-top:-2px">${t('Enter your business name, your name, or both')} <span style="color:var(--red)">*</span></div>
    ${mfield({id:'email',label:t('Email'),required:true,type:'email',value:p.email})}
    <div class="field-warn hidden" id="warn-email">${t('Enter a valid email — like name@example.com')}</div>
    ${mfield({id:'website',label:t('Website'),value:p.website})}
    <div class="field-warn hidden" id="warn-website">${t('Enter a valid website — like www.example.com')}</div>
    ${mfield({id:'phone',label:t('Phone Number')+' <span class="hint-b2g">('+t('B2G only')+' *)</span>',value:p.phone})}
    ${mfield({id:'address',label:t('Address'),textarea:true,value:p.address,counter:90})}

    <h3 class="section-h" style="font-size:20px">${t('Tax Number')}</h3>
    <div id="tax-list">${taxRows()}</div>
    <button class="btn block" id="tax-add" ${taxNumbers.length>=4?'disabled':''} style="margin-top:4px">${taxNumbers.length ? '+ '+t('Add Another Tax Number') : '+ '+t('Add a Tax Number')}</button>

    <div class="two" style="margin-top:14px">
      ${mfield({id:'defaultTaxPercentage',label:t('Default Tax Rate (%)'),type:'number',value:p.defaultTaxPercentage})}
      ${mselect({id:'currency',label:t('Currency'),options:CURRENCIES,value:p.currency})}
    </div>
    <div class="two">
      ${mselect({id:'appLanguage',label:t('App Language'),options:LANGUAGES,value:p.appLanguage})}
      ${mselect({id:'invoiceLanguage',label:t('Invoice Language'),options:LANGUAGES,value:p.invoiceLanguage})}
    </div>

    ${mfield({id:'bankingInformation',label:t('Banking Information'),textarea:true,value:p.bankingInformation,counter:120})}
    ${mfield({id:'notes',label:t('Notes'),textarea:true,value:p.notes,counter:150})}

    <label class="b2g-check" style="margin:16px 2px">
      <input type="checkbox" id="advancedSharingOptions" ${p.advancedSharingOptions?'checked':''}> ${t('Advanced Sharing Options')} <span class="help">${Icon.help}</span>
    </label>

    <div class="startno">
      <div>${t('Start from invoice N°')}<div class="startno-warn">${t("This can't be undone.")}</div></div>
      <input id="startFromInvoiceNumber" class="ctrl startno-input" type="number" value="${p.startFromInvoiceNumber}">
    </div>


    <div class="two" style="margin-top:16px">
      <button class="btn" id="backup">${t('Backup Now')}</button>
      <button class="btn" id="save-profile">${t('Save Profile')}</button>
    </div>
    <button class="btn ghost block" id="restore" style="margin-top:10px">${t('Restore from a backup file')}</button>
    <input type="file" id="restore-input" accept="application/json,.json" class="hidden">
    <div class="links"><button class="linkbtn">${t('Privacy Policy')}</button><button class="linkbtn">${t('Contact Us')}</button></div>
    <div class="section-sub" id="app-version" style="margin:14px 2px 0;opacity:.45;font-size:12px;text-align:center">Inkvoice ${APP_VERSION}${adDebugOn()?' · ad debug':''}</div>
  </div>`;
}

const logoInner = (d) => d ? `<img src="${d}" alt="logo">` : '';

// Downscale a logo data-URL so it can't blow the ~5MB localStorage quota. Every invoice
// embeds a copy of the logo, so a big (multi-MB) logo capped the app at ~4 invoices before
// storage filled up. Resize to max 300px; keep transparency via PNG when that stays small,
// else flatten onto white as a small JPEG. Returns a Promise of the shrunk data-URL.
function shrinkLogo(dataUrl){
  return new Promise((resolve, reject) => {
    if(!dataUrl || !/^data:image\//.test(dataUrl)){ resolve(dataUrl || ''); return; }
    const img = new Image();
    img.onerror = () => reject(new Error('bad image'));
    img.onload = () => {
      try {
        const MAX = 300;
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const s = Math.min(1, MAX / Math.max(w, h));
        w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = c.toDataURL('image/png');
        if(out.length > 120 * 1024){                 // big photo → white-flatten JPEG
          const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
          const x = c2.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
          out = c2.toDataURL('image/jpeg', 0.82);
        }
        resolve(out);
      } catch(e){ reject(e); }
    };
    img.src = dataUrl;
  });
}

function taxRows(){
  return taxNumbers.map((tx,i)=>`
    <div class="taxrow">
      <span class="sw" style="background:${TAX_COLORS[i]||TAX_COLORS[0]}"></span>
      <div class="mfield" style="flex:1;margin:6px 0"><input class="ctrl" placeholder=" " data-tax="${i}" data-k="label" value="${esc(tx.label)}"><label>${t('Label')}</label></div>
      <div class="mfield" style="flex:1.4;margin:6px 0"><input class="ctrl" placeholder=" " data-tax="${i}" data-k="number" value="${esc(tx.number)}"><label>${t('Number')}</label></div>
      <button class="iconbtn danger" data-tax-del="${i}">${Icon.x}</button>
    </div>`).join('');
}

export function mount(){
  const $ = id => document.getElementById(id);
  // Hidden switch: tap the version line 5× to toggle the ad diagnostic mode (see ads.js).
  let taps = 0, tapTimer;
  $('app-version').addEventListener('click', () => {
    clearTimeout(tapTimer); tapTimer = setTimeout(() => { taps = 0; }, 1500);
    if(++taps < 5) return;
    taps = 0;
    const on = toggleAdDebug();
    $('app-version').textContent = `Inkvoice ${APP_VERSION}${on ? ' · ad debug' : ''}`;
    toast(on ? 'Ad diagnostics ON' : 'Ad diagnostics OFF');
  });
  const input = $('logo-input');
  $('logo-circle').addEventListener('click', () => input.click());
  input.addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 12*1024*1024){ toast(t('Image too large (max 12MB)')); return; }
    const r = new FileReader();
    r.onload = ev => shrinkLogo(ev.target.result)
      .then(d => { logoData = d; $('logo-inner').innerHTML = logoInner(logoData); })
      .catch(() => toast(t('Could not read that image')));
    r.readAsDataURL(f);
  });

  const refreshTax = () => {
    $('tax-list').innerHTML = taxRows();
    $('tax-add').disabled = taxNumbers.length>=4;
    $('tax-add').textContent = taxNumbers.length ? '+ '+t('Add Another Tax Number') : '+ '+t('Add a Tax Number');
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

  $('backup').addEventListener('click', () => {
    downloadBackup();
    toast(t('Backup downloaded — keep it in Drive or email it to yourself'));
  });

  // Restore: pick a backup JSON file → REPLACE the data on this device with it.
  $('restore')?.addEventListener('click', () => $('restore-input')?.click());
  $('restore-input')?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';               // allow re-picking the same file later
    if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      let data; try { data = JSON.parse(r.result); } catch { toast(t('That file is not a valid backup')); return; }
      if(!confirm(t('Restore this backup? It will REPLACE the profile, clients and invoices currently on this device.'))) return;
      try { importBackup(data); toast(t('Backup restored')); location.reload(); }
      catch(err){ toast('Could not restore: ' + (err.message || 'invalid file')); }
    };
    r.readAsText(file);
  });

  $('save-profile').addEventListener('click', async () => {
    const g = id => ($(id)||{}).value || '';
    // Mandatory fields must match the tab-gate (isProfileValid): a business OR owner name,
    // plus a valid email. Otherwise the profile would "save" but the tabs would stay locked.
    const nameOk = g('businessName').trim() || g('ownerName').trim();
    if(!nameOk){ toast(t('Business or owner name is required')); return; }
    if(!isEmail(g('email').trim())){ toast(t('A valid email is required — like name@example.com')); $('warn-email')?.classList.remove('hidden'); return; }
    if(g('website').trim() && !isWebsite(g('website').trim())){ toast(t('Enter a valid website (e.g. www.example.com) or leave it empty')); $('warn-website')?.classList.remove('hidden'); return; }
    // Shrink an oversized logo before saving (e.g. one stored before compression existed) so a
    // big image can't fill the storage quota and block invoice creation.
    if(logoData && logoData.length > 150*1024){
      try { logoData = await shrinkLogo(logoData); } catch {}
    }
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
    try {
      saveProfile(p);
    } catch(e){
      toast(t('Storage full — please use a smaller logo, or delete some documents, then Save again.'));
      return;
    }
    toast(t('Profile saved'));
    // Profile is now valid → go to Home. The re-render unlocks Create/Invoices/Biz Card
    // and shows the logo (if set) in place of the wordmark.
    window.nav('/');
  });
}
