// CosmoU – Themes: the visual skin of the launcher. Independent from the view (Covers, Grid, Wii U Look).
// flat: opaque panels with an outline · clock: bottom clock style · brackets: corner-bracket selection
// pix: chunky retro lettering · pal: four-shade picture palette
const THEMES = [
  { id: 'liquid-glass', name: 'Liquid Glass', desc: 'Modern, transparent and light' },
  { id: 'wii-u', name: 'Wii U', desc: 'Bright and glossy like the Wii U menu' },
  { id: 'classic-wii', name: 'Classic Wii', desc: 'Soft and simple, inspired by the original Wii menu', flat: 1, clock: 'bar' },
  { id: 'plaza', name: 'Plaza', desc: 'Warm pastel colors, more buddies, playful' },
  { id: 'switch', name: 'Switch', desc: 'Clean grey and white, turquoise selection', flat: 1, clock: 'line' },
  { id: 'switch2', name: 'Switch 2', desc: 'Rounder and softer, a modern hybrid look', flat: 1, clock: 'line' },
  { id: 'ds', name: 'DS', desc: 'Grid paper, grey boxes and blue corners', flat: 1, clock: 'plain', brackets: 1 },
  { id: 'dsi', name: 'DSi', desc: 'White lines, rounded panels, teal accents', flat: 1, clock: 'line' },
  { id: '3ds', name: '3DS', desc: 'Soft grid, framed icons, green corners', flat: 1, clock: 'line', brackets: 1 },
  { id: 'n64', name: 'N64', desc: 'A starry night sky and grey cartridges', flat: 1, clock: 'plain', pix: 1 },
  { id: 'gamecube', name: 'GameCube', desc: 'Dark indigo glass with a violet glow', flat: 1 },
  { id: 'gameboy', name: 'Game Boy', desc: 'Everything in four shades of green', flat: 1, clock: 'plain', pix: 1, pal: 'gb' },
  { id: 'virtualboy', name: 'Virtual Boy', desc: 'Red on black, nothing else', flat: 1, pal: 'vb' },
  { id: 'snes', name: 'SNES', desc: 'Light grey plastic with lavender and purple', flat: 1, clock: 'line' },
  { id: 'nes', name: 'NES', desc: 'Grey and black, boxy, with red accents', flat: 1, clock: 'band', pix: 1 },
];
// older versions saved 'glass' or 'classic' as the style
const OLD_STYLE = { glass: 'liquid-glass', classic: 'wii-u' };
let style = 'liquid-glass';
try {
  const v = localStorage.getItem('cosmou.style');
  style = OLD_STYLE[v] || (THEMES.some(t => t.id === v) ? v : 'liquid-glass');
} catch {}
const themeName = () => (THEMES.find(t => t.id === style) || THEMES[0]).name;

function applyStyle() {
  const cl = document.body.classList;
  const th = THEMES.find(t => t.id === style) || THEMES[0];
  for (const t of THEMES) cl.toggle('theme-' + t.id, t.id === style);
  // Wii U and all flat themes share the opaque, non-glass base
  cl.toggle('classic', style === 'wii-u' || !!th.flat);
  cl.toggle('flat', !!th.flat);
  for (const c of ['bar', 'line', 'plain', 'band']) cl.toggle('clock-' + c, th.clock === c);
  cl.toggle('brackets', !!th.brackets);
  cl.toggle('pix', !!th.pix);
  cl.toggle('pal-gb', th.pal === 'gb');
  cl.toggle('pal-vb', th.pal === 'vb');
  document.querySelectorAll('#themes .thc').forEach(c => {
    const on = c.dataset.s === style;
    c.classList.toggle('on', on);
    c.setAttribute('aria-checked', String(on));
    c.tabIndex = on ? 0 : -1;
  });
  wiiClock();
  parade.sync();
  requestAnimationFrame(() => {
    ind();
    vind();
  });
}
function setTheme(id, focus) {
  if (!THEMES.some(t => t.id === id)) return;
  if (id === style) return;
  withVT(() => {
    style = id;
    try {
      localStorage.setItem('cosmou.style', style);
    } catch {}
    applyStyle();
    // the plaza crowd size depends on the theme
    if (mode === 'wiiu' && !isHome()) fitMii();
    if (focus) $('#themes .thc.on').focus();
  });
  blip('open');
  swapThemeMusic(id);
}

// --- Menu music: each theme has its own original tune, as long as no own music file is chosen ---
const THEME_TUNE = {
  'liquid-glass': 'Glass Lagoon',
  'wii-u': 'Home Sweet Menu',
  'classic-wii': 'Channel Calm',
  plaza: 'Buddy Parade',
  switch: 'Quiet Home',
  switch2: 'Next Level Lounge',
  ds: 'Dual Screen Days',
  dsi: 'Camera Café',
  '3ds': 'Pocket Sunshine',
  n64: 'Cartridge Night',
  gamecube: 'Indigo Cube',
  gameboy: 'Green Screen',
  virtualboy: 'Red Horizon',
  snes: '16-Bit Meadow',
  nes: '8-Bit Morning',
};
let musicBuiltin = false;
async function themedMusic(m, id = style) {
  musicBuiltin = !!(m && m.builtin);
  if (!musicBuiltin || !window.api) return m;
  const t = await api.themeMusic(id);
  return t ? { url: t.url, name: THEME_TUNE[id] + ' · CosmoU music' } : m;
}
async function swapThemeMusic(id) {
  if (!musicBuiltin || !window.api) return;
  const t = await themedMusic({ builtin: true }, id);
  if (!t || !t.url) return;
  const old = bgMusic,
    playing = old && !old.paused;
  if (old) {
    // short fade so the switch does not cut hard
    const v0 = old.volume;
    for (let i = 1; i <= 8; i++) setTimeout(() => (old.volume = Math.max(0, v0 * (1 - i / 8))), i * 40);
    setTimeout(() => old.pause(), 360);
  }
  setTimeout(() => {
    setMusic(t);
    musicUi();
    if (playing && musicOn) bgMusic.play().catch(() => {});
  }, 340);
}

// --- Theme picker in Settings → Appearance ---
(function buildPicker() {
  const box = $('#themes');
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thc';
    b.dataset.s = t.id;
    b.setAttribute('role', 'radio');
    b.innerHTML =
      `<span class="pv pv-${t.id}" aria-hidden="true"><i class="pv-top"></i><i class="pv-t"></i><i class="pv-t"></i>` +
      `<i class="pv-t"></i><i class="pv-x"></i><i class="pv-nav"></i></span><span class="thn"></span><span class="thd"></span>`;
    b.querySelector('.thn').textContent = t.name;
    b.querySelector('.thd').textContent = t.desc;
    b.onclick = () => setTheme(t.id);
    box.append(b);
  }
  // arrow keys move through the themes like a radio group
  box.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const i = THEMES.findIndex(t => t.id === style);
    setTheme(THEMES[(i + d + THEMES.length) % THEMES.length].id, true);
  });
})();

// --- Classic Wii: a clock in the bottom bar, like the original menu ---
let clockTimer = 0;
function wiiClock() {
  clearInterval(clockTimer);
  if (!(THEMES.find(t => t.id === style) || {}).clock) return;
  const tick = () => {
    const d = new Date();
    $('#wclk b').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    $('#wclk small').textContent =
      d.toLocaleDateString('en', { weekday: 'short' }) +
      ' ' +
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' });
  };
  tick();
  clockTimer = setInterval(tick, 15000);
}

// --- Plaza: buddies stroll along the bottom of the window in Covers and Grid ---
const parade = {
  on: false,
  list: [],
  last: 0,
  sync() {
    const want = style === 'plaza' && mode !== 'wiiu' && !document.hidden;
    $('#pzc').hidden = !(style === 'plaza' && mode !== 'wiiu');
    if (want && !this.on) {
      this.fit();
      this.on = true;
      this.last = performance.now();
      if (reduceMotion()) {
        this.draw(this.last, true);
        this.on = false;
      } else requestAnimationFrame(t => this.frame(t));
    } else if (!want) this.on = false;
  },
  fit() {
    const c = $('#pzc'),
      dpr = Math.min(2, devicePixelRatio || 1);
    c.width = innerWidth * dpr;
    c.height = c.offsetHeight * dpr || 130 * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.max(6, Math.min(12, Math.round(innerWidth / 150)));
    this.list = Array.from({ length: n }, (_, i) => {
      const b = buddies[i];
      return {
        x: (innerWidth * (i + 0.5)) / n + (Math.random() - 0.5) * 60,
        y: 0,
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: 22 + Math.random() * 18,
        st: 'walk',
        until: performance.now() + 1500 + Math.random() * 4000,
        v: 30,
        t0: 0,
        ph: Math.random() * 6,
        c: i % 6,
        lx: 0,
        ba: 0,
        ...(b ? { fc: b.fc, bc: b.bc, ey: b.ey, mo: b.mo, acc: b.acc } : { ey: i % 4, mo: i % 3, acc: i % 4 }),
      };
    });
  },
  frame(now) {
    if (!this.on) return;
    this.draw(now);
    requestAnimationFrame(t => this.frame(t));
  },
  draw(now, still) {
    const c = $('#pzc'),
      x = c.getContext('2d'),
      W = innerWidth,
      H = c.offsetHeight || 130,
      dt = Math.min(0.05, (now - this.last) / 1000 || 0),
      t = now / 1000;
    this.last = now;
    x.clearRect(0, 0, W, H);
    for (const m of this.list) {
      if (!still) {
        if (now > m.until) {
          const r = Math.random();
          m.st = r < 0.6 ? 'walk' : r < 0.78 ? 'wave' : r < 0.9 ? 'hop' : 'idle';
          if (m.st === 'walk' && Math.random() < 0.3) m.dir *= -1;
          m.t0 = now;
          m.until = now + (m.st === 'walk' ? 2500 + Math.random() * 4500 : m.st === 'hop' ? 1000 : 1800);
        }
        if (m.st === 'walk') {
          m.v = m.sp;
          m.x += m.dir * m.sp * dt;
          if (m.x < -30) m.x = W + 30;
          if (m.x > W + 30) m.x = -30;
        } else m.v = 0;
      }
      m.lx += ((m.st === 'walk' ? m.dir : 0) - m.lx) * Math.min(1, dt * 6);
      m.y = H - 12;
      drawBuddy(x, m, t, 1.35, false);
    }
  },
};
addEventListener('resize', () => parade.on && parade.fit());
document.addEventListener('visibilitychange', () => parade.sync());
// the view lives in body classes (wiiu, …): follow it
new MutationObserver(() => parade.sync()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
