// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import * as Home from './views/dashboard.js';
import * as Create from './views/create.js';
import * as List from './views/list.js';
import * as View from './views/view.js';
import * as Profile from './views/profile.js';
import * as Cards from './views/cards.js';

const state = { route:'/' };

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
  { test:p => p==='/cards',             view:Cards,   key:'' },
  { test:p => p==='/profile',           view:Profile, key:'profile' },
  { test:p => p.startsWith('/view/'),   view:View,    key:'' },
];

function tabbar(active){
  return `
    <nav class="tabbar">
      <button class="${active==='profile'?'active':''}" onclick="nav('/profile')">
        <span class="pill">${Icon.user}</span><span>Profile</span>
      </button>
      <button class="create" onclick="nav('/create')" aria-label="Create">
        <span class="circle">${Icon.plus}</span><span>Create</span>
      </button>
      <button class="${active==='invoices'?'active':''}" onclick="nav('/invoices')">
        <span class="pill">${Icon.list}</span><span>Invoices</span>
      </button>
    </nav>`;
}

function render(){
  const { path, params } = parse(state.route);
  const match = ROUTES.find(r => r.test(path)) || ROUTES[0];
  const ctx = { params, navigate, arg:match.arg, path };
  const app = document.getElementById('app');
  app.innerHTML = `<div class="fade">${match.view.html(ctx)}</div>` + tabbar(match.key);
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
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

render();
