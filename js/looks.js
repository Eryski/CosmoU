// CosmoU – pictures and music for each console (Settings → Appearance, and the Quick Menu).
// Every console (Wii U, Switch, 3DS …) can have its own background pictures and its own menu music. With more than
// one picture, the next one comes each time you go to that console (and at every start). The picture lies behind
// the glass (best with Liquid Glass) with a soft veil so text stays readable; the music plays instead of the theme's
// music while that console is on screen. The files live in CosmoU's own folder (main.js / mobile-api.js).
let sysLooks = { bg: {}, music: {} };
const lookSysNow = () => (typeof curSys !== 'undefined' ? curSys : 'wiiu');
const lookSysName = () => (typeof SYS !== 'undefined' && SYS[lookSysNow()] ? SYS[lookSysNow()].name : 'Wii U');
const cssPic = u => 'url("' + String(u).replace(/["\\\n]/g, '') + '")';
// this console's music, or its pictures (a list), or null
function lookOf(kind, k) {
  return ((sysLooks && sysLooks[kind]) || {})[k || lookSysNow()] || null;
}
function lookPics(k) {
  const b = lookOf('bg', k);
  return b ? b.list || [b] : [];
}
// which of the pictures is on screen (it moves on with every visit)
function lookIx(k) {
  let i = 0;
  try {
    i = +localStorage.getItem('cosmou.bgIx.' + (k || lookSysNow())) || 0;
  } catch {}
  const n = lookPics(k).length;
  return n ? ((i % n) + n) % n : 0;
}
function lookSetIx(i, k) {
  try {
    localStorage.setItem('cosmou.bgIx.' + (k || lookSysNow()), String(i));
  } catch {}
}
function lookPic(k) {
  const l = lookPics(k);
  return l.length ? l[lookIx(k)] : null;
}
// going to a console: its next picture
function bgAdvance(k) {
  const n = lookPics(k).length;
  if (n > 1) lookSetIx(lookIx(k) + 1, k);
}
// an own theme with a picture shows it when the console has none of its own
function themePicture() {
  const t = typeof THEMES !== 'undefined' && THEMES.find(x => x.id === style && x.own && x.image);
  return t ? { url: t.image } : null;
}
// A picture is shown once it is loaded and decoded: from a slow (external) drive a big picture can take a moment,
// and until then the last picture (or the theme's own background) stays – never a black screen.
const bdReady = new Map();
let bdWant = '';
function bdLoad(url) {
  if (!bdReady.has(url)) {
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    const p = (im.decode ? im.decode() : new Promise((ok, no) => ((im.onload = ok), (im.onerror = no))))
      .then(() => im)
      .catch(() => null);
    // the Image stays referenced, so Chromium keeps it decoded for the next visit
    bdReady.set(url, p);
  }
  return bdReady.get(url);
}
function bdShow(url) {
  const el = $('#bgpic');
  if (!el) return;
  document.body.classList.toggle('has-pic', !!url);
  el.style.backgroundImage = url ? cssPic(url) : '';
}
function applyBackdrop() {
  if (!$('#bgpic')) return;
  const b = lookPic() || themePicture();
  const url = b ? b.url : '';
  bdWant = url;
  if (!url) return bdShow('');
  bdLoad(url).then(() => {
    if (bdWant === url) bdShow(url);
  });
  bdAhead();
}
// the picture each console shows on its next visit is loaded ahead, while CosmoU is idle
function bdAhead() {
  const run = () => {
    for (const k of Object.keys((sysLooks && sysLooks.bg) || {})) {
      const l = lookPics(k);
      if (!l.length) continue;
      const i = lookIx(k);
      for (const j of new Set([i, (i + 1) % l.length])) bdLoad(l[j].url);
    }
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
// the music this console should play now: its own, else your music file, else the theme's (themes.js themedMusic)
async function swapLookMusic() {
  const m = await themedMusic(window.api ? await api.getMusic() : null);
  if (!m || !m.url) return musicUi();
  if (bgMusic && bgMusic.src === new URL(m.url, location.href).href) {
    musicName = m.name;
    return musicUi();
  }
  const old = bgMusic,
    playing = (old && !old.paused) || (!old && musicOn && document.hasFocus());
  if (old) {
    // a short fade, like a theme change
    const v0 = old.volume;
    for (let i = 1; i <= 8; i++) setTimeout(() => (old.volume = Math.max(0, v0 * (1 - i / 8))), i * 40);
    setTimeout(() => old.pause(), 360);
  }
  setTimeout(
    () => {
      setMusic(m);
      musicUi();
      if (playing && musicOn) bgMusic.play().catch(() => {});
    },
    old ? 340 : 0,
  );
}
// a short line about the pictures and the music (Settings and the Quick Menu)
function lookPicsText() {
  const n = lookPics().length;
  return !n ? 'None – the theme’s look' : n === 1 ? '1 picture' : n + ' pictures · a new one each visit';
}
function lookMusicText() {
  const m = lookOf('music');
  return m ? m.name : 'The theme’s music';
}
function looksUi() {
  document.querySelectorAll('.lksys').forEach(e => (e.textContent = lookSysName()));
  if (!$('#lkbg')) return;
  const n = lookPics().length,
    p = lookPic(),
    m = lookOf('music');
  $('#lkbg').textContent = n ? 'Add picture…' : 'Choose picture…';
  $('#lkbgnext').hidden = n < 2;
  $('#lkbgdel').hidden = !n;
  $('#lkbgdel').textContent = n > 1 ? 'Remove this one' : 'Remove';
  $('#lkbginfo').textContent = n > 1 ? n + ' pictures – a new one each time you come to this console. ' : '';
  $('#lkmudel').hidden = !m;
  $('#lkmu').textContent = m ? 'Change music…' : 'Choose music…';
  $('#lkmuname').textContent = m ? '♪ ' + m.name : '';
  $('#lkpv').hidden = !p;
  if (p) $('#lkpv').style.backgroundImage = cssPic(p.url);
}
let looksLoaded = false;
async function loadLooks() {
  if (!window.api || !api.sysLooks) return;
  try {
    sysLooks = (await api.sysLooks()) || { bg: {}, music: {} };
  } catch {
    sysLooks = { bg: {}, music: {} };
  }
  // a start of CosmoU counts as going to the console
  if (!looksLoaded) bgAdvance();
  looksLoaded = true;
  applyBackdrop();
  looksUi();
  // music that started before this list was there
  if (lookOf('music') && bgMusic) swapLookMusic();
}
function lookChanged() {
  looksUi();
  if (typeof quickBuild === 'function' && $('#qmdlg') && $('#qmdlg').open) quickBuild();
}
async function lookPick(kind) {
  if (!need()) return;
  const k = lookSysNow();
  const r = await api.sysLookPick(k, kind);
  if (!r) return;
  if (r.error) return toast(r.error, 6000);
  blip('open');
  if (kind === 'bg') {
    // the new picture is shown right away
    await loadLooks();
    const i = lookPics(k).findIndex(x => x.name === r.name);
    if (i >= 0) lookSetIx(i, k);
    applyBackdrop();
    lookChanged();
    const n = lookPics(k).length;
    toast(
      n > 1
        ? '✓ ' + n + ' pictures for ' + lookSysName() + ' – a new one each time you come back'
        : style === 'liquid-glass' || style.startsWith('u-')
          ? '✓ Your picture for ' + lookSysName()
          : '✓ Picture set – it looks best with the Liquid Glass theme',
    );
  } else {
    sysLooks.music = { ...(sysLooks.music || {}), [k]: { url: r.url, name: r.name } };
    musicOn = true;
    try {
      localStorage.setItem('cosmou.music', 'true');
    } catch {}
    await swapLookMusic();
    lookChanged();
    toast('✓ Music for ' + lookSysName() + ': ' + r.name);
  }
}
// the next (or the previous) picture now
function lookNext(d = 1) {
  if (lookPics().length < 2) return;
  if (d < 0) lookSetIx(lookIx() - 1);
  else bgAdvance();
  blip('move');
  applyBackdrop();
  lookChanged();
}
// kind 'bg': the picture on screen (all = every picture of this console); 'music': the music
async function lookRemove(kind, all) {
  if (!need()) return;
  const k = lookSysNow(),
    p = kind === 'bg' && !all ? lookPic() : null;
  await api.sysLookRemove(k, kind, p && p.name ? p.name : undefined);
  if (kind === 'bg') {
    await loadLooks();
    applyBackdrop();
  } else {
    if (sysLooks.music) delete sysLooks.music[k];
    await swapLookMusic();
  }
  lookChanged();
  toast(kind === 'bg' ? (lookPics().length ? '✓ Picture removed' : '✓ No picture any more') : '✓ Back to the theme music');
}
// the Quick Menu rows open a small menu with these (the controller works in it like in every window)
function lookPicMenu(anchor) {
  const n = lookPics().length;
  openMenu(
    anchor,
    [
      { label: n ? 'Add a picture…' : 'Choose a picture…', icon: 'picture', fn: () => lookPick('bg') },
      n > 1 && { label: 'Next picture', icon: 'next', stay: true, fn: () => lookNext() },
      n > 1 && { label: 'Previous picture', icon: 'prev', stay: true, fn: () => lookNext(-1) },
      n && { label: n > 1 ? 'Remove this picture' : 'Remove the picture', icon: 'trash', danger: true, fn: () => lookRemove('bg') },
      n > 1 && { label: 'Remove all ' + n + ' pictures', icon: 'trash', danger: true, fn: () => lookRemove('bg', true) },
    ],
    { title: 'Pictures · ' + lookSysName(), sub: lookPicsText() },
  );
}
function lookMusicMenu(anchor) {
  const m = lookOf('music');
  openMenu(
    anchor,
    [
      { label: m ? 'Change the music…' : 'Choose music…', icon: 'note', fn: () => lookPick('music') },
      m && { label: 'Back to the theme music', icon: 'trash', danger: true, fn: () => lookRemove('music') },
    ],
    { title: 'Music · ' + lookSysName(), sub: lookMusicText() },
  );
}
// icons for those menus
if (typeof MI !== 'undefined') {
  MI.picture =
    '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="20" rx="3.5" fill="none" stroke="#fff" stroke-width="2.8"/><circle cx="21" cy="12.5" r="2.6" fill="#fff"/><path d="m6 24 7-8 5 5 3-3 5 6z" fill="#fff"/></svg>';
  MI.next = '<svg viewBox="0 0 32 32"><path d="M8 7v18l12-9zM22 7h3.5v18H22z" fill="#fff"/></svg>';
  MI.prev = '<svg viewBox="0 0 32 32"><path d="M24 7v18L12 16zM10 7H6.5v18H10z" fill="#fff"/></svg>';
  MI.trash =
    '<svg viewBox="0 0 32 32"><path d="M6 9h20M13 9V6h6v3M8.5 9l1.3 16a2 2 0 0 0 2 1.9h8.4a2 2 0 0 0 2-1.9L23.5 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  MI.note = '<svg viewBox="0 0 32 32"><path fill="#fff" d="M12 6.5 26 4v16.2a4 4 0 1 1-2.5-3.7V9.6l-9 1.7v11.9a4 4 0 1 1-2.5-3.7z"/></svg>';
}
if (typeof MCOL !== 'undefined') Object.assign(MCOL, { picture: '#2fa0e0', next: '#16b3d9', prev: '#16b3d9', trash: '#e0564f', note: '#f29a3c' });
if (typeof QI !== 'undefined') QI.picture = MI.picture;
if ($('#lkbg')) {
  $('#lkbg').onclick = () => lookPick('bg');
  $('#lkbgnext').onclick = () => lookNext();
  $('#lkbgdel').onclick = () => lookRemove('bg');
  $('#lkmu').onclick = () => lookPick('music');
  $('#lkmudel').onclick = () => lookRemove('music');
}
loadLooks();
