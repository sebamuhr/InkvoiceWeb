// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import { getProfile } from './store.js';
import { toast, dialog } from './util.js';
import * as Home from './views/dashboard.js';
import * as Create from './views/create.js';
import * as List from './views/list.js';
import * as View from './views/view.js';
import * as Profile from './views/profile.js';
import * as Cards from './views/cards.js';
import * as Landing from './views/landing.js';
import { initSyncBridge } from './syncbridge.js';
import * as SyncUI from './syncui.js';

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

// ---- Navigation is mirrored into browser history (hash-based, so a reload on a
// static host never 404s). This is what makes the phone's SYSTEM back button work:
// each nav() pushes a history entry, and popstate re-renders the previous route
// instead of the browser exiting the SPA (which showed a blank page). Re-navigating
// to the SAME route (e.g. a list filter refresh) replaces rather than stacks. ----
const routeToHash = (route) => '#' + route;
const hashToRoute = () => (location.hash && location.hash.length > 1) ? location.hash.slice(1) : '/';

export function navigate(path){
  if(path === state.route) history.replaceState({}, '', routeToHash(path));
  else                     history.pushState({}, '', routeToHash(path));
  state.route = path;
  render();
  window.scrollTo(0,0);
}
window.nav = navigate;
// Back arrow (chevron) and the phone system back both route through history, so
// "back is back" everywhere and the Create discard guard (popstate) applies to both.
window.goBack = () => history.back();

// popstate = the user pressed system/gesture back (or our chevron via history.back()).
// Guard leaving the Create screen with an unsaved draft: re-assert the Create entry and
// ask "Discard changes?" — only proceed back if they confirm (matches Android's
// unconditional back-confirm on the create screen).
let leaveConfirmed = false;   // set once the user chose Discard, so the re-fired popstate passes through
let askingLeave = false;      // a discard dialog is already open
window.addEventListener('popstate', async () => {
  const newRoute = hashToRoute();
  const wasCreate = state.route.split('?')[0] === '/create';
  const nowCreate = newRoute.split('?')[0] === '/create';
  if(wasCreate && !nowCreate && !leaveConfirmed){
    if(askingLeave) return;
    askingLeave = true;
    history.pushState({}, '', routeToHash(state.route));   // stay on Create while we ask
    const discard = await dialog({
      title:'Discard changes?',
      message:'Are you sure you want to leave? All data entered will be lost.',
      buttons:[{ label:'Cancel', value:false, class:'ghost' }, { label:'Discard', value:true }],
    });
    askingLeave = false;
    if(discard){ leaveConfirmed = true; history.back(); }
    return;
  }
  leaveConfirmed = false;
  state.route = newRoute;
  render();
  window.scrollTo(0,0);
});

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
    history.replaceState({}, '', routeToHash('/profile'));   // keep the URL/hash honest after the redirect
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
  const back = showBack ? `<button class="backhome" onclick="goBack()" aria-label="Back">${Icon.back}</button>` : '';
  app.innerHTML = back + `<div class="fade">${match.view.html(ctx)}</div>` + tabbar(match.key);
  if(match.view.mount) match.view.mount(ctx);
}

// First render of the full app: establish Home as the history base so back/chevron
// always have somewhere to return to, then render the initial route (from the hash,
// so a reload on a deep link restores that screen).
function startApp(){
  const initial = hashToRoute();
  state.route = initial;
  history.replaceState({}, '', routeToHash('/'));
  if(initial !== '/') history.pushState({}, '', routeToHash(initial));
  render();
}

// Device sync: apply changes from a connected peer and refresh the screen —
// but never repaint a screen the user is actively filling in (Create/Profile)
// or the full-screen PDF viewer, which would wipe their in-progress work.
function rerenderLive(){
  const path = state.route.split('?')[0];
  if(path==='/create' || path==='/profile' || path.startsWith('/view/')) return;
  render();
}
initSyncBridge(rerenderLive);

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
    // updateViaCache:'none' → the browser never serves sw.js from its HTTP cache, so a
    // new deploy's worker is detected on the very next load (not up to 10 min later).
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(()=>{});
  });
}

// Inkvoice is a phone app. Data lives only on the device (no cloud sync yet), so running
// it on a desktop/tablet would create a stranded, unsyncable copy. We therefore gate by
// device: the full app runs only when installed (standalone) AND on a phone-sized touch
// screen. Big screens get a "use your phone" notice; a phone browser gets the install page.
// `?app` forces the app in any browser, for previewing/screenshots.
const FORCE = new URLSearchParams(location.search).has('app');
// Manual override: if the user tapped "This is my phone" we always run as the host.
let FORCE_PHONE = localStorage.getItem('inkvoice_force_phone') === '1';
const STANDALONE = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
// Phone detection, belt and braces. A REAL PHONE MUST NEVER BOOT AS A GUEST —
// a guest phone can't host, so the laptop's code/Accept flow silently breaks.
//  1) UA: every Android/iPhone browser says so in its user agent. This works even
//     when the viewport heuristic fails (large phones, font scaling, etc.).
//  2) Viewport: coarse pointer + small CSS viewport (NOT screen.width — physical
//     px misclassified real phones).
// And the mirror rule: a NO-touch, non-mobile device can never be the phone — a
// stray "This is my phone" tap on a laptop is a mistake; drop the flag so the
// laptop heals back to its connect screen on the next load.
const UA_PHONE = /iPhone|iPod|Android[^)]*Mobile|Mobile[^)]*Android/i.test(navigator.userAgent);
const TOUCH = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
if (FORCE_PHONE && !TOUCH && !UA_PHONE) { localStorage.removeItem('inkvoice_force_phone'); FORCE_PHONE = false; }
const vmin = Math.min(window.innerWidth || 9999, window.innerHeight || 9999);
const IS_PHONE = UA_PHONE || (TOUCH && vmin <= 560);

const appEl = document.getElementById('app');
if(FORCE || FORCE_PHONE || (STANDALONE && IS_PHONE)){
  // Phone (the boss), INSTALLED → full offline app + can host a device connection.
  SyncUI.initSyncUI({ role:'phone' });
  startApp();
} else if(!IS_PHONE){
  // Desktop or laptop: not an independent copy — it connects to the phone over
  // the same Wi-Fi and mirrors it live. Show the connect screen; boot the full
  // app once paired, and return here if the link drops.
  SyncUI.initSyncUI({ role:'guest', bootApp:startApp, appEl });
  SyncUI.mountGuestStart(appEl);   // silent reconnect if we've paired before, else the code screen
} else {
  // Phone browser, NOT yet installed → show the Add-to-Home-Screen page so the
  // user installs it first and it runs fully offline. (Installing it makes it
  // standalone, which the branch above then boots as the phone/boss.)
  appEl.innerHTML = Landing.html();
}
