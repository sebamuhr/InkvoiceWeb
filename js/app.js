// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import * as Dashboard from './views/dashboard.js';
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
window.nav = navigate; // used by inline handlers in views

function parse(route){
  const [path, query=''] = route.split('?');
  return { path, params:new URLSearchParams(query) };
}

const ROUTES = [
  { test:p => p==='/' || p==='',          view:Dashboard, key:'home' },
  { test:p => p==='/create',              view:Create,    key:'create' },
  { test:p => p==='/invoices',            view:List,      key:'invoices', arg:'invoice' },
  { test:p => p==='/quotations',          view:List,      key:'invoices', arg:'quotation' },
  { test:p => p==='/cards',               view:Cards,     key:'cards' },
  { test:p => p==='/profile',             view:Profile,   key:'profile' },
  { test:p => p.startsWith('/view/'),     view:View,      key:'' },
];

function tabbar(activeKey){
  const tab = (key, path, icon, label) => `
    <button class="${activeKey===key?'active':''}" onclick="nav('${path}')">
      ${icon}<span>${label}</span>
    </button>`;
  return `
    <nav class="tabbar">
      ${tab('home','/',Icon.home,'Home')}
      ${tab('invoices','/invoices',Icon.doc,'Docs')}
      <div class="fab">
        <button class="fab-btn" onclick="nav('/create')" aria-label="Create">${Icon.plus}</button>
      </div>
      ${tab('cards','/cards',Icon.card,'Cards')}
      ${tab('profile','/profile',Icon.user,'Profile')}
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

// Service worker (PWA / offline)
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

render();
