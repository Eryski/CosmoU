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
const markOf = name => MARKS.find(m => m.k === marks[name] && m.k !== 'fav' && m.k !== 'none') || null;
function setMark(g, k) {
  if (!g) return;
  if (k === 'fav') return toggleFav(g);
  if (k === 'none') delete marks[g.name];
  else marks[g.name] = k;
  try {
    localStorage.setItem('cosmou.marks', JSON.stringify(marks));
  } catch {}
  blip(k === 'none' ? 'back' : 'open');
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
      b.style.background = m.col;
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
// A ring of twelve pieces around the game: each piece is a mark in its colour, the chosen one steps out and glows,
// a pointer turns to it, the game in the middle shows the mark before you choose it, and every piece has its own
// note (they rise around the ring). A marks – also while the stick still points at the piece (Eduard).
let mkGame = null,
  mkIx = 0,
  mkEl = null,
  mkRot = 0,
  mkT = 0;
const mkIsOpen = () => !!(mkEl && mkEl.classList.contains('on') && !mkEl.classList.contains('closing'));
const MK_N = () => MARKS.length;
// the angle of a piece's middle (0 = at the top, clockwise)
const mkAng = i => (i / MK_N()) * 360;
const mkPt = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * r).toFixed(2)];
};
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
function mkBuild() {
  mkEl = document.createElement('div');
  mkEl.id = 'mkwheel';
  mkEl.setAttribute('role', 'dialog');
  mkEl.setAttribute('aria-label', 'Mark this game');
  const segs = MARKS.map((m, i) => {
    const [tx, ty] = mkPt(mkAng(i), 1);
    return `<path class="mk-seg mk-s-${m.k}" data-i="${i}" d="${mkSegPath(i)}" style="--col:${m.col};--tx:${tx};--ty:${ty};--k:${i}"/>`;
  }).join('');
  mkEl.innerHTML = `
    <div class="mk-bg"></div>
    <div class="mk-stage">
      <div class="mk-glow"></div>
      <svg class="mk-svg" viewBox="-210 -210 420 420" aria-hidden="true">
        <circle class="mk-plate" r="198"/>
        <g class="mk-segs">${segs}</g>
        <circle class="mk-rim" r="110"/>
        <g class="mk-needle"><path d="M0 -114 L-9 -100 L9 -100Z"/></g>
      </svg>
      <div class="mk-shine"></div>
      <div class="mk-btns"></div>
      <div class="mk-mid">
        <div class="mk-cover"><div class="mk-art"></div><i class="mk-badge"></i></div>
        <b class="mk-name"></b>
        <small class="mk-game"></small>
      </div>
      <i class="mk-ripple"></i>
      <div class="mk-burst">${Array.from({ length: 16 }, (_, k) => `<i style="--a:${k * 22.5 + (k % 2) * 9}deg;--d:${k % 3 === 0 ? 0.5 : k % 3 === 1 ? 0.42 : 0.36};--s:${k % 2 ? 0.7 : 1}"></i>`).join('')}</div>
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
    b.textContent = m.icon || '';
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
  // start on what the game has now
  const now = favs.has(g.name) && !marks[g.name] ? 'fav' : marks[g.name] || 'fav';
  const at = Math.max(0, MARKS.findIndex(m => m.k === now));
  mkRot = mkAng(at);
  mkEl.style.setProperty('--rot', mkRot + 'deg');
  markPick(at);
  void mkEl.offsetWidth;
  mkEl.classList.add('on');
  mkSnd(-1);
}
function markPick(i) {
  mkIx = (i + MK_N()) % MK_N();
  const m = MARKS[mkIx];
  mkEl.querySelectorAll('.mk-seg').forEach((p, j) => p.classList.toggle('sel', j === mkIx));
  mkEl.querySelectorAll('.mk-i').forEach((b, j) => b.classList.toggle('sel', j === mkIx));
  // the pointer turns the short way round
  const want = mkAng(mkIx),
    d = ((want - (mkRot % 360) + 540) % 360) - 180;
  mkRot += d;
  mkEl.style.setProperty('--rot', mkRot + 'deg');
  mkEl.style.setProperty('--sel', m.col);
  const fav = m.k === 'fav' && mkGame && favs.has(mkGame.name);
  mkEl.querySelector('.mk-name').textContent = fav ? 'No favorite' : m.label;
  // the game in the middle wears the mark already
  const cov = mkEl.querySelector('.mk-cover'),
    badge = mkEl.querySelector('.mk-badge');
  cov.dataset.k = fav ? 'none' : m.k;
  badge.textContent = fav ? '' : m.icon || '';
  const name = mkEl.querySelector('.mk-name');
  name.classList.remove('swap');
  void name.offsetWidth;
  name.classList.add('swap');
}
function markApply() {
  if (!mkIsOpen()) return;
  const g = mkGame,
    k = MARKS[mkIx].k;
  mkSnd(-2);
  markClose(true, true);
  setMark(g, k);
}
function markClose(quiet, applied) {
  if (!mkEl || !mkEl.classList.contains('on') || mkEl.classList.contains('closing')) return;
  mkEl.classList.add('closing');
  if (applied) mkEl.classList.add('apply');
  if (!quiet) mkSnd(-3);
  setTimeout(() => {
    if (mkEl.classList.contains('closing')) mkEl.classList.remove('on', 'closing', 'apply');
  }, applied ? 520 : 240);
}
// its own little sounds: a note for every piece (rising around the ring), a sparkle when a mark is set
const MK_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
let mkCtx = null;
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
    const note = k => 523.25 * Math.pow(2, MK_SCALE[((k % 12) + 12) % 12] / 12);
    if (i >= 0) bell(0, note(i), 0.22, 0.5);
    else if (i === -1) {
      bell(0, note(0), 0.3, 0.35);
      bell(0.06, note(2), 0.3, 0.32);
      bell(0.12, note(4), 0.4, 0.3);
    } else if (i === -2) {
      bell(0, note(mkIx) * 2, 0.5, 0.4);
      bell(0.07, note(mkIx + 2) * 2, 0.5, 0.32);
      bell(0.14, note(mkIx + 4) * 2, 0.7, 0.28);
    } else bell(0, note(2), 0.18, 0.35), bell(0.06, note(0) / 2, 0.22, 0.3);
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
    }
    mkStickAt = Date.now();
  } else if (Date.now() - mkStickAt > 250) {
    // (the D-pad, or the stick only after it came back to the middle)
    if (fire.r || fire.d) markPick(mkIx + 1), mkSnd(mkIx);
    if (fire.l || fire.u) markPick(mkIx - 1), mkSnd(mkIx);
  }
  if (fire.lb) markPick(mkIx - 1), mkSnd(mkIx);
  if (fire.rb) markPick(mkIx + 1), mkSnd(mkIx);
  // A marks while the stick still points at the mark – no need to let go of the stick first (Eduard)
  if (fire.a || fire.l3) markApply();
  else if (fire.b) markClose();
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
