// CosmoU – the UI rework (with css/rework.css): the same patterns in every window.
//   · Grid: a calm banner with the cover in front of its own blurred colours
//   · Details: one quiet line instead of four empty statistics before the first play
//   · Empty states: an icon, one sentence and the next step as a button
//   · Controller and arrow keys: in every window the D-pad (or an arrow key) goes to the button that is really in
//     that direction – rows, grids and lists alike – instead of walking through a hidden list order
// Loaded last, after js/app.js.

// ---------- Grid: the banner ----------
const RW_IC = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  filter:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
};
function rwHero() {
  const h = $('#hero');
  if (!h || h.hidden) return;
  const g = cur();
  if (!g) return;
  // a real banner (wide picture) stays as it is; a box cover becomes a blurred backdrop with the sharp cover in front
  const blur = !g.hero;
  h.classList.toggle('blur', blur);
  let c = h.querySelector('.hcov');
  if (!c) {
    c = document.createElement('div');
    c.className = 'hcov';
    c.setAttribute('aria-hidden', 'true');
    h.querySelector('.in').prepend(c);
  }
  if (blur && c.dataset.g !== g.name + '|' + (g.cover || '')) {
    c.dataset.g = g.name + '|' + (g.cover || '');
    if (typeof chPaintBox === 'function') chPaintBox(c, g);
    else paint(c, g);
  }
}

// ---------- empty states ----------
function rwEmpty() {
  const em = $('#empty');
  if (!em || em.hidden) return;
  const q = $('#q').value.trim(),
    filtered = typeof showFilter === 'string' && showFilter !== 'all' && games.length;
  const kind = q ? 'search' : view === 'recent' ? 'clock' : filtered ? 'filter' : 'folder';
  $('#eic').innerHTML = RW_IC[kind];
  $('#eclr').hidden = !q;
  $('#elib').hidden = !!q || view !== 'recent';
  if (q) $('#et').textContent = 'Nothing called “' + (q.length > 28 ? q.slice(0, 27) + '…' : q) + '”';
  if (q) $('#ep').textContent = 'Search looks at the game names. Try a shorter word, or clear the search.';
}
$('#eclr').onclick = () => {
  const i = $('#q');
  i.value = '';
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.focus();
};
$('#elib').onclick = () => document.querySelector('nav button[data-v="lib"]').click();

const _renderRw = render;
render = function () {
  const r = _renderRw.apply(this, arguments);
  try {
    if (mode === 'grid') rwHero();
    rwEmpty();
  } catch (e) {
    console.error(e);
  }
  return r;
};
// the search box kept the older render function: give it this one
$('#q').oninput = () => render();

// ---------- Details: before the first play, one quiet line ----------
if (typeof detStats === 'function') {
  const _detStatsRw = detStats;
  detStats = function (g) {
    _detStatsRw(g);
    const box = $('#dstats'),
      p = (typeof playLog === 'object' && playLog.playtime && playLog.playtime[g.name]) || null,
      played = !!((p && (p.sec || p.last)) || plays[g.name]);
    box.classList.toggle('fresh', !played);
    if (!played) {
      box.innerHTML = RW_IC.play;
      const s = document.createElement('span');
      s.textContent = g.kind === 'app' ? 'Not started from CosmoU yet.' : 'Not played yet – play time and sessions show up here once you play.';
      box.append(s);
    }
  };
}

// ---------- Settings: the search shows its shortcut ----------
{
  const k = document.querySelector('.sx-q kbd');
  if (k) {
    k.textContent = typeof IS_MAC !== 'undefined' && IS_MAC ? '⌘F' : 'Ctrl F';
    k.hidden = typeof IS_MOBILE !== 'undefined' && IS_MOBILE;
  }
}

// ---------- moving with the D-pad and the arrow keys: always to what is really in that direction ----------
const rwGap = (a1, a2, b1, b2) => Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));
function spatialNext(root, from, dir) {
  const r0 = from.getBoundingClientRect(),
    cx0 = r0.left + r0.width / 2,
    cy0 = r0.top + r0.height / 2;
  // first choice: something in the same row (left/right) or column (up/down); up and down may go further sideways
  // when nothing is straight below or above, left and right never jump to another row
  let best = null,
    bs = Infinity,
    near = null,
    ns = Infinity;
  for (const e of padFocusable(root)) {
    if (e === from || e.contains(from) || from.contains(e)) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    let main, cross;
    if (dir === 'r') {
      if (cx <= cx0 + 2 || r.right <= r0.right) continue;
      main = Math.max(0, r.left - r0.right);
      cross = rwGap(r.top, r.bottom, r0.top, r0.bottom);
    } else if (dir === 'l') {
      if (cx >= cx0 - 2 || r.left >= r0.left) continue;
      main = Math.max(0, r0.left - r.right);
      cross = rwGap(r.top, r.bottom, r0.top, r0.bottom);
    } else if (dir === 'd') {
      if (cy <= cy0 + 2 || r.bottom <= r0.bottom) continue;
      main = Math.max(0, r.top - r0.bottom);
      cross = rwGap(r.left, r.right, r0.left, r0.right);
    } else {
      if (cy >= cy0 - 2 || r.top >= r0.top) continue;
      main = Math.max(0, r0.top - r.bottom);
      cross = rwGap(r.left, r.right, r0.left, r0.right);
    }
    const off = dir === 'l' || dir === 'r' ? Math.abs(cy - cy0) : Math.abs(cx - cx0);
    const s = main + cross * 4 + off * 0.05;
    if (cross <= 12 && s < bs) {
      bs = s;
      best = e;
    } else if (cross > 12 && s < ns) {
      ns = s;
      near = e;
    }
  }
  return best || (dir === 'u' || dir === 'd' ? near : null);
}
function rwFocus(n) {
  n.focus({ preventScroll: true });
  n.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}
function rwLinear(d, a, dir) {
  const l = padFocusable(d),
    i = l.indexOf(a);
  return l[Math.max(0, Math.min(l.length - 1, i + (dir === 'u' || dir === 'l' ? -1 : 1)))];
}
// replaces the list-order version in js/feedback-style-controller.js (the controller loop calls it by name)
padFocus = function (d, f) {
  document.body.classList.add('padnav');
  pad.moved = true;
  const dir = f.l ? 'l' : f.r ? 'r' : f.u ? 'u' : f.d ? 'd' : '';
  if (!dir) return;
  const a = document.activeElement,
    inside = !!a && a !== d && d.contains(a);
  // Settings: up and down in the category bar change the category, right goes into the page, left comes back
  if (d.id === 'dlg') {
    const inNav = inside && !!a.closest('.sx-nav');
    if (inNav) {
      if (dir === 'u' || dir === 'd') sxStep(dir === 'd' ? 1 : -1, true);
      else if (dir === 'r') sxFocusContent();
      return;
    }
    if (!inside || a.closest('.sx-side')) return dir === 'r' ? sxFocusContent() : sxFocusNav();
    const n = spatialNext(d.querySelector('.sx-main'), a, dir);
    if (n) return rwFocus(n);
    if (dir === 'l') sxFocusNav();
    return;
  }
  if (!inside) {
    const first = padFocusable(d)[0];
    if (first) rwFocus(first);
    return;
  }
  const n = spatialNext(d, a, dir) || (dir === 'u' || dir === 'd' ? rwLinear(d, a, dir) : null);
  if (n && n !== a) rwFocus(n);
};
// the arrow keys do the same inside every window (text fields, sliders and lists with their own arrows keep them)
addEventListener('keydown', e => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const dir = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[e.key];
  if (!dir) return;
  const d = [...document.querySelectorAll('dialog[open]')].pop();
  if (!d || d.id === 'cmenu' || d.id === 'cpick') return;
  const a = document.activeElement;
  if (!a || !d.contains(a)) return;
  if (a.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), select, textarea, [role=slider], [contenteditable]'))
    return;
  e.preventDefault();
  padFocus(d, { [dir]: true });
});
