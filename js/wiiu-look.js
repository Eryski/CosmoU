// CosmoU – Wii U Look: floating icons on the plaza and the little "Cosmo buddies" characters.
const WU_PER = 9,
  wuEls = new Map(),
  wuLay = {};
const halton = (i, b) => {
  let f = 1,
    r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
};
const wsc = y => 0.6 + ((y - 0.2) / 0.4) * 0.55;
function wuLayout(n, page, base, W, H) {
  // organic scatter over the floor, relaxed so icons never overlap
  const pts = Array.from({ length: n }, (_, k) => ({
    x: 0.1 + 0.8 * halton(k + 1 + page * 13, 2),
    y: 0.22 + 0.38 * halton(k + 1 + page * 13, 3),
  }));
  for (let it = 0; it < 70; it++) {
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        const A = pts[a],
          B = pts[b],
          dx = (B.x - A.x) * W,
          dy = (B.y - A.y) * H,
          d = Math.hypot(dx, dy) || 1,
          min = base * (wsc(A.y) + wsc(B.y)) * 0.56 + 14;
        if (d < min) {
          const p = (min - d) / 2 / d;
          A.x -= (dx * p) / W;
          A.y -= (dy * p) / H;
          B.x += (dx * p) / W;
          B.y += (dy * p) / H;
        }
      }
    for (const p of pts) {
      p.x = Math.max(0.08, Math.min(0.92, p.x));
      p.y = Math.max(0.2, Math.min(0.62, p.y));
    }
  }
  return pts;
}
function buildWiiU(l) {
  const world = $('#wworld'),
    keep = new Set(l.map(x => x.name));
  for (const [k, e] of wuEls)
    if (!keep.has(k)) {
      e.remove();
      wuEls.delete(k);
    }
  const W = innerWidth,
    H = innerHeight,
    idx = Math.max(
      0,
      l.findIndex(x => x.name === sel),
    ),
    page = Math.floor(idx / WU_PER),
    pages = Math.ceil(l.length / WU_PER),
    base = Math.max(104, Math.min(176, H * 0.2));
  let selX = W / 2,
    selY = H * 0.4;
  l.forEach((g, i) => {
    let e = wuEls.get(g.name);
    if (!e) {
      e = document.createElement('div');
      e.className = 'wi';
      e.dataset.g = g.name;
      e.innerHTML = '<div class="wpad"></div><div class="wi-in"><div class="wa"></div></div><span class="wl"></span>';
      e.querySelector('.wl').textContent = g.name;
      e.onclick = () => {
        if (sel !== g.name) {
          sel = g.name;
          render();
        }
      };
      e.onpointerenter = () => hoverCase(e.querySelector('.wa'), g);
      e.onpointerleave = hoverOff;
      e.ondblclick = () => {
        if (sel === g.name) launch(cur());
      };
      world.append(e);
      wuEls.set(g.name, e);
    }
    paint(e.querySelector('.wa'), g);
    const pg = Math.floor(i / WU_PER),
      nOn = Math.min(WU_PER, l.length - pg * WU_PER),
      key = pg + '_' + nOn + '_' + W + '_' + H;
    const lay = (wuLay[key] = wuLay[key] || wuLayout(nOn, pg, base, W, H)),
      p = lay[i % WU_PER],
      on = g.name === sel;
    const j = q => {
      const v = Math.sin((i + 1) * 12.9898 + q * 78.233) * 43758.5453;
      return v - Math.floor(v) - 0.5;
    };
    const fy = p.y + (on ? 0.05 : 0);
    e.style.setProperty('--sz', base + 'px');
    e.style.setProperty('--fx', p.x * 100 + '%');
    e.style.setProperty('--fy', fy * 100 + '%');
    e.style.setProperty('--s', wsc(p.y) * (1 + j(8) * 0.16) * (on ? 1.35 : 1));
    e.style.setProperty('--d', 0.5 + p.y * 1.3);
    e.style.setProperty('--dur', 4.6 + j(4) * 2.8 + 's');
    e.style.setProperty('--dl', -(j(5) + 0.5) * 7 + 's');
    e.style.setProperty('--amp', 7 + (j(6) + 0.5) * 8 + 'px');
    e.style.setProperty('--rot', 1.2 + (j(7) + 0.5) * 2.2 + 'deg');
    e.style.zIndex = on ? 60 : Math.round(p.y * 40);
    e.classList.toggle('on', on);
    e.classList.toggle('off', pg !== page);
    if (on) {
      selX = p.x * W;
      selY = fy * H;
    }
  });
  const cg = l[idx];
  if (cg) {
    $('#wt').textContent = cg.name;
    const pt = typeof playLog === 'object' && playLog.playtime ? playLog.playtime[cg.name] : null;
    $('#wm').textContent =
      (favs.has(cg.name) ? '★ ' : '') +
      [
        cg.format,
        pt && pt.sec ? fmtDur(pt.sec) : '',
        pt && pt.last ? 'last ' + dayName(pt.last) : plays[cg.name] ? 'recently played' : '',
      ]
        .filter(Boolean)
        .join(' · ');
  }
  $('#wpg').hidden = pages < 2;
  const dots = $('#wdots');
  dots.replaceChildren();
  for (let q = 0; q < pages; q++) {
    const d = document.createElement('i');
    if (q === page) d.className = 'on';
    dots.append(d);
  }
  $('#wprev').disabled = page <= 0;
  $('#wnext').disabled = page >= pages - 1;
  mii.fx = selX;
  mii.fy = selY;
  if (mii.sel !== sel) {
    mii.sel = sel;
    const now = performance.now();
    mii.list
      .slice()
      .sort((a, b) => Math.hypot(a.x - selX, a.y - selY) - Math.hypot(b.x - selX, b.y - selY))
      .slice(0, 6)
      .forEach(m => {
        m.st = 'look';
        m.t0 = now;
        m.until = now + 2600;
      });
  }
}
// --- "Cosmo buddies": original little characters that wander all over the plaza ---
const mii = { on: false, list: [], last: 0, W: 0, H: 0, px: 0, py: 0, sel: '', fx: 0, fy: 0 };
const FACE = ['#ffd9c2', '#cdeedd', '#d9d2f6', '#cfe7fa', '#fbeab4', '#f9cfe0'],
  BODY = ['#f29a86', '#7fcaa4', '#9b8fe0', '#6fb2e8', '#f0c85a', '#ee8fb6'];
// how many buddies walk around the plaza, per theme
const CROWD = { 'classic-wii': 12, plaza: 56 };
const ds = (y, H) => Math.max(0.5, Math.min(1.35, 0.5 + (y / H - 0.12) * 1.05));
function fitMii(reset) {
  const c = $('#wmii'),
    dpr = Math.min(2, devicePixelRatio || 1);
  mii.W = innerWidth;
  mii.H = innerHeight;
  c.width = mii.W * dpr;
  c.height = mii.H * dpr;
  c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = CROWD[style] || 32;
  if (reset || mii.list.length !== n)
    mii.list = Array.from({ length: n }, (_, i) => {
      const x = mii.W * (0.05 + 0.9 * Math.random()),
        y = mii.H * (0.2 + 0.7 * Math.random());
      return {
        x,
        y,
        tx: x,
        ty: y,
        v: 0,
        st: 'idle',
        until: performance.now() + Math.random() * 2000,
        t0: 0,
        ph: Math.random() * 6,
        c: i % 6,
        acc: i % 3,
        lx: 0,
        ba: 0,
        bub: i % 2 === 0 ? BUBS[(i / 2) % BUBS.length] : '',
      };
    });
  applyBuddies();
}
function miiNext(m, now) {
  const r = Math.random(),
    W = mii.W,
    H = mii.H;
  if (r < 0.45) {
    m.st = 'walk';
    m.tx = Math.max(W * 0.04, Math.min(W * 0.96, m.x + (Math.random() - 0.5) * W * 0.35));
    m.ty = Math.max(H * 0.2, Math.min(H * 0.92, m.y + (Math.random() - 0.5) * H * 0.3));
  } else {
    m.st = r < 0.6 ? 'wave' : r < 0.72 ? 'hop' : r < 0.85 ? 'look' : 'idle';
    m.t0 = now;
    m.until = now + (m.st === 'wave' ? 1900 : m.st === 'hop' ? 1000 : m.st === 'look' ? 2200 : 1200 + Math.random() * 2200);
  }
}
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
const BUBS = [
  'I missed this!',
  'best menu ever',
  'who else is here?',
  'finally!!',
  'this music tho',
  'my childhood',
  'so cozy',
  'gg',
  'this menu >>>',
  'nostalgia hit hard',
  'brb, playing',
  'miss u Wii U',
];
function drawBubble(c, m, u) {
  if (!m.bub || m.ba <= 0.01) return;
  const fs = Math.max(11, 8.6 * u);
  c.save();
  c.globalAlpha = Math.min(1, m.ba);
  c.font = '700 ' + fs + 'px "Segoe UI",Inter,Arial,sans-serif';
  const w = c.measureText(m.bub).width + fs * 1.4,
    h = fs * 1.9,
    x = m.x - w / 2,
    y = m.y - 52 * u - h - (1 - Math.min(1, m.ba)) * 6;
  c.shadowColor = 'rgba(60,80,95,.22)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 3;
  c.fillStyle = '#fff';
  rr(c, x, y, w, h, h / 2);
  c.fill();
  c.beginPath();
  c.moveTo(m.x - fs * 0.5, y + h - 1);
  c.lineTo(m.x, y + h + fs * 0.6);
  c.lineTo(m.x + fs * 0.5, y + h - 1);
  c.closePath();
  c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(120,150,165,.35)';
  c.lineWidth = 1;
  rr(c, x, y, w, h, h / 2);
  c.stroke();
  c.fillStyle = '#3a4a56';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(m.bub, m.x, y + h / 2 + 0.5);
  c.restore();
}
function drawTag(c, m, u) {
  if (!m.name) return;
  const fs = Math.max(10, 7.4 * u);
  c.save();
  c.font = '700 ' + fs + 'px "Segoe UI",Inter,Arial,sans-serif';
  const w = c.measureText(m.name).width + fs * 1.2,
    h = fs * 1.6,
    x = m.x - w / 2,
    y = m.y + 4 * u;
  c.fillStyle = 'rgba(255,255,255,.92)';
  c.shadowColor = 'rgba(60,80,95,.2)';
  c.shadowBlur = 6;
  rr(c, x, y, w, h, h / 2);
  c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = m.bc || '#46525e';
  rr(c, x, y, w, h, h / 2);
  c.globalAlpha = 0.16;
  c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#34424d';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(m.name, m.x, y + h / 2 + 0.5);
  c.restore();
}
function applyBuddies() {
  mii.list.forEach((m, i) => {
    const b = buddies[i];
    if (b)
      Object.assign(m, {
        fc: b.fc,
        bc: b.bc,
        ey: b.ey,
        mo: b.mo,
        acc: b.acc,
        hr: b.hr,
        hc: b.hc,
        gl: b.gl,
        name: b.name,
        bub: '',
      });
    else
      Object.assign(m, {
        fc: '',
        bc: '',
        ey: 0,
        mo: 0,
        acc: i % 3,
        // some of the crowd get hair and glasses too, so the plaza looks more mixed
        hr: i % 3 === 1 ? 1 + (i % 7) : 0,
        hc: HAIR[i % HAIR.length],
        gl: i % 9 === 4 ? 1 + (i % 4) : 0,
        name: '',
        bub: i % 2 === 0 ? BUBS[(i / 2) % BUBS.length] : '',
      });
  });
  if (typeof applyPosts === 'function') applyPosts();
}
function drawBuddy(c, m, t, u, refl) {
  const walk = m.st === 'walk' && m.v > 3,
    sw = Math.sin(t * 9 + m.ph),
    face = m.fc || FACE[m.c],
    body = m.bc || BODY[m.c];
  c.save();
  c.translate(m.x, m.y);
  if (refl) {
    c.scale(1, -1);
    c.globalAlpha = 0.13;
  } else {
    c.fillStyle = 'rgba(70,85,95,.15)';
    c.beginPath();
    c.ellipse(0, 0, 9 * u, 3 * u, 0, 0, 7);
    c.fill();
  }
  const hop = m.st === 'hop' ? -Math.abs(Math.sin(((t * 1000 - m.t0) / 1000) * Math.PI * 2.2)) * 7 * u : 0;
  c.translate(0, hop + (walk ? -Math.abs(sw) * 1.3 * u : -Math.sin(t * 2 + m.ph) * 0.35 * u));
  c.fillStyle = '#8d97a4';
  rr(c, -4.9 * u, -6 * u - (walk ? Math.max(0, sw) * 1.8 * u : 0), 3.8 * u, 6 * u, 1.8 * u);
  c.fill();
  rr(c, 1.1 * u, -6 * u - (walk ? Math.max(0, -sw) * 1.8 * u : 0), 3.8 * u, 6 * u, 1.8 * u);
  c.fill();
  c.fillStyle = body;
  rr(c, -6.4 * u, -20 * u, 12.8 * u, 15 * u, 6 * u);
  c.fill();
  c.lineCap = 'round';
  c.lineWidth = 3 * u;
  c.strokeStyle = body;
  const sa = walk ? sw * 0.55 : 0;
  c.beginPath();
  c.moveTo(-6 * u, -16.5 * u);
  c.lineTo(-8.8 * u + Math.sin(sa) * 1.6 * u, -10 * u);
  c.stroke();
  c.beginPath();
  c.moveTo(6 * u, -16.5 * u);
  let hx = 8.8 * u - Math.sin(sa) * 1.6 * u,
    hy = -10 * u;
  if (m.st === 'wave') {
    const a = -1.25 + Math.sin(t * 13) * 0.4;
    hx = 6 * u + Math.cos(a) * 9 * u;
    hy = -16.5 * u + Math.sin(a) * 9 * u;
  }
  c.lineTo(hx, hy);
  c.stroke();
  c.fillStyle = face;
  c.beginPath();
  c.arc(hx, hy, 1.9 * u, 0, 7);
  c.arc(-8.8 * u + Math.sin(sa) * 1.6 * u, -10 * u, 1.9 * u, 0, 7);
  c.fill();
  // big round head with soft highlight (long hair, ponytail and bun sit behind it)
  const hy0 = -30 * u;
  if (m.hr) buddyHair(c, m, u, hy0, true);
  c.fillStyle = face;
  c.beginPath();
  c.arc(0, hy0, 11 * u, 0, 7);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath();
  c.ellipse(-4.2 * u, hy0 - 5.6 * u, 4 * u, 2.4 * u, -0.5, 0, 7);
  c.fill();
  if (m.hr) buddyHair(c, m, u, hy0, false);
  // little accessory: star antenna, leaf tuft or bow
  c.strokeStyle = '#9aa5b2';
  c.lineWidth = 0.9 * u;
  if (m.acc === 0) {
    c.beginPath();
    c.moveTo(0, hy0 - 10.6 * u);
    c.lineTo(1.6 * u, hy0 - 16 * u);
    c.stroke();
    c.fillStyle = '#ffd35e';
    c.beginPath();
    c.arc(1.8 * u, hy0 - 17 * u, 2.3 * u, 0, 7);
    c.fill();
  } else if (m.acc === 1) {
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(-2.2 * u, hy0 - 12.4 * u, 2.2 * u, 3.6 * u, -0.5, 0, 7);
    c.ellipse(2.2 * u, hy0 - 12.4 * u, 2.2 * u, 3.6 * u, 0.5, 0, 7);
    c.fill();
  } else if (m.acc === 2) {
    c.fillStyle = body;
    c.beginPath();
    c.arc(-3.6 * u, hy0 - 10.8 * u, 2.6 * u, 0, 7);
    c.arc(3.6 * u, hy0 - 10.8 * u, 2.6 * u, 0, 7);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(0, hy0 - 10.8 * u, 1.4 * u, 0, 7);
    c.fill();
  } else if (m.acc === 3) {
    c.fillStyle = body;
    c.beginPath();
    c.arc(0, hy0 - 2.5 * u, 10.4 * u, Math.PI * 1.04, Math.PI * 1.96);
    c.closePath();
    c.fill();
    c.beginPath();
    c.ellipse(5.5 * u, hy0 - 4.2 * u, 6.5 * u, 1.7 * u, 0.08, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.beginPath();
    c.ellipse(-3.5 * u, hy0 - 9.5 * u, 3 * u, 1.4 * u, -0.4, 0, 7);
    c.fill();
  } else if (m.acc >= 5) buddyHat(c, m, u, hy0, body);
  // face
  const bl = Math.abs(Math.sin(t * 0.7 + m.ph)) > 0.985 ? 0.15 : 1,
    lx = m.lx * 1.6 * u;
  const eye = (ex, kind) => {
    c.fillStyle = '#2b2f36';
    c.strokeStyle = '#2b2f36';
    c.lineWidth = 1.1 * u;
    c.lineCap = 'round';
    if (kind === 1) {
      c.beginPath();
      c.arc(ex, hy0 + 1.4 * u, 1.5 * u, 1.15 * Math.PI, 1.85 * Math.PI);
      c.stroke();
    } else if (kind === 2) {
      c.beginPath();
      c.moveTo(ex - 1.5 * u, hy0 + 0.9 * u);
      c.lineTo(ex + 1.5 * u, hy0 + 0.9 * u);
      c.stroke();
    } else {
      c.beginPath();
      c.ellipse(ex, hy0 + 0.6 * u, 1.2 * u, 1.8 * u * bl, 0, 0, 7);
      c.fill();
    }
  };
  const ey = m.ey || 0;
  eye(-3.6 * u + lx, ey === 3 ? 0 : ey);
  eye(3.6 * u + lx, ey === 3 ? 1 : ey);
  c.fillStyle = 'rgba(240,120,120,.3)';
  c.beginPath();
  c.ellipse(-6.4 * u + lx * 0.5, hy0 + 3.6 * u, 1.9 * u, 1.2 * u, 0, 0, 7);
  c.ellipse(6.4 * u + lx * 0.5, hy0 + 3.6 * u, 1.9 * u, 1.2 * u, 0, 0, 7);
  c.fill();
  if (m.mo === 1) {
    c.fillStyle = '#8a4a4a';
    c.beginPath();
    c.arc(lx * 0.6, hy0 + 3.6 * u, 2.3 * u, 0, Math.PI);
    c.closePath();
    c.fill();
  } else if (m.mo === 2) {
    c.fillStyle = '#8a4a4a';
    c.beginPath();
    c.ellipse(lx * 0.6, hy0 + 5 * u, 1.2 * u, 1.5 * u, 0, 0, 7);
    c.fill();
  } else {
    c.strokeStyle = '#8a5050';
    c.lineWidth = 0.9 * u;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(lx * 0.6, hy0 + 3.4 * u, 2.2 * u, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  }
  if (m.gl) buddyGlasses(c, m, u, hy0, lx);
  c.restore();
}
function miiFrame(now) {
  if (!mii.on) return;
  const c = $('#wmii'),
    x = c.getContext('2d'),
    dt = Math.min(0.05, (now - mii.last) / 1000 || 0),
    t = now / 1000;
  mii.last = now;
  for (const m of mii.list) {
    const sp = (mii.H / 720) * 30 * ds(m.y, mii.H);
    let lxT = 0;
    if (m.st === 'walk') {
      const dx = m.tx - m.x,
        dy = m.ty - m.y,
        d = Math.hypot(dx, dy);
      if (d < 4) {
        m.v *= 0.8;
        miiNext(m, now);
      } else {
        m.v += (sp - m.v) * Math.min(1, dt * 4);
        const k = Math.min(1, d / 40);
        m.x += (dx / d) * m.v * k * dt;
        m.y += (dy / d) * m.v * k * dt;
        lxT = Math.sign(dx);
      }
    } else {
      m.v *= 0.85;
      if (now > m.until) miiNext(m, now);
      if (m.st === 'look') lxT = Math.max(-1, Math.min(1, (mii.fx - m.x) / 180));
    }
    m.lx += (lxT - m.lx) * Math.min(1, dt * 6);
    m.ba = Math.max(0, Math.min(1.2, (m.ba || 0) + (m.bub && m.st !== 'walk' ? 1 : -1) * dt * 3));
  }
  x.clearRect(0, 0, mii.W, mii.H);
  const o = mii.list.slice().sort((a, b) => a.y - b.y);
  for (const refl of [true, false])
    for (const m of o) {
      const d = ds(m.y, mii.H);
      x.save();
      x.translate(mii.px * d, mii.py * d);
      drawBuddy(x, m, t, (mii.H / 720) * 1.15 * d, refl);
      x.restore();
    }
  for (const m of o) {
    const d = ds(m.y, mii.H);
    x.save();
    x.translate(mii.px * d, mii.py * d);
    drawTag(x, m, (mii.H / 720) * 1.15 * d);
    drawBubble(x, m, (mii.H / 720) * 1.15 * d);
    x.restore();
  }
  requestAnimationFrame(miiFrame);
}
function startMii() {
  if (mii.on) return;
  mii.on = true;
  fitMii();
  mii.last = performance.now();
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
    const x = $('#wmii').getContext('2d');
    const o = mii.list.slice().sort((a, b) => a.y - b.y);
    for (const refl of [true, false]) for (const m of o) drawBuddy(x, m, 0, (mii.H / 720) * 1.15 * ds(m.y, mii.H), refl);
    mii.on = false;
    return;
  }
  requestAnimationFrame(miiFrame);
}
function stopMii() {
  mii.on = false;
}
