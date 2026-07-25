// ===== Inkvoice — app shell, router, bottom tab bar =====
import { Icon } from './icons.js';
import { getProfile, requestPersistentStorage } from './store.js';
import { t } from './i18n.js';
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

// Inkvoice is a phone/tablet app. All data lives only on the device (fully offline, no cloud,
// no cross-device sharing). The full app runs when it's been INSTALLED to the home screen
// (standalone display mode); a plain browser tab gets the install/welcome page instead.
// `?app` forces the app in any browser, for previewing/screenshots.
const FORCE = new URLSearchParams(location.search).has('app');
const STANDALONE = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

// Anonymous install counter: the FIRST time the app runs after being installed (standalone),
// fire ONE tiny beacon to installed.txt, then remember we did (so it counts once per device,
// not per open). Nothing personal is sent — the server just logs a hit. Count lines containing
// "installed.txt" in the Hostinger access log = number of installs. `?app` previews (not
// standalone) never count. Best-effort: offline installs simply log on the first online open.
function pingInstallOnce(){
  try{
    const REAL = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if(!REAL || localStorage.getItem('inkvoice_install_pinged')) return;
    localStorage.setItem('inkvoice_install_pinged','1');
    fetch('installed.txt?ts=' + Date.now(), { cache:'no-store', keepalive:true }).catch(()=>{});
  }catch{}
}

const appEl = document.getElementById('app');
if(FORCE || STANDALONE){
  // Installed as a PWA (phone OR tablet) → the full offline app. Each install is its own
  // independent, on-device copy — devices never share data. We gate on "installed"
  // (standalone) rather than screen size so tablets work too. Ask the browser to keep our
  // storage persistent so the invoices aren't auto-evicted.
  requestPersistentStorage();
  pingInstallOnce();
  startApp();
} else {
  // Opened in a normal browser tab (not installed) → the install / welcome page, which tells
  // the visitor to add Inkvoice to their phone or tablet home screen.
  appEl.innerHTML = Landing.html();
}
