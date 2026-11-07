// CosmoU – marks for your games: a colour or a small sign (a tool for system apps, ? and !), chosen on a wheel.
// Clicking the left stick makes a game a favorite; holding it opens the wheel (like the item wheel in Wind Waker).
// The colour also lines the game's cover in every view, so a marked game is easy to find. (Idea: Eduard)
const MARKS = [
  { k: 'fav', label: 'Favorite', icon: '★', col: '#f2b632' },
  { k: 'red', label: 'Red', col: '#ef4b4b' },
  { k: 'orange', label: 'Orange', col: '#ff8c2e' },
  { k: 'yellow', label: 'Yellow', col: '#f5d02e' },
  { k: 'green', label: 'Green', col: '#3fbf5f' },
  { k: 'blue', label: 'Blue', col: '#2f8cf0' },
  { k: 'purple', label: 'Purple', col: '#8a5cf0' },
  { k: 'pink', label: 'Pink', col: '#f06cc0' },
  { k: 'tool', label: 'System app', icon: '⚙', col: '#7f8a99' },
  { k: 'q', label: 'Question mark', icon: '?', col: '#f2b632' },
  { k: 'ex', label: 'Exclamation mark', icon: '!', col: '#2f8cf0' },
  // a mod (Idea: Eduard)
  { k: 'mod', label: 'Mod', icon: 'M', col: '#14b8a6' },
  { k: 'none', label: 'No mark', icon: '⊘', col: '#9aa3ad' },
];
let marks = {};
try {
  const m = JSON.parse(localStorage.getItem('cosmou.marks') || '{}');
  if (m && typeof m === 'object') marks = m;
} catch {}
// A game can have a sign and a colour at once: the sign keeps its badge, the colour lines the cover (Eduard –
// "open the wheel: choose the sign; open it again: choose the colour of the border"). Kept as 'sign:colour'.
const mkSign = k => MARKS.find(m => m.k === k && m.icon && m.k !== 'fav' && m.k !== 'none') || null;
const mkColour = k => MARKS.find(m => m.k === k && !m.icon) || null;
function mkParts(raw) {
  const [a, b] = String(raw || '').split(':');
  return { sign: mkSign(a), colour: mkColour(b) || mkColour(a) };
}
// what a game's mark becomes when k is chosen on the wheel
function mkCombine(raw, k) {
  if (k === 'none') return '';
  const { sign, colour } = mkParts(raw);
  if (mkSign(k)) return colour ? k + ':' + colour.k : k;
  if (mkColour(k)) {
    // the same colour again takes it off (the sign stays)
    if (colour && colour.k === k) return sign ? sign.k : '';
    return sign ? sign.k + ':' + k : k;
  }
  return raw || '';
}
// the mark as one thing: its name, its sign, the colour of its line (col) and of its badge
function mkLook(raw) {
  const { sign, colour } = mkParts(raw);
  if (!sign && !colour) return null;
  return {
    k: raw,
    label: sign && colour ? sign.label + ' · ' + colour.label : (sign || colour).label,
    icon: sign ? sign.icon : '',
    col: colour ? colour.col : sign.col,
    badge: sign ? sign.col : '',
  };
}
const markOf = name => mkLook(marks[name]);
function setMark(g, k) {
  if (!g) return;
  if (k === 'fav') return toggleFav(g);
  const v = mkCombine(marks[g.name], k);
  if (!v) delete marks[g.name];
  else marks[g.name] = v;
  try {
    localStorage.setItem('cosmou.marks', JSON.stringify(marks));
  } catch {}
  blip(v ? 'open' : 'back');
  const m = markOf(g.name);
  toast(m ? '✓ ' + g.name + ': ' + m.label : '✓ ' + g.name + ' has no mark now', 2400);
  render();
}
// the mark on every cover of the game: a coloured line around it and, for a sign, a small badge
function markDeco() {
  for (const el of document.querySelectorAll('[data-g]')) {
    const name = el.dataset.g.split('|')[0],
      art = el.querySelector('.art, .wa, .wh-a') || el,
      m = markOf(name);
    el.classList.toggle('marked', !!m);
    if (m) el.style.setProperty('--mark', m.col);
    else el.style.removeProperty('--mark');
    let b = art.querySelector(':scope > .mkb');
    if (m && m.icon) {
      if (!b) {
        b = document.createElement('i');
        b.className = 'mkb';
        art.append(b);
      }
      b.textContent = m.icon;
      b.style.background = m.badge || m.col;
      // as big as the box allows: small on a 3DS square or a GBA cartridge, as before on a big cover (Eduard)
      // (the Switch and Switch 2 size theirs themselves)
      const w = el.closest('.nx-t, #n2') ? 0 : art.clientWidth;
      if (w) b.style.fontSize = Math.max(7, Math.min(16, Math.round(w * 0.1))) + 'px';
      else b.style.removeProperty('font-size');
    } else if (b) b.remove();
  }
}
const _renderMk = render;
render = function () {
  const r = _renderMk.apply(this, arguments);
  markDeco();
  return r;
};

// ---------- the wheel ----------
// A ring of pieces around the game: each piece is a mark in its colour. It opens in a spiral that starts at the mark
// the game has now, with a wave of light, a rim that draws itself and a ring of sparks; the game turns in from the side.
// A comet of light runs round the rim to the chosen piece, which steps out, glows and gives off sparks; its
// neighbours lift a little, the game in the middle turns towards it and wears the mark already, and the whole room
// takes its colour. Marking: a flash, two rings and a burst of sparks and stars – the wheel folds into the game and
// the game's square on the screen lights up. Every piece has its own note; a controller rumbles softly.
// A marks – also while the stick still points at the piece (Eduard).
let mkGame = null,
  mkIx = 0,
  mkEl = null,
  mkRot = 0,
  mkT = 0,
  mkOpenAt = 0,
  // a slow computer (measured the first time the wheel opens): the wheel without its costly extras
  mkLite = null;
const mkIsOpen = () => !!(mkEl && mkEl.classList.contains('on') && !mkEl.classList.contains('closing'));
const MK_N = () => MARKS.length;
// the angle of a piece's middle (0 = at the top, clockwise)
const mkAng = i => (i / MK_N()) * 360;
const mkPt = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(Math.cos(a) * r).toFixed(3), +(Math.sin(a) * r).toFixed(3)];
};
const mkCalm = () => typeof reduceMotion === 'function' && reduceMotion();
// one piece of the ring: from the outer edge to the inner one, with a small gap to its neighbours
function mkSegPath(i) {
  const half = 180 / MK_N() - 1.6,
    a0 = mkAng(i) - half,
    a1 = mkAng(i) + half,
    R1 = 188,
    R0 = 118;
  const [x0, y0] = mkPt(a0, R1),
    [x1, y1] = mkPt(a1, R1),
    [x2, y2] = mkPt(a1, R0),
    [x3, y3] = mkPt(a0, R0);
  return `M${x0} ${y0} A${R1} ${R1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R0} ${R0} 0 0 0 ${x3} ${y3}Z`;
}
// the little lines on the rim, like the bezel of a watch (every fifth a longer one)
function mkTicks() {
  let d = '';
  for (let t = 0; t < 60; t++) {
    const [x0, y0] = mkPt(t * 6, 194),
      [x1, y1] = mkPt(t * 6, t % 5 ? 198 : 202);
    d += `M${x0} ${y0}L${x1} ${y1}`;
  }
  return d;
}
function mkBuild() {
  mkEl = document.createElement('div');
  mkEl.id = 'mkwheel';
  mkEl.setAttribute('role', 'dialog');
  mkEl.setAttribute('aria-label', 'Mark this game');
  const segs = MARKS.map((m, i) => {
    const [tx, ty] = mkPt(mkAng(i), 1),
      d = mkSegPath(i);
    return `<g class="mk-seg mk-s-${m.k}" data-i="${i}" style="--col:${m.col};--tx:${tx};--ty:${ty};--k:${i}"><path class="mk-sf" d="${d}"/><path class="mk-sh" d="${d}"/></g>`;
  }).join('');
  mkEl.innerHTML = `
    <div class="mk-bg"><i class="mk-aura a1"></i><i class="mk-aura a2"></i></div>
    <div class="mk-stage">
      <div class="mk-glow"></div>
      <i class="mk-orbit"></i>
      <i class="mk-wave"></i>
      <svg class="mk-svg" viewBox="-210 -210 420 420" aria-hidden="true">
        <defs>
          <radialGradient id="mkShade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="188">
            <stop offset="0.63" stop-color="#000" stop-opacity="0.34"/>
            <stop offset="0.75" stop-color="#000" stop-opacity="0"/>
            <stop offset="0.9" stop-color="#fff" stop-opacity="0"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0.34"/>
          </radialGradient>
        </defs>
        <circle class="mk-plate" r="206"/>
        <path class="mk-ticks" d="${mkTicks()}"/>
        <circle class="mk-rimline" r="206"/>
        <g class="mk-segs">${segs}</g>
        <circle class="mk-rim" r="110"/>
        <g class="mk-needle"><path d="M0 -114 L-9 -100 L9 -100Z"/></g>
      </svg>
      <div class="mk-comet"></div>
      <div class="mk-shine"></div>
      <div class="mk-btns"></div>
      <div class="mk-mid">
        <div class="mk-cover"><i class="mk-halo"></i><div class="mk-art"></div><i class="mk-gloss"></i><i class="mk-badge"></i></div>
        <b class="mk-name"></b>
        <small class="mk-game"></small>
      </div>
      <i class="mk-ripple"></i><i class="mk-ripple r2"></i><i class="mk-flash"></i>
    </div>
    <p class="mk-hint"></p>`;
  mkEl.addEventListener('click', e => (e.target === mkEl || e.target.classList.contains('mk-bg')) && markClose());
  // the pieces: point at one to choose it, click to mark
  for (const p of mkEl.querySelectorAll('.mk-seg')) {
    const i = +p.dataset.i;
    p.addEventListener('pointerenter', () => mkIx !== i && (markPick(i), mkSnd(i)));
    p.addEventListener('click', () => (markPick(i), markApply()));
  }
  // the signs and colours as buttons on top (for the keyboard focus and screen readers)
  const btns = mkEl.querySelector('.mk-btns');
  MARKS.forEach((m, i) => {
    const b = document.createElement('button'),
      [x, y] = mkPt(mkAng(i), 153 / 210);
    b.className = 'mk-i mk-' + m.k;
    b.style.setProperty('--x', x);
    b.style.setProperty('--y', y);
    b.style.setProperty('--col', m.col);
    b.style.setProperty('--k', i);
    // (the sign in its own box: it grows and pops without moving away from its piece)
    const t = document.createElement('span');
    t.textContent = m.icon || '';
    b.append(t);
    b.title = m.label;
    b.setAttribute('aria-label', m.label);
    b.onpointerenter = () => mkIx !== i && (markPick(i), mkSnd(i));
    b.onclick = () => (markPick(i), markApply());
    btns.append(b);
  });
  // the mouse wheel goes round
  mkEl.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      if (Date.now() - mkT < 70) return;
      mkT = Date.now();
      markPick(mkIx + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
      mkSnd(mkIx);
    },
    { passive: false },
  );
  document.body.append(mkEl);
}
function markWheel(g) {
  g = g || cur();
  if (!g) return;
  if (typeof hoverOff === 'function') hoverOff();
  mkGame = g;
  if (!mkEl) mkBuild();
  mkEl.classList.remove('closing', 'apply', 'on');
  // the game in the middle, and its colours behind everything
  paint(mkEl.querySelector('.mk-art'), g);
  mkEl.querySelector('.mk-game').textContent = g.name;
  const bg = mkEl.querySelector('.mk-bg');
  bg.style.setProperty('--cover', g.cover ? `url("${g.cover}")` : 'none');
  // the controller's own names for its buttons (js/ds.js)
  const gl = k => (typeof dsGlyph === 'function' ? dsGlyph(k) : k.toUpperCase());
  const hint = mkEl.querySelector('.mk-hint');
  hint.replaceChildren(
    ...[
      ['◎', 'Choose'],
      [gl('a'), 'Mark'],
      [gl('b'), 'Close'],
    ].map(([k, t]) => {
      const s = document.createElement('span'),
        i = document.createElement('i');
      i.textContent = k;
      s.append(i, t);
      return s;
    }),
  );
  // start on what the game has now – the pieces come in a spiral from there
  const now = favs.has(g.name) && !marks[g.name] ? 'fav' : String(marks[g.name] || 'fav').split(':')[0];
  const at = Math.max(0, MARKS.findIndex(m => m.k === now)),
    n = MK_N();
  mkEl.querySelectorAll('.mk-seg').forEach((p, j) => p.style.setProperty('--o', (j - at + n) % n));
  mkEl.querySelectorAll('.mk-i').forEach((b, j) => b.style.setProperty('--o', (j - at + n) % n));
  mkRot = mkAng(at);
  mkEl.style.setProperty('--rot', mkRot + 'deg');
  mkOpenAt = 0;
  markPick(at);
  mkEl.classList.toggle('mk-lite', mkLite === true);
  void mkEl.offsetWidth;
  mkEl.classList.add('on');
  mkOpenAt = performance.now();
  mkSnd(-1);
  // the first time: how smooth is it on this computer? Below ~30 pictures a second the costly extras go
  // (one very long picture is enough to know – the extras go at once, not after a choppy opening)
  if (mkLite === null && !mkCalm()) {
    let n = 0,
      last = performance.now();
    const t0 = last,
      f = now => {
        n++;
        // (not the very first picture: it carries the one-off work of opening)
        const long = n > 1 && now - last > 150;
        last = now;
        if (!long && now - t0 < 400) return requestAnimationFrame(f);
        mkLite = long || (now - t0) / n > 34;
        if (mkLite) mkEl.classList.add('mk-lite');
      };
    requestAnimationFrame(f);
  }
  // a ring of sparks leaves the rim as it draws itself
  setTimeout(() => {
    if (!mkIsOpen()) return;
    MARKS.forEach((m, j) => {
      const [x, y] = mkWheelPt(j, 202),
        a = ((mkAng(j) - 90) * Math.PI) / 180;
      mkSparks(x, y, m.k === 'none' ? '#dfe6f5' : m.col, 2, { a, spread: 0.5, v: 2.6, r: 1.8, life: 38, g: 0 });
    });
  }, 300);
}
// a point on the wheel on the screen: piece i, r in the wheel's own units (210 = its edge)
function mkWheelPt(i, r) {
  const st = mkEl.querySelector('.mk-stage').getBoundingClientRect(),
    [ux, uy] = mkPt(mkAng(i), r / 210);
  return [st.left + st.width / 2 + (ux * st.width) / 2, st.top + st.height / 2 + (uy * st.height) / 2];
}
// a class that starts its animation again
const mkRe = (el, c) => {
  if (!el) return;
  el.classList.remove(c);
  void el.offsetWidth;
  el.classList.add(c);
};
function markPick(i) {
  mkIx = (i + MK_N()) % MK_N();
  const m = MARKS[mkIx],
    n = MK_N(),
    live = mkEl.classList.contains('on') && mkOpenAt && performance.now() - mkOpenAt > 320;
  mkEl.querySelectorAll('.mk-seg').forEach((p, j) => {
    p.classList.toggle('sel', j === mkIx);
    p.classList.toggle('near', j === (mkIx + 1) % n || j === (mkIx - 1 + n) % n);
    if (j !== mkIx) p.classList.remove('kick');
  });
  mkEl.querySelectorAll('.mk-i').forEach((b, j) => {
    b.classList.toggle('sel', j === mkIx);
    if (j !== mkIx) b.classList.remove('pop');
  });
  // the pointer (and the comet on the rim) turn the short way round
  const want = mkAng(mkIx),
    d = ((want - (mkRot % 360) + 540) % 360) - 180;
  mkRot += d;
  mkEl.style.setProperty('--rot', mkRot + 'deg');
  mkEl.style.setProperty('--sel', m.col);
  // the game in the middle turns towards the piece
  const a = (want * Math.PI) / 180;
  mkEl.style.setProperty('--sx', Math.sin(a).toFixed(3));
  mkEl.style.setProperty('--sy', (-Math.cos(a)).toFixed(3));
  const fav = m.k === 'fav' && mkGame && favs.has(mkGame.name);
  const name = mkEl.querySelector('.mk-name');
  name.textContent = fav ? 'No favorite' : m.label;
  // the game in the middle wears the mark already
  const cov = mkEl.querySelector('.mk-cover'),
    badge = mkEl.querySelector('.mk-badge');
  cov.dataset.k = fav ? 'none' : m.k;
  // with what it has already: a colour keeps its sign, a sign keeps its colour
  const pv = m.k === 'fav' ? null : mkLook(mkCombine(mkGame && marks[mkGame.name], m.k));
  // the same colour again takes it off
  if (m.k !== 'fav' && m.k !== 'none' && !pv) (cov.dataset.k = 'none'), (name.textContent = 'No colour');
  cov.style.setProperty('--pv', pv ? pv.col : m.col);
  badge.style.setProperty('--pb', pv && pv.badge ? pv.badge : m.col);
  const was = badge.textContent;
  badge.textContent = fav ? '' : m.k === 'fav' ? m.icon : pv ? pv.icon || '' : '';
  // the name says what the game will wear: “Exclamation mark · Red”
  if (pv && m.k !== 'none') name.textContent = pv.label;
  // the name comes in from the side the wheel turned to
  name.classList.remove('swap-l', 'swap-r');
  void name.offsetWidth;
  name.classList.add(d < 0 ? 'swap-l' : 'swap-r');
  if (!live) return;
  // the chosen piece kicks out, its sign pops, light runs over the game, sparks fly from the piece
  const seg = mkEl.querySelector(`.mk-seg[data-i="${mkIx}"]`);
  mkRe(seg, 'kick');
  mkRe(mkEl.querySelectorAll('.mk-i')[mkIx], 'pop');
  mkRe(cov, 'shine');
  if (badge.textContent && badge.textContent !== was) mkRe(badge, 'stamp');
  const [x, y] = mkWheelPt(mkIx, 190);
  mkSparks(x, y, m.k === 'none' ? '#dfe6f5' : m.k === 'fav' ? '#ffc443' : m.col, 7, { a: a - Math.PI / 2, spread: 1.3, v: 4.2, r: 2.2, life: 30, g: 0.04 });
}
function markApply() {
  if (!mkIsOpen()) return;
  const g = mkGame,
    k = MARKS[mkIx].k;
  mkSnd(-2);
  mkBoom();
  markClose(true, true);
  setMark(g, k);
  mkJust(g);
}
// marking: a burst of sparks and stars from the game, in the mark's colours – it flies on over the library
function mkBoom() {
  const cov = mkEl.querySelector('.mk-cover'),
    r = cov.getBoundingClientRect(),
    x = r.left + r.width / 2,
    y = r.top + r.height / 2,
    m = MARKS[mkIx],
    col = m.k === 'none' ? '#dfe6f5' : (cov.style.getPropertyValue('--pv') || m.col).trim(),
    badge = (mkEl.querySelector('.mk-badge').style.getPropertyValue('--pb') || col).trim();
  mkSparks(x, y, [col, '#ffffff', badge, col], 64, { v: 13, r: 3.1, life: 64, g: 0.16, stars: true });
  mkSparks(x, y, [col, '#ffffff'], 26, { v: 5.5, r: 2, life: 42, g: 0.02 });
}
// after marking: the game's square on the screen lights up in its new colour
function mkJust(g) {
  const name = g && g.name;
  if (!name || mkCalm()) return;
  setTimeout(() => {
    for (const e of document.querySelectorAll('[data-g]')) {
      if (e.dataset.g.split('|')[0] !== name || e.closest('#mkwheel')) continue;
      const a = e.querySelector('.art, .wa, .wh-a, .nx-art, .n2-art') || e;
      mkRe(a, 'mk-just');
      setTimeout(() => a.classList.remove('mk-just'), 1300);
    }
  }, 360);
}
function markClose(quiet, applied) {
  if (!mkEl || !mkEl.classList.contains('on') || mkEl.classList.contains('closing')) return;
  mkEl.classList.add('closing');
  if (applied) mkEl.classList.add('apply');
  if (!quiet) mkSnd(-3);
  setTimeout(
    () => {
      if (mkEl.classList.contains('closing')) mkEl.classList.remove('on', 'closing', 'apply');
    },
    applied ? 780 : 320,
  );
}

// ---------- sparks: a canvas over everything, drawn only while sparks fly ----------
const mkFx = { c: null, x: null, p: [], raf: 0, dpr: 1, last: 0 };
function mkFxCanvas() {
  if (!mkFx.c) {
    mkFx.c = document.createElement('canvas');
    mkFx.c.className = 'mk-fx';
    mkFx.c.setAttribute('aria-hidden', 'true');
    document.body.append(mkFx.c);
    mkFx.x = mkFx.c.getContext('2d');
  }
  const dpr = Math.min(1.5, devicePixelRatio || 1),
    w = Math.round(innerWidth * dpr),
    h = Math.round(innerHeight * dpr);
  if (mkFx.c.width !== w || mkFx.c.height !== h) {
    mkFx.c.width = w;
    mkFx.c.height = h;
  }
  mkFx.dpr = dpr;
  return mkFx;
}
// n sparks from (x, y): their colour (or colours), which way (a, spread), how fast, how big, how long, how heavy;
// stars: some of them are four-pointed stars that turn
function mkSparks(x, y, col, n, o = {}) {
  if (mkCalm()) return;
  if (mkLite) n = Math.ceil(n / 2);
  const f = mkFxCanvas();
  for (let k = 0; k < n; k++) {
    const a = o.a !== undefined ? o.a + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2,
      v = (o.v || 6) * (0.45 + Math.random() * 0.75);
    f.p.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: (o.r || 3) * (0.5 + Math.random()),
      t: 0,
      max: (o.life || 50) * (0.7 + Math.random() * 0.6),
      col: Array.isArray(col) ? col[k % col.length] : col,
      star: !!o.stars && Math.random() < 0.38,
      g: o.g === undefined ? 0.12 : o.g,
      rot: Math.random() * 6,
    });
  }
  if (f.p.length > 400) f.p.splice(0, f.p.length - 400);
  if (!f.raf) {
    f.last = performance.now();
    f.raf = requestAnimationFrame(mkFxTick);
  }
}
function mkFxTick(now) {
  const f = mkFx,
    x = f.x,
    // (the same speed at 60 and at 144 frames a second)
    dt = Math.max(0.5, Math.min(3, (now - f.last) / 16.7));
  f.last = now;
  f.raf = 0;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, f.c.width, f.c.height);
  x.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  x.globalCompositeOperation = 'lighter';
  f.p = f.p.filter(p => p.t < p.max);
  for (const p of f.p) {
    p.t += dt;
    const drag = Math.pow(0.955, dt);
    p.vx *= drag;
    p.vy = p.vy * drag + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = p.t / p.max,
      al = Math.max(0, 1 - k * k),
      r = p.r * (1 - k * 0.55);
    x.fillStyle = p.col;
    if (p.star) {
      const s = r * 2.7;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot + p.t * 0.12);
      x.globalAlpha = al;
      x.beginPath();
      for (let q = 0; q < 8; q++) {
        const rr = q % 2 ? s * 0.26 : s,
          aa = (q * Math.PI) / 4;
        x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
      x.closePath();
      x.fill();
      x.restore();
    } else {
      // a soft glow and a bright core
      x.globalAlpha = al * 0.3;
      x.beginPath();
      x.arc(p.x, p.y, r * 2.6, 0, 6.2832);
      x.fill();
      x.globalAlpha = al;
      x.beginPath();
      x.arc(p.x, p.y, r, 0, 6.2832);
      x.fill();
    }
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  if (f.p.length) f.raf = requestAnimationFrame(mkFxTick);
  else {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, f.c.width, f.c.height);
  }
}
// a controller in use rumbles softly: a tick for every piece, a thump for a mark
function mkRumble(ms, strong, weak) {
  try {
    for (const p of navigator.getGamepads ? navigator.getGamepads() : []) {
      const v = p && p.vibrationActuator;
      if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
    }
  } catch {}
}

// its own little sounds: a note for every piece (rising around the ring); opening: a soft whoosh and three notes;
// marking: a deep thump, a shimmer and a sparkle; closing: a whoosh down
const MK_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
let mkCtx = null,
  mkNoise = null;
function mkSnd(i) {
  if (typeof uiSounds !== 'undefined' && !uiSounds) return;
  try {
    mkCtx = mkCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (mkCtx.state === 'suspended') mkCtx.resume();
    const c = mkCtx,
      t = c.currentTime + 0.005,
      out = c.createGain();
    out.gain.value = 0.14;
    out.connect(c.destination);
    const bell = (at, f, dur, g) => {
      const o = c.createOscillator(),
        m = c.createOscillator(),
        mg = c.createGain(),
        e = c.createGain();
      o.frequency.value = f;
      m.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 0.6, t + at);
      mg.gain.exponentialRampToValueAtTime(1, t + at + dur);
      m.connect(mg).connect(o.frequency);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + 0.005);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(out);
      o.start(t + at);
      m.start(t + at);
      o.stop(t + at + dur + 0.02);
      m.stop(t + at + dur + 0.02);
    };
    // air through a filter that moves: a whoosh (up or down) or a shimmer
    const air = (at, dur, f0, f1, g, q = 1.4) => {
      if (!mkNoise) {
        const n = Math.ceil(c.sampleRate * 0.8);
        mkNoise = c.createBuffer(1, n, c.sampleRate);
        const d = mkNoise.getChannelData(0);
        for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
      }
      const s = c.createBufferSource(),
        bp = c.createBiquadFilter(),
        e = c.createGain();
      s.buffer = mkNoise;
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t + at);
      bp.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + dur * 0.35);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      s.connect(bp).connect(e).connect(out);
      s.start(t + at);
      s.stop(t + at + dur + 0.02);
    };
    // a deep, short thump
    const thump = (at, g) => {
      const o = c.createOscillator(),
        e = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t + at);
      o.frequency.exponentialRampToValueAtTime(46, t + at + 0.24);
      e.gain.setValueAtTime(0.0001, t + at);
      e.gain.exponentialRampToValueAtTime(g, t + at + 0.008);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.3);
      o.connect(e).connect(out);
      o.start(t + at);
      o.stop(t + at + 0.32);
    };
    const note = k => 523.25 * Math.pow(2, MK_SCALE[((k % 12) + 12) % 12] / 12);
    if (i >= 0) bell(0, note(i), 0.22, 0.5);
    else if (i === -1) {
      air(0, 0.42, 500, 2600, 0.5);
      bell(0.05, note(0), 0.3, 0.33);
      bell(0.11, note(2), 0.3, 0.3);
      bell(0.17, note(4), 0.45, 0.3);
    } else if (i === -2) {
      thump(0, 0.9);
      air(0.02, 0.5, 2600, 9000, 0.32, 0.9);
      bell(0.02, note(mkIx) * 2, 0.5, 0.4);
      bell(0.09, note(mkIx + 2) * 2, 0.5, 0.32);
      bell(0.16, note(mkIx + 4) * 2, 0.8, 0.28);
    } else {
      air(0, 0.28, 2200, 450, 0.38);
      bell(0, note(2), 0.18, 0.3);
      bell(0.06, note(0) / 2, 0.22, 0.26);
    }
  } catch {}
}
// the controller while the wheel is open: the left stick points at a mark, the D-pad goes round, A (or the
// left stick clicked again) marks, B closes
let mkStickAt = 0;
function markPad(fire, gp0) {
  const x = gp0.axes[0] || 0,
    y = gp0.axes[1] || 0;
  if (Math.hypot(x, y) > 0.6) {
    const a = Math.atan2(y, x) + Math.PI / 2,
      i = Math.round((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * MK_N()) % MK_N();
    if (i !== mkIx) {
      markPick(i);
      mkSnd(i);
      mkRumble(16, 0, 0.22);
    }
    mkStickAt = Date.now();
  } else if (Date.now() - mkStickAt > 250) {
    // (the D-pad, or the stick only after it came back to the middle)
    if (fire.r || fire.d) markPick(mkIx + 1), mkSnd(mkIx), mkRumble(16, 0, 0.22);
    if (fire.l || fire.u) markPick(mkIx - 1), mkSnd(mkIx), mkRumble(16, 0, 0.22);
  }
  if (fire.lb) markPick(mkIx - 1), mkSnd(mkIx), mkRumble(16, 0, 0.22);
  if (fire.rb) markPick(mkIx + 1), mkSnd(mkIx), mkRumble(16, 0, 0.22);
  // A marks while the stick still points at the mark – no need to let go of the stick first (Eduard)
  if (fire.a || fire.l3) mkRumble(170, 0.55, 0.8), markApply();
  else if (fire.b) mkRumble(40, 0, 0.3), markClose();
}
addEventListener(
  'keydown',
  e => {
    if (!mkIsOpen()) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', 'Escape', ' ', 'k', 'K', 'Tab'].includes(k)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (k === 'ArrowRight' || k === 'ArrowDown' || (k === 'Tab' && !e.shiftKey)) markPick(mkIx + 1), mkSnd(mkIx);
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'Tab') markPick(mkIx - 1), mkSnd(mkIx);
    else if (k === 'Enter' || k === ' ') markApply();
    else if (k === 'Escape' || k === 'k' || k === 'K') markClose();
  },
  true,
);
// keyboard: K opens the wheel for the chosen game
addEventListener('keydown', e => {
  if (mkIsOpen() || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key.toLowerCase() === 'k' && cur()) {
    e.preventDefault();
    markWheel(cur());
  }
});
// an icon for "Mark…" in the game's menu
if (typeof MI !== 'undefined')
  MI.mark =
    '<svg viewBox="0 0 32 32"><path d="M5 6.5A1.5 1.5 0 0 1 6.5 5H16l11 11-11 11L5 16z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><circle cx="11" cy="11" r="2.4" fill="#fff"/></svg>';
if (typeof MCOL !== 'undefined') MCOL.mark = '#8a5cf0';
