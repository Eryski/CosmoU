// CosmoU – Quick quality and the Settings window: categories on the left, search, Cemu's graphics, audio, overlay and input.
const QUALITY = {
  Native: [1280, 720],
  Performance: [960, 540],
  Balanced: [1600, 900],
  Quality: [1920, 1080],
  Ultra: [2560, 1440],
};
function qTiles(g) {
  const key = g.tid || g.name,
    cur = (cfg.gameSettings || {})[key],
    box = $('#qg');
  box.replaceChildren();
  for (const [n, [w, h]] of Object.entries(QUALITY)) {
    const b = document.createElement('button');
    b.className = 'q' + (cur === n ? ' on' : '');
    const t = document.createElement('b');
    t.textContent = n;
    const s = document.createElement('small');
    s.textContent = `${w}×${h}`;
    b.append(t, s);
    b.onclick = async () => {
      const v = cur === n ? '' : n;
      if (window.api) cfg = await api.setGameSetting(key, v);
      else cfg.gameSettings = { ...(cfg.gameSettings || {}), [key]: v };
      qTiles(g);
    };
    box.append(b);
  }
}
function startToast(g, r) {
  const q = r.preset && QUALITY[r.preset];
  const M = {
    applied: `${g.name} is starting · ${r.preset} (${q && q.join('×')}) applied`,
    nearest: `${g.name} is starting · closest available resolution applied`,
    'no-entry':
      'Starting without a resolution change. Enable the resolution graphic pack for this game in Cemu once (Options → Graphic packs).',
    'no-pack':
      'Starting without a resolution change. No resolution graphic pack found. Download the community graphic packs in Cemu (Options → Graphic packs).',
    'no-settings': 'Starting without a resolution change. Cemu’s settings file was not found. Start Cemu once first.',
    error: 'Starting without a resolution change. Something went wrong.',
  };
  const ok = !r.note || r.note === 'applied' || r.note === 'nearest' || r.note === 'app';
  toast(r.note && M[r.note] ? M[r.note] : g.name + ' is starting…', ok ? 3500 : 8000);
}
let cs = { found: false, current: {}, overrides: {}, defaultQuality: '' };
const POS = [
  ['Disabled', 0],
  ['Top left', 1],
  ['Top center', 2],
  ['Top right', 3],
  ['Bottom left', 4],
  ['Bottom center', 5],
  ['Bottom right', 6],
];
const NOTPOS = POS.slice(1),
  FILT = [
    ['Bilinear', 0],
    ['Bicubic', 1],
    ['Hermite', 2],
    ['Nearest', 3],
  ];
const B = (g, k, label, d) => ({ g, k, label, d, type: 'bool' });
const SCHEMA = {
  graphics: [
    {
      g: 'Rendering',
      k: 'api',
      label: 'Graphics API',
      d: IS_MAC
        ? 'Cemu on a Mac draws with Vulkan (through Metal), OpenGL isn’t available there.'
        : 'Vulkan is usually the faster choice on modern graphics cards.',
      type: 'seg',
      // Cemu for macOS has no OpenGL renderer
      opts: IS_MAC
        ? [['Vulkan', 1]]
        : [
            ['Vulkan', 1],
            ['OpenGL', 0],
          ],
    },
    {
      g: 'Rendering',
      k: 'vsync',
      label: 'VSync',
      d: 'Prevents screen tearing but can add input delay.',
      type: 'seg',
      opts: [
        ['Off', 0],
        ['On', 1],
      ],
    },
    B('Rendering', 'asyncCompile', 'Async shader compile', 'Compiles shaders in the background to reduce stutter.'),
    { g: 'Scaling', k: 'upscale', label: 'Upscale filter', d: 'Used when the picture is enlarged.', type: 'seg', opts: FILT },
    { g: 'Scaling', k: 'downscale', label: 'Downscale filter', d: 'Used when the picture is shrunk.', type: 'seg', opts: FILT },
    {
      g: 'Scaling',
      k: 'scaling',
      label: 'Fullscreen scaling',
      d: 'Keep the aspect ratio or stretch to fill the screen.',
      type: 'seg',
      opts: [
        ['Keep aspect ratio', 0],
        ['Stretch', 1],
      ],
    },
  ],
  audio: [
    {
      g: 'Cemu audio',
      k: 'tvVolume',
      label: 'Game volume',
      d: 'Volume of the game sound (TV).',
      type: 'range',
      min: 0,
      max: 100,
      step: 5,
      unit: '%',
    },
  ],
  overlay: [
    {
      g: 'Performance overlay',
      k: 'ovPos',
      label: 'Position',
      d: 'Where the overlay appears while you play.',
      type: 'sel',
      opts: POS,
    },
    { g: 'Performance overlay', k: 'ovScale', label: 'Size', type: 'range', min: 50, max: 300, step: 10, unit: '%' },
    B('Performance overlay', 'ovFps', 'FPS'),
    B('Performance overlay', 'ovDraw', 'Draw calls per frame'),
    B('Performance overlay', 'ovCpu', 'CPU usage'),
    B('Performance overlay', 'ovCpuCore', 'CPU per core usage'),
    B('Performance overlay', 'ovRam', 'RAM usage'),
    B('Performance overlay', 'ovVram', 'VRAM usage'),
    B('Performance overlay', 'ovDebug', 'Debug'),
    { g: 'Notifications', k: 'ntPos', label: 'Position', type: 'sel', opts: NOTPOS },
    { g: 'Notifications', k: 'ntScale', label: 'Size', type: 'range', min: 50, max: 300, step: 10, unit: '%' },
    B('Notifications', 'ntCtrl', 'Controller profiles'),
    B('Notifications', 'ntBat', 'Low battery'),
    B('Notifications', 'ntShader', 'Shader compiler'),
    B('Notifications', 'ntFriend', 'Friend list'),
  ],
};
function ctl(it, t) {
  const val = () => (it.k in (cs.overrides || {}) ? cs.overrides[it.k] : cs.current[it.k]);
  const row = document.createElement('div');
  row.className = 'set';
  const lab = document.createElement('div');
  lab.className = 'lbl';
  const st = document.createElement('strong');
  st.textContent = it.label;
  lab.append(st);
  if (it.d) {
    const sm = document.createElement('small');
    sm.textContent = it.d;
    lab.append(sm);
  }
  row.append(lab);
  row.dataset.k = (it.g + ' ' + (it.k || '')).toLowerCase();
  const set = async v => {
    if (window.api) cs = await api.setCemuSetting(it.k, v);
    else cs.overrides = { ...cs.overrides, [it.k]: v };
    renderPane(t);
    sxRefilter();
  };
  let c;
  if (it.type === 'seg') {
    c = document.createElement('div');
    c.className = 'seg';
    for (const [n, v] of it.opts) {
      const b = document.createElement('button');
      b.textContent = n;
      if (val() === v) b.className = 'on';
      b.onclick = () => set(v);
      c.append(b);
    }
  } else if (it.type === 'bool') {
    c = document.createElement('button');
    c.className = 'tg' + (val() ? ' on' : '');
    c.textContent = val() ? 'On' : 'Off';
    c.setAttribute('role', 'switch');
    c.setAttribute('aria-checked', String(!!val()));
    c.setAttribute('aria-label', it.label);
    c.onclick = () => set(!val());
  } else if (it.type === 'sel') {
    c = document.createElement('select');
    c.className = 'sel';
    for (const [n, v] of it.opts) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = n;
      c.append(o);
    }
    c.value = String(val() ?? it.opts[0][1]);
    c.setAttribute('aria-label', it.label);
    c.onchange = () => set(+c.value);
  } else {
    c = document.createElement('div');
    c.className = 'rng';
    const r = document.createElement('input');
    r.type = 'range';
    r.min = it.min;
    r.max = it.max;
    r.step = it.step;
    r.value = val() ?? it.max;
    r.setAttribute('aria-label', it.label);
    const o = document.createElement('output');
    o.textContent = r.value + it.unit;
    r.oninput = () => {
      o.textContent = r.value + it.unit;
    };
    r.onchange = () => set(+r.value);
    c.append(r, o);
  }
  row.append(c);
  return row;
}
function gqTiles() {
  const box = $('#gq');
  box.replaceChildren();
  for (const [n, [w, h]] of Object.entries(QUALITY)) {
    const b = document.createElement('button');
    b.className = 'q' + (cs.defaultQuality === n ? ' on' : '');
    const t = document.createElement('b');
    t.textContent = n;
    const sm = document.createElement('small');
    sm.textContent = `${w}×${h}`;
    b.append(t, sm);
    b.onclick = async () => {
      const v = cs.defaultQuality === n ? '' : n;
      if (window.api) cs = await api.setDefaultQuality(v);
      else cs.defaultQuality = v;
      gqTiles();
    };
    box.append(b);
  }
}
let inSlot = 0,
  inInfo = null;
const IN_TYPE_LABEL = {
  'Wii U GamePad': 'Wii U GamePad',
  'Wii U Pro Controller': 'Wii U Pro Controller',
  'Wii U Classic Controller': 'Classic Controller',
  Wiimote: 'Wii Remote + Nunchuk',
};
const IN_API_LABEL = {
  Keyboard: 'Keyboard',
  XInput: 'XInput (Xbox controller)',
  SDLController: 'SDL (DualSense, Switch Pro, …)',
  DirectInput: 'DirectInput',
  DSUController: 'DSU (motion server)',
};
async function inCall(fn) {
  if (window.api) {
    inInfo = await fn();
    if (inInfo.error) toast(inInfo.error, 6000);
  } else {
    inInfo = inInfo || {};
  }
}
async function renderInput(box) {
  if (!inInfo || inInfo.slot !== inSlot) {
    if (window.api) inInfo = await api.inputGet(inSlot);
    else
      inInfo = {
        found: true,
        slot: inSlot,
        configured: inSlot < 2,
        type: 'Wii U GamePad',
        api: inSlot ? 'XInput' : 'Keyboard',
        name: '',
        profiles: ['Keyboard', 'Xbox Controller'],
        types: Object.keys(IN_TYPE_LABEL),
        apis: Object.keys(IN_API_LABEL),
      };
  }
  const i = inInfo;
  box.replaceChildren();
  const hint = t => {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = t;
    return p;
  };
  const row = (label, sub, el) => {
    const r = document.createElement('div');
    r.className = 'set';
    const l = document.createElement('div');
    l.className = 'lbl';
    const b = document.createElement('strong');
    b.textContent = label;
    l.append(b);
    if (sub) {
      const m = document.createElement('small');
      m.textContent = sub;
      l.append(m);
    }
    const a = document.createElement('div');
    a.className = 'acts';
    a.append(...[].concat(el));
    r.append(l, a);
    return r;
  };
  const btn = (t, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (cls || '');
    b.textContent = t;
    b.onclick = fn;
    return b;
  };
  const sel = (list, labels, val, key) => {
    const c = document.createElement('select');
    c.className = 'sel';
    const all = val && !list.includes(val) ? [...list, val] : list;
    for (const v of all) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = labels[v] || v;
      c.append(o);
    }
    c.value = val || list[0];
    c.disabled = !i.configured;
    c.onchange = async () => {
      if (window.api) await inCall(() => api.inputSet(inSlot, key, c.value));
      else i[key] = c.value;
      renderInput(box);
    };
    return c;
  };
  if (!i.found) {
    box.append(hint('Cemu’s data folder wasn’t found yet. Install Cemu in Settings and start it once, then come back here.'));
    return;
  }
  const h = document.createElement('h3');
  h.className = 'sh';
  h.textContent = 'Controller';
  box.append(h);
  const tabs = document.createElement('div');
  tabs.className = 'qg';
  tabs.style.gridTemplateColumns = 'repeat(4,1fr)';
  tabs.style.marginBottom = '16px';
  for (let n = 0; n < 8; n++) {
    const b = document.createElement('button');
    b.className = 'q' + (n === inSlot ? ' on' : '');
    b.textContent = 'Controller ' + (n + 1);
    b.onclick = () => {
      inSlot = n;
      inInfo = null;
      renderInput(box);
    };
    tabs.append(b);
  }
  box.append(tabs);
  const g = document.createElement('div');
  g.className = 'grp';
  if (!i.configured) g.append(row('Not set up yet', 'Press “Map buttons” below to set this controller up right here.', []));
  g.append(row('Emulated controller', 'What the game sees', sel(i.types, IN_TYPE_LABEL, i.type, 'type')));
  g.append(row('Controller API', 'How your device is read', sel(i.apis, IN_API_LABEL, i.api, 'api')));
  g.append(
    row(
      'Buttons',
      'A, B, sticks, D-pad … set right here, no need to open Cemu',
      btn('Map buttons', 'main', () => openMapper(inSlot)),
    ),
  );
  box.append(g);
  const h2 = document.createElement('h3');
  h2.className = 'sh';
  h2.textContent = 'Profiles';
  box.append(h2);
  const g2 = document.createElement('div');
  g2.className = 'grp';
  const ps = document.createElement('select');
  ps.className = 'sel';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = i.profiles.length ? 'Choose a profile…' : 'No profiles yet';
  ps.append(none);
  for (const n of i.profiles) {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    ps.append(o);
  }
  const act = a => async () => {
    const name = a === 'save' ? prompt0.value || ps.value : ps.value;
    if (!name) {
      toast(a === 'save' ? 'Type a profile name first.' : 'Choose a profile first.');
      return;
    }
    if (window.api) await inCall(() => api.inputProfile(inSlot, a, name));
    else {
      if (a === 'save' && !i.profiles.includes(name)) i.profiles.push(name);
      if (a === 'delete') i.profiles = i.profiles.filter(x => x !== name);
    }
    toast(a === 'save' ? 'Profile saved.' : a === 'load' ? 'Profile loaded.' : 'Profile deleted.');
    renderInput(box);
  };
  const prompt0 = document.createElement('input');
  prompt0.type = 'text';
  prompt0.placeholder = 'Profile name';
  prompt0.maxLength = 40;
  prompt0.className = 'sel';
  prompt0.style.width = '150px';
  g2.append(
    row('Saved profiles', 'Copies Cemu’s controller file', [
      ps,
      btn('Load', '', act('load')),
      btn('Delete', 'ghost', act('delete')),
    ]),
  );
  g2.append(
    row('Save current setup as…', 'e.g. Keyboard, Xbox Controller, DualSense', [prompt0, btn('Save', 'main', act('save'))]),
  );
  box.append(g2);
  const bw = document.createElement('div');
  bw.style.cssText = 'margin:18px 0 6px;display:flex;justify-content:center';
  bw.style.gap = '10px';
  bw.style.flexWrap = 'wrap';
  bw.append(
    btn('Open Cemu’s input settings', 'big', async () => {
      if (!window.api) {
        toast('This only works in the desktop app.');
        return;
      }
      const r = await api.inputOpenCemu();
      toast(r.ok ? 'Cemu opened. Go to Options → Input settings, assign the buttons, then close Cemu.' : r.error, 7000);
    }),
  );
  box.append(bw);
  box.append(
    hint(
      'Map buttons sets A, B, sticks, D-pad and more for an Xbox controller, an SDL controller or the keyboard, without opening Cemu. Close Cemu before changing things here, otherwise it overwrites them when it quits. Motion controls and DSU servers are still set up in Cemu.',
    ),
  );
}
function renderPane(t) {
  const box = $('#c_' + t);
  if (!box) return;
  box.replaceChildren();
  if (t === 'about') {
    const la = cfg.lastApply;
    const line = (a, b) => {
      const r = document.createElement('div');
      r.className = 'set';
      const x = document.createElement('span');
      x.textContent = a;
      const y = document.createElement('b');
      y.textContent = b;
      r.append(x, y);
      box.append(r);
    };
    line(
      'Cemu',
      cfg.cemuPath
        ? (cfg.cemuManaged ? 'Managed by CosmoU' : cfg.cemuFound ? 'Found on this computer' : 'Chosen manually') + (cfg.cemuVersion ? ' · ' + cfg.cemuVersion : '')
        : 'Not installed',
    );
    line(
      'Last launch',
      la
        ? `${la.applied.length} settings applied` + (la.missing.length ? `, ${la.missing.length} not found in Cemu’s file` : '')
        : 'No game started yet',
    );
    return;
  }
  if (t === 'input') {
    renderInput(box);
    return;
  }
  const items = SCHEMA[t];
  if (!items) return;
  let grp = null,
    last = null;
  for (const it of items) {
    if (it.g !== last) {
      last = it.g;
      const h = document.createElement('h3');
      h.className = 'sh';
      h.textContent = it.g;
      box.append(h);
      grp = document.createElement('div');
      grp.className = 'grp';
      box.append(grp);
    }
    grp.append(ctl(it, t));
  }
  if (t === 'graphics') {
    gqTiles();
    $('#gnote').textContent = cs.found
      ? 'These values are written into Cemu’s settings when you press Play.'
      : 'Cemu’s settings file wasn’t found yet. Start Cemu once, then CosmoU can apply these options.';
    $('#gnote').hidden = false;
  }
}

// ================= The Settings window =================
const APP_VERSION = (window.api && api.appVersion) || '0.11.2';
const SX_ICON = {
  general:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="16" cy="16" r="3.2" fill="#fff"/></svg>',
  look: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M16 4C9.4 4 4 9 4 15.4 4 21 8.6 25 13.6 25c1.6 0 2.2-1 2.2-2 0-1.4-1.2-1.8-1.2-3.2 0-1.3 1-2.2 2.4-2.2h3.2C25 17.6 28 15 28 11.6 28 7.2 22.6 4 16 4z"/><g fill="#e57ac0"><circle cx="10" cy="14" r="2"/><circle cx="14" cy="9.2" r="2"/><circle cx="20.2" cy="9.4" r="2"/></g></svg>',
  graphics:
    '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="16" rx="3" fill="none" stroke="#fff" stroke-width="3"/><path d="M11 27h10M16 22v5" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path fill="#fff" d="m16 9.5 1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/></svg>',
  sound:
    '<svg viewBox="0 0 32 32"><path fill="#fff" d="M5 12.5h5l7-6v19l-7-6H5z"/><path d="M21 11.5a6.5 6.5 0 0 1 0 9M24.5 8a11 11 0 0 1 0 16" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>',
  overlay:
    '<svg viewBox="0 0 32 32"><path d="M5 23a11 11 0 0 1 22 0" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="m16 23 5.5-7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="23" r="2.4" fill="#fff"/></svg>',
  controls:
    '<svg viewBox="0 0 32 32"><rect x="3" y="9" width="26" height="15" rx="5" fill="#fff"/><rect x="11" y="11.5" width="10" height="7.5" rx="1.2" fill="#16b3d9"/><circle cx="7" cy="16.5" r="1.8" fill="#16b3d9"/><circle cx="25" cy="16.5" r="1.8" fill="#16b3d9"/></svg>',
  plaza:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="7.5" fill="#fff"/><path d="M6 28c1-6 5-9 10-9s9 3 10 9z" fill="#fff"/><circle cx="13.3" cy="12" r="1.3" fill="#3aa86b"/><circle cx="18.7" cy="12" r="1.3" fill="#3aa86b"/></svg>',
  data: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M6 6.5A2.5 2.5 0 0 1 8.5 4h12.6l4.9 4.9v16.6a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 6 25.5z"/><rect x="10" y="6.5" width="9" height="6" rx="1" fill="#e0a91e"/><rect x="10" y="17" width="12" height="7.5" rx="1.2" fill="#e0a91e"/></svg>',
  about:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#fff" stroke-width="3"/><circle cx="16" cy="10.4" r="2" fill="#fff"/><path d="M16 15v8" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
};
// [id, name, description, color, Cemu pane that lives inside it]
const SX = [
  ['general', 'Cemu & Games', 'Cemu, your games folder, covers and your library', '#1e8fe0', ''],
  ['look', 'Appearance', 'Theme, light or dark and how the views look', '#e57ac0', ''],
  ['graphics', 'Graphics', 'How Cemu draws your games', '#8a6cf0', 'graphics'],
  ['sound', 'Sound & Music', 'Menu music, UI sounds and the game volume', '#f29a3c', 'audio'],
  ['overlay', 'Overlay', 'FPS, usage and notifications while you play', '#5ab55e', 'overlay'],
  ['controls', 'Controllers & TV', 'Map buttons, controller profiles and TV mode', '#16b3d9', 'input'],
  ['plaza', 'Buddies & Plaza', 'Your buddies, their posts and the greeting at start', '#3aa86b', ''],
  ['data', 'Saves & Data', 'Save backups, play time and your settings file', '#e0a91e', ''],
  ['about', 'About', 'Version, updates, feedback and the community', '#8b959e', 'about'],
];
const sxOf = id => SX.find(c => c[0] === id) || SX[0];
let sxCat = 'general';
try {
  const c = localStorage.getItem('cosmou.setCat');
  if (SX.some(x => x[0] === c)) sxCat = c;
} catch {}
(function sxBuild() {
  const nav = $('#sxnav');
  for (const [id, name, , col] of SX) {
    const b = document.createElement('button'),
      ic = document.createElement('span'),
      t = document.createElement('span'),
      n = document.createElement('i');
    b.type = 'button';
    b.dataset.c = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'sxbd');
    ic.className = 'ci';
    ic.style.setProperty('--c', col);
    ic.innerHTML = SX_ICON[id];
    t.textContent = name;
    n.className = 'n';
    b.append(ic, t, n);
    b.onclick = () => {
      if ($('#sq').value) sxClear();
      sxShow(id);
    };
    nav.append(b);
  }
  // arrow keys walk through the categories
  nav.addEventListener('keydown', e => {
    const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    sxStep(d, true);
  });
  $('#sxver').textContent = 'CosmoU ' + APP_VERSION;
})();
// fill a category's live content (Cemu values, controllers, status) when it is shown
function sxRender(id) {
  const c = sxOf(id);
  if (c[4]) {
    if (c[4] === 'input') inInfo = null;
    renderPane(c[4]);
  }
  if (id === 'general') sxStatus();
  if (id === 'about') sxAbout();
  if (id === 'sound') sxSound();
  if (id === 'plaza') sxPlaza();
}
function sxShow(id, focusNav) {
  const c = sxOf(id);
  sxCat = c[0];
  try {
    localStorage.setItem('cosmou.setCat', sxCat);
  } catch {}
  document.querySelectorAll('#sxnav button').forEach(b => {
    const on = b.dataset.c === sxCat;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('#sxbd .pane').forEach(p => p.classList.toggle('on', p.dataset.c === sxCat));
  $('#sxt').textContent = c[1];
  $('#sxd').textContent = c[2];
  // reset only where a whole page of Cemu values lives
  $('#rst').hidden = !(c[0] === 'graphics' || c[0] === 'overlay');
  sxRender(sxCat);
  $('#sxbd').scrollTop = 0;
  if (focusNav) document.querySelector('#sxnav button.on').focus();
}
function sxStep(d, focusNav) {
  const i = SX.findIndex(c => c[0] === sxCat);
  sxShow(SX[(i + d + SX.length) % SX.length][0], focusNav);
  blip('move');
}
// the small status cards on top of Cemu & Games
function sxStatus() {
  const box = $('#sxstat'),
    n = games.filter(g => g.kind !== 'app').length,
    apps = games.filter(g => g.kind === 'app').length,
    pt = (typeof playLog === 'object' && playLog && playLog.playtime) || {},
    sec = Object.values(pt).reduce((a, p) => a + (p.sec || 0), 0);
  const card = (ok, title, sub) => {
    const d = document.createElement('div'),
      i = document.createElement('i'),
      b = document.createElement('b'),
      s = document.createElement('small');
    d.className = 'st ' + (ok ? 'ok' : 'warn');
    i.textContent = ok ? '✓' : '!';
    b.textContent = title;
    s.textContent = sub;
    d.append(i, b, s);
    return d;
  };
  box.replaceChildren(
    card(
      !!cfg.cemuPath,
      cfg.cemuPath ? 'Cemu is ready' : 'Cemu is missing',
      cfg.cemuPath ? cfg.cemuVersion || 'Installed' : 'Download it below',
    ),
    card(
      n > 0,
      n ? `${n} ${n === 1 ? 'game' : 'games'}` : 'No games yet',
      cfg.gamesDir ? (apps ? `+ ${apps} other apps` : 'In your games folder') : 'Choose a games folder',
    ),
    card(true, sec ? fmtDur(sec) : 'No play time yet', 'Played with CosmoU'),
  );
}
// the status cards on top of Buddies & Plaza
function sxPlaza() {
  const box = $('#sxpstat'),
    nb = (typeof buddies !== 'undefined' && buddies.length) || 0,
    np = (typeof posts !== 'undefined' && posts.length) || 0,
    hi = $('#hlo').classList.contains('on');
  const card = (ok, title, sub) => {
    const d = document.createElement('div'),
      i = document.createElement('i'),
      b = document.createElement('b'),
      s = document.createElement('small');
    d.className = 'st ' + (ok ? 'ok' : 'warn');
    i.textContent = ok ? '✓' : '+';
    b.textContent = title;
    s.textContent = sub;
    d.append(i, b, s);
    return d;
  };
  box.replaceChildren(
    card(
      nb > 0,
      nb ? `${nb} ${nb === 1 ? 'buddy' : 'buddies'}` : 'No buddies yet',
      nb ? 'Walking around the Plaza' : 'Open the Buddy maker',
    ),
    card(
      np > 0,
      np ? `${np} ${np === 1 ? 'post' : 'posts'}` : 'No posts yet',
      np ? 'Shown as speech bubbles' : 'Write one below',
    ),
    card(hi, hi ? 'Greeting on' : 'Greeting off', hi ? 'Your buddy says hello at start' : 'Turn it on below'),
  );
}
function sxAbout() {
  const box = $('#sxabout');
  if (box.childElementCount) return;
  const img = document.createElement('img'),
    tx = document.createElement('div'),
    h = document.createElement('b'),
    v = document.createElement('small'),
    d = document.createElement('span');
  img.src = 'build/icon.png';
  img.alt = '';
  h.textContent = 'CosmoU';
  v.textContent = 'Version ' + APP_VERSION;
  d.textContent = 'The Wii U-style launcher for Cemu · free and open source';
  tx.append(h, v, d);
  box.append(img, tx);
}
// ---------- search across every category ----------
let sxRendered = false;
function sxRefilter() {
  if ($('#sq').value) sxSearch($('#sq').value);
}
function sxClear() {
  $('#sq').value = '';
  sxSearch('');
}
function sxSearch(q) {
  const bd = $('#sxbd'),
    words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  bd.classList.toggle('sx-search', words.length > 0);
  $('#sxnav').classList.toggle('searching', words.length > 0);
  if (!words.length) {
    bd.querySelectorAll('[data-hit]').forEach(e => e.removeAttribute('data-hit'));
    document.querySelectorAll('#sxnav .n').forEach(n => (n.textContent = ''));
    $('#sxnone').hidden = true;
    $('#sxt').textContent = sxOf(sxCat)[1];
    $('#sxd').textContent = sxOf(sxCat)[2];
    $('#rst').hidden = !(sxCat === 'graphics' || sxCat === 'overlay');
    return;
  }
  // the Cemu panes are filled on demand: fill them all once for searching
  if (!sxRendered) {
    sxRendered = true;
    for (const [id] of SX) if (id !== sxCat) sxRender(id);
  }
  let total = 0;
  for (const pane of bd.querySelectorAll('.pane')) {
    let n = 0;
    for (const row of pane.querySelectorAll('.set')) {
      const text = (row.textContent + ' ' + (row.dataset.k || '')).toLowerCase(),
        hit = words.every(w => text.includes(w));
      row.dataset.hit = hit ? '1' : '0';
      if (hit) n++;
    }
    for (const g of pane.querySelectorAll('.grp')) g.dataset.hit = g.querySelector('.set[data-hit="1"]') ? '1' : '0';
    pane.dataset.hit = n ? '1' : '0';
    const nb = document.querySelector(`#sxnav button[data-c="${pane.dataset.c}"] .n`);
    if (nb) nb.textContent = n || '';
    total += n;
  }
  $('#sxt').textContent = total ? `${total} ${total === 1 ? 'setting' : 'settings'} found` : 'Nothing found';
  $('#sxd').textContent = `Results for “${q.trim()}”`;
  $('#rst').hidden = true;
  $('#sxnone').hidden = total > 0;
  $('#sxnone').textContent = `No setting matches “${q.trim()}”. Try a shorter word like “music”, “theme” or “controller”.`;
}
$('#sq').addEventListener('input', () => sxSearch($('#sq').value));
$('#sq').addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#sq').value) {
    e.preventDefault();
    e.stopPropagation();
    sxClear();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    sxFocusContent();
  }
});
// a click on a category title in the results jumps to that category
$('#sxbd').addEventListener('click', e => {
  const ph = e.target.closest('.sx-ph');
  if (!ph) return;
  const id = ph.parentNode.dataset.c;
  sxClear();
  sxShow(id);
});
$('#dlg').addEventListener('cancel', e => {
  if ($('#sq').value) {
    e.preventDefault();
    sxClear();
  }
});
addEventListener('keydown', e => {
  if (!$('#dlg').open) {
    // Ctrl + , opens the settings from anywhere
    if (e.key === ',' && (e.ctrlKey || e.metaKey) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      openSettings();
    }
    return;
  }
  if (
    (e.key === 'f' && (e.ctrlKey || e.metaKey)) ||
    (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))
  ) {
    e.preventDefault();
    $('#sq').focus();
    $('#sq').select();
  }
});
function sxFocusNav() {
  const b = document.querySelector('#sxnav button.on');
  if (b) b.focus();
}
function sxFocusContent() {
  const pane = $('#sxbd'),
    f = [...pane.querySelectorAll('button, input, select')].find(e => !e.disabled && e.offsetParent !== null);
  if (f) {
    f.focus();
    f.scrollIntoView({ block: 'nearest' });
  }
}
// ---------- Sound & Music rows ----------
function sxSound() {
  const v = Math.round(musicVol() * 100);
  $('#mvol').value = v;
  $('#mvolo').textContent = v + '%';
  $('#mreset').disabled = !!musicBuiltin;
  musicUi();
}
$('#mvol').oninput = () => {
  const v = +$('#mvol').value;
  $('#mvolo').textContent = v + '%';
  try {
    localStorage.setItem('cosmou.musicVol', String(v));
  } catch {}
  if (bgMusic) bgMusic.volume = v / 100;
};
$('#mpick').onclick = async () => {
  if (!need()) return;
  const r = await api.pickMusic();
  if (!r) return;
  musicBuiltin = false;
  setMusic(r);
  musicOn = true;
  try {
    localStorage.setItem('cosmou.music', 'true');
  } catch {}
  syncMusic();
  sxSound();
  toast('✓ Music: ' + r.name);
};
$('#mreset').onclick = async () => {
  if (!need()) return;
  await api.resetMusic();
  await reloadMusic();
  syncMusic();
  sxSound();
  toast('✓ Back to the CosmoU music for your theme');
};
// on/off buttons are switches: keep aria-checked in step with their look
const sxSw = new MutationObserver(list => {
  for (const m of list) m.target.setAttribute('aria-checked', String(m.target.classList.contains('on')));
});
document.querySelectorAll('#dlg .tg').forEach(t => {
  t.setAttribute('role', 'switch');
  t.setAttribute('aria-label', t.closest('.set').querySelector('strong').textContent);
  t.setAttribute('aria-checked', String(t.classList.contains('on')));
  sxSw.observe(t, { attributes: true, attributeFilter: ['class'] });
});

async function openSettings(cat) {
  fill();
  if (window.api) [cfg, cs] = await Promise.all([api.getSettings(), api.cemuSettingsGet()]);
  else if (!cs.found)
    cs = {
      found: true,
      overrides: {},
      defaultQuality: 'Ultra',
      current: {
        api: 1,
        vsync: 0,
        asyncCompile: true,
        upscale: 1,
        downscale: 0,
        scaling: 0,
        tvVolume: 60,
        ovPos: 1,
        ovScale: 100,
        ovFps: true,
        ntPos: 1,
        ntScale: 100,
        ntCtrl: true,
        ntShader: true,
        ntFriend: true,
      },
    };
  fill();
  sxRendered = false;
  sxClear();
  sxShow(typeof cat === 'string' ? cat : sxCat);
  if (!$('#dlg').open) $('#dlg').showModal();
  sxFocusNav();
}
// older entry point: the Graphics settings are a category of the Settings now
function openGraphics(cat = 'graphics') {
  return openSettings(cat);
}
