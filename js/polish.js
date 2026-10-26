// CosmoU – Theme switch, update checker, smooth view transitions and small UI sounds.

// --- Smooth transitions between views (cross-fade of the whole window) ---
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function withVT(fn) {
  if (!document.startViewTransition || reduceMotion()) return fn();
  document.startViewTransition(() => fn());
}

// --- UI sounds: short synthesized blips (original, no samples) ---
let uiSounds = true,
  actx = null;
try {
  uiSounds = localStorage.getItem('cosmou.uiSounds') !== 'false';
} catch {}
function blip(kind) {
  if (!uiSounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime,
      out = actx.createGain();
    out.gain.value = 0.07;
    out.connect(actx.destination);
    const tone = (f, at, dur, type = 'sine', g = 1) => {
      const o = actx.createOscillator(),
        e = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + at);
      e.gain.setValueAtTime(0, t + at);
      e.gain.linearRampToValueAtTime(g, t + at + 0.008);
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(out);
      o.start(t + at);
      o.stop(t + at + dur + 0.02);
    };
    if (kind === 'move') tone(1320, 0, 0.06, 'triangle', 0.6);
    else if (kind === 'page') {
      tone(660, 0, 0.09, 'triangle', 0.5);
      tone(990, 0.05, 0.12, 'triangle', 0.45);
    } else if (kind === 'open') {
      tone(880, 0, 0.12, 'sine', 0.7);
      tone(1318.5, 0.07, 0.18, 'sine', 0.55);
    } else if (kind === 'start') {
      tone(523.25, 0, 0.16, 'triangle', 0.6);
      tone(659.25, 0.08, 0.16, 'triangle', 0.6);
      tone(783.99, 0.16, 0.3, 'triangle', 0.6);
      tone(1046.5, 0.26, 0.45, 'sine', 0.45);
    } else if (kind === 'back') tone(700, 0, 0.08, 'triangle', 0.45);
  } catch {}
}
function soundUi() {
  $('#uis').textContent = uiSounds ? 'On' : 'Off';
  $('#uis').classList.toggle('on', uiSounds);
}
$('#uis').onclick = () => {
  uiSounds = !uiSounds;
  try {
    localStorage.setItem('cosmou.uiSounds', String(uiSounds));
  } catch {}
  soundUi();
  blip('open');
};
soundUi();

// --- Theme: System / Light / Dark ---
// The main process sets nativeTheme, which flips prefers-color-scheme; html.dark mirrors it for the Wii U Look and Classic style.
const darkMq = matchMedia('(prefers-color-scheme: dark)');
const syncDark = () => document.documentElement.classList.toggle('dark', darkMq.matches);
darkMq.addEventListener('change', syncDark);
syncDark();
let theme = 'system';
function themeUi() {
  document.querySelectorAll('#thm button').forEach(b => b.classList.toggle('on', b.dataset.t === theme));
}
document.querySelectorAll('#thm button').forEach(
  b =>
    (b.onclick = async () => {
      if (!window.api) {
        toast('The theme switch works in the desktop app.');
        return;
      }
      const v = b.dataset.t;
      withVT(async () => {
        theme = await api.setTheme(v);
        themeUi();
      });
    }),
);

// --- Update checker: GitHub releases, at most every 6 hours, a dismissed version stays quiet ---
async function checkUpdates(manual) {
  if (!window.api) {
    if (manual) toast('Update check works in the desktop app.');
    return;
  }
  if (manual) $('#upds').textContent = 'Checking…';
  const r = await api.checkUpdate();
  try {
    localStorage.setItem('cosmou.updChecked', String(Date.now()));
  } catch {}
  if (!r.ok) {
    if (manual) $('#upds').textContent = r.error;
    return;
  }
  $('#upds').textContent = r.available
    ? `CosmoU ${r.latest} is available (you have ${r.current})`
    : `You have the latest version (${r.current})`;
  $('#updg').hidden = !r.available;
  let dismissed = '';
  try {
    dismissed = localStorage.getItem('cosmou.updDismissed') || '';
  } catch {}
  if (r.available && (manual || dismissed !== r.latest)) {
    $('#updt').textContent = `CosmoU ${r.latest} is available`;
    $('#upd').dataset.v = r.latest;
    $('#upd').classList.add('on');
    blip('open');
  }
}
$('#updc').onclick = () => checkUpdates(true);
$('#updg').onclick = $('#updd').onclick = () => {
  if (window.api) api.openReleases();
  $('#upd').classList.remove('on');
};
$('#updx').onclick = () => {
  try {
    localStorage.setItem('cosmou.updDismissed', $('#upd').dataset.v || '');
  } catch {}
  $('#upd').classList.remove('on');
};
function initPolish() {
  theme = (cfg && cfg.theme) || 'system';
  themeUi();
  let last = 0;
  try {
    last = +localStorage.getItem('cosmou.updChecked') || 0;
  } catch {}
  if (Date.now() - last > 6 * 3600e3) setTimeout(() => checkUpdates(false), 4000);
}

// --- Home Menu avatar: blinks and waves now and then ---
let avOn = false;
function avatarLoop(now) {
  if (!isHome() || document.hidden) {
    avOn = false;
    return;
  }
  const c = $('#whavc'),
    x = c.getContext('2d'),
    t = now / 1000,
    b = buddies[0] || { fc: FACE[0], bc: BODY[3], ey: 0, mo: 0, acc: 0 };
  x.clearRect(0, 0, c.width, c.height);
  drawBuddy(
    x,
    {
      x: c.width / 2,
      y: c.height * 0.95,
      st: t % 9 < 1.6 ? 'wave' : 'idle',
      v: 0,
      t0: 0,
      ph: 0,
      c: 0,
      lx: Math.sin(t * 0.6) * 0.5,
      ba: 0,
      ...b,
      name: '',
    },
    t,
    c.height / 46,
    false,
  );
  requestAnimationFrame(avatarLoop);
}
function startAvatar() {
  if (avOn || reduceMotion()) return;
  avOn = true;
  requestAnimationFrame(avatarLoop);
}
document.addEventListener('visibilitychange', () => isHome() && startAvatar());
