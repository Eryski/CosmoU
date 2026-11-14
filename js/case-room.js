// CosmoU – the Case Room: the second menu of the Switch and the Switch 2 (css/case-room.css).
// Home is the first menu (js/switch-face.js, js/switch2-face.js). The Case Room shows the console's games as real
// 3D cases – a carousel, a vertical stack or a flipbook. The chosen game's cartridge slides out from behind its case.
// "Open case" brings the case close: turn it (mouse, stick, arrows), zoom, flip it to the back, open it – the booklet
// on the left, the cartridge flies out of its slot. X (or C, the round button, or "Home | Case Room" at the top)
// switches between the two menus, and every console remembers which one it had.
// Names start with cz… so they never meet the names of other scripts or theme files.

const CZ_LAYS = {
  carousel: {
    name: 'Carousel',
    kick: 'Physical media',
    head: 'Real cases. Real character.',
    sub: 'Choose a game – its cartridge slides out of the case.',
    acc: '#ff8a3d',
    r: 7,
  },
  stack: {
    name: 'Vertical stack',
    kick: 'Vertical stack',
    head: 'From top to bottom.',
    sub: 'The same collection, another way to look at it.',
    acc: '#45d4ff',
    r: 4,
  },
  flip: {
    name: 'Flipbook',
    kick: 'Flipbook',
    head: 'Turn through your games.',
    sub: 'Like a book: each case lies open – the booklet on the left, the cartridge in its slot.',
    acc: '#b48cff',
    r: 6,
  },
};
const CZ_LAY_ORDER = ['carousel', 'stack', 'flip'];
const CZ_LOOK = { kick: 'A closer look', head: 'Open the case.', sub: 'Turn it, zoom in, flip it – and see what is inside.' };
const czS = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const CZ_IC = {
  home: czS('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
  cases: czS('<rect x="3" y="4" width="6.5" height="16" rx="1.2"/><rect x="11.5" y="4" width="9.5" height="16" rx="1.4"/><path d="M11.5 7.5h9.5M3 7h6.5"/>'),
  carousel: czS('<rect x="8" y="5" width="8" height="14" rx="1.3"/><path d="M5 7.5v9M2.5 9v6M19 7.5v9M21.5 9v6"/>'),
  stack: czS('<rect x="7" y="2.5" width="10" height="5" rx="1"/><rect x="5" y="9.5" width="14" height="5" rx="1"/><rect x="7" y="16.5" width="10" height="5" rx="1"/>'),
  flip: czS('<path d="M12 6.5C9.5 4.8 6.5 4.5 3 5v13.5c3.5-.5 6.5-.2 9 1.5 2.5-1.7 5.5-2 9-1.5V5c-3.5-.5-6.5-.2-9 1.5z"/><path d="M12 6.5V20"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  open: czS('<path d="M4 5.5h7v14H4z"/><path d="M11 5.5 19.5 3v14.5L11 19.5"/>'),
  opts: czS('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  star: czS('<path d="m12 3.2 2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.1 6-.8z"/>'),
  flipc: czS('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20.5v-5h5"/>'),
  back: czS('<path d="M15 5 8 12l7 7"/>'),
  art: czS('<rect x="3.5" y="4" width="17" height="16" rx="2.2"/><circle cx="9" cy="9.5" r="1.6"/><path d="m5 18 5-5 3.5 3.5 2.5-2.5 3.5 3.5"/>'),
  info: czS('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor"/>'),
  arrow: czS('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
const cz = {
  on: false,
  el: null,
  face: '',
  sys: '',
  seen: '',
  list: [],
  sig: '',
  i: 0,
  lay: 'carousel',
  els: new Map(),
  W: 200,
  W2: 260,
  amb: '',
  // the closer look
  lk: false,
  lkEl: null,
  lid: false,
  flip: false,
  rx: 8,
  ry: -22,
  zoom: 1,
  // input
  drag: null,
  moved: false,
  wheelT: 0,
  pad: false,
  l3: 0,
  l3Done: false,
  // back from a game's page (Options) to the Case Room
  ret: false,
  t: {},
};
const czLs = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem('cosmou.' + k);
    localStorage.setItem('cosmou.' + k, v);
  } catch {}
  return null;
};
cz.lay = CZ_LAYS[czLs('czLay')] ? czLs('czLay') : 'carousel';
const czRatio = {};
const czFace = () => (typeof nx === 'object' && nx.on ? 'switch' : typeof n2 === 'object' && n2.on ? 'switch2' : '');
const czIsOn = () => cz.on;
const czG = () => cz.list[cz.i] || null;
const cz$ = id => document.getElementById(id);
const czSysName = g => (typeof SYS === 'object' && SYS[g ? sysOf(g) : curSys] ? SYS[g ? sysOf(g) : curSys].name : '');
function czSnd(kind) {
  try {
    if (cz.face === 'switch2' && typeof n2Snd === 'function') return n2Snd(kind);
    if (typeof nxSnd === 'function') return nxSnd(kind);
  } catch {}
}

// ---------- the games: every game of the console on screen, A–Z (no apps, the games inside folders too) ----------
function czGames() {
  return games
    .filter(g => g.kind !== 'app' && !/^folder/.test(g.kind || '') && sysOf(g) === curSys)
    .sort((a, b) => a.name.localeCompare(b.name));
}
const czSigOf = l => l.map(g => g.name + '\u0001' + (g.cover || '')).join('\u0002');

// ---------- opening and closing ----------
function czOpen(quiet) {
  const f = czFace();
  if (!f) return;
  if (!cz.el) czBuild();
  cz.ret = false;
  czLs('czMenu.' + curSys, 'col');
  if (cz.on && cz.face === f && cz.sys === curSys) return;
  // the small windows of Home close first
  try {
    if (f === 'switch') nxPopClose(true), nxQsClose(true);
    else n2PopClose(true), n2QsClose(true);
  } catch {}
  if (typeof hoverOff === 'function') hoverOff();
  cz.on = true;
  cz.face = f;
  cz.seen = czSeenKey();
  cz.el.hidden = false;
  cz.el.dataset.face = f;
  document.body.classList.add('cz-on');
  czLoad(true);
  cz.el.classList.remove('cz-in');
  void cz.el.offsetWidth;
  cz.el.classList.add('cz-in');
  clearTimeout(cz.t.in);
  cz.t.in = setTimeout(() => cz.el && cz.el.classList.remove('cz-in'), 1400);
  czMenusUi();
  if (!quiet) czSnd('page');
  czLiteCheck();
}
// a slow computer (no graphics card): the first time the Case Room opens, its frames are measured – too slow, and
// the expensive light goes (the floor's reflection, the depth of field, the big blur); cosmou.czLite: 1 always, 0 never
function czLiteCheck() {
  const force = czLs('czLite');
  if (force === '1' || force === '0') return cz.el.classList.toggle('cz-lite', force === '1');
  if (cz.liteDone) return;
  cz.liteDone = true;
  let n = 0,
    slow = 0;
  const t0 = performance.now();
  let last = t0;
  const f = now => {
    const dt = now - last;
    last = now;
    if (n++ > 3 && dt > 50) slow++;
    if (now - t0 < 1500 && cz.on) return requestAnimationFrame(f);
    if (n > 5 && ((now - t0) / n > 40 || slow > 8)) cz.el.classList.add('cz-lite');
  };
  requestAnimationFrame(f);
}
// keep: the console keeps the Case Room as its menu (a game's page, Quick Settings, another console)
function czClose(keep) {
  if (!cz.on) return;
  czPopClose(true);
  if (cz.lk) czLookEnd(true);
  cz.on = false;
  cz.el.hidden = true;
  document.body.classList.remove('cz-on');
  if (!keep && cz.sys) czLs('czMenu.' + cz.sys, 'home');
  czMenusUi();
  if (!keep) czSnd('back');
  // Home shows the game chosen here when it is one of its squares
  try {
    if (cz.face === 'switch' && nx.on) {
      const at = nxHomeList()
        .slice(0, 12)
        .findIndex(g => g.name === sel);
      if (at >= 0 && nx.scr === 'home') (nx.i = at), (nx.zone = 'row');
      nxRender();
    } else if (cz.face === 'switch2' && n2.on) {
      const at = n2HomeList()
        .slice(0, 12)
        .findIndex(g => g.name === sel);
      if (at >= 0 && n2.scr === 'home') (n2.i = at), (n2.zone = 'row');
      n2Render();
    }
  } catch {}
}
function czToggle() {
  if (cz.on) czClose();
  else czOpen();
}
const czSeenKey = () => czFace() + '|' + curSys + '|' + (typeof everySys !== 'undefined' && everySys ? 1 : 0);
// after every render: the console changed (L/R, the console picker) – its own menu; the games changed – new cases
function czSync() {
  czMenusInject();
  const f = czFace(),
    key = czSeenKey();
  if (key !== cz.seen) {
    cz.seen = key;
    cz.ret = false;
    if (!f) {
      if (cz.on) czClose(true);
    } else if (czLs('czMenu.' + curSys) === 'col') {
      if (!cz.on) czOpen(true);
      else {
        cz.face = f;
        cz.el.dataset.face = f;
        czLoad(true);
      }
    } else if (cz.on) czClose(true);
    return;
  }
  if (!cz.on) return;
  if (czSigOf(czGames()) !== cz.sig) czLoad(false);
  else czInfo();
}

// ---------- building ----------
function czBuild() {
  const el = document.createElement('div');
  el.id = 'cz';
  el.hidden = true;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', 'Case Room');
  el.innerHTML = `
    <div class="cz-bg" aria-hidden="true"><i class="cz-amb" id="czamb0"></i><i class="cz-amb" id="czamb1"></i><i class="cz-vig"></i><i class="cz-grain"></i></div>
    <header class="cz-top">
      <div class="cz-menus" id="czmenus"></div>
      <div class="cz-sys" id="czsyss" role="tablist" aria-label="Consoles"></div>
      <div class="cz-lays" id="czlays" role="radiogroup" aria-label="Layout"></div>
    </header>
    <div class="cz-crumb"><span><i></i><b id="czcrumb"></b></span><span id="czcount"></span></div>
    <div class="cz-stage" id="czstage"><div class="cz-world" id="czworld"></div></div>
    <button class="cz-arr prev" id="czprev" aria-label="Previous game">${CZ_IC.arrow}</button>
    <button class="cz-arr next" id="cznext" aria-label="Next game">${CZ_IC.arrow}</button>
    <div class="cz-prog"><span id="czpos"></span><i><b id="czbar"></b></i><small id="czhint">Choose a game · open its case to look closer</small></div>
    <section class="cz-info" id="czinfo" aria-live="polite">
      <div class="cz-kick"><b id="czsys"></b><span id="czn"></span><em id="czmedia"></em></div>
      <h1 id="czname"></h1>
      <p id="czmeta"></p>
      <div class="cz-btns" id="czbtns"></div>
    </section>
    <aside class="cz-card" id="czcard"><small></small><b></b><span></span></aside>
    <div class="cz-empty" id="czempty" hidden><b></b><span>Add a games folder for it in Settings → Games &amp; Consoles.</span></div>
    <div class="cz-lk" id="czlk" hidden>
      <div class="cz-lstage" id="czlstage"><div class="cz-lfly" id="czlfly"><div class="cz-lworld" id="czlworld"></div></div></div>
      <div class="cz-linfo"><small id="czlsys"></small><h2 id="czlname"></h2></div>
      <div class="cz-lbtns" id="czlbtns"></div>
    </div>
    <footer class="cz-keys" id="czkeys"></footer>`;
  document.body.insertBefore(el, $('#notes') || null);
  cz.el = el;
  czMenus(cz$('czmenus'));
  // the three layouts
  const lays = cz$('czlays');
  for (const k of CZ_LAY_ORDER) {
    const b = document.createElement('button');
    b.dataset.l = k;
    b.setAttribute('role', 'radio');
    b.innerHTML = CZ_IC[k] + '<span></span>';
    b.querySelector('span').textContent = CZ_LAYS[k].name.replace('Vertical stack', 'Stack');
    b.onclick = () => czSetLay(k);
    lays.append(b);
  }
  lays.insertAdjacentHTML('beforeend', '<kbd>Y</kbd>');
  cz$('czprev').onclick = () => czMove(-1);
  cz$('cznext').onclick = () => czMove(1);
  // browsing with the mouse: the wheel, a drag (or a swipe)
  const st = cz$('czstage');
  st.addEventListener(
    'wheel',
    e => {
      if (!cz.on || cz.lk) return;
      e.preventDefault();
      const now = performance.now(),
        v = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (now - cz.wheelT < 110 || Math.abs(v) < 4) return;
      cz.wheelT = now;
      czMove(v > 0 ? 1 : -1);
    },
    { passive: false },
  );
  st.addEventListener('pointerdown', e => {
    if (cz.lk || e.button) return;
    cz.drag = { x: e.clientX, y: e.clientY };
    cz.moved = false;
  });
  // the closer look: drag turns the case, the wheel zooms, a click opens or closes it
  const lk = cz$('czlk');
  lk.addEventListener('pointerdown', e => {
    if (!cz.lk || e.button || e.target.closest('button')) return;
    cz.drag = { x: e.clientX, y: e.clientY, look: true };
    cz.moved = false;
    cz$('czlworld').classList.add('cz-drag');
  });
  lk.addEventListener(
    'wheel',
    e => {
      if (!cz.lk) return;
      e.preventDefault();
      czZoom(e.deltaY < 0 ? 0.08 : -0.08);
    },
    { passive: false },
  );
  lk.addEventListener('click', e => {
    if (!cz.lk || cz.moved || e.target.closest('button')) return;
    if (e.target.closest('.cz-case')) czLid(!cz.lid);
  });
  addEventListener('pointermove', e => {
    if (!cz.drag || !cz.on) return;
    const dx = e.clientX - cz.drag.x,
      dy = e.clientY - cz.drag.y;
    if (cz.drag.look) {
      if (Math.abs(dx) + Math.abs(dy) > 3) cz.moved = true;
      cz.ry += dx * 0.45;
      cz.rx = Math.max(-45, Math.min(45, cz.rx - dy * 0.35));
      cz.drag.x = e.clientX;
      cz.drag.y = e.clientY;
      czLookApply();
      return;
    }
    const d = cz.lay === 'stack' ? dy : dx;
    if (Math.abs(d) > 64) {
      cz.moved = true;
      czMove(d < 0 ? 1 : -1);
      cz.drag.x = e.clientX;
      cz.drag.y = e.clientY;
    }
  });
  addEventListener('pointerup', () => {
    if (!cz.drag) return;
    cz.drag = null;
    if (cz.el) cz$('czlworld').classList.remove('cz-drag');
    // (the click right after a drag does not count)
    setTimeout(() => (cz.moved = false), 0);
  });
  addEventListener('resize', () => {
    if (!cz.on) return;
    czSize();
    czPlace(true);
    if (cz.lk) czLookSize();
  });
}
// "Home | Case Room": at the top of both menus (and of the Switch interfaces' Home)
function czMenus(box) {
  box.classList.add('cz-menus');
  box.setAttribute('role', 'tablist');
  box.innerHTML = `<button data-m="home" role="tab">${CZ_IC.home}<span>Home</span></button><button data-m="col" role="tab">${CZ_IC.cases}<span>Case Room</span></button><kbd>X</kbd>`;
  box.querySelector('[data-m="home"]').onclick = e => {
    e.stopPropagation();
    if (cz.on) czClose();
  };
  box.querySelector('[data-m="col"]').onclick = e => {
    e.stopPropagation();
    czOpen();
  };
  czMenusUi();
}
function czMenusInject() {
  for (const [top, stat] of [
    ['#nx .nx-top', '.nx-stat'],
    ['#n2 .n2-top', '.n2-stat'],
  ]) {
    const t = document.querySelector(top);
    if (t && !t.querySelector('.cz-menus')) {
      // between the consoles (left) and the clock (right)
      const d = document.createElement('div');
      t.insertBefore(d, t.querySelector(stat));
      czMenus(d);
    }
  }
}
function czMenusUi() {
  document.querySelectorAll('.cz-menus button').forEach(b => {
    const on = (b.dataset.m === 'col') === cz.on;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

// ---------- a case: plastic, the cover in its sleeve, a spine, a back – and the cartridge ----------
// the CosmoU symbol in the red field of a cover: its "c" and "U", drawn in one line each
const CZ_SYM = '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M25.5 9.5A12 12 0 1 0 25.5 30.5" stroke-width="6.5"/><path d="M33 7.5V21a10.5 10.5 0 0 0 21 0V7.5" stroke-width="6.5"/></svg>';
// the pictures for the red field: { all, switch, switch2 } (main.js badges)
let czBadge = {};
async function czBadgesLoad() {
  try {
    czBadge = (window.api && api.badges && (await api.badges())) || {};
  } catch {
    czBadge = {};
  }
  // (the cases are made again – now or the next time the Case Room opens)
  cz.sig = '';
  if (cz.on) czLoad(true);
}
czBadgesLoad();
function czCase(g, full) {
  const e = document.createElement('div'),
    s2 = typeof nxLookOf === 'function' && nxLookOf(sysOf(g)) === 'switch2';
  e.className = 'cz-case' + (s2 ? ' cz-s2' : '');
  e.dataset.g = g.name;
  // your own picture for the red field (Settings → Games & Consoles → Covers): this console's, or the one for all
  const bimg = czBadge[s2 ? 'switch2' : 'switch'] || czBadge.all;
  if (bimg) {
    e.classList.add('cz-ownb');
    e.style.setProperty('--bimg', `url("${bimg}")`);
  }
  e.innerHTML = `
    <i class="cz-halo"></i>
    <div class="cz-box">
      <div class="cz-back"><i class="cz-f cz-bo"></i>${full ? '<i class="cz-f cz-bi"><i class="cz-slot"></i><i class="cz-rib t"></i><i class="cz-rib b"></i><i class="cz-hub"></i></i>' : ''}</div>
      <i class="cz-sd l"><span class="cz-sb"><em></em></span><b></b><i class="cz-seam"></i></i>
      <i class="cz-sd r"></i><i class="cz-tb t"></i><i class="cz-tb b"></i>
      <div class="cz-lid">
        <i class="cz-f cz-lo"><b class="cz-ins"><span class="cz-band"><i class="cz-sym">${CZ_SYM}</i><em></em></span><span class="cz-pic"></span></b><i class="cz-gls"></i></i>
        ${
          full
            ? `<i class="cz-f cz-li"><i class="cz-clip t"></i><i class="cz-clip b"></i><i class="cz-tab"></i></i>
        <div class="cz-bk"><i class="cz-bkf"><span class="cz-band"><i class="cz-sym">${CZ_SYM}</i><em></em></span><span class="cz-pic cz-bkp"></span><small>Instruction booklet</small></i><i class="cz-bkb"><b></b><i></i><i></i><i></i><i></i></i></div>`
            : ''
        }
      </div>
    </div>
    <div class="cz-cart"><i class="cz-cf"><b class="cz-lab"><span class="cz-lband"><em></em></span><span class="cz-pic cz-lpic"></span></b></i><i class="cz-cb"><i></i></i><i class="cz-ce l"></i><i class="cz-ce r"></i><i class="cz-ce t"></i><i class="cz-ce b"></i></div>
    <i class="cz-shd"></i>`;
  e.querySelectorAll('.cz-band em, .cz-sb em, .cz-lband em').forEach(x => czBandText(x, g));
  e.querySelector('.cz-sd.l b').textContent = g.name;
  czPic(e.querySelector('.cz-ins .cz-pic'), g, true);
  czPic(e.querySelector('.cz-lpic'), g, false);
  if (full) {
    czPic(e.querySelector('.cz-bkp'), g, true);
    e.querySelector('.cz-bkb b').textContent = g.name;
    czBack(e.querySelector('.cz-bo'), g);
  }
  return e;
}
// the console on the band: "SWITCH" – or "SWITCH" with a "2" of its own on the Switch 2
function czBandText(x, g) {
  const cn = czSysName(g).toUpperCase(),
    m = typeof nxLookOf === 'function' && nxLookOf(sysOf(g)) === 'switch2' && cn.match(/^(.*\S)\s*2$/);
  if (!m) return (x.textContent = cn);
  x.textContent = m[1] + ' ';
  const b = document.createElement('b');
  b.textContent = '2';
  x.append(b);
}
// a picture of the game: a tall box art fills it; a square picture (the eShop's) sits on top of itself, blurred,
// with the game's name below – nothing cut off; no picture: its colours and its name
function czPic(el, g, title) {
  if (!g.cover) {
    const h = hue(g.name);
    el.dataset.shape = 'none';
    el.style.background = `linear-gradient(150deg,hsl(${h} 72% 58%),hsl(${(h + 50) % 360} 76% 36%))`;
    if (title) {
      const t = document.createElement('strong');
      t.textContent = g.name;
      el.append(t);
    }
    return;
  }
  el.style.setProperty('--img', `url("${g.cover}")`);
  // (the pictures are backgrounds: they are drawn the moment the case is – no empty cover first)
  const bl = document.createElement('i'),
    im = document.createElement('i');
  bl.className = 'cz-blur';
  im.className = 'cz-img';
  el.append(bl, im);
  if (title) {
    const t = document.createElement('strong');
    t.textContent = g.name;
    el.append(t);
  }
  const shape = r => (el.dataset.shape = r < 0.8 ? 'tall' : 'sq');
  if (czRatio[g.cover]) shape(czRatio[g.cover]);
  else {
    el.dataset.shape = 'sq';
    const probe = new Image();
    probe.onload = () => {
      if (!probe.naturalWidth || !probe.naturalHeight) return;
      czRatio[g.cover] = probe.naturalWidth / probe.naturalHeight;
      shape(czRatio[g.cover]);
    };
    probe.onerror = () => (el.dataset.shape = 'none');
    probe.src = g.cover;
  }
}
// the back of the case: the game's facts
function czBack(el, g) {
  el.innerHTML = '<span class="cz-band"><em></em></span><i class="cz-bblur"></i><div class="cz-btx"><b></b><dl></dl></div><i class="cz-bpic"></i><i class="cz-code"></i>';
  czBandText(el.querySelector('.cz-band em'), g);
  el.querySelector('.cz-btx b').textContent = g.name;
  if (g.cover) {
    el.querySelector('.cz-bblur').style.backgroundImage = `url("${g.cover}")`;
    el.querySelector('.cz-bpic').style.backgroundImage = `url("${g.cover}")`;
  } else {
    const h = hue(g.name);
    el.querySelector('.cz-bblur').style.background = `linear-gradient(150deg,hsl(${h} 60% 40%),hsl(${(h + 50) % 360} 60% 22%))`;
    el.querySelector('.cz-bpic').hidden = true;
  }
  const dl = el.querySelector('dl');
  for (const [k, v] of czFacts(g)) {
    const dt = document.createElement('dt'),
      dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    dl.append(dt, dd);
  }
}
function czFacts(g) {
  const p = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null,
    parts = String(g.format || '').split(' · '),
    out = [];
  out.push(['Format', parts.slice(1).join(' · ') || parts[0] || '—']);
  if (g.tid) out.push(['Title ID', String(g.tid).toUpperCase()]);
  if (p && p.sec && typeof fmtDur === 'function') out.push(['Played', fmtDur(p.sec)]);
  const last = (p && p.last) || (typeof plays === 'object' && plays[g.name]) || 0;
  if (last && typeof dayName === 'function') out.push(['Last played', dayName(last).replace(/^./, c => c.toUpperCase())]);
  if (p && p.sessions) out.push(['Sessions', String(p.sessions)]);
  return out;
}

// ---------- where the cases stand ----------
function czSize() {
  const st = cz$('czstage'),
    r = st.getBoundingClientRect(),
    H = r.height || innerHeight * 0.5,
    Wd = r.width || innerWidth;
  // the chosen case: as tall as the stage allows (narrower on a narrow window)
  cz.W = Math.max(80, Math.round(Math.min((H * 0.9) / 1.62, Wd * 0.2)));
  cz$('czworld').style.setProperty('--w', cz.W + 'px');
  st.style.perspective = Math.round(cz.W * 6.5) + 'px';
}
// the place of the case o steps away from the chosen one, in each layout
function czPos(o) {
  const W = cz.W,
    H = W * 1.62,
    a = Math.abs(o),
    sd = Math.sign(o);
  if (cz.lay === 'stack') {
    if (!o) return { x: W * 0.5, y: 0, z: 0, ry: -6, s: 1, op: 1 };
    // a column of small cases, half over each other; the gap in the middle is where the chosen one came out
    const s = 0.36;
    return { x: -W * 0.72, y: sd * (H * 0.29 + (a - 1) * H * s * 0.5), z: -a, ry: 16, s, op: a > 2 ? 0 : a > 1 ? 0.7 : 1 };
  }
  // the flipbook is a book: the chosen case lies open in the middle – the booklet in the lid on the left, the
  // cartridge in its slot on the right. The next ones wait closed on the right; a turned one goes over to the left
  // like a page and shows its back (Eduard: the cartridge was behind the case and the backs were empty)
  if (cz.lay === 'flip') {
    if (!o) return { x: W * 0.5, y: 0, z: 0, ry: 0, s: 1, op: 1 };
    if (o < 0) return { x: -W * 1.66 - (a - 1) * W * 0.07, y: 0, z: -W * 0.3 - a * W * 0.035, ry: 172, s: 0.9, op: a > 5 ? 0 : 1 };
    return { x: W * 1.66 + (a - 1) * W * 0.085, y: 0, z: -W * 0.3 - a * W * 0.075, ry: -8, s: 0.9, op: a > 5 ? 0 : 1 };
    // (no half see-through: a case that is not quite opaque is drawn flat, and the front showed through its back)
  }
  if (!o) return { x: 0, y: 0, z: 0, ry: 0, s: 1, op: 1 };
  return { x: sd * (W * 1.12 + (a - 1) * W * 0.42), y: 0, z: -W * 1.1 - (a - 1) * W * 0.07, ry: -sd * 30, s: 1, op: a > 6 ? 0 : 1 };
}
function czApplyPos(e, p) {
  e.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, ${p.z.toFixed(1)}px) rotateY(${p.ry || 0}deg) scale(${p.s ?? 1})`;
  e.style.opacity = p.op;
}
// the cases near the chosen one are on the stage; the others leave at the edge
function czPlace(instant) {
  const world = cz$('czworld'),
    n = cz.list.length,
    R = CZ_LAYS[cz.lay].r;
  if (instant) world.classList.add('cz-instant');
  const want = new Set();
  for (let k = Math.max(0, cz.i - R); k <= Math.min(n - 1, cz.i + R); k++) want.add(k);
  for (const [k, e] of cz.els) {
    if (want.has(k)) continue;
    if (instant) {
      e.remove();
      cz.els.delete(k);
      continue;
    }
    if (e._bye) continue;
    e._bye = true;
    e.classList.remove('cz-sel');
    czApplyPos(e, czPos(Math.sign(k - cz.i) * (R + 1)));
    e.style.opacity = 0;
    e._byeT = setTimeout(() => {
      if (!e._bye) return;
      e.remove();
      if (cz.els.get(k) === e) cz.els.delete(k);
    }, 700);
  }
  const fresh = [];
  for (const k of want) {
    let e = cz.els.get(k);
    const o = k - cz.i;
    if (e && e._bye) {
      e._bye = false;
      clearTimeout(e._byeT);
    }
    if (!e) {
      // (with its inside: the flipbook opens it, and its back has the game's facts)
      e = czCase(cz.list[k], true);
      e._k = k;
      e.addEventListener('click', ev => {
        ev.stopPropagation();
        if (cz.moved) return;
        if (e._k === cz.i) czLook();
        else czGo(e._k);
      });
      // a new case comes in from the edge
      if (!instant) {
        e.style.transition = 'none';
        czApplyPos(e, czPos(Math.sign(o || 1) * (R + 1)));
        e.style.opacity = 0;
        fresh.push(e);
      }
      world.append(e);
      cz.els.set(k, e);
    }
    e.style.setProperty('--a', Math.abs(o));
    e.classList.toggle('cz-sel', o === 0);
    if (!fresh.includes(e)) czApplyPos(e, czPos(o));
  }
  if (fresh.length) {
    void world.offsetWidth;
    for (const e of fresh) {
      e.style.transition = '';
      czApplyPos(e, czPos(e._k - cz.i));
    }
  }
  if (instant) {
    void world.offsetWidth;
    requestAnimationFrame(() => world.classList.remove('cz-instant'));
  }
}
function czLoad(reset) {
  cz.sys = curSys;
  const l = czGames(),
    sig = czSigOf(l);
  if (reset || sig !== cz.sig) {
    for (const e of cz.els.values()) e.remove();
    cz.els.clear();
  }
  cz.list = l;
  cz.sig = sig;
  const at = l.findIndex(g => g.name === sel);
  cz.i = Math.max(0, Math.min(l.length - 1, at >= 0 ? at : cz.i));
  if (l[cz.i]) sel = l[cz.i].name;
  czSize();
  czPlace(true);
  czInfo();
}

// ---------- the consoles with a Switch's look (Switch, Switch 2, your own): chips at the top, ↑ ↓ between them ----------
const czSysList = () =>
  typeof sysAvail === 'function' && typeof nxLookOf === 'function' ? sysAvail().filter(k => ['switch', 'switch2'].includes(nxLookOf(k))) : [];
function czSysGo(k) {
  if (!k || k === curSys) return czSnd('bump');
  // the Case Room comes along to the other console
  czLs('czMenu.' + k, 'col');
  setSystem(k);
}
function czSysStep(d) {
  const l = czSysList();
  if (l.length < 2) return czSnd('bump');
  czSysGo(l[(l.indexOf(curSys) + d + l.length) % l.length]);
}
function czSysUi() {
  const box = cz$('czsyss'),
    l = czSysList(),
    key = l.map(k => k + ':' + games.filter(g => g.kind !== 'app' && sysOf(g) === k).length).join() + '|' + curSys;
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  box.hidden = l.length < 2;
  box.replaceChildren(
    ...l.map(k => {
      const b = document.createElement('button'),
        n = games.filter(g => g.kind !== 'app' && !/^folder/.test(g.kind || '') && sysOf(g) === k).length;
      b.dataset.s = k;
      b.setAttribute('role', 'tab');
      b.className = k === curSys ? 'on' : '';
      b.setAttribute('aria-selected', k === curSys ? 'true' : 'false');
      b.innerHTML = '<span></span><small></small>';
      b.querySelector('span').textContent = SYS[k] ? SYS[k].name : k;
      b.querySelector('small').textContent = n;
      b.onclick = e => {
        e.stopPropagation();
        czSysGo(k);
      };
      return b;
    }),
  );
}

// ---------- moving ----------
function czGo(j) {
  const n = cz.list.length;
  if (!n) return czSnd('bump');
  j = Math.max(0, Math.min(n - 1, j));
  if (j === cz.i) return czSnd('bump');
  const was = cz.i;
  cz.i = j;
  sel = cz.list[j].name;
  czPlace();
  czInfo(true);
  czSnd('move');
}
const czMove = d => czGo(cz.i + d);
// the flipbook: the cases that go over to the other side turn over their spine like pages, one after the other
function czPageTurn(a, b) {
  const fw = b > a,
    l = [];
  for (const [k, e] of cz.els) {
    const o1 = k - a,
      o2 = k - b;
    if (fw ? o1 >= 0 && o2 < 0 : o1 < 0 && o2 >= 0) l.push([k, e]);
  }
  l.sort((x, y) => (fw ? x[0] - y[0] : y[0] - x[0]));
  l.slice(0, 8).forEach(([, e], n) => {
    e.classList.remove('cz-turnf', 'cz-turnb');
    void e.offsetWidth;
    e.style.setProperty('--td', n * 70 + 'ms');
    e.classList.add(fw ? 'cz-turnf' : 'cz-turnb');
    clearTimeout(e._turnT);
    e._turnT = setTimeout(() => e.classList.remove('cz-turnf', 'cz-turnb'), 900 + n * 70);
  });
}
function czSetLay(k) {
  if (!CZ_LAYS[k] || k === cz.lay) return;
  cz.lay = k;
  czLs('czLay', k);
  czPlace();
  czInfo();
  czSnd('page');
}
const czNextLay = () => czSetLay(CZ_LAY_ORDER[(CZ_LAY_ORDER.indexOf(cz.lay) + 1) % CZ_LAY_ORDER.length]);

// ---------- what is written around the cases ----------
function czInfo(moved) {
  if (!cz.el) return;
  const g = czG(),
    L = CZ_LAYS[cz.lay],
    n = cz.list.length,
    sys = czSysName();
  cz.el.dataset.lay = cz.lay;
  cz.el.style.setProperty('--acc', L.acc);
  cz$('czcrumb').textContent = sys + ' / ' + L.name;
  cz$('czcount').textContent = 'Case Room · ' + n + (n === 1 ? ' game' : ' games');
  czSysUi();
  cz$('czlays')
    .querySelectorAll('button')
    .forEach(b => {
      b.classList.toggle('on', b.dataset.l === cz.lay);
      b.setAttribute('aria-checked', b.dataset.l === cz.lay ? 'true' : 'false');
    });
  cz$('czempty').hidden = !!n;
  if (!n) cz$('czempty').querySelector('b').textContent = 'No ' + sys + ' games yet';
  cz.el.classList.toggle('cz-mt', !n);
  const c = cz.lk ? CZ_LOOK : { kick: L.kick, head: L.head, sub: L.sub },
    card = cz$('czcard');
  if (card.dataset.k !== c.head) {
    card.dataset.k = c.head;
    card.querySelector('small').textContent = c.kick;
    card.querySelector('b').textContent = c.head;
    card.querySelector('span').textContent = c.sub;
    card.classList.remove('cz-swap');
    void card.offsetWidth;
    card.classList.add('cz-swap');
  }
  czKeys();
  if (!g) return;
  const folder = /folder/i.test(g.format || ''),
    parts = String(g.format || '').split(' · ');
  cz$('czsys').textContent = sys;
  cz$('czn').textContent = cz.i + 1 + ' / ' + n;
  cz$('czmedia').textContent = folder ? 'Folder dump' : 'Cartridge';
  const nm = cz$('czname');
  if (nm.textContent !== g.name) {
    nm.textContent = g.name;
    if (moved) {
      nm.classList.remove('cz-nin');
      void nm.offsetWidth;
      nm.classList.add('cz-nin');
    }
  }
  const pl = typeof playLine === 'function' ? playLine(g.name) : '';
  cz$('czmeta').textContent = [parts.slice(1).join(' · ') || parts[0], g.tid ? String(g.tid).toUpperCase() : '', pl].filter(Boolean).join('  ·  ');
  cz$('czpos').textContent = String(cz.i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
  cz$('czbar').style.width = ((cz.i + 1) / n) * 100 + '%';
  // the buttons (A Play, X Open case, + Options, the star)
  const fav = favs.has(g.name),
    bk = cz.pad;
  const btns = [
    ['play', 'Play', bk ? 'A' : 'Enter', () => czPlay(), 'cz-pri'],
    ['open', 'Open case', bk ? 'X' : 'Space', () => czLook()],
    ['info', 'Details', bk ? '+' : 'D', () => czOptions()],
    czArtOk() && ['art', 'Artwork', bk ? 'R3' : 'R', () => czArt()],
    ['star', fav ? 'A favorite' : 'Add to favorites', bk ? 'L3' : 'F', () => czFav(), 'cz-ic' + (fav ? ' cz-fav' : '')],
  ].filter(Boolean);
  czBtns(cz$('czbtns'), btns);
  if (cz.lk) czLookInfo();
  czBg(g);
}
function czBtns(box, btns) {
  const key = JSON.stringify(btns.map(b => [b[0], b[1], b[2], b[4]]));
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  box.replaceChildren(
    ...btns.map(([ic, label, k, fn, cls]) => {
      const b = document.createElement('button');
      b.className = 'cz-b' + (cls ? ' ' + cls : '');
      b.innerHTML = `<i></i>${CZ_IC[ic] || ''}<span></span>`;
      b.querySelector('i').textContent = k;
      b.querySelector('span').textContent = label;
      b.title = label;
      b.setAttribute('aria-label', label);
      b.onclick = e => {
        e.stopPropagation();
        fn();
      };
      return b;
    }),
  );
}
// the picture of the chosen game, big and blurred behind everything
function czBg(g) {
  const u = g && g.cover ? `url("${g.cover}")` : '';
  if (cz.amb === u + '|' + (g ? g.name : '')) return;
  cz.amb = u + '|' + (g ? g.name : '');
  const a = cz$('czamb0'),
    b = cz$('czamb1'),
    on = a.classList.contains('on') ? b : a,
    off = on === a ? b : a;
  if (u) on.style.backgroundImage = u;
  else {
    const h = g ? hue(g.name) : 220;
    on.style.backgroundImage = `radial-gradient(circle at 30% 40%, hsl(${h} 70% 45%), transparent 60%), radial-gradient(circle at 70% 60%, hsl(${(h + 60) % 360} 70% 40%), transparent 60%)`;
  }
  on.classList.add('on');
  off.classList.remove('on');
}
// the keys at the bottom: the controller's or the keyboard's, for what is on screen
function czKeys() {
  const p = cz.pad;
  let h;
  if (cz.lk)
    h = p
      ? [['✚', 'Turn'], ['RS', 'Turn'], ['L R', 'Zoom'], ['A', 'Play'], ['X', cz.lid ? 'Close case' : 'Open case'], ['Y', 'Flip'], ['B', 'Back']]
      : [['Drag', 'Turn'], ['Wheel', 'Zoom'], ['Enter', 'Play'], ['Space', cz.lid ? 'Close case' : 'Open case'], ['F', 'Flip'], ['Esc', 'Back']];
  else
    h = p
      ? [[cz.lay === 'stack' ? '↕' : '↔', 'Browse'], ['A', 'Play'], ['X', 'Open case'], ['Y', 'Layout'], ['+', 'Options'], ['L R', 'Console'], ['B', 'Home']]
      : [
          [cz.lay === 'stack' ? '↑ ↓' : '← →', 'Browse'],
          [cz.lay === 'stack' ? 'PgUp PgDn' : '↑ ↓', cz.lay === 'stack' ? 'Jump 10' : 'Console'],
          ['Enter', 'Play'],
          ['Space', 'Open case'],
          ['V', 'Layout'],
          ...(cz.lay === 'stack' ? [] : [['PgUp PgDn', 'Jump 10']]),
          ['Esc', 'Home'],
        ];
  const box = cz$('czkeys'),
    key = JSON.stringify(h) + p;
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  box.classList.toggle('cz-padk', p);
  box.replaceChildren(
    ...h.map(([k, t]) => {
      const s = document.createElement('span');
      s.className = 'cz-key';
      for (const part of k.split(' ')) {
        const i = document.createElement('i');
        i.textContent = part;
        if (part.length > 2) i.className = 'w';
        s.append(i);
      }
      const b = document.createElement('b');
      b.textContent = t;
      s.append(b);
      return s;
    }),
  );
}

// ---------- the buttons ----------
function czPlay() {
  const g = czG();
  if (!g) return czSnd('bump');
  sel = g.name;
  const el = cz.lk ? cz.lkEl : cz.els.get(cz.i);
  if (el) {
    el.classList.remove('cz-go');
    void el.offsetWidth;
    el.classList.add('cz-go');
  }
  launch(g);
}
function czFav() {
  const g = czG();
  if (!g) return;
  const was = favs.has(g.name);
  toggleFav(g);
  czSnd(was ? 'off' : 'on');
  czInfo();
}
// + (Details): the game's page of Home's interface – B there comes back here
function czOptions() {
  const g = czG();
  if (!g) return czSnd('bump');
  sel = g.name;
  const f = cz.face;
  czClose(true);
  cz.ret = true;
  if (f === 'switch' && typeof nxOpenGame === 'function') nxOpenGame(g);
  else if (typeof n2OpenGame === 'function') n2OpenGame(g);
}
const czArtOk = () => !!(window.api && api.gameCoverPick && !(typeof IS_MOBILE !== 'undefined' && IS_MOBILE));
function czArt() {
  const g = czG();
  if (!g || !czArtOk()) return czSnd('bump');
  sel = g.name;
  czPopOpen('Artwork', g.name, [
    {
      label: 'Choose a picture…',
      sub: 'Your own front cover for this game – it wins over the automatic one',
      run: async () => {
        const r = await api.gameCoverPick(g.name);
        if (r && r.ok) toast('✓ New artwork for “' + g.name + '”', 2600);
        else if (r && r.error) toast(r.error, 3600);
      },
    },
    g.own && {
      label: 'Back to the automatic picture',
      sub: 'The one CosmoU found for it',
      run: async () => {
        await api.gameCoverClear(g.name);
        toast('✓ “' + g.name + '” has its automatic picture again', 2600);
      },
    },
    !g.own && czReloadOk(g) && {
      label: 'Find the cover again',
      sub: 'Your folder, SteamGridDB, IGDB – the picture there now is forgotten',
      run: () => czReload(g),
    },
    api.openCovers && {
      label: 'Open the covers folder',
      sub: 'A picture named like the game is its artwork',
      run: () => api.openCovers(),
    },
  ]);
}
// the Switch and the Switch 2: one game's automatic cover again (main.js coverReload)
const czReloadOk = g => czArtOk() && !!api.coverReload && ['switch', 'switch2'].includes(sysOf(g));
async function czReload(g) {
  const ok = await api.coverReload(g.name);
  toast(ok ? '↻ Looking for a cover for “' + g.name + '”…' : 'No cover to look for here', 2600);
}
// a small list over the Case Room (Artwork): ↑ ↓ (or the stick), A / Enter, B / Esc
function czPopOpen(title, sub, items) {
  items = items.filter(Boolean);
  let box = cz$('czpop');
  if (!box) {
    box = document.createElement('div');
    box.id = 'czpop';
    box.className = 'cz-pop';
    box.innerHTML = '<div class="cz-pbox" role="menu"><small></small><b></b><div class="cz-plist"></div></div>';
    box.addEventListener('click', e => e.target === box && czPopClose());
    cz.el.append(box);
  }
  box.querySelector('small').textContent = title;
  box.querySelector('b').textContent = sub;
  const list = box.querySelector('.cz-plist');
  list.replaceChildren(
    ...items.map((it, k) => {
      const b = document.createElement('button');
      b.className = 'cz-pi';
      b.setAttribute('role', 'menuitem');
      b.innerHTML = '<span></span><small></small>';
      b.querySelector('span').textContent = it.label;
      b.querySelector('small').textContent = it.sub || '';
      b.onclick = e => {
        e.stopPropagation();
        czPopClose(true);
        it.run();
      };
      b.onpointerenter = () => ((cz.pop.i = k), czPopUi());
      return b;
    }),
  );
  cz.pop = { items, i: 0 };
  box.hidden = false;
  czPopUi();
  czSnd('open');
}
function czPopUi() {
  const box = cz$('czpop');
  if (!box || !cz.pop) return;
  box.querySelectorAll('.cz-pi').forEach((b, k) => b.classList.toggle('cz-on', k === cz.pop.i));
}
function czPopMove(d) {
  if (!cz.pop) return;
  const n = cz.pop.items.length,
    j = Math.max(0, Math.min(n - 1, cz.pop.i + d));
  if (j === cz.pop.i) return czSnd('bump');
  cz.pop.i = j;
  czPopUi();
  czSnd('move');
}
function czPopPress() {
  const b = cz$('czpop') && cz$('czpop').querySelectorAll('.cz-pi')[cz.pop ? cz.pop.i : -1];
  if (b) b.click();
}
function czPopClose(quiet) {
  if (!cz.pop) return;
  cz.pop = null;
  const box = cz$('czpop');
  if (box) box.hidden = true;
  if (!quiet) czSnd('back');
}
function czQuick() {
  const f = cz.face;
  czClose(true);
  if (f === 'switch' && typeof nxQsOpen === 'function') nxQsOpen();
  else if (typeof n2QsOpen === 'function') n2QsOpen();
}

// ---------- a closer look: the case comes close; turn it, zoom, flip it, open it ----------
function czLookSize() {
  const r = cz$('czlstage').getBoundingClientRect();
  cz.W2 = Math.max(110, Math.round(Math.min((r.height * 0.86) / 1.62, r.width * 0.21)));
  cz$('czlworld').style.setProperty('--w', cz.W2 + 'px');
  cz$('czlstage').style.perspective = Math.round(cz.W2 * 7) + 'px';
  czLookApply(true);
}
function czLook() {
  const g = czG();
  if (!g || cz.lk) return;
  cz.lk = true;
  cz.lid = false;
  cz.flip = false;
  cz.rx = 9;
  cz.ry = -24;
  cz.zoom = 1;
  const w = cz$('czlworld'),
    fly = cz$('czlfly');
  w.replaceChildren();
  const e = czCase(g, true);
  e.classList.add('cz-lkc');
  w.append(e);
  cz.lkEl = e;
  cz$('czlk').hidden = false;
  cz$('czlk').classList.remove('cz-out');
  czLookSize();
  // it flies from where it stood in the collection to the middle
  const src = cz.els.get(cz.i),
    sb = src && src.querySelector('.cz-box').getBoundingClientRect(),
    to = cz$('czlstage').getBoundingClientRect();
  fly.style.transition = 'none';
  if (sb && sb.width) {
    const s = sb.height / (cz.W2 * 1.62);
    fly.style.transform = `translate(${sb.left + sb.width / 2 - (to.left + to.width / 2)}px, ${sb.top + sb.height / 2 - (to.top + to.height / 2)}px) scale(${s.toFixed(3)})`;
  } else fly.style.transform = 'scale(.6)';
  void fly.offsetWidth;
  fly.style.transition = '';
  fly.style.transform = '';
  if (src) src.classList.add('cz-away');
  cz.el.classList.add('cz-looking');
  czLookInfo();
  czInfo();
  czSnd('open');
  // then it opens by itself
  clearTimeout(cz.t.lid);
  cz.t.lid = setTimeout(() => cz.lk && !cz.lid && czLid(true), 620);
}
function czLookInfo() {
  const g = czG();
  if (!g) return;
  cz$('czlsys').textContent = czSysName(g);
  cz$('czlname').textContent = g.name;
  czBtns(cz$('czlbtns'), [
    ['play', 'Play', cz.pad ? 'A' : 'Enter', () => czPlay(), 'cz-pri'],
    ['flipc', 'Flip', cz.pad ? 'Y' : 'F', () => czFlip()],
    ['open', cz.lid ? 'Close case' : 'Open case', cz.pad ? 'X' : 'Space', () => czLid(!cz.lid)],
    ['back', 'Back', cz.pad ? 'B' : 'Esc', () => czLookEnd()],
  ]);
}
function czLookApply(now) {
  const w = cz$('czlworld');
  if (!w) return;
  // open, the case is twice as wide: the middle moves to the hinge, a little right for the cartridge
  const lx = cz.lid ? cz.W2 * 0.22 : 0;
  if (now) w.classList.add('cz-drag');
  const ry = cz.ry + (cz.flip ? 180 : 0);
  w.style.transform = `scale(${cz.zoom.toFixed(3)}) rotateX(${cz.rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) translateX(${lx.toFixed(1)}px)`;
  // the light on the plastic follows the turning
  w.style.setProperty('--lry', (((ry % 360) + 540) % 360) - 180);
  if (now) {
    void w.offsetWidth;
    if (!cz.drag) w.classList.remove('cz-drag');
  }
}
function czLid(open) {
  if (!cz.lk || !cz.lkEl) return;
  clearTimeout(cz.t.lid);
  cz.lid = open;
  cz.lkEl.classList.toggle('cz-open', open);
  // it turns to the front while it opens, to see inside; closed, a little to the side again
  if (!cz.flip) {
    cz.ry = open ? -8 : -24;
    cz.rx = open ? 6 : 9;
  }
  czLookApply();
  czLookInfo();
  czKeys();
  czSnd(open ? 'open' : 'back');
  if (open) setTimeout(() => cz.lk && cz.lid && czSnd('on'), 520);
}
function czFlip() {
  if (!cz.lk) return;
  cz.flip = !cz.flip;
  czLookApply();
  czSnd('page');
}
function czTurn(dx, dy) {
  if (!cz.lk) return;
  cz.ry += dy;
  cz.rx = Math.max(-45, Math.min(45, cz.rx + dx));
  czLookApply();
}
// the right stick: a turn as long as it is held, faster the further it is pushed (a little dead zone in the middle)
function czStick(x, y, now) {
  const dt = Math.min(50, now - (cz.stT || now));
  cz.stT = now;
  const f = v => (Math.abs(v) < 0.18 ? 0 : Math.sign(v) * Math.pow((Math.abs(v) - 0.18) / 0.82, 1.5));
  const ax = f(x),
    ay = f(y);
  if (!ax && !ay) return;
  cz.ry += ax * dt * 0.22;
  cz.rx = Math.max(-45, Math.min(45, cz.rx - ay * dt * 0.12));
  czLookApply(true);
}
function czZoom(d) {
  if (!cz.lk) return;
  cz.zoom = Math.max(0.55, Math.min(1.9, cz.zoom + d));
  czLookApply();
}
function czLookEnd(fast) {
  if (!cz.lk) return;
  clearTimeout(cz.t.lid);
  const src = cz.els.get(cz.i),
    fly = cz$('czlfly'),
    wasOpen = cz.lid;
  cz.lk = false;
  cz.lid = false;
  const done = () => {
    if (cz.lk) return;
    cz$('czlk').hidden = true;
    cz$('czlworld').replaceChildren();
    cz.lkEl = null;
    for (const e of cz.els.values()) e.classList.remove('cz-away');
  };
  cz.el.classList.remove('cz-looking');
  cz$('czlk').classList.add('cz-out');
  czInfo();
  if (fast) return done();
  czSnd('back');
  if (cz.lkEl) cz.lkEl.classList.remove('cz-open');
  cz.flip = false;
  cz.ry = 0;
  cz.rx = 0;
  cz.zoom = 1;
  // closed first, then back to its place
  setTimeout(
    () => {
      if (cz.lk) return;
      czLookApply();
      const sb = src && src.querySelector('.cz-box').getBoundingClientRect(),
        to = cz$('czlstage').getBoundingClientRect();
      if (sb && sb.width) {
        const s = sb.height / (cz.W2 * 1.62);
        fly.style.transform = `translate(${sb.left + sb.width / 2 - (to.left + to.width / 2)}px, ${sb.top + sb.height / 2 - (to.top + to.height / 2)}px) scale(${s.toFixed(3)})`;
      } else fly.style.transform = 'scale(.6)';
      setTimeout(done, 520);
    },
    wasOpen ? 420 : 0,
  );
}

// ---------- keyboard ----------
addEventListener(
  'keydown',
  e => {
    if (!cz.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen())) return;
    if ($('#launch').classList.contains('on') || $('#setup').classList.contains('on')) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key,
      stop = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
    if (k === 'F11') return;
    if (cz.pad) {
      cz.pad = false;
      czInfo();
    }
    if (cz.pop) {
      if (k === 'ArrowUp' || k === 'ArrowDown') return stop(), czPopMove(k === 'ArrowDown' ? 1 : -1);
      if (k === 'Enter' || k === ' ') return stop(), czPopPress();
      if (k === 'Escape' || k === 'Backspace') return stop(), czPopClose();
      return stop();
    }
    // a game's page is open (js/case-show.js)
    if (cz.det && typeof czDetKey === 'function') return czDetKey(k, stop);
    if (cz.lk) {
      if (k === 'ArrowLeft' || k === 'ArrowRight') return stop(), czTurn(0, k === 'ArrowRight' ? 25 : -25);
      if (k === 'ArrowUp' || k === 'ArrowDown') return stop(), czTurn(k === 'ArrowUp' ? 12 : -12, 0);
      if (k === '+' || k === '=') return stop(), czZoom(0.12);
      if (k === '-' || k === '_') return stop(), czZoom(-0.12);
      if (k === 'Enter') return stop(), czPlay();
      if (k === ' ' || k === 'x' || k === 'X') return stop(), czLid(!cz.lid);
      if (['f', 'F', 'y', 'Y'].includes(k)) return stop(), czFlip();
      if (k === 'Escape' || k === 'Backspace') return stop(), czLookEnd();
      return stop();
    }
    const stack = cz.lay === 'stack';
    if (k === 'ArrowLeft' || k === 'ArrowRight') return stop(), czMove(k === 'ArrowRight' ? 1 : -1);
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      stop();
      if (stack) return czMove(k === 'ArrowDown' ? 1 : -1);
      return czSysStep(k === 'ArrowDown' ? 1 : -1);
    }
    if (k === 'PageUp' || k === 'PageDown') return stop(), czMove(k === 'PageDown' ? 10 : -10);
    if (k === 'Home' || k === 'End') return stop(), czGo(k === 'End' ? cz.list.length - 1 : 0);
    if (k === 'Enter') return stop(), czPlay();
    if (k === ' ' || k === 'x' || k === 'X') return stop(), czLook();
    if (['y', 'Y', 'v', 'V'].includes(k)) return stop(), czNextLay();
    if (/^[1-9]$/.test(k) && CZ_LAY_ORDER[+k - 1]) return stop(), czSetLay(CZ_LAY_ORDER[+k - 1]);
    if (['+', '=', 'o', 'O', 'i', 'I', 'd', 'D', 'ContextMenu'].includes(k)) return stop(), czOptions();
    if (k === 'r' || k === 'R') return stop(), czArt();
    if (k === 'f' || k === 'F') return stop(), czFav();
    if (['Escape', 'Backspace', 'c', 'C'].includes(k)) return stop(), czClose();
    if (k === 'q' || k === 'Q') return stop(), czQuick();
    // the other keys of CosmoU's library have nothing to do here
    if (['l', 'L', '*', 'g', 'G', 'm', 'M', 'h', 'H', 't', 'T', 's', 'S', '/'].includes(k)) return stop();
  },
  true,
);
addEventListener(
  'keyup',
  e => {
    if (cz.on && (e.key === ' ' || e.key === 'Enter') && e.target && e.target.closest && e.target.closest('#cz')) e.preventDefault();
  },
  true,
);

// ---------- controller (called by the controller loop in js/feedback-style-controller.js, before Home's) ----------
// A play · X open case · Y layout (in a closer look: flip) · + details · R3 artwork · B Home ·
// L/R console (closer look: zoom) · right stick ten at a time · Home Quick Settings ·
// left stick: clicked a favorite, held the wheel of marks
function czPad(fire, s, open, busy, now) {
  if (!cz.on || busy) return false;
  if (fire.hm) {
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    czQuick();
    return true;
  }
  if (open || (typeof mkIsOpen === 'function' && mkIsOpen())) return false;
  if (Object.keys(fire).some(k => fire[k]) && !cz.pad) {
    cz.pad = true;
    czInfo();
  }
  if (cz.pop) {
    if (fire.u || fire.d) czPopMove(fire.d ? 1 : -1);
    if (fire.a) czPopPress();
    else if (fire.b) czPopClose();
    return true;
  }
  if (cz.det && typeof czDetPad === 'function') return czDetPad(fire, s, now), true;
  if (cz.lk) {
    if (fire.l || fire.r) czTurn(0, fire.r ? 25 : -25);
    if (fire.u || fire.d) czTurn(fire.u ? 12 : -12, 0);
    // the right stick turns it smoothly, like a camera in a game (Eduard)
    czStick(s.rx || 0, s.ry || 0, now);
    if (fire.lb || fire.rb) czZoom(fire.rb ? 0.15 : -0.15);
    if (fire.a) czPlay();
    else if (fire.b) czLookEnd();
    if (fire.x) czLid(!cz.lid);
    if (fire.y) czFlip();
    return true;
  }
  const stack = cz.lay === 'stack';
  if (fire.l || fire.r) czMove(fire.r ? 1 : -1);
  if (stack && (fire.u || fire.d)) czMove(fire.d ? 1 : -1);
  // (up and down no longer change the console: the stick did that by mistake all the time – L and R do it, Eduard)
  if (fire.pl || fire.pr) czMove(fire.pr ? 10 : -10);
  if (fire.a) czPlay();
  else if (fire.b) return czClose(), true;
  if (fire.x) czLook();
  if (fire.y) czNextLay();
  if (fire.st) czOptions();
  if (fire.r3) czArt();
  if ((fire.lb || fire.rb) && typeof sysNext === 'function') sysNext(fire.rb ? 1 : -1);
  if (s.l3 && !cz.l3) {
    cz.l3 = now;
    cz.l3Done = false;
  }
  if (s.l3 && cz.l3 && !cz.l3Done && now - cz.l3 > 450 && czG() && typeof markWheel === 'function') {
    cz.l3Done = true;
    markWheel(czG());
  }
  if (!s.l3 && cz.l3) {
    if (!cz.l3Done && czG()) czFav();
    cz.l3 = 0;
  }
  return true;
}

// ---------- with the rest of CosmoU ----------
const _renderCz = render;
render = function () {
  const r = _renderCz.apply(this, arguments);
  czSync();
  return r;
};
// B on a game's page opened from here (Options) comes back to the Case Room
if (typeof nxB === 'function') {
  const _nxBCz = nxB;
  nxB = function () {
    const was = nx.scr,
      r = _nxBCz.apply(this, arguments);
    if (cz.ret && was === 'game' && nx.scr !== 'game') czOpen(true);
    return r;
  };
}
if (typeof n2B === 'function') {
  const _n2BCz = n2B;
  n2B = function () {
    const was = n2.scr,
      r = _n2BCz.apply(this, arguments);
    if (cz.ret && was === 'game' && n2.scr !== 'game') czOpen(true);
    return r;
  };
}
// a game started from here: the case gives a little, then CosmoU starts it as always
czMenusInject();
