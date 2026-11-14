// CosmoU – the Case Room's "Showcase" (js/case-room.js): the layout from Eryk's video, and a page for each game.
//   Showcase  the chosen case stands left of the middle on a dark stage in the game's own colours, the next one
//             waits beside it, the game's picture large and faint on the right, its name big and wide below.
//             Another console: the cases dissolve into the light and the new ones come out of it.
//   Game page (Details / + / D): the case moves to the left, on the right its page scrolls – Overview, Your play,
//             Your copy, Info. L / R (or the tabs) jump between the parts, the tab follows while it scrolls.
// Nothing of the other layouts changed: Carousel, Stack and Flipbook are still there (Y / V).
CZ_LAYS.show = {
  name: 'Showcase',
  kick: 'Showcase',
  head: 'One game at a time.',
  sub: 'Your collection on a stage.',
  acc: '#8f8cff',
  r: 3,
};
CZ_LAY_ORDER.unshift('show');
CZ_IC.show = czS('<rect x="4" y="5" width="9" height="14" rx="1.5"/><path d="M16 8h4v9h-4"/>');
// (new here: the Showcase is the layout until another one is chosen)
try {
  if (!localStorage.getItem('cosmou.czLay')) cz.lay = 'show';
} catch {}
const _czPosShow = czPos;
czPos = function (o) {
  if (cz.lay !== 'show') return _czPosShow.apply(this, arguments);
  const W = cz.W,
    a = Math.abs(o);
  if (!o) return { x: -W * 0.62, y: 0, z: 0, ry: 0, s: 1, op: 1 };
  // the ones before have left to the left; the next one waits on the right, turned a little towards the middle
  if (o < 0) return { x: -W * 2.2 - a * W * 0.3, y: 0, z: -W * 0.8, ry: 24, s: 0.8, op: 0 };
  return { x: W * 0.72 + (a - 1) * W * 0.86, y: W * 0.06, z: -W * 0.75 - (a - 1) * W * 0.3, ry: -24, s: 0.86, op: a > 1 ? 0 : 1 };
};

// ---------- the big, faint picture of the game on the right; the stage in its colours ----------
const czTone = {};
function czToneOf(g, cb) {
  if (!g || !g.cover) return cb(null);
  if (czTone[g.cover] !== undefined) return cb(czTone[g.cover]);
  const im = new Image();
  im.onload = () => {
    let t = null;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 12;
      const x = c.getContext('2d');
      x.drawImage(im, 0, 0, 12, 12);
      const d = x.getImageData(0, 0, 12, 12).data;
      let r = 0,
        gg = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]),
          mn = Math.min(d[i], d[i + 1], d[i + 2]),
          w = (mx - mn) / 255 + 0.05;
        r += d[i] * w;
        gg += d[i + 1] * w;
        b += d[i + 2] * w;
        n += w;
      }
      // (its colour, stronger: a pale picture still gives the stage a tint)
      const m = (r + gg + b) / (3 * n),
        k = 1.9;
      t = [r / n, gg / n, b / n].map(v => Math.max(0, Math.min(255, Math.round(m + (v - m) * k))));
    } catch {}
    czTone[g.cover] = t;
    cb(t);
  };
  im.onerror = () => cb((czTone[g.cover] = null));
  im.src = g.cover;
}
function czHero(g) {
  if (!cz.el) return;
  const k = g ? g.name + '|' + (g.cover || '') : '';
  if (cz.heroK === k) return;
  cz.heroK = k;
  const a = cz$('czhero0'),
    b = cz$('czhero1'),
    on = a.classList.contains('on') ? b : a,
    off = on === a ? b : a;
  on.style.backgroundImage = g && g.cover ? `url("${g.cover}")` : 'none';
  on.classList.add('on');
  off.classList.remove('on');
  czToneOf(g, t => {
    if (cz.heroK !== k) return;
    const h = g ? hue(g.name) : 260;
    cz.el.style.setProperty('--tone', t ? `rgb(${t[0]}, ${t[1]}, ${t[2]})` : `hsl(${h} 60% 45%)`);
  });
}
const _czBuildShow = czBuild;
czBuild = function () {
  _czBuildShow.apply(this, arguments);
  cz.el.querySelector('.cz-bg').insertAdjacentHTML(
    'beforeend',
    '<i class="cz-tone"></i><i class="cz-hero" id="czhero0"></i><i class="cz-hero" id="czhero1"></i><i class="cz-floor"></i>',
  );
  cz.el.insertAdjacentHTML(
    'beforeend',
    `<section class="cz-det" id="czdet" hidden aria-label="Game page">
      <nav class="cz-dtabs" id="czdtabs"><kbd>L</kbd><span></span><kbd>R</kbd></nav>
      <button class="cz-dx" id="czdx" aria-label="Close">${czS('<path d="M6 6l12 12M18 6 6 18"/>')}</button>
      <div class="cz-dscroll" id="czdscroll"></div>
    </section>`,
  );
  cz$('czdx').onclick = () => czDetClose();
  cz$('czdscroll').addEventListener('scroll', czDetSpy, { passive: true });
};
const _czInfoShow = czInfo;
czInfo = function () {
  const r = _czInfoShow.apply(this, arguments);
  if (cz.el) czHero(czG());
  return r;
};
// another console: the cases come out of the light
const _czLoadShow = czLoad;
czLoad = function (reset) {
  const was = cz.showSys,
    fresh = reset || cz.sys !== curSys || !cz.els.size;
  // new cases on the stage: they stand in place at once – no cartridge flying in from outside its case for a moment
  // (Eduard: "the game is outside the box, after a second it fixes itself")
  if (fresh && cz.el) {
    cz.el.classList.add('cz-noanim');
    clearTimeout(cz.t.noanim);
    cz.t.noanim = setTimeout(() => requestAnimationFrame(() => cz.el.classList.remove('cz-noanim')), 60);
    // while the room fades in, the 3D is drawn flat for a moment and the cartridge behind the case showed in front
    // of it: it waits until the room is there
    cz.el.classList.add('cz-opening');
    clearTimeout(cz.t.opening);
    cz.t.opening = setTimeout(() => cz.el.classList.remove('cz-opening'), 750);
  }
  const r = _czLoadShow.apply(this, arguments);
  cz.showSys = curSys;
  if (cz.el && was && was !== curSys) {
    const st = cz$('czstage');
    st.classList.remove('cz-arrive');
    void st.offsetWidth;
    st.classList.add('cz-arrive');
    clearTimeout(cz.t.arrive);
    cz.t.arrive = setTimeout(() => st.classList.remove('cz-arrive'), 900);
    czSnd('page');
  }
  return r;
};

// ---------- the game's page ----------
const CZ_SECS = [
  ['over', 'Overview'],
  ['play', 'Your play'],
  ['copy', 'Your copy'],
  ['info', 'Info'],
];
const CZ_STATUS = ['Not started', 'Playing', 'Finished', 'Abandoned'];
const czStatKey = g => 'cosmou.czStatus.' + g.name;
const czDur = s => (typeof fmtDur === 'function' ? fmtDur(s) : Math.round(s / 60) + ' min');
function czDetData(g) {
  const pl = (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[g.name]) || null,
    ses = ((typeof playLog === 'object' && playLog && playLog.sessions) || []).filter(x => x.name === g.name),
    now = Date.now(),
    m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(),
    day = t => (typeof dayName === 'function' ? dayName(t) : new Date(t).toLocaleDateString()),
    all = Object.entries((typeof playLog === 'object' && playLog && playLog.playtime) || {})
      .filter(([n]) => cz.list.some(x => x.name === n))
      .reduce((a, [, p]) => a + (p.sec || 0), 0),
    weeks = Array.from({ length: 8 }, (_, i) => {
      const end = now - (7 - i) * 7 * 86400000,
        st = end - 7 * 86400000;
      return ses.filter(x => x.start >= st && x.start < end).reduce((a, x) => a + x.sec, 0);
    });
  return {
    played: pl ? czDur(pl.sec) : 'Not yet',
    last: pl && pl.last ? day(pl.last) : '–',
    launches: pl ? pl.sessions : 0,
    avg: pl && pl.sessions ? czDur(pl.sec / pl.sessions) : '–',
    first: pl && pl.first ? new Date(pl.first).toLocaleDateString() : 'Not recorded',
    longest: ses.length ? czDur(Math.max(...ses.map(x => x.sec))) : '–',
    month: (v => (v ? czDur(v) : 'None'))(ses.filter(x => x.start >= m0).reduce((a, x) => a + x.sec, 0)),
    share: pl && all ? Math.round((pl.sec / all) * 100) + '%' : '–',
    weeks,
  };
}
function czDetOpen() {
  const g = czG();
  if (!g) return czSnd('bump');
  if (cz.lk) czLookEnd(true);
  cz.det = true;
  cz.detSec = 0;
  czDetFill(g);
  const d = cz$('czdet');
  d.hidden = false;
  d.classList.remove('cz-out');
  cz$('czdscroll').scrollTop = 0;
  cz.el.classList.add('cz-deton');
  czSnd('open');
  czKeysDet();
  czDetSpy();
}
function czDetClose(quiet) {
  if (!cz.det) return;
  cz.det = false;
  cz.el.classList.remove('cz-deton');
  const d = cz$('czdet');
  d.classList.add('cz-out');
  clearTimeout(cz.t.det);
  cz.t.det = setTimeout(() => !cz.det && (d.hidden = true), 420);
  if (!quiet) czSnd('back');
  cz$('czkeys').dataset.k = '';
  czInfo();
}
function czDetFill(g) {
  const x = czDetData(g),
    fav = favs.has(g.name),
    st = (() => {
      try {
        return localStorage.getItem(czStatKey(g)) || '';
      } catch {
        return '';
      }
    })(),
    parts = String(g.format || '').split(' · '),
    emu = typeof SYS === 'object' && SYS[sysOf(g)] && SYS[sysOf(g)].emu ? SYS[sysOf(g)].emu : '',
    box = cz$('czdscroll'),
    mx = Math.max(1, ...x.weeks),
    e = (tag, cls, txt) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (txt != null) n.textContent = txt;
      return n;
    },
    stat = (k, v, s) => {
      const c = e('div', 'cz-dstat');
      c.append(e('small', '', k), e('b', '', v), e('span', '', s || ''));
      return c;
    },
    btn = (ic, label, fn, cls) => {
      const b = e('button', 'cz-db' + (cls ? ' ' + cls : ''));
      b.innerHTML = CZ_IC[ic] || '';
      b.append(e('span', '', label));
      b.onclick = fn;
      return b;
    },
    row = (title, sub, val, fn) => {
      const r = e(fn ? 'button' : 'div', 'cz-drow');
      const t = e('div');
      t.append(e('b', '', title), e('small', '', sub));
      r.append(t, e('span', '', val || ''));
      if (fn) (r.onclick = fn), r.insertAdjacentHTML('beforeend', czS('<path d="M9 6l6 6-6 6"/>'));
      return r;
    };
  box.replaceChildren();
  // Overview
  const over = e('section', 'cz-dsec');
  over.dataset.s = 'over';
  over.append(e('small', 'cz-dkick', czSysName(g) + ' · ' + (cz.i + 1) + ' of ' + cz.list.length), e('h2', 'cz-dname', g.name));
  const acts = e('div', 'cz-dacts');
  acts.append(
    btn('play', 'Play', () => (czDetClose(true), czPlay()), 'cz-dpri'),
    btn('open', 'Read booklet', () => (czDetClose(true), czLook(), setTimeout(() => cz.lk && czLid(true), 900))),
    btn('carousel', 'Inspect', () => (czDetClose(true), czLook())),
    btn('star', fav ? 'Favourite ★' : 'Favourite', () => (czFav(), czDetFill(czG()))),
    btn('info', 'More', () => (czDetClose(true), _czOptionsShow())),
  );
  const hero = e('div', 'cz-dhero'),
    pic = e('div', 'cz-dpic'),
    side = e('div', 'cz-dside');
  if (g.cover) {
    // the whole picture, on a soft copy of itself
    pic.style.setProperty('--p', `url("${g.cover}")`);
    pic.append(e('i'));
  } else pic.textContent = 'No picture yet';
  side.append(e('small', 'cz-dkick', 'Your play'), stat('Played', x.played), stat('Last played', x.last), stat('Launches', String(x.launches)));
  hero.append(pic, side);
  over.append(acts, hero);
  // Your play
  const play = e('section', 'cz-dsec');
  play.dataset.s = 'play';
  play.append(e('small', 'cz-dkick', 'Your play'));
  const grid = e('div', 'cz-dgrid');
  grid.append(
    stat('Play time', x.played, 'all sessions'),
    stat('Launches', String(x.launches), 'times started'),
    stat('Average', x.avg, 'a session'),
    stat('Last played', x.last),
    stat('First played', x.first),
    stat('Longest', x.longest, 'one session'),
    stat('This month', x.month),
    stat('Of ' + czSysName(g), x.share, 'of your time on it'),
  );
  const wk = e('div', 'cz-dweeks');
  wk.append(e('small', '', 'Hours by week'));
  const bars = e('div', 'cz-dbars');
  x.weeks.forEach(v => {
    const b = e('i');
    b.style.height = Math.max(4, (v / mx) * 100) + '%';
    if (v) b.className = 'on';
    bars.append(b);
  });
  wk.append(bars);
  const stt = e('div', 'cz-dstatus');
  const sl = e('div');
  sl.append(e('b', '', 'Status'), e('small', '', 'Yours to set, for this game'));
  const chips = e('div', 'cz-dchips');
  CZ_STATUS.forEach(s => {
    const c = e('button', s === st ? 'on' : '', s);
    c.onclick = () => {
      try {
        if (s === st) localStorage.removeItem(czStatKey(g));
        else localStorage.setItem(czStatKey(g), s);
      } catch {}
      czSnd('on');
      const top = box.scrollTop;
      czDetFill(g);
      box.scrollTop = top;
    };
    chips.append(c);
  });
  stt.append(sl, chips);
  play.append(grid, wk, stt);
  // Your copy
  const copy = e('section', 'cz-dsec');
  copy.dataset.s = 'copy';
  const have = [!!g.cover, true, true, false];
  copy.append(e('small', 'cz-dkick', 'Your copy · ' + have.filter(Boolean).length + ' of 4 on file'));
  const things = e('div', 'cz-dgrid cz-dthings');
  [
    ['Box', g.own ? 'Your picture' : g.cover ? 'Front' : 'None yet'],
    ['Spine', 'Made for you'],
    ['Cartridge', 'On file'],
    ['Manual', 'None yet'],
  ].forEach(([n, s], i) => {
    const c = e('div', 'cz-dthing' + (have[i] ? ' on' : ''));
    const p = e('i', 'cz-dth' + i);
    if (i < 3 && g.cover) p.style.backgroundImage = `url("${g.cover}")`;
    c.append(p, e('b', '', n), e('small', '', s));
    things.append(c);
  });
  copy.append(things);
  if (czArtOk()) copy.append(row('Box art', g.own ? 'Your own picture – it wins over the automatic one' : 'Your own front cover for this game', '', () => (czDetClose(true), czArt())));
  if (!g.own && typeof czReloadOk === 'function' && czReloadOk(g)) copy.append(row('Find the cover again', 'Your folder, SteamGridDB or IGDB', '', () => czReload(g)));
  copy.append(row('Emulator for this game', emu || 'The console’s emulator', '', () => (czDetClose(true), _czOptionsShow())));
  // Info
  const info = e('section', 'cz-dsec');
  info.dataset.s = 'info';
  info.append(e('small', 'cz-dkick', 'Game info'));
  const card = e('div', 'cz-dcard');
  card.append(e('small', 'cz-dkick', czSysName(g)), e('b', '', g.name));
  const facts = e('dl');
  [
    ['Platform', czSysName(g)],
    ['Format', parts.slice(1).join(' · ') || parts[0] || '–'],
    ['Title ID', g.tid ? String(g.tid).toUpperCase() : '–'],
    ['Emulator', emu || '–'],
  ].forEach(([k, v]) => facts.append(e('dt', '', k), e('dd', '', v)));
  card.append(facts);
  info.append(card, e('p', 'cz-dnote', 'Play time is counted while CosmoU is open.'));
  box.append(over, play, copy, info);
  // the tabs
  const tabs = cz$('czdtabs').querySelector('span');
  tabs.replaceChildren(
    ...CZ_SECS.map(([k, n], i) => {
      const b = e('button', '', n);
      b.dataset.s = k;
      b.onclick = () => czDetSec(i);
      return b;
    }),
  );
}
// the tab of the part on screen
function czDetSpy() {
  if (!cz.det) return;
  const box = cz$('czdscroll'),
    top = box.scrollTop + box.clientHeight * 0.3;
  let at = 0;
  [...box.children].forEach((s, i) => s.offsetTop <= top && (at = i));
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) at = box.children.length - 1;
  cz.detSec = at;
  cz$('czdtabs')
    .querySelectorAll('button')
    .forEach((b, i) => b.classList.toggle('on', i === at));
}
function czDetSec(i) {
  const box = cz$('czdscroll'),
    n = Math.max(0, Math.min(box.children.length - 1, i)),
    s = box.children[n];
  if (!s) return;
  if (n === cz.detSec && i !== n) return czSnd('bump');
  box.scrollTo({ top: n ? s.offsetTop - 8 : 0, behavior: 'smooth' });
  czSnd('move');
}
const czDetScroll = d => cz$('czdscroll').scrollBy({ top: d, behavior: 'smooth' });
function czKeysDet() {
  const h = cz.pad
    ? [['A', 'Play'], ['X', 'Inspect'], ['✚', 'Scroll'], ['L R', 'Sections'], ['B', 'Back']]
    : [['Enter', 'Play'], ['Space', 'Inspect'], ['↑ ↓', 'Scroll'], ['← →', 'Sections'], ['Esc', 'Back']];
  const box = cz$('czkeys');
  box.dataset.k = 'det' + cz.pad;
  box.classList.toggle('cz-padk', cz.pad);
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
const _czKeysShow = czKeys;
czKeys = function () {
  if (cz.det) return czKeysDet();
  return _czKeysShow.apply(this, arguments);
};
// (called by js/case-room.js while the page is open)
function czDetKey(k, stop) {
  stop();
  if (k === 'ArrowUp' || k === 'ArrowDown') return czDetScroll(k === 'ArrowDown' ? 140 : -140);
  if (k === 'PageUp' || k === 'PageDown') return czDetScroll(k === 'PageDown' ? 420 : -420);
  if (k === 'ArrowLeft' || k === 'ArrowRight') return czDetSec(cz.detSec + (k === 'ArrowRight' ? 1 : -1));
  if (k === 'Enter') return czDetClose(true), czPlay();
  if (k === ' ' || k === 'x' || k === 'X') return czDetClose(true), czLook();
  if (k === 'f' || k === 'F') return czFav(), czDetFill(czG());
  if (['Escape', 'Backspace', 'd', 'D', '+', '='].includes(k)) return czDetClose();
}
function czDetPad(fire, s, now) {
  const dt = Math.min(50, now - (cz.detT || now));
  cz.detT = now;
  // the stick scrolls smoothly, the D-pad in steps
  const y = Math.abs(s.ry || 0) > 0.2 ? s.ry : 0;
  if (y) cz$('czdscroll').scrollTop += y * dt * 1.1;
  if (fire.u || fire.d) czDetScroll(fire.d ? 150 : -150);
  if (fire.lb || fire.rb || fire.l || fire.r) czDetSec(cz.detSec + (fire.rb || fire.r ? 1 : -1));
  if (fire.a) czDetClose(true), czPlay();
  else if (fire.b || fire.st) czDetClose();
  if (fire.x) czDetClose(true), czLook();
}
// Details (+ / D) opens the page; its "More" goes on to the game's page of the Home interface
const _czOptionsShow = czOptions;
czOptions = function () {
  return czDetOpen();
};
// leaving the Case Room, another game list: the page closes
const _czCloseShow = czClose;
czClose = function () {
  if (cz.det) czDetClose(true);
  return _czCloseShow.apply(this, arguments);
};
