// CosmoU – Themes: the visual skin of the launcher. Independent from the view (Covers, Grid, Wii U Look).
const THEMES = [
  { id: 'liquid-glass', name: 'Liquid Glass', desc: 'Modern, transparent and light' },
  { id: 'wii-u', name: 'Wii U', desc: 'Bright and glossy like the Wii U menu' },
  { id: 'classic-wii', name: 'Classic Wii', desc: 'Soft and simple, inspired by the original Wii menu' },
  { id: 'plaza', name: 'Plaza', desc: 'Warm pastel colors, more buddies, playful' },
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
  for (const t of THEMES) cl.toggle('theme-' + t.id, t.id === style);
  // Wii U and Classic Wii share the opaque, non-glass base
  cl.toggle('classic', style === 'wii-u' || style === 'classic-wii');
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
  if (style !== 'classic-wii') return;
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
