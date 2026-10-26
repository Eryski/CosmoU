// CosmoU – Wii U Look "Home Menu" layout: a tile grid like the console's home screen (switchable with the Plaza).
const WH_COLS = 6,
  WH_ROWS = 3,
  WH_PER = WH_COLS * WH_ROWS;
let wuView = 'plaza',
  whPage = 0;
try {
  if (localStorage.getItem('cosmou.wuView') === 'home') wuView = 'home';
} catch {}
const isHome = () => mode === 'wiiu' && wuView === 'home';
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
  gear: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M14 3h4l.7 3.4 2.6 1.1 2.9-1.9 2.8 2.8-1.9 2.9 1.1 2.6L29 14v4l-3.4.7-1.1 2.6 1.9 2.9-2.8 2.8-2.9-1.9-2.6 1.1L18 29h-4l-.7-3.4-2.6-1.1-2.9 1.9L5 23.6l1.9-2.9-1.1-2.6L3 18v-4l3.4-.7 1.1-2.6L5.6 7.8l2.8-2.8 2.9 1.9 2.6-1.1zm2 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>',
  swap: '<svg viewBox="0 0 40 40"><rect x="4" y="7" width="20" height="14" rx="2.5" fill="none" stroke="#5c6a75" stroke-width="3"/><rect x="16" y="19" width="20" height="14" rx="2.5" fill="#fff" stroke="#5c6a75" stroke-width="3"/><path d="M29 7h5v5M11 33H6v-5" fill="none" stroke="#22b5df" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const WH_DOCK = [
  ['lib', 'Library', '#f29a3c', () => document.querySelector('nav button[data-v="lib"]').click()],
  ['recent', 'Recently played', '#5ab55e', () => document.querySelector('nav button[data-v="recent"]').click()],
  ['search', 'Search', '#f2c230', () => $('#q').focus()],
  ['buddy', 'Buddy maker', '#3aa86b', () => openBuddies()],
  ['chat', 'Community', '#1e8fe0', () => (window.api ? api.openDiscord() : window.open(DISCORD_URL, '_blank'))],
  ['feedback', 'Send feedback', '#e5534b', () => openFeedback()],
  ['gear', 'Settings', '#16b3d9', () => openSettings()],
];
function syncWuLayoutUi() {
  document.querySelectorAll('#wul button').forEach(b => b.classList.toggle('on', b.dataset.l === wuView));
}
function setWuLayout(v) {
  wuView = v === 'home' ? 'home' : 'plaza';
  try {
    localStorage.setItem('cosmou.wuView', wuView);
  } catch {}
  syncWuLayoutUi();
  hoverOff();
  render();
}
const whItems = l => [{ sys: 'settings', name: 'Settings' }, ...l, { sys: 'add', name: 'Add app' }];
function whSize() {
  const W = innerWidth,
    H = innerHeight,
    gap = Math.round(Math.max(10, Math.min(24, W * 0.012))),
    s = Math.floor(Math.min((W - 250 - gap * 5) / WH_COLS, (H - 314 - gap * 2) / WH_ROWS));
  return { s: Math.max(64, Math.min(200, s)), gap };
}
function buildHome(l) {
  const items = whItems(l),
    pages = Math.max(1, Math.ceil(items.length / WH_PER)),
    idx = items.findIndex(x => !x.sys && x.name === sel);
  if (idx >= 0) whPage = Math.floor(idx / WH_PER);
  whPage = Math.max(0, Math.min(pages - 1, whPage));
  const { s, gap } = whSize(),
    grid = $('#whgrid');
  grid.style.setProperty('--ts', s + 'px');
  grid.style.setProperty('--tg', gap + 'px');
  if (grid.dataset.page !== String(whPage)) {
    grid.classList.remove('swap');
    void grid.offsetWidth;
    grid.classList.add('swap');
    grid.dataset.page = whPage;
  }
  grid.replaceChildren();
  items.slice(whPage * WH_PER, (whPage + 1) * WH_PER).forEach((it, i) => {
    const t = document.createElement('button'),
      a = document.createElement('span');
    t.className = 'wh-t' + (it.sys ? ' sys' : '') + (!it.sys && it.name === sel ? ' on' : '');
    t.style.setProperty('--i', i);
    t.title = it.name;
    t.setAttribute('aria-label', it.name);
    a.className = 'wh-a';
    if (it.sys) {
      a.innerHTML = WH_ICON[it.sys];
      t.onclick = () => (it.sys === 'settings' ? openSettings() : need() && openApp(null));
    } else {
      const img = it.icon || it.cover;
      if (img) a.style.backgroundImage = `url("${img}")`;
      else paint(a, it);
      t.onclick = () => {
        if (sel === it.name) launch(it);
        else {
          sel = it.name;
          render();
        }
      };
      t.oncontextmenu = e => {
        e.preventDefault();
        sel = it.name;
        openDetail(it);
      };
      if (it.name === sel) {
        const st = document.createElement('span');
        st.className = 'wh-start';
        st.textContent = 'Start';
        a.append(st);
        const inf = document.createElement('span');
        inf.className = 'wh-i';
        inf.textContent = 'i';
        inf.title = 'Details';
        inf.onclick = e => {
          e.stopPropagation();
          openDetail(it);
        };
        t.append(inf);
      }
    }
    t.prepend(a);
    grid.append(t);
  });
  const dots = $('#whdots');
  dots.replaceChildren();
  for (let p = 0; p < pages; p++) {
    const d = document.createElement('i');
    if (p === whPage) d.className = 'on';
    dots.append(d);
  }
  $('#whprev').hidden = whPage <= 0;
  $('#whnext').hidden = whPage >= pages - 1;
  const g = cur();
  $('#whtitle').textContent = g ? g.name : '';
  drawAvatar();
}
function whTurn(d) {
  const items = whItems(list()),
    pages = Math.ceil(items.length / WH_PER),
    p = Math.max(0, Math.min(pages - 1, whPage + d));
  if (p === whPage) return;
  whPage = p;
  const first = items.slice(p * WH_PER, (p + 1) * WH_PER).find(x => !x.sys);
  if (first) sel = first.name;
  render();
}
function homeStep(dir) {
  const l = list(),
    i = l.findIndex(x => x.name === sel);
  if (i < 0) return;
  const pos = i + 1,
    col = pos % WH_COLS,
    row = Math.floor((pos % WH_PER) / WH_COLS);
  let n = pos;
  if (dir === 'l') n = col === 0 ? pos - WH_PER + WH_COLS - 1 : pos - 1;
  else if (dir === 'r') n = col === WH_COLS - 1 ? pos + WH_PER - WH_COLS + 1 : pos + 1;
  else if (dir === 'u') n = row === 0 ? pos : pos - WH_COLS;
  else if (dir === 'd') n = row === WH_ROWS - 1 ? pos : pos + WH_COLS;
  if (dir === 'r' && n - 1 >= l.length) n = Math.min(pos + 1, l.length);
  const t = l[n - 1];
  if (t && t.name !== sel) {
    sel = t.name;
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
  const dock = $('#whdock');
  for (const [ic, label, col, fn] of WH_DOCK) {
    const b = document.createElement('button');
    b.className = 'wh-dk';
    b.style.setProperty('--c', col);
    b.innerHTML = WH_ICON[ic];
    b.setAttribute('aria-label', label);
    const tip = document.createElement('span');
    tip.textContent = label;
    b.append(tip);
    b.onclick = fn;
    dock.append(b);
  }
  $('#whswap').innerHTML = WH_ICON.swap;
  $('#whswap').onclick = () => setWuLayout('plaza');
  $('#wtohome').onclick = () => setWuLayout('home');
  $('#whav').onclick = () => openBuddies();
  $('#whprev').onclick = () => whTurn(-1);
  $('#whnext').onclick = () => whTurn(1);
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
