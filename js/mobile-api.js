// CosmoU – Android, iPhone and iPad: the same window.api as the desktop app, built on the small native bridge of the
// phone apps (android/app/src/main/java/com/cosmou/app/Bridge.java and ios/CosmoU/Bridge.swift).
// On the desktop this file does nothing.
// What the desktop app does in main.js (library, covers, play time, settings, themes) happens here in JavaScript;
// the bridge only does what needs the phone: folders, files, internet, starting the emulator and other apps.
// Android starts games in Cemu for Android; iPhone and iPad in MeloCafe (Cemu for iOS), which also has the games.
(function () {
  const N = window.CosmoNative;
  if (!N || window.api) return;

  // older Android System WebView versions (Android 8–11 without updates) miss a few newer functions
  for (const P of [Element.prototype, Document.prototype, DocumentFragment.prototype])
    if (!P.replaceChildren)
      P.replaceChildren = function (...nodes) {
        while (this.lastChild) this.removeChild(this.lastChild);
        if (nodes.length) this.append(...nodes);
      };
  if (!Array.prototype.at)
    Array.prototype.at = function (i) {
      i = Math.trunc(i) || 0;
      return this[i < 0 ? this.length + i : i];
    };
  const chrome = +((navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || 0);

  // ---------- bridge ----------
  const sync = (name, ...args) => {
    try {
      return JSON.parse(N.sync(name, JSON.stringify(args)));
    } catch (e) {
      console.error('CosmoNative.sync', name, e);
      return null;
    }
  };
  let seq = 0;
  const waiting = {};
  window.__cosmoDone = (id, json) => {
    const f = waiting[id];
    delete waiting[id];
    if (f) f(typeof json === 'string' ? JSON.parse(json) : json);
  };
  const call = (name, ...args) =>
    new Promise(res => {
      const id = ++seq;
      waiting[id] = res;
      N.call(id, name, JSON.stringify(args));
    });
  const listeners = {};
  const on = (ev, cb) => (listeners[ev] = listeners[ev] || []).push(cb);
  const emit = (ev, d) => (listeners[ev] || []).forEach(cb => setTimeout(() => cb(d)));
  window.__cosmoEvent = (ev, json) => {
    const d = typeof json === 'string' ? JSON.parse(json || 'null') : json;
    if (ev === 'resumed') sessionBack();
    else emit(ev, d);
  };

  const INFO = sync('info') || {};
  const IOS = INFO.os === 'ios';
  const SYSTEM = IOS ? INFO.system || 'iOS' : 'Android';
  const EMU = IOS ? 'MeloCafe' : 'Cemu for Android';
  // the automatic test can start without menu music
  if (INFO.quiet)
    try {
      for (const k of ['music', 'uiSounds', 'boot']) localStorage.setItem('cosmou.' + k, 'false');
    } catch {}
  const ORIGIN = location.origin;
  const pubUrl = rel => ORIGIN + '/files/' + rel.split('/').map(encodeURIComponent).join('/');
  const assetUrl = rel => ORIGIN + '/assets/www/' + rel;
  const readJson = (rel, def) => {
    const t = sync('read', rel);
    try {
      return t ? JSON.parse(t) : def;
    } catch {
      return def;
    }
  };

  // ---------- settings (settings.json in the app's own folder) ----------
  const read = () => readJson('settings.json', { gamesDir: '' });
  const write = s => sync('write', 'settings.json', JSON.stringify(s, null, 2));
  // what the window sees: Cemu and the games folder as names (the real folder address stays in here)
  const withCemu = s => {
    const c = sync('cemuInfo') || {};
    return {
      ...s,
      gamesDir: s.gamesDir ? s.gamesDirName || 'Games folder' : '',
      cemuPath: c.installed ? EMU : '',
      cemuManaged: false,
      cemuVersion: c.version ? 'v' + String(c.version).replace(/^v/i, '') : '',
      cemuFound: !!c.installed,
    };
  };
  const settings = () => withCemu(read());

  // ---------- library ----------
  const REGION = { P: 'Europe', E: 'USA', J: 'Japan' };
  const clean = s =>
    s
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const unxml = s =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  const tag = (xml, name) => {
    const m = String(xml || '').match(new RegExp('<' + name + '[^>]*>([^<]*)</' + name + '>', 'i'));
    return m ? unxml(m[1]).trim() : '';
  };
  const safeName = n => n.replace(/[<>:"/\\|?*]/g, '_');
  function readMeta(x) {
    if (!x) return null;
    return {
      title: tag(x, 'longname_en').replace(/\s+/g, ' '),
      id: tag(x, 'title_id').toLowerCase(),
      code: (tag(x, 'product_code').match(/([A-Z0-9]{4})$/) || [])[1] || '',
      maker: tag(x, 'company_code').slice(-2),
    };
  }
  // iPhone and iPad: the games are inside MeloCafe; CosmoU keeps the list MeloCafe sent last time
  function scanMeloCafe() {
    const list = readJson('melocafe-games.json', null);
    if (!Array.isArray(list)) return [];
    const have = new Set(sync('list', 'public/covers-auto') || []),
      manual = sync('list', 'public/covers') || [];
    const out = [],
      seen = {};
    for (const e of list) {
      const tid = String(e.tid || '').toLowerCase();
      if (!/^[0-9a-f]{16}$/.test(tid) || !/^\d+$/.test(String(e.id))) continue;
      // updates and DLC are not games of their own
      if (/^0005000[ec]/.test(tid)) continue;
      let name = clean(String(e.title || '').replace(/\s+/g, ' ')) || tid;
      seen[name] = (seen[name] || 0) + 1;
      if (seen[name] > 1) name += ' (' + seen[name] + ')';
      const mc = manual.find(f => f.replace(/\.(png|jpe?g|webp)$/i, '') === safeName(name));
      const icon = have.has(tid + '-icon.png') ? pubUrl('covers-auto/' + tid + '-icon.png') : '';
      out.push({
        name,
        path: 'melocafe:' + e.id,
        tid,
        low: tid.slice(8),
        color: e.color || '',
        format: 'Wii U · MeloCafe',
        cover: (mc && pubUrl('covers/' + mc)) || icon,
        full: '',
        disc: '',
        icon,
        hero: '',
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  async function scan() {
    const s = read();
    if (IOS) return withApps(s.gamesDir ? scanMeloCafe() : []);
    if (!s.gamesDir) return withApps([]);
    const r = await call('scanTree', s.gamesDir);
    if (!r || !r.ok) {
      lastScanError = (r && r.error) || 'The games folder can’t be read.';
      return withApps([]);
    }
    lastScanError = '';
    const out = [],
      updates = new Set();
    for (const e of r.entries) {
      if (e.kind === 'file') {
        const base = e.name.replace(/\.[^.]+$/, '');
        out.push({
          name: clean(base) || base,
          path: e.uri,
          tid: '',
          low: '',
          format: 'Wii U · ' + e.name.split('.').pop().toUpperCase(),
        });
      } else if (e.kind === 'dir') {
        const m = readMeta(e.meta);
        const tid = (m && m.id) || (e.name.match(/[0-9a-f]{16}/i) || [''])[0].toLowerCase();
        const kind = tid.slice(0, 8),
          low = tid.slice(8);
        if (kind === '0005000e' || /\[update\]/i.test(e.name)) {
          updates.add(low);
          continue;
        }
        if (kind === '0005000c' || /\[dlc\]/i.test(e.name)) continue;
        const reg = m && REGION[m.code[3]];
        out.push({
          name: (m && m.title) || clean(e.name) || e.name,
          path: e.rpx,
          dirUri: e.uri,
          tid,
          low,
          meta: m,
          key: e.key,
          color: e.color || '',
          format: 'Wii U' + (reg ? ' · ' + reg : ''),
        });
      }
    }
    const have = new Set(sync('list', 'public/covers-auto') || []),
      manual = sync('list', 'public/covers') || [];
    const has = f => have.has(f);
    const seen = {};
    for (const g of out) {
      if (g.low && updates.has(g.low)) g.format += ' · Update';
      seen[g.name] = (seen[g.name] || 0) + 1;
      if (seen[g.name] > 1) g.name += ' (' + seen[g.name] + ')';
      const key = g.tid || g.key || safeName(g.name);
      const mc = manual.find(f => f.replace(/\.(png|jpe?g|webp)$/i, '') === safeName(g.name));
      const icon = has(key + '-icon.png') ? pubUrl('covers-auto/' + key + '-icon.png') : '';
      const auto = f => (has(f) ? pubUrl('covers-auto/' + f) : '');
      g.cover = (mc && pubUrl('covers/' + mc)) || auto(key + '-cover.jpg') || auto(key + '-box.png') || icon;
      g.full = mc ? '' : auto(key + '-full.jpg');
      g.disc = auto(key + '-disc.png');
      g.icon = icon;
      g.hero = auto(key + '-hero.png');
      delete g.key;
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    if (read().onlineCovers !== false) queueBoxArt(out);
    return withApps(out);
  }
  let lastScanError = '';

  // online case art from GameTDB, like the desktop app (one at a time, misses remembered for 7 days)
  const boxJobs = [],
    boxBusy = new Set();
  let boxRunning = false;
  function artRegions(L) {
    if (L === 'E') return ['US', 'EN'];
    if (L === 'J') return ['JA'];
    const loc = String(navigator.language || '')
      .slice(0, 2)
      .toUpperCase();
    const pal = ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'RU', 'AU'];
    return [...new Set([pal.includes(loc) ? loc : 'EN', ...pal, 'US'])];
  }
  function queueBoxArt(list) {
    const have = new Set(sync('list', 'public/covers-auto') || []);
    for (const g of list) {
      if (!g.meta || !g.meta.code || !g.tid || boxBusy.has(g.tid) || have.has(g.tid + '-cover.jpg')) continue;
      const miss = Number(sync('read', 'public/covers-auto/' + g.tid + '-art.miss') || 0);
      if (miss && Date.now() - miss < 7 * 864e5) continue;
      boxBusy.add(g.tid);
      boxJobs.push(g);
    }
    if (!boxRunning) runBox();
  }
  async function runBox() {
    boxRunning = true;
    while (boxJobs.length) {
      const g = boxJobs.shift(),
        id = g.meta.code + (g.meta.maker || '01'),
        base = 'https://art.gametdb.com/wiiu/',
        file = k => 'public/covers-auto/' + g.tid + (k === 'disc' ? '-disc.png' : k === 'full' ? '-full.jpg' : '-cover.jpg');
      let region = '';
      for (const kind of ['coverHQ', 'cover']) {
        for (const r of artRegions(g.meta.code[3])) {
          const x = await call('fetchFile', `${base}${kind}/${r}/${id}.jpg`, file('cover'), 'image/');
          if (x && x.ok) {
            region = r;
            break;
          }
          if (x && x.offline) break;
        }
        if (region) break;
      }
      if (region) {
        const tries = [...new Set([region, 'EN', 'US'])];
        for (const r of tries) if ((await call('fetchFile', `${base}coverfullHQ/${r}/${id}.jpg`, file('full'), 'image/')).ok) break;
        for (const r of tries) if ((await call('fetchFile', `${base}disc/${r}/${id}.png`, file('disc'), 'image/')).ok) break;
        emit('covers-updated');
      } else sync('write', 'public/covers-auto/' + g.tid + '-art.miss', String(Date.now()));
      boxBusy.delete(g.tid);
      await new Promise(r => setTimeout(r, 400));
    }
    boxRunning = false;
  }

  // ---------- other apps (Android: any installed app; iPhone and iPad: an app's link, like melonx:// or delta://) ----------
  function withApps(list) {
    const names = new Set(list.map(g => g.name));
    for (const a of read().customApps || []) {
      const base = a.name || a.path;
      let n = base,
        k = 1;
      while (names.has(n)) n = base + ' (app' + (k++ > 1 ? ' ' + k : '') + ')';
      names.add(n);
      list.push({
        name: n,
        path: a.path,
        appId: a.id,
        kind: 'app',
        args: '',
        format: 'App · ' + (IOS ? SYSTEM : 'Android'),
        cover: a.cover ? pubUrl(a.cover) : '',
      });
    }
    return list.sort((x, y) => x.name.localeCompare(y.name));
  }
  const APP_PREFIX = IOS ? 'ios-app:' : 'android-app:';
  const APP_PATH = IOS ? /^ios-app:[a-z][a-z0-9+.-]*:\S*$/i : /^android-app:[\w.]+$/;
  const pkgOf = p => String(p || '').replace(/^(android|ios)-app:/, '');

  // ---------- play time: a session lasts from the start until you come back to CosmoU ----------
  function startSession(name) {
    write({ ...read(), pendingSession: { name, start: Date.now() } });
  }
  function sessionBack() {
    const s = read(),
      p = s.pendingSession;
    if (!p) return;
    delete s.pendingSession;
    write(s);
    endSession(p.name, p.start, Math.min(Date.now(), p.start + 12 * 3600e3));
  }
  function endSession(name, start, end) {
    const sec = Math.round((end - start) / 1000);
    if (sec < 60 || typeof name !== 'string') return;
    const s = read(),
      pt = { ...(s.playtime || {}) },
      e = pt[name] || { sec: 0, sessions: 0, first: start };
    pt[name] = { sec: e.sec + sec, sessions: e.sessions + 1, first: Math.min(e.first || start, start), last: end, lastSec: sec };
    const sessions = [...(Array.isArray(s.sessions) ? s.sessions : []), { name, start, sec }].slice(-1000);
    write({ ...s, playtime: pt, sessions });
    emit('session-ended', { name, sec });
  }

  async function play(arg) {
    if (arg && typeof arg === 'object' && arg.appId) {
      const a = (read().customApps || []).find(x => x.id === arg.appId);
      if (!a) return { ok: false, error: 'This app isn’t in your library anymore.' };
      const r = await call('launchApp', pkgOf(a.path));
      if (r && r.ok) startSession(arg.name || a.name);
      return r && r.ok ? { ok: true, note: 'app' } : { ok: false, error: (r && r.error) || 'The app couldn’t be started.' };
    }
    const g = typeof arg === 'string' ? { path: arg } : arg || {};
    const c = sync('cemuInfo') || {};
    if (!c.installed) return { ok: false, error: EMU + ' isn’t installed yet. Open Settings → Cemu & Games to get it.' };
    const game = lastGames.find(x => x.path === g.path) || {};
    const r = await call('launchCemu', g.path, game.dirUri || '');
    if (!r || !r.ok) return { ok: false, error: (r && r.error) || 'Cemu couldn’t be started.' };
    if (g.name) startSession(g.name);
    return { ok: true, note: '', preset: '' };
  }
  let lastGames = [];

  // ---------- music ----------
  const AUDIO = /\.(mp3|ogg|wav|m4a|flac)$/i;
  // theme songs: .ogg, on iPhone and iPad as .m4a (made from the same songs when the app is built)
  const THEME_MUSIC = new Set((sync('assets', 'www/assets/music/themes') || []).filter(f => /\.(ogg|m4a)$/i.test(f)));
  function getMusic() {
    const own = (sync('list', 'public/music') || []).find(f => AUDIO.test(f));
    if (own) return { url: pubUrl('music/' + own), name: own, builtin: false };
    const b = (sync('assets', 'www/assets/music') || []).find(f => AUDIO.test(f));
    return b ? { url: assetUrl('assets/music/' + b), name: b, builtin: true } : null;
  }
  function themeMusic(id) {
    if (!/^[a-z0-9-]+$/.test(String(id))) return null;
    if (id.startsWith('u-')) {
      const m = (sync('list', 'public/own-themes/' + id) || []).find(n => /^music\./i.test(n) && AUDIO.test(n));
      return m ? { url: pubUrl('own-themes/' + id + '/' + m) } : null;
    }
    const f = [id + '.m4a', id + '.ogg'].find(n => THEME_MUSIC.has(n));
    return f ? { url: assetUrl('assets/music/themes/' + f) } : null;
  }

  // ---------- own themes (same checks as the desktop app) ----------
  const cleanText = (v, n) =>
    String(v == null ? '' : v)
      .replace(/[\u0000-\u001f<>]/g, '')
      .trim()
      .slice(0, n);
  const oneOf = (v, list, def) => (list.includes(String(v).toLowerCase()) ? String(v).toLowerCase() : def);
  function hexColor(v) {
    let h = String(v == null ? '' : v).trim();
    if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return '';
    h = h.replace('#', '').toLowerCase();
    if (h.length === 3) h = h.replace(/./g, c => c + c);
    return '#' + h;
  }
  function cleanColors(raw, label, optional) {
    if (!raw || typeof raw !== 'object') return optional ? null : { error: `"${label}" is missing.` };
    const c = {};
    for (const k of ['background', 'card', 'selection', 'text']) {
      c[k] = hexColor(raw[k]);
      if (!c[k]) return { error: `"${label}.${k}" must be a hex color like #1a2b3c.` };
    }
    for (const k of ['accent', 'background2']) if (raw[k] != null && raw[k] !== '') c[k] = hexColor(raw[k]) || undefined;
    return c;
  }
  const BACKGROUNDS =
    'plain gradient stars grid dots stripes scanlines waves bubbles towers tiles haze facets bokeh fog lcd xmb xmbdust xmbnight'.split(' ');
  function cleanTheme(raw) {
    if (!raw || typeof raw !== 'object') return { error: 'theme.json is not a valid theme file.' };
    const name = cleanText(raw.name, 40);
    const slug = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    if (!name || !slug) return { error: 'The theme needs a "name" (letters or numbers).' };
    const colors = cleanColors(raw.colors, 'colors');
    if (colors.error) return colors;
    const dark = cleanColors(raw.colorsDark, 'colorsDark', true);
    if (dark && dark.error) return dark;
    const author = cleanText(raw.author, 40),
      inspired = cleanText(raw.inspired, 60);
    const t = {
      id: 'u-' + slug,
      name,
      author,
      desc: cleanText(raw.description, 80) || (inspired ? 'Inspired by ' + inspired : 'Theme by ' + (author || 'the community')),
      mode: oneOf(raw.mode, ['both', 'light', 'dark'], 'both'),
      colors,
      background: oneOf(raw.background, BACKGROUNDS, 'plain'),
      selection: oneOf(raw.selection, ['glow', 'outline', 'brackets'], 'glow'),
      font: oneOf(raw.font, ['normal', 'rounded', 'pixel', 'mono', 'serif'], 'normal'),
      corners: oneOf(raw.corners, ['square', 'rounded', 'round'], 'rounded'),
    };
    if (dark) t.colorsDark = dark;
    if (raw.music) t.music = String(raw.music).split(/[\\/]/).pop().slice(0, 100);
    return { theme: t };
  }
  async function ownThemeImport() {
    const p = await call('themePick');
    if (!p || p.cancel) return { cancel: true };
    if (p.error) return { error: p.error };
    let raw;
    try {
      raw = JSON.parse(p.json);
    } catch {
      return { error: 'theme.json could not be read (is it valid JSON?).' };
    }
    const c = cleanTheme(raw);
    if (c.error) return { error: c.error };
    const t = c.theme;
    if (p.music) t.music = 'music' + p.music.ext;
    else delete t.music;
    const r = await call('themeInstall', t.id, JSON.stringify(t, null, 2), p.music ? p.music.tmp : '');
    return r && r.ok ? { ok: true, theme: t, hasMusic: !!p.music } : { error: 'Could not save the theme.' };
  }
  function ownThemes() {
    const out = [];
    for (const n of sync('list', 'public/own-themes') || []) {
      if (!/^u-[a-z0-9-]+$/.test(n)) continue;
      try {
        const c = cleanTheme(JSON.parse(sync('read', 'public/own-themes/' + n + '/theme.json')));
        if (c.theme && c.theme.id === n) out.push({ ...c.theme, hasMusic: !!c.theme.music });
      } catch {}
    }
    return out;
  }

  // ---------- settings backup ----------
  const EXPORT_KEYS = {
    theme: 'string',
    gamesDir: 'string',
    onlineCovers: 'boolean',
    customApps: 'array',
    plays: 'object',
    playtime: 'object',
    sessions: 'array',
  };
  const UI_KEYS = ['style', 'viewMode', 'wuView', 'hoverCases', 'uiSounds', 'music', 'buddies', 'posts', 'favs', 'sort', 'show'];
  const typeOk = (v, t) =>
    t === 'array' ? Array.isArray(v) : t === 'object' ? v && typeof v === 'object' && !Array.isArray(v) : typeof v === t;

  // ---------- updates ----------
  const verParts = v =>
    String(v || '')
      .replace(/^v/i, '')
      .split(/[.-]/)
      .slice(0, 3)
      .map(n => parseInt(n, 10) || 0);
  const newer = (a, b) => {
    const x = verParts(a),
      y = verParts(b);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };
  const RELEASES = 'https://github.com/Eryski/CosmoU/releases/latest';
  const CEMU_ANDROID = 'https://github.com/SSimco/Cemu/releases/latest';
  // MeloCafe is installed with SideStore, AltStore or PlumeImpactor; its page explains how
  const MELOCAFE = 'https://github.com/stossy11/MeloCafe#download--install';
  const EMU_PAGE = IOS ? MELOCAFE : CEMU_ANDROID;
  const no = what => async () => ({ ok: false, error: what + ' isn’t available on ' + (IOS ? 'iPhone and iPad' : 'Android') + '.' });

  window.api = {
    platform: IOS ? 'ios' : 'android',
    appVersion: INFO.version || '',
    launchPlay: '',
    [IOS ? 'ios' : 'android']: { ...INFO, cemuPage: EMU_PAGE },
    getSettings: async () => settings(),
    scan: async () => (lastGames = await scan()),
    scanError: () => lastScanError,
    pickFolder: async () => {
      const r = await call('pickFolder');
      // iPhone and iPad: MeloCafe opened for a moment and sent its game list
      if (IOS) {
        if (r && r.ok) {
          write({ ...read(), gamesDir: 'melocafe', gamesDirName: 'MeloCafe' });
          lastScanError = r.count ? '' : 'MeloCafe has no games yet. Add your games in MeloCafe, then get them again here.';
        } else if (r && !r.cancel) {
          lastScanError = r.error || 'MeloCafe didn’t send its games.';
          return { ...settings(), error: lastScanError };
        }
        return settings();
      }
      if (r && r.uri) write({ ...read(), gamesDir: r.uri, gamesDirName: r.name || '' });
      return settings();
    },
    pickCemu: async () => {
      const s = settings();
      if (!s.cemuPath) {
        sync('openUrl', EMU_PAGE);
        return { ...s, error: 'Install ' + EMU + ' from the page that opened, then come back.' };
      }
      return s;
    },
    cemuStatus: async () => {
      const c = sync('cemuInfo') || {};
      return { installed: !!c.installed, path: c.pkg || '', managed: false, version: c.version || '' };
    },
    cemuInstall: async () => {
      sync('openUrl', EMU_PAGE);
      return { ok: false, cancelled: true };
    },
    cemuCancel: async () => {},
    onCemuProgress: () => {},
    play,
    playLog: async () => {
      const s = read();
      return { playtime: s.playtime || {}, sessions: Array.isArray(s.sessions) ? s.sessions : [] };
    },
    onSessionEnded: cb => on('session-ended', cb),
    mergePlays: async p => {
      const s = read(),
        plays = { ...(s.plays || {}) };
      if (p && typeof p === 'object')
        for (const [k, v] of Object.entries(p)) if (typeof k === 'string' && Number.isFinite(+v) && !(plays[k] >= +v)) plays[k] = +v;
      write({ ...s, plays });
      return plays;
    },
    setOnlineCovers: async v => {
      const s = { ...read(), onlineCovers: !!v };
      write(s);
      return withCemu(s);
    },
    onCoversUpdated: cb => on('covers-updated', cb),
    openCovers: async () => ({ ok: false }),
    showInFolder: async () => {},
    setTheme: async t => {
      const v = t === 'light' || t === 'dark' ? t : 'system';
      write({ ...read(), theme: v });
      applyDark();
      return v;
    },
    setSetupDone: async v => {
      write({ ...read(), setupDone: v !== false });
      return settings();
    },
    setTvMode: async on => {
      sync('immersive', true);
      return !!on;
    },
    setGameSetting: async () => settings(),
    setDefaultQuality: async () => settings(),
    // music
    getMusic: async () => getMusic(),
    themeMusic: async id => themeMusic(id),
    pickMusic: async () => {
      const r = await call('pickFile', 'audio', 'public/music');
      return r && r.rel ? { url: pubUrl(r.rel.replace(/^public\//, '')), name: r.name } : null;
    },
    resetMusic: async () => {
      for (const f of sync('list', 'public/music') || []) if (AUDIO.test(f)) sync('remove', 'public/music/' + f);
      return true;
    },
    openMusicFolder: async () => {},
    // own themes
    ownThemes: async () => ownThemes(),
    ownThemeImport: async () => ownThemeImport(),
    ownThemeRemove: async id => (/^u-[a-z0-9-]+$/.test(String(id)) ? !!sync('remove', 'public/own-themes/' + id) : false),
    ownThemeExport: async id => {
      if (!/^u-[a-z0-9-]+$/.test(String(id))) return { error: 'Unknown theme.' };
      const r = await call('themeExport', id, id.replace(/^u-/, '') + '.cosmoutheme');
      return r && r.ok ? { ok: true } : r && r.cancel ? { cancel: true } : { error: 'Could not save the theme file.' };
    },
    // other apps: any app installed on the phone or tablet (on iPhone and iPad: an app with a link)
    appPick: async () => {
      const r = await call('pickApp');
      return r && r.pkg ? { path: APP_PREFIX + r.pkg, name: r.name, coverRel: r.icon || '' } : null;
    },
    appCoverPick: async () => {
      const r = await call('pickFile', 'image', 'public/covers-apps');
      return r && r.rel ? r.rel : null;
    },
    appSave: async a => {
      // (on iPhone and iPad CosmoU can only check the apps it knows, so any app link is fine)
      if (!a || typeof a.path !== 'string' || !APP_PATH.test(a.path) || (!IOS && !sync('appInstalled', pkgOf(a.path))))
        return { ok: false, error: 'Please choose an app first.' };
      const s = read(),
        apps = [...(s.customApps || [])];
      const id = typeof a.id === 'string' && apps.some(x => x.id === a.id) ? a.id : Math.random().toString(16).slice(2, 14).padEnd(12, '0');
      const old = apps.find(x => x.id === id) || {};
      let cover = old.cover || '';
      const pick =
        typeof a.coverFile === 'string' && /^public\/covers-apps\/[^/]+\.(png|jpe?g|webp)$/i.test(a.coverFile) ? a.coverFile : '';
      if (pick) {
        const to = 'covers-apps/' + id + '.' + pick.split('.').pop().toLowerCase();
        if (cover && cover !== to) sync('remove', 'public/' + cover);
        sync('move', pick, 'public/' + to);
        cover = to;
      } else if (!cover && !IOS) {
        const icon = 'covers-apps/' + id + '.png';
        if (sync('appIcon', pkgOf(a.path), 'public/' + icon)) cover = icon;
      }
      const entry = {
        id,
        name:
          String(a.name || '')
            .trim()
            .slice(0, 60) || pkgOf(a.path),
        path: a.path,
        args: '',
        cover,
      };
      const i = apps.findIndex(x => x.id === id);
      if (i >= 0) apps[i] = entry;
      else apps.push(entry);
      write({ ...s, customApps: apps });
      return { ok: true, id };
    },
    appRemove: async id => {
      const s = read(),
        a = (s.customApps || []).find(x => x.id === id);
      if (a && a.cover) sync('remove', 'public/' + a.cover);
      write({ ...s, customApps: (s.customApps || []).filter(x => x.id !== id) });
      return { ok: true };
    },
    appGet: async id => {
      const a = (read().customApps || []).find(x => x.id === id);
      return a ? { ...a, coverUrl: a.cover ? pubUrl(a.cover) : '' } : null;
    },
    // help and updates
    feedbackInfo: async () => {
      const s = settings();
      return {
        app: INFO.version || '',
        os: IOS
          ? SYSTEM + ' ' + (INFO.release || '') + ' · ' + (INFO.model || INFO.device || '')
          : 'Android ' + (INFO.release || '') + ' · ' + [INFO.manufacturer, INFO.model].filter(Boolean).join(' ') + ' · ' + (INFO.abi || ''),
        platform: IOS ? 'ios' : 'android',
        cemu: s.cemuPath ? (s.cemuVersion || 'installed') + ' (' + s.cemuPath + ')' : 'not installed',
        data: '-',
        games: lastGames.filter(g => g.kind !== 'app').length,
        packs: 0,
        ctrl: [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length,
        gpu: '',
      };
    },
    openIssue: async body =>
      sync('openUrl', 'https://github.com/Eryski/CosmoU/issues/new?body=' + encodeURIComponent(String(body || '').slice(0, 6000))),
    openDiscord: async () => sync('openUrl', 'https://discord.gg/BZry7jGjr7'),
    checkUpdate: async () => {
      const current = INFO.version || '';
      const r = await call('fetchText', 'https://api.github.com/repos/Eryski/CosmoU/releases/latest');
      let rel = null;
      try {
        rel = r && r.ok ? JSON.parse(r.text) : null;
      } catch {}
      if (!rel || !rel.tag_name) return { ok: false, current, error: 'Couldn’t reach GitHub. Check your internet connection.' };
      const latest = rel.tag_name.replace(/^v/i, '');
      return { ok: true, current, latest, available: newer(latest, current), notes: String(rel.body || '').slice(0, 1500) };
    },
    openReleases: async () => sync('openUrl', RELEASES),
    openUrl: async u => /^https:\/\//.test(String(u)) && sync('openUrl', u),
    // settings backup
    exportSettings: async ui => {
      const s = read(),
        out = {};
      for (const k of Object.keys(EXPORT_KEYS)) if (s[k] !== undefined) out[k] = s[k];
      const uiOut = {};
      for (const k of UI_KEYS) if (ui && typeof ui[k] === 'string') uiOut[k] = ui[k].slice(0, 20000);
      const data = { app: 'CosmoU', version: INFO.version || '', exportedAt: new Date().toISOString(), settings: out, ui: uiOut };
      const r = await call('saveFile', 'cosmou-settings.json', 'application/json', JSON.stringify(data, null, 2));
      return r && r.ok ? { ok: true } : { ok: false, cancelled: !r || !!r.cancel, error: r && r.error };
    },
    importSettings: async () => {
      const r = await call('pickFile', 'json', '');
      if (!r || r.cancel) return { ok: false, cancelled: true };
      let data;
      try {
        data = JSON.parse(r.text);
      } catch {}
      if (!data || data.app !== 'CosmoU' || !data.settings || typeof data.settings !== 'object')
        return { ok: false, error: 'This file isn’t a CosmoU settings file.' };
      const s = read(),
        applied = [];
      for (const [k, t] of Object.entries(EXPORT_KEYS)) {
        const v = data.settings[k];
        if (v === undefined || !typeOk(v, t)) continue;
        // a games folder from a PC can't be used here
        if (k === 'gamesDir' && !(IOS ? v === 'melocafe' : /^content:\/\//.test(v))) continue;
        if (k === 'customApps') {
          s[k] = v.filter(a => a && typeof a.id === 'string' && APP_PATH.test(String(a.path)));
          applied.push(k);
          continue;
        }
        s[k] = v;
        applied.push(k);
      }
      s.setupDone = true;
      write(s);
      const ui = {};
      for (const k of UI_KEYS) if (data.ui && typeof data.ui[k] === 'string') ui[k] = data.ui[k];
      return { ok: true, applied, ui, from: data.version || '' };
    },
    // things only the desktop Cemu allows (its settings, graphic packs, controllers, saves and Steam live inside Cemu on Android)
    cemuSettingsGet: async () => ({ found: false, current: {}, overrides: {}, defaultQuality: '' }),
    setCemuSetting: async () => ({ found: false, current: {}, overrides: {} }),
    inputGet: async slot => ({ found: false, slot, types: [], apis: [], configured: false }),
    inputSet: no('Controller setup'),
    inputProfile: no('Controller setup'),
    inputOpenCemu: async () => {
      sync('openCemu');
      return { ok: true };
    },
    inputMapGet: async slot => ({ found: false, slot, devices: [] }),
    inputMapSave: no('The button mapper'),
    gpList: async () => ({ found: false, total: 0, packs: [] }),
    gpSet: no('Graphic packs'),
    gpDownload: no('Graphic packs'),
    onGpProgress: () => {},
    autoOptimize: no('Auto-optimize'),
    savesInfo: async () => ({ supported: false, found: false, backups: [] }),
    savesBackup: no('Save backups'),
    savesRestore: no('Save backups'),
    savesDelete: no('Save backups'),
    savesFolder: no('Save backups'),
    setAutoSaveBackup: async () => settings(),
    addonsInfo: async () => ({ found: false, items: [] }),
    addonsInstall: no('Updates & DLC'),
    addonsAddFolder: no('Updates & DLC'),
    addonsForget: no('Updates & DLC'),
    addonsOpen: no('Updates & DLC'),
    onAddonProgress: () => {},
    steamInfo: async () => ({ found: false, users: [] }),
    steamAdd: no('Steam'),
  };

  // ---------- Android back button and game controllers (iPhone and iPad: the controllers only) ----------
  // back: close the top window, leave TV mode or clear the search; otherwise Android goes back to the home screen
  window.__cosmoBack = () => {
    const d = [...document.querySelectorAll('dialog[open]')].pop();
    if (d) {
      d.close();
      return true;
    }
    for (const id of ['#setup', '#launch'])
      if (document.querySelector(id) && document.querySelector(id).classList.contains('on')) return true;
    const w = document.querySelector('#wiz');
    if (w && !w.hidden) return true;
    const q = document.querySelector('#q');
    if (q && q.value) {
      q.value = '';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  };
  // controllers: Android (or iOS) sends their buttons to the app, which hands them over here as a "gamepad"
  const vpad = {
    id: IOS ? 'iOS controller' : 'Android controller',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  let vpadOn = false;
  const realPads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  // when Android hands controller buttons over itself (the WebView didn't take them), that controller comes first
  // on iPhone and iPad the app reads every controller itself, so the page only sees that one (no double presses)
  navigator.getGamepads = () => {
    const real = [...realPads()].filter(Boolean);
    return vpadOn ? (IOS ? [vpad] : [vpad, ...real]) : real;
  };
  const downAt = {};
  const setBtn = (b, on) => (vpad.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 });
  window.__cosmoPad = (button, down, ax, ay) => {
    window.__cosmoPadCount = (window.__cosmoPadCount || 0) + 1;
    if (button >= 0 && vpad.buttons[button]) {
      // a very short press (a tap on a TV remote) stays down long enough for the next look at the controller
      if (down) {
        downAt[button] = performance.now();
        setBtn(button, true);
      } else if (!vpad.buttons[button].pressed) {
        // only the release arrived (Android sometimes keeps the press of a D-pad for itself): count it as a tap
        setBtn(button, true);
        setTimeout(() => setBtn(button, false), 120);
      } else {
        const held = performance.now() - (downAt[button] || 0);
        if (held >= 120) setBtn(button, false);
        else setTimeout(() => setBtn(button, false), 120 - held);
      }
    }
    if (typeof ax === 'number') vpad.axes[0] = ax;
    if (typeof ay === 'number') vpad.axes[1] = ay;
    vpad.timestamp = performance.now();
    if (!vpadOn) {
      vpadOn = true;
      const e = new Event('gamepadconnected');
      e.gamepad = vpad;
      dispatchEvent(e);
    }
  };

  // ---------- light and dark ----------
  // The page switches its colors with "prefers-color-scheme: dark". The Android WebView doesn't follow the setting
  // in CosmoU (and not always the phone's), so CosmoU decides: its CSS dark rules are switched on or off directly,
  // and matchMedia answers the same way. "System" follows Android's dark mode (the app tells the page when it changes).
  const DARK_Q = /prefers-color-scheme:\s*dark/;
  let night = !!sync('night');
  const darkListeners = new Set();
  const darkNow = () => {
    const t = read().theme;
    return t === 'dark' || (t !== 'light' && night);
  };
  function darkRules(list, on) {
    for (const r of list || []) {
      if (r.media && (DARK_Q.test(r.media.mediaText) || r.__cosmoDark)) {
        r.__cosmoDark = true;
        r.media.mediaText = on ? 'all' : 'not all';
      }
      if (r.cssRules && !r.media) darkRules(r.cssRules, on);
    }
  }
  function applyDark() {
    const on = darkNow();
    for (const sh of document.styleSheets) {
      try {
        darkRules(sh.cssRules, on);
      } catch {}
    }
    darkMql.matches = on;
    for (const cb of darkListeners) cb({ matches: on, media: '(prefers-color-scheme: dark)' });
  }
  const darkMql = {
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (ev, cb) => ev === 'change' && darkListeners.add(cb),
    removeEventListener: (ev, cb) => darkListeners.delete(cb),
    addListener: cb => darkListeners.add(cb),
    removeListener: cb => darkListeners.delete(cb),
    onchange: null,
  };
  const realMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = q => (DARK_Q.test(String(q)) ? darkMql : realMatchMedia(q));
  darkMql.matches = darkNow();
  // the style sheets are ready once the page is
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', applyDark);
  applyDark();
  addEventListener('load', applyDark);
  // theme files that are added later (own themes) get the same treatment
  new MutationObserver(() => applyDark()).observe(document.head, { childList: true });
  on('night', d => {
    night = !!d;
    applyDark();
  });

  // ---------- screen size: lay the page out at least 1100 × 600 and let the phone scale it to the screen ----------
  function fit() {
    // iPhone and iPad: the app tells the size of the page area (next to the notch, not under it)
    const v = IOS ? sync('viewSize') : null;
    const w = v ? v[0] : screen.width,
      h = v ? v[1] : screen.height,
      landscape = w >= h,
      lw = Math.max(w, h),
      lh = Math.min(w, h);
    const want = landscape ? Math.max(1100, Math.ceil((600 * lw) / lh)) : 760;
    let m = document.querySelector('meta[name=viewport]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'viewport';
      document.head.append(m);
    }
    m.content = lw >= want && landscape ? 'width=device-width, initial-scale=1' : 'width=' + want + ', user-scalable=no';
  }
  fit();
  addEventListener('orientationchange', () => setTimeout(fit, 300));
  on('viewsize', fit);
  // a very old WebView still works, but some colors and effects look plainer
  if (!IOS && chrome && chrome < 100)
    setTimeout(() => {
      if (typeof toast === 'function') toast('Tip: update “Android System WebView” in the Play Store for the full CosmoU look.', 7000);
    }, 5000);
  // iPhone and iPad: the strips next to the notch take the color of the page
  if (IOS) {
    let bg = '';
    setInterval(() => {
      const c = document.body ? getComputedStyle(document.body).backgroundColor : '';
      if (c && c !== bg) sync('bg', (bg = c));
    }, 1000);
  }
  document.documentElement.classList.add(IOS ? 'os-ios' : 'os-android');
})();
