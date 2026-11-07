// CosmoU – each console's look, your way: its name, its colour, its theme and its interface (its own, or the Switch's
// or the Switch 2's) – and for your own consoles the console they look like. From its card when choosing a console (the pencil, X on a controller, E on the keyboard) or from
// Settings → Games & Consoles ("Look"). The colour is the console's circle on the Switch and Switch 2 and the line on
// its card. (Idea: Eduard) Names start with sl….
let slData = {};
try {
  const d = JSON.parse(localStorage.getItem('cosmou.sysLook') || '{}');
  if (d && typeof d === 'object') slData = d;
} catch {}
// the interfaces a console can borrow (js/switch-face.js, js/switch2-face.js)
const SL_FACES = ['switch', 'switch2'];
const SL_COLS = ['#1ea7dd', '#e5484d', '#3a3f4b', '#8e9aa6', '#6b5bd2', '#2f9e5c', '#f29a3c', '#f06cc0', '#14b8a6', '#c0392b'];
const slSave = () => {
  try {
    localStorage.setItem('cosmou.sysLook', JSON.stringify(slData));
  } catch {}
};
// the names and colours chosen, on every console's profile
function slApply() {
  for (const k of Object.keys(SYS)) {
    const o = slData[k] || {},
      base = SYSDATA.SYSTEMS[k];
    if (!/^own-/.test(k) && base) {
      SYS[k].name = o.name || base.name;
      SYS[k].short = o.name ? (o.name.length <= 12 ? o.name : o.name.slice(0, 11) + '…') : base.short;
      // its interface: its own, or the Switch's or the Switch 2's (Eduard: "my Wii U games in this format")
      if (SL_FACES.includes(o.face) && o.face !== k) SYS[k].look = o.face;
      else delete SYS[k].look;
    }
    SYS[k].col = o.col || '';
  }
}
const _applySystemSl = applySystem;
applySystem = function () {
  slApply();
  const r = _applySystemSl.apply(this, arguments);
  slApply();
  return r;
};
slApply();
// the theme a console has (the one on screen: the theme now; the others: the one kept for them)
const slThemeOf = k => {
  if (k === curSys) return style;
  try {
    return localStorage.getItem('cosmou.style.' + k) || SYS[k].theme;
  } catch {
    return SYS[k].theme;
  }
};

// ---------- the small window ----------
function slEdit(k) {
  if (!SYS[k]) return;
  const own = /^own-/.test(k),
    o = own && typeof osysList === 'function' ? osysList().find(x => x.id === k) : null;
  let d = $('#sldlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'sldlg';
    d.className = 'glass';
    d.innerHTML = `<div class="in win">
        <div class="hd"><h2 id="sl_t">Look</h2><p class="hint" style="margin: 8px 0 0">Its name, its colour and its theme – your way. The colour is its circle on the Switch and Switch 2 and the line on its card.</p></div>
        <div class="bd"><div class="grp" style="margin-top: 10px">
          <div class="set"><div class="lbl"><strong>Name</strong><small id="sl_ns"></small></div><input class="sel" id="sl_n" maxlength="24" style="width: 240px" /></div>
          <div class="set"><div class="lbl"><strong>Colour</strong><small>Its circle and its card</small></div><div class="fd-cols" id="sl_c" role="radiogroup" aria-label="Colour"></div></div>
          <div class="set"><div class="lbl"><strong>Theme</strong><small>Its colours, light and music while it is on screen</small></div><select class="sel" id="sl_th" style="width: 240px"></select></div>
          <div class="set" id="sl_lr"><div class="lbl"><strong>Looks like</strong><small>Its home screen and sounds</small></div><select class="sel" id="sl_l" style="width: 240px"></select></div>
          <div class="set" id="sl_fr"><div class="lbl"><strong>Interface</strong><small>Its own home screen – or the whole Switch or Switch 2 interface for its games</small></div><select class="sel" id="sl_f" style="width: 240px"></select></div>
        </div></div>
        <div class="ft"><button class="btn ghost" id="sl_rs">Back to standard</button><div class="acts"><button class="btn" id="sl_x">Cancel</button><button class="btn main big" id="sl_s">Save</button></div></div>
      </div>`;
    document.body.append(d);
    d.addEventListener('click', e => e.target === d && d.close());
    $('#sl_n').addEventListener('keydown', e => e.key === 'Enter' && (e.preventDefault(), $('#sl_s').click()));
  }
  const base = own ? null : SYSDATA.SYSTEMS[k];
  $('#sl_t').textContent = 'Look of ' + SYS[k].name;
  $('#sl_ns').textContent = own ? 'Your own console' : 'Empty: “' + base.name + '”';
  $('#sl_n').value = own ? (o ? o.name : SYS[k].name) : (slData[k] && slData[k].name) || '';
  $('#sl_n').placeholder = own ? '' : base.name;
  let col = (slData[k] && slData[k].col) || '';
  const cols = $('#sl_c');
  const drawCols = () =>
    cols.replaceChildren(
      ...['', ...SL_COLS].map(c => {
        const b = document.createElement('button');
        b.className = 'fd-col' + (c === col ? ' on' : '') + (c ? '' : ' std');
        if (c) b.style.setProperty('--fc', c);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', c === col ? 'true' : 'false');
        b.setAttribute('aria-label', c ? 'Colour ' + c : 'Its standard colour');
        b.title = c ? '' : 'Standard';
        b.onclick = () => {
          col = c;
          drawCols();
          blip('move');
          const on = cols.querySelector('.on');
          if (on) on.focus();
        };
        return b;
      }),
    );
  drawCols();
  const th = $('#sl_th');
  th.replaceChildren(...THEMES.map(t => new Option(t.name, t.id)));
  th.value = slThemeOf(k);
  $('#sl_lr').hidden = !own;
  $('#sl_fr').hidden = own;
  if (!own) {
    const fs = $('#sl_f');
    fs.replaceChildren(
      new Option('Its own · ' + (base.homeLabel || base.name), ''),
      ...SL_FACES.filter(x => x !== k && SYSDATA.SYSTEMS[x]).map(x => new Option(SYSDATA.SYSTEMS[x].name + ' interface', x)),
    );
    fs.value = (slData[k] && slData[k].face) || '';
  }
  if (own) {
    const ls = $('#sl_l');
    ls.replaceChildren(...OWN_LOOKS.filter(x => SYS[x]).map(x => new Option(SYSDATA.SYSTEMS[x].name + ' · ' + SYS[x].homeLabel, x)));
    ls.value = o ? o.look : 'switch';
  }
  $('#sl_rs').textContent = own ? 'Remove console' : 'Back to standard';
  $('#sl_rs').onclick = async () => {
    d.close();
    if (own) {
      if (curSys === k) setSystem('wiiu');
      delete slData[k];
      slSave();
      await osysSave(osysList().filter(x => x.id !== k));
      toast('✓ ' + SYS[k].name + ' removed – its apps are on every console now', 4000);
    } else {
      delete slData[k];
      slSave();
      try {
        localStorage.removeItem('cosmou.style.' + k);
      } catch {}
      if (k === curSys && SYS[k].theme !== style) setTheme(SYS[k].theme);
      slDone();
      toast('✓ ' + SYS[k].name + ' looks like it did at the start again', 3000);
    }
  };
  $('#sl_x').onclick = () => d.close();
  $('#sl_s').onclick = async () => {
    const name = $('#sl_n').value.trim().slice(0, 24);
    if (own && !name) return $('#sl_n').focus(), toast('Give your console a name first.');
    d.close();
    const prev = slData[k] || {};
    slData[k] = { ...prev, col };
    if (!own) {
      slData[k].name = name && name !== base.name ? name : '';
      slData[k].face = $('#sl_f').value || '';
    }
    if (!slData[k].col && !slData[k].name && !slData[k].face) delete slData[k];
    slSave();
    // its theme: now when it is on screen, else the next time it is
    const t = th.value;
    try {
      localStorage.setItem('cosmou.style.' + k, t);
    } catch {}
    if (k === curSys && t !== style) setTheme(t);
    if (own) await osysSave(osysList().map(x => (x.id === k ? { ...x, name, look: $('#sl_l').value } : x)));
    slDone();
    toast('✓ ' + SYS[k].name + ' saved', 2200);
  };
  d.showModal();
  setTimeout(() => $('#sl_n').focus(), 50);
}
// everything that shows a console's name or colour: again
function slDone() {
  slApply();
  applySystem();
  render();
  if (typeof sysFill === 'function') sysFill();
  if ($('#cpick') && $('#cpick').open) consolePick(false);
}

// ---------- the cards when choosing a console: a pencil on each, the colour on its card ----------
const _consolePickSl = consolePick;
consolePick = function () {
  const r = _consolePickSl.apply(this, arguments);
  const d = $('#cpick');
  if (!d) return r;
  for (const c of d.querySelectorAll('.cp-card[data-s]')) {
    const k = c.dataset.s;
    if (k === 'every' || !SYS[k]) continue;
    if (SYS[k].col) c.style.setProperty('--cpc', SYS[k].col);
    else c.style.removeProperty('--cpc');
    c.classList.toggle('cp-col', !!SYS[k].col);
    if (!c.querySelector('.cp-edit')) {
      const e = document.createElement('span');
      e.className = 'cp-edit';
      e.setAttribute('role', 'button');
      e.setAttribute('aria-label', 'Edit the look of ' + SYS[k].name);
      e.title = 'Edit its look (E · X)';
      e.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
      e.addEventListener('click', ev => {
        ev.stopPropagation();
        ev.preventDefault();
        slEdit(k);
      });
      c.append(e);
    }
  }
  let h = d.querySelector('.cp-hint2');
  if (!h) {
    h = document.createElement('p');
    h.className = 'cp-hint cp-hint2';
    d.querySelector('.cp-in').append(h);
  }
  h.textContent = 'The pencil (E on the keyboard, X on a controller) changes a console’s name, colour and theme.';
  return r;
};
// E on the keyboard: the look of the card in focus
addEventListener(
  'keydown',
  e => {
    const d = $('#cpick');
    if (!d || !d.open || (e.key !== 'e' && e.key !== 'E') || document.querySelector('#sldlg[open]')) return;
    const c = document.activeElement && document.activeElement.closest && document.activeElement.closest('.cp-card');
    if (!c || c.dataset.s === 'every') return;
    e.preventDefault();
    e.stopPropagation();
    slEdit(c.dataset.s);
  },
  true,
);
// (X on a controller: js/feedback-style-controller.js calls this)
function slEditFocused() {
  const c = document.activeElement && document.activeElement.closest && document.activeElement.closest('#cpick .cp-card');
  if (c && c.dataset.s !== 'every') slEdit(c.dataset.s);
}

// ---------- Settings → Games & Consoles: "Look" on every console's row; your own consoles' "Edit" opens it too ----------
if (typeof sysFill === 'function') {
  const _sysFillSl = sysFill;
  sysFill = function () {
    const r = _sysFillSl.apply(this, arguments);
    const box = $('#sysrows');
    if (!box) return r;
    for (const row of box.querySelectorAll('.set')) {
      const w = (row.dataset.k || '').split(' ');
      const k = w[0] === 'system' && w[1] === 'systems' ? w[4] : '';
      if (!k || !SYS[k] || row.querySelector('.sl-look')) continue;
      const acts = row.querySelector('.acts');
      if (!acts) continue;
      const b = document.createElement('button');
      b.className = 'btn sl-look';
      b.textContent = 'Look';
      b.onclick = () => slEdit(k);
      acts.prepend(b);
    }
    return r;
  };
}
if (typeof osysEdit === 'function') {
  const _osysEditSl = osysEdit;
  osysEdit = function (o) {
    if (o && o.id) return slEdit(o.id);
    return _osysEditSl.apply(this, arguments);
  };
}
