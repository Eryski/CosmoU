// CosmoU – Button mapping, Updates & DLC and Add to Steam.

// ================= Button mapping (writes Cemu's controller file, no need to open Cemu) =================
// [mapping id in Cemu, role, label, group] – ids from Cemu's VPAD/Pro/Classic/Wiimote controller classes
const MP_TYPES = {
  'Wii U GamePad': [
    [1, 'a', 'A', 'Buttons'],
    [2, 'b', 'B', 'Buttons'],
    [3, 'x', 'X', 'Buttons'],
    [4, 'y', 'Y', 'Buttons'],
    [5, 'l', 'L', 'Buttons'],
    [6, 'r', 'R', 'Buttons'],
    [7, 'zl', 'ZL', 'Buttons'],
    [8, 'zr', 'ZR', 'Buttons'],
    [9, 'plus', '+ (Start)', 'Buttons'],
    [10, 'minus', '− (Select)', 'Buttons'],
    [27, 'home', 'Home', 'Buttons'],
    [11, 'up', 'Up', 'D-pad'],
    [12, 'down', 'Down', 'D-pad'],
    [13, 'left', 'Left', 'D-pad'],
    [14, 'right', 'Right', 'D-pad'],
    [17, 'lsu', 'Up', 'Left stick'],
    [18, 'lsd', 'Down', 'Left stick'],
    [19, 'lsl', 'Left', 'Left stick'],
    [20, 'lsr', 'Right', 'Left stick'],
    [15, 'ls', 'Press', 'Left stick'],
    [21, 'rsu', 'Up', 'Right stick'],
    [22, 'rsd', 'Down', 'Right stick'],
    [23, 'rsl', 'Left', 'Right stick'],
    [24, 'rsr', 'Right', 'Right stick'],
    [16, 'rs', 'Press', 'Right stick'],
    [25, 'mic', 'Blow into the mic', 'GamePad'],
    [26, 'screen', 'Show the GamePad screen', 'GamePad'],
  ],
  'Wii U Pro Controller': [
    [1, 'a', 'A', 'Buttons'],
    [2, 'b', 'B', 'Buttons'],
    [3, 'x', 'X', 'Buttons'],
    [4, 'y', 'Y', 'Buttons'],
    [5, 'l', 'L', 'Buttons'],
    [6, 'r', 'R', 'Buttons'],
    [7, 'zl', 'ZL', 'Buttons'],
    [8, 'zr', 'ZR', 'Buttons'],
    [9, 'plus', '+ (Start)', 'Buttons'],
    [10, 'minus', '− (Select)', 'Buttons'],
    [11, 'home', 'Home', 'Buttons'],
    [12, 'up', 'Up', 'D-pad'],
    [13, 'down', 'Down', 'D-pad'],
    [14, 'left', 'Left', 'D-pad'],
    [15, 'right', 'Right', 'D-pad'],
    [18, 'lsu', 'Up', 'Left stick'],
    [19, 'lsd', 'Down', 'Left stick'],
    [20, 'lsl', 'Left', 'Left stick'],
    [21, 'lsr', 'Right', 'Left stick'],
    [16, 'ls', 'Press', 'Left stick'],
    [22, 'rsu', 'Up', 'Right stick'],
    [23, 'rsd', 'Down', 'Right stick'],
    [24, 'rsl', 'Left', 'Right stick'],
    [25, 'rsr', 'Right', 'Right stick'],
    [17, 'rs', 'Press', 'Right stick'],
  ],
  'Wii U Classic Controller': [
    [1, 'a', 'A', 'Buttons'],
    [2, 'b', 'B', 'Buttons'],
    [3, 'x', 'X', 'Buttons'],
    [4, 'y', 'Y', 'Buttons'],
    [5, 'l', 'L', 'Buttons'],
    [6, 'r', 'R', 'Buttons'],
    [7, 'zl', 'ZL', 'Buttons'],
    [8, 'zr', 'ZR', 'Buttons'],
    [9, 'plus', '+ (Start)', 'Buttons'],
    [10, 'minus', '− (Select)', 'Buttons'],
    [11, 'home', 'Home', 'Buttons'],
    [12, 'up', 'Up', 'D-pad'],
    [13, 'down', 'Down', 'D-pad'],
    [14, 'left', 'Left', 'D-pad'],
    [15, 'right', 'Right', 'D-pad'],
    [16, 'lsu', 'Up', 'Left stick'],
    [17, 'lsd', 'Down', 'Left stick'],
    [18, 'lsl', 'Left', 'Left stick'],
    [19, 'lsr', 'Right', 'Left stick'],
    [20, 'rsu', 'Up', 'Right stick'],
    [21, 'rsd', 'Down', 'Right stick'],
    [22, 'rsl', 'Left', 'Right stick'],
    [23, 'rsr', 'Right', 'Right stick'],
  ],
  Wiimote: [
    [1, 'wa', 'A', 'Wii Remote'],
    [2, 'wb', 'B', 'Wii Remote'],
    [3, 'w1', '1', 'Wii Remote'],
    [4, 'w2', '2', 'Wii Remote'],
    [7, 'plus', '+', 'Wii Remote'],
    [8, 'minus', '−', 'Wii Remote'],
    [17, 'home', 'Home', 'Wii Remote'],
    [9, 'up', 'Up', 'D-pad'],
    [10, 'down', 'Down', 'D-pad'],
    [11, 'left', 'Left', 'D-pad'],
    [12, 'right', 'Right', 'D-pad'],
    [5, 'nz', 'Z', 'Nunchuk'],
    [6, 'nc', 'C', 'Nunchuk'],
    [13, 'lsu', 'Stick up', 'Nunchuk'],
    [14, 'lsd', 'Stick down', 'Nunchuk'],
    [15, 'lsl', 'Stick left', 'Nunchuk'],
    [16, 'lsr', 'Stick right', 'Nunchuk'],
  ],
};
// Cemu's button codes: 0–31 buttons, 38–49 stick and trigger directions (see Controller.h)
const MP_DEF = {
  XInput: {
    a: 13,
    b: 12,
    x: 15,
    y: 14,
    l: 8,
    r: 9,
    zl: 42,
    zr: 43,
    plus: 4,
    minus: 5,
    up: 0,
    down: 1,
    left: 2,
    right: 3,
    ls: 6,
    rs: 7,
    lsu: 39,
    lsd: 45,
    lsl: 44,
    lsr: 38,
    rsu: 41,
    rsd: 47,
    rsl: 46,
    rsr: 40,
    wa: 12,
    wb: 43,
    w1: 14,
    w2: 15,
    nz: 42,
    nc: 8,
  },
  SDLController: {
    a: 1,
    b: 0,
    x: 3,
    y: 2,
    l: 9,
    r: 10,
    zl: 42,
    zr: 43,
    plus: 6,
    minus: 4,
    home: 5,
    up: 11,
    down: 12,
    left: 13,
    right: 14,
    ls: 7,
    rs: 8,
    lsu: 45,
    lsd: 39,
    lsl: 44,
    lsr: 38,
    rsu: 47,
    rsd: 41,
    rsl: 46,
    rsr: 40,
    wa: 0,
    wb: 43,
    w1: 2,
    w2: 3,
    nz: 42,
    nc: 9,
  },
  Keyboard: {
    a: 75,
    b: 74,
    x: 73,
    y: 85,
    l: 81,
    r: 69,
    zl: 49,
    zr: 51,
    plus: 13,
    minus: 8,
    home: 72,
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    ls: 67,
    rs: 78,
    lsu: 87,
    lsd: 83,
    lsl: 65,
    lsr: 68,
    rsu: 104,
    rsd: 98,
    rsl: 100,
    rsr: 102,
    mic: 77,
    screen: 9,
    wa: 75,
    wb: 74,
    w1: 49,
    w2: 50,
    nz: 90,
    nc: 88,
  },
};
const MP_NAME = {
  XInput: {
    0: 'D-pad ↑',
    1: 'D-pad ↓',
    2: 'D-pad ←',
    3: 'D-pad →',
    4: 'Start',
    5: 'Back',
    6: 'L-stick press',
    7: 'R-stick press',
    8: 'LB',
    9: 'RB',
    10: 'Guide',
    12: 'A',
    13: 'B',
    14: 'X',
    15: 'Y',
    38: 'L-stick →',
    44: 'L-stick ←',
    39: 'L-stick ↑',
    45: 'L-stick ↓',
    40: 'R-stick →',
    46: 'R-stick ←',
    41: 'R-stick ↑',
    47: 'R-stick ↓',
    42: 'LT',
    43: 'RT',
  },
  SDLController: {
    0: 'A / ✕',
    1: 'B / ○',
    2: 'X / □',
    3: 'Y / △',
    4: 'Back / Share',
    5: 'Guide / PS',
    6: 'Start / Options',
    7: 'L-stick press',
    8: 'R-stick press',
    9: 'LB / L1',
    10: 'RB / R1',
    11: 'D-pad ↑',
    12: 'D-pad ↓',
    13: 'D-pad ←',
    14: 'D-pad →',
    15: 'Capture / Mic',
    16: 'Paddle 1',
    17: 'Paddle 2',
    18: 'Paddle 3',
    19: 'Paddle 4',
    20: 'Touchpad',
    38: 'L-stick →',
    44: 'L-stick ←',
    39: 'L-stick ↓',
    45: 'L-stick ↑',
    40: 'R-stick →',
    46: 'R-stick ←',
    41: 'R-stick ↓',
    47: 'R-stick ↑',
    42: 'LT / L2',
    43: 'RT / R2',
  },
};
// browser "standard gamepad" button index → Cemu code, and stick axes 0–3 as [positive, negative]
const MP_STD = {
  XInput: [12, 13, 14, 15, 8, 9, 42, 43, 5, 4, 6, 7, 0, 1, 2, 3, null],
  SDLController: [0, 1, 2, 3, 9, 10, 42, 43, 4, 6, 7, 8, 11, 12, 13, 14, 5],
};
const MP_AX = {
  XInput: [
    [38, 44],
    [45, 39],
    [40, 46],
    [47, 41],
  ],
  SDLController: [
    [38, 44],
    [39, 45],
    [40, 46],
    [41, 47],
  ],
};
const VK = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  16: 'Shift',
  17: 'Ctrl',
  18: 'Alt',
  19: 'Pause',
  20: 'Caps Lock',
  27: 'Esc',
  32: 'Space',
  33: 'Page Up',
  34: 'Page Down',
  35: 'End',
  36: 'Home',
  37: '←',
  38: '↑',
  39: '→',
  40: '↓',
  45: 'Insert',
  46: 'Delete',
  106: 'Num *',
  107: 'Num +',
  109: 'Num −',
  110: 'Num .',
  111: 'Num /',
  160: 'Left Shift',
  161: 'Right Shift',
  162: 'Left Ctrl',
  163: 'Right Ctrl',
  164: 'Left Alt',
  165: 'Right Alt',
  186: 'Ü / ;',
  187: '+ / =',
  188: ',',
  189: '-',
  190: '.',
  191: '# / /',
  192: 'Ö / `',
  219: 'ß / [',
  220: '^ / \\',
  221: '´ / ]',
  222: "Ä / '",
  226: '<',
};
function vkName(c) {
  if ((c >= 65 && c <= 90) || (c >= 48 && c <= 57)) return String.fromCharCode(c);
  if (c >= 96 && c <= 105) return 'Num ' + (c - 96);
  if (c >= 112 && c <= 135) return 'F' + (c - 111);
  return VK[c] || 'Key ' + c;
}
const mpCodeName = (api, c) => (api === 'Keyboard' ? vkName(c) : (MP_NAME[api] || {})[c] || 'Button ' + c);
const MP_SIDE = { ShiftLeft: 160, ShiftRight: 161, ControlLeft: 162, ControlRight: 163, AltLeft: 164, AltRight: 165 };
const vkOf = e => MP_SIDE[e.code] || e.keyCode;

const mp = { slot: 0, info: null, dev: 'xi:0', type: 'Wii U GamePad', maps: {}, wait: null, queue: null };
const mpApi = (dev = mp.dev) => (dev === 'kb' ? 'Keyboard' : dev.startsWith('sdl:') ? 'SDLController' : 'XInput');
const mpUuid = (dev = mp.dev) => (dev === 'kb' ? 'keyboard' : dev.startsWith('sdl:') ? dev.slice(4) : dev.slice(3));
const devKey = d =>
  d.api === 'XInput' ? 'xi:' + d.uuid : d.api === 'Keyboard' ? 'kb' : d.api === 'SDLController' ? 'sdl:' + d.uuid : '';
function mpDefaults(type = mp.type, api = mpApi()) {
  const out = {},
    d = MP_DEF[api] || {};
  for (const [id, role] of MP_TYPES[type] || []) if (d[role] !== undefined) out[id] = d[role];
  return out;
}
// what Cemu has for this device and type, or the defaults when there is nothing yet
function mpLoadMaps() {
  const i = mp.info,
    d = i && i.devices.find(x => devKey(x) === mp.dev);
  mp.maps = d && i.type === mp.type && Object.keys(d.maps).length ? { ...d.maps } : mpDefaults();
}
const pads = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
function mpHint() {
  const i = mp.info,
    other = i && i.devices.find(d => !devKey(d)),
    sdlKnown = i && i.devices.some(d => d.api === 'SDLController'),
    nonX = pads().find(p => !/xinput/i.test(p.id));
  let t = '';
  if (other)
    t = `In Cemu this controller uses ${other.api}. CosmoU maps Xbox (XInput), SDL controllers and the keyboard – saving here replaces it.`;
  else if (nonX && !sdlKnown && mpApi() === 'XInput')
    t = `${nonX.id.replace(/\s*\(.*$/, '')} isn’t an Xbox controller. Choose it once in Cemu (Input settings → API SDLController), then map it here – or use it as XInput through Steam Input or DS4Windows.`;
  else if (mpApi() !== 'Keyboard' && !pads().length) t = 'No controller found yet. Plug it in and press any button on it.';
  $('#mphint').textContent = t;
  $('#mphint').hidden = !t;
}
function mpRender() {
  const list = $('#mplist'),
    api = mpApi();
  list.replaceChildren();
  let grp = '';
  for (const [id, , label, g] of MP_TYPES[mp.type]) {
    if (g !== grp) {
      grp = g;
      const h = document.createElement('div');
      h.className = 'mpgrp';
      h.textContent = g;
      list.append(h);
    }
    const row = document.createElement('div'),
      l = document.createElement('span'),
      k = document.createElement('button'),
      x = document.createElement('button'),
      code = mp.maps[id],
      waiting = mp.wait && mp.wait.id === id;
    row.className = 'mpi';
    row.dataset.id = id;
    l.textContent = label;
    k.type = 'button';
    k.className = 'mpk' + (waiting ? ' wait' : code === undefined ? ' none' : '');
    k.textContent = waiting
      ? api === 'Keyboard'
        ? 'Press a key…'
        : 'Press a button…'
      : code === undefined
        ? 'Not set'
        : mpCodeName(api, code);
    k.title = 'Click, then press the button you want';
    k.onclick = () => (waiting ? mpStop() : mpWait(id));
    x.type = 'button';
    x.className = 'mpx';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Clear ' + g + ' ' + label);
    x.onclick = () => {
      delete mp.maps[id];
      mpRender();
    };
    row.append(l, k, x);
    list.append(row);
  }
  $('#mpall').textContent = mp.queue ? 'Stop' : 'Map all';
  mpHint();
}
function mpSnap() {
  const s = {};
  for (const p of pads()) s[p.index] = { b: p.buttons.map(b => b.pressed || b.value > 0.5), a: [...p.axes] };
  return s;
}
function mpWait(id) {
  mpStop(true);
  mp.wait = { id, t0: performance.now(), base: mpSnap() };
  mpRender();
  const row = $(`#mplist .mpi[data-id="${id}"]`);
  if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  requestAnimationFrame(mpTick);
}
function mpStop(keepQueue) {
  mp.wait = null;
  if (!keepQueue) mp.queue = null;
  if ($('#mapdlg').open) mpRender();
}
function mpSet(id, code) {
  // one button does one thing: take it away from where it was before
  for (const k of Object.keys(mp.maps)) if (mp.maps[k] === code && +k !== id) delete mp.maps[k];
  mp.maps[id] = code;
  mp.wait = null;
  blip('open');
  mpRender();
  const row = $(`#mplist .mpi[data-id="${id}"]`);
  if (row) {
    row.classList.add('hit');
    setTimeout(() => row.classList.remove('hit'), 500);
  }
  mpNext();
}
function mpNext() {
  if (!mp.queue) return;
  const id = mp.queue.shift();
  if (id === undefined) {
    mp.queue = null;
    mpRender();
    toast('✓ All buttons mapped. Press Save to keep them.', 4000, 'ok');
    return;
  }
  setTimeout(() => mp.queue && mpWait(id), 280);
}
function mpTick(now) {
  const w = mp.wait;
  if (!w || !$('#mapdlg').open) return;
  if (now - w.t0 > 8000) {
    // nothing pressed: skip this one
    mp.wait = null;
    mpRender();
    mpNext();
    return;
  }
  const api = mpApi();
  if (api !== 'Keyboard')
    for (const p of pads()) {
      const b0 = w.base[p.index] || { b: [], a: [] };
      for (let i = 0; i < p.buttons.length; i++) {
        const b = p.buttons[i];
        if ((b.pressed || b.value > 0.5) && !b0.b[i]) {
          const c = MP_STD[api][i];
          if (c !== null && c !== undefined) return mpSet(w.id, c);
        }
      }
      for (let a = 0; a < 4 && a < p.axes.length; a++) {
        const v = p.axes[a];
        if (Math.abs(v) > 0.65 && Math.abs(b0.a[a] || 0) < 0.4) return mpSet(w.id, MP_AX[api][a][v > 0 ? 0 : 1]);
      }
    }
  requestAnimationFrame(mpTick);
}
document.addEventListener(
  'keydown',
  e => {
    if (!mp.wait || !$('#mapdlg').open) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') return mpStop();
    if (mpApi() === 'Keyboard') return mpSet(mp.wait.id, vkOf(e));
    if (e.key === 'Delete' || e.key === 'Backspace') {
      delete mp.maps[mp.wait.id];
      mp.wait = null;
      mpRender();
      mpNext();
    }
  },
  true,
);
$('#mapdlg').addEventListener('cancel', e => {
  if (mp.wait) {
    e.preventDefault();
    mpStop();
  }
});
$('#mapdlg').addEventListener('close', () => {
  mp.wait = null;
  mp.queue = null;
});
async function openMapper(slot) {
  mp.slot = slot;
  mp.info = window.api
    ? await api.inputMapGet(slot)
    : {
        found: true,
        slot,
        configured: true,
        type: 'Wii U GamePad',
        devices: [{ api: 'XInput', uuid: '0', name: 'Controller 1', maps: {} }],
      };
  if (!mp.info.found) {
    toast('Cemu’s data folder wasn’t found yet. Install Cemu and start it once.', 6000);
    return;
  }
  const i = mp.info,
    dev = $('#mpdev'),
    ty = $('#mptype');
  const opts = [0, 1, 2, 3].map(n => new Option(`Xbox / XInput controller ${n + 1}`, 'xi:' + n));
  opts.push(new Option('Keyboard', 'kb'));
  for (const d of i.devices)
    if (d.api === 'SDLController') opts.push(new Option(`${d.name || 'SDL controller'} (SDL)`, 'sdl:' + d.uuid));
  dev.replaceChildren(...opts);
  const mine = i.devices.map(devKey).find(Boolean),
    xpad = pads().find(p => /xinput/i.test(p.id));
  mp.dev = mine || (xpad ? 'xi:' + Math.min(3, xpad.index) : 'xi:0');
  dev.value = mp.dev;
  ty.replaceChildren(...Object.keys(MP_TYPES).map(t => new Option(t, t)));
  mp.type = MP_TYPES[i.type] ? i.type : 'Wii U GamePad';
  ty.value = mp.type;
  mp.queue = null;
  mp.wait = null;
  mpLoadMaps();
  $('#mpsub').textContent =
    `Controller ${slot + 1} · Click a button below, then press it on your controller or keyboard. Close Cemu while you do this.`;
  mpRender();
  $('#mapdlg').showModal();
}
$('#mpdev').onchange = () => {
  mpStop();
  mp.dev = $('#mpdev').value;
  mpLoadMaps();
  mpRender();
};
$('#mptype').onchange = () => {
  mpStop();
  mp.type = $('#mptype').value;
  mpLoadMaps();
  mpRender();
};
$('#mpdef').onclick = () => {
  mpStop();
  mp.maps = mpDefaults();
  mpRender();
};
$('#mpclr').onclick = () => {
  mpStop();
  mp.maps = {};
  mpRender();
};
$('#mpall').onclick = () => {
  if (mp.queue) return mpStop();
  mp.queue = MP_TYPES[mp.type].map(r => r[0]);
  mpNext();
};
$('#mpx').onclick = () => $('#mapdlg').close();
$('#mpsave').onclick = async () => {
  mpStop();
  if (!window.api) {
    toast('This only works in the desktop app.');
    return;
  }
  const r = await api.inputMapSave(mp.slot, {
    type: mp.type,
    api: mpApi(),
    uuid: mpUuid(),
    maps: Object.entries(mp.maps).map(([k, v]) => [+k, v]),
  });
  if (!r.ok) {
    toast(r.error, 7000);
    return;
  }
  $('#mapdlg').close();
  toast(`✓ Controller ${mp.slot + 1} saved · ${Object.keys(mp.maps).length} buttons`, 4000, 'ok');
  inInfo = null;
  if ($('#dlg').open && sxCat === 'controls') renderPane('input');
};

// ================= Updates & DLC =================
let upInfo = null,
  upBusy = null,
  upFocus = null;
const lowsOf = () => [...new Set(games.filter(g => g.low).map(g => g.low))];
const verOf = f => (f.kind === 'dlc' ? 'DLC' : f.version !== null && f.version !== undefined ? 'Update v' + f.version : 'Update');
const DEMO_UP = {
  supported: true,
  roots: ['D:\\Wii U\\Games'],
  installed: {},
  found: [],
};
async function upLoad() {
  if (!window.api) {
    upInfo = DEMO_UP;
    for (const g of games)
      if (g.low && !upInfo.installed[g.low]) upInfo.installed[g.low] = { update: g.low.endsWith('0') ? 80 : null, dlc: false };
    return upInfo;
  }
  upInfo = await api.addonsInfo(lowsOf());
  return upInfo;
}
// what is ready to install for one game: the newest update and any DLC that isn't installed yet
function upReady(low) {
  const c = (upInfo ? upInfo.found : []).filter(f => f.low === low && (f.state === 'new' || f.state === 'newer'));
  const up = c.filter(f => f.kind === 'update').sort((a, b) => b.version - a.version)[0];
  return [up, ...c.filter(f => f.kind === 'dlc')].filter(Boolean);
}
function upLine(g) {
  if (!g.low) return { text: 'Updates for WUA, WUD and RPX games are handled by Cemu itself.', warn: false };
  const i = (upInfo && upInfo.installed[g.low]) || { update: null, dlc: false },
    nus = upInfo && upInfo.found.some(f => f.low === g.low && f.state === 'nus'),
    parts = [i.update !== null ? `Update v${i.update} installed` : 'No update installed'];
  if (i.dlc) parts.push('DLC installed');
  const ready = upReady(g.low);
  if (ready.length) parts.push(ready.map(verOf).join(' and ') + ' ready to install');
  else if (nus) parts.push('found in NUS format (install it in Cemu)');
  return { text: parts.join(' · '), warn: i.update === null };
}
async function upInstall(list, name) {
  if (upBusy || !list.length) return;
  for (const f of list) {
    upBusy = f;
    upProg({ percent: 0, done: 0, total: 0 });
    const r = await api.addonsInstall(f.dir);
    if (!r.ok) {
      toast(r.error, 8000);
      break;
    }
    toast(`✓ ${verOf(f)} installed${name ? ' for ' + shortName(name) : ''}`, 4500, 'ok');
  }
  upBusy = null;
  $('#upbar').hidden = true;
  await upLoad();
  if ($('#updlg').open) upRender();
  if ($('#det').open && cur()) upUi(cur(), true);
}
const gb = n => (n > 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : (n / 1048576).toFixed(0) + ' MB');
function upProg(d) {
  if (!upBusy) return;
  const t = `Installing ${verOf(upBusy)}… ${d.percent || 0}%` + (d.total ? ` · ${gb(d.done)} of ${gb(d.total)}` : '');
  const bar = $('#upbar');
  bar.hidden = false;
  bar.querySelector('i').style.width = (d.percent || 0) + '%';
  bar.querySelector('small').textContent = t;
  if ($('#det').open && cur() && cur().low === upBusy.low) $('#dups').textContent = t;
}
if (window.api && api.onAddonProgress) api.onAddonProgress(upProg);

// the block in the game details
async function upUi(g, fresh) {
  const box = $('#dup');
  box.hidden = !g || g.kind === 'app';
  if (box.hidden) return;
  if (!fresh || !upInfo) {
    $('#dups').textContent = 'Checking…';
    $('#dupi').hidden = true;
    await upLoad();
    if (cur() !== g) return;
  }
  if (!upInfo.supported) {
    $('#dups').textContent = 'Needs Cemu to be set up (start it once).';
    $('#dupi').hidden = true;
    return;
  }
  const l = upLine(g),
    ready = g.low ? upReady(g.low) : [];
  $('#dups').textContent = l.text;
  $('#dupi').hidden = !ready.length || !!upBusy;
  $('#dupi').textContent = 'Install ' + ready.map(verOf).join(' + ');
  $('#dupi').onclick = () => upInstall(ready, g.name);
}
function upRow(icon, title, sub, warn, acts) {
  const row = document.createElement('div'),
    ic = document.createElement('div'),
    tx = document.createElement('div'),
    h = document.createElement('b'),
    s = document.createElement('small'),
    a = document.createElement('div');
  row.className = 'uprow';
  tx.className = 'tx';
  ic.className = 'lic';
  if (icon) ic.style.backgroundImage = `url("${icon}")`;
  else ic.textContent = (title || '?').slice(0, 1).toUpperCase();
  h.textContent = title;
  s.textContent = sub;
  if (warn !== undefined) s.className = warn ? 'warn' : 'ok';
  tx.append(h, s);
  a.className = 'acts';
  a.append(...acts);
  row.append(ic, tx, a);
  return row;
}
const upBtn = (t, cls, fn) => {
  const b = document.createElement('button');
  b.className = 'btn ' + cls;
  b.textContent = t;
  b.disabled = !!upBusy;
  b.onclick = fn;
  return b;
};
function upSec(list, t) {
  const h = document.createElement('div');
  h.className = 'upsec';
  h.textContent = t;
  list.append(h);
}
function upRender() {
  const list = $('#uplist'),
    i = upInfo;
  list.replaceChildren();
  const sub = $('#upsub');
  sub.replaceChildren();
  if (!i.supported) {
    sub.textContent = 'Cemu isn’t set up yet. Install Cemu and start it once, then come back here.';
    return;
  }
  sub.append(
    'CosmoU installs the updates and DLC you already have into Cemu’s title folder. It looks in: ' +
      (i.roots.length ? i.roots.join(', ') : 'your games folder (choose one in Settings)'),
  );
  const own = games.filter(g => g.kind !== 'app' && g.low).sort((a, b) => a.name.localeCompare(b.name)),
    lows = new Set(own.map(g => g.low));
  if (own.length) upSec(list, 'Your games');
  for (const g of own) {
    const l = upLine(g),
      ready = upReady(g.low),
      ins = i.installed[g.low] || {},
      acts = [];
    if (ready.length) acts.push(upBtn('Install ' + ready.map(verOf).join(' + '), 'main', () => upInstall(ready, g.name)));
    if (ins.update !== null && ins.update !== undefined) acts.push(upBtn('Open', '', () => api.addonsOpen(g.low, 'update')));
    const row = upRow(g.icon || g.cover, g.name, l.text, l.warn, acts);
    if (upFocus && upFocus === g.low) row.classList.add('hit');
    list.append(row);
  }
  const extra = i.found.filter(f => !lows.has(f.low));
  if (extra.length) upSec(list, 'Found, but the game isn’t in your library');
  for (const f of extra)
    list.append(
      upRow(
        '',
        f.title || f.tid,
        `${verOf(f)} · ${f.tid}` +
          (f.state === 'installed' ? ' · already installed' : f.state === 'nus' ? ' · NUS format, install it in Cemu' : ''),
        undefined,
        f.state === 'new' || f.state === 'newer' ? [upBtn('Install', 'main', () => upInstall([f], f.title))] : [],
      ),
    );
  const loose = games.filter(g => g.kind !== 'app' && !g.low).length;
  if (loose) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.style.marginTop = '12px';
    p.textContent = `${loose} ${loose === 1 ? 'game is a WUA, WUD or RPX file' : 'games are WUA, WUD or RPX files'}: Cemu handles their updates itself (a WUA file can already contain them).`;
    list.append(p);
  }
  if (!own.length && !extra.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'No games in folder format found yet.';
    list.append(p);
  }
  const hl = list.querySelector('.uprow.hit');
  if (hl) requestAnimationFrame(() => hl.scrollIntoView({ block: 'center' }));
}
async function openUpdates(g) {
  upFocus = g && g.low;
  $('#upbar').hidden = !upBusy;
  await upLoad();
  upRender();
  $('#updlg').showModal();
}
$('#upx').onclick = () => $('#updlg').close();
$('#upadd').onclick = async () => {
  if (!need()) return;
  upInfo = await api.addonsAddFolder(lowsOf());
  upRender();
};
$('#upof').onclick = () => (window.api ? api.addonsOpen('', '') : toast('This only works in the desktop app.'));
$('#oupd').onclick = () => {
  $('#dlg').close();
  openUpdates();
};
$('#dupm').onclick = () => cur() && openUpdates(cur());

// ================= Add to Steam =================
let stInfo = null,
  stRestart = false;
const stHas = (key, g) => !!stInfo && stInfo.have.includes(g ? 'game:' + String(g.path || '').toLowerCase() : key);
function stRender(pre) {
  const list = $('#stlist'),
    rows = [
      { cosmou: true, name: 'CosmoU', sub: 'The launcher itself' },
      ...games.filter(g => g.kind !== 'app' && g.path).map(g => ({ g, name: g.name })),
    ];
  list.replaceChildren();
  for (const r of rows) {
    const inSteam = r.cosmou ? stHas('cosmou') : stHas('', r.g),
      row = document.createElement('label'),
      ck = document.createElement('input'),
      ic = document.createElement('div'),
      tx = document.createElement('div'),
      h = document.createElement('b'),
      s = document.createElement('small');
    row.className = 'uprow strow';
    tx.className = 'tx';
    ck.type = 'checkbox';
    ck.checked = pre === 'all' || (r.cosmou ? pre === 'cosmou' : pre === r.g);
    ck._row = r;
    ic.className = 'lic';
    const img = r.g && (r.g.cover || r.g.icon);
    if (img) ic.style.backgroundImage = `url("${img}")`;
    else ic.textContent = r.cosmou ? 'C' : r.name.slice(0, 1);
    h.textContent = r.name;
    s.textContent = r.cosmou ? r.sub : 'Starts the game through CosmoU, with your settings and save backups';
    tx.append(h, s);
    row.append(ck, ic, tx);
    if (inSteam) {
      const t = document.createElement('span');
      t.className = 'tagin';
      t.textContent = 'In Steam';
      row.append(t);
    }
    ck.onchange = stCount;
    list.append(row);
  }
  stCount();
}
function stCount() {
  const all = [...document.querySelectorAll('#stlist input')],
    n = all.filter(c => c.checked).length;
  $('#stallck').checked = n && n === all.length;
  $('#stgo').disabled = !n;
  $('#stgo').textContent = stRestart ? 'Restart Steam and add' : n > 1 ? `Add ${n} to Steam` : 'Add to Steam';
}
async function openSteam(pre) {
  if (!window.api) {
    stInfo = { found: true, users: [{ id: '1', name: 'Player' }], user: '1', running: false, have: ['cosmou'] };
  } else {
    stInfo = await api.steamInfo('');
    if (!stInfo.found) {
      toast('Steam wasn’t found on this PC.', 5000);
      return;
    }
    if (!stInfo.users.length) {
      toast('Sign in to Steam once, then try again.', 5000);
      return;
    }
  }
  stRestart = false;
  $('#stnote').hidden = true;
  const us = $('#stuser');
  us.replaceChildren(...stInfo.users.map(u => new Option(u.name, u.id)));
  us.value = stInfo.user;
  $('#stuserrow').hidden = stInfo.users.length < 2;
  $('#stsub').textContent =
    'Each game gets its own Steam entry that starts it through CosmoU – great for Big Picture and the Steam Deck.' +
    (stInfo.running ? ' Steam has to restart once to show them.' : '');
  stRender(pre || (stHas('cosmou') ? '' : 'cosmou'));
  $('#stdlg').showModal();
}
$('#stuser').onchange = async () => {
  const keep = [...document.querySelectorAll('#stlist input')].filter(c => c.checked).map(c => c._row);
  stInfo = await api.steamInfo($('#stuser').value);
  stRender();
  for (const c of document.querySelectorAll('#stlist input')) c.checked = keep.some(k => k.name === c._row.name);
  stCount();
};
$('#stallck').onchange = () => {
  for (const c of document.querySelectorAll('#stlist input')) c.checked = $('#stallck').checked;
  stCount();
};
$('#stx').onclick = () => $('#stdlg').close();
$('#stgo').onclick = async () => {
  if (!need()) return;
  const items = [...document.querySelectorAll('#stlist input')]
    .filter(c => c.checked)
    .map(c =>
      c._row.cosmou
        ? { kind: 'cosmou' }
        : {
            kind: 'game',
            name: c._row.g.name,
            path: c._row.g.path,
            cover: c._row.g.cover,
            hero: c._row.g.hero,
            icon: c._row.g.icon,
          },
    );
  const b = $('#stgo');
  b.disabled = true;
  b.textContent = stRestart ? 'Restarting Steam…' : 'Adding…';
  const r = await api.steamAdd({ user: $('#stuser').value, items, art: $('#startck').checked, restart: stRestart });
  b.disabled = false;
  if (r.needRestart) {
    stRestart = true;
    $('#stnote').textContent =
      'Steam is open. CosmoU closes Steam, adds the entries and starts Steam again – nothing else changes.';
    $('#stnote').hidden = false;
    stCount();
    return;
  }
  stCount();
  if (!r.ok) {
    toast(r.error, 7000);
    return;
  }
  $('#stdlg').close();
  toast(
    `✓ ${r.added.length === 1 ? r.added[0] + ' is' : r.added.length + ' entries are'} in Steam` +
      (r.restarted ? ' · Steam is starting again' : ' · They show up the next time you start Steam'),
    6000,
    'ok',
  );
};
$('#osteam').onclick = () => {
  $('#dlg').close();
  openSteam();
};
$('#dsteam').onclick = () => {
  const g = cur();
  if (!g) return;
  $('#det').close();
  openSteam(g);
};

// ---------- details: updates block and the Steam button follow the game ----------
const _saveUi = saveUi;
saveUi = function (g) {
  _saveUi(g);
  upUi(g);
  $('#dsteam').hidden = !g || g.kind === 'app';
};

// ---------- started from a Steam entry: CosmoU.exe --play "<game>" ----------
function playFromSteam() {
  if (!window.api || !api.launchPlay) return;
  const want = String(api.launchPlay).toLowerCase(),
    g = games.find(x => x.path && x.path.toLowerCase() === want);
  if (g) launch(g);
  else toast('This game wasn’t found in your library any more. Check your games folder in Settings.', 9000);
}
