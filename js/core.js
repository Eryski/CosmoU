// CosmoU – Shared state and helpers: game list, sorting, cover colours, music, main render loop.
const $ = s => document.querySelector(s);
const demo = [
  'Star Chaser',
  'Cloud Racing',
  'Deep Sea Expedition',
  'Pixel Fortress',
  'Night Train',
  'Spark Flight',
  'Moon Garden',
].map(n => ({ name: n, format: 'Demo', path: '' }));
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
    bgMusic.volume = 0.35;
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
  if (vm === 'grid' || vm === 'wiiu') mode = vm;
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
  el.style.background = `linear-gradient(135deg,hsl(${h} 78% 66%),hsl(${(h + 55) % 360} 80% 48%))`;
  if (initials) {
    const s = document.createElement('span');
    s.textContent = g.name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('');
    el.append(s);
  }
}
// Small Liquid Glass notifications in the bottom-right corner; they stack and fade out on their own.
const WARN_RE = /(n’t|n't|\bnot\b|error|fail|first|only works|no longer|unknown|invalid|couldn|wrong|close cemu)/i;
function toast(t, ms = 3500, type) {
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
function list() {
  const q = $('#q').value.trim().toLowerCase();
  let l = games.filter(g => g.name.toLowerCase().includes(q));
  if (view === 'recent') l = l.filter(g => plays[g.name]);
  const t = view === 'recent' || sortMode === 'recent';
  return l.sort((a, b) =>
    t ? (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name),
  );
}
function render() {
  const l = list();
  if (!cur())
    sel =
      (games.slice().sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name))[0] || {}).name ||
      '';
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
  $('#count').textContent = l.length + (l.length === 1 ? ' game' : ' games');
  $('#sort').textContent = sortMode === 'az' ? 'A–Z' : 'Recent';
  const em = !l.length,
    q = $('#q').value.trim();
  $('#empty').hidden = !em;
  $('#grid').hidden = mode !== 'grid';
  $('#sec').hidden = mode !== 'grid';
  $('#cf').hidden = mode !== 'covers' || em;
  $('#wu').hidden = mode !== 'wiiu' || em;
  document.body.classList.toggle('wiiu', mode === 'wiiu' && !em);
  document.body.classList.toggle('wuhome', mode === 'wiiu' && !em && wuView === 'home');
  if (mode === 'covers') buildCovers(l);
  if (mode === 'wiiu' && !em && wuView === 'home') {
    stopMii();
    buildHome(l);
  } else if (mode === 'wiiu' && !em) {
    buildWiiU(l);
    startMii();
  } else stopMii();
  if (em) {
    $('#et').textContent = q ? 'No matches' : view === 'recent' ? 'Nothing played yet' : 'Your library is empty';
    $('#ep').textContent = q
      ? 'Try a different title.'
      : view === 'recent'
        ? 'Games you launch will show up here.'
        : 'Choose the folder with your Wii U games and they appear here.';
    $('#ebtn').hidden = !!q || view === 'recent';
  }
  const gr = $('#grid');
  gr.replaceChildren();
  l.forEach((x, i) => {
    const t = document.createElement('button');
    t.className = 'tile' + (x.name === sel ? ' on' : '');
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
    if (x.name === sel) {
      const r = document.createElement('div');
      r.className = 'ring';
      t.append(r);
    }
    t.onclick = () => openDetail(x);
    gr.append(t);
  });
}
