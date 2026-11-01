// CosmoU – a picture and music for each console (Settings → Appearance).
// Every console (Wii U, Switch, 3DS …) can have its own background picture and its own menu music. The picture lies
// behind the glass (best with Liquid Glass) with a soft veil so text stays readable; the music plays instead of the
// theme's music while that console is on screen. The files live in CosmoU's own folder (main.js / mobile-api.js).
let sysLooks = { bg: {}, music: {} };
// this console's picture or music (or null)
function lookOf(kind, k) {
  const sys = k || (typeof curSys !== 'undefined' ? curSys : 'wiiu');
  return ((sysLooks && sysLooks[kind]) || {})[sys] || null;
}
// an own theme with a picture shows it when the console has none of its own
function themePicture() {
  const t = typeof THEMES !== 'undefined' && THEMES.find(x => x.id === style && x.own && x.image);
  return t ? { url: t.image } : null;
}
function applyBackdrop() {
  const el = $('#bgpic');
  if (!el) return;
  const b = lookOf('bg') || themePicture();
  document.body.classList.toggle('has-pic', !!b);
  el.style.backgroundImage = b ? 'url("' + String(b.url).replace(/["\\]/g, '\\$&') + '")' : '';
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
function looksUi() {
  const name = typeof SYS !== 'undefined' && SYS[curSys] ? SYS[curSys].name : 'Wii U';
  document.querySelectorAll('.lksys').forEach(e => (e.textContent = name));
  const b = lookOf('bg'),
    m = lookOf('music');
  if (!$('#lkbg')) return;
  $('#lkbgdel').hidden = !b;
  $('#lkmudel').hidden = !m;
  $('#lkbg').textContent = b ? 'Change picture…' : 'Choose picture…';
  $('#lkmu').textContent = m ? 'Change music…' : 'Choose music…';
  $('#lkmuname').textContent = m ? '♪ ' + m.name : '';
  $('#lkpv').hidden = !b;
  if (b) $('#lkpv').style.backgroundImage = 'url("' + String(b.url).replace(/["\\]/g, '\\$&') + '")';
}
async function loadLooks() {
  if (!window.api || !api.sysLooks) return;
  try {
    sysLooks = (await api.sysLooks()) || { bg: {}, music: {} };
  } catch {
    sysLooks = { bg: {}, music: {} };
  }
  applyBackdrop();
  looksUi();
  // music that started before this list was there
  if (lookOf('music') && bgMusic) swapLookMusic();
}
async function lookPick(kind) {
  if (!need()) return;
  const r = await api.sysLookPick(curSys, kind);
  if (!r) return;
  if (r.error) return toast(r.error, 6000);
  sysLooks[kind] = { ...(sysLooks[kind] || {}), [curSys]: { url: r.url, name: r.name } };
  blip('open');
  looksUi();
  if (kind === 'bg') {
    applyBackdrop();
    toast(style === 'liquid-glass' || style.startsWith('u-') ? '✓ Your picture for ' + SYS[curSys].name : '✓ Picture set – it looks best with the Liquid Glass theme');
  } else {
    musicOn = true;
    try {
      localStorage.setItem('cosmou.music', 'true');
    } catch {}
    await swapLookMusic();
    toast('✓ Music for ' + SYS[curSys].name + ': ' + r.name);
  }
}
async function lookRemove(kind) {
  if (!need()) return;
  await api.sysLookRemove(curSys, kind);
  if (sysLooks[kind]) delete sysLooks[kind][curSys];
  looksUi();
  if (kind === 'bg') applyBackdrop();
  else await swapLookMusic();
  toast(kind === 'bg' ? '✓ Picture removed' : '✓ Back to the theme music');
}
if ($('#lkbg')) {
  $('#lkbg').onclick = () => lookPick('bg');
  $('#lkbgdel').onclick = () => lookRemove('bg');
  $('#lkmu').onclick = () => lookPick('music');
  $('#lkmudel').onclick = () => lookRemove('music');
}
loadLooks();
