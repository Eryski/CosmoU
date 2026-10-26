// CosmoU – Quick quality, Graphics settings window (graphics, audio, overlay, input) and the About box.
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
let tab = 'graphics',
  cs = { found: false, current: {}, overrides: {}, defaultQuality: '' };
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
      d: 'Vulkan is usually the faster choice on modern graphics cards.',
      type: 'seg',
      opts: [
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
function ctl(it) {
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
  const set = async v => {
    if (window.api) cs = await api.setCemuSetting(it.k, v);
    else cs.overrides = { ...cs.overrides, [it.k]: v };
    renderPane(tab);
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
  if (!i.configured)
    g.append(
      row('Not set up yet', 'Cemu has no settings for this controller. Assign it once in Cemu, then it appears here.', []),
    );
  g.append(row('Emulated controller', 'What the game sees', sel(i.types, IN_TYPE_LABEL, i.type, 'type')));
  g.append(row('Controller API', 'How your device is read', sel(i.apis, IN_API_LABEL, i.api, 'api')));
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
  bw.append(
    btn('Configure buttons in Cemu', 'main big', async () => {
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
      'The button mapping (A, B, sticks, D-pad …) is still done in Cemu. Close Cemu before changing things here, otherwise it overwrites them when it quits. If you change the API, map the buttons again in Cemu, because mappings belong to one API.',
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
    line('CosmoU', 'Version 0.8.5');
    line(
      'Cemu',
      cfg.cemuPath
        ? (cfg.cemuManaged ? 'Managed by CosmoU' : 'Chosen manually') + (cfg.cemuVersion ? ' · ' + cfg.cemuVersion : '')
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
    grp.append(ctl(it));
  }
  if (t === 'graphics') {
    gqTiles();
    $('#gnote').textContent = cs.found
      ? 'These values are written into Cemu’s settings when you press Play.'
      : 'Cemu’s settings file wasn’t found yet. Start Cemu once, then CosmoU can apply these options.';
    $('#gnote').hidden = false;
  }
}
async function openSettings() {
  fill();
  if (window.api) cfg = await api.getSettings();
  renderPane('about');
  $('#dlg').showModal();
}
async function openGraphics() {
  if (window.api) cs = await api.cemuSettingsGet();
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
  showTab(tab);
  $('#gdlg').showModal();
  tind();
}
function tind() {
  const b = document.querySelector('#tabs button.on'),
    i = $('#tind');
  if (b) {
    i.style.left = b.offsetLeft + 'px';
    i.style.width = b.offsetWidth + 'px';
  }
}
function showTab(t) {
  tab = t;
  if (t === 'input') inInfo = null;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === t));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.dataset.p === t));
  $('#rst').hidden = !SCHEMA[t];
  renderPane(t);
  tind();
}
