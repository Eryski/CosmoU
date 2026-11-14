// CosmoU – Wii U Look "Home Menu" layout: a 5×3 grid of the games with the chosen game's name below (switchable with
// the Plaza). Two kinds:
//   home  the full Home Menu – tiles with a frame of glass, empty places as faint glass, big arrows at the sides that
//         turn the pages, the page dots at the top, and a bar of round buttons at the bottom (js/wiiu-dock.js:
//         Plaza, Notes, Browser, YouTube, Discord, Controllers, Settings …) – idea: Flowery
//   mini  the smaller one from before: clock and battery on top, a few buttons on both sides
const WH_COLS = 5,
  WH_ROWS = 3,
  WH_PER = WH_COLS * WH_ROWS;
let wuView = 'plaza',
  whPage = 0,
  // the Home Menu last used (the Plaza's "Home Menu" button goes back to it)
  whKind = 'home';
try {
  const v = localStorage.getItem('cosmou.wuView');
  if (v === 'home' || v === 'mini') wuView = v;
  if (localStorage.getItem('cosmou.wuHome') === 'mini' || v === 'mini') whKind = 'mini';
} catch {}
const isHome = () => mode === 'wiiu' && wuView !== 'plaza';
const whFull = () => wuView === 'home';
const WH_ICON = {
  settings:
    '<svg viewBox="0 0 64 64"><path fill="#8b959e" d="M45.6 8.4a14 14 0 0 0-16.9 18.2L9.9 45.4a5.5 5.5 0 0 0 7.8 7.8l18.8-18.8A14 14 0 0 0 54.8 17.5l-7.9 7.9-6.9-1.2-1.2-6.9z"/></svg>',
  add: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="#e6ebee"/><path d="M32 20v24M20 32h24" stroke="#8b959e" stroke-width="6" stroke-linecap="round"/></svg>',
  lib: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="5" width="9" height="9" rx="2.5"/><rect x="18" y="5" width="9" height="9" rx="2.5"/><rect x="5" y="18" width="9" height="9" rx="2.5"/><rect x="18" y="18" width="9" height="9" rx="2.5"/></g></svg>',
  recent:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M16 9.5V16l4.5 3" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
  search:
    '<svg viewBox="0 0 32 32"><circle cx="14" cy="14" r="8" fill="none" stroke="#fff" stroke-width="3.5"/><path d="m20 20 6 6" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
  buddy:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="7.5" fill="#fff"/><path d="M6 28c1-6 5-9 10-9s9 3 10 9z" fill="#fff"/><circle cx="13.3" cy="12" r="1.3" fill="#3aa86b"/><circle cx="18.7" cy="12" r="1.3" fill="#3aa86b"/></svg>',
  chat: '<svg viewBox="0 0 32 32"><path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.3A3.5 3.5 0 0 1 6 17.5z" fill="#fff"/></svg>',
  feedback:
    '<svg viewBox="0 0 32 32"><path d="M8 5v23" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M9 6h15l-3.5 5.5L24 17H9z" fill="#fff"/></svg>',
  post: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M22.6 4.6a3 3 0 0 1 4.2 4.2L13 22.6 7 24l1.4-6z"/><path fill="#fff" d="M5 27h22v2.5H5z"/></svg>',
  log: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="16" width="5" height="11" rx="1.5"/><rect x="13.5" y="9" width="5" height="18" rx="1.5"/><rect x="22" y="4" width="5" height="23" rx="1.5"/></g></svg>',
  gear: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M14 3h4l.7 3.4 2.6 1.1 2.9-1.9 2.8 2.8-1.9 2.9 1.1 2.6L29 14v4l-3.4.7-1.1 2.6 1.9 2.9-2.8 2.8-2.9-1.9-2.6 1.1L18 29h-4l-.7-3.4-2.6-1.1-2.9 1.9L5 23.6l1.9-2.9-1.1-2.6L3 18v-4l3.4-.7 1.1-2.6L5.6 7.8l2.8-2.8 2.9 1.9 2.6-1.1zm2 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>',
  // grey icons for the side buttons
  sgear:
    '<svg viewBox="0 0 32 32"><path fill="currentColor" d="M14 3h4l.7 3.4 2.6 1.1 2.9-1.9 2.8 2.8-1.9 2.9 1.1 2.6L29 14v4l-3.4.7-1.1 2.6 1.9 2.9-2.8 2.8-2.9-1.9-2.6 1.1L18 29h-4l-.7-3.4-2.6-1.1-2.9 1.9L5 23.6l1.9-2.9-1.1-2.6L3 18v-4l3.4-.7 1.1-2.6L5.6 7.8l2.8-2.8 2.9 1.9 2.6-1.1zm2 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>',
  power:
    '<svg viewBox="0 0 32 32"><path d="M10.2 8.6a10 10 0 1 0 11.6 0" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/><path d="M16 4v11" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>',
  friends:
    '<svg viewBox="0 0 40 40"><g fill="none" stroke="#2fae4e" stroke-width="2.6" stroke-linejoin="round"><circle cx="10" cy="13.5" r="4.6"/><path d="M3 31c.4-6 3-9.3 7-9.3 2.4 0 4.3 1.2 5.5 3.4"/><circle cx="30" cy="13.5" r="4.6"/><path d="M37 31c-.4-6-3-9.3-7-9.3-2.4 0-4.3 1.2-5.5 3.4"/></g><circle cx="20" cy="15" r="5.6" fill="#4cc766" stroke="#2fae4e" stroke-width="2.2"/><path d="M10.5 34c.5-7 4-11 9.5-11s9 4 9.5 11z" fill="#4cc766" stroke="#2fae4e" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  // the Wii U GamePad: wide body, screen in the middle, sticks on top, D-pad left, ABXY right
  gamepad:
    '<svg viewBox="0 0 64 40"><rect x="1.5" y="3" width="61" height="34" rx="9" fill="#2a2f35"/><rect x="3" y="4.5" width="58" height="31" rx="7.5" fill="none" stroke="#4a525b" stroke-width="1"/>' +
    '<rect x="17" y="8" width="30" height="20" rx="1.8" fill="#1a1d21"/><rect x="18.5" y="9.5" width="27" height="17" rx="1" fill="url(#gpscr)"/>' +
    '<defs><linearGradient id="gpscr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fdcff"/><stop offset="1" stop-color="#2aa6e0"/></linearGradient></defs>' +
    '<circle cx="9.5" cy="12" r="4" fill="#5b636c"/><circle cx="9.5" cy="12" r="2.4" fill="#3b4148"/><circle cx="54.5" cy="12" r="4" fill="#5b636c"/><circle cx="54.5" cy="12" r="2.4" fill="#3b4148"/>' +
    '<path d="M8 22.5h3v2.5h2.5v3H11v2.5H8V28H5.5v-3H8z" fill="#c9cfd5"/>' +
    '<circle cx="54.5" cy="22.6" r="1.6" fill="#c9cfd5"/><circle cx="54.5" cy="29.4" r="1.6" fill="#c9cfd5"/><circle cx="51.1" cy="26" r="1.6" fill="#c9cfd5"/><circle cx="57.9" cy="26" r="1.6" fill="#c9cfd5"/>' +
    '<circle cx="32" cy="32" r="1.3" fill="#7b848d"/></svg>',
  view: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="4" y="8" width="7" height="16" rx="2"/><rect x="12.5" y="5" width="7" height="22" rx="2"/><rect x="21" y="8" width="7" height="16" rx="2"/></g></svg>',
  grid: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="5" width="6" height="6" rx="1.5"/><rect x="13" y="5" width="6" height="6" rx="1.5"/><rect x="21" y="5" width="6" height="6" rx="1.5"/><rect x="5" y="13" width="6" height="6" rx="1.5"/><rect x="13" y="13" width="6" height="6" rx="1.5"/><rect x="21" y="13" width="6" height="6" rx="1.5"/><rect x="5" y="21" width="6" height="6" rx="1.5"/><rect x="13" y="21" width="6" height="6" rx="1.5"/><rect x="21" y="21" width="6" height="6" rx="1.5"/></g></svg>',
  sort: '<svg viewBox="0 0 32 32"><path d="M10 6v20m0 0-5-5m5 5 5-5M22 26V6m0 0-5 5m5-5 5 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tv: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="16" rx="2.5" fill="none" stroke="#fff" stroke-width="3"/><path d="M11 27h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  quit: '<svg viewBox="0 0 32 32"><path d="M10.2 8.6a10 10 0 1 0 11.6 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M16 4v11" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
  pad: '<svg viewBox="0 0 32 32"><rect x="3" y="9" width="26" height="15" rx="4.5" fill="#fff"/><rect x="11" y="11.5" width="10" height="7.5" rx="1" fill="#16b3d9"/></svg>',
  swap: '<svg viewBox="0 0 40 40"><rect x="4" y="7" width="20" height="14" rx="2.5" fill="none" stroke="#5c6a75" stroke-width="3"/><rect x="16" y="19" width="20" height="14" rx="2.5" fill="#fff" stroke="#5c6a75" stroke-width="3"/><path d="M29 7h5v5M11 33H6v-5" fill="none" stroke="#22b5df" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function syncWuLayoutUi() {
  document.querySelectorAll('#wul button').forEach(b => b.classList.toggle('on', b.dataset.l === wuView));
}
function setWuLayout(v) {
  wuView = v === 'home' || v === 'mini' ? v : 'plaza';
  if (wuView !== 'plaza') whKind = wuView;
  try {
    localStorage.setItem('cosmou.wuView', wuView);
    localStorage.setItem('cosmou.wuHome', whKind);
  } catch {}
  if (typeof whDockReset === 'function') whDockReset();
  syncWuLayoutUi();
  hoverOff();
  blip('page');
  withVT(render);
}
const whItems = l => [...l, { sys: 'add', name: 'Add app' }];
function whSize() {
  const W = innerWidth,
    H = innerHeight,
    home = $('#whome');
  if (whFull()) {
    // everything scales with the window (a 1280×720 window is 1): the tiles as big as the room between the top
    // line, the name and the bar of buttons allows – also on an ultrawide or a small screen
    const u = Math.max(0.6, Math.min(2.6, Math.min(W / 1280, H / 720))),
      narrow = W < 760,
      side = narrow ? 10 : Math.round(92 * u),
      gap = Math.round(Math.max(8, 20 * u)),
      tvPad = document.body.classList.contains('tv') ? 58 : 0,
      room = H - Math.round(74 * u) - Math.round(54 * u) - Math.round(98 * u) - tvPad - 10,
      s = Math.floor(Math.min((W - side * 2 - gap * (WH_COLS - 1) - 20) / WH_COLS, (room - gap * (WH_ROWS - 1)) / WH_ROWS));
    home.style.setProperty('--u', u.toFixed(3));
    home.style.setProperty('--whside', side + 'px');
    home.classList.toggle('wh-narrow', narrow);
    return { s: Math.max(52, Math.min(340, s)), gap };
  }
  const side = W < 900 ? 92 : 116,
    gap = Math.round(Math.max(10, Math.min(26, W * 0.017))),
    s = Math.floor(Math.min((W - side * 2 - 40 - gap * (WH_COLS - 1)) / WH_COLS, (H - 96 - 124 - gap * (WH_ROWS - 1)) / WH_ROWS));
  home.style.setProperty('--whside', side + 'px');
  return { s: Math.max(64, Math.min(196, s)), gap };
}
// the full Home Menu has its parts in other places: the buddy and the page dots in the line at the top
function whPlace() {
  const home = $('#whome'),
    kind = whFull() ? 'home' : 'mini';
  if (home.dataset.kind === kind) return;
  home.dataset.kind = kind;
  const bar = home.querySelector('.wh-bar');
  if (kind === 'home') {
    bar.prepend($('#whav'));
    bar.append($('#whdots'));
  } else {
    home.querySelector('.wh-side.l').insertBefore($('#whav'), $('#whset'));
    home.querySelector('.wh-foot').append($('#whdots'));
  }
  $('#whgrid').dataset.key = '';
}
// the little "i" on the chosen tile: its details
function whInfo(it) {
  const inf = document.createElement('span');
  inf.className = 'wh-i';
  inf.textContent = 'i';
  inf.title = 'Details';
  inf.onclick = e => {
    e.stopPropagation();
    openDetail(it);
  };
  return inf;
}
function buildHome(l) {
  const items = whItems(l),
    pages = Math.max(1, Math.ceil(items.length / WH_PER)),
    idx = items.findIndex(x => !x.sys && x.name === sel),
    full = whFull();
  if (idx >= 0) whPage = Math.floor(idx / WH_PER);
  whPage = Math.max(0, Math.min(pages - 1, whPage));
  whPlace();
  const { s, gap } = whSize(),
    grid = $('#whgrid');
  grid.style.setProperty('--ts', s + 'px');
  grid.style.setProperty('--tg', gap + 'px');
  if (grid.dataset.page !== String(whPage)) {
    // (the new page comes in from the side it lies on)
    grid.dataset.dir = +grid.dataset.page > whPage ? 'l' : 'r';
    grid.classList.remove('swap');
    void grid.offsetWidth;
    grid.classList.add('swap');
    grid.dataset.page = whPage;
    // (only the page that comes in plays it – a tile moved later does not come in again)
    clearTimeout(grid._swapT);
    grid._swapT = setTimeout(() => grid.classList.remove('swap'), 900);
  }
  // the arrows at the sides: only where there is a page to go to
  $('#wharl').hidden = !full || whPage < 1;
  $('#wharr').hidden = !full || whPage >= pages - 1;
  if (typeof whDockUi === 'function') whDockUi();
  // the same page with the same games: only the selection moves (building every tile new played their
  // entrance again – the whole screen seemed to reload with every step)
  const shown = items.slice(whPage * WH_PER, (whPage + 1) * WH_PER),
    key =
      (full ? 'F' : 'M') +
      whPage +
      '|' +
      shown.map(it => (it.sys ? '+' : it.name + (favs.has(it.name) ? '★' : '') + (it.icon || it.cover || '') + (it.kind === 'folder' ? it.format + it.col : ''))).join('\n');
  if (grid.dataset.key === key && grid.children.length) {
    for (const t of grid.children) {
      const on = whAdd ? t.classList.contains('sys') : !!t.dataset.g && t.dataset.g === sel;
      t.classList.toggle('on', on);
      const inf = t.querySelector('.wh-i');
      if (inf && !on) inf.remove();
      if (on && !inf) t.append(whInfo(items.find(x => !x.sys && x.name === sel)));
    }
    const g = cur();
    $('#whtitle').textContent = whAdd ? 'Add app' : g ? g.name : '';
    return;
  }
  grid.dataset.key = key;
  // the tiles there already are kept (a game moved, a page with the same games): only new ones are built – building
  // all of them again reloaded every picture (Eduard: "moving a game will refresh everything")
  const old = new Map(),
    sig = it => (it.sys ? '+' : it.name + (favs.has(it.name) ? '★' : '') + (it.icon || it.cover || '') + (it.kind === 'folder' ? it.format + it.col : ''));
  for (const t of grid.children) if (t.dataset.sig) old.set(t.dataset.sig, t);
  const tiles = shown.map((it, i) => {
    const k = sig(it);
    let t = old.get(k);
    if (t) {
      old.delete(k);
      const on = it.sys ? whAdd : it.name === sel && !whAdd;
      t.classList.toggle('on', on);
      t.style.setProperty('--i', i);
      const inf = t.querySelector('.wh-i');
      if (inf && !on) inf.remove();
      if (on && !inf && !it.sys) t.append(whInfo(it));
      return t;
    }
    t = document.createElement('button');
    t.dataset.sig = k;
    const a = document.createElement('span');
    t.className = 'wh-t' + (it.sys ? ' sys' : '') + ((it.sys ? whAdd : it.name === sel && !whAdd) ? ' on' : '');
    t.style.setProperty('--i', i);
    t.title = it.name;
    t.setAttribute('aria-label', it.name);
    a.className = 'wh-a';
    if (it.sys) {
      a.innerHTML = WH_ICON[it.sys];
      t.onclick = () => need() && openApp(null);
    } else {
      const img = it.icon || it.cover;
      if (img) a.style.backgroundImage = `url("${img}")`;
      else paint(a, it);
      t.onclick = () => {
        whAdd = false;
        if (sel === it.name) launch(it);
        else {
          sel = it.name;
          blip('move');
          render();
        }
      };
      t.dataset.g = it.name;
      if (favs.has(it.name)) {
        const f = document.createElement('i');
        f.className = 'fbadge';
        f.textContent = '★';
        t.append(f);
      }
      if (it.name === sel && !whAdd) t.append(whInfo(it));
    }
    t.prepend(a);
    return t;
  });
  grid.replaceChildren(...tiles);
  // the full Home Menu: the places without a game are there too, as faint glass
  if (full)
    for (let i = shown.length; i < WH_PER; i++) {
      const e = document.createElement('span');
      e.className = 'wh-t wh-ph';
      e.style.setProperty('--i', i);
      e.setAttribute('aria-hidden', 'true');
      grid.append(e);
    }
  const dots = $('#whdots');
  dots.replaceChildren();
  for (let p = 0; p < pages; p++) {
    const d = document.createElement('i');
    if (p === whPage) d.className = 'on';
    d.title = 'Page ' + (p + 1);
    d.onclick = () => whTurn(p - whPage);
    dots.append(d);
  }
  dots.hidden = pages < 2;
  const g = cur();
  $('#whtitle').textContent = whAdd ? 'Add app' : g ? g.name : '';
  drawAvatar();
  startAvatar();
}
function whTurn(d) {
  const items = whItems(list()),
    pages = Math.ceil(items.length / WH_PER),
    p = Math.max(0, Math.min(pages - 1, whPage + d));
  if (p === whPage) return;
  whPage = p;
  blip('page');
  const first = items.slice(p * WH_PER, (p + 1) * WH_PER).find(x => !x.sys);
  if (first) sel = first.name;
  render();
}
// the "+" after the last game (add an app) can be chosen with the controller and the arrows too (Eduard)
let whAdd = false;
function whAddSet(on) {
  if (whAdd === on) return;
  whAdd = on;
  blip('move');
  $('#whgrid').dataset.key = '';
  render();
}
function homeStep(dir) {
  // the bar of round buttons below the games (the full Home Menu): along it, and up back to the games
  if (whFull() && typeof whZone === 'string' && whZone === 'dock') return whDockStep(dir);
  // a lifted game moves instead (your order, js/order.js) – up and down a row
  if (typeof orderMove === 'string' && orderMove) return orderShift(dir === 'l' ? -1 : dir === 'r' ? 1 : dir === 'u' ? -WH_COLS : WH_COLS);
  const l = list(),
    i = l.findIndex(x => x.name === sel);
  if (whAdd) {
    if (dir === 'l' || dir === 'u') return whAddSet(false);
    if (dir === 'd' && whFull() && typeof whDockEnter === 'function') return (whAdd = false), whDockEnter();
    return;
  }
  if (i < 0) return;
  // right from the last game: the "+"
  if (dir === 'r' && i === l.length - 1 && (i + 1) % WH_PER !== 0) return whAddSet(true);
  const pos = i,
    col = pos % WH_COLS,
    row = Math.floor((pos % WH_PER) / WH_COLS);
  let n = pos;
  if (dir === 'l') n = col === 0 ? pos - WH_PER + WH_COLS - 1 : pos - 1;
  else if (dir === 'r') n = col === WH_COLS - 1 ? pos + WH_PER - WH_COLS + 1 : pos + 1;
  else if (dir === 'u') n = row === 0 ? pos : pos - WH_COLS;
  else if (dir === 'd') n = row === WH_ROWS - 1 ? pos : pos + WH_COLS;
  if (n < 0) n = 0;
  if (n >= l.length) n = dir === 'd' ? pos : l.length - 1;
  // down from the last row of games: to the round buttons
  if (dir === 'd' && n === pos && whFull() && typeof whDockEnter === 'function') return whDockEnter();
  const t = l[n];
  if (t && t.name !== sel) {
    sel = t.name;
    blip('move');
    render();
  }
}
function drawAvatar() {
  const c = $('#whavc'),
    x = c.getContext('2d'),
    b = buddies[0] || { fc: FACE[0], bc: BODY[3], ey: 0, mo: 0, acc: 0 };
  x.clearRect(0, 0, c.width, c.height);
  drawBuddy(
    x,
    { x: c.width / 2, y: c.height * 0.95, st: 'idle', v: 0, t0: 0, ph: 0, c: 0, lx: 0, ba: 0, ...b, name: '' },
    0,
    c.height / 46,
    false,
  );
  $('#whav').title = (buddies[0] && buddies[0].name) || 'Buddy maker';
}
(function initHome() {
  $('#whset').innerHTML = WH_ICON.sgear;
  $('#whpow').innerHTML = WH_ICON.power;
  $('#whfr').innerHTML = WH_ICON.friends;
  $('#whpad').innerHTML = WH_ICON.gamepad;
  $('#whset').onclick = () => openSettings();
  $('#whfr').onclick = () => setWuLayout('plaza');
  // straight to the controllers in Settings
  $('#whpad').onclick = () => openSettings('controls');
  $('#whlogo').onclick = () => whMenu('logo');
  $('#whpow').onclick = () => whMenu('power');
  $('#wtohome').onclick = () => setWuLayout(whKind);
  $('#wharl').onclick = () => whTurn(-1);
  $('#wharr').onclick = () => whTurn(1);
  $('#whav').onclick = () => openBuddies();
  whShapes();
  whClock();
  whBattery();
  document.querySelectorAll('#wul button').forEach(b => (b.onclick = () => setWuLayout(b.dataset.l)));
  let wheelT = 0;
  $('#whome').addEventListener(
    'wheel',
    e => {
      if (Date.now() - wheelT < 450) return;
      wheelT = Date.now();
      whTurn((e.deltaY || e.deltaX) > 0 ? 1 : -1);
    },
    { passive: true },
  );
  let sx = null;
  $('#whome').addEventListener('pointerdown', e => (sx = e.clientX));
  $('#whome').addEventListener('pointerup', e => {
    if (sx !== null && Math.abs(e.clientX - sx) > 80) whTurn(e.clientX < sx ? 1 : -1);
    sx = null;
  });
  syncWuLayoutUi();
})();

// ---------- top bar: clock and battery ----------
function whClock() {
  const tick = () => {
    const d = new Date();
    $('#whclock b').textContent = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    $('#whclock small').textContent = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  tick();
  setInterval(tick, 10000);
}
async function whBattery() {
  const box = $('#whbatt'),
    show = (lv, txt, cls) => {
      box.style.setProperty('--lv', Math.round(lv * 100) + '%');
      box.className = 'wh-card wh-batt' + (cls ? ' ' + cls : '');
      box.querySelector('small').textContent = txt;
    };
  show(1, 'Plugged in', 'ac');
  if (!navigator.getBattery) return;
  try {
    const b = await navigator.getBattery(),
      upd = () => {
        // a desktop PC reports a full battery that is always charging
        if (b.charging && b.level >= 1) show(1, 'Plugged in', 'ac');
        else
          show(
            b.level,
            Math.round(b.level * 100) + '%',
            (b.charging ? 'chg' : '') + (b.level <= 0.2 && !b.charging ? ' low' : ''),
          );
      };
    b.addEventListener('levelchange', upd);
    b.addEventListener('chargingchange', upd);
    upd();
  } catch {}
}
// faint shapes floating in the background
function whShapes() {
  const box = $('#whshapes'),
    kinds = ['c', 'h', 't', 'd', 's'];
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 18; i++) {
    const e = document.createElement('i'),
      size = 40 + rnd() * 120;
    e.className = kinds[i % kinds.length];
    e.style.cssText =
      `--s:${size.toFixed(0)}px;--x:${(rnd() * 100).toFixed(1)}%;--y:${(rnd() * 100).toFixed(1)}%;` +
      `--mx:${(rnd() * 60 - 30).toFixed(0)}px;--my:${(rnd() * 60 - 30).toFixed(0)}px;--r:${(rnd() * 90 - 45).toFixed(0)}deg;` +
      `--d:${(14 + rnd() * 16).toFixed(1)}s;--dl:${(-rnd() * 20).toFixed(1)}s`;
    box.append(e);
  }
}

// ---------- menus behind the CosmoU logo and the power button ----------
let whMenuFor = '';
function whMenuItems(kind) {
  const nav = v => () => document.querySelector(`nav button[data-v="${v}"]`).click(),
    mode = m => () => document.querySelector(`#vt button[data-m="${m}"]`).click();
  if (kind === 'power')
    return [
      ['tv', 'TV mode', '#7b6cf0', () => toggleTv()],
      ['quit', 'Quit CosmoU', '#e5534b', () => window.close()],
    ];
  return [
    'search',
    ['lib', view === 'lib' ? 'Library ✓' : 'Library', '#f29a3c', nav('lib')],
    ['recent', view === 'recent' ? 'Recently played ✓' : 'Recently played', '#5ab55e', nav('recent')],
    ['sort', 'Sort: ' + (sortMode === 'az' ? 'A–Z' : 'Recent'), '#8b959e', () => $('#sort').click()],
    '-',
    ['view', 'Covers view', '#16b3d9', mode('covers')],
    ['grid', 'Grid view', '#1e8fe0', mode('grid')],
    ['buddy', 'Plaza', '#3aa86b', () => setWuLayout('plaza')],
    '-',
    ['post', 'Plaza posts', '#e57ac0', () => openPosts()],
    ['log', 'Daily Log', '#8a6cf0', () => openLog()],
    ['chat', 'Community', '#1e8fe0', () => (window.api ? api.openDiscord() : window.open(DISCORD_URL, '_blank'))],
    ['feedback', 'Send feedback', '#e5534b', () => openFeedback()],
  ];
}
function whMenu(kind, anchor) {
  const m = $('#whmenu');
  if (!m.hidden && whMenuFor === kind) return whMenuClose();
  whMenuFor = kind;
  m.replaceChildren();
  for (const it of whMenuItems(kind)) {
    if (it === '-') {
      m.append(document.createElement('hr'));
      continue;
    }
    if (it === 'search') {
      const q = document.createElement('input');
      q.placeholder = 'Search games';
      q.setAttribute('aria-label', 'Search games');
      q.value = $('#q').value;
      q.oninput = () => {
        $('#q').value = q.value;
        render();
      };
      q.onkeydown = e => e.key === 'Enter' && whMenuClose();
      m.append(q);
      continue;
    }
    const [ic, label, col, fn] = it,
      b = document.createElement('button'),
      chip = document.createElement('span'),
      t = document.createElement('span');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    chip.className = 'mi';
    chip.style.setProperty('--c', col);
    chip.innerHTML = WH_ICON[ic];
    t.textContent = label;
    b.append(chip, t);
    b.onclick = () => {
      whMenuClose();
      blip('open');
      fn();
    };
    m.append(b);
  }
  m.hidden = false;
  const home = $('#whome').getBoundingClientRect(),
    r = (anchor || $(kind === 'power' ? '#whpow' : '#whlogo')).getBoundingClientRect(),
    w = m.offsetWidth,
    h = m.offsetHeight;
  if (anchor) {
    // above a button of the bar at the bottom
    m.style.left = Math.max(12, Math.min(home.width - w - 12, r.left - home.left + r.width / 2 - w / 2)) + 'px';
    m.style.top = Math.max(12, r.top - home.top - h - 14) + 'px';
  } else {
    m.style.left = (kind === 'power' ? r.left - home.left - w - 14 : r.right - home.left + 14) + 'px';
    m.style.top = Math.max(12, Math.min(home.height - h - 12, r.top - home.top + r.height / 2 - h / 2)) + 'px';
  }
  blip('open');
  const first = m.querySelector('input, button');
  if (first) first.focus();
}
function whMenuClose() {
  $('#whmenu').hidden = true;
  whMenuFor = '';
}
addEventListener('pointerdown', e => {
  if (!$('#whmenu').hidden && !e.target.closest('#whmenu, #whlogo, #whpow, .wh-dk')) whMenuClose();
});
addEventListener(
  'keydown',
  e => {
    if (e.key === 'Escape' && !$('#whmenu').hidden) {
      e.stopPropagation();
      whMenuClose();
    }
  },
  true,
);

// Enter on the "+": add an app; any other way of choosing a game leaves the "+"
addEventListener(
  'keydown',
  e => {
    if (!whAdd || !isHome() || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (need()) openApp(null);
    }
  },
  true,
);
