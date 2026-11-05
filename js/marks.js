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
let mkGame = null,
  mkIx = 0,
  mkEl = null;
const mkIsOpen = () => !!(mkEl && mkEl.classList.contains('on'));
function markWheel(g) {
  g = g || cur();
  if (!g) return;
  hoverOff && hoverOff();
  mkGame = g;
  if (!mkEl) {
    mkEl = document.createElement('div');
    mkEl.id = 'mkwheel';
    mkEl.setAttribute('role', 'dialog');
    mkEl.innerHTML = '<div class="mk-ring"></div><div class="mk-mid"><b></b><small></small></div><p class="mk-hint">Left stick or D-pad to choose · A to mark · B to close</p>';
    mkEl.addEventListener('click', e => e.target === mkEl && markClose());
    document.body.append(mkEl);
  }
  const ring = mkEl.querySelector('.mk-ring');
  ring.replaceChildren();
  MARKS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mk-i mk-' + m.k;
    const a = (i / MARKS.length) * Math.PI * 2 - Math.PI / 2;
    b.style.setProperty('--x', Math.cos(a).toFixed(3));
    b.style.setProperty('--y', Math.sin(a).toFixed(3));
    b.style.setProperty('--col', m.col);
    b.textContent = m.icon || '';
    b.title = m.label;
    b.onpointerenter = () => markPick(i);
    b.onclick = () => {
      markPick(i);
      markApply();
    };
    ring.append(b);
  });
  // start on what the game has now
  const now = favs.has(g.name) && !marks[g.name] ? 'fav' : marks[g.name] || 'fav';
  markPick(Math.max(0, MARKS.findIndex(m => m.k === now)));
  mkEl.querySelector('.mk-mid small').textContent = g.name;
  mkEl.classList.add('on');
  blip('open');
}
function markPick(i) {
  mkIx = (i + MARKS.length) % MARKS.length;
  const m = MARKS[mkIx];
  mkEl.querySelectorAll('.mk-i').forEach((b, j) => b.classList.toggle('sel', j === mkIx));
  mkEl.querySelector('.mk-mid b').textContent = m.k === 'fav' && mkGame && favs.has(mkGame.name) ? 'No favorite' : m.label;
}
function markApply() {
  const g = mkGame,
    k = MARKS[mkIx].k;
  markClose(true);
  setMark(g, k);
}
function markClose(quiet) {
  if (!mkEl) return;
  mkEl.classList.remove('on');
  if (!quiet) blip('back');
}
// the controller while the wheel is open: the left stick points at a mark, the D-pad goes round, A (or the
// left stick clicked again) marks, B closes
let mkStickAt = 0;
function markPad(fire, gp0) {
  const x = gp0.axes[0] || 0,
    y = gp0.axes[1] || 0;
  if (Math.hypot(x, y) > 0.6) {
    const a = Math.atan2(y, x) + Math.PI / 2,
      i = Math.round((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * MARKS.length) % MARKS.length;
    if (i !== mkIx) {
      markPick(i);
      blip('move');
    }
    mkStickAt = Date.now();
    return;
  }
  // (the D-pad, or the stick only after it came back to the middle)
  if (Date.now() - mkStickAt > 250) {
    if (fire.r || fire.d) markPick(mkIx + 1), blip('move');
    if (fire.l || fire.u) markPick(mkIx - 1), blip('move');
  }
  if (fire.a || fire.l3) markApply();
  else if (fire.b) markClose();
}
addEventListener(
  'keydown',
  e => {
    if (!mkIsOpen()) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', 'Escape', ' '].includes(k)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (k === 'ArrowRight' || k === 'ArrowDown') markPick(mkIx + 1), blip('move');
    else if (k === 'ArrowLeft' || k === 'ArrowUp') markPick(mkIx - 1), blip('move');
    else if (k === 'Enter' || k === ' ') markApply();
    else if (k === 'Escape') markClose();
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
