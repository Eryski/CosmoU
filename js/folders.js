// CosmoU – folders: put games and apps of a console into folders of their own (mods for the Wii in one folder, tools,
// games to finish …). A folder is a square in every view (Covers, Grid, the console homes, Wii U Look, the Switch's and
// the Switch 2's interfaces) with the covers of its games on it; A opens it, B (or Esc) leaves it, the first square in a
// folder leads back. The game menu (and a game's page on the Switch) has "Put in a folder". (Idea: Eduard)
// The folders are kept in this window's storage, like marks and favorites. Names start with fd….
let fdData = { list: [], at: {} };
try {
  const d = JSON.parse(localStorage.getItem('cosmou.folders') || 'null');
  if (d && Array.isArray(d.list) && d.at && typeof d.at === 'object') fdData = d;
} catch {}
// the folder that is open (its id), or null
let fdOpen = null;
const FD_COLS = ['#5aa9ff', '#4fd18b', '#ffb24a', '#ff5d73', '#a78bfa', '#f472b6', '#2dd4bf', '#94a3b8'];
const fdSave = () => {
  try {
    localStorage.setItem('cosmou.folders', JSON.stringify(fdData));
  } catch {}
};
const fdOf = id => fdData.list.find(f => f.id === id) || null;
// the console of a game (an app on every console: the console on screen)
const fdSysOf = g => (g.kind === 'app' ? (g.appSys && g.appSys !== 'all' ? g.appSys : curSys) : sysOf(g));
const fdHere = () => fdData.list.filter(f => f.sys === curSys);
const fdGamesOf = f => games.filter(g => fdData.at[g.name] === f.id);
// the name of a game's folder (for the menus), or ''
const fdNameOf = g => {
  const f = g && fdOf(fdData.at[g.name]);
  return f ? f.name : '';
};
// a folder and the way back, as entries of the library (they are not games: nothing counts them as games)
function fdEntry(f) {
  const n = fdGamesOf(f).length;
  return { name: f.name, kind: 'folder', fid: f.id, sys: f.sys, col: f.col, format: 'Folder · ' + n + (n === 1 ? ' game' : ' games'), cover: '' };
}
const fdBack = f => ({ name: '‹ ' + f.name, kind: 'folder-back', fid: f.id, sys: f.sys, col: f.col, format: 'Back to all games', cover: '' });
// a name → its folder entry (for cur() and gameOf())
function fdItem(name) {
  if (!name || !fdData.list.length) return null;
  const f = fdData.list.find(x => x.name === name && x.sys === curSys);
  if (f) return fdEntry(f);
  const o = fdOf(fdOpen);
  if (o && name === '‹ ' + o.name) return fdBack(o);
  return null;
}
const fdIs = g => !!g && (g.kind === 'folder' || g.kind === 'folder-back');
// the games of a console with its folders: outside, the folders instead of their games – inside, the way back and the
// folder's games
function fdView(l) {
  if (!fdData.list.length) {
    fdOpen = null;
    return l;
  }
  if (typeof everySys !== 'undefined' && everySys) return l;
  const o = fdOf(fdOpen);
  if (o && o.sys === curSys) return [fdBack(o), ...l.filter(g => fdData.at[g.name] === o.id)];
  fdOpen = null;
  const here = fdHere();
  if (!here.length) return l;
  const ids = new Set(here.map(f => f.id));
  return [
    ...here
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(fdEntry),
    ...l.filter(g => !ids.has(fdData.at[g.name])),
  ];
}
// the way back first, then the folders, then the games (in the order they came)
const fdFirst = l => [...l.filter(g => g.kind === 'folder-back'), ...l.filter(g => g.kind === 'folder'), ...l.filter(g => !fdIs(g))];

// ---------- the library ----------
// (a search, Recently played, Favorites and every console together show every game, without folders)
const _listFd = list;
list = function () {
  const l = _listFd.apply(this, arguments);
  if ($('#q').value.trim() || view === 'recent' || showFilter === 'fav' || everySys) return l;
  return fdFirst(fdView(l));
};
function fdEnter(id) {
  const f = fdOf(id);
  if (!f) return;
  fdOpen = id;
  const first = fdGamesOf(f)[0];
  sel = first ? first.name : '‹ ' + f.name;
  blip('open');
  fdFace();
  render();
}
function fdLeave() {
  const f = fdOf(fdOpen);
  if (!f) return (fdOpen = null), false;
  fdOpen = null;
  sel = f.name;
  blip('back');
  fdFace();
  render();
  return true;
}
// the Switch interfaces: the frame goes to the first square of what is shown now
function fdFace() {
  if (typeof nx === 'object' && nx.on) {
    nx.zone = nx.scr === 'all' ? 'grid' : 'row';
    nx.i = 0;
    nx.ai = 0;
    nx.sig = '';
  }
  if (typeof n2 === 'object' && n2.on) {
    n2.zone = n2.scr === 'lib' ? 'grid' : 'row';
    n2.i = 0;
    n2.ai = 0;
    n2.sig = '';
  }
}

// ---------- a folder's picture: up to four covers of its games on its colour, with a folder's tab ----------
// the big button says what A does: Play a game, Open a folder, go Back out of it (Eduard: "Play" on a folder)
function fdLabels() {
  const g = typeof cur === 'function' ? cur() : null,
    t = g && g.kind === 'folder' ? 'Open' : g && g.kind === 'folder-back' ? 'Back' : 'Play';
  for (const id of ['play', 'cfplay', 'wplay', 'dplay']) {
    const b = document.getElementById(id);
    if (b && b.textContent !== t) b.textContent = t;
  }
}
const _paintFd = paint;
paint = function (el, g) {
  queueMicrotask(fdLabels);
  if (!fdIs(g)) {
    el.classList.remove('fd-art', 'fd-backart');
    el.style.removeProperty('--fc');
    return _paintFd.apply(this, arguments);
  }
  el.replaceChildren();
  el.style.background = '';
  el.style.backgroundImage = '';
  el.classList.remove('fit');
  el.classList.add('fd-art');
  el.classList.toggle('fd-backart', g.kind === 'folder-back');
  el.style.setProperty('--fc', g.col || FD_COLS[0]);
  if (g.kind === 'folder-back') {
    el.innerHTML = '<svg viewBox="0 0 24 24" class="fd-arrow" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const s = document.createElement('small');
    s.className = 'fd-cap';
    s.textContent = 'Back';
    el.append(s);
    return;
  }
  const f = fdOf(g.fid),
    l = f ? fdGamesOf(f).slice(0, 4) : [],
    m = document.createElement('div');
  m.className = 'fd-mos fd-n' + l.length;
  for (const x of l) {
    const i = document.createElement('i');
    if (x.cover) i.style.backgroundImage = `url("${x.cover}")`;
    else {
      const h = hue(x.name);
      i.style.background = `linear-gradient(135deg,hsl(${h} 72% 62%),hsl(${(h + 55) % 360} 78% 42%))`;
    }
    m.append(i);
  }
  if (!l.length) m.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  el.append(m);
};
// (no 3D case for a folder when the pointer rests on it)
if (typeof hoverCase === 'function') {
  const _hoverCaseFd = hoverCase;
  hoverCase = function (t, g) {
    if (fdIs(g)) return;
    return _hoverCaseFd.apply(this, arguments);
  };
}

// ---------- A opens a folder, B leaves it; its details and menu are the folder's own ----------
const _launchFd = launch;
launch = function (g) {
  if (g && g.kind === 'folder') return fdEnter(g.fid);
  if (g && g.kind === 'folder-back') return fdLeave();
  return _launchFd.apply(this, arguments);
};
const _openDetailFd = openDetail;
openDetail = function (g) {
  if (g && g.kind === 'folder') return fdEdit(fdOf(g.fid));
  if (g && g.kind === 'folder-back') return fdLeave();
  return _openDetailFd.apply(this, arguments);
};
const _gameMenuFd = gameMenu;
gameMenu = function (g, at) {
  if (g && g.kind === 'folder-back') return fdLeave();
  if (g && g.kind === 'folder') {
    const f = fdOf(g.fid);
    return openMenu(
      at,
      [
        { label: 'Open', icon: 'play', hint: '↵', fn: () => fdEnter(f.id) },
        { label: 'Name and colour…', icon: 'edit', fn: () => setTimeout(() => fdEdit(f), 30) },
        '-',
        { label: 'Delete folder', icon: 'trash', danger: true, sub: 'Its games stay in the library', fn: () => fdDelete(f) },
      ],
      { title: f.name, sub: g.format, art: g, align: 'left' },
    );
  }
  return _gameMenuFd.apply(this, arguments);
};
// a folder is no favorite (clicking the left stick on it does nothing)
const _toggleFavFd = toggleFav;
toggleFav = function (g) {
  if (fdIs(g)) return blip('back');
  return _toggleFavFd.apply(this, arguments);
};
// B and Esc leave a folder (after everything else B and Esc do: a window, the round buttons …)
if (typeof chB === 'function') {
  const _chBFd = chB;
  chB = function () {
    const r = _chBFd.apply(this, arguments);
    return r || (fdOpen ? fdLeave() : r);
  };
}
if (typeof chBackFromAll === 'function') {
  const _chBackFd = chBackFromAll;
  chBackFromAll = function () {
    const r = _chBackFd.apply(this, arguments);
    return r || (fdOpen ? fdLeave() : r);
  };
}
addEventListener(
  'keydown',
  e => {
    if (!fdOpen || (e.key !== 'Escape' && e.key !== 'Backspace') || e.ctrlKey || e.metaKey || e.altKey) return;
    // (the Switch interfaces have their own B; a window, the wheel, a text field or a lifted game come first)
    if ((typeof nx === 'object' && nx.on) || (typeof n2 === 'object' && n2.on)) return;
    if (document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen()) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (mode === 'chome' && typeof chZone === 'string' && chZone === 'apps') return;
    if (typeof orderMove === 'string' && orderMove) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    fdLeave();
  },
  true,
);

// ---------- putting games into folders ----------
function fdPut(g, id) {
  const f = fdOf(id);
  if (!g || !f) return;
  fdData.at[g.name] = id;
  fdSave();
  blip('open');
  toast('✓ ' + g.name + ' is in “' + f.name + '” now', 2600);
  render();
}
function fdTakeOut(g) {
  if (!g || !fdData.at[g.name]) return;
  const f = fdOf(fdData.at[g.name]);
  delete fdData.at[g.name];
  fdSave();
  blip('back');
  toast('✓ ' + g.name + ' is out of “' + (f ? f.name : 'the folder') + '”', 2600);
  // the last game left an open folder: the folder stays, empty
  render();
}
// where a game can go: the folders of its console, a new one, or out of its folder
function fdMoveMenu(g, at) {
  if (!g || fdIs(g)) return;
  const sys = fdSysOf(g),
    now = fdData.at[g.name],
    list = fdData.list.filter(f => f.sys === sys).sort((a, b) => a.name.localeCompare(b.name));
  openMenu(
    at || null,
    [
      ...list.map(f => ({ label: f.name, icon: 'folder', ...(f.id === now ? { on: true } : {}), sub: f.id === now ? 'In this folder' : fdGamesOf(f).length + ' games', fn: () => f.id !== now && fdPut(g, f.id) })),
      list.length && '-',
      { label: 'New folder…', icon: 'plus', fn: () => setTimeout(() => fdEdit(null, g), 30) },
      now && { label: 'Take out of the folder', icon: 'back', fn: () => fdTakeOut(g) },
    ].filter(Boolean),
    { title: 'Put in a folder', sub: g.name, art: g, align: 'left' },
  );
}
function fdDelete(f) {
  if (!f) return;
  fdData.list = fdData.list.filter(x => x.id !== f.id);
  for (const k of Object.keys(fdData.at)) if (fdData.at[k] === f.id) delete fdData.at[k];
  fdSave();
  if (fdOpen === f.id) fdOpen = null;
  if (sel === f.name) sel = '';
  blip('back');
  toast('✓ “' + f.name + '” deleted – its games are in the library again', 3200);
  render();
}
// a name nobody else has on this console (no game and no other folder)
const fdFree = (name, sys, id) => !games.some(g => g.name === name) && !fdData.list.some(f => f.id !== id && f.sys === sys && f.name === name);

// ---------- the folder's small window: its name and its colour ----------
function fdEdit(f, g) {
  let d = $('#fddlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'fddlg';
    d.className = 'glass';
    d.innerHTML = `<div class="in win">
        <div class="hd"><h2 id="fd_t">New folder</h2><p class="hint" style="margin: 8px 0 0">A folder keeps a console tidy – mods, tools, games to finish. It is a square of its own; A opens it, B leaves it.</p></div>
        <div class="bd"><div class="grp" style="margin-top: 10px">
          <div class="set"><div class="lbl"><strong>Name</strong><small>For example Mods, Tools or To finish</small></div><input class="sel" id="fd_n" maxlength="28" style="width: 240px" /></div>
          <div class="set"><div class="lbl"><strong>Colour</strong><small>Its square in this colour</small></div><div class="fd-cols" id="fd_c" role="radiogroup" aria-label="Colour"></div></div>
        </div></div>
        <div class="ft"><button class="btn ghost" id="fd_rm">Delete folder</button><div class="acts"><button class="btn" id="fd_x">Cancel</button><button class="btn main big" id="fd_s">Save</button></div></div>
      </div>`;
    document.body.append(d);
    d.addEventListener('click', e => e.target === d && d.close());
    $('#fd_n').addEventListener('keydown', e => e.key === 'Enter' && (e.preventDefault(), $('#fd_s').click()));
  }
  const sys = f ? f.sys : g ? fdSysOf(g) : curSys;
  let col = f ? f.col : FD_COLS[fdData.list.filter(x => x.sys === sys).length % FD_COLS.length];
  $('#fd_t').textContent = f ? 'Edit ' + f.name : g ? 'New folder for ' + g.name : 'New folder';
  let def = 'New folder';
  for (let k = 2; !f && !fdFree(def, sys); k++) def = 'New folder ' + k;
  $('#fd_n').value = f ? f.name : def;
  const cols = $('#fd_c');
  const drawCols = () =>
    cols.replaceChildren(
      ...FD_COLS.map(c => {
        const b = document.createElement('button');
        b.className = 'fd-col' + (c === col ? ' on' : '');
        b.style.setProperty('--fc', c);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', c === col ? 'true' : 'false');
        b.setAttribute('aria-label', 'Colour ' + c);
        b.onclick = () => {
          col = c;
          drawCols();
          blip('move');
          b.focus && cols.querySelector('.on') && cols.querySelector('.on').focus();
        };
        return b;
      }),
    );
  drawCols();
  $('#fd_rm').hidden = !f;
  $('#fd_rm').onclick = () => {
    d.close();
    fdDelete(f);
  };
  $('#fd_x').onclick = () => d.close();
  $('#fd_s').onclick = () => {
    const name = $('#fd_n').value.trim().slice(0, 28);
    if (!name) return $('#fd_n').focus(), toast('Give the folder a name first.');
    if (!fdFree(name, sys, f && f.id)) return $('#fd_n').focus(), toast('“' + name + '” is taken already – a game or another folder has that name.');
    d.close();
    if (f) {
      const was = f.name;
      Object.assign(f, { name, col });
      if (marks && marks[was] && was !== name) {
        marks[name] = marks[was];
        delete marks[was];
        try {
          localStorage.setItem('cosmou.marks', JSON.stringify(marks));
        } catch {}
      }
      if (sel === was) sel = name;
      fdSave();
      toast('✓ ' + name + ' saved', 2200);
      return render();
    }
    const nf = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, sys, col };
    fdData.list.push(nf);
    fdSave();
    if (g) fdPut(g, nf.id);
    else {
      toast('✓ Folder “' + name + '” is ready – put games in with “Put in a folder” in their menu', 4000);
      render();
    }
  };
  d.showModal();
  setTimeout(() => {
    $('#fd_n').focus();
    $('#fd_n').select();
  }, 50);
}
// icons for the menus
if (typeof MI !== 'undefined') {
  MI.plus = MI.plus || '<svg viewBox="0 0 32 32"><path d="M16 7v18M7 16h18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
  MI.trash = MI.trash || '<svg viewBox="0 0 32 32"><path d="M8 10h16M13 10V7h6v3M10 10l1 15h10l1-15" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  MI.back = MI.back || '<svg viewBox="0 0 32 32"><path d="M19 8l-8 8 8 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
if (typeof MCOL !== 'undefined') {
  MCOL.plus = MCOL.plus || '#3fae5a';
  MCOL.back = MCOL.back || '#8a8f98';
  MCOL.trash = MCOL.trash || '#e5484d';
}
