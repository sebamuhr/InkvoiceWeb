import { getProfile } from '../store.js';
import { esc } from '../util.js';
import { t } from '../i18n.js';

export function html(){
  const p = getProfile();
  // Show the business logo on Home when one is set; otherwise the "Inkvoice." wordmark.
  const brand = p.logoUri
    ? `<div class="home-logo"><img src="${esc(p.logoUri)}" alt="${esc(p.businessName || 'Logo')}"></div>`
    : `<div class="wordmark">Inkvoice.</div>`;
  return `<div class="screen">
    <div class="wordmark-wrap">
      ${brand}
      ${!p.businessName ? `<button class="btn" onclick="nav('/profile')">${t('Set up your business')}</button>` : ''}
    </div>
  </div>`;
}
