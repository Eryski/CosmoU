// CosmoU – your own consoles: a console with a name you choose ("Mods", "Tools", "PC ports" …) for apps only.
// It borrows the look of a real console (its home screen, theme and sounds) and shows the apps you add to it.
// Settings → Games & Consoles → Add another console → "Your own console…". (Idea: Eduard)
const OWN_LOOKS = ['switch', 'switch2', 'wii', 'gamecube', '3ds', 'ds', 'n64', 'snes', 'nes', 'gb', 'gba', 'vb'];
let osysFirst = true;
const osysList = () => ((cfg && cfg.ownSystems) || []).filter(o => o && /^own-/.test(o.id));
// each own console becomes a console like the others: in SYSDATA (its home layout) and in SYS (its profile)
function osysRegister() {
  for (const k of Object.keys(SYS)) if (/^own-/.test(k) && !osysList().some(o => o.id === k)) delete SYS[k];
  for (const o of osysList()) {
    const look = SYSDATA.SYSTEMS[o.look] && !/^own-/.test(o.look) ? o.look : 'switch',
      base = SYSDATA.SYSTEMS[look];
    SYSDATA.SYSTEMS[o.id] = { ...base, name: o.name, short: o.name, homeLabel: o.name + ' Home', ext: [], thumbs: [], eshop: false, own: true, look };
    SYS[o.id] = { ...SYSDATA.SYSTEMS[o.id], views: ['covers', 'grid', 'chome'], home: 'chome' };
  }
  // CosmoU started on an own console last time: back to it once the list is known
  if (osysFirst) {
    osysFirst = false;
    try {
      const s = localStorage.getItem('cosmou.system');
      if (s && SYS[s] && /^own-/.test(s)) curSys = s;
    } catch {}
  }
}
const _sysAvailOwn = sysAvail;
sysAvail = function () {
  osysRegister();
  return [..._sysAvailOwn.apply(this, arguments), ...osysList().map(o => o.id)];
};
const _applySystemOwn = applySystem;
applySystem = function () {
  osysRegister();
  return _applySystemOwn.apply(this, arguments);
};
// how many apps an own console has (for the cards and Settings)
const osysApps = k => games.filter(g => g.kind === 'app' && g.appSys === k).length;

async function osysSave(list) {
  cfg = await api.ownSystemsSave(list);
  osysRegister();
  games = await api.scan();
  applySystem();
  render();
  if (typeof sysFill === 'function') sysFill();
}
// the small window: a name and a look
function osysEdit(o) {
  if (!need()) return;
  const d = $('#owndlg');
  $('#own_t').textContent = o ? 'Edit ' + o.name : 'Your own console';
  $('#own_n').value = o ? o.name : '';
  const ls = $('#own_l');
  ls.replaceChildren(...OWN_LOOKS.filter(k => SYS[k]).map(k => new Option(SYS[k].name + ' · ' + SYS[k].homeLabel, k)));
  ls.value = o ? o.look : 'switch';
  $('#own_rm').hidden = !o;
  $('#own_s').onclick = async () => {
    const name = $('#own_n').value.trim();
    if (!name) {
      $('#own_n').focus();
      return toast('Give your console a name first.');
    }
    const list = osysList().map(x => ({ ...x }));
    let id = o && o.id;
    if (o) Object.assign(list.find(x => x.id === o.id), { name, look: ls.value });
    else {
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 20) || 'console';
      id = 'own-' + slug;
      for (let k = 2; list.some(x => x.id === id); k++) id = 'own-' + slug + '-' + k;
      list.push({ id, name, look: ls.value });
    }
    d.close();
    await osysSave(list);
    toast(o ? '✓ ' + name + ' saved' : '✓ ' + name + ' is ready – add its apps with “Add app”', 4000);
    if (!o && typeof setSystem === 'function') setSystem(id);
  };
  $('#own_rm').onclick = async () => {
    d.close();
    if (curSys === o.id) setSystem('wiiu');
    await osysSave(osysList().filter(x => x.id !== o.id));
    toast('✓ ' + o.name + ' removed – its apps are on every console now', 4000);
  };
  $('#own_x').onclick = () => d.close();
  d.showModal();
  setTimeout(() => $('#own_n').focus(), 50);
}
// Settings: the own consoles in the list of consoles, and "Your own console…" when adding one
if (typeof sysFill === 'function') {
  const _sysFillOwn = sysFill;
  sysFill = function () {
    _sysFillOwn.apply(this, arguments);
    const box = $('#sysrows');
    if (!box || $('#sysgrp').hidden) return;
    const addRow = box.lastElementChild;
    for (const o of osysList()) {
      const row = document.createElement('div');
      row.className = 'set';
      row.dataset.k = 'system own console apps mods ' + o.name.toLowerCase();
      const lbl = document.createElement('div');
      lbl.className = 'lbl';
      const st = document.createElement('strong'),
        sm = document.createElement('small');
      st.textContent = o.name;
      const n = osysApps(o.id);
      sm.textContent = 'Your own console · ' + n + (n === 1 ? ' app' : ' apps') + ' · looks like ' + (SYS[o.look] ? SYS[o.look].name : 'Switch');
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
      if (window.api && api.appSave)
        btn('Add app', () => {
          if (curSys !== o.id) setSystem(o.id);
          setTimeout(() => openApp(null), 50);
        });
      btn('Edit', () => osysEdit(o));
      row.append(lbl, acts);
      box.insertBefore(row, addRow && addRow.querySelector('#sysadd') ? addRow : null);
    }
    // the drop-down for adding a console gets "Your own console…"
    const sel = $('#sysadd');
    if (sel) {
      sel.append(new Option('Your own console (apps)…', 'own'));
      const b = sel.nextElementSibling,
        _add = b && b.onclick;
      if (b)
        b.onclick = e => {
          if (sel.value === 'own') return osysEdit(null);
          return _add && _add.call(b, e);
        };
    } else {
      // every real console is added already: a row only for your own
      const row = document.createElement('div');
      row.className = 'set';
      row.dataset.k = 'add own console apps mods';
      row.innerHTML = '<div class="lbl"><strong>Your own console</strong><small>A console with your name for apps – mods, tools, PC ports</small></div><div class="acts"></div>';
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = 'Add';
      b.onclick = () => osysEdit(null);
      row.querySelector('.acts').append(b);
      box.append(row);
    }
  };
}
