// CosmoU – Pop-up menus: sort & filter, the game menu (right-click), favorites and the shortcut list.
// Menus are small <dialog>s, so a controller moves through them like through every other window (B closes).
const MI = {
  play: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M11 7.5v17a1.5 1.5 0 0 0 2.3 1.3l13.4-8.5a1.5 1.5 0 0 0 0-2.6L13.3 6.2A1.5 1.5 0 0 0 11 7.5z"/></svg>',
  info: '<svg viewBox="0 0 32 32"><circle cx="16" cy="9.5" r="2.6" fill="#fff"/><path d="M16 15v10" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 32 32"><path fill="#fff" d="m16 4 3.6 7.6 8.2 1-6 5.7 1.6 8.2L16 22.5l-7.4 4 1.6-8.2-6-5.7 8.2-1z"/></svg>',
  unstar:
    '<svg viewBox="0 0 32 32"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" d="m16 5.5 3.2 6.8 7.3.9-5.4 5.1 1.4 7.3L16 22l-6.5 3.6 1.4-7.3-5.4-5.1 7.3-.9z"/></svg>',
  packs:
    '<svg viewBox="0 0 32 32"><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"><path d="m16 5 11 6-11 6-11-6z" fill="#fff"/><path d="m5 16 11 6 11-6M5 21l11 6 11-6"/></g></svg>',
  folder:
    '<svg viewBox="0 0 32 32"><path fill="#fff" d="M4 9.5A2.5 2.5 0 0 1 6.5 7h6l2.5 3h10.5A2.5 2.5 0 0 1 28 12.5v11a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 4 23.5z"/></svg>',
  steam:
    '<svg viewBox="0 0 32 32"><circle cx="20" cy="12" r="5.5" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="20" cy="12" r="2" fill="#fff"/><circle cx="10.5" cy="21.5" r="4" fill="#fff"/><path d="M4 18.5 10.5 21.5 15.6 15.6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  copy: '<svg viewBox="0 0 32 32"><rect x="10" y="10" width="15" height="17" rx="2.5" fill="#fff"/><path d="M7 21V7.5A2.5 2.5 0 0 1 9.5 5H19" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
  edit: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M21.6 5.6a3 3 0 0 1 4.2 4.2L12 23.6 6 25l1.4-6z"/></svg>',
  az: '<svg viewBox="0 0 32 32"><text x="3" y="15" fill="#fff" font-family="Segoe UI,Arial" font-weight="800" font-size="12">A</text><text x="3" y="28" fill="#fff" font-family="Segoe UI,Arial" font-weight="800" font-size="12">Z</text><path d="M22 6v19m0 0-4.5-4.5M22 25l4.5-4.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  za: '<svg viewBox="0 0 32 32"><text x="3" y="15" fill="#fff" font-family="Segoe UI,Arial" font-weight="800" font-size="12">Z</text><text x="3" y="28" fill="#fff" font-family="Segoe UI,Arial" font-weight="800" font-size="12">A</text><path d="M22 6v19m0 0-4.5-4.5M22 25l4.5-4.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 9.5V16l4.5 3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  most: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="16" width="5" height="11" rx="1.5"/><rect x="13.5" y="9" width="5" height="18" rx="1.5"/><rect x="22" y="4" width="5" height="23" rx="1.5"/></g></svg>',
  all: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="5" width="9" height="9" rx="2.5"/><rect x="18" y="5" width="9" height="9" rx="2.5"/><rect x="5" y="18" width="9" height="9" rx="2.5"/><rect x="18" y="18" width="9" height="9" rx="2.5"/></g></svg>',
  wiiu: '<svg viewBox="0 0 32 32"><rect x="3" y="9" width="26" height="15" rx="4.5" fill="#fff"/><rect x="11" y="11.5" width="10" height="7.5" rx="1" fill="#1e8fe0"/><circle cx="7" cy="16.5" r="1.6" fill="#1e8fe0"/><circle cx="25" cy="16.5" r="1.6" fill="#1e8fe0"/></svg>',
  apps: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="20" rx="3" fill="none" stroke="#fff" stroke-width="2.8"/><path d="M4 12h24" stroke="#fff" stroke-width="2.8"/><circle cx="8" cy="9" r="1" fill="#fff"/><circle cx="11.5" cy="9" r="1" fill="#fff"/></svg>',
  keys: '<svg viewBox="0 0 32 32"><rect x="3" y="8" width="26" height="17" rx="3" fill="none" stroke="#fff" stroke-width="2.6"/><g fill="#fff"><rect x="7" y="12" width="3" height="3" rx=".8"/><rect x="12" y="12" width="3" height="3" rx=".8"/><rect x="17" y="12" width="3" height="3" rx=".8"/><rect x="22" y="12" width="3" height="3" rx=".8"/><rect x="10" y="18" width="12" height="3" rx="1"/></g></svg>',
  save: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M6 6.5A2.5 2.5 0 0 1 8.5 4h12.6l4.9 4.9v16.6a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 6 25.5z"/><rect x="10" y="6.5" width="9" height="6" rx="1" fill="#e0a91e"/><rect x="10" y="17" width="12" height="7.5" rx="1.2" fill="#e0a91e"/></svg>',
};
const MCOL = {
  play: '#2fb36a',
  info: '#1e8fe0',
  star: '#f2b01e',
  unstar: '#8b959e',
  packs: '#8a6cf0',
  folder: '#e0a91e',
  steam: '#2a475e',
  copy: '#8b959e',
  edit: '#16b3d9',
  az: '#1e8fe0',
  za: '#1e8fe0',
  clock: '#5ab55e',
  most: '#8a6cf0',
  all: '#1e8fe0',
  wiiu: '#16b3d9',
  apps: '#e57ac0',
  keys: '#8b959e',
  save: '#e0a91e',
};

// ---------- the menu itself ----------
// items: { label, icon, hint, on (checkmark), fn, disabled, sub (second line) } · '-' = line · { head: 'Title' }
function openMenu(anchor, items, opts = {}) {
  const m = $('#cmenu'),
    box = $('#cmenu .cm-in');
  box.replaceChildren();
  if (opts.title) {
    const h = document.createElement('div');
    h.className = 'cm-top';
    if (opts.art) {
      const a = document.createElement('i');
      a.className = 'cm-art';
      paint(a, opts.art, true);
      h.append(a);
    }
    const t = document.createElement('div'),
      b = document.createElement('b'),
      s = document.createElement('small');
    b.textContent = opts.title;
    s.textContent = opts.sub || '';
    t.append(b, s);
    h.append(t);
    box.append(h);
  }
  for (const it of items) {
    if (!it) continue;
    if (it === '-') {
      box.append(document.createElement('hr'));
      continue;
    }
    if (it.head) {
      const h = document.createElement('div');
      h.className = 'cm-h';
      h.textContent = it.head;
      box.append(h);
      continue;
    }
    const b = document.createElement('button'),
      ic = document.createElement('span'),
      t = document.createElement('span'),
      k = document.createElement('kbd');
    b.type = 'button';
    b.setAttribute('role', it.on !== undefined ? 'menuitemradio' : 'menuitem');
    if (it.on !== undefined) b.setAttribute('aria-checked', String(!!it.on));
    b.className = 'cm-i' + (it.on ? ' on' : '') + (it.danger ? ' danger' : '');
    b.disabled = !!it.disabled;
    ic.className = 'mi';
    ic.style.setProperty('--c', MCOL[it.icon] || '#8b959e');
    ic.innerHTML = MI[it.icon] || '';
    t.className = 'cm-t';
    t.textContent = it.label;
    if (it.sub) {
      const s = document.createElement('small');
      s.textContent = it.sub;
      t.append(s);
    }
    b.append(ic, t);
    if (it.hint) {
      k.textContent = it.hint;
      b.append(k);
    }
    if (it.on) {
      const c = document.createElement('i');
      c.className = 'cm-ck';
      c.textContent = '✓';
      b.append(c);
    }
    b.onclick = () => {
      m.close();
      if (!it.keep) blip('open');
      it.fn && it.fn();
    };
    box.append(b);
  }
  if (m.open) m.close();
  m.showModal();
  // place it next to the anchor (an element or a point), inside the window
  const w = m.offsetWidth,
    h = m.offsetHeight,
    pad = 12;
  let x, y;
  const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  if (r && r.width) {
    x = opts.align === 'left' ? r.left : r.right - w;
    y = r.bottom + 8;
    if (y + h > innerHeight - pad) y = r.top - h - 8;
  } else if (anchor && typeof anchor.x === 'number') {
    x = anchor.x;
    y = anchor.y;
  } else {
    x = (innerWidth - w) / 2;
    y = (innerHeight - h) / 2;
  }
  m.style.left = Math.max(pad, Math.min(innerWidth - w - pad, x)) + 'px';
  m.style.top = Math.max(pad, Math.min(innerHeight - h - pad, y)) + 'px';
  m.style.transformOrigin = (r && y < r.top ? 'bottom ' : 'top ') + (opts.align === 'left' ? 'left' : 'right');
  const first = box.querySelector('.cm-i.on:not(:disabled)') || box.querySelector('.cm-i:not(:disabled)');
  if (first) first.focus();
  blip('open');
}
// arrow keys walk through the items; letters jump to the item with the shortcut
$('#cmenu').addEventListener('keydown', e => {
  const items = [...document.querySelectorAll('#cmenu .cm-i:not(:disabled)')],
    i = items.indexOf(document.activeElement);
  const d = { ArrowDown: 1, ArrowUp: -1, Home: -99, End: 99 }[e.key];
  if (d) {
    e.preventDefault();
    const n = d === -99 ? 0 : d === 99 ? items.length - 1 : (i + d + items.length) % items.length;
    items[n] && items[n].focus();
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
    const hit = items.find(b => (b.querySelector('kbd') || {}).textContent === e.key.toUpperCase());
    if (hit) {
      e.preventDefault();
      hit.click();
    }
  }
});

// ---------- favorites ----------
function saveFavs() {
  try {
    localStorage.setItem('cosmou.favs', JSON.stringify([...favs]));
  } catch {}
}
function toggleFav(g) {
  if (!g) return;
  const on = !favs.has(g.name);
  if (on) favs.add(g.name);
  else favs.delete(g.name);
  saveFavs();
  blip(on ? 'open' : 'move');
  toast(on ? '★ ' + g.name + ' is a favorite now' : g.name + ' is no longer a favorite', 2600, on ? 'ok' : 'info');
  render();
  if ($('#det').open && typeof detFavUi === 'function') detFavUi(g);
}

// ---------- sort & show ----------
function setSort(s) {
  sortMode = s;
  try {
    localStorage.setItem('cosmou.sort', s);
  } catch {}
  render();
}
function setShow(s) {
  showFilter = s;
  try {
    localStorage.setItem('cosmou.show', s);
  } catch {}
  render();
}
function sortUi() {
  const b = $('#sort'),
    lab = (showFilter !== 'all' ? SHOW_LABEL[showFilter] + ' · ' : '') + SORT_LABEL[sortMode];
  b.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span></span><svg class="car" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  b.querySelector('span').textContent = lab;
  b.classList.toggle('filtered', showFilter !== 'all');
  b.setAttribute('aria-label', 'Sort and filter: ' + lab);
  b.setAttribute('aria-haspopup', 'menu');
}
function sortMenu(anchor) {
  const n = k =>
    games.filter(g => (k === 'fav' ? favs.has(g.name) : k === 'apps' ? g.kind === 'app' : k === 'wiiu' ? g.kind !== 'app' : true)).length;
  const hasApps = games.some(g => g.kind === 'app');
  openMenu(
    anchor,
    [
      { head: 'Sort by' },
      { label: 'Name A–Z', icon: 'az', on: sortMode === 'az', fn: () => setSort('az') },
      { label: 'Name Z–A', icon: 'za', on: sortMode === 'za', fn: () => setSort('za') },
      { label: 'Recently played', icon: 'clock', on: sortMode === 'recent', fn: () => setSort('recent') },
      { label: 'Most played', icon: 'most', on: sortMode === 'most', sub: 'Uses the Daily Log', fn: () => setSort('most') },
      '-',
      { head: 'Show' },
      { label: 'All games', icon: 'all', on: showFilter === 'all', hint: String(n('all')), fn: () => setShow('all') },
      { label: 'Favorites', icon: 'star', on: showFilter === 'fav', hint: String(n('fav')), fn: () => setShow('fav') },
      hasApps && {
        label: 'Wii U games',
        icon: 'wiiu',
        on: showFilter === 'wiiu',
        hint: String(n('wiiu')),
        fn: () => setShow('wiiu'),
      },
      hasApps && {
        label: 'Other apps',
        icon: 'apps',
        on: showFilter === 'apps',
        hint: String(n('apps')),
        fn: () => setShow('apps'),
      },
    ],
    { align: 'right' },
  );
  $('#cmenu').classList.add('cm-sort');
}
$('#sort').onclick = () => sortMenu($('#sort'));

// ---------- the game menu ----------
function gameMenu(g, at) {
  if (!g) return;
  hoverOff();
  const app = g.kind === 'app',
    fav = favs.has(g.name),
    line = typeof playLine === 'function' ? playLine(g.name) : '';
  const pick = fn => () => {
    sel = g.name;
    render();
    fn();
  };
  openMenu(
    at,
    [
      { label: 'Play', icon: 'play', hint: '↵', fn: pick(() => launch(g)) },
      { label: 'Details', icon: 'info', hint: 'I', fn: pick(() => openDetail(g)) },
      {
        label: fav ? 'Remove from favorites' : 'Add to favorites',
        icon: fav ? 'unstar' : 'star',
        hint: 'F',
        fn: () => toggleFav(g),
      },
      '-',
      !app && !IS_MOBILE && { label: 'Graphic packs', icon: 'packs', hint: 'G', fn: pick(() => openPacks(g)) },
      app && { label: 'Edit app', icon: 'edit', fn: pick(() => openApp(g)) },
      g.path && !IS_MOBILE && { label: 'Show in folder', icon: 'folder', fn: () => need() && api.showInFolder(g.path) },
      !app && !IS_MOBILE && { label: 'Add to Steam', icon: 'steam', fn: pick(() => openSteam(g)) },
      {
        label: 'Copy name',
        icon: 'copy',
        fn: () => {
          try {
            navigator.clipboard.writeText(g.name);
            toast('✓ Copied “' + g.name + '”', 2200);
          } catch {}
        },
      },
    ],
    { title: g.name, sub: line || g.format || '', art: g, align: 'left' },
  );
}
const gameAt = el => {
  const t = el && el.closest && el.closest('[data-g]');
  return t ? gameOf(t.dataset.g) : null;
};
addEventListener('contextmenu', e => {
  if (e.target.closest('input, textarea, dialog')) return;
  const g = gameAt(e.target);
  if (!g) return;
  e.preventDefault();
  gameMenu(g, { x: e.clientX + 2, y: e.clientY + 2 });
});
// long press on touch screens
let lpT = 0;
addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const g = gameAt(e.target);
  if (!g) return;
  const x = e.clientX,
    y = e.clientY;
  lpT = setTimeout(() => gameMenu(g, { x, y }), 550);
});
for (const ev of ['pointerup', 'pointercancel', 'pointermove']) addEventListener(ev, () => clearTimeout(lpT), { passive: true });

// ---------- keyboard shortcuts on the library ----------
const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
  if (document.querySelector('dialog[open]') || $('#launch').classList.contains('on') || $('#setup').classList.contains('on')) return;
  const g = cur();
  const k = e.key;
  if (k === '?' || (k === '/' && e.shiftKey)) {
    e.preventDefault();
    openKeys();
  } else if (k === '/' || (k === 'f' && e.shiftKey)) {
    e.preventDefault();
    focusSearch();
  } else if ((k === 'f' || k === 'F') && g) {
    e.preventDefault();
    toggleFav(g);
  } else if ((k === 'i' || k === 'I' || k === 'y' || k === 'Y') && g) {
    e.preventDefault();
    openDetail(g);
  } else if ((k === 'g' || k === 'G') && g && g.kind !== 'app' && !IS_MOBILE) {
    e.preventDefault();
    openPacks(g);
  } else if (k === 's' || k === 'S') {
    e.preventDefault();
    sortMenu($('#sort'));
  } else if (k === 'ContextMenu' && g) {
    e.preventDefault();
    const el = document.querySelector(`[data-g="${CSS.escape(g.name)}"]`),
      r = el ? el.getBoundingClientRect() : null;
    gameMenu(g, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
  } else if (k === ',') {
    e.preventDefault();
    openSettings();
  } else if (k === '1' || k === '2' || k === '3') {
    const b = document.querySelector(`#vt button[data-m="${['covers', 'grid', 'wiiu'][+k - 1]}"]`);
    if (b && !$('header').hidden) {
      e.preventDefault();
      b.click();
    }
  }
});
function focusSearch() {
  if (isHome && isHome()) return typeof whMenu === 'function' && whMenu('logo');
  const q = $('#q');
  q.focus();
  q.select();
}
// Escape in the search field clears it
$('#q').addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#q').value) {
    e.preventDefault();
    $('#q').value = '';
    render();
  } else if (e.key === 'Escape' || (e.key === 'Enter' && list().length)) {
    $('#q').blur();
  }
});

// ---------- the shortcut list (press ?) ----------
const KEYS = [
  [
    'Library',
    [
      ['← →', 'Choose a game'],
      ['Enter', 'Play'],
      ['I', 'Details'],
      ['F', 'Favorite on / off'],
      ['G', 'Graphic packs'],
      ['Menu key · right-click', 'Game menu'],
    ],
  ],
  [
    'Find & sort',
    [
      ['/', 'Search'],
      ['Esc', 'Clear the search'],
      ['S', 'Sort and filter'],
      ['1 · 2 · 3', 'Covers · Grid · Wii U Look'],
    ],
  ],
  [
    'Windows',
    [
      [',', 'Settings'],
      ['Q', 'Quick Menu'],
      [IS_MAC ? 'F11 · ⌃⌘F' : 'F11', 'TV mode'],
      ['Esc', 'Close a window'],
      ['?', 'This list'],
    ],
  ],
  [
    'Controller',
    [
      ['A', 'Play · press'],
      ['B', 'Back · close'],
      ['Y', 'Details'],
      ['X', 'Game menu'],
      ['Home', 'Quick Menu'],
      ['Start', 'Settings'],
      ['Select', 'TV mode'],
      ['LB · RB', 'Pages · categories'],
    ],
  ],
];
function openKeys() {
  const box = $('#keysbd');
  if (!box.childElementCount)
    for (const [h, rows] of KEYS) {
      const sec = document.createElement('section'),
        t = document.createElement('h3');
      t.className = 'sh';
      t.textContent = h;
      sec.append(t);
      const grp = document.createElement('div');
      grp.className = 'grp kgrp';
      for (const [k, d] of rows) {
        const r = document.createElement('div'),
          s = document.createElement('span'),
          kk = document.createElement('span');
        r.className = 'krow';
        s.textContent = d;
        kk.className = 'kk';
        for (const part of k.split(' · ')) {
          const kb = document.createElement('kbd');
          kb.textContent = part;
          kk.append(kb);
        }
        r.append(s, kk);
        grp.append(r);
      }
      sec.append(grp);
      box.append(sec);
    }
  blip('open');
  $('#keysdlg').showModal();
}
$('#keysx').onclick = () => $('#keysdlg').close();
$('#okeys').onclick = () => openKeys();
$('#cmenu').addEventListener('close', () => $('#cmenu').classList.remove('cm-sort'));
// the Home Menu's logo menu also offers the new sorting
if (typeof whMenuItems === 'function') {
  const _wmi = whMenuItems;
  whMenuItems = function (kind) {
    const l = _wmi(kind);
    for (const it of l)
      if (Array.isArray(it) && it[0] === 'sort') {
        it[1] = 'Sort & filter: ' + (showFilter !== 'all' ? SHOW_LABEL[showFilter] + ' · ' : '') + SORT_LABEL[sortMode];
        it[3] = () => sortMenu(null);
      }
    if (kind !== 'power') l.push(['keys', 'Keyboard shortcuts', '#8b959e', () => openKeys()]);
    return l;
  };
  if (typeof WH_ICON === 'object') WH_ICON.keys = MI.keys;
}
sortUi();

// ---------- small details ----------
// the brand line shows how many games there are
const _render = render;
render = function () {
  _render();
  const b = document.querySelector('.brand small'),
    n = games.filter(g => g.kind !== 'app').length;
  if (b) b.textContent = 'Wii U Library' + (n ? ' · ' + n + (n === 1 ? ' game' : ' games') : '');
  const g = cur();
  if (g && mode === 'grid') {
    coverMeta(g, -1, 0, $('#hmeta'));
    $('#hl').textContent = plays[g.name] ? 'Continue playing' : 'Selected';
  }
  if (!$('#empty').hidden) emptySteps();
  // search: show how many games match while typing
  const q = $('#q').value.trim(),
    qk = document.querySelector('.search .qk');
  if (qk) {
    qk.textContent = q ? String(list().length) : '/';
    qk.classList.toggle('n', !!q);
    qk.title = q ? 'Matching games' : '';
  }
  // tooltips on the grid tiles: name, play time and last played
  for (const t of document.querySelectorAll('#grid .tile')) {
    const p = typeof playLog === 'object' && playLog.playtime ? playLog.playtime[t.dataset.g] : null;
    t.title = t.dataset.g + (p && p.sec ? ' · ' + fmtDur(p.sec) + ' · last ' + dayName(p.last) : '');
  }
  if (mode === 'grid' && view === 'recent') recentGroups();
};
// empty library: three steps (Cemu, games folder, play) with their state
function emptySteps() {
  let box = $('#esteps');
  if (!box) {
    box = document.createElement('div');
    box.id = 'esteps';
    box.className = 'esteps';
    $('#ep').after(box);
  }
  const show = !games.length && !$('#q').value.trim() && view !== 'recent';
  box.hidden = !show;
  if (!show) return;
  const step = (n, done, title, sub, label, fn) => {
    const d = document.createElement('div'),
      i = document.createElement('i'),
      t = document.createElement('span'),
      b = document.createElement('b'),
      s = document.createElement('small');
    d.className = 'estep' + (done ? ' done' : '');
    i.textContent = done ? '✓' : n;
    b.textContent = title;
    s.textContent = sub;
    t.append(b, s);
    d.append(i, t);
    if (label && !done) {
      const x = document.createElement('button');
      x.className = 'btn';
      x.textContent = label;
      x.onclick = fn;
      d.append(x);
    }
    box.append(d);
  };
  box.replaceChildren();
  step(
    1,
    !!cfg.cemuPath,
    IS_IOS ? 'Get MeloCafe' : 'Get Cemu',
    cfg.cemuPath ? 'Installed' : IS_IOS ? 'Cemu for iPhone and iPad – install it once' : 'CosmoU downloads and sets it up for you',
    IS_IOS ? 'Get it' : 'Download',
    () => need() && installCemu(),
  );
  if (IS_IOS) step(2, !!cfg.gamesDir, 'Get your games', 'The games you added in MeloCafe', 'Get games', pickFolder);
  else step(2, !!cfg.gamesDir, 'Choose your games folder', cfg.gamesDir || 'WUA, WUD, WUX, RPX or folder games', 'Choose folder', pickFolder);
  step(3, false, 'Play', IS_IOS ? 'Icons come from MeloCafe. Other emulators:' : 'Covers load on their own. Other emulators or PC games:', 'Add app', () => need() && openApp(null));
}
// empty "Favorites" (or other filter): a button back to all games
function emptyExtra(on) {
  let b = $('#eall');
  if (!b) {
    b = document.createElement('button');
    b.id = 'eall';
    b.className = 'btn main';
    b.textContent = 'Show all games';
    b.onclick = () => setShow('all');
    $('#ebtn').after(b);
  }
  b.hidden = !on;
}
// a tip while a game starts
const TIPS = [
  'Press F on any game to make it a favorite.',
  'Right-click a game for Play, Details, Graphic packs and more.',
  'Press / to search, S to sort and filter.',
  'Press ? to see every shortcut.',
  'Save backups can run before every start – Settings → Saves & Data.',
  'Graphic packs set the resolution and FPS per game.',
  'Your Daily Log counts how long you play each game.',
  TV_KEY + ' switches TV mode on and off.',
];
new MutationObserver(() => {
  if ($('#launch').classList.contains('on')) $('#ltip').textContent = 'Tip: ' + TIPS[(Math.random() * TIPS.length) | 0];
}).observe($('#launch'), { attributes: true, attributeFilter: ['class'] });

// icons in the bottom bar and the view switch, and key hints in their tooltips
const NAV_IC = {
  lib: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2.2"/><rect x="13" y="3" width="8" height="8" rx="2.2"/><rect x="3" y="13" width="8" height="8" rx="2.2"/><rect x="13" y="13" width="8" height="8" rx="2.2"/></svg>',
  recent:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  set: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.4 2h3.2l.5 2.6 2 .9 2.2-1.5 2.3 2.3-1.5 2.2.9 2 2.6.5v3.2l-2.6.5-.9 2 1.5 2.2-2.3 2.3-2.2-1.5-2 .9-.5 2.6h-3.2l-.5-2.6-2-.9-2.2 1.5-2.3-2.3 1.5-2.2-.9-2L2 13.6v-3.2l2.6-.5.9-2L4 5.7 6.3 3.4l2.2 1.5 2-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/></svg>',
  covers:
    '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="1.5" y="7" width="5" height="10" rx="1.4" opacity=".55"/><rect x="8" y="4" width="8" height="16" rx="1.8"/><rect x="17.5" y="7" width="5" height="10" rx="1.4" opacity=".55"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="5" height="5" rx="1.3"/><rect x="9.5" y="3" width="5" height="5" rx="1.3"/><rect x="16" y="3" width="5" height="5" rx="1.3"/><rect x="3" y="9.5" width="5" height="5" rx="1.3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1.3"/><rect x="16" y="9.5" width="5" height="5" rx="1.3"/><rect x="3" y="16" width="5" height="5" rx="1.3"/><rect x="9.5" y="16" width="5" height="5" rx="1.3"/><rect x="16" y="16" width="5" height="5" rx="1.3"/></svg>',
  wiiu: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.5h14a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 0 1-3.5 3.5H5A3.5 3.5 0 0 1 1.5 14v-4A3.5 3.5 0 0 1 5 6.5zm3.5 2.3v6.4h7V8.8z"/></svg>',
};
for (const b of document.querySelectorAll('nav button, #vt button')) {
  const k = b.dataset.v || b.dataset.m,
    s = document.createElement('span');
  if (!NAV_IC[k]) continue;
  s.className = 'nic';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = NAV_IC[k];
  b.prepend(s);
}
document.querySelectorAll('#vt button').forEach((b, i) => (b.title = b.textContent.trim() + ' (' + (i + 1) + ')'));
$('#sort').title = 'Sort and filter (S)';
document.querySelector('nav button[data-v="set"]').title = 'Settings (,)';

// Recently played in the grid: small headings for today, yesterday, this week and earlier
function recentGroups() {
  const today = dayStart(Date.now()),
    lab = ts => {
      const d = Math.round((today - dayStart(ts)) / 864e5);
      return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 7 ? 'This week' : d < 31 ? 'This month' : 'Earlier';
    };
  let last = '';
  for (const t of [...document.querySelectorAll('#grid .tile')]) {
    const ts = plays[t.dataset.g];
    if (!ts) continue;
    const l = lab(ts);
    if (l === last) continue;
    last = l;
    const h = document.createElement('h5');
    h.className = 'ggh';
    h.textContent = l;
    t.before(h);
  }
}
