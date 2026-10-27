// CosmoU – Feedback window, Liquid Glass / Classic Wii U style switch and controller navigation.
const DISCORD_URL = 'https://discord.gg/BZry7jGjr7';
// --- Feedback ---
function gpuName() {
  try {
    const c = document.createElement('canvas').getContext('webgl');
    const e = c && c.getExtension('WEBGL_debug_renderer_info');
    if (!e) return '';
    let r = String(c.getParameter(e.UNMASKED_RENDERER_WEBGL) || '');
    const m = r.match(/^ANGLE \((?:[^,]*), (.+?)(?: Direct3D[^,]*)?(?:, [^,]*)?\)$/);
    if (m) r = m[1];
    return r.replace(/\s*\(0x[0-9a-f]+\)/gi, '').trim();
  } catch {
    return '';
  }
}
async function openFeedback() {
  const i = window.api
    ? await api.feedbackInfo()
    : { app: 'preview', os: navigator.userAgent, cemu: '-', data: '-', games: games.length, packs: 0, ctrl: 0 };
  const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).map(p => p.id.replace(/\s*\(.*$/, ''));
  $('#fbtxt').value = [
    'CosmoU feedback',
    '',
    '- CosmoU version: ' + i.app,
    '- Windows: ' + i.os,
    '- Graphics card: ' + (gpuName() || 'unknown'),
    '- Cemu: ' + i.cemu + ' · data folder: ' + i.data,
    '- Games found automatically: ' + i.games,
    '- Graphic packs installed: ' + i.packs,
    '- Controllers set up in Cemu: ' + i.ctrl,
    '- Controller connected right now: ' + (pads.join(', ') || 'none'),
    '- View / style: ' +
      { covers: 'Covers', grid: 'Grid', wiiu: 'Wii U Look' }[mode] +
      ' · ' +
      (style === 'classic' ? 'Classic Wii U' : 'Liquid Glass'),
    '',
    'Did CosmoU find your games without manual setup? (yes / no / partly):',
    '',
    'Controller or mouse? Did navigation work?:',
    '',
    'What broke or felt weird:',
    '',
    'What you liked:',
    '',
  ].join('\n');
  $('#fbdlg').showModal();
  const t = $('#fbtxt'),
    k = t.value.indexOf('(yes / no / partly):') + 21;
  t.focus();
  t.setSelectionRange(k, k);
  t.scrollTop = 0;
}
$('#fbo').onclick = openFeedback;
$('#fbx').onclick = () => $('#fbdlg').close();
$('#fbc').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('#fbtxt').value);
    toast('Copied. Paste it into Discord or Reddit.');
  } catch {
    $('#fbtxt').select();
    document.execCommand('copy');
    toast('Copied.');
  }
};
$('#fbd').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('#fbtxt').value);
  } catch {}
  if (window.api) api.openDiscord();
  else window.open(DISCORD_URL, '_blank');
  toast('Copied. Paste it into #bug-reports on Discord.', 6000);
};
$('#dsc').onclick = () => {
  if (window.api) api.openDiscord();
  else window.open(DISCORD_URL, '_blank');
};
$('#fbi').onclick = () => {
  if (need()) api.openIssue($('#fbtxt').value);
};
// --- Style: Liquid Glass or Classic Wii U ---
let style = 'glass';
try {
  if (localStorage.getItem('cosmou.style') === 'classic') style = 'classic';
} catch {}
function applyStyle() {
  document.body.classList.toggle('classic', style === 'classic');
  document.querySelectorAll('#sty button').forEach(b => b.classList.toggle('on', b.dataset.s === style));
  requestAnimationFrame(() => {
    ind();
    vind();
  });
}
document.querySelectorAll('#sty button').forEach(
  b =>
    (b.onclick = () => {
      style = b.dataset.s;
      try {
        localStorage.setItem('cosmou.style', style);
      } catch {}
      applyStyle();
    }),
);
// --- Controller navigation (standard gamepad layout): D-pad / stick move, A play, B back, Y details, Start settings ---
const pad = { prev: {}, next: {}, loop: false };
function padTick(now) {
  const gp0 = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (!gp0) {
    pad.loop = false;
    return;
  }
  const b = i => !!(gp0.buttons[i] && gp0.buttons[i].pressed),
    ax = gp0.axes[0] || 0,
    ay = gp0.axes[1] || 0;
  const s = {
    l: b(14) || ax < -0.55,
    r: b(15) || ax > 0.55,
    u: b(12) || ay < -0.55,
    d: b(13) || ay > 0.55,
    a: b(0),
    b: b(1),
    y: b(3),
    st: b(9),
    lb: b(4),
    rb: b(5),
  };
  const hit = k => {
    if (!s[k]) {
      pad.next[k] = 0;
      return false;
    }
    if (!pad.prev[k]) {
      pad.next[k] = now + 420;
      return true;
    }
    if (now >= pad.next[k] && 'lrud'.includes(k)) {
      pad.next[k] = now + 140;
      return true;
    }
    return false;
  };
  const fire = {};
  for (const k in s) fire[k] = hit(k);
  pad.prev = s;
  const open = [...document.querySelectorAll('dialog[open]')].pop(),
    busy = $('#launch').classList.contains('on') || $('#setup').classList.contains('on');
  if (!busy) {
    if (open) {
      if (fire.b) open.close();
      else if (fire.a && open.id === 'det') {
        open.close();
        launch(cur());
      }
    } else {
      if (isHome()) {
        for (const k of ['l', 'r', 'u', 'd']) if (fire[k]) homeStep(k);
        if (fire.lb || fire.rb) whTurn(fire.rb ? 1 : -1);
      } else {
        if (fire.l || (mode !== 'covers' && fire.u)) step(-1);
        if (fire.r || (mode !== 'covers' && fire.d)) step(1);
      }
      if (fire.a) launch(cur());
      if (fire.y && cur()) openDetail(cur());
      if (fire.st) openSettings();
    }
  }
  requestAnimationFrame(padTick);
}
