// CosmoU – Plaza posts (what your buddies say) and the Daily Log (play time per game).

// ---------- small helpers ----------
const fmtDur = s => {
  const m = Math.max(1, Math.round(s / 60));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60),
    r = m % 60;
  return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') + ' min' : '');
};
const dayStart = ts => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
function dayName(ts) {
  const dd = Math.round((dayStart(Date.now()) - dayStart(ts)) / 864e5);
  if (dd === 0) return 'today';
  if (dd === 1) return 'yesterday';
  if (dd < 7) return new Date(ts).toLocaleDateString('en', { weekday: 'long' });
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
const shortName = n => (n.length > 18 ? n.slice(0, 17).trim() + '…' : n);
const gameOf = name => games.find(g => g.name === name);

// ---------- Plaza posts ----------
const POST_MAX = 30;
const POST_IDEAS = [
  'Just beat Bowser!',
  'Who wants to race?',
  'Best game ever',
  'Finally 100%!',
  'Stuck on this level…',
  'This music tho',
];
let posts = [];
try {
  posts = JSON.parse(localStorage.getItem('cosmou.posts') || '[]');
} catch {}
if (!Array.isArray(posts)) posts = [];
posts = posts.filter(p => p && typeof p.text === 'string' && p.text.trim()).slice(0, POST_MAX);
function savePosts() {
  try {
    localStorage.setItem('cosmou.posts', JSON.stringify(posts));
  } catch {}
}
// newest first: a post by one of your buddies is said by that buddy, the others by people in the crowd
function applyPosts() {
  if (!mii.list.length || !posts.length) return;
  const crowd = mii.list.filter((_, i) => !buddies[i]),
    used = new Set();
  let k = 0;
  for (const p of posts) {
    let m = p.by >= 0 && buddies[p.by] ? mii.list[p.by] : null;
    if (!m) {
      if (!crowd.length) continue;
      m = crowd[k++ % crowd.length];
    }
    if (!m || used.has(m)) continue;
    used.add(m);
    m.bub = p.game && !p.text.includes(shortName(p.game)) ? p.text + ' · ' + shortName(p.game) : p.text;
  }
}
function postsUi() {
  const by = $('#p_by'),
    gm = $('#p_game'),
    keepBy = by.value,
    keepGm = gm.value;
  by.replaceChildren(
    new Option('Someone in the Plaza', '-1'),
    ...buddies.map((b, i) => new Option(b.name || 'Buddy ' + (i + 1), String(i))),
  );
  gm.replaceChildren(new Option('No game', ''), ...games.filter(g => g.kind !== 'app').map(g => new Option(g.name, g.name)));
  if ([...by.options].some(o => o.value === keepBy)) by.value = keepBy;
  else if (buddies.length) by.value = '0';
  if ([...gm.options].some(o => o.value === keepGm)) gm.value = keepGm;
  $('#p_left').textContent = String(48 - $('#p_txt').value.length);
  $('#p_cnt').textContent = posts.length ? '· ' + posts.length : '';
  const list = $('#p_list');
  list.replaceChildren();
  if (!posts.length) {
    const e = document.createElement('p');
    e.className = 'hint';
    e.textContent = 'No posts yet. Your first one will pop up above a buddy in the Plaza.';
    list.append(e);
  }
  for (const p of posts) {
    const row = document.createElement('div'),
      who = document.createElement('b'),
      tx = document.createElement('span'),
      meta = document.createElement('small'),
      del = document.createElement('button');
    row.className = 'prow-i';
    who.textContent = p.by >= 0 && buddies[p.by] ? buddies[p.by].name || 'Buddy' : 'Someone';
    tx.textContent = p.text;
    meta.textContent = (p.game ? p.game + ' · ' : '') + dayName(p.at);
    del.className = 'pdel';
    del.setAttribute('aria-label', 'Delete post');
    del.textContent = '×';
    del.onclick = () => {
      posts = posts.filter(x => x !== p);
      savePosts();
      postsUi();
      if (mii.list.length) applyBuddies();
    };
    const body = document.createElement('div');
    body.append(who, tx, meta);
    row.append(body, del);
    list.append(row);
  }
}
function openPosts(text, game) {
  postsUi();
  if (text) $('#p_txt').value = text.slice(0, 48);
  if (game) $('#p_game').value = game;
  postsUi();
  $('#postdlg').showModal();
  $('#p_txt').focus();
}
(function () {
  const ideas = $('#p_ideas');
  for (const t of POST_IDEAS) {
    const b = document.createElement('button');
    b.className = 'pchip';
    b.type = 'button';
    b.textContent = t;
    b.onclick = () => {
      $('#p_txt').value = t;
      postsUi();
      $('#p_txt').focus();
    };
    ideas.append(b);
  }
})();
$('#p_txt').addEventListener('input', () => ($('#p_left').textContent = String(48 - $('#p_txt').value.length)));
$('#p_txt').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#p_add').click();
});
$('#p_add').onclick = () => {
  const text = $('#p_txt').value.trim().slice(0, 48);
  if (!text) {
    $('#p_txt').focus();
    return;
  }
  posts.unshift({ id: Date.now().toString(36), text, by: +$('#p_by').value, game: $('#p_game').value, at: Date.now() });
  posts = posts.slice(0, POST_MAX);
  savePosts();
  $('#p_txt').value = '';
  postsUi();
  if (mii.list.length) applyBuddies();
  blip('open');
  toast('✓ Posted in the Plaza');
};
$('#p_x').onclick = () => $('#postdlg').close();
$('#wpost').onclick = () => openPosts();
$('#opost').onclick = () => {
  $('#dlg').close();
  openPosts();
};

// ---------- Daily Log ----------
let playLog = { playtime: {}, sessions: [] };
async function loadLog() {
  if (!window.api || !api.playLog) return;
  try {
    const r = await api.playLog();
    if (r && r.playtime) playLog = r;
  } catch {}
}
function playLine(name) {
  const p = playLog.playtime[name];
  return p ? `Played ${fmtDur(p.sec)} · last ${dayName(p.last)}` : '';
}
function renderLog() {
  const pt = playLog.playtime || {},
    names = Object.keys(pt).sort((a, b) => (pt[b].last || 0) - (pt[a].last || 0)),
    today = dayStart(Date.now()),
    days = Array.from({ length: 7 }, (_, i) => {
      // calendar days, so summer/winter time changes don't shift the buckets
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { t: d.getTime(), sec: 0 };
    });
  for (const s of playLog.sessions || []) {
    const d = days.find(x => x.t === dayStart(s.start));
    if (d) d.sec += s.sec;
  }
  const week = days.reduce((a, d) => a + d.sec, 0),
    all = names.reduce((a, n) => a + pt[n].sec, 0);
  $('#l_sum').textContent = names.length
    ? `This week: ${week ? fmtDur(week) : 'nothing yet'} · All time: ${fmtDur(all)} across ${names.length} ${names.length === 1 ? 'game' : 'games'}`
    : 'No play time yet. Start a game and CosmoU starts counting.';
  const max = Math.max(1, ...days.map(d => d.sec)),
    wk = $('#l_week');
  wk.replaceChildren();
  for (const d of days) {
    const col = document.createElement('div'),
      bar = document.createElement('i'),
      v = document.createElement('small'),
      lbl = document.createElement('span');
    col.className = 'lday' + (d.t === today ? ' on' : '');
    bar.style.height = Math.max(d.sec ? 6 : 2, Math.round((d.sec / max) * 100)) + '%';
    v.textContent = d.sec ? fmtDur(d.sec) : '';
    lbl.textContent = d.t === today ? 'Today' : new Date(d.t).toLocaleDateString('en', { weekday: 'short' });
    col.title =
      new Date(d.t).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }) +
      ': ' +
      (d.sec ? fmtDur(d.sec) : 'no play time');
    const b = document.createElement('div');
    b.className = 'lbar';
    b.append(v, bar);
    col.append(b, lbl);
    wk.append(col);
  }
  const list = $('#l_list');
  list.replaceChildren();
  for (const n of names) {
    const p = pt[n],
      g = gameOf(n),
      row = document.createElement('div'),
      ic = document.createElement('div'),
      tx = document.createElement('div'),
      h = document.createElement('b'),
      a = document.createElement('small'),
      b2 = document.createElement('small'),
      tot = document.createElement('strong');
    row.className = 'lrow';
    ic.className = 'lic';
    const img = g && (g.icon || g.cover);
    if (img) ic.style.backgroundImage = `url("${img}")`;
    else ic.textContent = n.slice(0, 1).toUpperCase();
    h.textContent = n;
    a.textContent = `Last played ${dayName(p.last)} for ${fmtDur(p.lastSec || 0)}`;
    b2.textContent = `${p.sessions} ${p.sessions === 1 ? 'session' : 'sessions'} · first played ${new Date(p.first).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    tot.textContent = fmtDur(p.sec);
    tx.append(h, a, b2);
    // share of all play time, as a thin bar along the bottom of the row
    const sh = document.createElement('i'),
      pc = all ? Math.round((p.sec / all) * 100) : 0;
    sh.className = 'lshare';
    sh.style.setProperty('--p', pc + '%');
    sh.title = pc + '% of your play time';
    const pcs = document.createElement('small');
    pcs.className = 'lpc';
    pcs.textContent = pc + '%';
    tot.append(pcs);
    row.append(ic, tx, tot, sh);
    list.append(row);
  }
}
async function openLog() {
  await loadLog();
  renderLog();
  $('#logdlg').showModal();
}
$('#l_x').onclick = () => $('#logdlg').close();
$('#olog').onclick = () => {
  $('#dlg').close();
  openLog();
};
loadLog();
if (window.api && api.onSessionEnded)
  api.onSessionEnded(async d => {
    await loadLog();
    if ($('#det').open && cur() && cur().name === d.name) $('#dpt').textContent = playLine(d.name);
    toast(
      `✓ ${shortName(d.name)}: played ${fmtDur(d.sec)}`,
      9000,
      'ok',
      d.sec >= 300 ? { label: 'Post it', fn: () => openPosts(`Played ${shortName(d.name)} for ${fmtDur(d.sec)}`, d.name) } : null,
    );
  });
