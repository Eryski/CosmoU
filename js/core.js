// CosmoU – Shared state and helpers: game list, sorting, cover colours, music, main render loop.
const $ = s => document.querySelector(s);
// Windows, Linux, macOS, Android or iOS (the preview in a browser counts as Windows; ?platform=linux, darwin, android or ios
// to try the others). iPhone and iPad start the games in MeloCafe (Cemu for iOS).
const OS = (window.api && window.api.platform) || ((location.search.match(/[?&]platform=(linux|darwin|android|ios)\b/) || [])[1] ?? 'win32'),
  IS_LINUX = OS === 'linux',
  IS_MAC = OS === 'darwin',
  IS_ANDROID = OS === 'android',
  IS_IOS = OS === 'ios',
  IS_MOBILE = IS_ANDROID || IS_IOS,
  IS_WIN = !IS_LINUX && !IS_MAC && !IS_MOBILE,
  OS_NAME = IS_LINUX
    ? 'Linux'
    : IS_MAC
      ? 'macOS'
      : IS_ANDROID
        ? 'Android'
        : IS_IOS
          ? (window.api && window.api.ios && window.api.ios.system) || 'iOS'
          : 'Windows',
  CEMU_FILE = IS_LINUX ? 'Cemu' : IS_MAC ? 'Cemu.app' : IS_ANDROID ? 'Cemu for Android' : IS_IOS ? 'MeloCafe' : 'Cemu.exe',
  TV_KEY = IS_MAC ? '⌃⌘F' : 'F11';
document.documentElement.classList.toggle('os-linux', IS_LINUX);
document.documentElement.classList.toggle('os-mac', IS_MAC);
document.documentElement.classList.toggle('os-android', IS_ANDROID);
document.documentElement.classList.toggle('os-ios', IS_IOS);
document.documentElement.classList.toggle('os-mobile', IS_MOBILE);
// where Cemu is, as people know it (on a Mac the app, not the program inside it)
const cemuShown = p => (IS_MAC ? String(p || '').replace(/\/Contents\/MacOS\/[^/]+$/, '') : p || '');
const demo = ['Star Chaser', 'Cloud Racing', 'Deep Sea Expedition', 'Pixel Fortress', 'Night Train', 'Spark Flight', 'Moon Garden'].map(
  n => ({ name: n, format: 'Demo', path: '' }),
);
let games = [],
  cfg = {},
  view = 'lib',
  sortMode = 'az',
  sel = '',
  plays = {};
let musicOn = true,
  bgMusic = null,
  musicName = '';
try {
  musicOn = localStorage.getItem('cosmou.music') !== 'false';
} catch {}
function syncMusic() {
  if (!bgMusic) return;
  if (musicOn) bgMusic.play().catch(() => {});
  else bgMusic.pause();
}
// menu music volume, 0–1 (Settings → Sound & Music)
function musicVol() {
  try {
    const v = localStorage.getItem('cosmou.musicVol');
    if (v !== null && isFinite(+v)) return Math.max(0, Math.min(1, +v / 100));
  } catch {}
  return 0.35;
}
function musicUi() {
  $('#mt').textContent = musicOn ? 'On' : 'Off';
  $('#mt').classList.toggle('on', musicOn);
  $('#ms').textContent = bgMusic ? musicName : 'No music found – put a file in the music folder';
}
async function initMusic() {
  const m = await themedMusic(window.api ? await api.getMusic() : null);
  if (m && m.url) {
    bgMusic = new Audio(m.url);
    bgMusic.loop = true;
    bgMusic.volume = musicVol();
    musicName = m.name;
  }
  musicUi();
  syncMusic();
}
try {
  plays = JSON.parse(localStorage.getItem('cosmou.plays') || '{}');
} catch {}
let mode = 'covers';
try {
  const vm = localStorage.getItem('cosmou.viewMode');
  if (vm === 'grid' || vm === 'wiiu' || vm === 'chome') mode = vm;
} catch {}
const hue = s => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};
const colors = {};
const glow = g => g.color || colors[g.name] || `hsl(${hue(g.name)} 85% 58%)`;
function sample(g) {
  if (!g.cover || colors[g.name]) return;
  const i = new Image();
  i.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 8;
      const x = c.getContext('2d');
      x.drawImage(i, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data;
      let r = 0,
        y = 0,
        b = 0;
      for (let k = 0; k < d.length; k += 4) {
        r += d[k];
        y += d[k + 1];
        b += d[k + 2];
      }
      const n = d.length / 4;
      colors[g.name] = `rgb(${(r / n) | 0} ${(y / n) | 0} ${(b / n) | 0})`;
      render();
    } catch {}
  };
  i.src = g.cover;
}
function paint(el, g, initials = true) {
  el.replaceChildren();
  el.style.background = '';
  el.style.backgroundImage = '';
  if (g.cover) {
    el.style.backgroundImage = `url("${g.cover}")`;
    return;
  }
  const h = hue(g.name);
  // no cover: a generated box with a soft light, fine stripes, the initials and the full title
  el.style.background =
    `radial-gradient(120% 75% at 18% 0%, rgba(255,255,255,.34), transparent 56%),` +
    `repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 10px, transparent 10px 22px),` +
    `linear-gradient(135deg,hsl(${h} 72% 62%),hsl(${(h + 55) % 360} 78% 42%))`;
  if (initials) {
    const s = document.createElement('span');
    s.textContent = g.name
      .split(/\s+/)
      .filter(w => /[\p{L}\p{N}]/u.test(w))
      .slice(0, 2)
      .map(w => w.match(/[\p{L}\p{N}]/u)[0].toUpperCase())
      .join('');
    el.append(s);
    if (el.classList.contains('art')) {
      const t = document.createElement('small');
      t.className = 'art-name';
      t.textContent = g.name;
      el.append(t);
    }
  }
}
// Small Liquid Glass notifications in the bottom-right corner; they stack and fade out on their own.
const WARN_RE = /(n’t|n't|\bnot\b|error|fail|first|only works|no longer|unknown|invalid|couldn|wrong|close cemu)/i;
function toast(t, ms = 3500, type, action) {
  const box = $('#notes');
  if (!box) return;
  t = String(t || '');
  type = type || (/^✓/.test(t) ? 'ok' : ms >= 6000 || WARN_RE.test(t) ? 'warn' : 'ok');
  const n = document.createElement('div'),
    ic = document.createElement('i'),
    tx = document.createElement('span');
  n.className = 'note ' + type;
  n.setAttribute('role', 'status');
  ic.textContent = type === 'warn' ? '!' : type === 'info' ? 'i' : '✓';
  tx.textContent = t.replace(/^✓\s*/, '');
  n.append(ic, tx);
  if (action) {
    const b = document.createElement('button');
    b.className = 'note-act';
    b.textContent = action.label;
    b.onclick = e => {
      e.stopPropagation();
      action.fn();
      n.onclick();
    };
    n.append(b);
  }
  box.append(n);
  while (box.children.length > 3) box.firstElementChild.remove();
  requestAnimationFrame(() => n.classList.add('on'));
  const kill = () => {
    if (n.classList.contains('out')) return;
    n.classList.add('out');
    setTimeout(() => n.remove(), 420);
  };
  n.onclick = kill;
  setTimeout(kill, Math.max(2500, ms));
}
const cur = () => games.find(g => g.name === sel);
// ---------- favorites, sorting and the "show" filter (menu: js/menus.js) ----------
let favs = new Set(),
  showFilter = 'all';
try {
  const f = JSON.parse(localStorage.getItem('cosmou.favs') || '[]');
  if (Array.isArray(f)) favs = new Set(f.filter(x => typeof x === 'string'));
  const so = localStorage.getItem('cosmou.sort');
  if (['az', 'za', 'recent', 'most'].includes(so)) sortMode = so;
  const sh = localStorage.getItem('cosmou.show');
  if (['all', 'fav', 'wiiu', 'apps'].includes(sh)) showFilter = sh;
} catch {}
const isFav = name => favs.has(name);
const SORT_LABEL = { az: 'A–Z', za: 'Z–A', recent: 'Recent', most: 'Most played' },
  SHOW_LABEL = { all: 'All games', fav: 'Favorites', wiiu: 'Wii U games', apps: 'Other apps' };
// seconds played (Daily Log) – 0 when the log isn't loaded yet
const secOf = name =>
  (typeof playLog === 'object' && playLog && playLog.playtime && playLog.playtime[name] && playLog.playtime[name].sec) || 0;
function list() {
  const q = $('#q').value.trim().toLowerCase();
  let l = games.filter(g => g.name.toLowerCase().includes(q) || (g.tid && String(g.tid).toLowerCase().includes(q)));
  // only the games of the system on screen (other apps show everywhere)
  if (typeof curSys === 'string') l = l.filter(g => g.kind === 'app' || sysOf(g) === curSys);
  if (view === 'recent') l = l.filter(g => plays[g.name]);
  if (showFilter === 'fav') l = l.filter(g => favs.has(g.name));
  else if (showFilter === 'wiiu') l = l.filter(g => g.kind !== 'app');
  else if (showFilter === 'apps') l = l.filter(g => g.kind === 'app');
  const by = view === 'recent' ? 'recent' : sortMode,
    az = (a, b) => a.name.localeCompare(b.name);
  return l.sort((a, b) =>
    by === 'recent'
      ? (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b)
      : by === 'most'
        ? secOf(b.name) - secOf(a.name) || (plays[b.name] || 0) - (plays[a.name] || 0) || az(a, b)
        : by === 'za'
          ? az(b, a)
          : az(a, b),
  );
}
function render() {
  // the floating 3D case belongs to the old layout: drop it before anything moves
  if (typeof hoverOff === 'function') hoverOff();
  const l = list();
  if (!cur())
    sel = (games.slice().sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name))[0] || {}).name || '';
  if (mode !== 'grid' && l.length && !l.some(x => x.name === sel)) sel = l[0].name;
  const g = cur();
  $('#hero').hidden = !g || mode !== 'grid';
  if (g) {
    $('#hero').style.setProperty('--c', glow(g));
    paint($('#hbg'), { ...g, cover: g.hero || g.cover }, false);
    $('#ht').textContent = g.name;
    $('#hl').textContent = (plays[g.name] ? 'Recently played' : 'Selected') + ' · ' + g.format;
  }
  $('#st').textContent = view === 'recent' ? 'Recently played' : 'Library';
  const nf = l.filter(x => favs.has(x.name)).length;
  $('#count').textContent = l.length + (l.length === 1 ? ' game' : ' games') + (nf && showFilter !== 'fav' ? ` · ${nf} ★` : '');
  if (typeof sortUi === 'function') sortUi();
  else $('#sort').textContent = SORT_LABEL[sortMode];
  const em = !l.length,
    q = $('#q').value.trim();
  $('#empty').hidden = !em;
  $('#grid').hidden = mode !== 'grid';
  $('#sec').hidden = mode !== 'grid';
  $('#cf').hidden = mode !== 'covers' || em;
  $('#wu').hidden = mode !== 'wiiu' || em;
  $('#sw').hidden = mode !== 'chome' || em;
  document.body.classList.toggle('wiiu', mode === 'wiiu' && !em);
  document.body.dataset.mode = mode;
  document.body.classList.toggle('wuhome', mode === 'wiiu' && !em && wuView === 'home');
  if (mode === 'covers') buildCovers(l);
  if (mode === 'chome' && !em) buildCHome(l);
  if (mode === 'wiiu' && !em && wuView === 'home') {
    stopMii();
    buildHome(l);
  } else if (mode === 'wiiu' && !em) {
    buildWiiU(l);
    startMii();
  } else stopMii();
  if (em) {
    const filtered = showFilter !== 'all' && games.length;
    $('#et').textContent = q
      ? 'No matches'
      : filtered
        ? showFilter === 'fav'
          ? 'No favorites yet'
          : 'Nothing to show'
        : view === 'recent'
          ? 'Nothing played yet'
          : 'Your library is empty';
    $('#ep').textContent = q
      ? 'Try a different title.'
      : filtered
        ? showFilter === 'fav'
          ? 'Right-click a game (or press F) and choose “Add to favorites”.'
          : 'No games match “' + SHOW_LABEL[showFilter] + '”.'
        : view === 'recent'
          ? 'Games you launch will show up here.'
          : IS_IOS
            ? 'Get your games from MeloCafe and they appear here.'
            : typeof curSys === 'string' && curSys !== 'wiiu'
              ? 'Choose your ' + SYS[curSys].name + ' games folder in Settings → Cemu & Games → Other systems.'
              : 'Choose the folder with your Wii U games and they appear here.';
    $('#ebtn').hidden = !!q || view === 'recent' || !!filtered;
    if (typeof emptyExtra === 'function') emptyExtra(!q && filtered);
  }
  const gr = $('#grid');
  gr.replaceChildren();
  l.forEach((x, i) => {
    const t = document.createElement('button');
    t.className = 'tile' + (x.name === sel ? ' on' : '') + (favs.has(x.name) ? ' fav' : '');
    t.dataset.g = x.name;
    t.style.setProperty('--i', Math.min(i, 14));
    t.style.setProperty('--c', glow(x));
    t.onpointerleave = () => {
      t.style.setProperty('--rx', '0deg');
      t.style.setProperty('--ry', '0deg');
      hoverOff();
    };
    t.onpointerenter = () => hoverCase(t, x);
    const a = document.createElement('div');
    a.className = 'art';
    paint(a, x);
    const b = document.createElement('b');
    b.textContent = x.name;
    t.append(a, b);
    if (favs.has(x.name)) {
      const f = document.createElement('i');
      f.className = 'fbadge';
      f.textContent = '★';
      f.title = 'Favorite';
      t.append(f);
    }
    if (x.name === sel) {
      const r = document.createElement('div');
      r.className = 'ring';
      t.append(r);
    }
    t.onclick = () => openDetail(x);
    gr.append(t);
  });
}
