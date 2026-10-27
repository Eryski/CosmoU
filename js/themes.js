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
  {
    id: 'gameandwatch',
    name: 'Game & Watch',
    desc: 'Silver LCD, black segments, red buttons',
    flat: 1,
    clock: 'plain',
    pix: 1,
    pal: 'gw',
  },
  {
    id: 'gbpocket',
    name: 'Game Boy Pocket',
    desc: 'Slim and silver with a crisp grey-green screen',
    flat: 1,
    clock: 'plain',
    pix: 1,
    pal: 'gp',
  },
  { id: 'gbcolor', name: 'Game Boy Color', desc: 'Atomic purple plastic and bright colors', flat: 1, clock: 'plain', pix: 1 },
  { id: 'gba', name: 'Game Boy Advance', desc: 'Indigo plastic, a wide screen, deep colors', flat: 1, clock: 'line' },
  { id: 'gbasp', name: 'Game Boy Advance SP', desc: 'Pearl blue and silver with a front light', flat: 1, clock: 'line' },
  { id: 'gbmicro', name: 'Game Boy Micro', desc: 'Brushed metal, tiny and sleek', flat: 1, clock: 'line' },
];
// --- Own themes: packs the user added in Settings → Appearance (see main.js "Own themes") ---
// The file is checked in main.js (only hex colors and fixed choices), so these values are safe to put into CSS.
const mixC = (a, b, p) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
function lumOf(hex) {
  const v = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const onColor = hex => (lumOf(hex) > 0.4 ? '#101318' : '#ffffff');
const OWN_FONTS = {
  rounded: "'Nunito', 'Varela Round', 'Segoe UI Rounded', 'Arial Rounded MT Bold', 'Segoe UI', sans-serif",
  pixel: "'Lucida Console', Consolas, monospace",
  mono: "Consolas, 'Cascadia Mono', 'Lucida Console', monospace",
  serif: "Georgia, 'Times New Roman', serif",
};
const OWN_CORNERS = { square: ['2px', '3%'], rounded: ['8px', '10%'], round: ['14px', '14%'] };
// Picture backgrounds: a small inline SVG built only from the checked hex colors (no outside files, no scripts).
function svgBg(body, aspect = 'none') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="${aspect}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") center / 100% 100% no-repeat`;
}
function svgDust(n, seed, [x0, x1, y0, y1], color, rmax) {
  let s = seed,
    out = '';
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++)
    out += `<circle cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" r="${(0.8 + r() * rmax).toFixed(1)}" fill="${color}" fill-opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  return out;
}
const svgGrad = (id, a, b, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
function xmbBackground(c, second, kind) {
  const t = c.text,
    sel = c.selection,
    ac = c.accent || sel;
  const base =
    `<defs>${svgGrad('g', c.background, second)}` +
    `<filter id="b" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>` +
    `<filter id="b2" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>` +
    `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t}" stop-opacity=".30"/><stop offset=".5" stop-color="${t}" stop-opacity=".14"/><stop offset="1" stop-color="${t}" stop-opacity=".05"/></linearGradient>` +
    `<linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t}" stop-opacity="0"/><stop offset=".45" stop-color="${t}" stop-opacity=".7"/><stop offset="1" stop-color="${t}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="rs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ac}" stop-opacity="0"/><stop offset=".55" stop-color="${ac}" stop-opacity=".8"/><stop offset="1" stop-color="${ac}" stop-opacity=".1"/></linearGradient>` +
    `<radialGradient id="o" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="${sel}" stop-opacity=".35"/><stop offset="1" stop-color="${sel}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="1600" height="900" fill="url(#g)"/>`;
  if (kind === 'xmb')
    // PSP: one wide white wave, brighter below it
    return svgBg(
      base +
        `<rect width="1600" height="900" fill="url(#o)"/><path d="M0 640 C260 500 560 520 860 610 S1380 720 1600 560 L1600 900 L0 900Z" fill="url(#w)"/><path d="M0 640 C260 500 560 520 860 610 S1380 720 1600 560" fill="none" stroke="${t}" stroke-opacity=".5" stroke-width="3" filter="url(#b)"/><path d="M0 700 C300 600 640 700 980 690 S1400 640 1600 600" fill="none" stroke="${t}" stroke-opacity=".22" stroke-width="2"/>`,
    );
  if (kind === 'xmbdust')
    // PS3: light ribbons with floating sparkles
    return svgBg(
      base +
        `<rect width="1600" height="900" fill="url(#o)"/>` +
        `<path d="M0 650 C320 590 560 740 900 700 S1380 600 1600 540 L1600 610 C1380 680 1100 820 820 800 S280 700 0 750Z" fill="url(#r)" opacity=".85" filter="url(#b)"/>` +
        `<path d="M0 760 C320 700 560 820 900 780 S1380 700 1600 660 L1600 700 C1380 750 1100 880 800 870 S300 800 0 850Z" fill="url(#r)" opacity=".6" filter="url(#b)"/>` +
        `<path d="M0 700 C320 640 560 770 900 730 S1380 640 1600 590" fill="none" stroke="${t}" stroke-opacity=".8" stroke-width="2.5" filter="url(#b)"/>` +
        `<path d="M0 800 C340 740 620 850 940 820 S1400 750 1600 720" fill="none" stroke="${t}" stroke-opacity=".4" stroke-width="2"/>` +
        svgDust(110, 7, [0, 1600, 520, 890], t, 2),
    );
  // PSX: a dark screen with one blue swoosh in the lower right
  return svgBg(
    base +
      `<ellipse cx="1300" cy="790" rx="640" ry="190" fill="${ac}" fill-opacity=".5" filter="url(#b2)"/>` +
      `<path d="M380 890 C760 760 1100 640 1600 640 L1600 700 C1160 710 820 810 560 900Z" fill="url(#rs)" filter="url(#b)"/>` +
      `<path d="M440 900 C800 790 1140 700 1600 700" fill="none" stroke="${t}" stroke-opacity=".6" stroke-width="2" filter="url(#b)"/>` +
      svgDust(45, 11, [700, 1600, 620, 900], t, 1.4),
  );
}
function ownBackground(t, c) {
  const line = mixC(c.text, 'transparent', 7),
    second = c.background2 || mixC(c.selection, c.background, 22);
  if (t.background === 'xmb' || t.background === 'xmbdust' || t.background === 'xmbnight')
    return xmbBackground(c, second, t.background === 'xmbnight' ? 'night' : t.background);
  const edge = mixC('#000', 'transparent', 62);
  return {
    // PS1 memory card screen: a grey board of beveled cells
    tiles: `linear-gradient(transparent calc(100% - 3px), ${edge} calc(100% - 3px)) 0 0 / 104px 104px, linear-gradient(90deg, transparent calc(100% - 3px), ${edge} calc(100% - 3px)) 0 0 / 104px 104px, linear-gradient(transparent calc(100% - 4px), ${mixC('#fff', 'transparent', 45)} calc(100% - 4px) calc(100% - 3px), transparent calc(100% - 3px)) 0 0 / 104px 104px, linear-gradient(90deg, transparent calc(100% - 4px), ${mixC('#fff', 'transparent', 45)} calc(100% - 4px) calc(100% - 3px), transparent calc(100% - 3px)) 0 0 / 104px 104px, linear-gradient(${c.background}, ${second})`,
    // PS2: deep blue haze with a lit centre and faint rays
    haze: `linear-gradient(112deg, transparent 38%, ${mixC(c.text, 'transparent', 5)} 44%, transparent 52%), linear-gradient(104deg, transparent 56%, ${mixC(c.text, 'transparent', 4)} 62%, transparent 70%), radial-gradient(ellipse 85% 75% at 32% 44%, ${second}, ${c.background} 85%)`,
    // PS4: dark blue with large soft facets
    facets: svgBg(
      `<defs>${svgGrad('g', c.background, second)}${svgGrad('f', c.text, c.selection)}</defs><rect width="1600" height="900" fill="url(#g)"/><g fill="url(#f)"><polygon points="0,900 520,300 760,900" fill-opacity=".10"/><polygon points="360,0 980,0 640,520" fill-opacity=".07"/><polygon points="900,900 1300,380 1600,900" fill-opacity=".09"/><polygon points="1100,0 1600,0 1600,420" fill-opacity=".06"/><polygon points="0,0 360,0 0,380" fill-opacity=".06"/><polygon points="620,900 960,560 1180,900" fill-opacity=".05"/></g>`,
    ),
    // PS Vita: dark blue LiveArea with floating ring bubbles (kept round)
    bokeh: svgBg(
      `<defs>${svgGrad('g', c.background, second)}<radialGradient id="l" cx=".2" cy=".15" r=".9"><stop offset="0" stop-color="${c.selection}" stop-opacity=".35"/><stop offset="1" stop-color="${c.selection}" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#g)"/><rect width="1600" height="900" fill="url(#l)"/><g fill="${c.text}" fill-opacity=".05" stroke="${c.text}" stroke-opacity=".28" stroke-width="2"><circle cx="210" cy="250" r="90"/><circle cx="470" cy="640" r="140"/><circle cx="880" cy="170" r="60"/><circle cx="1130" cy="540" r="110"/><circle cx="1420" cy="230" r="150"/><circle cx="1010" cy="800" r="50"/><circle cx="260" cy="830" r="38"/><circle cx="700" cy="420" r="30"/><circle cx="1500" cy="760" r="70"/></g>`,
      'xMidYMid slice',
    ),
    // PS5: near-black with a cool fog at the top
    fog: `radial-gradient(ellipse 90% 60% at 24% 0%, ${mixC(c.selection, 'transparent', 22)}, transparent 70%), radial-gradient(ellipse 70% 50% at 100% 100%, ${mixC(c.text, 'transparent', 7)}, transparent 70%), linear-gradient(${c.background}, ${second})`,
    // PocketStation: a small LCD with a fine pixel grid
    lcd: `repeating-linear-gradient(0deg, transparent 0 3px, ${mixC(c.text, 'transparent', 9)} 3px 4px), repeating-linear-gradient(90deg, transparent 0 3px, ${mixC(c.text, 'transparent', 9)} 3px 4px), linear-gradient(${c.background}, ${second})`,
    plain: c.background,
    gradient: `linear-gradient(${c.background}, ${second})`,
    stars: `radial-gradient(1.2px 1.2px at 12% 18%, ${c.text} 60%, transparent 70%) 0 0 / 40px 34px, radial-gradient(1px 1px at 64% 52%, ${c.text} 60%, transparent 70%) 0 0 / 57px 44px, linear-gradient(${c.background}, ${second})`,
    grid: `repeating-linear-gradient(0deg, transparent 0 23px, ${line} 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, ${line} 23px 24px), ${c.background}`,
    dots: `radial-gradient(circle, ${mixC(c.text, 'transparent', 14)} 1.5px, transparent 2px) 0 0 / 22px 22px, ${c.background}`,
    stripes: `repeating-linear-gradient(135deg, transparent 0 14px, ${mixC(c.text, 'transparent', 5)} 14px 28px), ${c.background}`,
    scanlines: `repeating-linear-gradient(0deg, transparent 0 2px, ${mixC(c.text, 'transparent', 6)} 2px 3px), ${c.background}`,
    waves: `radial-gradient(150% 38% at 8% 108%, ${mixC(c.selection, 'transparent', 30)}, transparent 70%), radial-gradient(130% 34% at 92% 96%, ${mixC(c.text, 'transparent', 11)}, transparent 70%), radial-gradient(170% 28% at 50% 70%, ${mixC(c.selection, 'transparent', 14)}, transparent 70%), linear-gradient(165deg, ${c.background}, ${second})`,
    bubbles: `radial-gradient(circle 70px at 12% 26%, ${mixC(c.text, 'transparent', 12)}, transparent 72%), radial-gradient(circle 130px at 84% 18%, ${mixC(c.selection, 'transparent', 16)}, transparent 72%), radial-gradient(circle 55px at 70% 78%, ${mixC(c.text, 'transparent', 10)}, transparent 72%), radial-gradient(circle 100px at 24% 88%, ${mixC(c.selection, 'transparent', 14)}, transparent 72%), radial-gradient(circle 40px at 52% 42%, ${mixC(c.text, 'transparent', 8)}, transparent 72%), linear-gradient(${c.background}, ${second})`,
    towers: `linear-gradient(0deg, ${mixC(c.selection, 'transparent', 38)}, transparent) 9% 100% / 26px 58% no-repeat, linear-gradient(0deg, ${mixC(c.selection, 'transparent', 30)}, transparent) 21% 100% / 18px 76% no-repeat, linear-gradient(0deg, ${mixC(c.text, 'transparent', 22)}, transparent) 38% 100% / 22px 48% no-repeat, linear-gradient(0deg, ${mixC(c.selection, 'transparent', 34)}, transparent) 57% 100% / 30px 68% no-repeat, linear-gradient(0deg, ${mixC(c.text, 'transparent', 18)}, transparent) 73% 100% / 16px 54% no-repeat, linear-gradient(0deg, ${mixC(c.selection, 'transparent', 36)}, transparent) 90% 100% / 24px 72% no-repeat, linear-gradient(${c.background}, ${second})`,
  }[t.background];
}
function ownVars(t, c) {
  const sel = c.selection,
    ac = c.accent || sel,
    [trad, warad] = OWN_CORNERS[t.corners] || OWN_CORNERS.rounded;
  const v = {
    '--fade': c.background,
    '--tbg': ownBackground(t, c),
    '--ink': c.text,
    '--mute': mixC(c.text, c.background, 66),
    '--deep': ac,
    '--cyan': ac,
    '--card': c.card,
    '--cardline': mixC(c.text, c.card, 28),
    '--field': mixC(c.text, c.card, 8),
    '--dlg': c.card,
    '--panel': c.card,
    '--act1': sel,
    '--act2': mixC('#000', sel, 20),
    '--acttx': onColor(sel),
    '--wline': mixC(c.text, c.background, 45),
    '--frame': mixC(c.text, c.card, 16),
    '--wsel': sel,
    '--wsel3': mixC(sel, c.background, 45),
    '--wglow': t.selection === 'glow' ? mixC(sel, 'transparent', 60) : 'transparent',
    '--seltx': onColor(sel),
    '--indtx': onColor(sel),
    '--btnbg': mixC(c.text, c.card, 8),
    '--shadow': mixC('#000', 'transparent', 35),
    '--heroshade': mixC(c.background, 'transparent', 88),
    '--barbg': c.card,
    '--trad': trad,
    '--warad': warad,
    '--whrad': warad,
    '--floor': '0.3',
    'color-scheme': lumOf(c.background) < 0.4 ? 'dark' : 'light',
  };
  if (OWN_FONTS[t.font]) ((v['--head'] = OWN_FONTS[t.font]), (v['font-family'] = OWN_FONTS[t.font]));
  return Object.entries(v)
    .map(([k, x]) => `${k}:${x}`)
    .join(';');
}
function ownPreview(t, c) {
  const sel = c.selection;
  return [
    ['--pbg', ownBackground(t, c)],
    ['--ptop', c.card],
    ['--ptops', `0 0 0 1.5px ${mixC(c.text, c.background, 45)}`],
    ['--prad', (OWN_CORNERS[t.corners] || OWN_CORNERS.rounded)[0]],
    ['--pt1', sel],
    ['--pt2', mixC(c.text, c.card, 30)],
    ['--pt3', mixC(c.text, c.card, 30)],
    ['--pts', `0 0 0 2px ${sel}` + (t.selection === 'glow' ? `, 0 0 8px ${mixC(sel, 'transparent', 70)}` : '')],
    ['--pnav', c.card],
    ['--pnavs', `0 0 0 1.5px ${mixC(c.text, c.background, 45)}`],
  ]
    .map(([k, x]) => `${k}:${x}`)
    .join(';');
}
function ownCss(list) {
  return list
    .map(t => {
      const cls = '.theme-' + t.id,
        d = t.colorsDark || t.colors;
      return (
        `body${cls}{${ownVars(t, t.colors)}}html.dark body${cls}{${ownVars(t, d)}}` +
        `.pv-${t.id}{${ownPreview(t, t.colors)}}html.dark .pv-${t.id}{${ownPreview(t, d)}}` +
        (t.font === 'pixel' ? `body${cls} .hero h3{text-transform:uppercase}` : '')
      );
    })
    .join('\n');
}
function ownRegister(list, save) {
  for (let i = THEMES.length - 1; i >= 0; i--) if (THEMES[i].own) THEMES.splice(i, 1);
  let el = document.getElementById('owncss');
  if (!el) {
    el = document.createElement('style');
    el.id = 'owncss';
    document.head.append(el);
  }
  el.textContent = ownCss(list);
  for (const t of list)
    THEMES.push({
      id: t.id,
      name: t.name,
      desc: t.desc,
      author: t.author,
      music: !!(t.music || t.hasMusic),
      own: 1,
      flat: 1,
      clock: 'line',
      brackets: t.selection === 'brackets' ? 1 : 0,
      pix: t.font === 'pixel' ? 1 : 0,
    });
  if (save) {
    try {
      localStorage.setItem('cosmou.ownThemes', JSON.stringify(list));
    } catch {}
  }
}
try {
  const cached = JSON.parse(localStorage.getItem('cosmou.ownThemes') || '[]');
  if (Array.isArray(cached) && cached.length) ownRegister(cached.filter(t => t && /^u-[a-z0-9-]+$/.test(t.id) && t.colors));
} catch {}

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
  for (const p of ['gb', 'vb', 'gw', 'gp']) cl.toggle('pal-' + p, th.pal === p);
  document.querySelectorAll('#themes .thc').forEach(c => {
    const on = c.dataset.s === style;
    c.classList.toggle('on', on);
    c.setAttribute('aria-checked', String(on));
    c.tabIndex = on ? 0 : -1;
  });
  wiiClock();
  parade.sync();
  requestAnimationFrame(() => {
    // during start-up the nav helpers may not exist yet (window.ind is then the #ind element)
    if (typeof ind === 'function') ind();
    if (typeof vind === 'function') vind();
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
  gameandwatch: 'Segment Morning',
  gbpocket: 'Pocket Silver',
  gbcolor: 'Atomic Purple',
  gba: 'Indigo Advance',
  gbasp: 'Pearl Light',
  gbmicro: 'Brushed Metal',
};
let musicBuiltin = false;
async function themedMusic(m, id = style) {
  musicBuiltin = !!(m && m.builtin);
  if (!musicBuiltin || !window.api) return m;
  const t = await api.themeMusic(id);
  if (!t) return m;
  const own = THEMES.find(x => x.id === id && x.own);
  return { url: t.url, name: own ? own.name + ' · theme music' : THEME_TUNE[id] + ' · CosmoU music' };
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
// groups for the filter above the theme gallery
const THEME_GROUPS = [
  ['all', 'All'],
  ['modern', 'Wii U & Switch'],
  ['home', 'Home consoles'],
  ['hand', 'Handhelds'],
  ['own', 'Own'],
];
function themeGroup(t) {
  if (t.own) return 'own';
  if (['liquid-glass', 'wii-u', 'classic-wii', 'plaza', 'switch', 'switch2'].includes(t.id)) return 'modern';
  if (['n64', 'gamecube', 'snes', 'nes', 'virtualboy'].includes(t.id)) return 'home';
  return 'hand';
}
let themeFilter = 'all';
function themeFilterUi() {
  const box = $('#thf');
  if (!box) return;
  const n = g => (g === 'all' ? THEMES.length : THEMES.filter(t => themeGroup(t) === g).length);
  box.replaceChildren();
  for (const [g, label] of THEME_GROUPS) {
    if (g === 'own' && !n('own')) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thfb' + (g === themeFilter ? ' on' : '');
    b.setAttribute('aria-pressed', String(g === themeFilter));
    b.innerHTML = '<span></span><i></i>';
    b.firstChild.textContent = label;
    b.lastChild.textContent = n(g);
    b.onclick = () => {
      themeFilter = g;
      $('#themes').dataset.f = g;
      themeFilterUi();
      blip('move');
    };
    box.append(b);
  }
  const r = document.createElement('button');
  r.type = 'button';
  r.className = 'thfb rnd';
  r.title = 'Pick a random theme';
  r.textContent = '🎲 Surprise me';
  r.onclick = () => {
    const pool = THEMES.filter(t => t.id !== style && (themeFilter === 'all' || themeGroup(t) === themeFilter));
    if (pool.length) setTheme(pool[(Math.random() * pool.length) | 0].id);
  };
  box.append(r);
  if (themeFilter === 'own' && !n('own')) themeFilter = 'all';
  $('#themes').dataset.f = themeFilter;
}
function buildPicker() {
  const box = $('#themes');
  box.textContent = '';
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thc' + (t.own ? ' own' : '');
    b.dataset.s = t.id;
    b.dataset.grp = themeGroup(t);
    b.setAttribute('role', 'radio');
    b.innerHTML =
      `<span class="pv pv-${t.id}" aria-hidden="true"><i class="pv-top"></i><i class="pv-t"></i><i class="pv-t"></i>` +
      `<i class="pv-t"></i><i class="pv-x"></i><i class="pv-nav"></i></span><span class="thn"></span><span class="thd"></span>`;
    b.querySelector('.thn').textContent = t.name;
    b.querySelector('.thd').textContent = t.desc;
    if (t.own) {
      const tag = document.createElement('span');
      tag.className = 'ottag';
      tag.textContent = t.music ? 'Own · music' : 'Own';
      b.querySelector('.thn').append(tag);
    }
    b.onclick = () => setTheme(t.id);
    box.append(b);
  }
  box.querySelectorAll('.thc').forEach(c => {
    const on = c.dataset.s === style;
    c.classList.toggle('on', on);
    c.setAttribute('aria-checked', String(on));
    c.tabIndex = on ? 0 : -1;
  });
  themeFilterUi();
}
buildPicker();
// arrow keys move through the themes like a radio group
$('#themes').addEventListener('keydown', e => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!d) return;
  e.preventDefault();
  const i = THEMES.findIndex(t => t.id === style);
  setTheme(THEMES[(i + d + THEMES.length) % THEMES.length].id, true);
});

// --- Own theme button: add a theme file, share or remove the selected own theme ---
const otMsg = (t, bad) => {
  const m = $('#otmsg');
  m.textContent = t || '';
  m.classList.toggle('bad', !!bad);
};
function ownUi() {
  const cur = THEMES.find(t => t.id === style),
    own = !!(cur && cur.own);
  $('#otshare').hidden = !own;
  $('#otdel').hidden = !own;
  $('#otdel').textContent = 'Remove';
  $('#otdel').classList.remove('arm');
}
async function ownLoad() {
  if (!window.api || !api.ownThemes) return;
  const list = await api.ownThemes();
  const sig = l =>
    JSON.stringify(l.map(t => [t.id, t.name, t.colors, t.colorsDark, t.background, t.selection, t.font, t.corners, !!t.music]));
  const have = THEMES.filter(t => t.own).length;
  if (sig(list) !== sig(JSON.parse(localStorage.getItem('cosmou.ownThemes') || '[]')) || have !== list.length) {
    ownRegister(list, true);
    buildPicker();
    applyStyle();
  }
  if (!THEMES.some(t => t.id === style)) {
    style = 'liquid-glass';
    try {
      localStorage.setItem('cosmou.style', style);
    } catch {}
    applyStyle();
  }
  ownUi();
}
$('#otadd').onclick = async () => {
  if (!window.api || !api.ownThemeImport) return;
  const r = await api.ownThemeImport();
  if (!r || r.cancel) return;
  if (r.error) return otMsg(r.error, true);
  await ownLoad();
  setTheme(r.theme.id);
  otMsg(
    `Added “${r.theme.name}”` +
      (r.hasMusic
        ? musicBuiltin
          ? ' with its music.'
          : ' – its music is not used while your own music file is set (Sound & Music).'
        : '.'),
  );
};
$('#otshare').onclick = async () => {
  const r = await api.ownThemeExport(style);
  if (!r || r.cancel) return;
  otMsg(r.error || 'Saved. Send that file to a friend or post it on Discord.', !!r.error);
};
$('#otdel').onclick = async () => {
  const b = $('#otdel');
  if (!b.classList.contains('arm')) {
    b.classList.add('arm');
    b.textContent = 'Really remove?';
    setTimeout(() => ownUi(), 3500);
    return;
  }
  const id = style;
  await api.ownThemeRemove(id);
  otMsg('Theme removed.');
  await ownLoad();
};
const _applyStyleOwn = applyStyle;
applyStyle = function () {
  _applyStyleOwn.apply(this, arguments);
  if (document.getElementById('otshare')) ownUi();
};
ownLoad();

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
        ...(b
          ? { fc: b.fc, bc: b.bc, ey: b.ey, mo: b.mo, acc: b.acc, hr: b.hr, hc: b.hc, gl: b.gl }
          : { ey: i % 4, mo: i % 3, acc: i % 4, hr: i % 2 ? 1 + (i % 7) : 0, hc: HAIR[i % HAIR.length] }),
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
