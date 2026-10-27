// CosmoU – Covers view (cover flow), keyboard paging and the view switcher.
const covEls = new Map();
function buildCovers(l) {
  const row = $('#cfrow'),
    keep = new Set(l.map(x => x.name));
  for (const [k, e] of covEls)
    if (!keep.has(k)) {
      e.remove();
      covEls.delete(k);
    }
  const idx = Math.max(
    0,
    l.findIndex(x => x.name === sel),
  );
  l.forEach((x, i) => {
    let e = covEls.get(x.name);
    if (!e) {
      e = document.createElement('div');
      e.className = 'cc';
      e.dataset.g = x.name;
      const a = document.createElement('div');
      a.className = 'art';
      e.append(a);
      e.onclick = () => {
        if (sel !== x.name) {
          sel = x.name;
          render();
        }
      };
      e.ondblclick = () => {
        if (sel === x.name) launch(cur());
      };
      e.onpointerenter = () => {
        if (e.classList.contains('mid')) hoverCase(e, x);
      };
      e.onpointerleave = hoverOff;
      row.append(e);
      covEls.set(x.name, e);
    }
    paint(e.firstChild, x);
    e.style.setProperty('--c', glow(x));
    const o = i - idx,
      a = Math.abs(o),
      sg = Math.sign(o),
      // two covers on each side: the far ones smaller, dimmer and tucked behind
      px = sg * [0, 86, 150, 196][Math.min(a, 3)];
    e.style.transform = `translate(-50%,-50%) translateX(${px}%) scale(${[1, 0.74, 0.56, 0.44][Math.min(a, 3)]}) rotateY(${Math.max(-1, Math.min(1, -o)) * (a > 1 ? 16 : 10)}deg)`;
    e.style.opacity = a > 2 ? 0 : a === 2 ? 0.42 : a ? 0.8 : 1;
    e.style.zIndex = 10 - a;
    e.style.filter = a > 1 ? 'saturate(.55) blur(.6px)' : a ? 'saturate(.7)' : 'none';
    e.style.pointerEvents = a > 2 ? 'none' : 'auto';
    e.classList.toggle('fav', favs.has(x.name));
    e.classList.toggle('mid', a === 0);
  });
  const cg = l[idx];
  if (cg) {
    $('#cft').textContent = cg.name;
    coverMeta(cg, idx, l.length);
    $('#cf').style.setProperty('--c', glow(cg));
  }
  const dots = $('#dots');
  dots.replaceChildren();
  if (l.length > 1 && l.length <= 9)
    l.forEach((_, i) => {
      const d = document.createElement('i');
      if (i === idx) d.className = 'on';
      dots.append(d);
    });
  else dots.textContent = l.length > 1 ? `${idx + 1} / ${l.length}` : '';
  $('#prev').disabled = idx <= 0;
  $('#next').disabled = idx >= l.length - 1;
}
// the line under the title: format, play time, last played and favorite, as small chips
function coverMeta(g, idx, n, box = $('#cfm')) {
  const p = typeof playLog === 'object' && playLog.playtime ? playLog.playtime[g.name] : null,
    chip = (t, cls) => {
      const s = document.createElement('span');
      s.className = 'cmc' + (cls ? ' ' + cls : '');
      s.textContent = t;
      return s;
    };
  box.replaceChildren();
  if (favs.has(g.name)) box.append(chip('★ Favorite', 'fav'));
  box.append(chip(g.kind === 'app' ? 'App' : g.format || 'Wii U'));
  if (p && p.sec) box.append(chip('⏱ ' + fmtDur(p.sec)));
  if (p && p.last) box.append(chip('Last played ' + dayName(p.last)));
  else if (plays[g.name]) box.append(chip('Last played ' + dayName(plays[g.name])));
  else box.append(chip('Not played yet', 'dim'));
  if (n > 1 && idx >= 0) box.append(chip(idx + 1 + ' of ' + n, 'dim'));
}
function step(d) {
  const l = list(),
    i = l.findIndex(x => x.name === sel),
    n = Math.max(0, Math.min(l.length - 1, i + d));
  if (l[n] && l[n].name !== sel) {
    sel = l[n].name;
    blip('move');
    render();
  }
}
function vind() {
  const b = document.querySelector('#vt button.on'),
    i = $('#vi');
  if (b) {
    i.style.left = b.offsetLeft + 'px';
    i.style.width = b.offsetWidth + 'px';
  }
}
function syncMode() {
  document.querySelectorAll('#vt button').forEach(x => x.classList.toggle('on', x.dataset.m === mode));
  vind();
}
