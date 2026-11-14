// CosmoU – Settings → Games & Consoles → Switch & Switch 2 covers.
// Where the covers come from (main.js, in this order): your own cover for the game (covers folder, Artwork) > your
// folder for the console > SteamGridDB > IGDB > Nintendo's eShop. Found pictures are kept on this computer
// (covers-auto); "Download missing covers" looks for all the missing ones now, with its progress here.
// The keys go to main.js and stay there (cover-sources.json): the window only ever learns whether one is saved.
// The red field of the cases (js/case-room.js): CosmoU's symbol and the console's name – or a picture of yours,
// for all consoles or for one of them.
const cvOk = () => !!(window.api && api.coverCfg) && !(typeof IS_MOBILE !== 'undefined' && IS_MOBILE);
const CV_NAME = { switch: 'Switch', switch2: 'Switch 2' };
let cvState = null;
const cvRunning = {};
const cvSize = n => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
const cvPl = (n, one, many) => n + ' ' + (n === 1 ? one : many);

// "Red field on every cover": a tall picture (a scan of the real box) keeps CosmoU's field too – off: it shows its own
function cvFieldAll() {
  try {
    return localStorage.getItem('czFieldAll') !== '0';
  } catch {
    return true;
  }
}
document.body.classList.toggle('cz-fall', cvFieldAll());

async function cvFill() {
  const box = $('#cvx');
  if (!box) return;
  box.hidden = !cvOk();
  if (!cvOk()) return;
  try {
    cvState = await api.coverCfg();
  } catch {
    cvState = null;
  }
  if (!cvState) return;
  cvKeyUi();
  for (const row of box.querySelectorAll('.cv-sys')) cvRow(row);
  cvBadgeUi();
  const fa = $('#cvfa');
  fa.textContent = cvFieldAll() ? 'On' : 'Off';
  fa.classList.toggle('on', cvFieldAll());
}
// the keys: never shown again – the field only says that one is saved
function cvKeyUi() {
  const s = cvState;
  $('#cvsgk').placeholder = s.sgdb ? '•••••••• saved' : 'API key';
  $('#cvigk').placeholder = s.igdb ? '•••••••• saved' : 'Client ID';
  $('#cvigs').placeholder = s.igdb ? '•••••••• saved' : 'Client Secret';
  $('#cvsgt').disabled = !s.sgdb;
  $('#cvigt').disabled = !s.igdb;
  cvSaveLbl();
}
// Save – or Remove, when the fields are empty and a key is saved
function cvSaveLbl() {
  if (!cvState) return;
  const sgEmpty = !$('#cvsgk').value.trim(),
    igEmpty = !$('#cvigk').value.trim() && !$('#cvigs').value.trim();
  $('#cvsgs').textContent = sgEmpty && cvState.sgdb ? 'Remove' : 'Save';
  $('#cvsgs').disabled = sgEmpty && !cvState.sgdb;
  $('#cvigv').textContent = igEmpty && cvState.igdb ? 'Remove' : 'Save';
  $('#cvigv').disabled = igEmpty && !cvState.igdb;
}
async function cvRow(row) {
  const sys = row.dataset.sys,
    on = cvState.auto[sys] !== false,
    dir = cvState.local[sys] || '',
    t = row.querySelector('.cv-auto');
  t.textContent = on ? 'On' : 'Off';
  t.classList.toggle('on', on);
  t.setAttribute('aria-label', 'Automatic ' + CV_NAME[sys] + ' covers: ' + (on ? 'on' : 'off'));
  row.querySelector('.cv-dir').textContent = dir ? 'Your folder: ' + dir : '';
  row.querySelector('.cv-loc').textContent = dir ? 'Other folder…' : 'Your folder…';
  let x = row.querySelector('.cv-lx');
  if (!x) {
    x = document.createElement('button');
    x.className = 'btn cv-lx';
    x.textContent = 'Forget folder';
    x.onclick = async () => {
      await api.coverLocalClear(sys);
      blip('close');
      cvFill();
    };
    row.querySelector('.cv-loc').after(x);
  }
  x.hidden = !dir;
  let c = null;
  try {
    c = await api.coverCache(sys);
  } catch {}
  if (!c) return;
  const info = row.querySelector('.cv-info'),
    off = typeof cfg === 'object' && cfg && cfg.onlineCovers === false;
  if (!cvRunning[sys])
    info.textContent = !c.games
      ? 'No ' + CV_NAME[sys] + ' games in your library yet'
      : cvPl(c.games, 'game', 'games') +
        ' · ' +
        cvPl(c.games - c.missing, 'cover', 'covers') +
        ' · ' +
        c.missing +
        ' missing · saved here: ' +
        (c.n ? cvSize(c.size) : 'none') +
        (off ? ' · automatic covers are off above' : !on ? ' · finds none by itself' : '');
  row.querySelector('.cv-dl').disabled = !c.missing || !!cvRunning[sys];
  row.querySelector('.cv-clr').disabled = !c.n;
}
const cvRowOf = sys => document.querySelector(`#cvx .cv-sys[data-sys="${sys}"]`);

// ---------- the keys ----------
$('#cvsgk').oninput = cvSaveLbl;
$('#cvigk').oninput = cvSaveLbl;
$('#cvigs').oninput = cvSaveLbl;
$('#cvsgs').onclick = async () => {
  if (!cvOk()) return;
  const v = $('#cvsgk').value.trim();
  await api.coverCfgSet({ sgdb: v });
  $('#cvsgk').value = '';
  toast(v ? '✓ SteamGridDB key saved' : 'SteamGridDB key removed', 2600);
  await cvFill();
  if (v) cvTest('sgdb');
};
$('#cvigv').onclick = async () => {
  if (!cvOk()) return;
  const id = $('#cvigk').value.trim(),
    sec = $('#cvigs').value.trim();
  if (!id !== !sec) return toast('IGDB needs both: the Client ID and the Client Secret', 3600);
  await api.coverCfgSet({ igdbId: id, igdbSecret: sec });
  $('#cvigk').value = '';
  $('#cvigs').value = '';
  toast(id ? '✓ IGDB saved' : 'IGDB removed', 2600);
  await cvFill();
  if (id) cvTest('igdb');
};
async function cvTest(which) {
  const lbl = which === 'sgdb' ? 'SteamGridDB' : 'IGDB',
    b = $(which === 'sgdb' ? '#cvsgt' : '#cvigt');
  b.disabled = true;
  b.textContent = 'Testing…';
  let r = null;
  try {
    r = await api.coverTest(which);
  } catch {}
  b.textContent = 'Test';
  b.disabled = false;
  if (r && r.ok) toast('✓ ' + lbl + ' works', 2600);
  else toast(lbl + ': ' + ((r && r.error) || 'it did not answer'), 4200);
}
$('#cvsgt').onclick = () => cvTest('sgdb');
$('#cvigt').onclick = () => cvTest('igdb');
// (the keys are typed here: Enter saves, the settings' own keys stay out of it)
for (const [inp, btn] of [
  ['#cvsgk', '#cvsgs'],
  ['#cvigk', '#cvigv'],
  ['#cvigs', '#cvigv'],
])
  $(inp).addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      $(btn).click();
    }
  });

// ---------- Switch and Switch 2: automatic, your folder, the cache, "Download missing covers" ----------
for (const row of document.querySelectorAll('#cvx .cv-sys')) {
  const sys = row.dataset.sys;
  row.querySelector('.cv-auto').onclick = async () => {
    if (!cvOk() || !cvState) return;
    const on = cvState.auto[sys] === false;
    await api.coverCfgSet({ auto: { [sys]: on } });
    blip(on ? 'on' : 'off');
    cvFill();
  };
  row.querySelector('.cv-loc').onclick = async () => {
    if (!cvOk()) return;
    const d = await api.coverLocalPick(sys);
    if (d) toast('✓ ' + CV_NAME[sys] + ': CosmoU looks in your folder first – pictures named like the game', 3600);
    cvFill();
  };
  row.querySelector('.cv-clr').onclick = async () => {
    if (!cvOk()) return;
    await api.coverCacheClear(sys);
    toast('The saved ' + CV_NAME[sys] + ' covers are gone – “Download missing covers” gets them again', 3600);
    cvFill();
  };
  row.querySelector('.cv-dl').onclick = async () => {
    if (!cvOk() || cvRunning[sys]) return;
    let r = null;
    try {
      r = await api.coversMissing(sys);
    } catch {}
    if (!r || !r.total) {
      toast('Every ' + CV_NAME[sys] + ' game has a cover', 2600);
      return cvFill();
    }
    cvRunning[sys] = true;
    if (cvState && !cvState.sgdb && !cvState.igdb && !cvState.local[sys])
      toast('Without a SteamGridDB or IGDB key CosmoU can only look in Nintendo’s eShop', 4200);
    cvProg({ sys, done: 0, total: r.total, found: 0, running: true });
  };
}
function cvProg(p) {
  const row = cvRowOf(p.sys);
  cvRunning[p.sys] = !!p.running;
  if (!row) return;
  const bar = row.querySelector('.cv-bar'),
    info = row.querySelector('.cv-info');
  bar.hidden = false;
  bar.firstElementChild.style.width = (p.total ? Math.round((p.done / p.total) * 100) : 100) + '%';
  row.querySelector('.cv-dl').disabled = !!p.running;
  if (p.running) {
    info.textContent = 'Looking for covers… ' + p.done + ' of ' + p.total + ' · ' + p.found + ' found';
    return;
  }
  info.textContent = '✓ ' + p.found + ' of ' + p.total + ' found';
  toast(
    '✓ ' +
      CV_NAME[p.sys] +
      ': ' +
      cvPl(p.found, 'cover', 'covers') +
      ' found' +
      (p.found < p.total ? ', ' + (p.total - p.found) + ' not' : ''),
    3600,
  );
  setTimeout(() => {
    bar.hidden = true;
    if (cvState) cvRow(row);
  }, 1600);
}
if (window.api && api.onCoversProgress) api.onCoversProgress(p => p && CV_NAME[p.sys] && cvProg(p));

// ---------- the red field ----------
function cvBadgeUi() {
  const k = $('#cvbk').value,
    has = Object.keys(czBadge || {}),
    mine = has.map(x => ({ all: 'all consoles', switch: 'Switch', switch2: 'Switch 2' })[x]).filter(Boolean);
  $('#cvbi').textContent = mine.length
    ? 'Your picture for: ' + mine.join(', ') + '. Without one: CosmoU’s symbol and the console’s name'
    : 'The badge (Switch) and the band (Switch 2) on the cases: CosmoU’s, or a picture of yours';
  $('#cvbc').disabled = !czBadge[k];
  let pv = $('#cvbv');
  if (!pv) {
    pv = document.createElement('i');
    pv.id = 'cvbv';
    pv.className = 'cv-prev';
    $('#cvbk').before(pv);
  }
  const pic = czBadge[k] || (k !== 'all' && czBadge.all);
  pv.classList.toggle('own', !!pic);
  pv.classList.toggle('s2', k === 'switch2');
  pv.style.setProperty('--bimg', pic ? `url("${pic}")` : 'none');
  pv.innerHTML = pic ? '' : CZ_SYM + '<b>' + (k === 'switch2' ? 'SWITCH 2' : 'SWITCH') + '</b>';
}
$('#cvbk').onchange = cvBadgeUi;
$('#cvbp').onclick = async () => {
  if (!cvOk()) return;
  const k = $('#cvbk').value,
    r = await api.badgeSet(k);
  if (r && r.ok) {
    await czBadgesLoad();
    cvBadgeUi();
    toast('✓ Your picture is the red field' + (k === 'all' ? '' : ' of the ' + CV_NAME[k]), 2600);
  } else if (r && r.error) toast(r.error, 3600);
};
$('#cvbc').onclick = async () => {
  if (!cvOk()) return;
  await api.badgeSet($('#cvbk').value, 'clear');
  await czBadgesLoad();
  cvBadgeUi();
  toast('CosmoU’s red field is back', 2600);
};
$('#cvfa').onclick = () => {
  const on = !cvFieldAll();
  try {
    localStorage.setItem('czFieldAll', on ? '1' : '0');
  } catch {}
  document.body.classList.toggle('cz-fall', on);
  blip(on ? 'on' : 'off');
  cvFill();
};

// the Settings: filled each time they open
if (typeof openSettings === 'function') {
  const _openSettingsCv = openSettings;
  openSettings = async function () {
    const r = await _openSettingsCv.apply(this, arguments);
    cvFill();
    return r;
  };
}
// a new cover found: the numbers again (only while the Settings are open)
if (window.api && api.onCoversUpdated) {
  let t;
  api.onCoversUpdated(() => {
    clearTimeout(t);
    t = setTimeout(
      () => $('#dlg').open && cvState && document.querySelectorAll('#cvx .cv-sys').forEach(r => !cvRunning[r.dataset.sys] && cvRow(r)),
      900,
    );
  });
}
cvFill();
