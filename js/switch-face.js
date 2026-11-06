// CosmoU – the Switch's own interface (css/switch.css). While the Switch (or your own console with the Switch's
// look) is the console on screen, CosmoU looks and works like a Switch: a Home with the last played games in one row
// and round buttons below, All Software, a page for each game, Quick Settings on the Home button, its own sounds and
// the Switch's buttons (A start, B back, + options, Y sort, L/R console). Nothing of the Wii U is there – no Wii U
// Look, no Plaza, no buddies. With the Wii U as well, the consoles in the top left (or L and R) change the whole
// window between the two. Every feature stays reachable: a game's page has what the details and the game menu have.
// Names start with nx… so they never meet the names of other scripts or theme files.

const NX_COL = {
  wiiu: '#1ea7dd',
  switch: '#e5484d',
  switch2: '#3a3f4b',
  wii: '#8e9aa6',
  gamecube: '#6b5bd2',
  '3ds': '#d23a52',
  ds: '#7d8a96',
  n64: '#2f9e5c',
  snes: '#7a66b8',
  nes: '#c0392b',
  gb: '#7c9a12',
  gba: '#5a4fcf',
  vb: '#c81d1d',
};
// the consoles as round "users" in the top left: a short name in each
const NX_ABBR = { wiiu: 'Wii U', switch: 'Switch', switch2: 'Switch 2', wii: 'Wii', gamecube: 'GC', '3ds': '3DS', ds: 'DS', n64: '64', snes: 'SNES', nes: 'NES', gb: 'GB', gba: 'GBA', vb: 'VB' };
const nxS = (d, f) =>
  f
    ? `<svg viewBox="0 0 24 24" fill="currentColor">${d}</svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const NX_IC = {
  all: nxS('<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>', 1),
  log: nxS('<rect x="4" y="12" width="4" height="8" rx="1.2"/><rect x="10" y="7" width="4" height="13" rx="1.2"/><rect x="16" y="3.5" width="4" height="16.5" rx="1.2"/>', 1),
  themes: nxS(
    '<path d="M12 2.5c-5.5 0-9.5 4-9.5 8.9 0 4.5 3.6 7.8 7.7 7.8 1.4 0 2-.8 2-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.8 2-1.8h2.5c3.4 0 5.8-2.2 5.8-5 0-3.4-4.2-5.6-9.5-5.6Zm-5 9.6a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm3-4.3a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm5 .1a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z"/>',
    1,
  ),
  pads: nxS('<path d="M7.5 6h9A5.5 5.5 0 0 1 22 11.5v1a5.5 5.5 0 0 1-9.6 3.7h-.8A5.5 5.5 0 0 1 2 12.5v-1A5.5 5.5 0 0 1 7.5 6Z"/><path d="M7 10v4M5 12h4"/><circle cx="16.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="18" cy="13" r=".6" fill="currentColor"/>'),
  consoles: nxS('<rect x="2.5" y="5" width="12" height="9" rx="1.6"/><rect x="9.5" y="10" width="12" height="9" rx="1.6"/>'),
  set: nxS(
    '<path d="M10.4 2h3.2l.5 2.6 2 .9 2.2-1.5 2.3 2.3-1.5 2.2.9 2 2.6.5v3.2l-2.6.5-.9 2 1.5 2.2-2.3 2.3-2.2-1.5-2 .9-.5 2.6h-3.2l-.5-2.6-2-.9-2.2 1.5-2.3-2.3 1.5-2.2-.9-2L2 13.6v-3.2l2.6-.5.9-2L4 5.7 6.3 3.4l2.2 1.5 2-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',
    1,
  ),
  power: nxS('<path d="M7.2 6.3a8 8 0 1 0 9.6 0"/><path d="M12 3v8"/>'),
  play: nxS('<path d="M7 4.5v15l12.5-7.5z"/>', 1),
  info: nxS('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor"/>'),
  star: nxS('<path d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.1 6-.8z"/>'),
  mark: nxS('<path d="M3.5 4.9A1.4 1.4 0 0 1 4.9 3.5H12l8.5 8.5-8.5 8.5-8.5-8.5z"/><circle cx="8.2" cy="8.2" r="1.5" fill="currentColor"/>'),
  folder: nxS('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  copy: nxS('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  edit: nxS('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  sort: nxS('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  search: nxS('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  music: nxS('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  sound: nxS('<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>'),
  tv: nxS('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'),
  moon: nxS('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>'),
  keys: nxS('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  chat: nxS('<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 5 12.5z"/>'),
  bug: nxS('<path d="M8 9a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0z"/><path d="M3 13h5M16 13h5M4 7l4 2M20 7l-4 2M4 19l4-2M20 19l-4-2"/>'),
  every: nxS('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M15 17h4M17 15v4"/>'),
  wiiu: nxS('<rect x="2" y="6" width="20" height="12" rx="4"/><rect x="7.5" y="8.5" width="9" height="7" rx="1"/>'),
};
// the round buttons on Home
const NX_APPS = [
  ['all', 'All Software', '#e5484d', () => nxShow('all')],
  ['log', 'Play Activity', '#3fae5a', () => typeof openLog === 'function' && openLog()],
  ['themes', 'Themes', '#f29a3c', () => nxThemesPop()],
  ['pads', 'Controllers', '#3c8cf0', () => openSettings('controls')],
  ['consoles', 'Consoles', '#1fb6d6', () => nxConsolesPop()],
  ['set', 'System Settings', '#8a8f98', () => openSettings()],
  ['power', 'Power', '#8a8f98', () => nxPowerPop()],
];
const nx = {
  on: false,
  el: null,
  scr: 'home',
  back: 'home',
  zone: 'row',
  i: 0,
  a: 0,
  u: 0,
  ai: 0,
  gi: 0,
  game: null,
  sort: 'recent',
  q: '',
  pop: null,
  popI: 0,
  qs: false,
  qi: 0,
  sig: '',
  clock: 0,
  batt: null,
  l3: 0,
  l3Done: false,
  // the games are known (the first time CosmoU chose its console after loading them)
  ready: false,
};
const nxLs = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem('cosmou.' + k);
    localStorage.setItem('cosmou.' + k, v);
  } catch {}
  return null;
};
nx.sort = ['recent', 'most', 'az', 'fav'].includes(nxLs('nxSort')) ? nxLs('nxSort') : 'recent';

// ---------- when it is on ----------
// the console on screen has the Switch's look (the Switch, or your own console that looks like one) – and not
// "every console together", and not switched off in Settings → Appearance
const nxLookOf = k => (typeof SYS === 'object' && SYS[k] ? SYS[k].look || k : '');
const nxWanted = () => !everySys && nxLs('nxFace') !== '0' && nxLookOf(curSys) === 'switch';
function nxApply() {
  const want = nxWanted();
  if (want !== nx.on) {
    nx.on = want;
    document.body.classList.toggle('face-nx', want);
    if (want) nxEnter();
    else nxLeave();
  }
  if (nx.on) nxRender();
}
function nxEnter() {
  if (!nx.el) nxBuild();
  nx.el.hidden = false;
  nx.scr = 'home';
  nx.zone = 'row';
  nx.sig = '';
  nx.i = 0;
  nxTheme();
  // the squares slide in once (when they are there: at the start of CosmoU after the games are loaded)
  nx.bootPending = true;
  nxStatus();
  clearInterval(nx.clock);
  nx.clock = setInterval(nxStatus, 10000);
  if (typeof hoverOff === 'function') hoverOff();
}
function nxLeave() {
  if (!nx.el) return;
  nx.el.hidden = true;
  clearInterval(nx.clock);
  nxPopClose(true);
  nxQsClose(true);
  document.body.classList.remove('nx-black');
}
// Basic White or Basic Black (or the one that follows light and dark)
function nxTheme() {
  if (!nx.el) return;
  const t = nxLs('nxTheme') || 'auto',
    black = t === 'black' || (t === 'auto' && document.documentElement.classList.contains('dark'));
  nx.el.classList.toggle('black', black);
  document.body.classList.toggle('nx-black', nx.on && black);
}
new MutationObserver(() => nx.on && nxTheme()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// ---------- the games ----------
const nxGamesRaw = () =>
  games.filter(g => (g.kind === 'app' ? !g.appSys || g.appSys === 'all' || g.appSys === curSys : sysOf(g) === curSys));
// with folders (js/folders.js): the folders of this console instead of the games in them – or the open folder's games
const nxGames = () => (typeof fdView === 'function' ? fdView(nxGamesRaw()) : nxGamesRaw());
const nxFd = l => (typeof fdFirst === 'function' ? fdFirst(l) : l);
// Home: the last played first (like the Switch), the others after them A–Z (folders first)
const nxHomeList = () =>
  nxFd(
    nxGames()
      .slice()
      .sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name)),
  );
const nxSec = g => (typeof secOf === 'function' ? secOf(g.name) : 0);
const NX_SORT = { recent: 'Recently played', most: 'Most played', az: 'Title', fav: 'Favorites first' };
const nxAllList = () => nxFd(nxAllList0());
function nxAllList0() {
  const q = nx.q.trim().toLowerCase();
  // (a search looks through every game, also the ones in folders)
  let l = (q ? nxGamesRaw() : nxGames()).filter(g => !q || g.name.toLowerCase().includes(q) || (g.tid && String(g.tid).toLowerCase().includes(q)));
  const az = (a, b) => a.name.localeCompare(b.name);
  if (nx.sort === 'az') return l.sort(az);
  if (nx.sort === 'most') return l.sort((a, b) => nxSec(b) - nxSec(a) || (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
  if (nx.sort === 'fav') return l.sort((a, b) => favs.has(b.name) - favs.has(a.name) || (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
  return l.sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
}
// the game the frame is on (CosmoU's own "chosen game" follows it, so F, K and the rest work on it)
function nxPick(g) {
  if (g && sel !== g.name) sel = g.name;
}

// ---------- building the window ----------
function nxBuild() {
  const el = document.createElement('div');
  el.id = 'nx';
  el.hidden = true;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', 'Switch');
  el.innerHTML = `
    <div class="nx-top">
      <div class="nx-users" id="nxusers"></div>
      <div class="nx-stat"><span id="nxclock"></span><span id="nxwifi"></span><span class="nx-batt" id="nxbatt" hidden><small></small><i></i></span></div>
    </div>
    <section class="nx-scr nx-home" id="nxhome">
      <div class="nx-row" id="nxrow"></div>
      <div class="nx-apps" id="nxapps"></div>
    </section>
    <section class="nx-scr nx-all" id="nxall" hidden>
      <header class="nx-hd"><span class="nx-hic">${NX_IC.all}</span><h1>All Software</h1><span class="nx-sp"></span>
        <label class="nx-q">${NX_IC.search}<input id="nxq" placeholder="Search" aria-label="Search games" autocomplete="off" spellcheck="false" /></label>
        <span class="nx-sortl" id="nxsortl"></span></header>
      <div class="nx-grid" id="nxgrid"></div>
    </section>
    <section class="nx-scr nx-game" id="nxgame" hidden>
      <header class="nx-hd"><span class="nx-hic" id="nxgic"></span><h1 id="nxgt"></h1></header>
      <div class="nx-gbody"><div class="nx-gnav" id="nxgnav" role="group" aria-label="Options"></div><div class="nx-gpane" id="nxgpane"></div></div>
    </section>
    <footer class="nx-bot"><div class="nx-pads" id="nxpads"></div><div class="nx-hints" id="nxhints"></div></footer>
    <div class="nx-pop" id="nxpop" hidden><div class="nx-box" role="menu"></div></div>
    <div class="nx-qs" id="nxqs" hidden><div class="nx-panel" role="dialog" aria-label="Quick Settings"><div class="nx-qhd"><b id="nxqt"></b><small id="nxqd"></small></div><div class="nx-qlist" id="nxqlist"></div></div></div>`;
  document.body.insertBefore(el, $('#notes') || null);
  nx.el = el;
  // the round buttons
  const apps = $('#nxapps');
  NX_APPS.forEach(([id, label, col, fn], k) => {
    const b = document.createElement('button');
    b.className = 'nx-a';
    b.dataset.a = id;
    b.setAttribute('aria-label', label);
    b.style.setProperty('--ac', col);
    b.innerHTML = NX_IC[id] + '<span class="nx-tip"></span>';
    b.querySelector('.nx-tip').textContent = label;
    b.onclick = () => {
      nx.zone = 'apps';
      nx.a = k;
      nxSelUi();
      nxPress(b);
      nxSnd('open');
      fn();
    };
    apps.append(b);
  });
  // the search in All Software
  const q = $('#nxq');
  q.addEventListener('input', () => {
    nx.q = q.value;
    nx.ai = 0;
    nxDrawAll();
  });
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && q.value) {
        q.value = '';
        nx.q = '';
        nxDrawAll();
      } else q.blur();
    }
  });
  // the backgrounds of the small lists and of Quick Settings close them
  $('#nxpop').addEventListener('click', e => e.target.id === 'nxpop' && nxPopClose());
  $('#nxqs').addEventListener('click', e => e.target.id === 'nxqs' && nxQsClose());
  // the mouse wheel moves along the row
  $('#nxrow').addEventListener(
    'wheel',
    e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        $('#nxrow').scrollLeft += e.deltaY;
      }
    },
    { passive: false },
  );
  // Tab (and anything else that moves the focus) moves the frame too – but a click selects by itself
  el.addEventListener('pointerdown', () => {
    nx.ptr = true;
    setTimeout(() => (nx.ptr = false), 400);
  }, true);
  el.addEventListener('focusin', e => {
    const t = e.target;
    if (nx.ptr || !t || !t.closest) return;
    const at = (box, x) => [...box.children].indexOf(x);
    if (t.matches('#nxrow > .nx-t')) Object.assign(nx, { zone: 'row', i: at($('#nxrow'), t) });
    else if (t.matches('#nxapps > .nx-a')) Object.assign(nx, { zone: 'apps', a: at($('#nxapps'), t) });
    else if (t.matches('#nxusers > .nx-user')) Object.assign(nx, { zone: 'top', u: at($('#nxusers'), t) });
    else if (t.matches('#nxgrid .nx-t')) Object.assign(nx, { zone: 'grid', ai: at($('#nxgrid'), t.parentElement) });
    else if (t.matches('#nxgnav > .nx-gi')) {
      nx.gi = at($('#nxgnav'), t);
      nxGamePane();
    } else return;
    nxSelUi();
  });
  // the Switch's own corner of Appearance in Settings
  nxSettingsRows();
}

// ---------- drawing ----------
function nxRender() {
  if (!nx.el) return;
  for (const [id, s] of [
    ['#nxhome', 'home'],
    ['#nxall', 'all'],
    ['#nxgame', 'game'],
  ])
    $(id).hidden = nx.scr !== s;
  nxUsers();
  if (nx.scr === 'home') nxDrawHome();
  else if (nx.scr === 'all') nxDrawAll();
  else if (nx.scr === 'game') nxDrawGame();
  nxHints();
  nxPads();
}
// the other consoles you have, like the users of a Switch: a circle each with its short name and, under it, its name.
// The console on screen has no circle – you are on it already (Eduard)
function nxUsers() {
  const box = $('#nxusers'),
    av = sysAvail().filter(k => k !== curSys),
    key = av.map(k => k + ':' + (SYS[k] ? SYS[k].name + (SYS[k].col || '') : '')).join() + '|' + curSys;
  if (box.dataset.k !== key) {
    box.dataset.k = key;
    // up to eight, like the users of a Switch; with more consoles the last circle lists the rest
    let shown = av;
    if (av.length > 8) shown = av.slice(0, 7);
    const kids = shown.map(k => {
      const b = document.createElement('button'),
        ab = NX_ABBR[k] || (SYS[k] ? SYS[k].name : k).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
      b.className = 'nx-user' + (ab.length > 6 ? ' long' : '');
      b.dataset.s = k;
      b.style.setProperty('--c', (SYS[k] && SYS[k].col) || NX_COL[k] || NX_COL[nxLookOf(k)] || '#8a8f98');
      b.textContent = ab;
      const tip = document.createElement('span');
      tip.className = 'nx-tip';
      tip.textContent = SYS[k] ? SYS[k].name : k;
      b.append(tip);
      b.title = tip.textContent;
      b.onclick = () => {
        nx.zone = 'top';
        nx.u = [...box.children].indexOf(b);
        nxUserGo(k);
      };
      return b;
    });
    if (av.length > shown.length) {
      const m = document.createElement('button');
      m.className = 'nx-user nx-more';
      m.dataset.s = 'more';
      m.style.setProperty('--c', '#8a8f98');
      m.textContent = '+' + (av.length - shown.length);
      const tip = document.createElement('span');
      tip.className = 'nx-tip';
      tip.textContent = 'Every console';
      m.append(tip);
      m.title = 'Every console';
      m.onclick = () => {
        nx.zone = 'top';
        nx.u = [...box.children].indexOf(m);
        nxSnd('open');
        nxConsolesPop();
      };
      kids.push(m);
    }
    box.replaceChildren(...kids);
  }
  nxSelUi();
}
// where Up from the games lands: the first console (the one on screen has no circle)
const nxHere = () => 0;
function nxUserGo(k) {
  if (k === curSys) return nxSnd('bump');
  nxSnd('page');
  setSystem(k);
}
// a square for a game (Home and All Software)
function nxTile(g, k) {
  const t = document.createElement('button');
  t.className = 'nx-t';
  t.dataset.g = g.name;
  t.style.setProperty('--i', k);
  t.setAttribute('aria-label', g.name);
  const a = document.createElement('div');
  a.className = 'nx-art';
  paint(a, g);
  const n = document.createElement('em');
  n.textContent = g.name;
  t.append(a, n);
  // a favorite wears a star in its corner (Eduard)
  if (favs.has(g.name)) {
    const f = document.createElement('i');
    f.className = 'nx-fav';
    f.textContent = '★';
    f.setAttribute('aria-label', 'Favorite');
    t.append(f);
  }
  return t;
}
function nxDrawHome() {
  // (until the games are loaded: only the bars, no "no games" square)
  if (!nx.ready) {
    $('#nxrow').replaceChildren();
    nx.sig = '';
    return;
  }
  const l = nxHomeList(),
    row = $('#nxrow'),
    shown = l.slice(0, 12),
    many = l.length > 12,
    sig = shown.map(g => g.name + (g.cover || '') + (favs.has(g.name) ? '★' : '') + (g.kind === 'folder' ? g.format + g.col : '')).join('|') + '|' + l.length;
  if (sig !== nx.sig) {
    nx.sig = sig;
    row.replaceChildren();
    if (!l.length) {
      const e = document.createElement('button');
      e.className = 'nx-t nx-empty';
      e.innerHTML = '<div class="nx-art"></div>';
      // your own console (apps only): its first app; the Switch: its games folder and emulator
      const own = SYS[curSys] && SYS[curSys].own && window.api && api.appSave;
      e.querySelector('.nx-art').textContent = own
        ? 'No apps on ' + SYS[curSys].name + ' yet. Choose this square to add one.'
        : 'No Switch games yet. Choose the games folder and the emulator in System Settings.';
      e.onclick = () => (own ? openApp(null) : openSettings('general'));
      row.append(e);
    }
    shown.forEach((g, k) => {
      const t = nxTile(g, k);
      t.onclick = () => {
        nx.zone = 'row';
        if (nx.i === k) return nxStart(g, t);
        nx.i = k;
        nxPick(g);
        nxSnd('move');
        nxSelUi(true);
      };
      t.ondblclick = () => nxStart(g, t);
      row.append(t);
    });
    // more than twelve: the last square opens All Software
    if (many) {
      const t = document.createElement('button');
      t.className = 'nx-t nx-allt';
      t.style.setProperty('--i', shown.length);
      t.innerHTML = `<div class="nx-art">${NX_IC.all}<small></small></div><em>All Software</em>`;
      t.querySelector('small').textContent = l.length + ' games';
      t.onclick = () => {
        nx.zone = 'row';
        if (nx.i === shown.length) return nxShow('all');
        nx.i = shown.length;
        nxSnd('move');
        nxSelUi(true);
      };
      row.append(t);
    }
    if (typeof markDeco === 'function') markDeco();
    if (nx.bootPending && l.length) {
      nx.bootPending = false;
      nx.el.classList.add('boot');
      setTimeout(() => nx.el && nx.el.classList.remove('boot'), 1000);
    }
    // CosmoU's chosen game is on Home: the frame starts there
    const at = shown.findIndex(g => g.name === sel);
    if (at >= 0 && nx.zone === 'row') nx.i = at;
  }
  nx.i = Math.max(0, Math.min(nx.i, row.children.length - 1));
  nxSelUi(true);
}
function nxDrawAll() {
  const grid = $('#nxgrid'),
    l = nxAllList();
  $('#nxsortl').textContent = (nx.q ? l.length + ' found · ' : '') + 'Sorted by ' + NX_SORT[nx.sort].toLowerCase();
  const sig = 'all|' + l.map(g => g.name + (favs.has(g.name) ? '★' : '') + (g.kind === 'folder' ? g.format + g.col : '')).join('|');
  if (grid.dataset.sig !== sig) {
    grid.dataset.sig = sig;
    grid.replaceChildren();
    if (!l.length) {
      const p = document.createElement('p');
      p.className = 'nx-none';
      p.textContent = nx.q ? 'Nothing found for “' + nx.q + '”.' : 'No games yet.';
      grid.append(p);
    }
    l.forEach((g, k) => {
      const c = document.createElement('div'),
        t = nxTile(g, k),
        b = document.createElement('b');
      c.className = 'nx-cell';
      b.textContent = g.name;
      c.append(t, b);
      t.onclick = () => {
        if (nx.ai === k) return nxStart(g, t);
        nx.ai = k;
        nxPick(g);
        nxSnd('move');
        nxSelUi(true);
      };
      t.ondblclick = () => nxStart(g, t);
      grid.append(c);
    });
    if (typeof markDeco === 'function') markDeco();
  }
  nx.ai = Math.max(0, Math.min(nx.ai, l.length - 1));
  nxSelUi(true);
}
// the frame: on the chosen square, round button, console or option
function nxSelUi(scroll) {
  if (!nx.el) return;
  for (const e of nx.el.querySelectorAll('.nx-sel')) e.classList.remove('nx-sel');
  for (const e of nx.el.querySelectorAll('.nx-cell.on')) e.classList.remove('on');
  let el = null;
  if (nx.qs) el = $('#nxqlist').children[nx.qi];
  else if (nx.pop) el = $('#nxpop .nx-box').querySelectorAll('.nx-gi')[nx.popI];
  else if (nx.scr === 'home') {
    if (nx.zone === 'apps') el = $('#nxapps').children[nx.a];
    else if (nx.zone === 'top') el = $('#nxusers').children[nx.u];
    else el = $('#nxrow').children[nx.i];
  } else if (nx.scr === 'all') {
    if (nx.zone === 'top') el = $('#nxusers').children[nx.u];
    else {
      const c = $('#nxgrid').children[nx.ai];
      if (c && c.classList.contains('nx-cell')) {
        c.classList.add('on');
        el = c.querySelector('.nx-t');
      }
    }
  } else if (nx.scr === 'game') el = $('#nxgnav').children[nx.gi];
  if (el) {
    el.classList.add('nx-sel');
    if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // the keyboard focus follows the frame (screen readers read what is chosen) – not while typing a search
    const f = document.activeElement;
    if (nx.on && f !== el && el.focus && !nx.ptr && !(f && f.id === 'nxq') && !document.querySelector('dialog[open]')) el.focus({ preventScroll: true });
    if (el.dataset.g) nxPick(gameOf(el.dataset.g));
  }
  nxHints();
}

// ---------- the bottom bar ----------
const NX_HINT_KEYS = { a: 'A', b: 'B', x: 'X', y: 'Y', plus: '+', minus: '−', home: '⌂', lr: 'L R' };
function nxHints() {
  const h = [];
  if (nx.qs) h.push(['b', 'Close'], ['a', 'OK']);
  else if (nx.pop) h.push(['b', 'Back'], ['a', 'OK']);
  else if (nx.scr === 'home') {
    if (nx.zone === 'row' && $('#nxrow .nx-t.nx-sel[data-g]')) h.push(['plus', 'Options'], ['a', 'Start']);
    // (not "Switch": the word is a console's name here – Eduard)
    else if (nx.zone === 'top') h.push(['b', 'Back'], ['a', 'Go there']);
    else h.push(['a', 'OK']);
  } else if (nx.scr === 'all') h.push(['y', 'Sort'], ['b', 'Back'], ['plus', 'Options'], ['a', 'Start']);
  else if (nx.scr === 'game') h.push(['b', 'Back'], ['a', 'OK']);
  const box = $('#nxhints'),
    key = JSON.stringify(h);
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  box.replaceChildren(
    ...h.map(([k, t]) => {
      const b = document.createElement('button');
      b.className = 'nx-hint';
      b.innerHTML = '<i></i><span></span>';
      b.querySelector('i').textContent = NX_HINT_KEYS[k];
      b.querySelector('span').textContent = t;
      b.onclick = () => ({ a: nxA, b: nxB, plus: nxPlus, y: nxY })[k]();
      return b;
    }),
  );
}
function nxPads() {
  const n = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length,
    box = $('#nxpads');
  if (box.dataset.n === String(n)) return;
  box.dataset.n = String(n);
  box.replaceChildren();
  if (!n) {
    box.innerHTML = NX_IC.keys + '<small>Keyboard</small>';
    return;
  }
  for (let k = 0; k < Math.min(4, n); k++) box.insertAdjacentHTML('beforeend', NX_IC.pads);
}
addEventListener('gamepadconnected', () => nx.on && nxPads());
addEventListener('gamepaddisconnected', () => nx.on && nxPads());
// time, connection and battery
function nxStatus() {
  if (!nx.el) return;
  const now = new Date();
  $('#nxclock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('#nxwifi').innerHTML = nxS(
    '<path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.5 12.3a9.5 9.5 0 0 1 13 0" /><path d="M8.6 15.6a5 5 0 0 1 6.8 0" /><circle cx="12" cy="19" r="1.3" fill="currentColor" />',
  );
  $('#nxwifi').classList.toggle('off', !navigator.onLine);
  $('#nxwifi').title = navigator.onLine ? 'Online' : 'Offline';
  if (!nx.batt && navigator.getBattery)
    navigator
      .getBattery()
      .then(b => {
        nx.batt = b;
        b.addEventListener('levelchange', nxStatus);
        b.addEventListener('chargingchange', nxStatus);
        nxStatus();
      })
      .catch(() => {});
  const b = nx.batt,
    el = $('#nxbatt');
  // a computer without a battery shows none
  el.hidden = !b || (b.charging && b.level >= 1 && !isFinite(b.dischargingTime) && !isFinite(b.chargingTime)) || (b.level >= 1 && b.charging && b.chargingTime === 0);
  if (b && !el.hidden) {
    el.querySelector('small').textContent = Math.round(b.level * 100) + '%';
    el.querySelector('i').style.setProperty('--lv', Math.max(8, Math.round(b.level * 100)) + '%');
    el.classList.toggle('low', b.level < 0.15 && !b.charging);
  }
}

// ---------- moving ----------
function nxMove(d) {
  if (nx.qs) return nxQsMove(d);
  if (nx.pop) return nxPopMove(d);
  const was = JSON.stringify([nx.zone, nx.i, nx.a, nx.u, nx.ai, nx.gi]);
  if (nx.scr === 'home') {
    const nRow = $('#nxrow').children.length,
      nUsers = $('#nxusers').children.length;
    if (nx.zone === 'row') {
      if (d === 'l') nx.i = Math.max(0, nx.i - 1);
      else if (d === 'r') nx.i = Math.min(nRow - 1, nx.i + 1);
      else if (d === 'd') nx.zone = 'apps';
      else if (d === 'u' && nUsers) {
        nx.zone = 'top';
        nx.u = nxHere();
      }
    } else if (nx.zone === 'apps') {
      if (d === 'l') nx.a = Math.max(0, nx.a - 1);
      else if (d === 'r') nx.a = Math.min(NX_APPS.length - 1, nx.a + 1);
      else if (d === 'u') nx.zone = 'row';
    } else if (nx.zone === 'top') {
      if (d === 'l') nx.u = Math.max(0, nx.u - 1);
      else if (d === 'r') nx.u = Math.min(nUsers - 1, nx.u + 1);
      else if (d === 'd') nx.zone = 'row';
    }
  } else if (nx.scr === 'all') {
    const n = $('#nxgrid').querySelectorAll('.nx-cell').length,
      cols = Math.max(1, getComputedStyle($('#nxgrid')).gridTemplateColumns.split(' ').length);
    if (nx.zone === 'top') {
      if (d === 'l') nx.u = Math.max(0, nx.u - 1);
      else if (d === 'r') nx.u = Math.min($('#nxusers').children.length - 1, nx.u + 1);
      else if (d === 'd') nx.zone = 'grid';
    } else if (d === 'l') nx.ai = Math.max(0, nx.ai - 1);
    else if (d === 'r') nx.ai = Math.min(n - 1, nx.ai + 1);
    else if (d === 'd') nx.ai = Math.min(n - 1, nx.ai + cols);
    else if (d === 'u') {
      if (nx.ai - cols >= 0) nx.ai -= cols;
      else if ($('#nxusers').children.length) {
        nx.zone = 'top';
        nx.u = nxHere();
      }
    }
  } else if (nx.scr === 'game') {
    const n = $('#nxgnav').children.length;
    if (d === 'u') nx.gi = Math.max(0, nx.gi - 1);
    else if (d === 'd') nx.gi = Math.min(n - 1, nx.gi + 1);
    if (d === 'u' || d === 'd') nxGamePane();
  }
  const now = JSON.stringify([nx.zone, nx.i, nx.a, nx.u, nx.ai, nx.gi]);
  // at the end of a row the Switch bumps: a short low sound instead of the click
  nxSnd(now === was ? 'bump' : 'move');
  nxSelUi(true);
}
function nxShow(scr) {
  if (scr === nx.scr) return;
  if (scr === 'all') {
    nx.back = nx.scr;
    nx.zone = 'grid';
    const l = nxAllList(),
      at = l.findIndex(g => g.name === sel);
    nx.ai = Math.max(0, at);
  } else if (scr === 'home') nx.zone = 'row';
  nx.scr = scr;
  nxSnd('page');
  nxRender();
}

// ---------- the buttons ----------
function nxA() {
  if (nx.qs) return nxQsPress();
  if (nx.pop) return nxPopPress();
  if (nx.scr === 'home') {
    if (nx.zone === 'apps') return $('#nxapps').children[nx.a].click();
    if (nx.zone === 'top') {
      const u = $('#nxusers').children[nx.u];
      return u && u.click();
    }
    const t = $('#nxrow').children[nx.i];
    if (!t) return;
    if (t.classList.contains('nx-allt')) return nxShow('all');
    if (t.classList.contains('nx-empty')) return t.click();
    const g = gameOf(t.dataset.g);
    if (g) nxStart(g, t);
  } else if (nx.scr === 'all') {
    if (nx.zone === 'top') {
      const u = $('#nxusers').children[nx.u];
      return u && u.click();
    }
    const c = $('#nxgrid').children[nx.ai],
      t = c && c.querySelector('.nx-t'),
      g = t && gameOf(t.dataset.g);
    if (g) nxStart(g, t);
  } else if (nx.scr === 'game') {
    const b = $('#nxgnav').children[nx.gi];
    if (b) b.click();
  }
}
function nxB() {
  if (nx.qs) return nxQsClose();
  if (nx.pop) return nxPopClose();
  if (nx.scr === 'game') {
    nx.scr = nx.back === 'all' ? 'all' : 'home';
    nxSnd('back');
    return nxRender();
  }
  // in a folder: B leaves it first
  if (typeof fdOpen !== 'undefined' && fdOpen && nx.zone !== 'top' && nx.zone !== 'apps') return fdLeave();
  if (nx.scr === 'all') {
    nx.scr = 'home';
    nx.zone = 'row';
    nxSnd('back');
    // the game chosen in All Software is on Home too when it is one of the twelve
    const at = nxHomeList()
      .slice(0, 12)
      .findIndex(g => g.name === sel);
    if (at >= 0) nx.i = at;
    return nxRender();
  }
  // on Home: back to the games
  if (nx.zone !== 'row') {
    nx.zone = 'row';
    nxSnd('back');
    return nxSelUi(true);
  }
  nxSnd('bump');
}
// + (Options): the chosen game's page
function nxPlus() {
  if (nx.qs || nx.pop) return;
  const g = nxChosen();
  if (g) nxOpenGame(g);
  else nxSnd('bump');
}
// Y: sort (All Software), on Home it opens All Software
function nxY() {
  if (nx.qs || nx.pop) return;
  if (nx.scr === 'all') nxSortPop();
  else if (nx.scr === 'home') nxShow('all');
}
const nxChosen = () => {
  if (nx.scr === 'home' && nx.zone === 'row') {
    const t = $('#nxrow').children[nx.i];
    return t && t.dataset.g ? gameOf(t.dataset.g) : null;
  }
  if (nx.scr === 'all' && nx.zone !== 'top') {
    const c = $('#nxgrid').children[nx.ai],
      t = c && c.querySelector('.nx-t');
    return t ? gameOf(t.dataset.g) : null;
  }
  if (nx.scr === 'game') return nx.game;
  return null;
};
function nxPress(el) {
  if (!el) return;
  el.classList.add('press');
  setTimeout(() => el.classList.remove('press'), 140);
}
// starting a game: the square gives a little, the screen goes dark (css: #launch), the game starts
function nxStart(g, el) {
  nxPick(g);
  nxPress(el);
  launch(g);
}

// ---------- a game's page: everything for this game, the Switch way ----------
function nxOpenGame(g) {
  if (!g) return;
  // a folder: its own small window (js/folders.js)
  if (/^folder/.test(g.kind || '')) return openDetail(g);
  nxPick(g);
  if (nx.scr !== 'game') nx.back = nx.scr;
  nx.game = g;
  nx.gi = 0;
  nx.scr = 'game';
  nxSnd('open');
  nxRender();
}
function nxGameItems(g) {
  const app = g.kind === 'app',
    fav = favs.has(g.name),
    m = typeof markOf === 'function' ? markOf(g.name) : null;
  return [
    { id: 'start', icon: 'play', label: 'Start', run: () => nxStart(g, $('#nxgpane .nx-art')) },
    { id: 'info', icon: 'info', label: 'Information', run: () => nxSnd('bump') },
    { id: 'fav', icon: 'star', label: fav ? 'Remove from favorites' : 'Add to favorites', run: () => (toggleFav(g), nxSnd(fav ? 'off' : 'on')) },
    typeof markWheel === 'function' && { id: 'mark', icon: 'mark', label: m ? 'Mark: ' + m.label : 'Mark with a colour', run: () => markWheel(g) },
    app && window.api && { id: 'edit', icon: 'edit', label: 'Edit app', run: () => openApp(g) },
    typeof fdMoveMenu === 'function' && { id: 'group', icon: 'all', label: fdNameOf(g) ? 'Folder: ' + fdNameOf(g) : 'Put in a folder', run: () => fdMoveMenu(g) },
    g.path && !IS_MOBILE && window.api && { id: 'folder', icon: 'folder', label: 'Show in folder', run: () => api.showInFolder(g.path) },
    {
      id: 'copy',
      icon: 'copy',
      label: 'Copy name',
      run: () => {
        try {
          navigator.clipboard.writeText(g.name);
          toast('✓ Copied “' + g.name + '”', 2200);
        } catch {}
      },
    },
  ].filter(Boolean);
}
function nxDrawGame() {
  const g = nx.game && gameOf(nx.game.name);
  if (!g) {
    nx.scr = 'home';
    return nxRender();
  }
  nx.game = g;
  const ic = $('#nxgic');
  paint(ic, g, false);
  $('#nxgt').textContent = g.name;
  const nav = $('#nxgnav'),
    items = nxGameItems(g);
  nav.replaceChildren(
    ...items.map((it, k) => {
      const b = document.createElement('button');
      b.className = 'nx-gi' + (k === nx.gi ? ' on' : '');
      b.dataset.id = it.id;
      b.innerHTML = NX_IC[it.icon] + '<span></span>';
      b.querySelector('span').textContent = it.label;
      b.onclick = () => {
        nx.gi = k;
        nxSelUi();
        nxGamePane();
        if (it.id !== 'info') nxSnd('open');
        it.run();
      };
      b.onpointerenter = () => {
        if (nx.gi === k) return;
        nx.gi = k;
        nxSelUi();
        nxGamePane();
      };
      return b;
    }),
  );
  nx.gi = Math.min(nx.gi, items.length - 1);
  nxGamePane();
  nxSelUi();
}
// the right side: the game, big, and what the chosen option does
function nxGamePane() {
  const g = nx.game,
    pane = $('#nxgpane');
  if (!g) return;
  const items = nxGameItems(g),
    it = items[nx.gi] || items[0];
  [...$('#nxgnav').children].forEach((b, k) => b.classList.toggle('on', k === nx.gi));
  pane.replaceChildren();
  const hero = document.createElement('div');
  hero.className = 'nx-hero';
  const a = document.createElement('div');
  a.className = 'nx-art';
  paint(a, g);
  const t = document.createElement('div'),
    h = document.createElement('h2'),
    s = document.createElement('small');
  h.textContent = g.name;
  const p = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null;
  s.textContent = [
    g.kind === 'app' ? 'App' : SYS[sysOf(g)] ? SYS[sysOf(g)].name : '',
    String(g.format || '').split(' · ')[0] !== (SYS[sysOf(g)] || {}).name ? String(g.format || '').split(' · ')[0] : '',
    p && p.sec ? 'Played for ' + fmtDur(p.sec) : plays[g.name] ? 'Last played ' + dayName(plays[g.name]) : 'Not played yet',
  ]
    .filter(Boolean)
    .join(' · ');
  t.append(h, s);
  hero.append(a, t);
  pane.append(hero);
  const btn = (label, fn, ghost) => {
    const b = document.createElement('button');
    b.className = 'nx-btn' + (ghost ? ' ghost' : '');
    b.textContent = label;
    b.onclick = () => {
      nxSnd('open');
      fn();
    };
    pane.append(b);
    return b;
  };
  const para = txt => {
    const e = document.createElement('p');
    e.textContent = txt;
    pane.append(e);
  };
  if (it.id === 'start') btn('Start', it.run);
  else if (it.id === 'info') pane.append(nxFacts(g));
  else if (it.id === 'fav') {
    para(favs.has(g.name) ? 'This game is one of your favorites. Favorites are the same on every console.' : 'Favorites come first when All Software is sorted by favorites, and they are the same on every console.');
    btn(it.label, it.run, true);
  } else if (it.id === 'mark') {
    para('A colour or a small sign around the game’s square, so you find it quickly. Hold the left stick on a game to choose one.');
    btn('Choose a mark', it.run, true);
  } else if (it.id === 'group') {
    para(fdNameOf(g) ? 'In the folder “' + fdNameOf(g) + '”. Move it to another folder or take it out.' : 'Folders keep a console tidy – mods, tools, games to finish. A folder is a square of its own on Home.');
    btn(fdNameOf(g) ? 'Change folder' : 'Put in a folder', it.run, true);
  } else if (it.id === 'folder') {
    para(String(g.path || ''));
    btn('Show in folder', it.run, true);
  } else if (it.id === 'edit') {
    para('Its name, the program it starts and its picture.');
    btn('Edit app', it.run, true);
  } else if (it.id === 'copy') btn('Copy name', it.run, true);
}
function nxFacts(g) {
  const p = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null,
    last = (p && p.last) || plays[g.name] || 0,
    box = document.createElement('div');
  box.className = 'nx-facts';
  const parts = String(g.format || '').split(' · '),
    wiiu = sysOf(g) === 'wiiu';
  const add = (label, value, wide) => {
    const d = document.createElement('div'),
      s = document.createElement('small'),
      b = document.createElement('b');
    if (wide) d.className = 'wide';
    s.textContent = label;
    b.textContent = value || '—';
    d.append(s, b);
    box.append(d);
  };
  add('Play time', p && p.sec ? fmtDur(p.sec) : '');
  add('Last played', last ? dayName(last).replace(/^./, c => c.toUpperCase()) : '');
  add('Sessions', p && p.sessions ? String(p.sessions) : '');
  add('First played', p && p.first ? new Date(p.first).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  if (g.kind !== 'app') {
    // Wii U: "Wii U · Europe" (the region); the others: "Switch · NSP · Update" (the kind of file)
    add('Format', wiiu ? parts[0] : parts.slice(1).join(' · ') || parts[0]);
    add(wiiu ? 'Region' : 'Console', wiiu ? parts[1] || '' : SYS[sysOf(g)] ? SYS[sysOf(g)].name : '');
    if (g.tid) add('Title ID', String(g.tid).toUpperCase(), true);
  }
  if (g.path) add('File', String(g.path), true);
  return box;
}

// ---------- small lists over the screen: sort, themes, consoles, power ----------
function nxPopOpen(title, items, at = 0) {
  const box = $('#nxpop .nx-box');
  box.replaceChildren();
  const h = document.createElement('h3');
  h.textContent = title;
  box.append(h);
  items.forEach((it, k) => {
    const b = document.createElement('button');
    b.className = 'nx-gi' + (it.danger ? ' danger' : '');
    b.setAttribute('role', 'menuitem');
    b.innerHTML = (it.icon ? NX_IC[it.icon] : '') + '<span></span>' + (it.on ? '<i class="nx-ck">✓</i>' : '');
    b.querySelector('span').textContent = it.label;
    b.onclick = () => {
      nx.popI = k;
      nxPopPress();
    };
    b.onpointerenter = () => {
      nx.popI = k;
      nxSelUi();
    };
    box.append(b);
  });
  nx.pop = items;
  nx.popI = Math.max(0, Math.min(at, items.length - 1));
  $('#nxpop').hidden = false;
  nxSnd('open');
  nxSelUi(true);
}
function nxPopMove(d) {
  if (d !== 'u' && d !== 'd') return;
  const was = nx.popI;
  nx.popI = Math.max(0, Math.min(nx.pop.length - 1, nx.popI + (d === 'd' ? 1 : -1)));
  nxSnd(was === nx.popI ? 'bump' : 'move');
  nxSelUi(true);
}
function nxPopPress() {
  const it = nx.pop && nx.pop[nx.popI];
  if (!it) return;
  nxPopClose(true);
  nxSnd('open');
  it.fn();
}
function nxPopClose(quiet) {
  if (!nx.pop) return;
  nx.pop = null;
  $('#nxpop').hidden = true;
  if (!quiet) nxSnd('back');
  nxSelUi();
}
function nxSortPop() {
  const keys = Object.keys(NX_SORT),
    many = sysAvail().length > 1;
  nxPopOpen(
    'Sort and filter',
    [
      ...keys.map(k => ({ label: NX_SORT[k], icon: 'sort', on: nx.sort === k, fn: () => nxSetSort(k) })),
      { label: 'Search…', icon: 'search', fn: () => setTimeout(() => $('#nxq').focus(), 30) },
      many && { label: 'Every console together', icon: 'every', fn: () => setEvery(true) },
    ].filter(Boolean),
    Math.max(0, keys.indexOf(nx.sort)),
  );
}
function nxSetSort(k) {
  nx.sort = k;
  nxLs('nxSort', k);
  nx.ai = 0;
  nxDrawAll();
}
function nxThemesPop() {
  const t = nxLs('nxTheme') || 'auto',
    ks = ['white', 'black', 'auto'];
  nxPopOpen(
    'Themes',
    [
      { label: 'Basic White', on: t === 'white', fn: () => nxSetTheme('white') },
      { label: 'Basic Black', on: t === 'black', fn: () => nxSetTheme('black') },
      { label: 'Follow light and dark', on: t === 'auto', fn: () => nxSetTheme('auto') },
      { label: 'Music and sounds…', icon: 'music', fn: () => openSettings('sound') },
    ],
    ks.indexOf(t),
  );
}
function nxSetTheme(t) {
  nxLs('nxTheme', t);
  nxTheme();
  nxSettingsUi();
}
function nxConsolesPop() {
  const av = sysAvail();
  nxPopOpen(
    'Consoles',
    [
      ...av.map(k => ({ label: SYS[k].name + (k === curSys ? '' : nxLookOf(k) === 'switch' ? '' : ' – its own look'), icon: k === 'wiiu' ? 'wiiu' : 'consoles', on: k === curSys, fn: () => nxUserGo(k) })),
      av.length > 1 && { label: 'Every console together', icon: 'every', fn: () => setEvery(true) },
      { label: 'Add a console…', icon: 'set', fn: () => openSettings('general') },
    ].filter(Boolean),
    Math.max(0, av.indexOf(curSys)),
  );
}
function nxPowerPop() {
  nxPopOpen(
    'Power',
    [
      { label: tv ? 'Leave TV mode' : 'TV mode (full screen)', icon: 'tv', fn: () => toggleTv() },
      !IS_MOBILE && { label: 'Shortcuts', icon: 'keys', fn: () => openKeys() },
      { label: 'Feedback', icon: 'bug', fn: () => openFeedback() },
      !IS_IOS && { label: 'Quit CosmoU', icon: 'power', danger: true, fn: () => window.close() },
    ].filter(Boolean),
  );
}

// ---------- Quick Settings: the Home button (or Q) ----------
function nxQsItems() {
  const t = nxLs('nxTheme') || 'auto',
    many = sysAvail().length > 1;
  return [
    { label: 'Theme', icon: 'themes', val: { white: 'Basic White', black: 'Basic Black', auto: 'Auto' }[t], fn: () => nxSetTheme({ white: 'black', black: 'auto', auto: 'white' }[t]) },
    { label: 'Menu music', icon: 'music', tg: !!musicOn, fn: () => $('#mt').click() },
    { label: 'Music volume', icon: 'sound', vol: true },
    { label: 'UI sounds', icon: 'sound', tg: !!uiSounds, fn: () => $('#uis').click() },
    { label: 'TV mode', icon: 'tv', tg: !!tv, fn: () => toggleTv() },
    many && { label: 'Consoles', icon: 'consoles', val: SYS[curSys].name, fn: () => (nxQsClose(true), nxConsolesPop()) },
    { label: 'Controllers', icon: 'pads', fn: () => (nxQsClose(true), openSettings('controls')) },
    { label: 'System Settings', icon: 'set', fn: () => (nxQsClose(true), openSettings()) },
  ].filter(Boolean);
}
function nxQsOpen() {
  if (nx.qs) return nxQsClose();
  nxPopClose(true);
  nx.qs = true;
  nx.qi = 0;
  const now = new Date();
  $('#nxqt').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('#nxqd').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  $('#nxqs').hidden = false;
  nxQsDraw();
  nxSnd('open');
}
function nxQsDraw() {
  const box = $('#nxqlist');
  box.replaceChildren(
    ...nxQsItems().map((it, k) => {
      if (it.vol) {
        const l = document.createElement('label');
        l.className = 'nx-gi nx-vol';
        const v = Math.round((typeof musicVol === 'function' ? musicVol() : 0.35) * 100);
        l.innerHTML = NX_IC.sound + '<input type="range" min="0" max="100" step="5" aria-label="Music volume" /><span class="nx-val"></span>';
        const r = l.querySelector('input');
        r.value = v;
        l.querySelector('.nx-val').textContent = v + '%';
        r.oninput = () => nxVol(+r.value);
        l.onpointerenter = () => {
          nx.qi = k;
          nxSelUi();
        };
        return l;
      }
      const b = document.createElement('button');
      b.className = 'nx-gi' + (it.tg ? ' tg-on' : '');
      b.innerHTML = NX_IC[it.icon] + '<span></span>' + (it.tg !== undefined ? '<i class="nx-sw"></i>' : it.val ? '<span class="nx-val"></span>' : '');
      b.querySelector('span').textContent = it.label;
      if (it.val) b.querySelector('.nx-val').textContent = it.val;
      b.onclick = () => {
        nx.qi = k;
        nxQsPress();
      };
      b.onpointerenter = () => {
        nx.qi = k;
        nxSelUi();
      };
      return b;
    }),
  );
  nx.qi = Math.min(nx.qi, box.children.length - 1);
  nxSelUi();
}
function nxVol(v) {
  v = Math.max(0, Math.min(100, v));
  try {
    localStorage.setItem('cosmou.musicVol', String(v));
  } catch {}
  if (typeof bgMusic !== 'undefined' && bgMusic) bgMusic.volume = v / 100;
  const r = $('#nxqlist input[type=range]');
  if (r) {
    r.value = v;
    r.parentElement.querySelector('.nx-val').textContent = v + '%';
  }
}
function nxQsMove(d) {
  const items = nxQsItems(),
    it = items[nx.qi];
  if (it && it.vol && (d === 'l' || d === 'r')) {
    nxVol(Math.round((typeof musicVol === 'function' ? musicVol() : 0.35) * 100) + (d === 'r' ? 5 : -5));
    return nxSnd('move');
  }
  if (d !== 'u' && d !== 'd') return;
  const was = nx.qi;
  nx.qi = Math.max(0, Math.min(items.length - 1, nx.qi + (d === 'd' ? 1 : -1)));
  nxSnd(was === nx.qi ? 'bump' : 'move');
  nxSelUi(true);
}
function nxQsPress() {
  const it = nxQsItems()[nx.qi];
  if (!it || it.vol) return;
  if (it.tg !== undefined) nxSnd(it.tg ? 'off' : 'on');
  it.fn();
  setTimeout(() => nx.qs && nxQsDraw(), 80);
}
function nxQsClose(quiet) {
  if (!nx.qs) return;
  nx.qs = false;
  $('#nxqs').hidden = true;
  if (!quiet) nxSnd('back');
  nxSelUi();
}

// ---------- sounds: dry little clicks of its own (made here, no recordings) ----------
let nxCtx = null;
function nxSnd(kind) {
  if (typeof uiSounds !== 'undefined' && !uiSounds) return;
  try {
    nxCtx = nxCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (nxCtx.state === 'suspended') nxCtx.resume();
    const c = nxCtx,
      t = c.currentTime + 0.005,
      out = c.createGain();
    out.gain.value = 0.18;
    out.connect(c.destination);
    // a click: a very short falling sine and a pinch of filtered noise
    const click = (at, f, dur, g) => {
      const o = c.createOscillator(),
        e = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + at);
      o.frequency.exponentialRampToValueAtTime(f * 0.62, t + at + dur);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + 0.0012);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(out);
      o.start(t + at);
      o.stop(t + at + dur + 0.01);
      const len = Math.ceil(c.sampleRate * 0.01),
        buf = c.createBuffer(1, len, c.sampleRate),
        ch = buf.getChannelData(0);
      for (let k = 0; k < len; k++) ch[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 4);
      const n = c.createBufferSource(),
        bp = c.createBiquadFilter(),
        ng = c.createGain();
      n.buffer = buf;
      bp.type = 'bandpass';
      bp.frequency.value = f * 1.7;
      bp.Q.value = 2.5;
      ng.gain.value = g * 0.7;
      n.connect(bp).connect(ng).connect(out);
      n.start(t + at);
    };
    const tone = (at, f, dur, g, type = 'sine') => {
      const o = c.createOscillator(),
        e = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + at);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(out);
      o.start(t + at);
      o.stop(t + at + dur + 0.02);
    };
    if (kind === 'move') click(0, 2300, 0.028, 0.9);
    else if (kind === 'page') {
      click(0, 1800, 0.03, 0.8);
      click(0.045, 2500, 0.03, 0.65);
    } else if (kind === 'open') {
      click(0, 1600, 0.035, 0.85);
      tone(0.02, 1864, 0.08, 0.22);
    } else if (kind === 'back') click(0, 1150, 0.045, 0.85);
    else if (kind === 'bump') tone(0, 170, 0.09, 0.55, 'triangle');
    else if (kind === 'on') {
      click(0, 2000, 0.025, 0.8);
      click(0.04, 2800, 0.025, 0.7);
    } else if (kind === 'off') {
      click(0, 2400, 0.025, 0.7);
      click(0.04, 1500, 0.03, 0.8);
    } else if (kind === 'start') {
      click(0, 1900, 0.035, 0.9);
      tone(0.05, 1318.5, 0.16, 0.32);
      tone(0.12, 1975.5, 0.36, 0.28);
    } else click(0, 2100, 0.03, 0.8);
  } catch {}
}
// CosmoU's sounds become these while the Switch is on screen
const _blipNx = blip;
blip = function (kind) {
  if (nx.on) return nxSnd(kind);
  return _blipNx.apply(this, arguments);
};

// ---------- the rest of CosmoU, Switch style while it is on ----------
const _renderNx = render;
render = function () {
  const r = _renderNx.apply(this, arguments);
  nxApply();
  return r;
};
const _applySystemNx = applySystem;
applySystem = function () {
  const r = _applySystemNx.apply(this, arguments);
  nx.ready = true;
  nxApply();
  return r;
};
// details and the game menu become the game's page, the Quick Menu becomes Quick Settings
const _openDetailNx = openDetail;
openDetail = function (g) {
  if (nx.on) return nxOpenGame(g);
  return _openDetailNx.apply(this, arguments);
};
const _gameMenuNx = gameMenu;
gameMenu = function (g) {
  if (nx.on) return nxOpenGame(g);
  return _gameMenuNx.apply(this, arguments);
};
const _openQuickNx = openQuick;
openQuick = function () {
  if (nx.on) {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    return nxQsOpen();
  }
  return _openQuickNx.apply(this, arguments);
};
// Themes in the dock or the T key: the Switch's themes
if (typeof openThemes === 'function') {
  const _openThemesNx = openThemes;
  openThemes = function () {
    if (nx.on) return nxThemesPop();
    return _openThemesNx.apply(this, arguments);
  };
}
// a right click (or a long press) on a square: its page
addEventListener(
  'contextmenu',
  e => {
    if (!nx.on || !e.target.closest || !e.target.closest('#nx')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const t = e.target.closest('[data-g]'),
      g = t && gameOf(t.dataset.g);
    if (g) nxOpenGame(g);
  },
  true,
);

// ---------- keyboard: the same as the controller ----------
addEventListener(
  'keydown',
  e => {
    if (!nx.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen())) return;
    if ($('#launch').classList.contains('on') || $('#setup').classList.contains('on')) return;
    const typingNx = e.target && e.target.id === 'nxq';
    if (typingNx) return;
    const k = e.key,
      stop = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
    const dir = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[k];
    if (dir) return stop(), nxMove(dir);
    if (k === 'Enter' || k === ' ') return stop(), nxA();
    if (k === 'Escape' || k === 'Backspace') return stop(), nxB();
    if (['+', '=', 'o', 'O', 'i', 'I', 'x', 'X', 'ContextMenu'].includes(k)) return stop(), nxPlus();
    if (['y', 'Y', 's', 'S'].includes(k)) return stop(), nx.scr === 'all' ? nxSortPop() : nxShow('all');
    if (k === '/') {
      stop();
      if (nx.scr !== 'all') nxShow('all');
      return setTimeout(() => $('#nxq').focus(), 30);
    }
    if (k === 'q' || k === 'Q' || k === 'Home') return stop(), nxQsOpen();
    if (k === 't' || k === 'T') return stop(), nxThemesPop();
    if (k === 'PageUp' || k === 'PageDown') return stop(), typeof sysNext === 'function' && sysNext(k === 'PageDown' ? 1 : -1);
    // the dock's and the views' keys have nothing to do here
    if (['l', 'L', 'r', 'R', '*', '1', '2', '3', 'g', 'G', 'm', 'M', 'h', 'H'].includes(k)) return stop();
  },
  true,
);

// (Space and Enter only act through the handler above, never a second time as a click on the focused button)
addEventListener(
  'keyup',
  e => {
    if (nx.on && (e.key === ' ' || e.key === 'Enter') && e.target && e.target.closest && e.target.closest('#nx') && e.target.id !== 'nxq') e.preventDefault();
  },
  true,
);

// ---------- controller (called by the controller loop in js/feedback-style-controller.js) ----------
// A start · B back · + options · Y sort · X options · L/R console · − TV mode · Home Quick Settings ·
// left stick: clicked = favorite, held = marks
function nxPad(fire, s, open, busy, now) {
  if (!nx.on || busy) return false;
  if (fire.hm) {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    nxQsOpen();
    return true;
  }
  if (open || (typeof mkIsOpen === 'function' && mkIsOpen())) return false;
  for (const k of ['l', 'r', 'u', 'd']) if (fire[k]) nxMove(k);
  if (fire.a) nxA();
  else if (fire.b) nxB();
  if (fire.st || fire.x) nxPlus();
  if (fire.y) nxY();
  if (fire.sl && typeof toggleTv === 'function') toggleTv();
  if ((fire.lb || fire.rb) && !nx.qs && !nx.pop && typeof sysNext === 'function') sysNext(fire.rb ? 1 : -1);
  // the left stick: clicked a favorite, held the wheel of marks
  if (s.l3 && !nx.l3) {
    nx.l3 = now;
    nx.l3Done = false;
  }
  if (s.l3 && nx.l3 && !nx.l3Done && now - nx.l3 > 450 && nxChosen() && typeof markWheel === 'function') {
    nx.l3Done = true;
    markWheel(nxChosen());
  }
  if (!s.l3 && nx.l3) {
    if (!nx.l3Done && nxChosen()) toggleFav(nxChosen());
    nx.l3 = 0;
  }
  return true;
}

// ---------- Settings → Appearance: the Switch's own interface on or off, and its theme ----------
function nxSettingsRows() {
  const pane = document.querySelector('#sxbd .pane[data-c="look"]');
  if (!pane || $('#nxsetgrp')) return;
  const wrap = document.createElement('div');
  wrap.id = 'nxsetgrp';
  wrap.innerHTML = `<h3 class="sh">Switch</h3>
    <div class="grp">
      <div class="set" data-k="switch interface own look home menu all software quick settings face">
        <div class="lbl"><strong>Its own interface</strong><small>With the Switch on screen, CosmoU looks and works like a Switch – Home, All Software, Quick Settings</small></div>
        <button class="tg" id="nxface">On</button>
      </div>
      <div class="set" data-k="switch theme basic white black dark light">
        <div class="lbl"><strong>Switch theme</strong><small>Basic White, Basic Black, or the one that follows light and dark</small></div>
        <div class="seg" id="nxthm"><button data-t="white">Basic White</button><button data-t="black">Basic Black</button><button data-t="auto">Auto</button></div>
      </div>
    </div>`;
  // after the theme, before the views
  const views = [...pane.querySelectorAll(':scope > .sh')].find(h => /^views$/i.test(h.textContent.trim()));
  pane.insertBefore(wrap, views || null);
  $('#nxface').onclick = () => {
    const off = nxLs('nxFace') === '0';
    nxLs('nxFace', off ? '1' : '0');
    nxSettingsUi();
    blip(off ? 'open' : 'back');
    nxApply();
    render();
  };
  document.querySelectorAll('#nxthm button').forEach(b => (b.onclick = () => (nxSetTheme(b.dataset.t), blip('move'))));
  // what only the CosmoU window (or only the Wii U) uses has no place while the Switch is on screen
  for (const s of ['.thset', '#otadd', '.lkset', '#wul', '#hvc', '#oupd']) {
    const el = $(s);
    const row = el && (el.classList.contains('set') ? el : el.closest('.set'));
    if (row) row.classList.add('no-nx');
  }
  // Cemu's own section in Games & Consoles: its heading and its group
  const cemu = $('#upC') && $('#upC').closest('.grp');
  if (cemu) {
    cemu.classList.add('no-nx');
    const h = cemu.previousElementSibling;
    if (h && h.classList.contains('sh')) h.classList.add('no-nx');
  }
  nxSettingsUi();
}
function nxSettingsUi() {
  const g = $('#nxsetgrp');
  if (!g) return;
  const has = typeof sysAvail === 'function' && sysAvail().some(k => nxLookOf(k) === 'switch');
  g.hidden = !has;
  const on = nxLs('nxFace') !== '0';
  $('#nxface').textContent = on ? 'On' : 'Off';
  $('#nxface').classList.toggle('on', on);
  const t = nxLs('nxTheme') || 'auto';
  document.querySelectorAll('#nxthm button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
}
if (typeof sxRender === 'function') {
  const _sxRenderNx = sxRender;
  sxRender = function (id) {
    const r = _sxRenderNx.apply(this, arguments);
    if (id === 'look') {
      if (!$('#nxsetgrp') && nx.el) nxSettingsRows();
      else if (!$('#nxsetgrp')) {
        nxSettingsRows();
      }
      nxSettingsUi();
    }
    return r;
  };
}
// the start: the window may already be on the Switch
nxApply();
