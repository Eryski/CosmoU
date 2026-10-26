// CosmoU – Launching games, loading the library, button wiring, Cemu download and start-up.
addEventListener('gamepadconnected', e => {
  toast('Controller connected · ' + e.gamepad.id.replace(/\s*\(.*$/, '').slice(0, 40));
  if (!pad.loop) {
    pad.loop = true;
    requestAnimationFrame(padTick);
  }
});
async function launch(g) {
  if (!g) return;
  if (bgMusic) bgMusic.pause();
  $('#ln').textContent = g.name;
  paint($('#lc'), g);
  $('#launch').classList.add('on');
  await new Promise(r => setTimeout(r, 1400));
  let r = { ok: true };
  if (window.api)
    r = await api.play(g.kind === 'app' ? { appId: g.appId } : { path: g.path, tid: g.tid || '', key: g.tid || g.name });
  else toast('This is the preview. Launching only works in the desktop app.');
  if (window.api) {
    if (r.ok) {
      plays[g.name] = Date.now();
      try {
        localStorage.setItem('cosmou.plays', JSON.stringify(plays));
      } catch {}
      startToast(g, r);
    } else {
      toast(r.error);
      syncMusic();
    }
  }
  setTimeout(() => {
    $('#launch').classList.remove('on');
    render();
  }, 500);
}
async function load() {
  if (window.api) {
    cfg = await api.getSettings();
    games = await api.scan();
  } else games = demo;
  games.forEach(sample);
  render();
  $('#grid').classList.add('swap');
}
const fill = () => {
  $('#pc').textContent = cfg.cemuPath
    ? (cfg.cemuManaged ? 'Managed by CosmoU' + (cfg.cemuVersion ? ' · ' + cfg.cemuVersion : '') + ' · ' : '') + cfg.cemuPath
    : 'Not installed';
  $('#pg').textContent = cfg.gamesDir || 'Not selected';
  $('#ct').textContent = cfg.onlineCovers === false ? 'Off' : 'On';
  $('#ct').classList.toggle('on', cfg.onlineCovers !== false);
};
const need = () => window.api || (toast('This only works in the desktop app.'), false);
async function pickFolder() {
  if (need()) {
    cfg = await api.pickFolder();
    fill();
    await load();
  }
}
function ind() {
  const b = document.querySelector('nav button.on'),
    i = $('#ind');
  i.style.left = b.offsetLeft + 'px';
  i.style.width = b.offsetWidth + 'px';
}
document.querySelectorAll('nav button').forEach(
  b =>
    (b.onclick = () => {
      if (b.dataset.v === 'set') {
        openSettings();
        return;
      }
      view = b.dataset.v;
      document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
      ind();
      render();
      for (const t of [$('#grid'), $('#cf')]) {
        t.classList.remove('swap');
        void t.offsetWidth;
        t.classList.add('swap');
      }
    }),
);
document.querySelectorAll('#vt button').forEach(
  b =>
    (b.onclick = () => {
      if (mode === b.dataset.m) return;
      mode = b.dataset.m;
      try {
        localStorage.setItem('cosmou.viewMode', mode);
      } catch {}
      syncMode();
      render();
      const t = $(mode === 'grid' ? '#grid' : mode === 'wiiu' ? '#wu' : '#cf');
      t.classList.remove('swap');
      void t.offsetWidth;
      t.classList.add('swap');
    }),
);
$('#prev').onclick = () => step(-1);
$('#next').onclick = () => step(1);
$('#cfplay').onclick = () => launch(cur());
$('#cfmore').onclick = () => cur() && openDetail(cur());
let swipeX = null,
  wheelT = 0;
$('#cfrow').addEventListener('pointerdown', e => {
  swipeX = e.clientX;
});
$('#cfrow').addEventListener('pointerup', e => {
  if (swipeX !== null && Math.abs(e.clientX - swipeX) > 60) step(e.clientX < swipeX ? 1 : -1);
  swipeX = null;
});
$('#cf').addEventListener(
  'wheel',
  e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.shiftKey) return;
    if (Date.now() - wheelT < 280) return;
    wheelT = Date.now();
    step((e.deltaX || e.deltaY) > 0 ? 1 : -1);
  },
  { passive: true },
);
addEventListener('keydown', e => {
  if (
    mode === 'grid' ||
    document.querySelector('dialog[open]') ||
    $('#launch').classList.contains('on') ||
    $('#setup').classList.contains('on') ||
    e.target.tagName === 'INPUT'
  )
    return;
  if (e.key === 'ArrowRight' || (mode === 'wiiu' && e.key === 'ArrowDown')) step(1);
  else if (e.key === 'ArrowLeft' || (mode === 'wiiu' && e.key === 'ArrowUp')) step(-1);
  else if (e.key === 'Enter' && e.target === document.body) launch(cur());
});
$('#wplay').onclick = () => launch(cur());
$('#wdet').onclick = () => cur() && openDetail(cur());
const wpage = d => {
  const l = list(),
    i = Math.max(
      0,
      l.findIndex(x => x.name === sel),
    ),
    p = Math.floor(i / WU_PER) + d,
    t = l[p * WU_PER];
  if (t) {
    sel = t.name;
    render();
  }
};
$('#wprev').onclick = () => wpage(-1);
$('#wnext').onclick = () => wpage(1);
$('#wu').addEventListener('pointermove', e => {
  const u = $('#wu'),
    nx = e.clientX / innerWidth - 0.5,
    ny = e.clientY / innerHeight - 0.5;
  u.style.setProperty('--px', nx * -40 + 'px');
  u.style.setProperty('--py', ny * -24 + 'px');
  u.style.setProperty('--mxr', nx * 2);
  u.style.setProperty('--myr', ny * 2);
  mii.px = nx * -30;
  mii.py = ny * -18;
});
$('#q').oninput = render;
$('#sort').onclick = () => {
  sortMode = sortMode === 'az' ? 'recent' : 'az';
  render();
};
$('#play').onclick = () => launch(cur());
$('#more').onclick = () => cur() && openDetail(cur());
$('#dplay').onclick = () => {
  $('#det').close();
  launch(cur());
};
$('#dfold').onclick = () => {
  const g = cur();
  if (g && need()) api.showInFolder(g.path);
};
$('#dx').onclick = () => $('#det').close();
$('#close').onclick = () => $('#dlg').close();
$('#opG').onclick = openGraphics;
$('#gclose').onclick = () => $('#gdlg').close();
document.querySelectorAll('#tabs button').forEach(b => (b.onclick = () => showTab(b.dataset.t)));
$('#rst').onclick = async () => {
  for (const it of SCHEMA[tab] || []) {
    if (it.type === 'head') continue;
    if (window.api) cs = await api.setCemuSetting(it.k, null);
    else delete cs.overrides[it.k];
  }
  renderPane(tab);
};
$('#ebtn').onclick = pickFolder;
$('#pickG').onclick = pickFolder;
$('#pickC').onclick = async () => {
  if (need()) {
    cfg = await api.pickCemu();
    fill();
  }
};
$('#mt').onclick = () => {
  musicOn = !musicOn;
  try {
    localStorage.setItem('cosmou.music', String(musicOn));
  } catch {}
  musicUi();
  syncMusic();
};
addEventListener('blur', () => bgMusic && bgMusic.pause());
addEventListener('focus', syncMusic);
addEventListener('pointerdown', syncMusic, { once: true });
$('#upC').onclick = () => {
  if (need()) {
    $('#dlg').close();
    installCemu();
  }
};
$('#ct').onclick = async () => {
  if (need()) {
    cfg = await api.setOnlineCovers(cfg.onlineCovers === false);
    fill();
    load();
  }
};
let covT;
if (window.api)
  api.onCoversUpdated(() => {
    clearTimeout(covT);
    covT = setTimeout(load, 800);
  });
$('#mf').onclick = () => need() && api.openMusicFolder();
$('#oc').onclick = () => need() && api.openCovers();
for (const d of document.querySelectorAll('dialog'))
  d.addEventListener('click', e => {
    if (e.target === d) d.close();
  });
addEventListener('pointermove', e => {
  const tl = e.target.closest && e.target.closest('.tile');
  if (tl) {
    const r = tl.getBoundingClientRect();
    tl.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 14 + 'deg');
    tl.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -14 + 'deg');
  }
  const g = e.target.closest && e.target.closest('.glass');
  if (g) {
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', e.clientX - r.left + 'px');
    g.style.setProperty('--my', e.clientY - r.top + 'px');
  }
  const h = $('#hero');
  if (h.contains(e.target)) {
    const r = h.getBoundingClientRect();
    h.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * -18 + 'px');
    h.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * -12 + 'px');
  }
});
addEventListener('resize', () => {
  ind();
  vind();
  if (mode === 'wiiu') {
    buildWiiU(list());
    fitMii(true);
  }
});
(function () {
  const c = $('#pt'),
    x = c.getContext('2d');
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  let w, h;
  const P = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2.2,
    v: 0.00008 + Math.random() * 0.00014,
    p: Math.random() * 6,
  }));
  const fit = () => {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
  };
  fit();
  addEventListener('resize', fit);
  (function t(n) {
    x.clearRect(0, 0, w, h);
    for (const p of P) {
      p.y -= p.v * 16;
      if (p.y < -0.02) p.y = 1.02;
      const a = 0.25 + 0.2 * Math.sin(n / 1400 + p.p);
      x.beginPath();
      x.arc(p.x * w + Math.sin(n / 2600 + p.p) * 14, p.y * h, p.r, 0, 7);
      x.fillStyle = `rgba(255,255,255,${a})`;
      x.shadowBlur = 10;
      x.shadowColor = 'rgba(80,220,240,.8)';
      x.fill();
    }
    requestAnimationFrame(t);
  })(0);
})();
function setupUi(h, p, pct, btns) {
  $('#sh').textContent = h;
  $('#sp').textContent = p;
  $('#sb').style.width = pct + '%';
  const key = btns.join();
  if (setupUi.k === key) return;
  setupUi.k = key;
  const defs = {
    cancel: ['Cancel', () => api.cemuCancel()],
    retry: ['Try again', installCemu],
    manual: [
      'Choose Cemu.exe manually',
      async () => {
        cfg = await api.pickCemu();
        fill();
        $('#setup').classList.remove('on');
      },
    ],
    close: ['Close', () => $('#setup').classList.remove('on')],
  };
  const box = $('#sa');
  box.replaceChildren();
  btns.forEach(k => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = defs[k][0];
    b.onclick = defs[k][1];
    box.append(b);
  });
}
async function installCemu() {
  setupUi.k = '';
  $('#setup').classList.add('on');
  setupUi(
    'Preparing Cemu…',
    'CosmoU needs Cemu to run games. Downloading the latest version from the official Cemu GitHub page.',
    0,
    ['cancel'],
  );
  const r = await api.cemuInstall();
  if (r.ok) {
    cfg = await api.getSettings();
    fill();
    setupUi('Cemu is ready.', 'You can choose your games folder now.', 100, []);
    setTimeout(() => $('#setup').classList.remove('on'), 1500);
  } else if (r.cancelled) $('#setup').classList.remove('on');
  else
    setupUi('Couldn’t get Cemu', (r.error || 'Something went wrong.') + ' You can try again or choose Cemu.exe yourself.', 0, [
      'retry',
      'manual',
      'close',
    ]);
}
async function initCemu() {
  if (!window.api) return;
  cfg = await api.getSettings();
  const st = await api.cemuStatus();
  if (!st.installed) installCemu();
}
if (window.api)
  api.onCemuProgress(d => {
    if (d.stage === 'download') {
      const mb = n => (n / 1048576).toFixed(1);
      setupUi(
        'Preparing Cemu…',
        d.total ? `Downloading… ${mb(d.got)} of ${mb(d.total)} MB` : `Downloading… ${mb(d.got)} MB`,
        d.percent || 0,
        ['cancel'],
      );
    } else setupUi('Preparing Cemu…', d.text || '', d.stage === 'extract' ? 100 : 0, d.stage === 'extract' ? [] : ['cancel']);
  });
applyStyle();
load();
initMusic();
initCemu();
requestAnimationFrame(() => {
  ind();
  syncMode();
});
