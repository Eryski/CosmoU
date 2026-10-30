// CosmoU – Systems: CosmoU takes on the look of the console you play.
// Wii U (Cemu) is always there. Every other console (js/systems-data.js) comes with its own emulator and games folder
// (Settings → Cemu & Games → Other systems). Each has a profile: its views, its own home screen (js/console-home.js),
// its theme with its music, its sounds and – only on the Wii U – the Plaza. With more than one console a switcher in
// the header changes between them.
const SYS = {};
for (const [k, d] of Object.entries(SYSDATA.SYSTEMS))
  SYS[k] = { ...d, views: k === 'wiiu' ? ['covers', 'grid', 'wiiu'] : ['covers', 'grid', 'chome'], home: k === 'wiiu' ? 'wiiu' : 'chome' };
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
  const others = SYSDATA.ORDER.filter(k => k !== 'wiiu' && sy[k] && (sy[k].gamesDir || sy[k].emuPath || sy[k].pkg || sy[k].list));
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
  sw.classList.toggle('many', av.length > 3);
  if (av.length > 3) {
    // many consoles: one button with the console on screen, the others in a menu
    const b = document.createElement('button');
    b.className = 'on';
    b.textContent = SYS[curSys].short + ' ▾';
    b.onclick = e => sysMenu(e.currentTarget);
    sw.append(b);
  } else
    for (const k of av) {
      const b = document.createElement('button');
      b.textContent = SYS[k].short;
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
// all consoles in a small menu (the header button, the console button on the home screens, the Quick Menu)
function sysMenu(el) {
  const r = el ? el.getBoundingClientRect() : null;
  openMenu(
    r ? { x: r.left + r.width / 2, y: r.bottom + 6 } : null,
    sysAvail().map(k => ({ label: SYS[k].name, icon: 'play', on: k === curSys, fn: () => setSystem(k) })),
  );
}
// the next console (Select / Minus on a controller)
function sysNext(d = 1) {
  const av = sysAvail();
  if (av.length > 1) setSystem(av[(av.indexOf(curSys) + d + av.length) % av.length]);
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

// ---------- Settings: the other consoles ----------
// computer: an emulator program and a games folder per console · Android: an emulator app and a games folder ·
// iPhone and iPad: Switch through MeloNX, which keeps the games (like MeloCafe for the Wii U)
const sysList = () => (window.api && api.systemList) || [];
function sysFill() {
  const box = $('#sysrows');
  if (!box) return;
  $('#sysgrp').hidden = !sysList().length;
  if ($('#sysgrp').hidden) return;
  box.replaceChildren();
  const sy = (cfg && cfg.systems) || {};
  const after = async r => {
    if (r && r.error) toast(r.error, 7000);
    cfg = await api.getSettings();
    games = await api.scan();
    games.forEach(sample);
    applySystem();
    render();
  };
  const used = sysList().filter(k => sy[k] && (sy[k].emuPath || sy[k].gamesDir || sy[k].pkg));
  for (const k of used) {
    const c = sy[k],
      n = games.filter(g => sysOf(g) === k).length;
    const row = document.createElement('div');
    row.className = 'set';
    row.dataset.k = 'system systems console emulator ' + k + ' ' + SYS[k].name.toLowerCase();
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    const st = document.createElement('strong'),
      sm = document.createElement('small');
    st.textContent = SYS[k].name;
    const emu = c.emuName || c.appName || '';
    sm.textContent = [emu || 'No emulator yet', c.gamesDir || c.list ? n + (n === 1 ? ' game' : ' games') : 'No games folder yet'].join(' · ');
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
    if (IS_IOS) {
      btn('Get games', async () => after(await api.systemPickFolder(k)));
      if (api.systemJit) btn('Start with JIT', async () => after(await api.systemJit(k)));
    } else {
      btn(emu ? 'Emulator' : 'Choose emulator', async () => after(await api.systemPickEmu(k)));
      btn(c.gamesDir ? 'Games folder' : 'Choose folder', async () => after(await api.systemPickFolder(k)));
    }
    btn('Remove', async () => {
      if (curSys === k) setSystem('wiiu');
      after(await api.systemRemove(k));
    });
    row.append(lbl, acts);
    box.append(row);
  }
  // add another console: its games folder first, then its emulator
  const free = sysList().filter(k => !used.includes(k));
  if (free.length) {
    const row = document.createElement('div');
    row.className = 'set';
    row.dataset.k = 'add console system emulator switch wii gamecube 3ds ds n64 snes nes game boy gba virtual boy';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    const st = document.createElement('strong'),
      sm = document.createElement('small');
    st.textContent = used.length ? 'Add another console' : 'Add a console';
    sm.textContent = IS_IOS
      ? 'Switch games come from MeloNX, the Switch emulator for iPhone and iPad'
      : 'Choose its games folder and its emulator – CosmoU then shows them in that console’s look';
    lbl.append(st, sm);
    const acts = document.createElement('div');
    acts.className = 'acts';
    const sel = document.createElement('select');
    sel.className = 'btn';
    sel.id = 'sysadd';
    for (const k of free) sel.append(new Option(SYS[k].name, k));
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Add';
    b.onclick = async () => {
      const k = sel.value;
      let r = await api.systemPickFolder(k);
      if (r && r.error) return toast(r.error, 7000);
      if (!IS_IOS && ((r.systems || {})[k] || {}).gamesDir) r = await api.systemPickEmu(k);
      await after(r);
      if (sysAvail().includes(k)) setSystem(k);
    };
    acts.append(sel, b);
    row.append(lbl, acts);
    box.append(row);
  }
}
