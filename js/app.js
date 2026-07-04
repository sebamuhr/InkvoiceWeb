// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import { getProfile } from './store.js';
import { toast } from './util.js';
import * as Home from './views/dashboard.js';
import * as Create from './views/create.js';
import * as List from './views/list.js';
import * as View from './views/view.js';
import * as Profile from './views/profile.js';
import * as Cards from './views/cards.js';

const state = { route:'/', key:'' };

// Create / Invoices / Quotations / Biz Card (and the PDF viewer) are locked until the
// profile has the essentials — matches the real Inkvoice: business OR owner name + a
// valid email. Profile stays open so the user can fill it in.
const GATED = new Set(['/create', '/invoices', '/quotations', '/cards']);
const isGatedPath = (path) => GATED.has(path) || path.startsWith('/view/');
export function isProfileValid(){
  const p = getProfile();
  const nameOk = (p.businessName||'').trim() || (p.ownerName||'').trim();
  const email = (p.email||'').trim();
  const emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return !!(nameOk && emailOk);
}
const PROFILE_MSG = 'Please fill profile data to create invoices/quotations';
// Tapping a locked tab: explain, don't navigate (like the Android snackbar).
window.tabBlocked = () => toast(PROFILE_MSG);
// Re-render just the tab bar (e.g. after Save Profile) so gated tabs unlock in place.
window.refreshTabs = () => { const n = document.querySelector('.tabbar'); if(n) n.outerHTML = tabbar(state.key); };

export function navigate(path){
  state.route = path;
  render();
  window.scrollTo(0,0);
}
window.nav = navigate;

function parse(route){
  const [path, query=''] = route.split('?');
  return { path, params:new URLSearchParams(query) };
}

const ROUTES = [
  { test:p => p==='/' || p==='',        view:Home,    key:'home' },
  { test:p => p==='/create',            view:Create,  key:'create' },
  { test:p => p==='/invoices',          view:List,    key:'invoices', arg:'invoice' },
  { test:p => p==='/quotations',        view:List,    key:'invoices', arg:'quotation' },
  { test:p => p==='/cards',             view:Cards,   key:'cards' },
  { test:p => p==='/profile',           view:Profile, key:'profile' },
  { test:p => p.startsWith('/view/'),   view:View,    key:'' },
];

function tabbar(active){
  const valid = isProfileValid();
  const tab = (key, path, icon, label, gated) => {
    const locked = gated && !valid;
    const cls = [active===key?'active':'', locked?'disabled':''].filter(Boolean).join(' ');
    const onclick = locked ? 'tabBlocked()' : `nav('${path}')`;
    return `<button class="${cls}" onclick="${onclick}"${locked?' aria-disabled="true"':''}>${icon}<span>${label}</span></button>`;
  };
  return `
    <nav class="tabbar">
      ${tab('profile','/profile',Icon.user,'Profile',false)}
      ${tab('create','/create',Icon.plusCircle,'Create',true)}
      ${tab('invoices','/invoices',Icon.list,'Invoices',true)}
      ${tab('cards','/cards',Icon.bizcard,'Biz Card',true)}
    </nav>`;
}

function render(){
  let { path, params } = parse(state.route);
  // Safety net: a gated route reached while the profile is incomplete → send to Profile.
  if(isGatedPath(path) && !isProfileValid()){
    toast(PROFILE_MSG);
    state.route = '/profile'; path = '/profile'; params = new URLSearchParams();
  }
  const match = ROUTES.find(r => r.test(path)) || ROUTES[0];
  state.key = match.key;
  const ctx = { params, navigate, arg:match.arg, path };
  const app = document.getElementById('app');
  // iPhone has no OS back button — a small top-left chevron returns to Home.
  // The Home screen and the full-screen PDF viewer (its own bar) are excluded.
  const isHome = path==='/' || path==='';
  const isView = path.startsWith('/view/');
  const showBack = !isHome && !isView;
  app.classList.toggle('with-back', showBack);
  const back = showBack ? `<button class="backhome" onclick="nav('/')" aria-label="Home">${Icon.back}</button>` : '';
  app.innerHTML = back + `<div class="fade">${match.view.html(ctx)}</div>` + tabbar(match.key);
  if(match.view.mount) match.view.mount(ctx);
}

// Material field focus highlight + live char counters (delegated, once)
document.addEventListener('focusin', e => {
  const f = e.target.closest && e.target.closest('.mfield'); if(f) f.classList.add('focus');
});
document.addEventListener('focusout', e => {
  const f = e.target.closest && e.target.closest('.mfield'); if(f) f.classList.remove('focus');
});
document.addEventListener('input', e => {
  const el = e.target;
  if(el.id){
    const c = document.querySelector(`[data-counter-for="${el.id}"]`);
    if(c) c.textContent = `${el.value.length} / ${c.dataset.max} characters`;
  }
});

if('serviceWorker' in navigator){
  // When a new worker takes control, reload once so fresh code is used
  // (prevents "blank page after update" from a stale worker).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(!window.__swReloaded){ window.__swReloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => reg.update())
      .catch(()=>{});
  });
}

render();
