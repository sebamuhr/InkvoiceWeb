import { getProfile } from '../store.js';
import { esc } from '../util.js';
import { Icon } from '../icons.js';

export function html(){
  const p = getProfile();
  if(!p.businessName){
    return `<div class="screen"><div class="topbar"><h1>Business Cards</h1></div>
      <div class="empty">${Icon.card}<div>Set up your business profile first.</div>
      <button class="btn" style="margin-top:12px" onclick="nav('/profile')">Go to Profile</button></div></div>`;
  }

  const card = `
    <div class="bizcard">
      <div class="accent"></div>
      <div style="margin-left:14px">
        ${p.logoUri ? `<img src="${p.logoUri}" alt="" style="height:34px;object-fit:contain;margin-bottom:8px">`:''}
        <div class="nm">${esc(p.ownerName || p.businessName)}</div>
        ${p.ownerName ? `<div class="biz">${esc(p.businessName)}</div>`:''}
      </div>
      <div class="meta" style="margin-left:14px">
        ${p.phone?`<div>${esc(p.phone)}</div>`:''}
        ${p.email?`<div>${esc(p.email)}</div>`:''}
        ${p.website?`<div>${esc(p.website)}</div>`:''}
      </div>
    </div>`;

  return `<div class="screen">
    <div class="topbar"><h1>Business Cards</h1></div>
    <div class="card">
      <h3>${Icon.card} Preview</h3>
      ${card}
      <p class="section-hint" style="margin-top:12px">Generated from your business profile. Use your phone's screenshot or share to send it.</p>
    </div>
  </div>`;
}
