// CosmoU – your own order of the games, and the clean view.
// Your order: RT (or "Move" in a game's menu, or M) lifts the chosen game in Covers or Grid; the D-pad / arrow keys move
// it, A, B, RT, Enter or Escape put it down. The order is kept for each console and shown as the sort "Your order".
// Clean view: in Covers only the games stay – small at the bottom with the name above them, so the background
// picture is free. Hold LT + RT (or press H, or use the Quick Menu) to switch it.
let orderMove = '';

function orderStart() {
  const g = cur();
  if (!g || (mode !== 'covers' && mode !== 'grid') || view === 'recent') {
    if (view === 'recent') toast('Moving works in the Library – not in “Recently played”', 3500);
    return;
  }
  // the first move: the order on screen becomes your order
  if (sortMode !== 'own') {
    setOwnOrder(list().map(x => x.name));
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
// while a game is lifted, a step moves it instead of choosing another one
function orderShift(d) {
  const l = list().map(x => x.name),
    i = l.indexOf(orderMove);
  if (i < 0) return orderEnd();
  const j = Math.max(0, Math.min(l.length - 1, i + d));
  if (j === i) return;
  l.splice(i, 1);
  l.splice(j, 0, orderMove);
  // games that are not on screen right now (search, filter) keep their places after these
  const rest = ownOrder().filter(n => !l.includes(n));
  setOwnOrder([...l, ...rest]);
  sel = orderMove;
  blip('move');
  render();
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
    if (e.key.toLowerCase() === 'm' && (mode === 'covers' || mode === 'grid')) {
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
    if (snd && window.api && api.appSave)
      qmRow(snd, 'plus', '#2fb36a', 'Add an app', 'A PC game, a port or any program', () => {
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
