// CosmoU – First-time setup (Cemu, games folder, menu music), settings backup and library rescan.

// --- First-time setup wizard ---
const wz = { step: 0, music: 'default', count: 0 };
const WZ_LAST = 4;
function openWizard() {
  wz.step = 0;
  wz.music = 'default';
  $('#wiz').hidden = false;
  requestAnimationFrame(() => $('#wiz').classList.add('on'));
  wzRender();
}
function closeWizard() {
  $('#wiz').classList.remove('on');
  setTimeout(() => ($('#wiz').hidden = true), 450);
}
async function wzRender() {
  const s = wz.step;
  document.querySelectorAll('#wiz .wz-page').forEach(p => {
    const n = +p.dataset.s;
    p.classList.toggle('on', n === s);
    p.classList.toggle('left', n < s);
  });
  document.querySelectorAll('#wzsteps i').forEach((d, i) => {
    d.classList.toggle('on', i + 1 === s);
    d.classList.toggle('done', i + 1 < s);
  });
  $('#wzsteps').style.visibility = s === 0 ? 'hidden' : 'visible';
  $('#wzback').style.visibility = s === 0 || s === WZ_LAST ? 'hidden' : 'visible';
  $('#wznext').hidden = s === 0 || s === WZ_LAST;
  $('#wzskip').hidden = s !== 0;
  if (s === 1) {
    const ok = !!(cfg.cemuPath && (window.api ? (await api.cemuStatus()).installed : true));
    $('#wzcemu').textContent = ok
      ? '✓ ' + (cfg.cemuManaged ? 'Cemu ' + (cfg.cemuVersion || '') + ' is ready' : 'Using ' + cfg.cemuPath)
      : 'Cemu isn’t set up yet';
    $('#wzcemu').classList.toggle('ok', ok);
    $('#wznext').textContent = ok ? 'Next' : 'Skip for now';
  }
  if (s === 2) {
    $('#wzdir').textContent = cfg.gamesDir || 'No folder selected yet';
    $('#wzcount').textContent = cfg.gamesDir ? wzCountText(wz.count) : '';
    $('#wzcount').classList.toggle('ok', wz.count > 0);
    $('#wznext').textContent = cfg.gamesDir ? 'Next' : 'Skip for now';
  }
  if (s === 3) {
    document.querySelectorAll('#wzmusic button').forEach(b => b.classList.toggle('on', b.dataset.m === wz.music));
    $('#wznext').textContent = 'Next';
  }
  if (s === WZ_LAST) {
    $('#wzready').textContent = cfg.gamesDir ? wzCountText(wz.count) : 'You can add your games folder later in Settings.';
  }
}
const wzCountText = n => (n === 1 ? '1 game found' : n + ' games found');
function wzGo(d) {
  wz.step = Math.max(0, Math.min(WZ_LAST, wz.step + d));
  blip(d > 0 ? 'page' : 'back');
  wzRender();
}
$('#wzstart').onclick = () => wzGo(1);
$('#wznext').onclick = () => wzGo(1);
$('#wzback').onclick = () => wzGo(-1);
$('#wzskip').onclick = async () => {
  if (window.api) cfg = await api.setSetupDone(true);
  closeWizard();
  syncMusic();
};
$('#wzdl').onclick = async () => {
  if (!need()) return;
  await installCemu();
  cfg = await api.getSettings();
  fill();
  wzRender();
};
$('#wzpick').onclick = async () => {
  if (!need()) return;
  cfg = await api.pickCemu();
  fill();
  wzRender();
};
$('#wzfolder').onclick = async () => {
  if (!need()) return;
  cfg = await api.pickFolder();
  fill();
  $('#wzcount').textContent = 'Looking for games…';
  games = await api.scan();
  wz.count = games.filter(g => g.kind !== 'app').length;
  games.forEach(sample);
  wzRender();
};
document.querySelectorAll('#wzmusic button').forEach(
  b =>
    (b.onclick = async () => {
      const m = b.dataset.m;
      if (m === 'file') {
        if (!need()) return;
        const r = await api.pickMusic();
        if (!r) return;
        wz.music = 'file';
        setMusic(r);
        musicOn = true;
      } else if (m === 'default') {
        wz.music = 'default';
        if (window.api) await api.resetMusic();
        await reloadMusic();
        musicOn = true;
      } else {
        wz.music = 'off';
        musicOn = false;
      }
      try {
        localStorage.setItem('cosmou.music', String(musicOn));
      } catch {}
      musicUi();
      syncMusic();
      wzRender();
    }),
);
function setMusic(m) {
  if (bgMusic) bgMusic.pause();
  bgMusic = null;
  if (m && m.url) {
    bgMusic = new Audio(m.url);
    bgMusic.loop = true;
    bgMusic.volume = 0.35;
    musicName = m.name;
  }
}
async function reloadMusic() {
  setMusic(window.api ? await api.getMusic() : null);
}
$('#wzenter').onclick = async () => {
  if (window.api) cfg = await api.setSetupDone(true);
  blip('start');
  closeWizard();
  await load();
  syncMusic();
  try {
    localStorage.setItem('cosmou.lastCount', String(games.length));
  } catch {}
  if (cfg.gamesDir) toast('✓ ' + (wz.count === 1 ? '1 game added' : wz.count + ' games added'));
};
$('#rerunSetup').onclick = () => {
  $('#dlg').close();
  openWizard();
};

// --- Settings backup: export / import cosmou-settings.json ---
const UI_PREFS = ['style', 'viewMode', 'wuView', 'hoverCases', 'uiSounds', 'music', 'buddies'];
$('#expS').onclick = async () => {
  if (!need()) return;
  const ui = {};
  for (const k of UI_PREFS)
    try {
      const v = localStorage.getItem('cosmou.' + k);
      if (v !== null) ui[k] = v;
    } catch {}
  const r = await api.exportSettings(ui);
  if (r.ok) toast('✓ Settings exported');
  else if (!r.cancelled) toast(r.error || 'Export failed.', 6000);
};
$('#impS').onclick = async () => {
  if (!need()) return;
  const r = await api.importSettings();
  if (!r.ok) {
    if (!r.cancelled) toast(r.error, 6000);
    return;
  }
  for (const [k, v] of Object.entries(r.ui || {}))
    try {
      localStorage.setItem('cosmou.' + k, v);
    } catch {}
  toast('✓ Settings imported · restarting the view…');
  setTimeout(() => location.reload(), 1200);
};

// --- Rescan library ---
$('#rescan').onclick = async () => {
  if (!need()) return;
  const before = games.length;
  await load();
  try {
    localStorage.setItem('cosmou.lastCount', String(games.length));
  } catch {}
  const diff = games.length - before;
  toast('✓ Library scanned · ' + (diff > 0 ? diff + (diff === 1 ? ' game' : ' games') + ' added' : games.length + ' games'));
};
// tell the user when new games showed up since last time
function noteNewGames() {
  if (!window.api || !cfg.setupDone) return;
  let prev = -1;
  try {
    prev = +(localStorage.getItem('cosmou.lastCount') ?? -1);
    localStorage.setItem('cosmou.lastCount', String(games.length));
  } catch {}
  const d = games.length - prev;
  if (prev >= 0 && d > 0) toast('✓ ' + (d === 1 ? '1 game added' : d + ' games added'));
}
