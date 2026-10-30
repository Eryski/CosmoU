// CosmoU – Switch Home: the home screen for Switch games. One row of big square icons (the last played first),
// the name of the selected game above it, round buttons for the rest and the button hints at the bottom.
// No Plaza, no buddies: that is the Wii U's.
let swFirst = 0;
const SW_APPS = [
  ['recent', 'Recently played', '#e8485b', 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', () => document.querySelector('nav button[data-v="recent"]').click()],
  ['themes', 'Themes', '#f0a020', 'M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 12.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z', () => openSettings('look')],
  ['pads', 'Controllers', '#3c8cf0', 'M7 9h4M9 7v4M15.5 9.5h.01M18 11.5h.01M6.5 5h11A4.5 4.5 0 0 1 22 9.5v3a4.5 4.5 0 0 1-8.2 2.6l-.3-.4a2 2 0 0 0-3 0l-.3.4A4.5 4.5 0 0 1 2 12.5v-3A4.5 4.5 0 0 1 6.5 5Z', () => openSettings('controls')],
  ['wiiu', 'Wii U', '#27b6d6', 'M4 6h16v10H4zM9 20h6M12 16v4', () => setSystem('wiiu')],
  ['set', 'Settings', '#8a8f98', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z', () => openSettings()],
];
function buildSwitch(l) {
  const row = $('#swrow');
  // like on the console: the last played game comes first
  const order = l
    .slice()
    .sort((a, b) => (plays[b.name] || 0) - (plays[a.name] || 0) || a.name.localeCompare(b.name))
    .slice(0, 12);
  if (!order.some(x => x.name === sel) && order[0]) sel = order[0].name;
  swOrder = order;
  row.replaceChildren();
  order.forEach((x, i) => {
    const t = document.createElement('button');
    t.className = 'sw-t' + (x.name === sel ? ' on' : '');
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
      if (sel === x.name) launch(cur());
      else {
        sel = x.name;
        blip('move');
        render();
      }
    };
    row.append(t);
  });
  // the last icon opens every game (the Grid)
  const all = document.createElement('button');
  all.className = 'sw-t sw-all';
  all.innerHTML =
    '<div class="art"><svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg></div><em>All games</em>';
  all.onclick = () => document.querySelector('#vt button[data-m="grid"]').click();
  row.append(all);
  // keep the selected icon on the screen, the row moves in steps like on the console
  requestAnimationFrame(() => {
    const t0 = row.firstElementChild;
    if (!t0) return;
    const w = t0.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0),
      vis = Math.max(1, Math.floor(($('#sw').clientWidth - 40) / w)),
      i = Math.max(0, order.findIndex(x => x.name === sel));
    if (i < swFirst) swFirst = i;
    if (i >= swFirst + vis) swFirst = i - vis + 1;
    swFirst = Math.max(0, Math.min(swFirst, Math.max(0, order.length + 1 - vis)));
    row.style.transform = `translateX(${-swFirst * w}px)`;
  });
  const apps = $('#swapps');
  if (!apps.childElementCount)
    for (const [id, label, c, d, fn] of SW_APPS) {
      const b = document.createElement('button');
      b.className = 'sw-a';
      b.dataset.a = id;
      b.title = label;
      b.style.setProperty('--ac', c);
      b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${label}</span>`;
      b.onclick = () => {
        blip('open');
        fn();
      };
      apps.append(b);
    }
  // the Wii U button only when there is a Wii U to go to
  apps.querySelector('[data-a="wiiu"]').hidden = !sysAvail().includes('wiiu');
}
let swOrder = [];
// left and right on the Switch Home follow its own order (last played first)
function swStep(d) {
  const i = swOrder.findIndex(x => x.name === sel),
    n = swOrder[Math.max(0, Math.min(swOrder.length - 1, i + d))];
  if (n && n.name !== sel) {
    sel = n.name;
    blip('move');
    render();
  }
}
