// CosmoU – Systems: CosmoU takes on the look of the console you play.
// Wii U (Cemu) is always there. Other systems (for now: Switch) come with their own emulator and games folder
// (Settings → Cemu & Games → Other systems). Each system has a profile: its views, its home screen, its theme and
// whether it has the Plaza. With more than one system a switcher in the header changes between them.
const SYS = {
  wiiu: { name: 'Wii U', views: ['covers', 'grid', 'wiiu'], home: 'wiiu', homeLabel: 'Wii U Look', theme: 'wii-u', plaza: true },
  switch: { name: 'Switch', views: ['covers', 'grid', 'switch'], home: 'switch', homeLabel: 'Switch Home', theme: 'switch', plaza: false },
};
let curSys = 'wiiu';
try {
  const s = localStorage.getItem('cosmou.system');
  if (SYS[s]) curSys = s;
} catch {}
const sysOf = g => (g && g.sys) || 'wiiu';
// a Wii U game in Cemu: graphic packs, saves, updates and Steam are only for these
const cemuGame = g => !!g && g.kind !== 'app' && sysOf(g) === 'wiiu';
const lsSys = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem('cosmou.' + k + '.' + curSys);
    localStorage.setItem('cosmou.' + k + '.' + curSys, v);
  } catch {}
  return null;
};
// the systems someone has: another system once its emulator or games folder is set; Wii U when Cemu or a games
// folder is set, when it has games, or when there is nothing else
function sysAvail() {
  const sy = (cfg && cfg.systems) || {};
  const others = Object.keys(SYS).filter(k => k !== 'wiiu' && sy[k] && (sy[k].gamesDir || sy[k].emuPath));
  const wiiu =
    !others.length || !!(cfg.cemuPath || cfg.gamesDir) || games.some(g => sysOf(g) === 'wiiu' && g.kind !== 'app' && g.format !== 'Demo');
  return [...(wiiu ? ['wiiu'] : []), ...others];
}
// the look of the current system: switcher, view buttons, title, theme and view
function applySystem(first) {
  const av = sysAvail();
  if (!av.includes(curSys)) curSys = av[0] || 'wiiu';
  const p = SYS[curSys];
  document.body.dataset.sys = curSys;
  const sw = $('#sys');
  sw.replaceChildren();
  sw.hidden = av.length < 2;
  for (const k of av) {
    const b = document.createElement('button');
    b.textContent = SYS[k].name;
    b.dataset.s = k;
    b.className = k === curSys ? 'on' : '';
    b.onclick = () => setSystem(k);
    sw.append(b);
  }
  $('.brand small').textContent = p.name + ' Library';
  SHOW_LABEL.wiiu = p.name + ' games';
  // the third view button is the system's own home screen
  const vb = [...document.querySelectorAll('#vt button')];
  vb[2].dataset.m = p.home;
  vb[2].textContent = p.homeLabel;
  vb[2].title = p.homeLabel + ' (3)';
  // the view: the one last used with this system; a new system starts on its own home screen
  // (Wii U keeps the view CosmoU always remembered)
  const saved = lsSys('viewMode');
  if ((first || !p.views.includes(mode)) && p.views.includes(saved)) mode = saved;
  else if (!p.views.includes(mode) || (first && curSys !== 'wiiu')) mode = p.home;
  // someone who only has Switch games starts in the Switch theme (until they choose another one)
  if (first && curSys !== 'wiiu') {
    let had = null;
    try {
      had = localStorage.getItem('cosmou.style');
    } catch {}
    if (!had && typeof setTheme === 'function') setTheme(p.theme);
  }
  if (typeof syncMode === 'function') syncMode();
  if (typeof sysFill === 'function') sysFill();
}
function setSystem(k) {
  if (!SYS[k] || k === curSys) return;
  blip('page');
  // each system keeps its own theme and view
  lsSys('style', style);
  lsSys('viewMode', mode);
  withVT(() => {
    curSys = k;
    try {
      localStorage.setItem('cosmou.system', k);
    } catch {}
    const v = lsSys('viewMode');
    mode = SYS[k].views.includes(v) ? v : SYS[k].home;
    try {
      localStorage.setItem('cosmou.viewMode', mode);
    } catch {}
    sel = '';
    applySystem();
    // its theme (and the theme's music) without a second page animation
    const t = lsSys('style') || SYS[k].theme;
    if (t !== style && THEMES.some(x => x.id === t)) {
      style = t;
      try {
        localStorage.setItem('cosmou.style', t);
      } catch {}
      applyStyle();
      swapThemeMusic(t);
    }
    render();
  });
}

// ---------- Settings: the other systems ----------
function sysFill() {
  const box = $('#sysrows');
  if (!box) return;
  // only the computer version can start other emulators (for now)
  $('#sysgrp').hidden = !(window.api && api.systemPickEmu);
  if ($('#sysgrp').hidden) return;
  box.replaceChildren();
  const sy = (cfg && cfg.systems) || {};
  for (const k of Object.keys(SYS)) {
    if (k === 'wiiu') continue;
    const c = sy[k] || {},
      n = games.filter(g => sysOf(g) === k).length;
    const row = document.createElement('div');
    row.className = 'set';
    row.dataset.k = 'system systems console ' + k + ' ' + SYS[k].name.toLowerCase() + ' emulator ryujinx eden citron yuzu';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    const st = document.createElement('strong'),
      sm = document.createElement('small');
    st.textContent = SYS[k].name;
    sm.textContent =
      c.emuPath || c.gamesDir
        ? [c.emuName || (c.emuPath ? 'Emulator chosen' : 'No emulator yet'), c.gamesDir ? n + (n === 1 ? ' game' : ' games') : 'No games folder yet'].join(
            ' · ',
          )
        : 'Choose your ' + SYS[k].name + ' emulator and games folder – CosmoU then shows them in a ' + SYS[k].name + ' look';
    lbl.append(st, sm);
    const acts = document.createElement('div');
    acts.className = 'acts';
    const btn = (t, fn) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = t;
      b.onclick = fn;
      acts.append(b);
    };
    const after = async r => {
      if (r && r.error) toast(r.error, 6000);
      cfg = await api.getSettings();
      games = await api.scan();
      games.forEach(sample);
      applySystem();
      render();
    };
    btn(c.emuPath ? 'Emulator' : 'Choose emulator', async () => need() && after(await api.systemPickEmu(k)));
    btn(c.gamesDir ? 'Games folder' : 'Choose folder', async () => need() && after(await api.systemPickFolder(k)));
    if (c.emuPath || c.gamesDir)
      btn('Remove', async () => {
        if (!need()) return;
        if (curSys === k) setSystem('wiiu');
        after(await api.systemRemove(k));
      });
    row.append(lbl, acts);
    box.append(row);
  }
}
