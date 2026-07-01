import { getProfile } from '../store.js';

export function html(){
  const p = getProfile();
  return `<div class="screen">
    <div class="wordmark-wrap">
      <div class="wordmark">Inkvoice.</div>
      ${!p.businessName ? `<button class="btn" onclick="nav('/profile')">Set up your business</button>` : ''}
    </div>
  </div>`;
}
