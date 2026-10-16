// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import { getProfile, getInvoices, requestPersistentStorage } from './store.js';
import { t, currentLang } from './i18n.js';
import { APP_VERSION } from './sync.js';   // version constant only (laptop sync is shelved)
import { toast, dialog } from './util.js';
import * as Home from './views/dashboard.js';
import * as Create from './views/create.js';
import * as List from './views/list.js';
import * as Profile from './views/profile.js';
import * as Cards from './views/cards.js';
import * as Landing from './views/landing.js';
// Laptop/device sync is SHELVED for the phone-only launch. sync.js / syncbridge.js / syncui.js
// stay in the repo — re-import and re-wire them (see the gating block below) to bring it back.

const state = { route:'/', key:'' };

// Create / Invoices / Quotations / Biz Card are locked until the profile has the
// essentials — matches the real Inkvoice: business OR owner name + a valid email.
// Profile stays open so the user can fill it in.
const GATED = new Set(['/create', '/invoices', '/quotations', '/cards']);
const isGatedPath = (path) => GATED.has(path);
export function isProfileValid(){
  const p = getProfile();
  const nameOk = (p.businessName||'').trim() || (p.ownerName||'').trim();
  const email = (p.email||'').trim();
  const emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return !!(nameOk && emailOk);
}
const PROFILE_MSG = 'Please fill profile data to create invoices/quotations';
// Tapping a locked tab: explain, don't navigate (like the Android snackbar).
window.tabBlocked = () => toast(t(PROFILE_MSG));
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
      title:t('Discard changes?'),
      message:t('Are you sure you want to leave? All data entered will be lost.'),
      buttons:[{ label:t('Cancel'), value:false, class:'ghost' }, { label:t('Discard'), value:true }],
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
      ${tab('profile','/profile',Icon.user,t('Profile'),false)}
      ${tab('create','/create',Icon.plusCircle,t('Create'),true)}
      ${tab('invoices','/invoices',Icon.list,t('Invoices'),true)}
      ${tab('cards','/cards',Icon.bizcard,t('Biz Card'),true)}
    </nav>`;
}

function render(){
  let { path, params } = parse(state.route);
  // Safety net: a gated route reached while the profile is incomplete → send to Profile.
  if(isGatedPath(path) && !isProfileValid()){
    toast(t(PROFILE_MSG));
    state.route = '/profile'; path = '/profile'; params = new URLSearchParams();
    history.replaceState({}, '', routeToHash('/profile'));   // keep the URL/hash honest after the redirect
  }
  const match = ROUTES.find(r => r.test(path)) || ROUTES[0];
  state.key = match.key;
  const ctx = { params, navigate, arg:match.arg, path };
  const app = document.getElementById('app');
  // iPhone has no OS back button — a small top-left chevron returns to Home.
  // The Home screen is excluded (nothing to go back to).
  const isHome = path==='/' || path==='';
  const showBack = !isHome;
  app.classList.toggle('with-back', showBack);
  const back = showBack ? `<button class="backhome" onclick="goBack()" aria-label="Back">${Icon.back}</button>` : '';
  // Match the real Inkvoice: HIDE the bottom bar on Create and Profile — they're focused,
  // full-screen forms you leave via the back chevron. (Create also confirms "Discard changes?"
  // on the way out, via the popstate guard above; Profile leaves without a prompt, like Android.)
  const showTabbar = !(path === '/create' || path === '/profile');
  app.classList.toggle('no-tabbar', !showTabbar);
  app.innerHTML = back + `<div class="fade">${match.view.html(ctx)}</div>` + (showTabbar ? tabbar(match.key) : '');
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

// NOTE: the service worker is registered by a plain inline script in index.html, NOT here.
// app.js sits at the head of a static import graph, so if any module fails to load this file
// never runs — and registering from here meant a single broken/missing file silently left the
// app with no offline cache. See the comment in index.html.

// Inkvoice is a phone/tablet app. All data lives only on the device (fully offline, no cloud,
// no cross-device sharing). The full app runs when it's been INSTALLED to the home screen
// (standalone display mode); a plain browser tab gets the install/welcome page instead.
// `?app` forces the app in any browser, for previewing/screenshots.
const FORCE = new URLSearchParams(location.search).has('app');
const STANDALONE = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

// Anonymous usage counter (server side: ping.php → stats.php). Only the INSTALLED app counts
// (`?app` previews never do). Sends, at most once a day per device:
//   "install" — the first time this device is counted (prev=1 if the app was already in use
//               before the counter existed, so old users aren't mistaken for new installs);
//   "open"    — once per calendar day, giving daily/weekly/monthly active devices.
// The payload is a RANDOM id generated here + platform, language and version. No IP is stored,
// no invoice data is ever sent. Flags are only written after the server confirms, so a device
// that is offline simply reports on its next online launch.
const T_ID = 'inkvoice_device_id', T_LOGGED = 'inkvoice_install_logged', T_LAST = 'inkvoice_last_open';
function trackUsage(){
  try{
    const REAL = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if(!REAL || !navigator.onLine) return;
    const d = new Date();
    const today = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const logged = !!localStorage.getItem(T_LOGGED);
    if(logged && localStorage.getItem(T_LAST) === today) return;   // already counted today
    let id = localStorage.getItem(T_ID);
    if(!id){
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
      localStorage.setItem(T_ID, id);
    }
    const ua = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios'
      : /Android/.test(ua) ? 'android' : 'other';
    // Already in use before the counter: the old one-time ping flag, or any saved document.
    const prev = !logged && (localStorage.getItem('inkvoice_install_pinged') || getInvoices().length > 0) ? 1 : 0;
    const body = JSON.stringify({ ev: logged ? 'open' : 'install', id, os, prev,
      lang: currentLang(), v: APP_VERSION });
    fetch('ping.php', { method:'POST', body, headers:{ 'Content-Type':'text/plain' }, keepalive:true, cache:'no-store' })
      .then(r => { if(r.ok){ localStorage.setItem(T_LOGGED, '1'); localStorage.setItem(T_LAST, today); } })
      .catch(()=>{});
  }catch{}
}
// An installed app can stay open in the background for days — count it again when it comes
// back to the foreground on a new day.
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') trackUsage(); });

const appEl = document.getElementById('app');
if(FORCE || STANDALONE){
  // Installed as a PWA (phone OR tablet) → the full offline app. Each install is its own
  // independent, on-device copy — devices never share data. We gate on "installed"
  // (standalone) rather than screen size so tablets work too. Ask the browser to keep our
  // storage persistent so the invoices aren't auto-evicted.
  requestPersistentStorage();
  trackUsage();
  startApp();
} else {
  // Opened in a normal browser tab (not installed) → the install / welcome page, which tells
  // the visitor to add Inkvoice to their phone or tablet home screen.
  appEl.innerHTML = Landing.html();
}
