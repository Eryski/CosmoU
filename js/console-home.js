// CosmoU – the home screens of the other consoles (the Wii U has its own: js/wiiu-look.js and js/wiiu-home.js).
// Every console gets the layout people know from it (js/systems-data.js → home):
//   row       Switch: one row of big square icons, the last played first
//   channels  Wii: pages of twelve channels, empty channels fill the rest
//   discs     GameCube: mini discs on a carousel, the chosen one spins
//   dual      DS and 3DS: two screens – the chosen game on the top screen, the icons on the touch screen
//   shelf     NES, SNES, N64, Game Boy, GBA, Virtual Boy: their cartridges on a shelf, the chosen one lifts out
// Below every layout: round buttons (recently played, themes, controllers, consoles, settings).
// Controller and keyboard: the D-pad moves; down from the games goes to the round buttons, up comes back; A starts.
let chOrder = [],
  chFirst = 0,
  chZone = 'games',
  chApp = 0,
  // Switch: the "All games" icon after the last twelve games is chosen
  chAll = false;
const CH_APPS = [
  ['recent', 'Recently played', '#e8485b', 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', () => document.querySelector('nav button[data-v="recent"]').click()],
  ['themes', 'Themes', '#f0a020', 'M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 12.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z', () => openSettings('look')],
  ['pads', 'Controllers', '#3c8cf0', 'M7 9h4M9 7v4M15.5 9.5h.01M18 11.5h.01M6.5 5h11A4.5 4.5 0 0 1 22 9.5v3a4.5 4.5 0 0 1-8.2 2.6l-.3-.4a2 2 0 0 0-3 0l-.3.4A4.5 4.5 0 0 1 2 12.5v-3A4.5 4.5 0 0 1 6.5 5Z', () => openSettings('controls')],
  ['systems', 'Consoles', '#27b6d6', 'M4 6h16v10H4zM9 20h6M12 16v4', () => sysMenu(document.querySelector('#swapps [data-a="systems"]'))],
  ['set', 'Settings', '#8a8f98', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z', () => openSettings()],
];
const chProfile = () => SYSDATA.SYSTEMS[curSys] || {};
// how many icons are next to each other on a page (up and down move by that), 0 = one row
const chCols = () => (chProfile().home === 'channels' ? 4 : chProfile().variant === '3ds' ? 4 : 0);
const chPer = () => (chProfile().home === 'channels' ? 12 : chProfile().variant === '3ds' ? 12 : 0);
function chomeOrder(l) {
  const p = chProfile();
  // the Switch and the 3DS put the last played game first; the others keep the library's order
  if (p.home === 'row' || p.variant === '3ds')
    return l.slice().sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name));
  return l.slice();
}
function chTile(x, i, cls) {
  const t = document.createElement('button');
  t.className = cls + (x.name === sel ? ' on' : '');
  t.dataset.g = x.name;
  t.style.setProperty('--c', glow(x));
  t.style.setProperty('--i', i);
  const a = document.createElement('div');
  a.className = 'art';
  paint(a, x);
  const n = document.createElement('em');
  n.textContent = x.name;
  t.append(a, n);
  t.onclick = () => {
    chZone = 'games';
    if (sel === x.name) launch(cur());
    else {
      blip('move');
      chZoneUi();
      chSel(x.name);
    }
  };
  t.ondblclick = () => launch(cur());
  return t;
}
function buildCHome(l) {
  const p = chProfile(),
    box = $('#sw'),
    row = $('#swrow'),
    top = $('#chtop'),
    dots = $('#chdots');
  // another console: start again on its games, the first round button chosen
  if (box.dataset.sys !== curSys) {
    chZone = 'games';
    chApp = 0;
    chFirst = 0;
    chAll = false;
  }
  box.dataset.lay = p.home;
  box.dataset.sys = curSys;
  box.dataset.variant = p.variant || '';
  box.dataset.cart = p.cart || '';
  let order = chomeOrder(l);
  if (p.home === 'row') order = order.slice(0, 12);
  else chAll = false;
  if (!order.some(x => x.name === sel) && order[0]) sel = order[0].name;
  chOrder = order;
  const i = Math.max(0, order.findIndex(x => x.name === sel));
  row.replaceChildren();
  top.replaceChildren();
  dots.replaceChildren();
  top.hidden = p.home !== 'dual';
  row.style.transform = '';
  const per = chPer();
  if (p.home === 'row') {
    order.forEach((x, k) => row.append(chTile(x, k, 'sw-t')));
    // the last icon opens every game (the Grid)
    const all = document.createElement('button');
    all.className = 'sw-t sw-all' + (chAll ? ' on' : '');
    all.innerHTML =
      '<div class="art"><svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg><small></small></div><em>All games</em>';
    all.querySelector('small').textContent = l.length;
    all.onclick = chOpenAll;
    row.append(all);
  } else if (per) {
    // pages: twelve per page, empty places stay as empty channels / frames
    const page = Math.floor(i / per),
      pages = Math.max(1, Math.ceil(order.length / per));
    const cls = p.home === 'channels' ? 'wch' : 'n3i';
    for (let k = page * per; k < page * per + per; k++) {
      if (order[k]) row.append(chTile(order[k], k, cls));
      else {
        const e = document.createElement('div');
        e.className = cls + ' ch-empty';
        row.append(e);
      }
    }
    for (let k = 0; k < pages; k++) {
      const d = document.createElement('i');
      d.className = k === page ? 'on' : '';
      dots.append(d);
    }
  } else {
    const cls = p.home === 'discs' ? 'gcd' : p.home === 'dual' ? 'dsi' : 'cart';
    order.forEach((x, k) => row.append(chTile(x, k, cls)));
  }
  // the top screen of the DS and the 3DS: the chosen game, big
  if (p.home === 'dual') chTop(order[i]);
  // keep the chosen game on the screen (rows, discs, cartridges)
  requestAnimationFrame(() => chScroll());
  // the round buttons
  const apps = $('#swapps');
  if (!apps.childElementCount)
    CH_APPS.forEach(([id, label, c, d, fn], k) => {
      const b = document.createElement('button');
      b.className = 'sw-a';
      b.dataset.a = id;
      b.title = label;
      b.style.setProperty('--ac', c);
      b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${label}</span>`;
      b.onclick = () => {
        chApp = k;
        blip('open');
        fn();
      };
      apps.append(b);
    });
  apps.querySelector('[data-a="systems"]').hidden = sysAvail().length < 2;
  chZoneUi();
}
function chTop(g) {
  const top = $('#chtop');
  top.replaceChildren();
  const art = document.createElement('div');
  art.className = 'top-art';
  if (g) chPaintBox(art, g);
  const info = document.createElement('div');
  info.className = 'top-info';
  const t = document.createElement('b'),
    s = document.createElement('small');
  t.textContent = g ? g.name : '';
  s.textContent = g ? (plays[g.name] ? 'Last played ' + dayName(plays[g.name]) : 'Tap to start') : '';
  info.append(t, s);
  const clock = document.createElement('div');
  clock.className = 'top-clock';
  clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  top.append(clock, art, info);
}
// a box cover keeps its own shape (DS and 3DS boxes are not square): the picture is measured once and the box
// takes its width-to-height ratio, so nothing is cut off
const chRatio = {};
function chPaintBox(el, g) {
  paint(el, g);
  if (!g.cover) return;
  const set = r => el.style.setProperty('--ar', r);
  if (chRatio[g.cover]) return set(chRatio[g.cover]);
  const im = new Image();
  im.onload = () => {
    if (!im.naturalWidth || !im.naturalHeight) return;
    chRatio[g.cover] = Math.max(0.55, Math.min(1.8, im.naturalWidth / im.naturalHeight)).toFixed(3);
    set(chRatio[g.cover]);
  };
  im.src = g.cover;
}
// choosing another game: only the selection moves (no new tiles, so nothing flashes like a reloaded page);
// a new page of channels or icons is built new
function chSel(name) {
  const per = chPer(),
    a = chOrder.findIndex(x => x.name === sel),
    b = chOrder.findIndex(x => x.name === name),
    row = $('#swrow');
  sel = name;
  chAll = false;
  if (mode !== 'chome' || b < 0 || !row.childElementCount || (per && Math.floor(Math.max(0, a) / per) !== Math.floor(b / per))) return render();
  for (const t of row.children) t.classList.toggle('on', !!t.dataset.g && t.dataset.g === name);
  if (chProfile().home === 'dual') chTop(chOrder[b]);
  chScroll();
}
function chScroll() {
  const p = chProfile(),
    row = $('#swrow'),
    wrap = $('#chwrap');
  if (chPer() || !row.firstElementChild) return;
  const i = chAll ? chOrder.length : Math.max(0, chOrder.findIndex(x => x.name === sel));
  const t0 = row.firstElementChild,
    w = t0.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0) || 1;
  if (p.home === 'discs' || p.home === 'dual') {
    // the chosen disc / icon sits in the middle
    row.style.transform = `translateX(${wrap.clientWidth / 2 - (i + 0.5) * w + parseFloat(getComputedStyle(row).columnGap || 0) / 2}px)`;
    return;
  }
  // a short shelf of cartridges stands in the middle
  const pad = parseFloat(getComputedStyle(wrap).paddingLeft || 0) * 2;
  if (p.home === 'shelf' && row.scrollWidth <= wrap.clientWidth - pad) {
    row.style.transform = `translateX(${(wrap.clientWidth - pad - row.lastElementChild.getBoundingClientRect().right + row.firstElementChild.getBoundingClientRect().left) / 2}px)`;
    return;
  }
  const vis = Math.max(1, Math.floor((wrap.clientWidth - 40) / w));
  if (i < chFirst) chFirst = i;
  if (i >= chFirst + vis) chFirst = i - vis + 1;
  chFirst = Math.max(0, Math.min(chFirst, Math.max(0, row.childElementCount - vis)));
  row.style.transform = `translateX(${-chFirst * w}px)`;
}
function chZoneUi() {
  const box = $('#sw');
  box.classList.toggle('apps-zone', chZone === 'apps');
  const bs = [...document.querySelectorAll('#swapps .sw-a:not([hidden])')];
  bs.forEach((b, k) => b.classList.toggle('sel', chZone === 'apps' && k === chApp));
}
// D-pad / arrow keys on a console home screen
function chNav(dir) {
  const bs = [...document.querySelectorAll('#swapps .sw-a:not([hidden])')];
  if (chZone === 'apps') {
    if (dir === 'u') chZone = 'games';
    else if (dir === 'l' || dir === 'r') chApp = Math.max(0, Math.min(bs.length - 1, chApp + (dir === 'r' ? 1 : -1)));
    blip('move');
    chZoneUi();
    return;
  }
  // Switch: right of the last of the twelve games is "All games" (A opens every game)
  if (chProfile().home === 'row') {
    const last = chOrder.length - 1,
      at = chOrder.findIndex(x => x.name === sel);
    if (chAll && dir === 'l') {
      if (chOrder[last]) chSel(chOrder[last].name);
      blip('move');
      return;
    }
    if (chAll && dir === 'r') return;
    if (!chAll && dir === 'r' && at === last) {
      chAll = true;
      for (const t of $('#swrow').children) t.classList.toggle('on', t.classList.contains('sw-all'));
      blip('move');
      chScroll();
      return;
    }
  }
  const n = chOrder.length,
    cols = chCols(),
    per = chPer(),
    i = Math.max(0, chOrder.findIndex(x => x.name === sel));
  let j = i;
  if (dir === 'l') j = i - 1;
  else if (dir === 'r') j = i + 1;
  else if (dir === 'u') {
    if (!cols || i % per < cols) return;
    j = i - cols;
  } else if (dir === 'd') {
    // the bottom row (or a single row): down goes to the round buttons
    if (!cols || i % per >= per - cols || i + cols >= n) {
      chZone = 'apps';
      chApp = Math.min(chApp, bs.length - 1);
      blip('move');
      chZoneUi();
      return;
    }
    j = i + cols;
  }
  j = Math.max(0, Math.min(n - 1, j));
  if (chOrder[j] && j !== i) {
    blip('move');
    chSel(chOrder[j].name);
  }
}
// A / Enter: start the game, or press the chosen round button
function chA() {
  if (chZone === 'apps') {
    const b = [...document.querySelectorAll('#swapps .sw-a:not([hidden])')][chApp];
    if (b) b.click();
  } else if (chAll) chOpenAll();
  else launch(cur());
}
// every game of this console: the Grid (B there, or the view button, comes back)
let chFromAll = false;
function chOpenAll() {
  blip('open');
  chAll = false;
  document.querySelector('#vt button[data-m="grid"]').click();
  chFromAll = true;
}
function chBackFromAll() {
  if (!chFromAll || mode !== 'grid' || curSys === 'wiiu') return (chFromAll = false);
  chFromAll = false;
  blip('back');
  document.querySelector('#vt button[data-m="chome"]').click();
  return true;
}
// B / Escape: from the round buttons back to the games
function chB() {
  if (chZone !== 'apps') return false;
  chZone = 'games';
  blip('back');
  chZoneUi();
  return true;
}
addEventListener('resize', () => mode === 'chome' && chScroll());
// the Grid opened from the Switch's "All games": Escape goes back to the Switch Home
addEventListener('keydown', e => {
  if (e.key === 'Escape' && mode === 'grid' && e.target.tagName !== 'INPUT' && !document.querySelector('dialog[open]')) chBackFromAll();
});
