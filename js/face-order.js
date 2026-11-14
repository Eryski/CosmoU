// CosmoU – your order in the Switch's and the Switch 2's own interfaces (Eduard: "the Switch theme is amazing but
// who needs it if you can not change the order of the games").
// ZR / RT (or M) lifts the chosen game – in All Software / the Library, or on Home (then the Library opens with it).
// The D-pad or the arrow keys move it, A, B, ZR, Enter or Escape put it down. It is the same order as everywhere
// else in CosmoU for this console – the sort "Your order" (js/order.js). Folders move like games.
// Names start with fo… so they never meet the names of other scripts or theme files.

NX_SORT.own = 'Your order';
N2_SORT.own = 'Your order';
if (nxLs('nxSort') === 'own') nx.sort = 'own';
if (n2Ls('n2Sort') === 'own') n2.sort = 'own';

const fo = { mv: '' };
// the face on screen and its parts
function foF() {
  if (typeof nx === 'object' && nx.on)
    return { o: nx, lib: 'all', list: nxAllList, grid: () => $('#nxgrid'), cell: 'nx-cell', draw: nxDrawAll, show: nxShow, sort: nxSetSort, snd: nxSnd, chosen: nxChosen, hints: '#nxhints', hint: 'nx-hint' };
  if (typeof n2 === 'object' && n2.on)
    return { o: n2, lib: 'lib', list: n2LibList, grid: () => n2$('n2grid'), cell: 'n2-cell', draw: n2DrawLib, show: n2Show, sort: n2SetSort, snd: n2Snd, chosen: n2Chosen, hints: '#n2hints', hint: 'n2-hint' };
  return null;
}
// ZR: lift the chosen game – or put it down
function foRt() {
  if (fo.mv) return foEnd();
  const F = foF();
  if (!F || F.o.qs || F.o.pop || F.o.scr === 'game') return;
  const g = F.chosen();
  if (!g || g.kind === 'folder-back') return F.snd('bump');
  if (F.o.q && F.o.q.trim()) return toast('Moving works without a search', 3000);
  if (F.o.scr !== F.lib) {
    sel = g.name;
    F.show(F.lib);
  }
  // the first move: the order on screen becomes your order
  if (F.o.sort !== 'own') {
    setOwnOrder(orderFull(F.list().filter(x => x.kind !== 'folder-back').map(x => x.name)));
    F.sort('own');
  }
  fo.mv = g.name;
  sel = g.name;
  F.o.zone = 'grid';
  F.o.ai = Math.max(0, F.list().findIndex(x => x.name === g.name));
  document.body.classList.add('fo-moving');
  F.draw();
  foUi();
  F.snd('open');
  toast('↔ Moving “' + g.name + '” – the D-pad moves it, A or ZR puts it down', 4000);
}
function foShift(d) {
  const F = foF();
  if (!F) return foEnd();
  const l = F.list(),
    i = l.findIndex(x => x.name === fo.mv);
  if (i < 0) return foEnd();
  const grid = F.grid(),
    cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length),
    lo = l[0] && l[0].kind === 'folder-back' ? 1 : 0,
    j = Math.max(lo, Math.min(l.length - 1, i + ({ l: -1, r: 1, u: -cols, d: cols }[d] || 0)));
  if (j === i) return F.snd('bump');
  // it takes the place of the game it moves onto – in the whole order of this console (a folder's games and the
  // games in other folders keep their places)
  const full = orderFull().filter(n => n !== fo.mv),
    k = full.indexOf(l[j].name);
  full.splice(k < 0 ? (j > i ? full.length : 0) : j > i ? k + 1 : k, 0, fo.mv);
  setOwnOrder(full);
  F.o.ai = j;
  F.draw();
  foUi();
  F.snd('move');
}
function foEnd(quiet) {
  if (!fo.mv) return;
  const name = fo.mv,
    F = foF();
  fo.mv = '';
  document.body.classList.remove('fo-moving');
  for (const e of document.querySelectorAll('.fo-mv')) e.classList.remove('fo-mv');
  if (F) {
    F.draw();
    if (!quiet) F.snd('open');
  }
  if (!quiet) toast('✓ “' + name + '” is in its new place (sort: Your order)', 2600);
}
// the lifted game: raised, with a dashed frame; the bottom bar says how to put it down
function foUi() {
  for (const e of document.querySelectorAll('.fo-mv')) e.classList.remove('fo-mv');
  const F = foF();
  if (!F || !fo.mv) return;
  const c = F.grid().children[F.o.ai];
  if (c && c.classList.contains(F.cell)) c.classList.add('fo-mv');
  const box = $(F.hints);
  if (box && box.dataset.k !== 'fo') {
    box.dataset.k = 'fo';
    box.replaceChildren(
      ...[
        ['✥', 'Move'],
        ['ZR', 'Put down'],
        ['A', 'Put down'],
      ].map(([k, t]) => {
        const b = document.createElement('button');
        b.className = F.hint;
        b.innerHTML = '<i></i><span></span>';
        b.querySelector('i').textContent = k;
        b.querySelector('span').textContent = t;
        b.onclick = () => foEnd();
        return b;
      }),
    );
  }
}

// while a game is lifted: the D-pad moves it, A and B put it down, nothing else happens
for (const [on, mv, a, b, sel2, hi, hid] of [
  [() => typeof nx === 'object' && nx.on, 'nxMove', 'nxA', 'nxB', 'nxSelUi', 'nxHints', '#nxhints'],
  [() => typeof n2 === 'object' && n2.on, 'n2Move', 'n2A', 'n2B', 'n2SelUi', 'n2Hints', '#n2hints'],
]) {
  const fM = window[mv],
    fA = window[a],
    fB = window[b],
    fS = window[sel2],
    fH = window[hi];
  window[mv] = function (d) {
    if (fo.mv && on()) return foShift(d);
    return fM.apply(this, arguments);
  };
  window[a] = function () {
    if (fo.mv && on()) return foEnd();
    return fA.apply(this, arguments);
  };
  window[b] = function () {
    if (fo.mv && on()) return foEnd();
    return fB.apply(this, arguments);
  };
  window[sel2] = function () {
    const r = fS.apply(this, arguments);
    if (fo.mv && on()) foUi();
    return r;
  };
  window[hi] = function () {
    if (fo.mv && on()) return foUi();
    const box = $(hid);
    if (box && box.dataset.k === 'fo') box.dataset.k = '';
    return fH.apply(this, arguments);
  };
}
// the Case Room, another console or another screen: the game is put down where it is
if (typeof czOpen === 'function') {
  const _czOpenFo = czOpen;
  czOpen = function () {
    foEnd(true);
    return _czOpenFo.apply(this, arguments);
  };
}
const _renderFo = render;
render = function () {
  if (fo.mv && !foF()) foEnd(true);
  const r = _renderFo.apply(this, arguments);
  foWall();
  return r;
};

// ---------- the console's own picture behind the Switch interfaces (Eduard: "Switch 1/2 don't take wallpaper") ----------
// the picture chosen for this console (Settings → Appearance → its picture, js/looks.js) shows through the Switch's
// and the Switch 2's background, a little veiled so the squares and the words stay easy to read
function foWall() {
  const b = typeof lookPic === 'function' ? lookPic() : null,
    url = b && b.url ? b.url : '';
  for (const id of ['nx', 'n2']) {
    const el = document.getElementById(id);
    if (!el || el.dataset.wall === url) continue;
    el.dataset.wall = url;
    el.classList.toggle('has-wall', !!url);
    if (url) el.style.setProperty('--wall', typeof cssPic === 'function' ? cssPic(url) : `url("${url}")`);
    else el.style.removeProperty('--wall');
  }
}
if (typeof applyBackdrop === 'function') {
  const _applyBackdropFo = applyBackdrop;
  applyBackdrop = function () {
    const r = _applyBackdropFo.apply(this, arguments);
    foWall();
    return r;
  };
}
// Enter and Escape put it down too
addEventListener(
  'keydown',
  e => {
    if (!fo.mv || !foF()) return;
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopImmediatePropagation();
      foEnd();
    }
  },
  true,
);
