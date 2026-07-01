import { getProfile } from '../store.js';
import { esc, toast } from '../util.js';
import { Icon } from '../icons.js';

export function html(){
  const p = getProfile();
  if(!p.businessName){
    return `<div class="screen"><div class="empty">${Icon.bizcard}<div>Set up your business profile first.</div>
      <button class="btn" style="margin-top:14px" onclick="nav('/profile')">Go to Profile</button></div></div>`;
  }

  const lines = [p.ownerName, p.email, p.phone, p.website].filter(Boolean)
    .map(l => `<div class="bc-line">${esc(l)}</div>`).join('');

  return `<div class="screen">
    <div class="topbar"><h1>Business Card</h1></div>
    <div class="bizcard" id="card">
      <div class="bc-logo">${p.logoUri ? `<img src="${p.logoUri}" alt="">` : `<div class="c"></div>`}</div>
      <div class="bc-info">
        <div class="bc-name">${esc(p.businessName)}</div>
        ${lines}
      </div>
    </div>
    <button class="btn block" id="share" style="margin-top:18px">${Icon.share} Share card</button>
  </div>`;
}

export function mount(){
  const btn = document.getElementById('share');
  if(btn) btn.addEventListener('click', () => toast('Take a screenshot to share your card'));
}
