// CosmoU – Save backups, TV mode and the startup animation.

// ---------- Save backups ----------
let svGame = null;
const fmtSize = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const fmtWhen = ts => dayName(ts) + ', ' + new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
function svButtons(backup, restore) {
  $('#dsvb').disabled = !backup;
  $('#dsvr').disabled = !restore;
}
async function saveUi(g) {
  svGame = g;
  const box = $('#dsv');
  box.hidden = !cemuGame(g);
  if (box.hidden) return;
  if (!window.api || !api.savesInfo) {
    $('#dsvs').textContent = 'Save backups work in the desktop app.';
    return svButtons(false, false);
  }
  $('#dsvs').textContent = 'Checking…';
  const i = await api.savesInfo(g.tid || '', g.name);
  if (svGame !== g) return;
  if (!i.supported) {
    $('#dsvs').textContent = 'Needs the game in folder format (with its title ID) and Cemu set up.';
    return svButtons(false, false);
  }
  const last = i.backups[0],
    n = i.backups.length;
  $('#dsvs').textContent =
    (i.found ? 'Saves: ' + fmtSize(i.size) : 'No save data yet') +
    ' · ' +
    (last ? `${n} ${n === 1 ? 'backup' : 'backups'}, last ${fmtWhen(last.at)}` : 'no backups yet') +
    (i.auto ? ' · backed up before every start' : '');
  svButtons(i.found, n > 0);
}
$('#dsvb').onclick = async () => {
  const g = svGame;
  if (!g) return;
  $('#dsvb').disabled = true;
  const r = await api.savesBackup(g.tid || '', g.name);
  toast(r.ok ? '✓ Save data backed up' : r.error, r.ok ? 3500 : 6000);
  saveUi(g);
};
async function renderRestore(g) {
  const i = await api.savesInfo(g.tid || '', g.name),
    list = $('#svlist');
  $('#svsub').textContent = `${g.name} · Before restoring, CosmoU backs up your current saves, so you can always go back.`;
  list.replaceChildren();
  if (!i.backups.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'No backups yet.';
    list.append(p);
  }
  for (const b of i.backups) {
    const row = document.createElement('div'),
      tx = document.createElement('div'),
      h = document.createElement('b'),
      m = document.createElement('small'),
      acts = document.createElement('div'),
      rs = document.createElement('button'),
      del = document.createElement('button');
    row.className = 'svrow';
    h.textContent = fmtWhen(b.at);
    m.textContent = (b.auto ? 'Automatic' : 'Manual') + ' · ' + fmtSize(b.size);
    tx.append(h, m);
    acts.className = 'acts';
    rs.className = 'btn main';
    rs.textContent = 'Restore';
    rs.onclick = async () => {
      rs.disabled = true;
      const r = await api.savesRestore(g.tid || '', g.name, b.file);
      toast(r.ok ? '✓ Save data restored' : r.error, r.ok ? 4000 : 6000);
      renderRestore(g);
      saveUi(g);
    };
    del.className = 'btn';
    del.textContent = 'Delete';
    del.onclick = async () => {
      await api.savesDelete(g.name, b.file);
      renderRestore(g);
      saveUi(g);
    };
    acts.append(rs, del);
    row.append(tx, acts);
    list.append(row);
  }
}
$('#dsvr').onclick = async () => {
  if (!svGame) return;
  await renderRestore(svGame);
  $('#svdlg').showModal();
};
$('#svx').onclick = () => $('#svdlg').close();
$('#svof').onclick = () => svGame && api.savesFolder(svGame.name);
$('#svfold').onclick = () => (window.api ? api.savesFolder('') : toast('This works in the desktop app.'));
$('#svauto').onclick = async () => {
  if (!need()) return;
  cfg = await api.setAutoSaveBackup(cfg.autoSaveBackup === false);
  extrasUi();
};

// ---------- TV mode ----------
let tv = false,
  tvIdle = 0;
const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem('cosmou.' + k);
    return v === null ? d : v === 'true';
  } catch {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem('cosmou.' + k, String(v));
  } catch {}
};
async function setTv(on) {
  tv = !!on;
  document.body.classList.toggle('tv', tv);
  if (window.api && api.setTvMode) await api.setTvMode(tv);
  else if (tv) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  blip(tv ? 'open' : 'back');
  requestAnimationFrame(() => {
    ind();
    vind();
    render();
  });
  toast(tv ? '✓ TV mode · Select or ' + TV_KEY + ' to leave' : '✓ TV mode off', 3000, 'info');
}
const toggleTv = () => setTv(!tv);
addEventListener('keydown', e => {
  // F11, or ⌃⌘F on a Mac (the usual full screen keys there)
  if (e.key === 'F11' || (IS_MAC && e.ctrlKey && e.metaKey && e.code === 'KeyF')) {
    e.preventDefault();
    toggleTv();
  } else if (e.key === 'Escape' && tv && !document.querySelector('dialog[open]')) setTv(false);
});
// hide the mouse pointer in TV mode until it moves
addEventListener('pointermove', () => {
  document.body.classList.remove('idle');
  clearTimeout(tvIdle);
  if (tv) tvIdle = setTimeout(() => document.body.classList.add('idle'), 2500);
});
$('#tvgo').onclick = () => {
  $('#dlg').close();
  setTv(true);
};
$('#tvst').onclick = () => {
  lsSet('tvStart', !lsGet('tvStart', false));
  extrasUi();
};

// ---------- Startup animation with a jingle per theme ----------
// [motion, notes [time s, midi, length s], wave]
const BOOT = {
  'liquid-glass': [
    'bloom',
    [
      [0, 72, 0.5],
      [0.08, 76, 0.5],
      [0.16, 79, 0.6],
      [0.24, 83, 0.9],
      [0.32, 86, 1.2],
    ],
    'sine',
  ],
  'wii-u': [
    'bloom',
    [
      [0, 67, 0.3],
      [0.12, 72, 0.3],
      [0.24, 76, 0.35],
      [0.36, 79, 0.9],
    ],
    'triangle',
  ],
  'classic-wii': [
    'bloom',
    [
      [0, 72, 0.9],
      [0, 76, 0.9],
      [0.35, 74, 1.3],
      [0.35, 79, 1.3],
    ],
    'sine',
  ],
  plaza: [
    'bloom',
    [
      [0, 72, 0.15],
      [0.1, 74, 0.15],
      [0.2, 77, 0.2],
      [0.3, 81, 0.7],
      [0.3, 77, 0.7],
    ],
    'triangle',
  ],
  switch: [
    'snap',
    [
      [0, 86, 0.06],
      [0.09, 91, 0.09],
    ],
    'square',
  ],
  switch2: [
    'snap',
    [
      [0, 84, 0.08],
      [0.08, 88, 0.08],
      [0.16, 91, 0.3],
    ],
    'sine',
  ],
  ds: [
    'snap',
    [
      [0, 79, 0.12],
      [0.12, 84, 0.12],
      [0.24, 88, 0.5],
    ],
    'sine',
  ],
  dsi: [
    'snap',
    [
      [0, 76, 0.2],
      [0.15, 79, 0.2],
      [0.3, 84, 0.6],
    ],
    'sine',
  ],
  '3ds': [
    'snap',
    [
      [0, 72, 0.1],
      [0.08, 79, 0.1],
      [0.16, 84, 0.1],
      [0.24, 88, 0.55],
    ],
    'triangle',
  ],
  n64: [
    'spin',
    [
      [0, 48, 1.2],
      [0.25, 67, 1],
      [0.25, 72, 1],
      [0.25, 76, 1.1],
    ],
    'triangle',
  ],
  gamecube: [
    'spin',
    [
      [0, 60, 0.9],
      [0.18, 67, 0.9],
      [0.36, 74, 1.2],
      [0.36, 79, 1.2],
    ],
    'sine',
  ],
  gameboy: [
    'drop',
    [
      [0.9, 79, 0.08],
      [1.0, 86, 0.5],
    ],
    'square',
  ],
  virtualboy: [
    'drop',
    [
      [0.9, 50, 0.6],
      [0.9, 57, 0.6],
      [1.2, 62, 0.9],
    ],
    'square',
  ],
  snes: [
    'drop',
    [
      [0.9, 72, 0.18],
      [1.04, 76, 0.18],
      [1.18, 79, 0.18],
      [1.32, 84, 0.7],
      [1.55, 84, 0.5],
    ],
    'triangle',
  ],
  nes: [
    'drop',
    [
      [0.9, 72, 0.09],
      [0.99, 76, 0.09],
      [1.08, 79, 0.09],
      [1.17, 84, 0.4],
    ],
    'square',
  ],
  // the handhelds: a piezo beep, a Game Boy "ding", and the GBA's soft rising chime
  gameandwatch: [
    'drop',
    [
      [0.9, 91, 0.07],
      [1.0, 91, 0.07],
      [1.1, 96, 0.3],
    ],
    'square',
  ],
  gbpocket: [
    'drop',
    [
      [0.9, 79, 0.08],
      [1.0, 91, 0.55],
    ],
    'square',
  ],
  gbcolor: [
    'drop',
    [
      [0.9, 79, 0.08],
      [1.0, 86, 0.1],
      [1.1, 91, 0.5],
    ],
    'square',
  ],
  gba: [
    'bloom',
    [
      [0, 62, 0.5],
      [0.25, 69, 0.5],
      [0.5, 74, 0.5],
      [0.75, 81, 1.1],
      [0.75, 78, 1.1],
    ],
    'triangle',
  ],
  gbasp: [
    'snap',
    [
      [0, 76, 0.15],
      [0.12, 83, 0.15],
      [0.24, 88, 0.7],
    ],
    'sine',
  ],
  gbmicro: [
    'snap',
    [
      [0, 84, 0.06],
      [0.07, 89, 0.06],
      [0.14, 92, 0.4],
    ],
    'sine',
  ],
};
function jingle(notes, wave) {
  if (!uiSounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + 0.05,
      out = actx.createGain();
    out.gain.value = wave === 'square' ? 0.035 : 0.08;
    out.connect(actx.destination);
    for (const [at, m, len] of notes) {
      const o = actx.createOscillator(),
        e = actx.createGain();
      o.type = wave;
      o.frequency.value = 440 * 2 ** ((m - 69) / 12);
      e.gain.setValueAtTime(0, t0 + at);
      e.gain.linearRampToValueAtTime(1, t0 + at + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(e).connect(out);
      o.start(t0 + at);
      o.stop(t0 + at + len + 0.05);
    }
  } catch {}
}
function runBoot() {
  const el = $('#boot');
  // no intro when Steam starts a game through CosmoU
  if (!lsGet('boot', true) || (window.api && api.launchPlay)) return;
  const [motion, notes, wave] = BOOT[style] || BOOT['liquid-glass'],
    quick = reduceMotion();
  $('#btsub').textContent = themeName() + ' theme';
  el.className = 'on b-' + motion + (quick ? ' quick' : '');
  jingle(notes, wave);
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    el.classList.add('out');
    setTimeout(() => (el.className = ''), 450);
    removeEventListener('keydown', end, true);
    removeEventListener('pointerdown', end, true);
  };
  addEventListener('keydown', end, true);
  addEventListener('pointerdown', end, true);
  setTimeout(end, quick ? 700 : motion === 'drop' ? 2300 : 1900);
}
$('#bootc').onclick = () => {
  lsSet('boot', !lsGet('boot', true));
  extrasUi();
};
$('#hlo').onclick = () => {
  lsSet('hello', !lsGet('hello', true));
  extrasUi();
  if (typeof sxPlaza === 'function') sxPlaza();
};

// ---------- Settings switches ----------
function tgUi(id, on) {
  $(id).textContent = on ? 'On' : 'Off';
  $(id).classList.toggle('on', on);
}
function extrasUi() {
  tgUi('#svauto', !(typeof cfg === 'object' && cfg && cfg.autoSaveBackup === false));
  tgUi('#tvst', lsGet('tvStart', false));
  tgUi('#bootc', lsGet('boot', true));
  tgUi('#hlo', lsGet('hello', true));
}
const _openSettings = openSettings;
openSettings = function () {
  extrasUi();
  return _openSettings.apply(this, arguments);
};
extrasUi();

applyStyle();
runBoot();
if (lsGet('tvStart', false)) setTimeout(() => setTv(true), 600);
