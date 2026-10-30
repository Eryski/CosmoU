// CosmoU – Game details: 3D Wii U case and the graphic pack manager.
function openDetail(g) {
  hoverOff();
  blip('open');
  const app = g.kind === 'app';
  qTiles(g);
  sel = g.name;
  box3d($('#dc'), g);
  $('#dt').textContent = g.name;
  $('#df').textContent = g.format;
  $('#dpt').textContent = typeof playLine === 'function' ? playLine(g.name) : '';
  $('#dgps').textContent = '';
  $('#daor').hidden = true;
  // graphic packs and the Cemu tools are for Wii U games only
  for (const id of ['#dqs', '#dgp', '#dao', '#dgps']) $(id).hidden = !cemuGame(g);
  $('#dedit').hidden = !app;
  $('#det').showModal();
  render();
  if (cemuGame(g)) gpSummary(g);
  if (typeof saveUi === 'function') saveUi(g);
}
// --- 3D Wii U case: box art fills the front, square icons get a white case with a blue band ---
// --- 3D case on hover (grid tiles, middle cover, Wii U Look icons) ---
let hoverCases = true;
try {
  hoverCases = localStorage.getItem('cosmou.hoverCases') !== 'false';
} catch {}
const hb = { t: 0, tgt: null };
function hoverCase(target, g) {
  clearTimeout(hb.t);
  if (!hoverCases || matchMedia('(hover: none)').matches) return;
  const r0 = target.getBoundingClientRect();
  hb.t = setTimeout(() => {
    if (!target.isConnected || !target.matches(':hover') || document.querySelector('dialog[open]')) return;
    const r = target.getBoundingClientRect();
    // still moving (cover flow animation, scrolling): don't show a case at a stale position
    if (Math.abs(r.left - r0.left) > 3 || Math.abs(r.top - r0.top) > 3) return hoverCase(target, g);
    const el = $('#hbox'),
      bw = Math.round(Math.min(210, Math.max(110, r.width * 0.78)));
    box3d(el, g);
    el.style.setProperty('--bw', bw + 'px');
    el.style.left = r.left + r.width / 2 + 'px';
    el.style.top = r.top + r.height / 2 + 'px';
    hb.tgt = target;
    target.classList.add('hvc-src');
    el.classList.add('on');
  }, 420);
}
function hoverOff() {
  clearTimeout(hb.t);
  const el = $('#hbox');
  if (el) el.classList.remove('on');
  if (hb.tgt) hb.tgt.classList.remove('hvc-src');
  hb.tgt = null;
}
addEventListener('pointermove', e => {
  if (!hb.tgt) return;
  const r = hb.tgt.getBoundingClientRect(),
    c = $('#hbox .bx-c');
  // the cover moved away from under the case, or the pointer left it: hide
  if (!hb.tgt.isConnected || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    return hoverOff();
  $('#hbox').style.left = r.left + r.width / 2 + 'px';
  $('#hbox').style.top = r.top + r.height / 2 + 'px';
  if (!c) return;
  c.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.2).toFixed(3));
  c.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
});
for (const ev of ['pointerdown', 'wheel', 'keydown', 'blur', 'resize']) addEventListener(ev, hoverOff, true);
document.addEventListener('scroll', hoverOff, true);
$('#hbox').addEventListener('animationend', e => {
  if (e.target.classList.contains('bx-c')) e.target.style.animation = 'none';
});
function hoverUi() {
  $('#hvc').textContent = hoverCases ? 'On' : 'Off';
  $('#hvc').classList.toggle('on', hoverCases);
}
$('#hvc').onclick = () => {
  hoverCases = !hoverCases;
  try {
    localStorage.setItem('cosmou.hoverCases', String(hoverCases));
  } catch {}
  hoverUi();
  hoverOff();
};
hoverUi();
function box3d(el, g) {
  el.innerHTML =
    '<div class="bx-c"><i class="bx-b"></i><i class="bx-r"></i><i class="bx-t"></i><i class="bx-u"></i><i class="bx-s"><span></span></i><i class="bx-f"></i></div>';
  el.querySelector('.bx-s span').textContent = g.name;
  el.classList.remove('full', 'disc');
  el.classList.toggle('swcase', typeof sysOf === 'function' && sysOf(g) === 'switch');
  el.style.removeProperty('--full');
  if (g.disc && el.id === 'dc') {
    const d = document.createElement('i');
    d.className = 'bx-d';
    const b = document.createElement('b');
    b.style.backgroundImage = `url("${g.disc}")`;
    d.append(b);
    el.querySelector('.bx-c').prepend(d);
    el.classList.add('disc');
  }
  if (g.full) {
    el.classList.add('full');
    el.style.setProperty('--full', `url("${g.full}")`);
    return;
  }
  const f = el.querySelector('.bx-f');
  const asIcon = () => {
    f.className = 'bx-f icon';
    f.style.backgroundImage = '';
    const b = document.createElement('b');
    b.style.backgroundImage = `url("${g.cover}")`;
    const s = document.createElement('span');
    s.textContent = g.name;
    f.append(b, s);
  };
  if (!g.cover) {
    const h = hue(g.name);
    f.className = 'bx-f none';
    f.style.background = `linear-gradient(150deg,hsl(${h} 75% 62%),hsl(${(h + 50) % 360} 78% 44%))`;
    const s = document.createElement('span');
    s.textContent = g.name;
    f.append(s);
    return;
  }
  const im = new Image();
  im.onload = () => {
    if (im.naturalHeight && im.naturalWidth / im.naturalHeight > 0.85) asIcon();
    else f.style.backgroundImage = `url("${g.cover}")`;
  };
  im.onerror = asIcon;
  im.src = g.cover;
}
$('#det').addEventListener('pointermove', e => {
  const c = $('#dc .bx-c');
  if (!c) return;
  const r = $('#det').getBoundingClientRect();
  c.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.3).toFixed(3));
  c.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
});
$('#det').addEventListener('animationend', e => {
  if (e.target.classList.contains('bx-c')) e.target.style.animation = 'none';
});
$('#det').addEventListener('close', () => {
  const c = $('#dc .bx-c');
  if (c) c.style.animation = '';
});
// --- Graphic pack manager ---
let gp = { game: null, data: null, filter: 'All', q: '' };
const GP_DEMO = () => ({
  found: true,
  total: 5,
  version: 'Demo',
  packs: [
    {
      id: 'a',
      name: 'Resolution',
      group: 'Graphics',
      desc: 'Renders the game at a higher resolution.',
      enabled: true,
      categories: [{ name: '', options: ['1280x720 (Default)', '1920x1080', '2560x1440', '3840x2160'], active: '1920x1080' }],
    },
    {
      id: 'b',
      name: 'Contrasty',
      group: 'Graphics',
      desc: 'Changes colors and contrast.',
      enabled: false,
      categories: [{ name: '', options: ['Default', 'Vibrant', 'Warm'], active: 'Default' }],
    },
    {
      id: 'c',
      name: 'FPS++',
      group: 'Mods',
      desc: 'Unlocks the frame rate.',
      enabled: true,
      categories: [
        { name: 'FPS Limit', options: ['30FPS', '60FPS', '120FPS'], active: '60FPS' },
        { name: 'Frame Average', options: ['Off', '8 frames', '32 frames'], active: '8 frames' },
      ],
    },
    { id: 'd', name: 'Infinite Stamina', group: 'Cheats', desc: 'Your stamina never runs out.', enabled: false, categories: [] },
    {
      id: 'e',
      name: 'Shadow Fix',
      group: 'Fixes',
      desc: 'Fixes flickering shadows on some graphics cards.',
      enabled: false,
      categories: [],
    },
  ],
});
async function gpLoad(g) {
  if (window.api) return api.gpList(g.tid || '', g.name);
  return gp.demo || (gp.demo = GP_DEMO());
}
async function gpSummary(g) {
  const d = await gpLoad(g);
  if (sel !== g.name) return;
  $('#dgps').textContent = !d.found
    ? ''
    : d.packs.length
      ? `${d.packs.filter(p => p.enabled).length} of ${d.packs.length} graphic packs on`
      : d.total
        ? 'No graphic packs for this game yet.'
        : 'No graphic packs downloaded yet.';
}
async function openPacks(g) {
  if (!g) return;
  gp.game = g;
  gp.filter = 'All';
  gp.q = '';
  $('#gpq').value = '';
  $('#gpg').textContent = g.name;
  gp.data = await gpLoad(g);
  renderPacks();
  $('#gpdlg').showModal();
}
function renderPacks() {
  const d = gp.data || { packs: [] },
    box = $('#gpl');
  box.replaceChildren();
  $('#gpv').textContent = d.version ? 'Installed: ' + d.version : '';
  const groups = ['All', 'Graphics', 'Mods', 'Cheats', 'Fixes', 'Other'].filter(
    n => n === 'All' || d.packs.some(p => p.group === n),
  );
  const f = $('#gpf');
  f.replaceChildren();
  for (const n of groups) {
    const b = document.createElement('button');
    b.className = gp.filter === n ? 'on' : '';
    b.textContent = n;
    const c = document.createElement('small');
    c.textContent = n === 'All' ? d.packs.length : d.packs.filter(p => p.group === n).length;
    b.append(c);
    b.onclick = () => {
      gp.filter = n;
      renderPacks();
    };
    f.append(b);
  }
  const hint = t => {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = t;
    box.append(p);
  };
  if (d.error) hint(d.error);
  if (!d.found) {
    hint('Cemu’s data folder wasn’t found yet. Install Cemu in Settings and start it once, then come back here.');
    return;
  }
  if (!d.packs.length) {
    hint(
      d.total
        ? 'None of your graphic packs is made for this game. Press “Download / update packs” to get the newest community packs.'
        : 'No graphic packs downloaded yet. Press “Download / update packs” below to get the community graphic packs (resolution, FPS++, mods, cheats and fixes).',
    );
    return;
  }
  const q = gp.q.toLowerCase(),
    l = d.packs.filter(
      p => (gp.filter === 'All' || p.group === gp.filter) && (!q || (p.name + ' ' + p.desc).toLowerCase().includes(q)),
    );
  const grp = document.createElement('div');
  grp.className = 'grp';
  box.append(grp);
  if (!l.length) hint('No packs match.');
  for (const p of l) {
    const row = document.createElement('div');
    row.className = 'set gp' + (p.enabled ? '' : ' off');
    const top = document.createElement('div');
    top.className = 'top';
    const lb = document.createElement('div');
    lb.className = 'lbl';
    const st = document.createElement('strong');
    st.textContent = p.name;
    const bd = document.createElement('span');
    bd.className = 'badge ' + p.group;
    bd.textContent = p.group;
    st.append(bd);
    lb.append(st);
    if (p.desc) {
      const sm = document.createElement('small');
      sm.textContent = p.desc;
      lb.append(sm);
    }
    const tg = document.createElement('button');
    tg.className = 'tg' + (p.enabled ? ' on' : '');
    tg.textContent = p.enabled ? 'On' : 'Off';
    tg.setAttribute('role', 'switch');
    tg.setAttribute('aria-checked', String(!!p.enabled));
    tg.setAttribute('aria-label', p.name);
    tg.onclick = () => gpSet(p, !p.enabled, null);
    top.append(lb, tg);
    row.append(top);
    if (p.enabled && p.categories.some(c => c.options.length > 1)) {
      const o = document.createElement('div');
      o.className = 'opts';
      for (const c of p.categories) {
        if (c.options.length < 2) continue;
        const la = document.createElement('label');
        la.textContent = c.name || 'Preset';
        const s = document.createElement('select');
        s.className = 'sel';
        for (const v of c.options) {
          const op = document.createElement('option');
          op.value = v;
          op.textContent = v;
          s.append(op);
        }
        s.value = c.active;
        s.onchange = () => gpSet(p, true, { [c.name]: s.value });
        la.append(s);
        o.append(la);
      }
      row.append(o);
    }
    grp.append(row);
  }
  hint(
    'Close Cemu before changing packs here, because Cemu saves its own list when it quits. If you use Quick quality for this game, it sets the resolution pack when you press Play.',
  );
}
async function gpSet(p, on, change) {
  const presets = {};
  for (const c of p.categories) presets[c.name] = c.active;
  Object.assign(presets, change || {});
  if (window.api) {
    gp.data = await api.gpSet(gp.game.tid || '', gp.game.name, p.id, on, presets);
    if (gp.data.error) toast(gp.data.error, 7000);
  } else {
    p.enabled = on;
    for (const c of p.categories) c.active = presets[c.name];
  }
  renderPacks();
  gpSummary(gp.game);
}
$('#dgp').onclick = () => openPacks(cur());
$('#gpx').onclick = () => $('#gpdlg').close();
$('#gpq').oninput = () => {
  gp.q = $('#gpq').value.trim();
  renderPacks();
};
$('#gpdl').onclick = async () => {
  if (!need()) return;
  const b = $('#gpdl');
  b.disabled = true;
  const r = await api.gpDownload();
  b.disabled = false;
  if (r.ok) {
    toast('Graphic packs updated' + (r.version ? ' · ' + r.version : '') + '.');
    gp.data = await gpLoad(gp.game);
    renderPacks();
    gpSummary(gp.game);
  } else if (!r.cancelled) toast(r.error || 'Download failed.', 7000);
  $('#gpv').textContent = gp.data && gp.data.version ? 'Installed: ' + gp.data.version : '';
};
if (window.api)
  api.onGpProgress(d => {
    $('#gpv').textContent = d.text || '';
  });
