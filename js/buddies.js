// CosmoU – Buddy maker: create your own characters for the Wii U Look plaza.
// --- Buddy maker ---
const SKIN = ['#ffe1cc', '#f6c9a6', '#e2ab84', '#bd845e', '#8d5c3e', '#5e3b27', '#cdeedd', '#d9d2f6', '#cfe7fa', '#fbeab4'];
const OUTFIT = [
  '#f29a86',
  '#e5534b',
  '#f0c85a',
  '#7fcaa4',
  '#3fae8f',
  '#6fb2e8',
  '#3a74d6',
  '#9b8fe0',
  '#ee8fb6',
  '#8d97a4',
  '#39424d',
  '#f4f4f2',
];
const HAIR = ['#3b2a20', '#6b4630', '#b07a45', '#e8c27a', '#d9603b', '#2b2f36', '#a9b2bd', '#ee8fb6', '#6fb2e8', '#7fcaa4'];
const B_EY = ['Dots', 'Happy', 'Sleepy', 'Wink'],
  B_MO = ['Smile', 'Grin', 'Oh'],
  B_HR = ['None', 'Short', 'Spiky', 'Curly', 'Bob', 'Ponytail', 'Bun', 'Long'],
  B_GL = ['None', 'Round', 'Square', 'Shades', 'Hearts'],
  // saved index → label; shown in this order (None first, hats after the small extras)
  B_AC = [
    [4, 'None'],
    [0, 'Star'],
    [1, 'Leaf'],
    [2, 'Bow'],
    [3, 'Cap'],
    [5, 'Beanie'],
    [6, 'Top hat'],
    [7, 'Crown'],
    [8, 'Party hat'],
    [9, 'Headphones'],
  ];
let buddies = [],
  bsel = 0,
  bmOn = false;
try {
  buddies = JSON.parse(localStorage.getItem('cosmou.buddies') || '[]')
    .filter(b => b && typeof b === 'object')
    .slice(0, 12);
} catch {}
const bNew = () => ({
  name: 'Buddy ' + (buddies.length + 1),
  fc: SKIN[Math.floor(Math.random() * 6)],
  bc: OUTFIT[Math.floor(Math.random() * OUTFIT.length)],
  ey: Math.floor(Math.random() * 4),
  mo: Math.floor(Math.random() * 3),
  acc: Math.floor(Math.random() * 10),
  hr: Math.floor(Math.random() * B_HR.length),
  hc: HAIR[Math.floor(Math.random() * 6)],
  gl: Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 4) : 0,
});
function bSave() {
  try {
    localStorage.setItem('cosmou.buddies', JSON.stringify(buddies));
  } catch {}
  if (mii.list.length) applyBuddies();
}
function bUi() {
  const b = buddies[bsel];
  $('#b_del').disabled = !b;
  for (const id of ['#b_n', '#b_fc', '#b_bc', '#b_hr', '#b_hc', '#b_ey', '#b_gl', '#b_mo', '#b_ac'])
    $(id).style.opacity = b ? 1 : 0.4;
  $('#b_n').value = b ? b.name : '';
  $('#b_n').disabled = !b;
  const sw = (box, list, key) => {
    box.replaceChildren();
    for (const col of list) {
      const e = document.createElement('button');
      e.style.background = col;
      e.setAttribute('aria-label', col);
      if (b && b[key] === col) e.className = 'on';
      e.onclick = () => {
        if (!b) return;
        b[key] = col;
        bSave();
        bUi();
      };
      box.append(e);
    }
  };
  const sg = (box, list, key) => {
    box.replaceChildren();
    list.forEach((n, i) => {
      // entries are a label, or [saved value, label]
      if (Array.isArray(n)) [i, n] = n;
      const e = document.createElement('button');
      e.textContent = n;
      if (b && (b[key] || 0) === i) e.className = 'on';
      e.onclick = () => {
        if (!b) return;
        b[key] = i;
        bSave();
        bUi();
      };
      box.append(e);
    });
  };
  sw($('#b_fc'), SKIN, 'fc');
  sw($('#b_bc'), OUTFIT, 'bc');
  sg($('#b_hr'), B_HR, 'hr');
  sw($('#b_hc'), HAIR, 'hc');
  $('#b_hc').parentNode.hidden = !b || !b.hr;
  sg($('#b_ey'), B_EY, 'ey');
  sg($('#b_gl'), B_GL, 'gl');
  sg($('#b_mo'), B_MO, 'mo');
  sg($('#b_ac'), B_AC, 'acc');
  const l = $('#b_list');
  l.replaceChildren();
  buddies.forEach((x, i) => {
    const e = document.createElement('button');
    e.className = i === bsel ? 'on' : '';
    const dot = document.createElement('i');
    dot.style.background = x.bc;
    e.append(dot, document.createTextNode(x.name || 'Buddy'));
    e.onclick = () => {
      bsel = i;
      bUi();
    };
    l.append(e);
  });
  if (!buddies.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.style.margin = '0';
    p.textContent = 'No buddies yet. Press “New buddy” to make one.';
    l.append(p);
  }
  $('#b_cnt').textContent = buddies.length ? `(${buddies.length} / 12)` : '';
  $('#b_new').disabled = buddies.length >= 12;
}
function bmFrame(now) {
  if (!bmOn) return;
  const c = $('#bcv'),
    x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  const b = buddies[bsel] || { fc: FACE[0], bc: BODY[3], ey: 0, mo: 0, acc: 0 },
    t = now / 1000;
  drawBuddy(
    x,
    {
      x: c.width / 2,
      y: c.height * 0.86,
      st: t % 5 < 1.8 ? 'wave' : 'idle',
      v: 0,
      t0: 0,
      ph: 0,
      c: 0,
      lx: Math.sin(t * 0.8) * 0.7,
      ba: 0,
      ...b,
      name: '',
    },
    t,
    9,
    false,
  );
  requestAnimationFrame(bmFrame);
}
function openBuddies() {
  if (!buddies.length) {
    buddies.push(bNew());
    bSave();
  }
  bsel = Math.min(bsel, buddies.length - 1);
  bUi();
  $('#bdlg').showModal();
  bmOn = true;
  requestAnimationFrame(bmFrame);
}
$('#bdlg').addEventListener('close', () => {
  bmOn = false;
});
$('#b_n').oninput = () => {
  const b = buddies[bsel];
  if (!b) return;
  b.name = $('#b_n').value.slice(0, 14);
  bSave();
  const e = $('#b_list').children[bsel];
  if (e) e.lastChild.textContent = b.name || 'Buddy';
};
$('#b_new').onclick = () => {
  if (buddies.length >= 12) return;
  buddies.push(bNew());
  bsel = buddies.length - 1;
  bSave();
  bUi();
};
$('#b_del').onclick = () => {
  if (!buddies[bsel]) return;
  buddies.splice(bsel, 1);
  bsel = Math.max(0, bsel - 1);
  bSave();
  bUi();
};
$('#b_x').onclick = () => $('#bdlg').close();
$('#obud').onclick = openBuddies;
$('#wbud').onclick = openBuddies;

// ---------- Hair, hats and glasses (drawn by drawBuddy) ----------
function buddyHair(c, m, u, hy0, back) {
  const hr = m.hr | 0,
    R = 11.4 * u;
  c.fillStyle = m.hc || HAIR[0];
  if (back) {
    c.beginPath();
    if (hr === 4) rr(c, -12.3 * u, hy0 - 10 * u, 24.6 * u, 17 * u, 8 * u);
    else if (hr === 7) rr(c, -12.6 * u, hy0 - 10 * u, 25.2 * u, 25 * u, 9 * u);
    else if (hr === 5) {
      c.ellipse(11.2 * u, hy0 + 1 * u, 3.6 * u, 6.5 * u, -0.35, 0, 7);
      c.moveTo(10 * u, hy0 - 6 * u);
      c.arc(10 * u, hy0 - 6 * u, 2.6 * u, 0, 7);
    } else if (hr === 6) c.arc(0, hy0 - 12.2 * u, 4.6 * u, 0, 7);
    else return;
    c.fill();
    return;
  }
  // a cap of hair over the top of the head with a soft fringe
  const cap = (fringe = 5) => {
    c.beginPath();
    c.arc(0, hy0, R, Math.PI, 0);
    c.quadraticCurveTo(6 * u, hy0 - (fringe + 3) * u, 0, hy0 - fringe * u);
    c.quadraticCurveTo(-6 * u, hy0 - (fringe + 3) * u, -R, hy0);
    c.fill();
  };
  if (hr === 1 || hr === 5 || hr === 6) cap();
  else if (hr === 2) {
    c.beginPath();
    c.moveTo(-R, hy0);
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI + (k / 8) * Math.PI,
        r = k % 2 ? 15 * u : R;
      c.lineTo(Math.cos(a) * r, hy0 + Math.sin(a) * r);
    }
    c.quadraticCurveTo(0, hy0 - 9 * u, -R, hy0);
    c.fill();
  } else if (hr === 3) {
    cap(6);
    c.beginPath();
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * 1.02 + (k / 8) * Math.PI * 0.96;
      c.moveTo(Math.cos(a) * 10.4 * u + 3.6 * u, hy0 + Math.sin(a) * 10.4 * u);
      c.arc(Math.cos(a) * 10.4 * u, hy0 + Math.sin(a) * 10.4 * u, 3.6 * u, 0, 7);
    }
    c.fill();
  } else if (hr === 4 || hr === 7) {
    const low = hr === 7 ? 9 : 5;
    c.beginPath();
    c.arc(0, hy0, R + 0.3 * u, Math.PI, 0);
    c.lineTo(R + 0.3 * u, hy0 + low * u);
    c.lineTo(8.6 * u, hy0 + low * u);
    c.lineTo(8.6 * u, hy0 - 2.5 * u);
    c.quadraticCurveTo(0, hy0 - 8.5 * u, -8.6 * u, hy0 - 2.5 * u);
    c.lineTo(-8.6 * u, hy0 + low * u);
    c.lineTo(-R - 0.3 * u, hy0 + low * u);
    c.closePath();
    c.fill();
  }
  // shine
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath();
  c.ellipse(-4 * u, hy0 - 8.2 * u, 3.4 * u, 1.3 * u, -0.45, 0, 7);
  c.fill();
}
function buddyHat(c, m, u, hy0, body) {
  const a = m.acc;
  c.save();
  if (a === 5) {
    // beanie with a pompom
    c.fillStyle = body;
    c.beginPath();
    c.arc(0, hy0 - 2 * u, 11.8 * u, Math.PI, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.16)';
    rr(c, -12.3 * u, hy0 - 5 * u, 24.6 * u, 4.2 * u, 2 * u);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(0, hy0 - 14.6 * u, 2.8 * u, 0, 7);
    c.fill();
  } else if (a === 6) {
    // top hat
    c.fillStyle = '#2b2f36';
    c.beginPath();
    c.ellipse(0, hy0 - 9 * u, 12.5 * u, 2.6 * u, 0, 0, 7);
    c.fill();
    rr(c, -7.2 * u, hy0 - 22 * u, 14.4 * u, 13.5 * u, 1.6 * u);
    c.fill();
    c.fillStyle = body;
    c.fillRect(-7.2 * u, hy0 - 12.6 * u, 14.4 * u, 2.6 * u);
  } else if (a === 7) {
    // crown
    c.fillStyle = '#f6c445';
    c.beginPath();
    c.moveTo(-8 * u, hy0 - 9 * u);
    c.lineTo(-8.6 * u, hy0 - 17 * u);
    c.lineTo(-4 * u, hy0 - 12.6 * u);
    c.lineTo(0, hy0 - 18.5 * u);
    c.lineTo(4 * u, hy0 - 12.6 * u);
    c.lineTo(8.6 * u, hy0 - 17 * u);
    c.lineTo(8 * u, hy0 - 9 * u);
    c.closePath();
    c.fill();
    c.fillStyle = '#e5534b';
    c.beginPath();
    c.arc(0, hy0 - 11.6 * u, 1.3 * u, 0, 7);
    c.fill();
    c.fillStyle = '#6fb2e8';
    c.beginPath();
    c.arc(-5 * u, hy0 - 11 * u, 1 * u, 0, 7);
    c.arc(5 * u, hy0 - 11 * u, 1 * u, 0, 7);
    c.fill();
  } else if (a === 8) {
    // party hat, a little tilted
    c.translate(2 * u, hy0 - 9 * u);
    c.rotate(0.18);
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(-6 * u, 0);
    c.lineTo(6 * u, 0);
    c.lineTo(0, -14 * u);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)';
    c.lineWidth = 1.2 * u;
    c.beginPath();
    c.moveTo(-3.9 * u, -4.6 * u);
    c.lineTo(3.9 * u, -4.6 * u);
    c.moveTo(-2 * u, -9.2 * u);
    c.lineTo(2 * u, -9.2 * u);
    c.stroke();
    c.fillStyle = '#ffd35e';
    c.beginPath();
    c.arc(0, -14.5 * u, 2.2 * u, 0, 7);
    c.fill();
  } else if (a === 9) {
    // headphones
    c.strokeStyle = '#39424d';
    c.lineWidth = 2 * u;
    c.beginPath();
    c.arc(0, hy0, 12.6 * u, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
    c.fillStyle = body;
    rr(c, -14.2 * u, hy0 - 4 * u, 4.4 * u, 8 * u, 2 * u);
    c.fill();
    rr(c, 9.8 * u, hy0 - 4 * u, 4.4 * u, 8 * u, 2 * u);
    c.fill();
  }
  c.restore();
}
function buddyGlasses(c, m, u, hy0, lx) {
  const g = m.gl,
    y = hy0 + 0.6 * u;
  c.save();
  c.lineWidth = 0.9 * u;
  c.strokeStyle = '#2b2f36';
  for (const s of [-1, 1]) {
    const x = s * 3.6 * u + lx;
    c.beginPath();
    if (g === 1) c.arc(x, y, 2.9 * u, 0, 7);
    else if (g === 2) rr(c, x - 3 * u, y - 2.4 * u, 6 * u, 4.8 * u, 1 * u);
    else if (g === 3) {
      rr(c, x - 3.3 * u, y - 2.4 * u, 6.6 * u, 4.6 * u, 1.6 * u);
      c.fillStyle = 'rgba(25,29,35,.94)';
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.fillRect(x - 2 * u, y - 1.5 * u, 1.8 * u, 0.7 * u);
      continue;
    } else if (g === 4) {
      // heart
      c.moveTo(x, y + 2.6 * u);
      c.bezierCurveTo(x - 4.4 * u, y - 0.4 * u, x - 2.2 * u, y - 3.6 * u, x, y - 1.5 * u);
      c.bezierCurveTo(x + 2.2 * u, y - 3.6 * u, x + 4.4 * u, y - 0.4 * u, x, y + 2.6 * u);
      c.fillStyle = 'rgba(238,110,160,.85)';
      c.fill();
      continue;
    }
    c.stroke();
  }
  // bridge
  c.strokeStyle = g === 4 ? 'rgba(238,110,160,.9)' : '#2b2f36';
  c.beginPath();
  c.moveTo(-0.8 * u + lx, y - 0.4 * u);
  c.quadraticCurveTo(lx, y - 1.2 * u, 0.8 * u + lx, y - 0.4 * u);
  c.stroke();
  c.restore();
}

// ---------- Buddies walk over to the games you play most ----------
// favourites: hours played plus a bonus for games played in the last days
function favGames() {
  const pt = (typeof playLog === 'object' && playLog && playLog.playtime) || {},
    now = Date.now();
  return games
    .filter(g => g.kind !== 'app')
    .map(g => ({
      name: g.name,
      w: ((pt[g.name] && pt[g.name].sec) || 0) / 3600 + (plays[g.name] ? Math.max(0, 3 - (now - plays[g.name]) / 864e5 / 2) : 0),
    }))
    .filter(x => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 5);
}
function favSpot() {
  const favs = favGames().filter(f => {
    const e = wuEls.get(f.name);
    return e && !e.classList.contains('off');
  });
  if (!favs.length) return null;
  let r = Math.random() * favs.reduce((a, f) => a + f.w, 0),
    f = favs[0];
  for (const x of favs)
    if ((r -= x.w) <= 0) {
      f = x;
      break;
    }
  const e = wuEls.get(f.name),
    st = e.style,
    size = parseFloat(st.getPropertyValue('--sz')) * parseFloat(st.getPropertyValue('--s')),
    x = (parseFloat(st.getPropertyValue('--fx')) / 100) * mii.W + (Math.random() - 0.5) * size * 0.9,
    y = (parseFloat(st.getPropertyValue('--fy')) / 100) * mii.H + size * (0.85 + Math.random() * 0.25);
  if (!isFinite(x) || !isFinite(y)) return null;
  return { name: f.name, x: Math.max(mii.W * 0.04, Math.min(mii.W * 0.96, x)), y: Math.min(mii.H * 0.92, y) };
}
const LOVE = ['♥ ', 'Let’s play ', 'Again? ', '★ '];
const _miiNext = miiNext;
miiNext = function (m, now) {
  if (m.goal && Math.hypot(m.tx - m.x, m.ty - m.y) > 14) m.goal = ''; // got distracted on the way
  if (m.goal) {
    // arrived at a favourite game: cheer for it for a moment
    m.st = Math.random() < 0.6 ? 'wave' : 'hop';
    m.t0 = now;
    m.until = now + 2800;
    m.bubKeep = m.bub;
    m.bub = LOVE[Math.floor(Math.random() * LOVE.length)] + shortName(m.goal);
    m.goal = '';
    return;
  }
  if (m.bubKeep !== undefined) {
    m.bub = m.bubKeep;
    delete m.bubKeep;
  }
  // your own buddies often, the crowd now and then
  if (Math.random() < (m.name ? 0.35 : 0.06)) {
    const t = favSpot();
    if (t) {
      m.st = 'walk';
      m.tx = t.x;
      m.ty = t.y;
      m.goal = t.name;
      return;
    }
  }
  _miiNext(m, now);
};

// ---------- Your buddy says hello when CosmoU starts ----------
function buddyHello() {
  const b = buddies[0];
  if (!b || !lsGet('hello', true) || (window.api && api.launchPlay)) return;
  if (document.querySelector('dialog[open]') || $('#setup').classList.contains('on')) return;
  const h = new Date().getHours(),
    hi = h < 5 ? 'Up late?' : h < 12 ? 'Good morning!' : h < 18 ? 'Hi, welcome back!' : 'Good evening!',
    fav = favGames()[0],
    line = fav ? `${hi} ${shortName(fav.name)} again?` : `${hi} Ready to play?`;
  // in the Plaza your buddy waves right there
  if (mode === 'wiiu' && !isHome() && mii.list[0]) {
    const m = mii.list[0];
    Object.assign(m, { st: 'wave', t0: performance.now(), until: performance.now() + 4200, bubKeep: m.bub, bub: line });
    return;
  }
  const box = $('#hello'),
    cv = box.querySelector('canvas'),
    x = cv.getContext('2d');
  box.querySelector('b').textContent = b.name || 'Buddy';
  box.querySelector('span').textContent = line;
  box.hidden = false;
  box.classList.remove('out');
  const t0 = performance.now(),
    frame = now => {
      if (box.hidden) return;
      const t = (now - t0) / 1000;
      x.clearRect(0, 0, cv.width, cv.height);
      drawBuddy(
        x,
        {
          x: cv.width / 2,
          y: cv.height * 0.96,
          st: t < 3.2 ? 'wave' : 'idle',
          v: 0,
          t0: 0,
          ph: 0,
          c: 0,
          lx: 0.3,
          ba: 0,
          ...b,
          name: '',
        },
        now / 1000,
        cv.height / 50,
        false,
      );
      requestAnimationFrame(frame);
    };
  requestAnimationFrame(frame);
  const bye = () => {
    box.classList.add('out');
    setTimeout(() => (box.hidden = true), 400);
  };
  box.onclick = bye;
  setTimeout(bye, 5200);
}
