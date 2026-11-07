// CosmoU – design system v2 (css/ds.css): the dock, the controller legend, the details' small buttons and the labels
// a controller has. Names start with ds… so they never meet the names of theme files or other scripts.

// ---------- the dock ----------
// its names can hide on narrow windows (the icons stay, the name is in the tooltip)
for (const b of document.querySelectorAll('nav button')) {
  for (const n of [...b.childNodes])
    if (n.nodeType === 3 && n.textContent.trim()) {
      const s = document.createElement('span');
      s.className = 'lbl';
      s.textContent = n.textContent.trim();
      n.replaceWith(s);
    }
  const l = b.querySelector('.lbl');
  if (l) b.setAttribute('aria-label', l.textContent);
}
const _renderDs = render;
render = function () {
  const r = _renderDs.apply(this, arguments);
  if (typeof dockSync === 'function') dockSync();
  dsLegend();
  return r;
};
// the Themes window: the gallery in Settings → Appearance, scrolled to the themes
function openThemes() {
  openSettings('look');
  setTimeout(() => {
    const t = document.querySelector('#dlg .pane[data-c="look"] .themes');
    if (t) t.scrollIntoView({ block: 'nearest' });
  }, 60);
}

// ---------- what a controller calls its buttons ----------
// Nintendo controllers have A on the right and B at the bottom (the other way round than Xbox) – CosmoU follows the
// letters printed on the controller, so "A" always means the button with the A on it. PlayStation shows its shapes.
const dsPadKind = gp => {
  const id = String((gp && gp.id) || '');
  if (/xbox|xinput|045e/i.test(id)) return 'xbox';
  if (/057e|nintendo|pro controller|joy-?con|switch/i.test(id)) return 'nintendo';
  if (/054c|playstation|dualsense|dualshock|wireless controller/i.test(id)) return 'ps';
  return 'xbox';
};
const DS_GLYPH = {
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', st: '☰', sl: '⧉', hm: '⌂' },
  nintendo: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'L', rb: 'R', st: '+', sl: '−', hm: '⌂' },
  ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', st: '☰', sl: '⧉', hm: '⌂' },
};
let dsKind = 'xbox';
const dsGlyph = k => (DS_GLYPH[dsKind] || DS_GLYPH.xbox)[k] || k.toUpperCase();

// ---------- the controller legend: what the buttons do right now ----------
// it shows while a controller is used (the mouse or the keyboard hides it again) – in TV mode the big legend does this
function dsLegendItems() {
  // (a window has its focus ring and B to close; the console home screens show their own hints)
  if (document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen())) return [];
  if ((typeof isHome === 'function' && isHome()) || mode === 'chome' || mode === 'wiiu') return [];
  const many = typeof sysAvail === 'function' && sysAvail().length > 1;
  const g = typeof cur === 'function' ? cur() : null,
    a = g && g.kind === 'folder' ? 'Open' : g && g.kind === 'folder-back' ? 'Back' : 'Play';
  return [['a', a], ['y', 'Details'], ['x', 'Menu'], many && ['lb', 'rb', 'Console'], ['hm', 'Quick Menu']].filter(Boolean);
}
let dsLegKey = '';
function dsLegend() {
  const el = $('#padleg');
  if (!el) return;
  const items = document.body.classList.contains('padon') ? dsLegendItems() : [];
  const key = dsKind + '|' + JSON.stringify(items);
  if (key === dsLegKey) return;
  dsLegKey = key;
  el.replaceChildren(
    ...items.map(it => {
      const s = document.createElement('span');
      for (const k of it.slice(0, -1)) {
        const i = document.createElement('i');
        i.textContent = dsGlyph(k);
        s.append(i);
      }
      s.append(it[it.length - 1]);
      return s;
    }),
  );
  el.classList.toggle('on', items.length > 0);
}
// a window opening or closing changes what the buttons do
new MutationObserver(() => dsLegend()).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
addEventListener('pointermove', () => {
  if (document.body.classList.contains('padon')) {
    document.body.classList.remove('padon');
    dsLegend();
  }
}, { passive: true });
addEventListener('keydown', e => {
  if (e.key.length > 1 && !/^Arrow/.test(e.key)) return;
  if (document.body.classList.contains('padon')) {
    document.body.classList.remove('padon');
    dsLegend();
  }
});
// the controller loop tells us when a controller is used (js/feedback-style-controller.js)
function dsPadUsed(gp) {
  const k = dsPadKind(gp);
  const was = document.body.classList.contains('padon');
  if (k !== dsKind) dsKind = k;
  document.body.classList.add('padon', 'padnav');
  if (!was || dsLegKey.indexOf(dsKind + '|') !== 0) dsLegend();
}

// ---------- the game's details: mark and more, next to Play and Favorite ----------
$('#dmark').innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 4.9A1.4 1.4 0 0 1 4.9 3.5H12l8.5 8.5-8.5 8.5-8.5-8.5z"/><circle cx="8.2" cy="8.2" r="1.7" fill="currentColor" stroke="none"/></svg>';
$('#dmore').innerHTML =
  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
$('#dmark').onclick = () => {
  const g = cur();
  if (g && typeof markWheel === 'function') {
    $('#det').close();
    setTimeout(() => markWheel(g), 30);
  }
};
$('#dmore').onclick = () => {
  const g = cur();
  if (!g) return;
  const r = $('#dmore').getBoundingClientRect();
  $('#det').close();
  gameMenu(g, { x: r.left + r.width / 2, y: r.bottom + 6 });
};
function dsDetMark(g) {
  const b = $('#dmark'),
    m = g && typeof markOf === 'function' ? markOf(g.name) : null;
  b.hidden = typeof markWheel !== 'function';
  b.classList.toggle('marked', !!m);
  if (m) b.style.setProperty('--mark', m.col);
  else b.style.removeProperty('--mark');
  b.title = m ? 'Mark: ' + m.label + ' (K)' : 'Mark with a colour (K)';
}
const _openDetailDs = openDetail;
openDetail = function (g) {
  const r = _openDetailDs.apply(this, arguments);
  dsDetMark(g);
  return r;
};
// X in the details: the game's menu (everything the details don't show)
addEventListener('keydown', e => {
  if (!$('#det').open || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'x' || e.key === 'X') {
    e.preventDefault();
    $('#dmore').click();
  } else if (e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    $('#dmark').click();
  }
});
if (typeof dockSync === 'function') dockSync();
