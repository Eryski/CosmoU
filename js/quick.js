// CosmoU – Quick Menu: clock and status, the last played games, quick switches and shortcuts to every window.
// Open it with the ⋯ button, the Q key or the Home/Guide button of a controller.
const QI = {
  music:
    '<svg viewBox="0 0 32 32"><path fill="#fff" d="M12 6.5 26 4v16.2a4 4 0 1 1-2.5-3.7V9.6l-9 1.7v11.9a4 4 0 1 1-2.5-3.7z"/></svg>',
  sound:
    '<svg viewBox="0 0 32 32"><path fill="#fff" d="M5 12.5h5l7-6v19l-7-6H5z"/><path d="M21 11.5a6.5 6.5 0 0 1 0 9M24.5 8a11 11 0 0 1 0 16" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>',
  cube: '<svg viewBox="0 0 32 32"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" d="m16 4 11 6v12l-11 6-11-6V10z"/><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" d="m5 10 11 6 11-6M16 16v12"/></svg>',
  tv: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="16" rx="2.5" fill="none" stroke="#fff" stroke-width="3"/><path d="M11 27h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M14 3h4l.7 3.4 2.6 1.1 2.9-1.9 2.8 2.8-1.9 2.9 1.1 2.6L29 14v4l-3.4.7-1.1 2.6 1.9 2.9-2.8 2.8-2.9-1.9-2.6 1.1L18 29h-4l-.7-3.4-2.6-1.1-2.9 1.9L5 23.6l1.9-2.9-1.1-2.6L3 18v-4l3.4-.7 1.1-2.6L5.6 7.8l2.8-2.8 2.9 1.9 2.6-1.1zm2 8.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>',
  palette:
    '<svg viewBox="0 0 32 32"><path fill="#fff" d="M16 4C9.4 4 4 9 4 15.4 4 21 8.6 25 13.6 25c1.6 0 2.2-1 2.2-2 0-1.4-1.2-1.8-1.2-3.2 0-1.3 1-2.2 2.4-2.2h3.2C25 17.6 28 15 28 11.6 28 7.2 22.6 4 16 4z"/><g fill="#e57ac0"><circle cx="10" cy="14" r="2"/><circle cx="14" cy="9.2" r="2"/><circle cx="20.2" cy="9.4" r="2"/></g></svg>',
  log: '<svg viewBox="0 0 32 32"><g fill="#fff"><rect x="5" y="16" width="5" height="11" rx="1.5"/><rect x="13.5" y="9" width="5" height="18" rx="1.5"/><rect x="22" y="4" width="5" height="23" rx="1.5"/></g></svg>',
  buddy:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="7.5" fill="#fff"/><path d="M6 28c1-6 5-9 10-9s9 3 10 9z" fill="#fff"/></svg>',
  post: '<svg viewBox="0 0 32 32"><path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.3A3.5 3.5 0 0 1 6 17.5z" fill="#fff"/></svg>',
  pad: '<svg viewBox="0 0 32 32"><rect x="3" y="9" width="26" height="15" rx="4.5" fill="#fff"/><rect x="11" y="11.5" width="10" height="7.5" rx="1" fill="#16b3d9"/></svg>',
  bug: '<svg viewBox="0 0 32 32"><path fill="#fff" d="M16 5a6 6 0 0 1 6 6v1H10v-1a6 6 0 0 1 6-6zM9 14h14v5a7 7 0 0 1-14 0z"/><path d="M4 16h5M23 16h5M5 24l4-2M27 24l-4-2M6 9l4 3M26 9l-4 3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  chat: '<svg viewBox="0 0 32 32"><path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5.3A3.5 3.5 0 0 1 6 17.5z" fill="#fff"/><g fill="#5865f2"><circle cx="12" cy="13" r="1.8"/><circle cx="16" cy="13" r="1.8"/><circle cx="20" cy="13" r="1.8"/></g></svg>',
  quit: '<svg viewBox="0 0 32 32"><path d="M10.2 8.6a10 10 0 1 0 11.6 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M16 4v11" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
  keys: MI.keys,
  star: MI.star,
};
const qOn = id => !!$(id) && $(id).classList.contains('on');
function quickBuild() {
  // clock and status
  const now = new Date();
  $('#qmt').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#qmd').textContent = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  const st = $('#qms');
  st.replaceChildren();
  const chip = (t, title) => {
    const s = document.createElement('span');
    s.className = 'cmc';
    s.textContent = t;
    if (title) s.title = title;
    st.append(s);
  };
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  chip(gp ? '🎮 ' + gp.id.replace(/\s*\(.*$/, '').slice(0, 24) : '🎮 No controller', 'Controller');
  chip('🎨 ' + themeName(), 'Theme');
  if (bgMusic && musicOn) chip('♪ ' + String(musicName).replace(/ · .*$/, ''), 'Menu music');
  const nGames = games.filter(g => g.kind !== 'app').length;
  chip(nGames + (nGames === 1 ? ' game' : ' games'));
  if (favs.size) chip('★ ' + favs.size);
  // jump back in: the last played games (or favorites, or the first games)
  const rec = $('#qmrec');
  rec.replaceChildren();
  let l = games.filter(g => plays[g.name]).sort((a, b) => plays[b.name] - plays[a.name]);
  const head = $('#qmrh');
  head.textContent = 'Jump back in';
  if (!l.length) {
    l = games.filter(g => favs.has(g.name));
    head.textContent = 'Favorites';
  }
  if (!l.length) {
    l = list();
    head.textContent = 'Your games';
  }
  for (const g of l.slice(0, 5)) {
    const b = document.createElement('button'),
      a = document.createElement('div'),
      n = document.createElement('b'),
      s = document.createElement('small'),
      p = typeof playLog === 'object' && playLog.playtime ? playLog.playtime[g.name] : null;
    b.className = 'qmg';
    b.dataset.g = g.name;
    a.className = 'art';
    paint(a, g);
    n.textContent = g.name;
    s.textContent =
      p && p.sec ? fmtDur(p.sec) + ' · ' + dayName(p.last) : plays[g.name] ? 'Played ' + dayName(plays[g.name]) : g.format || '';
    b.append(a, n, s);
    b.onclick = () => {
      $('#qmdlg').close();
      sel = g.name;
      render();
      launch(g);
    };
    rec.append(b);
  }
  $('#qmrec').hidden = !l.length;
  head.hidden = !l.length;
  // quick switches
  const tg = $('#qmtg');
  tg.replaceChildren();
  const sw = (ic, col, label, on, sub, fn) => {
    const b = document.createElement('button'),
      i = document.createElement('i'),
      t = document.createElement('span'),
      x = document.createElement('b'),
      y = document.createElement('small');
    b.type = 'button';
    b.className = 'qmt' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', String(on));
    i.className = 'mi';
    i.style.setProperty('--c', col);
    i.innerHTML = QI[ic];
    x.textContent = label;
    y.textContent = sub;
    t.append(x, y);
    b.append(i, t);
    b.onclick = () => {
      fn();
      setTimeout(quickBuild, 60);
    };
    tg.append(b);
  };
  sw('music', '#f29a3c', 'Menu music', musicOn, musicOn ? 'On' : 'Off', () => $('#mt').click());
  sw('sound', '#e57ac0', 'UI sounds', qOn('#uis'), qOn('#uis') ? 'On' : 'Off', () => $('#uis').click());
  sw('cube', '#8a6cf0', '3D cases', qOn('#hvc'), qOn('#hvc') ? 'On hover' : 'Off', () => $('#hvc').click());
  sw('tv', '#16b3d9', 'TV mode', !!tv, tv ? 'On · F11' : 'Off · F11', () => toggleTv());
  // light / dark and the music volume
  document.querySelectorAll('#qmlook button').forEach(b => b.classList.toggle('on', b.dataset.t === theme));
  const v = Math.round(musicVol() * 100);
  $('#qmvol').value = v;
  $('#qmvolo').textContent = v + '%';
}
function quickGo() {
  const box = $('#qmgo');
  const go = (ic, col, label, fn) => {
    const b = document.createElement('button'),
      i = document.createElement('i'),
      t = document.createElement('span');
    b.type = 'button';
    b.className = 'qmo';
    i.className = 'mi';
    i.style.setProperty('--c', col);
    i.innerHTML = QI[ic];
    t.textContent = label;
    b.append(i, t);
    b.onclick = () => {
      $('#qmdlg').close();
      fn();
    };
    box.append(b);
  };
  go('gear', '#8b959e', 'Settings', () => openSettings());
  go('palette', '#e57ac0', 'Themes', () => openSettings('look'));
  go('log', '#8a6cf0', 'Daily Log', () => openLog());
  go('buddy', '#3aa86b', 'Buddy maker', () => openBuddies());
  go('post', '#1e8fe0', 'Plaza posts', () => openPosts());
  go('pad', '#16b3d9', 'Controllers', () => openSettings('controls'));
  go('keys', '#5c6a75', 'Shortcuts', () => openKeys());
  go('bug', '#e5534b', 'Feedback', () => openFeedback());
  go('chat', '#5865f2', 'Community', () => (window.api ? api.openDiscord() : window.open(DISCORD_URL, '_blank')));
  go('quit', '#c0392b', 'Quit CosmoU', () => window.close());
}
quickGo();
document.querySelectorAll('#qmlook button').forEach(
  b =>
    (b.onclick = () => {
      const t = document.querySelector(`#thm button[data-t="${b.dataset.t}"]`);
      if (t) t.click();
      setTimeout(quickBuild, 400);
    }),
);
$('#qmvol').oninput = () => {
  const v = +$('#qmvol').value;
  $('#qmvolo').textContent = v + '%';
  try {
    localStorage.setItem('cosmou.musicVol', String(v));
  } catch {}
  if (bgMusic) bgMusic.volume = v / 100;
};
function openQuick() {
  if ($('#qmdlg').open) return $('#qmdlg').close();
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  hoverOff();
  quickBuild();
  blip('open');
  $('#qmdlg').showModal();
  const f = $('#qmrec .qmg') || $('#qmtg .qmt');
  if (f) f.focus();
}
$('#qmx').onclick = () => $('#qmdlg').close();
$('#qmb').onclick = () => openQuick();
let qmClock = 0;
$('#qmdlg').addEventListener('close', () => clearInterval(qmClock));
new MutationObserver(() => {
  clearInterval(qmClock);
  if ($('#qmdlg').open)
    qmClock = setInterval(() => {
      const n = new Date();
      $('#qmt').textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 10000);
}).observe($('#qmdlg'), { attributes: true, attributeFilter: ['open'] });
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
  if ((e.key === 'q' || e.key === 'Q') && (!document.querySelector('dialog[open]') || $('#qmdlg').open)) {
    e.preventDefault();
    openQuick();
  }
});
// the Home Menu's logo menu gets an entry too
if (typeof whMenuItems === 'function') {
  const _wmi2 = whMenuItems;
  whMenuItems = function (kind) {
    const l = _wmi2(kind);
    if (kind !== 'power') l.splice(1, 0, ['gear', 'Quick Menu', '#16b3d9', () => openQuick()]);
    return l;
  };
}
