// CosmoU – your own order of the games, and the clean view.
// Your order: RT (or "Move" in a game's menu, or M) lifts the chosen game in Covers or Grid; the D-pad / arrow keys move
// it, A, B, RT, Enter or Escape put it down. The order is kept for each console and shown as the sort "Your order".
// Clean view: in Covers only the games stay – small at the bottom with the name above them, so the background
// picture is free. Hold LT + RT (or press H, or use the Quick Menu) to switch it.
let orderMove = '';

// where a game can be lifted: Covers, Grid, the home screens of the consoles and the Wii U Look's Home Menu
const orderHere = () => mode === 'covers' || mode === 'grid' || mode === 'chome' || (typeof isHome === 'function' && isHome());
function orderStart() {
  const g = cur();
  if (!g || !orderHere() || view === 'recent') {
    if (view === 'recent') toast('Moving works in the Library – not in “Recently played”', 3500);
    return;
  }
  // (the way back out of a folder stays first)
  if (g.kind === 'folder-back') return blip('back');
  // the first move: the order on screen becomes your order
  if (sortMode !== 'own') {
    setOwnOrder(orderFull(list().filter(x => x.kind !== 'folder-back').map(x => x.name)));
    sortMode = 'own';
    try {
      localStorage.setItem('cosmou.sort', 'own');
    } catch {}
    if (typeof sortUi === 'function') sortUi();
  }
  orderMove = g.name;
  document.body.classList.add('moving');
  blip('open');
  render();
  toast('↔ Moving “' + g.name + '” – the D-pad moves it, A or RT puts it down', 4000);
}
function orderEnd() {
  if (!orderMove) return;
  const name = orderMove;
  orderMove = '';
  document.body.classList.remove('moving');
  blip('start');
  render();
  toast('✓ “' + name + '” is in its new place (sort: Your order)', 2600);
}
// every name of this console in your order – its games, apps and folders, also the games inside folders and the ones
// a filter or a search hides (the ones not placed yet after them, A–Z). Moving a game inside a folder used to keep
// only that folder's games in your order, and folders could not be moved at all (Eduard)
function orderFull(base) {
  const here = games.filter(g => (g.kind === 'app' ? !g.appSys || g.appSys === 'all' || g.appSys === curSys : sysOf(g) === curSys)).map(g => g.name),
    fds = typeof fdHere === 'function' && !everySys ? fdHere().map(f => f.name) : [],
    have = new Set([...here, ...fds]),
    seen = new Set(),
    out = [];
  for (const n of base || ownOrder()) if (have.has(n) && !seen.has(n)) seen.add(n), out.push(n);
  const az = (a, b) => a.localeCompare(b);
  // (a folder not placed yet goes first, where it was shown – a game not placed yet after the others)
  return [...fds.filter(n => !seen.has(n)).sort(az), ...out, ...here.filter(n => !seen.has(n)).sort(az)];
}
const orderAll = () => orderFull();
// while a game is lifted, a step moves it instead of choosing another one
function orderShift(d) {
  const l = list()
      .filter(x => x.kind !== 'folder-back')
      .map(x => x.name),
    i = l.indexOf(orderMove);
  if (i < 0) return orderEnd();
  const j = Math.max(0, Math.min(l.length - 1, i + d));
  if (j === i) return;
  // the game takes the place of its neighbour on screen in the whole order of this console:
  // with a filter (favorites, search) or inside a folder the hidden games keep their places
  const full = orderFull().filter(n => n !== orderMove),
    k = full.indexOf(l[j]);
  full.splice(k < 0 ? (d > 0 ? full.length : 0) : d > 0 ? k + 1 : k, 0, orderMove);
  setOwnOrder(full);
  sel = orderMove;
  blip('move');
  render();
}
// the home screens of the consoles (js/console-home.js): the arrows move the lifted game too – up and down a row
if (typeof chNav === 'function') {
  const _chNavOrder = chNav;
  chNav = function (d) {
    if (!orderMove || mode !== 'chome') return _chNavOrder.apply(this, arguments);
    const cols = typeof chCols === 'function' ? chCols() : 0;
    if (d === 'l' || d === 'r') return orderShift(d === 'r' ? 1 : -1);
    if (cols) return orderShift(d === 'd' ? cols : -cols);
  };
}
const _stepOrder = step;
step = function (d) {
  if (orderMove) return orderShift(d);
  return _stepOrder.apply(this, arguments);
};
// keyboard: M lifts the game; while moving, Enter / Escape put it down, up and down go a row in the grid
addEventListener(
  'keydown',
  e => {
    if (document.querySelector('dialog[open]') || e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (orderMove) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key.toLowerCase() === 'm') {
        e.preventDefault();
        e.stopImmediatePropagation();
        orderEnd();
      }
      return;
    }
    if (e.key.toLowerCase() === 'm' && orderHere()) {
      e.preventDefault();
      orderStart();
    } else if (e.key.toLowerCase() === 'h' && !e.repeat) {
      e.preventDefault();
      toggleClean();
    }
  },
  true,
);

// ---------- clean view ----------
let cleanOn = false;
try {
  cleanOn = localStorage.getItem('cosmou.clean') === '1';
} catch {}
function applyClean() {
  document.body.classList.toggle('clean', cleanOn);
}
function toggleClean(on) {
  cleanOn = typeof on === 'boolean' ? on : !cleanOn;
  try {
    localStorage.setItem('cosmou.clean', cleanOn ? '1' : '0');
  } catch {}
  applyClean();
  blip(cleanOn ? 'open' : 'back');
  if (cleanOn && mode !== 'covers') toast('Clean view is for Covers – it shows there', 3000);
  else toast(cleanOn ? '✓ Clean view – hold LT + RT (or press H) to bring everything back' : '✓ Everything back', 3000);
  if (typeof quickBuild === 'function' && $('#qmdlg') && $('#qmdlg').open) quickBuild();
}
// LT + RT held for a moment switches it (once per hold)
let cleanSince = 0,
  cleanDone = false;
function cleanHold(both, now) {
  if (!both) {
    cleanSince = 0;
    cleanDone = false;
    return;
  }
  if (!cleanSince) cleanSince = now;
  if (!cleanDone && now - cleanSince > 650) {
    cleanDone = true;
    if (orderMove) orderEnd();
    toggleClean();
  }
}
applyClean();

// ---------- Quick Menu: clean view and adding an app ----------
if (typeof quickBuild === 'function') {
  const _quickBuildO = quickBuild;
  quickBuild = function () {
    _quickBuildO.apply(this, arguments);
    const look = $('#qmtg'),
      snd = $('#qmsnd');
    if (look)
      qmRow(look, 'eye', '#5b8def', 'Clean view', cleanOn ? 'On · only the games' : 'Off · hold LT + RT', () => toggleClean(), cleanOn);
    // apps and PC games are added often: right here, not only in Settings
    // (with the look: what is on your console – not under Sound)
    if (look && window.api && api.appSave)
      qmRow(look, 'plus', '#2fb36a', 'Add an app', 'A PC game, a port or any program', () => {
        $('#qmdlg').close();
        if (typeof openApp === 'function') openApp(null);
      });
  };
}
if (typeof QI !== 'undefined') {
  QI.eye =
    '<svg viewBox="0 0 32 32"><path d="M3 16s5-8.5 13-8.5S29 16 29 16s-5 8.5-13 8.5S3 16 3 16z" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/><circle cx="16" cy="16" r="4" fill="#fff"/></svg>';
  QI.plus = '<svg viewBox="0 0 32 32"><path d="M16 6v20M6 16h20" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>';
}

// ---------- the name at the top left: CosmoU's own folder ----------
// (settings, covers, music, pictures, themes and saves – CosmoU-data next to the portable .exe)
{
  const b = document.querySelector('.brand');
  if (b && window.api && api.openDataFolder) {
    b.classList.add('brand-link');
    b.title = 'Open the CosmoU folder';
    b.tabIndex = 0;
    b.setAttribute('role', 'button');
    const go = () => {
      blip('open');
      api.openDataFolder();
      toast('📂 The CosmoU folder: settings, covers, music, pictures and themes', 3000);
    };
    b.addEventListener('click', go);
    b.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  }
}
