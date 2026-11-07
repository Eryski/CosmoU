// CosmoU – the Switch 2's own interface (css/switch2.css). While the Switch 2 (or your own console with its look) is
// the console on screen, CosmoU becomes a Switch 2: dark glass, the light of the chosen game behind everything,
// a big title above a row of large squares, a dock of round buttons, a Library with filters, a full page for each
// game, Quick Settings on the Home button and soft sounds of its own. Its buttons are the Switch's (A start, B back,
// + options, Y Library and sorting, L/R console, Home Quick Settings). Nothing of the Wii U and nothing of the first
// Switch's interface is here – it has its own layout, its own motion and its own music (Mix & Match).
// It reuses the icons of the first Switch's interface (js/switch-face.js). Names start with n2… so they never meet
// the names of other scripts or theme files.

const N2_APPS = [
  ['all', 'Library', '#5aa9ff', () => n2Show('lib')],
  ['log', 'Play Activity', '#4fd18b', () => typeof openLog === 'function' && openLog()],
  ['themes', 'Themes', '#ffb24a', () => n2ThemesPop()],
  ['pads', 'Controllers', '#7c8cff', () => openSettings('controls')],
  ['consoles', 'Consoles', '#3fd7e8', () => n2ConsolesPop()],
  ['set', 'System Settings', '#b7bcc8', () => openSettings()],
  ['power', 'Power', '#ff5d73', () => n2PowerPop()],
];
const N2_SORT = { recent: 'Recent', most: 'Most played', az: 'A–Z', fav: 'Favorites' };
const n2 = {
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
  ptr: false,
  ready: false,
  bootPending: false,
  amb: '',
  ambT: 0,
  wheelT: 0,
};
const n2Ls = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem('cosmou.' + k);
    localStorage.setItem('cosmou.' + k, v);
  } catch {}
  return null;
};
n2.sort = Object.keys(N2_SORT).includes(n2Ls('n2Sort')) ? n2Ls('n2Sort') : 'recent';
const n2$ = id => document.getElementById(id);

// ---------- when it is on ----------
// the console on screen has the Switch 2's look – not "every console together", not switched off in Settings
const n2Wanted = () => !everySys && n2Ls('n2Face') !== '0' && typeof nxLookOf === 'function' && nxLookOf(curSys) === 'switch2';
function n2Apply() {
  const want = n2Wanted();
  if (want !== n2.on) {
    n2.on = want;
    document.body.classList.toggle('face-n2', want);
    if (want) n2Enter();
    else n2Leave();
  }
  if (n2.on) n2Render();
}
function n2Enter() {
  if (!n2.el) n2Build();
  n2.el.hidden = false;
  n2.scr = 'home';
  n2.zone = 'row';
  n2.sig = '';
  n2.i = 0;
  n2.amb = '';
  n2Theme();
  n2.bootPending = true;
  n2Status();
  clearInterval(n2.clock);
  n2.clock = setInterval(n2Status, 10000);
  if (typeof hoverOff === 'function') hoverOff();
}
function n2Leave() {
  if (!n2.el) return;
  n2.el.hidden = true;
  clearInterval(n2.clock);
  n2PopClose(true);
  n2QsClose(true);
  document.body.classList.remove('n2-light');
}
// Dark (the default), Light, or the one that follows light and dark
function n2Theme() {
  if (!n2.el) return;
  const t = n2Ls('n2Theme') || 'dark',
    light = t === 'light' || (t === 'auto' && !document.documentElement.classList.contains('dark'));
  n2.el.classList.toggle('light', light);
  document.body.classList.toggle('n2-light', n2.on && light);
}
new MutationObserver(() => n2.on && n2Theme()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// ---------- the games ----------
const n2GamesRaw = () =>
  games.filter(g => (g.kind === 'app' ? !g.appSys || g.appSys === 'all' || g.appSys === curSys : sysOf(g) === curSys));
// with folders (js/folders.js): the folders of this console instead of the games in them – or the open folder's games
const n2Games = () => (typeof fdView === 'function' ? fdView(n2GamesRaw()) : n2GamesRaw());
const n2Fd = l => (typeof fdFirst === 'function' ? fdFirst(l) : l);
const n2Folder = g => !!g && /^folder/.test(g.kind || '');
const n2HomeList = () =>
  n2Fd(
    n2Games()
      .slice()
      .sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name)),
  );
const n2Sec = g => (typeof secOf === 'function' ? secOf(g.name) : 0);
const n2LibList = () => n2Fd(n2LibList0());
function n2LibList0() {
  const q = n2.q.trim().toLowerCase();
  // (a search looks through every game, also the ones in folders)
  const l = (q ? n2GamesRaw() : n2Games()).filter(g => !q || g.name.toLowerCase().includes(q) || (g.tid && String(g.tid).toLowerCase().includes(q)));
  const az = (a, b) => a.name.localeCompare(b.name);
  if (n2.sort === 'az') return l.sort(az);
  if (n2.sort === 'most') return l.sort((a, b) => n2Sec(b) - n2Sec(a) || (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
  if (n2.sort === 'fav') return l.sort((a, b) => favs.has(b.name) - favs.has(a.name) || (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
  return l.sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b));
}
function n2Pick(g) {
  if (g && sel !== g.name) sel = g.name;
}
const n2PlayLine = g => {
  const p = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null;
  if (p && p.sec) return 'Played for ' + fmtDur(p.sec) + (plays[g.name] ? ' · last ' + dayName(plays[g.name]) : '');
  return plays[g.name] ? 'Last played ' + dayName(plays[g.name]) : 'Not played yet';
};
const n2Kind = g => (g.kind === 'app' ? 'App' : SYS[sysOf(g)] ? SYS[sysOf(g)].name : '');

// ---------- building the window ----------
function n2Build() {
  const el = document.createElement('div');
  el.id = 'n2';
  el.hidden = true;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', 'Switch 2');
  el.innerHTML = `
    <div class="n2-bg" aria-hidden="true"><i class="n2-amb" id="n2amb0"></i><i class="n2-amb" id="n2amb1"></i><i class="n2-orb l"></i><i class="n2-orb r"></i><i class="n2-grain"></i></div>
    <div class="n2-intro" aria-hidden="true"><i class="l"></i><i class="r"></i></div>
    <header class="n2-top">
      <div class="n2-users" id="n2users" role="group" aria-label="Consoles"></div>
      <div class="n2-stat"><span id="n2clock"></span><span id="n2wifi"></span><span class="n2-batt" id="n2batt" hidden><i></i><small></small></span></div>
    </header>
    <section class="n2-scr n2-home" id="n2home">
      <div class="n2-hero" id="n2hero" aria-live="polite"><small id="n2kick"></small><h1 id="n2title"></h1><p id="n2meta"></p></div>
      <div class="n2-rowwrap"><div class="n2-row" id="n2row"></div></div>
      <div class="n2-dock" id="n2dock" role="group" aria-label="Menu"></div>
    </section>
    <section class="n2-scr n2-lib" id="n2lib" hidden>
      <header class="n2-hd">
        <h1>Library</h1><span class="n2-count" id="n2count"></span><span class="n2-sp"></span>
        <div class="n2-chips" id="n2chips" role="radiogroup" aria-label="Sort"></div>
        <label class="n2-q">${NX_IC.search}<input id="n2q" placeholder="Search" aria-label="Search games" autocomplete="off" spellcheck="false" /></label>
      </header>
      <div class="n2-grid" id="n2grid"></div>
    </section>
    <section class="n2-scr n2-game" id="n2game" hidden>
      <div class="n2-gin">
        <div class="n2-gart" id="n2gart"></div>
        <div class="n2-ginfo">
          <small id="n2gk"></small><h1 id="n2gt"></h1><p id="n2gm"></p>
          <div class="n2-gacts" id="n2gacts" role="group" aria-label="Options"></div>
          <div class="n2-gfacts" id="n2gfacts"></div>
        </div>
      </div>
    </section>
    <footer class="n2-bot"><div class="n2-pads" id="n2pads"></div><div class="n2-hints" id="n2hints"></div></footer>
    <div class="n2-pop" id="n2pop" hidden><div class="n2-box" role="menu"></div></div>
    <div class="n2-qs" id="n2qs" hidden><div class="n2-panel" role="dialog" aria-label="Quick Settings"><div class="n2-qhd"><b id="n2qt"></b><small id="n2qd"></small></div><div class="n2-qlist" id="n2qlist"></div></div></div>`;
  document.body.insertBefore(el, $('#notes') || null);
  n2.el = el;
  // the round buttons of the dock
  const dock = n2$('n2dock');
  N2_APPS.forEach(([id, label, col, fn], k) => {
    const b = document.createElement('button');
    b.className = 'n2-a';
    b.dataset.a = id;
    b.setAttribute('aria-label', label);
    b.style.setProperty('--ac', col);
    b.innerHTML = NX_IC[id] + '<span class="n2-tip"></span>';
    b.querySelector('.n2-tip').textContent = label;
    b.onclick = () => {
      n2.zone = 'dock';
      n2.a = k;
      n2SelUi();
      n2Press(b);
      n2Snd('open');
      fn();
    };
    dock.append(b);
  });
  // the filters of the Library
  const chips = n2$('n2chips');
  for (const k of Object.keys(N2_SORT)) {
    const c = document.createElement('button');
    c.className = 'n2-chip';
    c.dataset.s = k;
    c.setAttribute('role', 'radio');
    c.textContent = N2_SORT[k];
    c.onclick = () => {
      n2SetSort(k);
      n2Snd('move');
    };
    chips.append(c);
  }
  const q = n2$('n2q');
  q.addEventListener('input', () => {
    n2.q = q.value;
    n2.ai = 0;
    n2DrawLib();
  });
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && q.value) {
        q.value = '';
        n2.q = '';
        n2DrawLib();
      } else q.blur();
    }
  });
  n2$('n2pop').addEventListener('click', e => e.target.id === 'n2pop' && n2PopClose());
  n2$('n2qs').addEventListener('click', e => e.target.id === 'n2qs' && n2QsClose());
  // the mouse wheel goes along the row, one game per notch
  n2$('n2row').parentElement.addEventListener(
    'wheel',
    e => {
      // (a list or Quick Settings on top scrolls itself – Eduard: the console list didn't scroll)
      if (n2.pop || n2.qs || e.target.closest('.n2-pop, .n2-qs')) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 4 || Date.now() - n2.wheelT < 90) return;
      n2.wheelT = Date.now();
      n2.zone = 'row';
      n2Move(d > 0 ? 'r' : 'l');
    },
    { passive: false },
  );
  // a finger: swiping the row goes along it (as far as the swipe was long); a swipe is no tap on a square
  const rw = n2$('n2row').parentElement;
  let sx = null,
    swiped = false;
  rw.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') sx = e.clientX;
  });
  rw.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx,
      t = n2$('n2row').children;
    sx = null;
    if (Math.abs(dx) < 30 || !t.length) return;
    swiped = true;
    setTimeout(() => (swiped = false), 60);
    const step = t.length > 1 ? t[1].offsetLeft - t[0].offsetLeft : t[0].offsetWidth,
      n = Math.max(1, Math.round(Math.abs(dx) / step));
    n2.zone = 'row';
    n2.i = Math.max(0, Math.min(t.length - 1, n2.i + (dx < 0 ? n : -n)));
    n2Snd('move', n2.i);
    n2SelUi();
  });
  rw.addEventListener('pointercancel', () => (sx = null));
  rw.addEventListener(
    'click',
    e => {
      if (!swiped) return;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
  // Tab (and anything else that moves the focus) moves the frame too – a click selects by itself
  el.addEventListener(
    'pointerdown',
    () => {
      n2.ptr = true;
      setTimeout(() => (n2.ptr = false), 400);
    },
    true,
  );
  el.addEventListener('focusin', e => {
    const t = e.target;
    if (n2.ptr || !t || !t.closest) return;
    const at = (box, x) => [...box.children].indexOf(x);
    if (t.matches('#n2row > .n2-t')) Object.assign(n2, { zone: 'row', i: at(n2$('n2row'), t) });
    else if (t.matches('#n2dock > .n2-a')) Object.assign(n2, { zone: 'dock', a: at(n2$('n2dock'), t) });
    else if (t.matches('#n2users > .n2-user')) Object.assign(n2, { zone: 'top', u: at(n2$('n2users'), t) });
    else if (t.matches('#n2grid .n2-t')) Object.assign(n2, { zone: 'grid', ai: at(n2$('n2grid'), t.parentElement) });
    else if (t.matches('#n2gacts > button')) n2.gi = at(n2$('n2gacts'), t);
    else return;
    n2SelUi();
  });
  addEventListener('resize', () => n2.on && n2.scr === 'home' && n2Slide());
  n2SettingsRows();
}

// ---------- drawing ----------
function n2Render() {
  if (!n2.el) return;
  n2$('n2home').hidden = n2.scr !== 'home';
  n2$('n2lib').hidden = n2.scr !== 'lib';
  n2$('n2game').hidden = n2.scr !== 'game';
  n2.el.dataset.scr = n2.scr;
  n2Users();
  if (n2.scr === 'home') n2DrawHome();
  else if (n2.scr === 'lib') n2DrawLib();
  else if (n2.scr === 'game') n2DrawGame();
  n2Hints();
  n2Pads();
}
// the other consoles in the top left: a circle each with its short name – the console on screen is not one of them
// (you are on it already), and the name under a circle is just the console's name
function n2Users() {
  const box = n2$('n2users'),
    av = sysAvail().filter(k => k !== curSys),
    key = av.map(k => k + ':' + (SYS[k] ? SYS[k].name + (SYS[k].col || '') : '')).join() + '|' + curSys;
  if (box.dataset.k !== key) {
    box.dataset.k = key;
    let shown = av;
    if (av.length > 7) shown = av.slice(0, 6);
    const kids = shown.map(k => {
      const b = document.createElement('button'),
        name = SYS[k] ? SYS[k].name : k,
        ab = NX_ABBR[k] || name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
      b.className = 'n2-user' + (ab.length > 5 ? ' long' : '');
      b.dataset.s = k;
      b.style.setProperty('--c', (SYS[k] && SYS[k].col) || NX_COL[k] || NX_COL[nxLookOf(k)] || '#8a8f98');
      b.textContent = ab;
      b.setAttribute('aria-label', name);
      const tip = document.createElement('span');
      tip.className = 'n2-tip';
      tip.textContent = name;
      b.append(tip);
      b.onclick = () => {
        n2.zone = 'top';
        n2.u = [...box.children].indexOf(b);
        n2UserGo(k);
      };
      return b;
    });
    if (av.length > shown.length) {
      const m = document.createElement('button');
      m.className = 'n2-user n2-more';
      m.dataset.s = 'more';
      m.style.setProperty('--c', '#5d6270');
      m.textContent = '+' + (av.length - shown.length);
      m.setAttribute('aria-label', 'More consoles');
      const tip = document.createElement('span');
      tip.className = 'n2-tip';
      tip.textContent = 'More consoles';
      m.append(tip);
      m.onclick = () => {
        n2.zone = 'top';
        n2.u = [...box.children].indexOf(m);
        n2Snd('open');
        n2ConsolesPop();
      };
      kids.push(m);
    }
    box.replaceChildren(...kids);
  }
  n2.u = Math.max(0, Math.min(n2.u, box.children.length - 1));
}
function n2UserGo(k) {
  if (k === curSys) return n2Snd('bump');
  n2Snd('page');
  setSystem(k);
}
// a square for a game
function n2Tile(g, k) {
  const t = document.createElement('button');
  t.className = 'n2-t';
  t.dataset.g = g.name;
  t.style.setProperty('--i', k);
  t.setAttribute('aria-label', g.name);
  const a = document.createElement('div');
  a.className = 'n2-art';
  paint(a, g);
  const shine = document.createElement('i');
  shine.className = 'n2-shine';
  t.append(a, shine);
  if (favs.has(g.name)) {
    const f = document.createElement('i');
    f.className = 'n2-fav';
    f.textContent = '★';
    t.append(f);
  }
  return t;
}
function n2DrawHome() {
  const row = n2$('n2row');
  if (!n2.ready) {
    row.replaceChildren();
    n2.sig = '';
    n2Hero(null);
    return;
  }
  const l = n2HomeList(),
    shown = l.slice(0, 12),
    many = l.length > 12,
    sig = shown.map(g => g.name + (g.cover || '') + (favs.has(g.name) ? '★' : '') + (g.kind === 'folder' ? g.format + g.col : '')).join('|') + '|' + l.length;
  if (sig !== n2.sig) {
    n2.sig = sig;
    row.replaceChildren();
    if (!l.length) {
      const e = document.createElement('button');
      e.className = 'n2-t n2-empty';
      e.dataset.empty = '1';
      e.innerHTML = '<div class="n2-art">' + NX_IC.all + '</div>';
      const own = SYS[curSys] && SYS[curSys].own && window.api && api.appSave;
      e.setAttribute('aria-label', own ? 'Add an app' : 'Add ' + SYS[curSys].name + ' games');
      e.onclick = () => (own ? openApp(null) : openSettings('general'));
      row.append(e);
    }
    shown.forEach((g, k) => {
      const t = n2Tile(g, k);
      t.onclick = () => {
        n2.zone = 'row';
        if (n2.i === k) return n2Start(g, t);
        n2.i = k;
        n2Pick(g);
        n2Snd('move');
        n2SelUi(true);
      };
      t.ondblclick = () => n2Start(g, t);
      row.append(t);
    });
    if (many) {
      const t = document.createElement('button');
      t.className = 'n2-t n2-libt';
      t.dataset.lib = '1';
      t.style.setProperty('--i', shown.length);
      t.setAttribute('aria-label', 'Library');
      t.innerHTML = `<div class="n2-art">${NX_IC.all}<b>Library</b><small></small></div>`;
      t.querySelector('small').textContent = l.length + ' games';
      t.onclick = () => {
        n2.zone = 'row';
        if (n2.i === shown.length) return n2Show('lib');
        n2.i = shown.length;
        n2Snd('move');
        n2SelUi(true);
      };
      row.append(t);
    }
    if (typeof markDeco === 'function') markDeco();
    if (n2.bootPending && l.length) {
      n2.bootPending = false;
      n2.el.classList.remove('boot');
      void n2.el.offsetWidth;
      n2.el.classList.add('boot');
      setTimeout(() => n2.el && n2.el.classList.remove('boot'), 1600);
    }
    const at = shown.findIndex(g => g.name === sel);
    if (at >= 0 && n2.zone === 'row') n2.i = at;
  }
  n2.i = Math.max(0, Math.min(n2.i, row.children.length - 1));
  n2SelUi(true);
}
// the big title above the row: the chosen game, its console and when it was played
function n2Hero(t) {
  const k = n2$('n2kick'),
    h = n2$('n2title'),
    m = n2$('n2meta');
  let kick = '',
    title = '',
    meta = '';
  const g = t && t.dataset.g ? gameOf(t.dataset.g) : null;
  if (g && n2Folder(g)) {
    kick = g.kind === 'folder' ? 'Folder' : 'Back';
    title = g.kind === 'folder' ? g.name : 'Back to Home';
    meta = g.kind === 'folder' ? String(g.format || '').split(' · ')[1] + ' · press A to open' : 'Press A or B to leave the folder';
  } else if (g) {
    kick = [...new Set([n2Kind(g), String(g.format || '').split(' · ')[1] || ''].filter(Boolean))].join(' · ');
    title = g.name;
    meta = n2PlayLine(g);
  } else if (t && t.dataset.lib) {
    kick = 'Library';
    title = 'Every game on ' + (SYS[curSys] ? SYS[curSys].name : 'this console');
    meta = n2Games().length + ' games · sort, search and filter';
  } else if (t && t.dataset.empty) {
    const own = SYS[curSys] && SYS[curSys].own;
    kick = SYS[curSys] ? SYS[curSys].name : '';
    title = own ? 'No apps here yet' : 'No games yet';
    meta = own ? 'Press A to add an app.' : 'Press A to choose your games folder and your ' + SYS[curSys].name + ' emulator.';
  } else if (!n2.ready) {
    kick = SYS[curSys] ? SYS[curSys].name : '';
    title = '';
    meta = '';
  }
  if (h.textContent !== title) {
    const hero = n2$('n2hero');
    hero.classList.remove('swap');
    void hero.offsetWidth;
    hero.classList.add('swap');
  }
  k.textContent = kick;
  h.textContent = title;
  m.textContent = meta;
  n2Ambient(g);
}
// the chosen game's colours fill the room (two layers that fade into each other)
function n2Ambient(g) {
  const url = g && g.cover ? g.cover : '',
    key = g ? g.name + '|' + url : '';
  if (key === n2.amb) return;
  n2.amb = key;
  clearTimeout(n2.ambT);
  n2.ambT = setTimeout(() => {
    const a = n2$('n2amb0'),
      b = n2$('n2amb1');
    if (!a || !b) return;
    const next = a.classList.contains('on') ? b : a,
      prev = next === a ? b : a;
    if (url) {
      next.style.background = '';
      next.style.backgroundImage = `url("${url}")`;
    } else if (g) {
      const h = hue(g.name);
      next.style.backgroundImage = '';
      next.style.background = `radial-gradient(60% 60% at 30% 40%, hsl(${h} 80% 55%), transparent), radial-gradient(50% 60% at 75% 60%, hsl(${(h + 60) % 360} 80% 45%), transparent)`;
    } else {
      next.style.backgroundImage = '';
      next.style.background = '';
    }
    next.classList.add('on');
    prev.classList.remove('on');
  }, 90);
}
function n2DrawLib() {
  const grid = n2$('n2grid'),
    l = n2LibList();
  n2$('n2count').textContent = (n2.q ? l.length + ' found' : l.length + (l.length === 1 ? ' game' : ' games')) + ' · ' + (SYS[curSys] ? SYS[curSys].name : '');
  for (const c of n2$('n2chips').children) {
    const on = c.dataset.s === n2.sort;
    c.classList.toggle('on', on);
    c.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  const sig = 'lib|' + l.map(g => g.name + (favs.has(g.name) ? '★' : '') + (g.kind === 'folder' ? g.format + g.col : '')).join('|');
  if (grid.dataset.sig !== sig) {
    grid.dataset.sig = sig;
    grid.replaceChildren();
    if (!l.length) {
      const p = document.createElement('p');
      p.className = 'n2-none';
      p.textContent = n2.q ? 'Nothing found for “' + n2.q + '”.' : 'No games yet.';
      grid.append(p);
    }
    l.forEach((g, k) => {
      const c = document.createElement('div'),
        t = n2Tile(g, k),
        b = document.createElement('b'),
        s = document.createElement('small');
      c.className = 'n2-cell';
      c.style.setProperty('--i', Math.min(k, 18));
      b.textContent = g.name;
      s.textContent = plays[g.name] ? dayName(plays[g.name]).replace(/^./, x => x.toUpperCase()) : String(g.format || '').split(' · ')[1] || n2Kind(g);
      c.append(t, b, s);
      t.onclick = () => {
        n2.zone = 'grid';
        if (n2.ai === k) return n2Start(g, t);
        n2.ai = k;
        n2Pick(g);
        n2Snd('move');
        n2SelUi(true);
      };
      t.ondblclick = () => n2Start(g, t);
      grid.append(c);
    });
    if (typeof markDeco === 'function') markDeco();
  }
  n2.ai = Math.max(0, Math.min(n2.ai, l.length - 1));
  n2SelUi(true);
}
// the row slides so the chosen square stays near the left (one square before it stays in view)
function n2Slide() {
  const row = n2$('n2row'),
    kids = row.children;
  if (!kids.length) return row.style.setProperty('--x', '0px');
  const t = kids[n2.i] || kids[0],
    step = kids.length > 1 ? kids[1].offsetLeft - kids[0].offsetLeft : t.offsetWidth,
    pad = kids[0].offsetLeft,
    last = kids[kids.length - 1],
    total = last.offsetLeft + last.offsetWidth + pad,
    room = row.parentElement.clientWidth,
    want = Math.max(0, t.offsetLeft - pad - step),
    x = Math.max(0, Math.min(want, total - room));
  row.style.setProperty('--x', -x + 'px');
}
// the frame: on the chosen square, round button, console, filter or option
function n2SelUi(scroll) {
  if (!n2.el) return;
  for (const e of n2.el.querySelectorAll('.n2-sel')) e.classList.remove('n2-sel');
  for (const e of n2.el.querySelectorAll('.n2-cell.on')) e.classList.remove('on');
  let el = null;
  if (n2.qs) el = n2$('n2qlist').children[n2.qi];
  else if (n2.pop) el = n2$('n2pop').querySelectorAll('.n2-gi')[n2.popI];
  else if (n2.zone === 'top' && n2.scr !== 'game') el = n2$('n2users').children[n2.u];
  else if (n2.scr === 'home') el = n2.zone === 'dock' ? n2$('n2dock').children[n2.a] : n2$('n2row').children[n2.i];
  else if (n2.scr === 'lib') {
    const c = n2$('n2grid').children[n2.ai];
    if (c && c.classList.contains('n2-cell')) {
      c.classList.add('on');
      el = c.querySelector('.n2-t');
    }
  } else if (n2.scr === 'game') el = n2$('n2gacts').children[n2.gi];
  n2.el.dataset.zone = n2.zone;
  if (n2.scr === 'home') {
    n2Slide();
    n2Hero(n2$('n2row').children[n2.i] || null);
  }
  if (n2.scr === 'lib' && el && el.dataset.g) n2Ambient(gameOf(el.dataset.g));
  if (el) {
    el.classList.add('n2-sel');
    // a long list: the chosen line stays in view
    if (n2.pop || n2.qs) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    else if (scroll && n2.scr === 'lib')
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const f = document.activeElement;
    if (n2.on && f !== el && el.focus && !n2.ptr && !(f && f.id === 'n2q') && !document.querySelector('dialog[open]')) el.focus({ preventScroll: true });
    if (el.dataset.g) n2Pick(gameOf(el.dataset.g));
  }
  n2Hints();
}

// ---------- the bottom bar ----------
const N2_KEYS = { a: 'A', b: 'B', x: 'X', y: 'Y', plus: '+', home: '⌂', lr: 'L R' };
function n2Hints() {
  const h = [];
  if (n2.qs) h.push(['b', 'Close'], ['a', 'OK']);
  else if (n2.pop) h.push(['b', 'Back'], ['a', 'OK']);
  else if (n2.scr === 'home') {
    if (n2.zone === 'row' && n2.el.querySelector('#n2row .n2-t.n2-sel[data-g]')) h.push(['y', 'Library'], ['plus', 'Options'], ['a', 'Start']);
    else if (n2.zone === 'top') h.push(['b', 'Back'], ['a', 'Go there']);
    else h.push(['a', 'OK']);
  } else if (n2.scr === 'lib') h.push(['y', N2_SORT[n2NextSort()]], ['b', 'Back'], ['plus', 'Options'], ['a', 'Start']);
  else if (n2.scr === 'game') h.push(['b', 'Back'], ['a', 'OK']);
  const box = n2$('n2hints'),
    key = JSON.stringify(h);
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  box.replaceChildren(
    ...h.map(([k, t]) => {
      const b = document.createElement('button');
      b.className = 'n2-hint';
      b.dataset.k = k;
      b.innerHTML = '<i></i><span></span>';
      b.querySelector('i').textContent = N2_KEYS[k];
      b.querySelector('span').textContent = t;
      b.onclick = () => ({ a: n2A, b: n2B, plus: n2Plus, y: n2Y })[k]();
      return b;
    }),
  );
}
function n2Pads() {
  const n = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length,
    box = n2$('n2pads');
  if (box.dataset.n === String(n)) return;
  box.dataset.n = String(n);
  box.replaceChildren();
  if (!n) {
    box.innerHTML = NX_IC.keys + '<small>Keyboard</small>';
    return;
  }
  for (let k = 0; k < Math.min(4, n); k++) box.insertAdjacentHTML('beforeend', NX_IC.pads);
  box.insertAdjacentHTML('beforeend', '<small>' + n + (n === 1 ? ' controller' : ' controllers') + '</small>');
}
addEventListener('gamepadconnected', () => n2.on && n2Pads());
addEventListener('gamepaddisconnected', () => n2.on && n2Pads());
function n2Status() {
  if (!n2.el) return;
  const now = new Date();
  n2$('n2clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  n2$('n2wifi').innerHTML = nxS(
    '<path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.5 12.3a9.5 9.5 0 0 1 13 0" /><path d="M8.6 15.6a5 5 0 0 1 6.8 0" /><circle cx="12" cy="19" r="1.3" fill="currentColor" />',
  );
  n2$('n2wifi').classList.toggle('off', !navigator.onLine);
  n2$('n2wifi').title = navigator.onLine ? 'Online' : 'Offline';
  if (!n2.batt && navigator.getBattery)
    navigator
      .getBattery()
      .then(b => {
        n2.batt = b;
        b.addEventListener('levelchange', n2Status);
        b.addEventListener('chargingchange', n2Status);
        n2Status();
      })
      .catch(() => {});
  const b = n2.batt,
    el = n2$('n2batt');
  el.hidden = !b || (b.charging && b.level >= 1 && !isFinite(b.dischargingTime) && !isFinite(b.chargingTime)) || (b.level >= 1 && b.charging && b.chargingTime === 0);
  if (b && !el.hidden) {
    el.querySelector('small').textContent = Math.round(b.level * 100) + '%';
    el.querySelector('i').style.setProperty('--lv', Math.max(8, Math.round(b.level * 100)) + '%');
    el.classList.toggle('low', b.level < 0.15 && !b.charging);
    el.classList.toggle('chg', !!b.charging);
  }
}

// ---------- moving ----------
function n2Move(d) {
  if (n2.qs) return n2QsMove(d);
  if (n2.pop) return n2PopMove(d);
  const was = JSON.stringify([n2.zone, n2.i, n2.a, n2.u, n2.ai, n2.gi]),
    nUsers = n2$('n2users').children.length;
  if (n2.zone === 'top' && n2.scr !== 'game') {
    if (d === 'l') n2.u = Math.max(0, n2.u - 1);
    else if (d === 'r') n2.u = Math.min(nUsers - 1, n2.u + 1);
    else if (d === 'd') n2.zone = n2.scr === 'lib' ? 'grid' : 'row';
  } else if (n2.scr === 'home') {
    const nRow = n2$('n2row').children.length;
    if (n2.zone === 'row') {
      if (d === 'l') n2.i = Math.max(0, n2.i - 1);
      else if (d === 'r') n2.i = Math.min(nRow - 1, n2.i + 1);
      else if (d === 'd') n2.zone = 'dock';
      else if (d === 'u' && nUsers) {
        n2.zone = 'top';
        n2.u = 0;
      }
    } else if (n2.zone === 'dock') {
      if (d === 'l') n2.a = Math.max(0, n2.a - 1);
      else if (d === 'r') n2.a = Math.min(N2_APPS.length - 1, n2.a + 1);
      else if (d === 'u') n2.zone = 'row';
    }
  } else if (n2.scr === 'lib') {
    const n = n2$('n2grid').querySelectorAll('.n2-cell').length,
      cols = Math.max(1, getComputedStyle(n2$('n2grid')).gridTemplateColumns.split(' ').length);
    if (d === 'l') n2.ai = Math.max(0, n2.ai - 1);
    else if (d === 'r') n2.ai = Math.min(n - 1, n2.ai + 1);
    else if (d === 'd') n2.ai = Math.min(n - 1, n2.ai + cols);
    else if (d === 'u') {
      if (n2.ai - cols >= 0) n2.ai -= cols;
      else if (nUsers) {
        n2.zone = 'top';
        n2.u = 0;
      }
    }
  } else if (n2.scr === 'game') {
    const n = n2$('n2gacts').children.length;
    if (d === 'l') n2.gi = Math.max(0, n2.gi - 1);
    else if (d === 'r') n2.gi = Math.min(n - 1, n2.gi + 1);
  }
  const now = JSON.stringify([n2.zone, n2.i, n2.a, n2.u, n2.ai, n2.gi]);
  n2Snd(now === was ? 'bump' : 'move', n2Pitch());
  if (now === was) n2Bump(d);
  n2SelUi(true);
}
// the higher the square, the higher the note: moving along the row plays a little scale
function n2Pitch() {
  if (n2.scr === 'home' && n2.zone === 'row') return n2.i;
  if (n2.scr === 'home' && n2.zone === 'dock') return n2.a + 2;
  if (n2.scr === 'lib') return n2.ai % 8;
  if (n2.scr === 'game') return n2.gi + 1;
  return 0;
}
// at the end of a row the frame leans out and springs back
function n2Bump(d) {
  const el = n2.el && n2.el.querySelector('.n2-sel');
  if (!el) return;
  el.classList.remove('bump-l', 'bump-r', 'bump-u', 'bump-d');
  void el.offsetWidth;
  el.classList.add('bump-' + d);
  setTimeout(() => el.classList.remove('bump-' + d), 320);
}
function n2Show(scr) {
  if (scr === n2.scr) return;
  if (scr === 'lib') {
    n2.back = n2.scr;
    n2.zone = 'grid';
    const at = n2LibList().findIndex(g => g.name === sel);
    n2.ai = Math.max(0, at);
  } else if (scr === 'home') n2.zone = 'row';
  n2.scr = scr;
  n2Snd('page');
  n2Render();
}

// ---------- the buttons ----------
function n2A() {
  if (n2.qs) return n2QsPress();
  if (n2.pop) return n2PopPress();
  if (n2.zone === 'top' && n2.scr !== 'game') {
    const u = n2$('n2users').children[n2.u];
    return u && u.click();
  }
  if (n2.scr === 'home') {
    if (n2.zone === 'dock') return n2$('n2dock').children[n2.a].click();
    const t = n2$('n2row').children[n2.i];
    if (!t) return;
    if (t.dataset.lib) return n2Show('lib');
    if (t.dataset.empty) return t.click();
    const g = gameOf(t.dataset.g);
    if (g) n2Start(g, t);
  } else if (n2.scr === 'lib') {
    const c = n2$('n2grid').children[n2.ai],
      t = c && c.querySelector('.n2-t'),
      g = t && gameOf(t.dataset.g);
    if (g) n2Start(g, t);
  } else if (n2.scr === 'game') {
    const b = n2$('n2gacts').children[n2.gi];
    if (b) b.click();
  }
}
function n2B() {
  if (n2.qs) return n2QsClose();
  if (n2.pop) return n2PopClose();
  if (n2.scr === 'game') {
    n2.scr = n2.back === 'lib' ? 'lib' : 'home';
    n2.zone = n2.scr === 'lib' ? 'grid' : 'row';
    n2Snd('back');
    return n2Render();
  }
  if (n2.zone === 'top') {
    n2.zone = n2.scr === 'lib' ? 'grid' : 'row';
    n2Snd('back');
    return n2SelUi(true);
  }
  // in a folder: B leaves it first
  if (typeof fdOpen !== 'undefined' && fdOpen && n2.zone !== 'dock') return fdLeave();
  if (n2.scr === 'lib') {
    n2.scr = 'home';
    n2.zone = 'row';
    n2Snd('back');
    const at = n2HomeList()
      .slice(0, 12)
      .findIndex(g => g.name === sel);
    if (at >= 0) n2.i = at;
    return n2Render();
  }
  if (n2.zone !== 'row') {
    n2.zone = 'row';
    n2Snd('back');
    return n2SelUi(true);
  }
  n2Snd('bump');
}
// + (Options): the chosen game's page
function n2Plus() {
  if (n2.qs || n2.pop) return;
  const g = n2Chosen();
  if (g) n2OpenGame(g);
  else n2Snd('bump');
}
// Y: the Library from Home, the next filter in the Library
const n2NextSort = () => {
  const ks = Object.keys(N2_SORT);
  return ks[(ks.indexOf(n2.sort) + 1) % ks.length];
};
function n2Y() {
  if (n2.qs || n2.pop) return;
  if (n2.scr === 'lib') {
    n2SetSort(n2NextSort());
    n2Snd('page');
  } else if (n2.scr === 'home') n2Show('lib');
}
function n2SetSort(k) {
  n2.sort = k;
  n2Ls('n2Sort', k);
  n2.ai = 0;
  n2DrawLib();
}
const n2Chosen = () => {
  if (n2.scr === 'home' && n2.zone === 'row') {
    const t = n2$('n2row').children[n2.i];
    return t && t.dataset.g ? gameOf(t.dataset.g) : null;
  }
  if (n2.scr === 'lib' && n2.zone !== 'top') {
    const c = n2$('n2grid').children[n2.ai],
      t = c && c.querySelector('.n2-t');
    return t ? gameOf(t.dataset.g) : null;
  }
  if (n2.scr === 'game') return n2.game;
  return null;
};
function n2Press(el) {
  if (!el) return;
  el.classList.add('press');
  setTimeout(() => el.classList.remove('press'), 160);
}
// starting a game: the square answers, the room goes dark, the game starts (css: #launch)
function n2Start(g, el) {
  n2Pick(g);
  n2Press(el);
  launch(g);
}

// ---------- a game's page ----------
function n2OpenGame(g) {
  if (!g) return;
  if (n2Folder(g)) return openDetail(g);
  n2Pick(g);
  if (n2.scr !== 'game') n2.back = n2.scr;
  n2.game = g;
  n2.gi = 0;
  n2.scr = 'game';
  n2Snd('open');
  n2Render();
}
function n2GameItems(g) {
  const app = g.kind === 'app',
    fav = favs.has(g.name),
    m = typeof markOf === 'function' ? markOf(g.name) : null;
  return [
    { id: 'start', icon: 'play', label: 'Start', big: true, run: () => n2Start(g, n2$('n2gart')) },
    { id: 'fav', icon: 'star', label: fav ? 'Favorite' : 'Add to favorites', on: fav, run: () => (toggleFav(g), n2Snd(fav ? 'off' : 'on')) },
    typeof markWheel === 'function' && { id: 'mark', icon: 'mark', label: m ? m.label : 'Mark', on: !!m, col: m ? m.col : '', run: () => markWheel(g) },
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
function n2DrawGame() {
  const g = n2.game && gameOf(n2.game.name);
  if (!g) {
    n2.scr = 'home';
    return n2Render();
  }
  n2.game = g;
  // the game's colours fill the room behind its page
  n2Ambient(g);
  const art = n2$('n2gart');
  paint(art, g);
  n2$('n2gk').textContent = [...new Set([n2Kind(g), String(g.format || '').split(' · ')[1] || ''].filter(Boolean))].join(' · ');
  n2$('n2gt').textContent = g.name;
  n2$('n2gm').textContent = n2PlayLine(g);
  const acts = n2$('n2gacts'),
    items = n2GameItems(g);
  acts.replaceChildren(
    ...items.map((it, k) => {
      const b = document.createElement('button');
      b.className = 'n2-ga' + (it.big ? ' big' : '') + (it.on ? ' on' : '');
      b.dataset.id = it.id;
      if (it.col) b.style.setProperty('--mk', it.col);
      b.innerHTML = '<span class="n2-gai">' + NX_IC[it.icon] + '</span><span class="n2-gal"></span>';
      b.querySelector('.n2-gal').textContent = it.label;
      b.setAttribute('aria-label', it.label);
      b.onclick = () => {
        n2.gi = k;
        n2SelUi();
        n2Press(b);
        if (it.id !== 'start') n2Snd('open');
        it.run();
        if (it.id === 'fav') setTimeout(() => n2.scr === 'game' && n2DrawGame(), 60);
      };
      return b;
    }),
  );
  n2.gi = Math.max(0, Math.min(n2.gi, items.length - 1));
  n2$('n2gfacts').replaceChildren(n2Facts(g));
  if (typeof markDeco === 'function') markDeco();
  n2SelUi();
}
function n2Facts(g) {
  const p = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null,
    last = (p && p.last) || plays[g.name] || 0,
    box = document.createElement('div');
  box.className = 'n2-facts';
  const parts = String(g.format || '').split(' · '),
    wiiu = sysOf(g) === 'wiiu';
  const add = (label, value, wide, full) => {
    const d = document.createElement('div'),
      s = document.createElement('small'),
      b = document.createElement('b');
    if (wide) d.className = wide;
    s.textContent = label;
    b.textContent = value || '—';
    if (full) b.title = full;
    d.append(s, b);
    box.append(d);
  };
  add('Play time', p && p.sec ? fmtDur(p.sec) : '');
  add('Sessions', p && p.sessions ? String(p.sessions) : '');
  add('Last played', last ? dayName(last).replace(/^./, c => c.toUpperCase()) : '');
  add('First played', p && p.first ? new Date(p.first).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  if (g.kind !== 'app') {
    add('Format', wiiu ? parts[0] : parts.slice(1).join(' · ') || parts[0]);
    add(wiiu ? 'Region' : 'Console', wiiu ? parts[1] || '' : SYS[sysOf(g)] ? SYS[sysOf(g)].name : '');
    if (g.tid) add('Title ID', String(g.tid).toUpperCase(), 'two');
  }
  // the file (or the dumped game's folder): its last parts – the whole path shows when you point at it
  if (g.path) {
    const full = String(g.path).replace(/[\\/]exefs[\\/]main$/, ''),
      parts = full.split(/[\\/]/).filter(Boolean),
      short = parts.length > 3 ? '…/' + parts.slice(-3).join('/') : full;
    add(g.dump ? 'Game folder' : 'File', short, 'wide', full);
  }
  return box;
}

// ---------- small lists over the screen: themes, consoles, power ----------
function n2PopOpen(title, items, at = 0) {
  const box = n2$('n2pop').querySelector('.n2-box');
  box.replaceChildren();
  const h = document.createElement('h3');
  h.textContent = title;
  box.append(h);
  items.forEach((it, k) => {
    const b = document.createElement('button');
    b.className = 'n2-gi' + (it.danger ? ' danger' : '');
    b.setAttribute('role', 'menuitem');
    b.innerHTML = (it.icon ? '<span class="n2-pi">' + NX_IC[it.icon] + '</span>' : '<span class="n2-pi"></span>') + '<span class="n2-pl"></span>' + (it.on ? '<i class="n2-ck">✓</i>' : '');
    b.querySelector('.n2-pl').textContent = it.label;
    b.onclick = () => {
      n2.popI = k;
      n2PopPress();
    };
    // only a mouse that really moves picks a line – not a line that scrolls under a resting pointer
    // (that pulled the choice back up all the time: Eduard "does not scroll down in any way")
    b.onpointermove = e => {
      if (!e.movementX && !e.movementY) return;
      if (n2.popI === k) return;
      n2.popI = k;
      n2SelUi();
    };
    box.append(b);
  });
  n2.pop = items;
  n2.popI = Math.max(0, Math.min(at, items.length - 1));
  n2$('n2pop').hidden = false;
  n2Snd('open');
  n2SelUi(true);
}
function n2PopMove(d) {
  if (d !== 'u' && d !== 'd') return;
  const was = n2.popI;
  n2.popI = Math.max(0, Math.min(n2.pop.length - 1, n2.popI + (d === 'd' ? 1 : -1)));
  n2Snd(was === n2.popI ? 'bump' : 'move', n2.popI);
  n2SelUi(true);
}
function n2PopPress() {
  const it = n2.pop && n2.pop[n2.popI];
  if (!it) return;
  n2PopClose(true);
  n2Snd('open');
  it.fn();
}
function n2PopClose(quiet) {
  if (!n2.pop) return;
  n2.pop = null;
  n2$('n2pop').hidden = true;
  if (!quiet) n2Snd('back');
  n2SelUi();
}
function n2ThemesPop() {
  const t = n2Ls('n2Theme') || 'dark',
    ks = ['dark', 'light', 'auto'];
  n2PopOpen(
    'Themes',
    [
      { label: 'Dark', icon: 'moon', on: t === 'dark', fn: () => n2SetTheme('dark') },
      { label: 'Light', icon: 'themes', on: t === 'light', fn: () => n2SetTheme('light') },
      { label: 'Follow light and dark', icon: 'tv', on: t === 'auto', fn: () => n2SetTheme('auto') },
      { label: 'Music and sounds…', icon: 'music', fn: () => openSettings('sound') },
    ],
    ks.indexOf(t),
  );
}
function n2SetTheme(t) {
  n2Ls('n2Theme', t);
  n2Theme();
  n2SettingsUi();
}
function n2ConsolesPop() {
  const av = sysAvail();
  n2PopOpen(
    'Consoles',
    [
      ...av.map(k => ({ label: SYS[k].name, icon: k === 'wiiu' ? 'wiiu' : 'consoles', on: k === curSys, fn: () => n2UserGo(k) })),
      av.length > 1 && { label: 'Everything together', icon: 'every', fn: () => setEvery(true) },
      { label: 'Add a console…', icon: 'set', fn: () => openSettings('general') },
    ].filter(Boolean),
    Math.max(0, av.indexOf(curSys)),
  );
}
function n2PowerPop() {
  n2PopOpen(
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
function n2QsItems() {
  const t = n2Ls('n2Theme') || 'dark',
    many = sysAvail().length > 1;
  return [
    { label: 'Theme', icon: 'themes', val: { dark: 'Dark', light: 'Light', auto: 'Auto' }[t], fn: () => n2SetTheme({ dark: 'light', light: 'auto', auto: 'dark' }[t]) },
    { label: 'Menu music', icon: 'music', tg: !!musicOn, fn: () => $('#mt').click() },
    { label: 'Music volume', icon: 'sound', vol: true },
    { label: 'UI sounds', icon: 'sound', tg: !!uiSounds, fn: () => $('#uis').click() },
    { label: 'TV mode', icon: 'tv', tg: !!tv, fn: () => toggleTv() },
    many && { label: 'Consoles', icon: 'consoles', val: SYS[curSys].name, fn: () => (n2QsClose(true), n2ConsolesPop()) },
    { label: 'Controllers', icon: 'pads', fn: () => (n2QsClose(true), openSettings('controls')) },
    { label: 'System Settings', icon: 'set', fn: () => (n2QsClose(true), openSettings()) },
  ].filter(Boolean);
}
function n2QsOpen() {
  if (n2.qs) return n2QsClose();
  n2PopClose(true);
  n2.qs = true;
  n2.qi = 0;
  const now = new Date();
  n2$('n2qt').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  n2$('n2qd').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  n2$('n2qs').hidden = false;
  n2QsDraw();
  n2Snd('open');
}
function n2QsDraw() {
  const box = n2$('n2qlist');
  box.replaceChildren(
    ...n2QsItems().map((it, k) => {
      if (it.vol) {
        const l = document.createElement('label');
        l.className = 'n2-gi n2-vol';
        const v = Math.round((typeof musicVol === 'function' ? musicVol() : 0.35) * 100);
        l.innerHTML = '<span class="n2-pi">' + NX_IC.sound + '</span><input type="range" min="0" max="100" step="5" aria-label="Music volume" /><span class="n2-val"></span>';
        const r = l.querySelector('input');
        r.value = v;
        r.style.setProperty('--v', v + '%');
        l.querySelector('.n2-val').textContent = v + '%';
        r.oninput = () => n2Vol(+r.value);
        l.onpointermove = e => {
          if ((!e.movementX && !e.movementY) || n2.qi === k) return;
          n2.qi = k;
          n2SelUi();
        };
        return l;
      }
      const b = document.createElement('button');
      b.className = 'n2-gi' + (it.tg ? ' tg-on' : '');
      b.innerHTML = '<span class="n2-pi">' + NX_IC[it.icon] + '</span><span class="n2-pl"></span>' + (it.tg !== undefined ? '<i class="n2-sw"></i>' : it.val ? '<span class="n2-val"></span>' : '');
      b.querySelector('.n2-pl').textContent = it.label;
      if (it.val) b.querySelector('.n2-val').textContent = it.val;
      b.onclick = () => {
        n2.qi = k;
        n2QsPress();
      };
      b.onpointermove = e => {
        if ((!e.movementX && !e.movementY) || n2.qi === k) return;
        n2.qi = k;
        n2SelUi();
      };
      return b;
    }),
  );
  n2.qi = Math.min(n2.qi, box.children.length - 1);
  n2SelUi();
}
function n2Vol(v) {
  v = Math.max(0, Math.min(100, v));
  try {
    localStorage.setItem('cosmou.musicVol', String(v));
  } catch {}
  if (typeof bgMusic !== 'undefined' && bgMusic) bgMusic.volume = v / 100;
  const r = n2$('n2qlist').querySelector('input[type=range]');
  if (r) {
    r.value = v;
    r.style.setProperty('--v', v + '%');
    r.parentElement.querySelector('.n2-val').textContent = v + '%';
  }
}
function n2QsMove(d) {
  const items = n2QsItems(),
    it = items[n2.qi];
  if (it && it.vol && (d === 'l' || d === 'r')) {
    n2Vol(Math.round((typeof musicVol === 'function' ? musicVol() : 0.35) * 100) + (d === 'r' ? 5 : -5));
    return n2Snd('move', d === 'r' ? 5 : 1);
  }
  if (d !== 'u' && d !== 'd') return;
  const was = n2.qi;
  n2.qi = Math.max(0, Math.min(items.length - 1, n2.qi + (d === 'd' ? 1 : -1)));
  n2Snd(was === n2.qi ? 'bump' : 'move', n2.qi);
  n2SelUi(true);
}
function n2QsPress() {
  const it = n2QsItems()[n2.qi];
  if (!it || it.vol) return;
  if (it.tg !== undefined) n2Snd(it.tg ? 'off' : 'on');
  it.fn();
  setTimeout(() => n2.qs && n2QsDraw(), 80);
}
function n2QsClose(quiet) {
  if (!n2.qs) return;
  n2.qs = false;
  n2$('n2qs').hidden = true;
  if (!quiet) n2Snd('back');
  n2SelUi();
}

// ---------- sounds: soft, round and a little musical (made here, no recordings) ----------
// moving plays a note of a pentatonic scale that rises along the row
const N2_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
let n2Ctx = null;
function n2Snd(kind, step = 0) {
  if (typeof uiSounds !== 'undefined' && !uiSounds) return;
  try {
    n2Ctx = n2Ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (n2Ctx.state === 'suspended') n2Ctx.resume();
    const c = n2Ctx,
      t = c.currentTime + 0.005,
      out = c.createGain();
    out.gain.value = 0.16;
    out.connect(c.destination);
    // a soft round "pop": a sine that bends a little, with a quiet octave on top
    const pop = (at, f, dur, g, bend = 0.82) => {
      for (const [mul, gg] of [
        [1, 1],
        [2, 0.18],
      ]) {
        const o = c.createOscillator(),
          e = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f * mul * 1.06, t + at);
        o.frequency.exponentialRampToValueAtTime(f * mul * bend, t + at + dur);
        e.gain.setValueAtTime(0.0001, t + at);
        e.gain.exponentialRampToValueAtTime(g * gg, t + at + 0.004);
        e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(e).connect(out);
        o.start(t + at);
        o.stop(t + at + dur + 0.02);
      }
    };
    // a little bell: a sine with a soft metallic partial (FM)
    const bell = (at, f, dur, g) => {
      const o = c.createOscillator(),
        m = c.createOscillator(),
        mg = c.createGain(),
        e = c.createGain();
      o.type = 'sine';
      m.type = 'sine';
      o.frequency.value = f;
      m.frequency.value = f * 2.01;
      mg.gain.setValueAtTime(f * 0.9, t + at);
      mg.gain.exponentialRampToValueAtTime(1, t + at + dur);
      m.connect(mg).connect(o.frequency);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + 0.006);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(out);
      o.start(t + at);
      m.start(t + at);
      o.stop(t + at + dur + 0.02);
      m.stop(t + at + dur + 0.02);
    };
    // air: a breath of filtered noise that rises (starting a game)
    const air = (at, dur, g) => {
      const len = Math.ceil(c.sampleRate * dur),
        buf = c.createBuffer(1, len, c.sampleRate),
        ch = buf.getChannelData(0);
      for (let k = 0; k < len; k++) ch[k] = (Math.random() * 2 - 1) * Math.sin((Math.PI * k) / len);
      const n = c.createBufferSource(),
        bp = c.createBiquadFilter(),
        ng = c.createGain();
      n.buffer = buf;
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(500, t + at);
      bp.frequency.exponentialRampToValueAtTime(4200, t + at + dur);
      ng.gain.value = g;
      n.connect(bp).connect(ng).connect(out);
      n.start(t + at);
    };
    const note = s => 880 * Math.pow(2, N2_SCALE[Math.max(0, Math.min(N2_SCALE.length - 1, s))] / 12);
    if (kind === 'move') pop(0, note(step) * 0.75, 0.06, 0.7);
    else if (kind === 'page') {
      pop(0, 660, 0.07, 0.6, 1.1);
      pop(0.06, 990, 0.08, 0.55, 1.08);
    } else if (kind === 'open') {
      bell(0, 1046.5, 0.22, 0.32);
      bell(0.055, 1318.5, 0.28, 0.26);
    } else if (kind === 'back') {
      pop(0, 880, 0.07, 0.6, 0.7);
      pop(0.05, 587, 0.09, 0.5, 0.75);
    } else if (kind === 'bump') pop(0, 196, 0.11, 0.9, 0.85);
    else if (kind === 'on') {
      bell(0, 1174.7, 0.16, 0.28);
      bell(0.06, 1760, 0.22, 0.24);
    } else if (kind === 'off') {
      bell(0, 1760, 0.14, 0.22);
      bell(0.06, 1174.7, 0.2, 0.24);
    } else if (kind === 'start') {
      air(0, 0.7, 0.22);
      bell(0.05, 1046.5, 0.5, 0.3);
      bell(0.13, 1318.5, 0.5, 0.26);
      bell(0.21, 1568, 0.6, 0.24);
      bell(0.29, 1975.5, 0.9, 0.22);
    } else pop(0, 900, 0.06, 0.6);
  } catch {}
}
const _blipN2 = blip;
blip = function (kind) {
  if (n2.on) return n2Snd(kind);
  return _blipN2.apply(this, arguments);
};

// ---------- the rest of CosmoU, Switch 2 style while it is on ----------
const _renderN2 = render;
render = function () {
  const r = _renderN2.apply(this, arguments);
  n2Apply();
  return r;
};
const _applySystemN2 = applySystem;
applySystem = function () {
  const r = _applySystemN2.apply(this, arguments);
  n2.ready = true;
  n2Apply();
  return r;
};
const _openDetailN2 = openDetail;
openDetail = function (g) {
  if (n2.on) return n2OpenGame(g);
  return _openDetailN2.apply(this, arguments);
};
const _gameMenuN2 = gameMenu;
gameMenu = function (g) {
  if (n2.on) return n2OpenGame(g);
  return _gameMenuN2.apply(this, arguments);
};
const _openQuickN2 = openQuick;
openQuick = function () {
  if (n2.on) {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    return n2QsOpen();
  }
  return _openQuickN2.apply(this, arguments);
};
if (typeof openThemes === 'function') {
  const _openThemesN2 = openThemes;
  openThemes = function () {
    if (n2.on) return n2ThemesPop();
    return _openThemesN2.apply(this, arguments);
  };
}
// starting a game: the screen fills with the game's colours, its square in the middle (css: body.face-n2 #launch)
const _launchN2 = launch;
launch = function (g) {
  const a = document.getElementById('launch');
  if (a) a.style.setProperty('--n2-cover', n2.on && g && g.cover ? `url("${g.cover}")` : 'none');
  return _launchN2.apply(this, arguments);
};
addEventListener(
  'contextmenu',
  e => {
    if (!n2.on || !e.target.closest || !e.target.closest('#n2')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const t = e.target.closest('[data-g]'),
      g = t && gameOf(t.dataset.g);
    if (g) n2OpenGame(g);
  },
  true,
);

// ---------- keyboard: the same as the controller ----------
addEventListener(
  'keydown',
  e => {
    if (!n2.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen())) return;
    if ($('#launch').classList.contains('on') || $('#setup').classList.contains('on')) return;
    if (e.target && e.target.id === 'n2q') return;
    const k = e.key,
      stop = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
    const dir = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[k];
    if (dir) return stop(), n2Move(dir);
    if (k === 'Enter' || k === ' ') return stop(), n2A();
    if (k === 'Escape' || k === 'Backspace') return stop(), n2B();
    if (['+', '=', 'o', 'O', 'i', 'I', 'x', 'X', 'ContextMenu'].includes(k)) return stop(), n2Plus();
    if (['y', 'Y', 's', 'S'].includes(k)) return stop(), n2.qs || n2.pop ? null : n2Y();
    if (k === '/') {
      stop();
      if (n2.scr !== 'lib') n2Show('lib');
      return setTimeout(() => n2$('n2q').focus(), 30);
    }
    if (k === 'q' || k === 'Q' || k === 'Home') return stop(), n2QsOpen();
    if (k === 't' || k === 'T') return stop(), n2ThemesPop();
    if (k === 'PageUp' || k === 'PageDown') return stop(), typeof sysNext === 'function' && sysNext(k === 'PageDown' ? 1 : -1);
    if (['l', 'L', 'r', 'R', '*', '1', '2', '3', 'g', 'G', 'm', 'M', 'h', 'H'].includes(k)) return stop();
  },
  true,
);
addEventListener(
  'keyup',
  e => {
    if (n2.on && (e.key === ' ' || e.key === 'Enter') && e.target && e.target.closest && e.target.closest('#n2') && e.target.id !== 'n2q') e.preventDefault();
  },
  true,
);

// ---------- controller (called by the controller loop in js/feedback-style-controller.js) ----------
// A start · B back · + / X options · Y Library and its filters · L/R console · − TV mode · Home Quick Settings ·
// left stick: clicked = favorite, held = marks
function n2Pad(fire, s, open, busy, now) {
  if (!n2.on || busy) return false;
  if (fire.hm) {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    n2QsOpen();
    return true;
  }
  if (open || (typeof mkIsOpen === 'function' && mkIsOpen())) return false;
  for (const k of ['l', 'r', 'u', 'd']) if (fire[k]) n2Move(k);
  if (fire.a) n2A();
  else if (fire.b) n2B();
  if (fire.st || fire.x) n2Plus();
  if (fire.y) n2Y();
  if (fire.sl && typeof toggleTv === 'function') toggleTv();
  if ((fire.lb || fire.rb) && !n2.qs && !n2.pop && typeof sysNext === 'function') sysNext(fire.rb ? 1 : -1);
  if (s.l3 && !n2.l3) {
    n2.l3 = now;
    n2.l3Done = false;
  }
  if (s.l3 && n2.l3 && !n2.l3Done && now - n2.l3 > 450 && n2Chosen() && typeof markWheel === 'function') {
    n2.l3Done = true;
    markWheel(n2Chosen());
  }
  if (!s.l3 && n2.l3) {
    if (!n2.l3Done && n2Chosen()) toggleFav(n2Chosen());
    n2.l3 = 0;
  }
  return true;
}

// ---------- Settings → Appearance: the Switch 2's interface on or off, and its theme ----------
function n2SettingsRows() {
  const pane = document.querySelector('#sxbd .pane[data-c="look"]');
  if (!pane || n2$('n2setgrp')) return;
  const wrap = document.createElement('div');
  wrap.id = 'n2setgrp';
  wrap.innerHTML = `<h3 class="sh">Switch 2</h3>
    <div class="grp">
      <div class="set" data-k="switch 2 interface own look home library quick settings face">
        <div class="lbl"><strong>Its own interface</strong><small>With the Switch 2 on screen, CosmoU looks and works like a Switch 2 – Home, Library, a page for each game, Quick Settings</small></div>
        <button class="tg" id="n2face">On</button>
      </div>
      <div class="set" data-k="switch 2 theme dark light">
        <div class="lbl"><strong>Switch 2 theme</strong><small>Dark, Light, or the one that follows light and dark</small></div>
        <div class="seg" id="n2thm"><button data-t="dark">Dark</button><button data-t="light">Light</button><button data-t="auto">Auto</button></div>
      </div>
    </div>`;
  const views = [...pane.querySelectorAll(':scope > .sh')].find(h => /^views$/i.test(h.textContent.trim()));
  pane.insertBefore(wrap, views || null);
  n2$('n2face').onclick = () => {
    const off = n2Ls('n2Face') === '0';
    n2Ls('n2Face', off ? '1' : '0');
    n2SettingsUi();
    blip(off ? 'open' : 'back');
    n2Apply();
    render();
  };
  document.querySelectorAll('#n2thm button').forEach(b => (b.onclick = () => (n2SetTheme(b.dataset.t), blip('move'))));
  n2SettingsUi();
}
function n2SettingsUi() {
  const g = n2$('n2setgrp');
  if (!g) return;
  g.hidden = !(typeof sysAvail === 'function' && sysAvail().some(k => nxLookOf(k) === 'switch2'));
  const on = n2Ls('n2Face') !== '0';
  n2$('n2face').textContent = on ? 'On' : 'Off';
  n2$('n2face').classList.toggle('on', on);
  const t = n2Ls('n2Theme') || 'dark';
  document.querySelectorAll('#n2thm button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
}
if (typeof sxRender === 'function') {
  const _sxRenderN2 = sxRender;
  sxRender = function (id) {
    const r = _sxRenderN2.apply(this, arguments);
    if (id === 'look') {
      if (!n2$('n2setgrp')) n2SettingsRows();
      n2SettingsUi();
    }
    return r;
  };
}
n2Apply();
