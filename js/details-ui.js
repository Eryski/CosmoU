// CosmoU – Game details: chips, play statistics, favorite button and the tool tiles.
for (const i of document.querySelectorAll('#dtools .mi')) {
  const k = i.dataset.ic;
  i.innerHTML = MI[k] || '';
  i.style.setProperty('--c', MCOL[k] || '#8b959e');
}
function detFavUi(g) {
  const on = !!g && favs.has(g.name),
    b = $('#dfav');
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('.st').textContent = on ? '★' : '☆';
  b.querySelector('.lb').textContent = on ? 'Favorite' : 'Add to favorites';
  b.title = (on ? 'Remove from favorites' : 'Add to favorites') + ' (F)';
}
$('#dfav').onclick = () => toggleFav(cur());
function detChips(g) {
  const box = $('#dchips'),
    add = (t, cls, title) => {
      const s = document.createElement('span');
      s.className = 'cmc' + (cls ? ' ' + cls : '');
      s.textContent = t;
      if (title) s.title = title;
      box.append(s);
    };
  box.replaceChildren();
  if (g.kind === 'app') add('Other app');
  else {
    const [fmt, region] = String(g.format || 'Wii U').split(' · ');
    add(fmt || 'Wii U');
    if (region) add(region);
    if (g.tid) add('ID ' + String(g.tid).toUpperCase(), 'dim mono', 'Title ID');
  }
  if (cfg && cfg.gameSettings && cfg.gameSettings[g.tid || g.name]) add('Quality: ' + cfg.gameSettings[g.tid || g.name], 'dim');
}
function detStats(g) {
  const box = $('#dstats'),
    p = (typeof playLog === 'object' && playLog.playtime && playLog.playtime[g.name]) || null,
    last = (p && p.last) || plays[g.name] || 0;
  const card = (label, value, sub) => {
    const d = document.createElement('div'),
      l = document.createElement('small'),
      v = document.createElement('b'),
      s = document.createElement('span');
    d.className = 'dst' + (value ? '' : ' none');
    l.textContent = label;
    v.textContent = value || '—';
    s.textContent = sub || '';
    d.append(l, v, s);
    return d;
  };
  const fmtDay = ts => new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  box.replaceChildren(
    card('Play time', p && p.sec ? fmtDur(p.sec) : '', p && p.sec ? 'measured by CosmoU' : 'not played with CosmoU yet'),
    card(
      'Last played',
      last ? dayName(last).replace(/^./, c => c.toUpperCase()) : '',
      p && p.lastSec
        ? 'for ' + fmtDur(p.lastSec)
        : last
          ? new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
    ),
    card('Sessions', p && p.sessions ? String(p.sessions) : '', p && p.sessions ? 'average ' + fmtDur(p.sec / p.sessions) : ''),
    card(
      'First played',
      p && p.first ? fmtDay(p.first) : '',
      p && p.first ? Math.max(1, Math.round((Date.now() - p.first) / 864e5)) + ' days ago' : '',
    ),
  );
}
const _openDetail = openDetail;
openDetail = function (g) {
  _openDetail(g);
  detFavUi(g);
  $('#df').textContent = g.kind === 'app' ? 'Other app' : SYS[sysOf(g)].name + ' game';
  detChips(g);
  detStats(g);
  $('#dpath').textContent = g.path ? String(g.path).replace(/^.*[\\/](?=[^\\/]+[\\/][^\\/]+$)/, '…\\') : 'Open the game files';
  $('#dfold').hidden = !g.path && !!window.api;
  if (!$('#dgps').textContent) $('#dgps').textContent = 'Resolution, FPS and fixes';
  const t = $('#det').style;
  t.setProperty('--c', glow(g));
};
