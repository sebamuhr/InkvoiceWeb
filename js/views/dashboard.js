import { getProfile } from '../store.js';

export function html(){
  const p = getProfile();
  const inner = p.logoUri
    ? `<img src="${p.logoUri}" alt="logo">`
    : `<span>LOGO</span>`;

  return `<div class="screen">
    <div class="home-wrap">
      <div style="text-align:center">
        <div class="logo-circle">${inner}</div>
        ${!p.businessName ? `
          <button class="btn" style="margin-top:32px" onclick="nav('/profile')">Set up your business</button>
        ` : ''}
      </div>
    </div>
  </div>`;
}
