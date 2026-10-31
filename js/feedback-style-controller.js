// CosmoU – Feedback window and controller navigation.
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
    // macOS: "ANGLE Metal Renderer: Apple M2 Pro" → "Apple M2 Pro"
    return r.replace(/^ANGLE Metal Renderer:\s*/i, '').replace(/\s*\(0x[0-9a-f]+\)/gi, '').trim();
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
    '- ' + OS_NAME + ': ' + i.os,
    '- Graphics card: ' + (gpuName() || 'unknown'),
    '- Cemu: ' + i.cemu + ' · data folder: ' + i.data,
    '- Games found automatically: ' + i.games,
    '- Graphic packs installed: ' + i.packs,
    '- Controllers set up in Cemu: ' + i.ctrl,
    '- Controller connected right now: ' + (pads.join(', ') || 'none'),
    '- View / theme: ' + { covers: 'Covers', grid: 'Grid', wiiu: 'Wii U Look' }[mode] + ' · ' + themeName(),
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
// --- Controller navigation (standard gamepad layout): D-pad / stick move, A play, B back, Y details, Start settings ---
const pad = { prev: {}, next: {}, loop: false };
// ---------- moving through windows with a controller ----------
function padFocusable(d) {
  return [...d.querySelectorAll('button, input, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(
    e => !e.disabled && e.offsetParent !== null && e.type !== 'hidden',
  );
}
function padFocus(d, f) {
  document.body.classList.add('padnav');
  pad.moved = true;
  const a = document.activeElement,
    inside = a && a !== d && d.contains(a);
  // sliders: left and right change the value
  if (inside && a.type === 'range' && (f.l || f.r)) {
    a.value = +a.value + (f.r ? 1 : -1) * (+a.step || 1);
    a.dispatchEvent(new Event('input', { bubbles: true }));
    a.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  // Settings: the categories are one column, the options another
  if (d.id === 'dlg') {
    const inNav = inside && !!a.closest('.sx-nav');
    if (f.l && !inNav) return sxFocusNav();
    if (f.r && (inNav || !inside)) return sxFocusContent();
    if (inNav && (f.u || f.d)) return sxStep(f.d ? 1 : -1, true);
  }
  let list = padFocusable(d);
  if (d.id === 'dlg') list = list.filter(e => !e.closest('.sx-side'));
  const i = inside ? list.indexOf(a) : -1,
    dir = f.u || f.l ? -1 : 1,
    n = list[i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + dir))];
  if (n) {
    n.focus();
    n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
function padPress(d) {
  const a = document.activeElement;
  if (!a || a === d || !d.contains(a)) {
    const f = padFocusable(d)[0];
    if (f) f.focus();
    return;
  }
  if (a.tagName === 'SELECT') {
    a.selectedIndex = (a.selectedIndex + 1) % a.options.length;
    a.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (a.tagName === 'INPUT' && a.type !== 'checkbox') a.select && a.select();
  else a.click();
}
addEventListener('pointermove', () => document.body.classList.remove('padnav'), { passive: true });
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
    x: b(2),
    y: b(3),
    st: b(9),
    sl: b(8),
    lb: b(4),
    rb: b(5),
    hm: b(16),
    r3: b(11),
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
    busy = $('#launch').classList.contains('on') || $('#setup').classList.contains('on') || $('#mapdlg').open;
  if (open !== pad.dlg) {
    pad.dlg = open;
    pad.moved = false;
  }
  if (!busy && fire.hm && typeof openQuick === 'function') openQuick();
  else if (!busy) {
    if (open) {
      // inside a window the D-pad moves between the buttons, A presses, B goes back
      if (open.id === 'dlg' && (fire.lb || fire.rb)) sxStep(fire.rb ? 1 : -1, true);
      if (fire.u || fire.d || fire.l || fire.r) padFocus(open, fire);
      if (fire.b) {
        if (open.id === 'dlg' && document.activeElement && document.activeElement.closest('.sx-main')) sxFocusNav();
        else open.close();
      } else if (fire.a) {
        if (open.id === 'det' && !pad.moved) {
          open.close();
          launch(cur());
        } else padPress(open);
      }
    } else {
      if (isHome()) {
        for (const k of ['l', 'r', 'u', 'd']) if (fire[k]) homeStep(k);
        if (fire.lb || fire.rb) whTurn(fire.rb ? 1 : -1);
      } else {
        if (mode === 'chome') {
          for (const k of ['l', 'r', 'u', 'd']) if (fire[k]) chNav(k);
        } else {
          if (fire.l || (mode !== 'covers' && fire.u)) step(-1);
          if (fire.r || (mode !== 'covers' && fire.d)) step(1);
        }
      }
      if (fire.a) mode === 'chome' ? chA() : launch(cur());
      if (fire.b && mode === 'chome') chB();
      // L and R change the console (when there is more than one)
      if ((fire.lb || fire.rb) && !isHome() && typeof sysNext === 'function') sysNext(fire.rb ? 1 : -1);
      if (fire.y && cur()) openDetail(cur());
      // X or pressing the right stick: the game's menu (like a right click – favorites, details, folder…)
      if ((fire.x || fire.r3) && cur() && typeof gameMenu === 'function') gameMenu(cur(), null);
      if (fire.st) openSettings();
      if (fire.sl && typeof toggleTv === 'function') toggleTv();
    }
  }
  requestAnimationFrame(padTick);
}
