const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, nativeTheme, Menu } = require('electron');
const fs = require('fs'),
  path = require('path'),
  { pathToFileURL } = require('url'),
  { spawn } = require('child_process');
const https = require('https'),
  crypto = require('crypto'),
  AdmZip = require('adm-zip');
const P = require('./platform');

// ---------- portable mode ----------
// The Windows portable .exe keeps everything (settings, covers, music, themes, saves, a downloaded Cemu) in a
// "CosmoU-data" folder next to itself instead of %APPDATA%\CosmoU. Any other CosmoU does the same when that folder
// already exists next to the program (or next to the AppImage). This has to happen before Electron uses the folder.
const PORTABLE_DIR = (() => {
  const runDir = process.env.PORTABLE_EXECUTABLE_DIR || (process.env.APPIMAGE ? path.dirname(process.env.APPIMAGE) : '') || (app.isPackaged ? path.dirname(process.execPath) : '');
  if (!runDir) return '';
  const d = path.join(runDir, 'CosmoU-data');
  if (!process.env.PORTABLE_EXECUTABLE_DIR && !fs.existsSync(d)) return '';
  try {
    fs.mkdirSync(d, { recursive: true });
    // the folder must be writable (not on a read-only stick or in a protected folder)
    const t = path.join(d, '.write-test');
    fs.writeFileSync(t, '');
    fs.rmSync(t, { force: true });
    return d;
  } catch {
    return '';
  }
})();
if (PORTABLE_DIR) {
  const old = app.getPath('userData');
  // the first portable start takes over what an earlier CosmoU kept in %APPDATA% (it stays there as a backup)
  try {
    if (!fs.existsSync(path.join(PORTABLE_DIR, 'settings.json')) && fs.existsSync(path.join(old, 'settings.json')) && path.resolve(old) !== path.resolve(PORTABLE_DIR)) {
      const skip = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Crashpad', 'blob_storage', 'Session Storage', 'Shared Dictionary', 'logs']);
      for (const f of fs.readdirSync(old)) if (!skip.has(f)) fs.cpSync(path.join(old, f), path.join(PORTABLE_DIR, f), { recursive: true, force: false, errorOnExist: false });
      // paths that pointed into the old folder (a Cemu CosmoU downloaded, for example) now point into the new one
      const sf = path.join(PORTABLE_DIR, 'settings.json');
      const esc = x => JSON.stringify(x).slice(1, -1);
      const txt = fs.readFileSync(sf, 'utf8');
      fs.writeFileSync(sf, txt.split(esc(old + path.sep)).join(esc(PORTABLE_DIR + path.sep)));
    }
  } catch {}
  app.setPath('userData', PORTABLE_DIR);
  app.setPath('sessionData', PORTABLE_DIR);
  try {
    app.setPath('crashDumps', path.join(PORTABLE_DIR, 'Crashpad'));
  } catch {}
}
let mainWin = null,
  activeReq = null,
  cancelled = false;

const cfgFile = () => path.join(app.getPath('userData'), 'settings.json');
const coversDir = () => path.join(app.getPath('userData'), 'covers');
const read = () => {
  try {
    return JSON.parse(fs.readFileSync(cfgFile(), 'utf8'));
  } catch {
    return { cemuPath: '', gamesDir: '' };
  }
};
const write = s => fs.writeFileSync(cfgFile(), JSON.stringify(s, null, 2));
const EXT = ['.wua', '.wud', '.wux', '.rpx'];

const autoDir = () => path.join(app.getPath('userData'), 'covers-auto');
const safeName = n => n.replace(/[<>:"/\\|?*]/g, '_');
const urlIf = p => (fs.existsSync(p) ? pathToFileURL(p).href : '');
const REGION = { P: 'Europe', E: 'USA', J: 'Japan' };

function manualCover(name) {
  for (const e of ['.png', '.jpg', '.jpeg', '.webp']) {
    const p = path.join(coversDir(), safeName(name) + e);
    if (fs.existsSync(p)) return pathToFileURL(p).href;
  }
  return '';
}

// "Splatoon [Game] [0005000010176a00]" -> "Splatoon"
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
  const m = xml.match(new RegExp('<' + name + '[^>]*>([^<]*)</' + name + '>', 'i'));
  return m ? unxml(m[1]).trim() : '';
};

// File names are case-sensitive on Linux, and some Wii U dumps use "Meta" or "Code": find the real name
function ci(base, ...parts) {
  let p = base;
  for (const part of parts) {
    const exact = path.join(p, part);
    if (P.IS_WIN || fs.existsSync(exact)) {
      p = exact;
      continue;
    }
    let hit = null;
    try {
      hit = fs.readdirSync(p).find(n => n.toLowerCase() === part.toLowerCase());
    } catch {}
    p = path.join(p, hit || part);
  }
  return p;
}
function readMeta(gameDir) {
  const f = ci(gameDir, 'meta', 'meta.xml');
  if (!fs.existsSync(f)) return null;
  const x = fs.readFileSync(f, 'utf8');
  return {
    title: tag(x, 'longname_en').replace(/\s+/g, ' '),
    id: tag(x, 'title_id').toLowerCase(),
    code: (tag(x, 'product_code').match(/([A-Z0-9]{4})$/) || [])[1] || '',
    maker: tag(x, 'company_code').slice(-2),
  };
}

// Wii U icon files are uncompressed TGA; convert to PNG once and cache it.
function tgaToPng(file) {
  const b = fs.readFileSync(file);
  const w = b.readUInt16LE(12),
    h = b.readUInt16LE(14),
    bpp = b[16],
    desc = b[17];
  if (b[2] !== 2 || (bpp !== 24 && bpp !== 32) || !w || !h) return null;
  const bytes = bpp / 8,
    off = 18 + b[0],
    top = (desc & 0x20) !== 0,
    out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = top ? y : h - 1 - y;
    for (let x = 0; x < w; x++) {
      const s = off + (sy * w + x) * bytes,
        d = (y * w + x) * 4;
      out[d] = b[s];
      out[d + 1] = b[s + 1];
      out[d + 2] = b[s + 2];
      out[d + 3] = bytes === 4 ? b[s + 3] : 255;
    }
  }
  return nativeImage.createFromBitmap(out, { width: w, height: h }).toPNG();
}
function cacheTga(src, dst) {
  if (fs.existsSync(dst) || !fs.existsSync(src)) return;
  try {
    const png = tgaToPng(src);
    if (png) fs.writeFileSync(dst, png);
  } catch {}
}
function avgColor(p) {
  try {
    const bm = nativeImage.createFromPath(p).resize({ width: 8, height: 8 }).toBitmap();
    let r = 0,
      g = 0,
      b = 0;
    const n = bm.length / 4;
    for (let i = 0; i < bm.length; i += 4) {
      b += bm[i];
      g += bm[i + 1];
      r += bm[i + 2];
    }
    return `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`;
  } catch {
    return '';
  }
}

function scan(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  fs.mkdirSync(autoDir(), { recursive: true });
  const out = [],
    updates = new Set();
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && EXT.includes(path.extname(e.name).toLowerCase())) {
      const base = path.parse(e.name).name;
      out.push({
        name: clean(base) || base,
        path: p,
        tid: '',
        low: '',
        format: 'Wii U · ' + path.extname(e.name).slice(1).toUpperCase(),
      });
    } else if (e.isDirectory()) {
      const code = ci(p, 'code');
      if (!fs.existsSync(code)) continue;
      const rpx = fs.readdirSync(code).find(f => f.toLowerCase().endsWith('.rpx'));
      if (!rpx) continue;
      let m = null;
      try {
        m = readMeta(p);
      } catch {}
      const tid = (m && m.id) || (e.name.match(/[0-9a-f]{16}/i) || [''])[0].toLowerCase();
      const kind = tid.slice(0, 8),
        low = tid.slice(8);
      if (kind === '0005000e' || /\[update\]/i.test(e.name)) {
        updates.add(low);
        continue;
      } // updates are not games
      if (kind === '0005000c' || /\[dlc\]/i.test(e.name)) continue;
      const reg = m && REGION[m.code[3]];
      out.push({
        name: (m && m.title) || clean(e.name) || e.name,
        path: path.join(code, rpx),
        dir: p,
        tid,
        low,
        meta: m,
        format: 'Wii U' + (reg ? ' · ' + reg : ''),
      });
    }
  }
  const seen = {};
  for (const g of out) {
    if (g.low && updates.has(g.low)) g.format += ' · Update';
    seen[g.name] = (seen[g.name] || 0) + 1;
    if (seen[g.name] > 1) g.name += ' (' + seen[g.name] + ')';
    const key = g.tid || safeName(g.name);
    if (g.dir) {
      cacheTga(ci(g.dir, 'meta', 'iconTex.tga'), path.join(autoDir(), key + '-icon.png'));
      cacheTga(ci(g.dir, 'meta', 'bootTvTex.tga'), path.join(autoDir(), key + '-hero.png'));
    }
    const icon = path.join(autoDir(), key + '-icon.png');
    const manual = manualCover(g.name);
    g.cover =
      manual || urlIf(path.join(autoDir(), key + '-cover.jpg')) || urlIf(path.join(autoDir(), key + '-box.png')) || urlIf(icon);
    g.full = manual ? '' : urlIf(path.join(autoDir(), key + '-full.jpg'));
    g.disc = urlIf(path.join(autoDir(), key + '-disc.png'));
    g.icon = urlIf(icon);
    g.hero = urlIf(path.join(autoDir(), key + '-hero.png'));
    g.color = fs.existsSync(icon) ? avgColor(icon) : '';
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Optional online case art from GameTDB (one request at a time, results cached, misses remembered for 7 days)
const boxBusy = new Set(),
  boxJobs = [];
let boxRunning = false;
function fetchImage(url, dest, hops = 0) {
  return new Promise(resolve => {
    // some image servers (Nintendo's) only answer browsers, and some move pictures to another address
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CosmoU', Accept: 'image/*' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 4) {
        res.resume();
        return resolve(fetchImage(new URL(res.headers.location, url).href, dest, hops + 1));
      }
      if (res.statusCode !== 200 || !/^image\//.test(res.headers['content-type'] || '')) {
        if (process.env.COSMOU_DEBUG) console.error('cover failed', url, res.statusCode, res.headers['content-type']);
        res.resume();
        return resolve(false);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          fs.writeFileSync(dest, Buffer.concat(chunks));
          resolve(true);
        } catch {
          resolve(false);
        }
      });
      res.on('error', () => resolve(false));
    });
    req.setTimeout(10000, () => req.destroy());
    req.on('error', () => resolve(false));
  });
}
// Wii U art on GameTDB: front cover + full wrap-around cover (back | spine | front) as .jpg, disc as .png.
const artFile = (tid, kind) =>
  path.join(autoDir(), tid + (kind === 'disc' ? '-disc.png' : kind === 'full' ? '-full.jpg' : '-cover.jpg'));
const artMiss = tid => path.join(autoDir(), tid + '-art.miss');
function artRegions(L) {
  if (L === 'E') return ['US', 'EN'];
  if (L === 'J') return ['JA'];
  const loc = String(app.getLocale() || '')
    .slice(0, 2)
    .toUpperCase();
  const pal = ['EN', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'RU', 'AU'];
  return [...new Set([pal.includes(loc) ? loc : 'EN', ...pal, 'US'])];
}
function queueBoxArt(list) {
  for (const g of list) {
    if (!g.meta || !g.meta.code || !g.tid || boxBusy.has(g.tid)) continue;
    if (fs.existsSync(artFile(g.tid, 'cover'))) continue;
    const miss = artMiss(g.tid);
    if (fs.existsSync(miss) && Date.now() - fs.statSync(miss).mtimeMs < 7 * 864e5) continue;
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
      base = 'https://art.gametdb.com/wiiu/';
    let region = '';
    for (const kind of ['coverHQ', 'cover']) {
      for (const r of artRegions(g.meta.code[3])) {
        if (await fetchImage(`${base}${kind}/${r}/${id}.jpg`, artFile(g.tid, 'cover'))) {
          region = r;
          break;
        }
      }
      if (region) break;
    }
    if (region) {
      const tries = [...new Set([region, 'EN', 'US'])];
      for (const r of tries) if (await fetchImage(`${base}coverfullHQ/${r}/${id}.jpg`, artFile(g.tid, 'full'))) break;
      for (const r of tries) if (await fetchImage(`${base}disc/${r}/${id}.png`, artFile(g.tid, 'disc'))) break;
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('covers-updated');
    } else {
      try {
        fs.writeFileSync(artMiss(g.tid), String(Date.now()));
      } catch {}
    }
    boxBusy.delete(g.tid);
    await new Promise(r => setTimeout(r, 400));
  }
  boxRunning = false;
}

app.whenReady().then(() => {
  fs.mkdirSync(coversDir(), { recursive: true });
  try {
    adoptCemu();
  } catch {}
  installThemeMusic();
  applyTheme(read().theme);
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 520,
    title: 'CosmoU',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#f4f9fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.setMenu(null);
  // macOS always shows a menu bar: keep it small (CosmoU, Edit for copy & paste, Window)
  if (P.IS_MAC)
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'editMenu' },
        { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }] },
      ]),
    );
  mainWin = win;
  win.loadFile('index.html');
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('settings', () => read());
ipcMain.handle('scan', () => {
  const l = scan(read().gamesDir);
  if (read().onlineCovers !== false) queueBoxArt(l);
  return withApps(withSystems(l));
});
ipcMain.handle('setOnlineCovers', (_, v) => {
  const s = { ...read(), onlineCovers: !!v };
  write(s);
  return s;
});
ipcMain.handle('covers', () => shell.openPath(coversDir()));
ipcMain.handle('pickCemu', async () => {
  const r = await dialog.showOpenDialog(
    P.IS_WIN
      ? { title: 'Choose Cemu.exe', filters: [{ name: 'Cemu', extensions: ['exe'] }], properties: ['openFile'] }
      : P.IS_MAC
        ? { title: 'Choose Cemu', filters: [{ name: 'Apps', extensions: ['app'] }], properties: ['openFile'], defaultPath: '/Applications' }
        : { title: 'Choose Cemu (the AppImage or the Cemu program)', properties: ['openFile'], defaultPath: os.homedir() },
  );
  if (r.canceled) return read();
  const f = P.programOf(r.filePaths[0]);
  if (!f) return { ...read(), error: 'That app can’t be started. Choose Cemu.app.' };
  if (!P.IS_WIN) P.makeRunnable(f);
  if (!P.isProgram(f)) return { ...read(), error: 'This file can’t be started as a program.' };
  const s = { ...read(), cemuPath: f, cemuManaged: false, cemuVersion: '', cemuFound: false };
  write(s);
  return s;
});
// Linux and macOS: use a Cemu that is already installed (AppImage, Flatpak, package, Cemu.app) when none is set yet
function adoptCemu() {
  const s = read();
  if (P.IS_WIN || (s.cemuPath && fs.existsSync(s.cemuPath))) return;
  const found = P.findCemu();
  if (found) write({ ...s, cemuPath: found, cemuManaged: false, cemuVersion: '', cemuFound: true });
}
ipcMain.handle('pickFolder', async () => {
  const r = await dialog.showOpenDialog({ title: 'Choose games folder', properties: ['openDirectory'] });
  if (r.canceled) return read();
  const s = { ...read(), gamesDir: r.filePaths[0] };
  write(s);
  return s;
});
ipcMain.handle('play', (_, arg) => {
  const r = playGame(arg);
  if (r.ok && arg && typeof arg === 'object') {
    recordPlay(arg.name);
    trackSession(r.child, arg.name);
    // started from Steam: close CosmoU together with the game, so Steam sees the game end
    if (
      playArg &&
      r.child &&
      typeof arg.path === 'string' &&
      path.resolve(arg.path).toLowerCase() === path.resolve(playArg).toLowerCase()
    )
      r.child.on('exit', () => setTimeout(() => app.quit(), 800));
  }
  delete r.child;
  return r;
});
// ---------- Save backups: mlc01/usr/save/<high>/<low> of a game, zipped into <userData>/saves/<game> ----------
const savesRoot = () => path.join(app.getPath('userData'), 'saves');
function mlcDir(exe) {
  const d = cemuDirsOf(exe);
  if (!d) return '';
  try {
    const m = tag(fs.readFileSync(path.join(d.config, 'settings.xml'), 'utf8'), 'mlc_path');
    if (m && fs.existsSync(m)) return m;
  } catch {}
  return path.join(d.data, 'mlc01');
}
function saveDirOf(tid) {
  tid = String(tid || '').toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(tid)) return '';
  const mlc = mlcDir(read().cemuPath);
  return mlc ? path.join(mlc, 'usr', 'save', tid.slice(0, 8), tid.slice(8)) : '';
}
const backupDir = name => path.join(savesRoot(), safeName(String(name || 'game')).slice(0, 120));
function dirSize(d) {
  let n = 0;
  try {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      n += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
    }
  } catch {}
  return n;
}
function listBackups(name) {
  const d = backupDir(name);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter(f => /\.zip$/i.test(f))
    .map(f => {
      const st = fs.statSync(path.join(d, f));
      return { file: f, at: st.mtimeMs, size: st.size, auto: /-auto\.zip$/i.test(f) };
    })
    .sort((a, b) => b.at - a.at);
}
function backupSaves(tid, name, auto) {
  const src = saveDirOf(tid);
  if (!src) return { ok: false, error: 'Save backups need the game in folder format (with its title ID).' };
  if (!fs.existsSync(src) || !dirSize(src)) return { ok: false, error: 'No save data for this game yet. Play it once first.' };
  const d = backupDir(name),
    stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  fs.mkdirSync(d, { recursive: true });
  const z = new AdmZip();
  z.addLocalFolder(src);
  let file = stamp + (auto ? '-auto' : '') + '.zip';
  for (let i = 2; fs.existsSync(path.join(d, file)); i++) file = stamp + '-' + i + (auto ? '-auto' : '') + '.zip';
  z.writeZip(path.join(d, file));
  // keep the newest 10 automatic backups; manual ones stay until you delete them
  for (const b of listBackups(name)
    .filter(x => x.auto)
    .slice(10))
    fs.rmSync(path.join(d, b.file), { force: true });
  return { ok: true, file };
}
ipcMain.handle('savesInfo', (_, tid, name) => {
  const src = saveDirOf(tid);
  return {
    supported: !!src,
    found: !!src && fs.existsSync(src),
    size: src && fs.existsSync(src) ? dirSize(src) : 0,
    backups: listBackups(name),
    auto: read().autoSaveBackup !== false,
  };
});
ipcMain.handle('savesBackup', (_, tid, name) => {
  try {
    return backupSaves(tid, name, false);
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
});
ipcMain.handle('savesRestore', (_, tid, name, file) => {
  try {
    const src = saveDirOf(tid),
      zip = path.join(backupDir(name), path.basename(String(file || '')));
    if (!src || !fs.existsSync(zip)) return { ok: false, error: 'This backup was not found.' };
    if (cemuRunning()) return { ok: false, error: 'Close Cemu first, then restore the backup.' };
    // safety copy of the current saves, so a restore can always be undone
    if (fs.existsSync(src) && dirSize(src)) backupSaves(tid, name, true);
    fs.rmSync(src, { recursive: true, force: true });
    fs.mkdirSync(src, { recursive: true });
    new AdmZip(zip).extractAllTo(src, true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
});
ipcMain.handle('savesDelete', (_, name, file) => {
  const zip = path.join(backupDir(name), path.basename(String(file || '')));
  if (/\.zip$/i.test(zip) && fs.existsSync(zip)) fs.rmSync(zip, { force: true });
  return listBackups(name);
});
ipcMain.handle('savesFolder', (_, name) => {
  const d = name ? backupDir(name) : savesRoot();
  fs.mkdirSync(d, { recursive: true });
  return shell.openPath(d);
});
ipcMain.handle('setAutoSaveBackup', (_, v) => {
  write({ ...read(), autoSaveBackup: !!v });
  return read();
});
// ---------- TV mode: full screen and a bigger UI for controllers ----------
ipcMain.handle('setTvMode', (_, on) => {
  if (!mainWin || mainWin.isDestroyed()) return false;
  mainWin.setFullScreen(!!on);
  mainWin.webContents.setZoomFactor(on ? 1.3 : 1);
  return !!on;
});
// ---------- Play time / Daily Log: a session lasts from launch until Cemu (or the app) closes ----------
function trackSession(child, name) {
  if (!child || typeof name !== 'string' || !name || name.length > 200) return;
  const start = Date.now();
  child.on('error', () => {});
  child.on('exit', () => endSession(name, start, Date.now()));
}
function endSession(name, start, end) {
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return; // a quick test or a crash at start is not play time
  const s = read(),
    pt = { ...(s.playtime || {}) },
    e = pt[name] || { sec: 0, sessions: 0, first: start };
  pt[name] = { sec: e.sec + sec, sessions: e.sessions + 1, first: Math.min(e.first || start, start), last: end, lastSec: sec };
  const sessions = [...(Array.isArray(s.sessions) ? s.sessions : []), { name, start, sec }].slice(-1000);
  write({ ...s, playtime: pt, sessions });
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('session-ended', { name, sec });
}
ipcMain.handle('playLog', () => {
  const s = read();
  return { playtime: s.playtime || {}, sessions: Array.isArray(s.sessions) ? s.sessions : [] };
});
function playGame(arg) {
  if (arg && typeof arg === 'object' && arg.appId) return launchApp(arg.appId);
  if (arg && typeof arg === 'object' && arg.sys && arg.sys !== 'wiiu') return launchSystemGame(arg.sys, arg.path);
  const gamePath = typeof arg === 'string' ? arg : arg && arg.path;
  const s = read();
  if (!s.cemuPath || !fs.existsSync(s.cemuPath))
    return { ok: false, error: 'Cemu isn’t installed yet. Open Settings to download it or choose ' + (P.IS_WIN ? 'Cemu.exe.' : 'Cemu.') };
  if (typeof gamePath !== 'string' || !fs.existsSync(gamePath)) return { ok: false, error: 'The game file no longer exists.' };
  P.makeRunnable(s.cemuPath);
  if (!P.isProgram(s.cemuPath))
    return { ok: false, error: 'Cemu can’t be started. Choose it again in Settings → Cemu & Games.' };
  let note = '',
    preset = '';
  const key = arg && typeof arg === 'object' ? arg.key : '';
  const g = applyGlobals(s.cemuPath, s.cemuOverrides);
  const chosen = (key && (s.gameSettings || {})[key]) || s.defaultQuality;
  if (chosen && QRES[chosen]) {
    preset = chosen;
    note = applyResolution(s.cemuPath, arg && arg.tid, QRES[chosen]);
  }
  try {
    write({ ...read(), lastApply: { at: Date.now(), applied: g.applied, missing: g.missing } });
  } catch {}
  if (s.autoSaveBackup !== false && arg && typeof arg === 'object' && arg.tid)
    try {
      backupSaves(arg.tid, arg.name, true);
    } catch {}
  P.makeRunnable(s.cemuPath);
  const [cmd, cargs] = P.launchCommand(s.cemuPath, ['-g', gamePath, '-f']);
  const child = spawn(cmd, cargs, {
    detached: true,
    stdio: 'ignore',
    cwd: path.dirname(s.cemuPath),
    env: P.childEnv(s.cemuPath),
  });
  child.on('error', () => {});
  child.unref();
  return { ok: true, note, preset, child };
}

ipcMain.handle('showInFolder', (_, p) => {
  if (typeof p === 'string' && fs.existsSync(p)) shell.showItemInFolder(p);
});

ipcMain.handle('music', () => {
  const dirs = [
    path.join(app.getPath('userData'), 'music'),
    path.join(process.resourcesPath || '', 'music'),
    path.join(__dirname, 'assets', 'music'),
  ];
  for (const [i, d] of dirs.entries()) {
    if (!fs.existsSync(d)) continue;
    const f = fs.readdirSync(d).find(n => /\.(mp3|ogg|wav|m4a|flac)$/i.test(n));
    // builtin: the bundled tune, not the user's own file
    if (f) return { url: pathToFileURL(path.join(d, f)).href, name: f, builtin: i > 0 };
  }
  return null;
});
// One original tune per theme, used while no own music file is chosen.
// The tunes are copied to <userData>/music/themes on install and on every update, so people can find (and swap) them.
const bundledThemeMusic = () =>
  [path.join(process.resourcesPath || '', 'music', 'themes'), path.join(__dirname, 'assets', 'music', 'themes')].find(d =>
    fs.existsSync(d),
  );
const userThemeMusic = () => path.join(app.getPath('userData'), 'music', 'themes');
const sha1 = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
function installThemeMusic() {
  try {
    const src = bundledThemeMusic();
    if (!src) return;
    const dst = userThemeMusic(),
      mark = path.join(dst, '.cosmou-bundled.json');
    fs.mkdirSync(dst, { recursive: true });
    let known = {};
    try {
      known = JSON.parse(fs.readFileSync(mark, 'utf8')) || {};
    } catch {}
    for (const f of fs.readdirSync(src).filter(n => /\.ogg$/i.test(n))) {
      const to = path.join(dst, f),
        h = sha1(path.join(src, f));
      // copy when missing, or when it is still our earlier copy; a file the user replaced stays untouched
      if (!fs.existsSync(to) || (known[f] && sha1(to) === known[f] && known[f] !== h)) fs.copyFileSync(path.join(src, f), to);
      if (!fs.existsSync(to) || sha1(to) === h) known[f] = h;
    }
    fs.writeFileSync(mark, JSON.stringify(known, null, 1));
  } catch {}
}
ipcMain.handle('themeMusic', (_, id) => {
  if (!/^[a-z0-9-]+$/.test(String(id))) return null;
  if (id.startsWith('u-')) {
    // a theme the user added: its music lives next to its theme.json
    try {
      const d = path.join(ownThemesDir(), id),
        m = fs.readdirSync(d).find(n => /^music\.(mp3|ogg|wav|m4a|flac)$/i.test(n));
      return m ? { url: pathToFileURL(path.join(d, m)).href } : null;
    } catch {
      return null;
    }
  }
  const u = userThemeMusic();
  try {
    const own =
      fs.existsSync(u) &&
      fs.readdirSync(u).find(n => n.toLowerCase().startsWith(id + '.') && /\.(mp3|ogg|wav|m4a|flac)$/i.test(n));
    if (own) return { url: pathToFileURL(path.join(u, own)).href };
  } catch {}
  const d = bundledThemeMusic(),
    f = d && path.join(d, id + '.ogg');
  return f && fs.existsSync(f) ? { url: pathToFileURL(f).href } : null;
});

// ---------- Own themes ----------
// A theme pack is a .cosmoutheme file (a zip) with theme.json and an optional music file, or just a theme.json.
// Everything is checked here: only known fields, hex colors and fixed choices get through, so a file cannot inject anything.
const ownThemesDir = () => path.join(app.getPath('userData'), 'own-themes');
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|flac)$/i;
const MAX_THEME_MUSIC = 40 * 1024 * 1024;
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
    background: oneOf(
      raw.background,
      [
        'plain',
        'gradient',
        'stars',
        'grid',
        'dots',
        'stripes',
        'scanlines',
        'waves',
        'bubbles',
        'towers',
        'tiles',
        'haze',
        'facets',
        'bokeh',
        'fog',
        'lcd',
        'xmb',
        'xmbdust',
        'xmbnight',
      ],
      'plain',
    ),
    selection: oneOf(raw.selection, ['glow', 'outline', 'brackets'], 'glow'),
    font: oneOf(raw.font, ['normal', 'rounded', 'pixel', 'mono', 'serif'], 'normal'),
    corners: oneOf(raw.corners, ['square', 'rounded', 'round'], 'rounded'),
  };
  if (dark) t.colorsDark = dark;
  if (raw.music) t.music = path.basename(String(raw.music)).slice(0, 100);
  return { theme: t };
}
function readThemePack(file) {
  const ext = path.extname(file).toLowerCase();
  if (fs.statSync(file).size > 60 * 1024 * 1024) return { error: 'That file is too big for a theme.' };
  if (ext === '.json') {
    if (fs.statSync(file).size > 64 * 1024) return { error: 'That theme.json is too big.' };
    return { raw: JSON.parse(fs.readFileSync(file, 'utf8')), music: null };
  }
  const zip = new AdmZip(file);
  const entries = zip.getEntries().filter(e => !e.isDirectory);
  const j = entries.find(e => path.basename(e.entryName).toLowerCase() === 'theme.json');
  if (!j) return { error: 'No theme.json found in that file.' };
  if (j.header.size > 64 * 1024) return { error: 'The theme.json inside is too big.' };
  const raw = JSON.parse(j.getData().toString('utf8'));
  const want = raw && raw.music ? path.basename(String(raw.music)).toLowerCase() : '';
  const m =
    entries.find(e => want && path.basename(e.entryName).toLowerCase() === want && AUDIO_EXT.test(e.entryName)) ||
    entries.find(e => AUDIO_EXT.test(e.entryName));
  if (m && m.header.size > MAX_THEME_MUSIC) return { error: 'The music file in that theme is too big (40 MB at most).' };
  return { raw, music: m ? { ext: path.extname(m.entryName).toLowerCase(), data: m.getData() } : null };
}
ipcMain.handle('ownThemeImport', async (_, given) => {
  try {
    let file = typeof given === 'string' ? given : '';
    if (!file) {
      const r = await dialog.showOpenDialog({
        title: 'Choose a CosmoU theme file',
        filters: [{ name: 'CosmoU theme', extensions: ['cosmoutheme', 'zip', 'json'] }],
        properties: ['openFile'],
      });
      if (r.canceled || !r.filePaths[0]) return { cancel: true };
      file = r.filePaths[0];
    }
    const pack = readThemePack(file);
    if (pack.error) return { error: pack.error };
    const c = cleanTheme(pack.raw);
    if (c.error) return { error: c.error };
    const t = c.theme,
      dir = path.join(ownThemesDir(), t.id),
      tmp = dir + '.new';
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    if (pack.music) {
      fs.writeFileSync(path.join(tmp, 'music' + pack.music.ext), pack.music.data);
      t.music = 'music' + pack.music.ext;
    } else delete t.music;
    fs.writeFileSync(path.join(tmp, 'theme.json'), JSON.stringify(t, null, 2));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(tmp, dir);
    return { ok: true, theme: t, hasMusic: !!pack.music };
  } catch (e) {
    return {
      error: /JSON/i.test(String(e && e.message))
        ? 'theme.json could not be read (is it valid JSON?).'
        : 'Could not read that file.',
    };
  }
});
ipcMain.handle('ownThemeList', () => {
  const out = [];
  try {
    for (const n of fs.readdirSync(ownThemesDir())) {
      if (!/^u-[a-z0-9-]+$/.test(n)) continue;
      try {
        const c = cleanTheme(JSON.parse(fs.readFileSync(path.join(ownThemesDir(), n, 'theme.json'), 'utf8')));
        if (c.theme && c.theme.id === n) out.push({ ...c.theme, hasMusic: !!c.theme.music });
      } catch {}
    }
  } catch {}
  return out;
});
ipcMain.handle('ownThemeRemove', (_, id) => {
  if (!/^u-[a-z0-9-]+$/.test(String(id))) return false;
  try {
    fs.rmSync(path.join(ownThemesDir(), id), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle('ownThemeExport', async (_, id) => {
  if (!/^u-[a-z0-9-]+$/.test(String(id))) return { error: 'Unknown theme.' };
  try {
    const dir = path.join(ownThemesDir(), id),
      t = JSON.parse(fs.readFileSync(path.join(dir, 'theme.json'), 'utf8'));
    const r = await dialog.showSaveDialog({
      title: 'Save theme file',
      defaultPath: path.join(app.getPath('documents'), id.replace(/^u-/, '') + '.cosmoutheme'),
      filters: [{ name: 'CosmoU theme', extensions: ['cosmoutheme'] }],
    });
    if (r.canceled || !r.filePath) return { cancel: true };
    const zip = new AdmZip();
    zip.addFile('theme.json', Buffer.from(JSON.stringify(t, null, 2)));
    if (t.music && fs.existsSync(path.join(dir, t.music))) zip.addLocalFile(path.join(dir, t.music));
    zip.writeZip(r.filePath);
    return { ok: true, path: r.filePath };
  } catch {
    return { error: 'Could not save the theme file.' };
  }
});

// ---------- Automatic Cemu download ----------
const cemuDir = () => path.join(app.getPath('userData'), 'cemu');
const friendly = e =>
  /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|timed out/i.test(String((e && (e.code || e.message)) || ''))
    ? 'No internet connection.'
    : (e && e.message) || 'Something went wrong.';

function findExe(dir, depth = 0) {
  if (depth > 3 || !fs.existsSync(dir)) return '';
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of items) if (e.isFile() && e.name.toLowerCase() === (P.IS_WIN ? 'cemu.exe' : 'cemu')) return path.join(dir, e.name);
  for (const e of items)
    if (e.isDirectory()) {
      const f = findExe(path.join(dir, e.name), depth + 1);
      if (f) return f;
    }
  return '';
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'CosmoU', Accept: 'application/vnd.github+json' };
    // only for automatic tests (GitHub Actions): many tests from one address would hit GitHub's hourly limit
    if (process.env.COSMOU_GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.COSMOU_GITHUB_TOKEN;
    const req = https.get(url, { headers }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => {
        if ((res.statusCode === 403 || res.statusCode === 429) && res.headers['x-ratelimit-remaining'] === '0')
          return reject(new Error('GitHub gets too many requests from your network right now. Try again in an hour.'));
        if (res.statusCode !== 200)
          return reject(new Error('GitHub answered with HTTP ' + res.statusCode + '. Try again later.'));
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Unexpected answer from GitHub.'));
        }
      });
    });
    activeReq = req;
    req.setTimeout(15000, () => req.destroy(new Error('The connection timed out.')));
    req.on('error', reject);
  });
}

function download(url, dest, onProgress, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('Too many redirects.'));
    const req = https.get(url, { headers: { 'User-Agent': 'CosmoU' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url);
        if (next.protocol !== 'https:') return reject(new Error('Blocked an insecure redirect.'));
        return resolve(download(next.href, dest, onProgress, hops + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('Download failed (HTTP ' + res.statusCode + ').'));
      }
      const total = Number(res.headers['content-length']) || 0;
      let got = 0;
      const out = fs.createWriteStream(dest);
      res.on('data', c => {
        got += c.length;
        onProgress(got, total);
      });
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve({ got, total })));
      out.on('error', reject);
      res.on('error', reject);
    });
    activeReq = req;
    req.setTimeout(30000, () => req.destroy(new Error('The connection timed out.')));
    req.on('error', reject);
  });
}

ipcMain.handle('cemuStatus', () => {
  const s = read();
  return {
    installed: !!(s.cemuPath && fs.existsSync(s.cemuPath)),
    path: s.cemuPath || '',
    managed: !!s.cemuManaged,
    version: s.cemuVersion || '',
  };
});
ipcMain.handle('cemuCancel', () => {
  cancelled = true;
  if (activeReq) activeReq.destroy(new Error('cancelled'));
});
// Windows: the official zip (Cemu.exe). Linux: the official AppImage – one file that runs on most distributions.
// macOS: the official .dmg – the Apple silicon build when there is one, otherwise the Intel build (runs with Rosetta).
function cemuAsset(rel) {
  const assets = rel.assets || [];
  if (P.IS_MAC) {
    const dmgs = assets.filter(a => /^cemu-.*-macos.*\.dmg$/i.test(a.name)),
      arm = a => /arm64|aarch64|universal/i.test(a.name),
      intel = a => /x86_64|x64|universal/i.test(a.name);
    return (process.arch === 'arm64' ? dmgs.find(arm) || dmgs.find(intel) : dmgs.find(intel)) || dmgs[0];
  }
  if (P.IS_LINUX) {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    return assets.find(a => new RegExp('^cemu-.*-' + arch + '\\.appimage$', 'i').test(a.name));
  }
  return assets.find(a => /windows.*x64.*\.zip$/i.test(a.name));
}
ipcMain.handle('cemuInstall', async () => {
  cancelled = false;
  const send = d => {
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('cemu-progress', d);
  };
  const tmp = path.join(app.getPath('userData'), P.IS_MAC ? 'cemu-download.dmg' : 'cemu-download.tmp');
  try {
    send({ stage: 'find', text: 'Looking for the latest Cemu release…' });
    const rel = await getJson('https://api.github.com/repos/cemu-project/Cemu/releases/latest');
    const asset = cemuAsset(rel);
    if (!asset)
      throw new Error('No ' + (P.IS_LINUX ? 'Linux (AppImage)' : P.IS_MAC ? 'macOS' : 'Windows') + ' download found in the latest Cemu release.');
    if (!asset.browser_download_url.startsWith('https://github.com/cemu-project/Cemu/'))
      throw new Error('Unexpected download address.');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    await download(asset.browser_download_url, tmp, (got, total) =>
      send({ stage: 'download', got, total, percent: total ? Math.round((got / total) * 100) : 0 }),
    );
    if (cancelled) throw new Error('cancelled');
    if (typeof asset.digest === 'string' && asset.digest.startsWith('sha256:')) {
      send({ stage: 'verify', text: 'Checking the download…' });
      const h = crypto.createHash('sha256').update(fs.readFileSync(tmp)).digest('hex');
      if (h !== asset.digest.slice(7).toLowerCase()) throw new Error('The download is damaged (checksum mismatch).');
    }
    send({ stage: 'extract', text: P.IS_WIN ? 'Unpacking Cemu…' : 'Setting up Cemu…' });
    await new Promise(r => setTimeout(r, 80));
    fs.mkdirSync(cemuDir(), { recursive: true });
    let exe;
    if (P.IS_LINUX) {
      // keep the AppImage as it is; older CosmoU downloads of it are removed afterwards
      exe = path.join(cemuDir(), path.basename(asset.name));
      fs.copyFileSync(tmp, exe);
      fs.chmodSync(exe, 0o755);
      for (const f of fs.readdirSync(cemuDir()))
        if (/^cemu-.*\.appimage$/i.test(f) && f !== path.basename(exe))
          try {
            fs.rmSync(path.join(cemuDir(), f), { force: true });
          } catch {}
    } else if (P.IS_MAC) {
      exe = installCemuDmg(tmp);
    } else {
      new AdmZip(tmp).extractAllTo(cemuDir(), true); // overwrite only, never delete (keeps Cemu settings and saves)
      exe = findExe(cemuDir());
      // portable CosmoU: Cemu keeps its settings and saves next to itself too (its "portable" folder) –
      // unless this computer already has Cemu settings in %APPDATA%\Cemu, which would then seem lost
      if (exe && PORTABLE_DIR && !fs.existsSync(path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Cemu', 'settings.xml')))
        try {
          fs.mkdirSync(path.join(path.dirname(exe), 'portable'), { recursive: true });
        } catch {}
    }
    if (!exe) throw new Error('Cemu was not found in the download.');
    write({ ...read(), cemuPath: exe, cemuManaged: true, cemuVersion: rel.tag_name || '', cemuFound: false });
    return { ok: true };
  } catch (e) {
    if (cancelled) return { ok: false, cancelled: true };
    return { ok: false, error: friendly(e) };
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
    activeReq = null;
  }
});
// macOS: open the .dmg, copy Cemu.app into CosmoU's cemu folder and close the .dmg again.
// Cemu keeps its settings and saves in ~/Library/Application Support/Cemu, so replacing the app loses nothing.
function installCemuDmg(dmg) {
  const mnt = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmou-cemu-'));
  try {
    execFileSync('hdiutil', ['attach', '-nobrowse', '-readonly', '-noautoopen', '-mountpoint', mnt, dmg], { timeout: 120000, stdio: 'ignore' });
    const src = fs.readdirSync(mnt).find(f => /\.app$/i.test(f));
    if (!src) throw new Error('Cemu was not found in the download.');
    const dst = path.join(cemuDir(), 'Cemu.app'),
      next = dst + '.new';
    fs.rmSync(next, { recursive: true, force: true });
    // ditto keeps the app's signature, symlinks and permissions intact
    execFileSync('ditto', [path.join(mnt, src), next], { timeout: 180000, stdio: 'ignore' });
    fs.rmSync(dst, { recursive: true, force: true });
    fs.renameSync(next, dst);
    try {
      execFileSync('xattr', ['-dr', 'com.apple.quarantine', dst], { timeout: 30000, stdio: 'ignore' });
    } catch {}
    const exe = P.bundleExe(dst);
    // older Cemu builds come unsigned; Apple silicon only starts signed programs, so give this copy an ad-hoc signature
    try {
      execFileSync('codesign', ['--verify', exe], { timeout: 30000, stdio: 'ignore' });
    } catch {
      try {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', dst], { timeout: 120000, stdio: 'ignore' });
      } catch {}
    }
    return exe;
  } finally {
    try {
      execFileSync('hdiutil', ['detach', mnt, '-force'], { timeout: 60000, stdio: 'ignore' });
    } catch {}
    try {
      fs.rmSync(mnt, { recursive: true, force: true });
    } catch {}
  }
}
ipcMain.handle('musicFolder', () => {
  const d = path.join(app.getPath('userData'), 'music');
  fs.mkdirSync(d, { recursive: true });
  return shell.openPath(d);
});

// ---------- Per-game quality (resolution) via Cemu graphic packs ----------
const QRES = { Native: [1280, 720], Performance: [960, 540], Balanced: [1600, 900], Quality: [1920, 1080], Ultra: [2560, 1440] };
const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

ipcMain.handle('setGameSetting', (_, key, value) => {
  if (typeof key !== 'string' || !key) return read();
  const s = read(),
    gs = { ...(s.gameSettings || {}) };
  if (value && QRES[value]) gs[key] = value;
  else delete gs[key];
  const n = { ...s, gameSettings: gs };
  write(n);
  return n;
});

// Cemu's folders: { config } holds settings.xml and controllerProfiles, { data } holds graphicPacks and mlc01.
// Both are the same folder on Windows; on Linux they follow XDG, a portable folder or the Flatpak (see platform.js).
const cemuDirsOf = exe => (exe && fs.existsSync(exe) ? P.cemuDirs(exe) : null);
const cemuNow = () => cemuDirsOf(read().cemuPath);
function findRules(dir, depth = 0, out = []) {
  if (depth > 6 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findRules(p, depth + 1, out);
    else if (e.name.toLowerCase() === 'rules.txt') out.push(p);
  }
  return out;
}
function parseRules(txt) {
  const r = { titles: '', presets: [] };
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\[.*\]$/.test(line)) {
      cur = line.toLowerCase() === '[preset]' ? {} : null;
      if (cur) r.presets.push(cur);
      continue;
    }
    const m = line.match(/^([A-Za-z]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === 'titleids') r.titles = m[2].toLowerCase();
    else if (cur && (k === 'name' || k === 'category')) cur[k] = m[2].trim();
  }
  return r;
}
function pickPreset(presets, w, h) {
  const size = p => (p.name || '').match(/(\d{3,4})\s*x\s*(\d{3,4})/i);
  let pool = presets.filter(p => size(p) && /resolution/i.test(p.category || ''));
  if (!pool.length) pool = presets.filter(p => size(p));
  let best = null,
    bd = Infinity;
  for (const p of pool) {
    const m = size(p),
      d = Math.abs(+m[2] - h) + Math.abs(+m[1] - w) / 1000;
    if (d < bd) {
      bd = d;
      best = { name: p.name, category: p.category || '', exact: +m[1] === w && +m[2] === h };
    }
  }
  return best;
}
function patchSettings(file, rel, pick) {
  const norm = s => s.replace(/\\/g, '/').toLowerCase();
  const xml = fs.readFileSync(file, 'utf8');
  let changed = false;
  const out = xml.replace(/<Entry\s+filename="([^"]*)"[^>]*>([\s\S]*?)<\/Entry>/g, (full, fn, body) => {
    if (norm(unxml(fn)) !== norm(rel)) return full;
    const nb = body.replace(/<Preset>([\s\S]*?)<\/Preset>/g, (blk, inner) => {
      const cat = (inner.match(/<category>([\s\S]*?)<\/category>/) || [])[1];
      if (pick.category && cat !== undefined && unxml(cat) !== pick.category) return blk;
      if (!/<preset>/.test(inner)) return blk;
      changed = true;
      return blk.replace(/<preset>[\s\S]*?<\/preset>/, () => '<preset>' + escXml(pick.name) + '</preset>');
    });
    return full.replace(body, () => nb);
  });
  if (!changed) return 'no-entry';
  const bak = file + '.cosmou-backup';
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak); // one-time backup of the user's Cemu settings
  fs.writeFileSync(file, out);
  return 'applied';
}
function applyResolution(exe, tid, size) {
  try {
    const dirs = cemuDirsOf(exe);
    if (!dirs) return 'no-settings';
    const t = (tid || '').toLowerCase();
    if (!t) return 'no-pack';
    let found = null;
    for (const f of findRules(path.join(dirs.data, 'graphicPacks'))) {
      let txt;
      try {
        txt = fs.readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      const r = parseRules(txt);
      if (!r.titles.includes(t)) continue;
      const pick = pickPreset(r.presets, size[0], size[1]);
      if (!pick) continue;
      const rel = path.relative(dirs.data, f);
      if (!found || /resolution/i.test(rel)) found = { rel, pick };
    }
    if (!found) return 'no-pack';
    let res = patchSettings(path.join(dirs.config, 'settings.xml'), found.rel, found.pick);
    if (res === 'no-entry') res = enableWithPreset(dirs, t, found.rel, found.pick.name) ? 'applied' : res;
    return res === 'applied' && !found.pick.exact ? 'nearest' : res;
  } catch {
    return 'error';
  }
}

// ---------- Global Cemu settings (Graphics / Audio / Overlay) written into Cemu's settings.xml before launch ----------
// Only values that already exist in the file are changed; nothing is ever inserted. A backup is made once.
const CEMU_KEYS = {
  api: ['Graphic', 'api', 'int'],
  vsync: ['Graphic', 'VSync', 'int'],
  asyncCompile: ['Graphic', 'AsyncCompile', 'bool'],
  upscale: ['Graphic', 'UpscaleFilter', 'int'],
  downscale: ['Graphic', 'DownscaleFilter', 'int'],
  scaling: ['Graphic', 'FullscreenScaling', 'int'],
  ovPos: ['Overlay', 'Position', 'int'],
  ovScale: ['Overlay', 'TextScale', 'int'],
  ovFps: ['Overlay', 'FPS', 'bool'],
  ovDraw: ['Overlay', 'DrawCalls', 'bool'],
  ovCpu: ['Overlay', 'CPUUsage', 'bool'],
  ovCpuCore: ['Overlay', 'CPUPerCoreUsage', 'bool'],
  ovRam: ['Overlay', 'RAMUsage', 'bool'],
  ovVram: ['Overlay', 'VRAMUsage', 'bool'],
  ovDebug: ['Overlay', 'Debug', 'bool'],
  ntPos: ['Notification', 'Position', 'int'],
  ntScale: ['Notification', 'TextScale', 'int'],
  ntCtrl: ['Notification', 'ControllerProfiles', 'bool'],
  ntBat: ['Notification', 'ControllerBattery', 'bool'],
  ntShader: ['Notification', 'ShaderCompiling', 'bool'],
  ntFriend: ['Notification', 'FriendService', 'bool'],
  tvVolume: ['Audio', 'TVVolume', 'int'],
};
const secRe = s => new RegExp('(<' + s + '>)([\\s\\S]*?)(</' + s + '>)');
function readTag(xml, sec, tag) {
  const sm = xml.match(secRe(sec));
  if (!sm) return null;
  const m = sm[2].match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'));
  return m ? m[1].trim() : null;
}
function writeTag(xml, sec, tag, val) {
  let hit = false;
  const out = xml.replace(
    secRe(sec),
    (f, a, b, c) =>
      a +
      b.replace(new RegExp('(<' + tag + '>)[^<]*(</' + tag + '>)'), (x, p, q) => {
        hit = true;
        return p + val + q;
      }) +
      c,
  );
  return hit ? out : null;
}
function cemuSettingsInfo() {
  const s = read();
  const out = { found: false, current: {}, overrides: s.cemuOverrides || {}, defaultQuality: s.defaultQuality || '' };
  try {
    const d = cemuDirsOf(s.cemuPath);
    if (d) {
      const xml = fs.readFileSync(path.join(d.config, 'settings.xml'), 'utf8');
      out.found = true;
      for (const [k, [sec, tag, kind]] of Object.entries(CEMU_KEYS)) {
        const v = readTag(xml, sec, tag);
        if (v !== null) out.current[k] = kind === 'bool' ? v === 'true' : Number(v);
      }
    }
  } catch {}
  return out;
}
function applyGlobals(exe, ov) {
  const res = { applied: [], missing: [] };
  // Cemu for macOS only has Vulkan: an OpenGL choice (from settings brought over from another computer) is skipped
  const keys = Object.keys(ov || {}).filter(
    k => CEMU_KEYS[k] && Number.isFinite(Number(ov[k])) && !(P.IS_MAC && k === 'api' && Number(ov[k]) !== 1),
  );
  if (!keys.length) return res;
  try {
    const d = cemuDirsOf(exe);
    if (!d) {
      res.missing = keys;
      return res;
    }
    const f = path.join(d.config, 'settings.xml');
    let xml = fs.readFileSync(f, 'utf8');
    for (const k of keys) {
      const [sec, tag, kind] = CEMU_KEYS[k],
        v = ov[k];
      const next = writeTag(xml, sec, tag, kind === 'bool' ? (v ? 'true' : 'false') : String(Math.round(Number(v))));
      if (next === null) res.missing.push(k);
      else {
        xml = next;
        res.applied.push(k);
      }
    }
    if (res.applied.length) {
      const bak = f + '.cosmou-backup';
      if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
      fs.writeFileSync(f, xml);
    }
  } catch {
    res.missing = keys;
  }
  return res;
}
ipcMain.handle('cemuSettingsGet', () => cemuSettingsInfo());
ipcMain.handle('setCemuSetting', (_, key, value) => {
  if (!CEMU_KEYS[key]) return cemuSettingsInfo();
  const s = read(),
    ov = { ...(s.cemuOverrides || {}) };
  if (value === null || value === undefined) delete ov[key];
  else ov[key] = CEMU_KEYS[key][2] === 'bool' ? !!value : Number(value);
  write({ ...s, cemuOverrides: ov });
  return cemuSettingsInfo();
});
ipcMain.handle('setDefaultQuality', (_, name) => {
  write({ ...read(), defaultQuality: QRES[name] ? name : '' });
  return cemuSettingsInfo();
});

// ---------- Input (controller type / API / profiles). The button mapper itself stays in Cemu. ----------
const IN_TYPES = ['Wii U GamePad', 'Wii U Pro Controller', 'Wii U Classic Controller', 'Wiimote'];
// XInput and DirectInput only exist in Cemu for Windows
const IN_APIS = P.IS_WIN ? ['Keyboard', 'XInput', 'SDLController', 'DirectInput', 'DSUController'] : ['Keyboard', 'SDLController', 'DSUController'];
function inputDir() {
  const d = cemuNow();
  return d ? path.join(d.config, 'controllerProfiles') : '';
}
const profName = n =>
  String(n || '')
    .replace(/[^\w .-]/g, '')
    .trim()
    .slice(0, 40);
const tagGet = (x, t) => {
  const m = x.match(new RegExp('<' + t + '>([^<]*)</' + t + '>'));
  return m ? m[1].trim() : '';
};
function inputInfo(slot) {
  const dir = inputDir();
  if (!dir) return { found: false, types: IN_TYPES, apis: IN_APIS, profiles: [], slot };
  const f = path.join(dir, 'controller' + slot + '.xml');
  const out = {
    found: true,
    slot,
    types: IN_TYPES,
    apis: IN_APIS,
    configured: fs.existsSync(f),
    type: '',
    api: '',
    name: '',
    profiles: [],
  };
  try {
    if (out.configured) {
      const x = fs.readFileSync(f, 'utf8');
      out.type = tagGet(x, 'type');
      out.api = tagGet(x, 'api');
      out.name = tagGet(x, 'profile');
    }
    if (fs.existsSync(dir))
      out.profiles = fs
        .readdirSync(dir)
        .filter(n => /\.xml$/i.test(n) && !/^controller\d+\.xml$/i.test(n))
        .map(n => n.replace(/\.xml$/i, ''))
        .sort();
  } catch {}
  return out;
}
const slotOk = n => Number.isInteger(n) && n >= 0 && n <= 7;
ipcMain.handle('inputGet', (_, slot) => inputInfo(slotOk(slot) ? slot : 0));
ipcMain.handle('inputSet', (_, slot, key, value) => {
  if (!slotOk(slot) || !['type', 'api'].includes(key)) return { ...inputInfo(0), error: 'Invalid request.' };
  const dir = inputDir(),
    f = dir && path.join(dir, 'controller' + slot + '.xml');
  const allowed = key === 'type' ? IN_TYPES : IN_APIS;
  if (!f || !fs.existsSync(f))
    return {
      ...inputInfo(slot),
      error: 'This controller isn’t set up in Cemu yet. Press “Configure buttons in Cemu”, assign it once and save.',
    };
  if (!allowed.includes(value)) return { ...inputInfo(slot), error: 'Unknown value.' };
  try {
    const bk = f + '.cosmou-backup';
    if (!fs.existsSync(bk)) fs.copyFileSync(f, bk);
    let x = fs.readFileSync(f, 'utf8');
    const re = new RegExp('<' + key + '>[^<]*</' + key + '>');
    if (!re.test(x))
      return { ...inputInfo(slot), error: 'Cemu’s controller file has no <' + key + '> entry, nothing was changed.' };
    fs.writeFileSync(f, x.replace(re, '<' + key + '>' + value + '</' + key + '>'));
  } catch (e) {
    return { ...inputInfo(slot), error: e.message };
  }
  return inputInfo(slot);
});
ipcMain.handle('inputProfile', (_, slot, action, name) => {
  const dir = inputDir(),
    n = profName(name);
  if (!slotOk(slot) || !dir) return { ...inputInfo(0), error: 'Cemu’s data folder wasn’t found. Start Cemu once first.' };
  const f = path.join(dir, 'controller' + slot + '.xml'),
    p = path.join(dir, n + '.xml');
  try {
    if (!n || /^controller\d+$/i.test(n)) return { ...inputInfo(slot), error: 'Please enter a profile name.' };
    if (action === 'save') {
      if (!fs.existsSync(f)) return { ...inputInfo(slot), error: 'Nothing to save: this controller isn’t set up in Cemu yet.' };
      fs.copyFileSync(f, p);
    } else if (action === 'load') {
      if (!fs.existsSync(p)) return { ...inputInfo(slot), error: 'Profile not found.' };
      const bk = f + '.cosmou-backup';
      if (fs.existsSync(f) && !fs.existsSync(bk)) fs.copyFileSync(f, bk);
      fs.copyFileSync(p, f);
    } else if (action === 'delete') {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch (e) {
    return { ...inputInfo(slot), error: e.message };
  }
  return inputInfo(slot);
});
ipcMain.handle('inputOpenCemu', () => {
  const s = read();
  if (!s.cemuPath || !fs.existsSync(s.cemuPath)) return { ok: false, error: 'Cemu isn’t installed yet.' };
  P.makeRunnable(s.cemuPath);
  const [cmd, cargs] = P.launchCommand(s.cemuPath, []);
  const c = spawn(cmd, cargs, { detached: true, stdio: 'ignore', cwd: path.dirname(s.cemuPath), env: P.childEnv(s.cemuPath) });
  c.on('error', () => {});
  c.unref();
  return { ok: true };
});

// ---------- Graphic pack manager (per game) ----------
// Cemu keeps enabled packs in settings.xml as <GraphicPack><Entry filename="graphicPacks/.../rules.txt"><Preset>…</Preset></Entry></GraphicPack>.
// An Entry without disabled="true" means the pack is on; no Entry means off.
const { execFileSync } = require('child_process');
const os = require('os');
const normRel = s =>
  String(s || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .toLowerCase();
const unq = s =>
  String(s || '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/\\n/g, ' ')
    .trim();
const normName = s =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
function parseRulesFull(txt) {
  const d = { titles: [], name: '', path: '', desc: '', presets: [] };
  let sec = null,
    cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/^﻿/, '').trim();
    if (!line || line[0] === '#' || line[0] === ';') continue;
    const h = line.match(/^\[(.+)\]$/);
    if (h) {
      const n = h[1].toLowerCase();
      sec = n === 'definition' ? 'def' : n === 'preset' ? 'preset' : null;
      if (sec === 'preset') {
        cur = {};
        d.presets.push(cur);
      }
      continue;
    }
    const m = line.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(),
      v = m[2];
    if (sec === 'def') {
      if (k === 'titleids')
        d.titles = v
          .toLowerCase()
          .split(',')
          .map(x => x.trim())
          .filter(Boolean);
      else if (k === 'name') d.name = unq(v);
      else if (k === 'path') d.path = unq(v);
      else if (k === 'description')
        d.desc = unq(v)
          .replace(/\s*\|\s*/g, ' ')
          .trim();
    } else if (sec === 'preset' && cur && (k === 'name' || k === 'category' || k === 'default')) cur[k] = unq(v);
  }
  return d;
}
const GP_GROUP = {
  graphics: 'Graphics',
  enhancements: 'Graphics',
  mods: 'Mods',
  cheats: 'Cheats',
  workarounds: 'Fixes',
  fixes: 'Fixes',
  bugfixes: 'Fixes',
};
function gpEntries(xml) {
  const map = {},
    sec = xml.match(/<GraphicPack>([\s\S]*?)<\/GraphicPack>/);
  if (!sec) return map;
  const re = /<Entry\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Entry>)/g;
  let m;
  while ((m = re.exec(sec[1]))) {
    const fn = (m[1].match(/filename="([^"]*)"/) || [])[1];
    if (fn === undefined) continue;
    const presets = {};
    for (const p of (m[2] || '').matchAll(/<Preset>([\s\S]*?)<\/Preset>/g)) {
      const cat = unxml(((p[1].match(/<category>([\s\S]*?)<\/category>/) || [])[1] || '').trim());
      const val = unxml(((p[1].match(/<preset>([\s\S]*?)<\/preset>/) || [])[1] || '').trim());
      presets[cat] = val;
    }
    map[normRel(unxml(fn))] = { enabled: !/disabled="(true|1)"/i.test(m[1]), presets };
  }
  return map;
}
function gameMatches(def, tid, name) {
  if (tid && def.titles.includes(tid.toLowerCase())) return true;
  if (tid || !name) return false;
  const a = normName((def.path || def.name).split('/')[0]),
    b = normName(name);
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
}
function gpList(tid, name) {
  const dirs = cemuNow();
  if (!dirs) return { found: false, packs: [], total: 0 };
  const data = dirs.data;
  let ent = {};
  try {
    ent = gpEntries(fs.readFileSync(path.join(dirs.config, 'settings.xml'), 'utf8'));
  } catch {}
  const all = findRules(path.join(data, 'graphicPacks'));
  const packs = [];
  for (const f of all) {
    let def;
    try {
      def = parseRulesFull(fs.readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    if (!gameMatches(def, tid, name)) continue;
    const rel = path.relative(data, f).replace(/\\/g, '/');
    const seg = (def.path || '')
      .split('/')
      .map(x => x.trim())
      .filter(Boolean);
    const group = seg.length >= 2 ? GP_GROUP[seg[1].toLowerCase()] || 'Other' : 'Other';
    const e = ent[normRel(rel)];
    const cats = [];
    for (const p of def.presets) {
      if (!p.name) continue;
      const c = p.category || '';
      let cat = cats.find(x => x.name === c);
      if (!cat) {
        cat = { name: c, options: [], def: '' };
        cats.push(cat);
      }
      if (!cat.options.includes(p.name)) cat.options.push(p.name);
      if (!cat.def && /^(1|true)$/i.test(p.default || '')) cat.def = p.name;
    }
    for (const c of cats) {
      if (!c.def) c.def = c.options[0];
      const saved = e && e.presets[c.name];
      c.active = saved && c.options.includes(saved) ? saved : c.def;
    }
    packs.push({
      id: rel,
      name: seg.length ? seg[seg.length - 1] : def.name || path.basename(path.dirname(f)),
      group,
      desc: def.desc,
      enabled: !!(e && e.enabled),
      categories: cats,
    });
  }
  packs.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return {
    found: true,
    packs,
    total: all.length,
    version: (() => {
      try {
        return fs.readFileSync(path.join(data, 'graphicPacks', 'downloadedGraphicPacks', 'version.txt'), 'utf8').trim();
      } catch {
        return '';
      }
    })(),
  };
}
const cemuRunning = P.cemuRunning;
function gpWrite(dirs, rel, enabled, presets) {
  if (!dirs) throw new Error('Cemu’s settings file wasn’t found. Start Cemu once first.');
  const file = path.join(dirs.config, 'settings.xml');
  let xml = fs.readFileSync(file, 'utf8');
  const nl = xml.includes('\r\n') ? '\r\n' : '\n';
  if (/<GraphicPack\s*\/>/.test(xml)) xml = xml.replace(/<GraphicPack\s*\/>/, '<GraphicPack>' + nl + '\t</GraphicPack>');
  if (!/<GraphicPack>[\s\S]*?<\/GraphicPack>/.test(xml)) {
    if (!/<\/content>/.test(xml)) throw new Error('Cemu’s settings file looks unusual, nothing was changed.');
    xml = xml.replace(/<\/content>/, '\t<GraphicPack>' + nl + '\t</GraphicPack>' + nl + '</content>');
  }
  const target = normRel(rel);
  xml = xml.replace(/(<GraphicPack>)([\s\S]*?)(<\/GraphicPack>)/, (all, a, body, c) => {
    const keep = [];
    for (const m of body.matchAll(/<Entry\b([^>]*?)(?:\/>|>[\s\S]*?<\/Entry>)/g)) {
      const fn = (m[1].match(/filename="([^"]*)"/) || [])[1];
      if (fn !== undefined && normRel(unxml(fn)) === target) continue;
      keep.push(m[0].trim());
    }
    if (enabled) {
      let e = '<Entry filename="' + escXml(rel).replace(/"/g, '&quot;') + '">' + nl;
      for (const [cat, val] of Object.entries(presets || {})) {
        e +=
          '\t\t\t<Preset>' +
          nl +
          (cat ? '\t\t\t\t<category>' + escXml(cat) + '</category>' + nl : '') +
          '\t\t\t\t<preset>' +
          escXml(val) +
          '</preset>' +
          nl +
          '\t\t\t</Preset>' +
          nl;
      }
      keep.push(e + '\t\t</Entry>');
    }
    return a + (keep.length ? nl + keep.map(k => '\t\t' + k).join(nl) + nl + '\t' : '') + c;
  });
  const bak = file + '.cosmou-backup';
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, xml);
}
ipcMain.handle('gpList', (_, tid, name) => {
  try {
    return gpList(String(tid || ''), String(name || ''));
  } catch (e) {
    return { found: false, packs: [], error: e.message };
  }
});
ipcMain.handle('gpSet', (_, tid, name, id, enabled, presets) => {
  const before = gpList(String(tid || ''), String(name || ''));
  const pack = before.packs.find(p => p.id === id);
  if (!pack) return { ...before, error: 'This graphic pack wasn’t found anymore.' };
  if (cemuRunning())
    return {
      ...before,
      error: 'Please close Cemu first. It saves its own graphic pack list when it quits and would undo this change.',
    };
  const clean = {};
  for (const c of pack.categories) {
    const v = presets && presets[c.name];
    clean[c.name] = c.options.includes(v) ? v : c.active;
  }
  try {
    gpWrite(cemuNow(), pack.id, !!enabled, clean);
  } catch (e) {
    return { ...before, error: e.message };
  }
  return gpList(String(tid || ''), String(name || ''));
});
ipcMain.handle('gpDownload', async () => {
  cancelled = false;
  const send = d => {
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('gp-progress', d);
  };
  const dirs = cemuNow();
  if (!dirs) return { ok: false, error: 'Cemu’s data folder wasn’t found. Start Cemu once first.' };
  const root = path.join(dirs.data, 'graphicPacks'),
    dest = path.join(root, 'downloadedGraphicPacks'),
    tmpDir = dest + '.cosmou-new',
    tmp = path.join(root, 'cosmou-packs.zip.tmp');
  try {
    send({ text: 'Looking for the latest community graphic packs…', percent: 0 });
    const rel = await getJson('https://api.github.com/repos/cemu-project/cemu_graphic_packs/releases/latest');
    const asset = (rel.assets || []).find(a => /\.zip$/i.test(a.name));
    if (!asset) throw new Error('No download found in the latest graphic pack release.');
    if (!asset.browser_download_url.startsWith('https://github.com/cemu-project/cemu_graphic_packs/'))
      throw new Error('Unexpected download address.');
    fs.mkdirSync(root, { recursive: true });
    await download(asset.browser_download_url, tmp, (got, total) =>
      send({
        text: 'Downloading graphic packs… ' + (got / 1048576).toFixed(1) + ' MB',
        percent: total ? Math.round((got / total) * 100) : 0,
      }),
    );
    if (cancelled) throw new Error('cancelled');
    send({ text: 'Unpacking…', percent: 100 });
    await new Promise(r => setTimeout(r, 60));
    fs.rmSync(tmpDir, { recursive: true, force: true });
    new AdmZip(tmp).extractAllTo(tmpDir, true);
    fs.writeFileSync(path.join(tmpDir, 'version.txt'), rel.tag_name || rel.name || '');
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmpDir, dest);
    return { ok: true, version: rel.tag_name || '' };
  } catch (e) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    if (cancelled) return { ok: false, cancelled: true };
    return { ok: false, error: friendly(e) };
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
    activeReq = null;
  }
});

// ---------- Feedback: system info for bug reports ----------
ipcMain.handle('feedbackInfo', () => {
  const s = read();
  const dirs = cemuNow();
  const mode = dirs ? dirs.mode : 'not found';
  let packs = 0,
    ctrl = 0;
  try {
    if (dirs) packs = findRules(path.join(dirs.data, 'graphicPacks')).length;
  } catch {}
  try {
    if (dirs) ctrl = fs.readdirSync(path.join(dirs.config, 'controllerProfiles')).filter(n => /^controller\d\.xml$/i.test(n)).length;
  } catch {}
  let games = 0;
  try {
    games = scan(s.gamesDir).length;
  } catch {}
  return {
    app: app.getVersion(),
    os: P.osName(),
    platform: process.platform,
    cemu: s.cemuPath
      ? (s.cemuVersion || 'unknown version') + (s.cemuManaged ? ' (downloaded by CosmoU)' : s.cemuFound ? ' (found automatically)' : ' (chosen manually)')
      : 'not installed',
    data: mode,
    games,
    packs,
    ctrl,
    gpu: '',
  };
});
ipcMain.handle('openIssue', (_, body) => {
  const url =
    'https://github.com/Eryski/CosmoU/issues/new?title=' +
    encodeURIComponent('Beta feedback') +
    '&body=' +
    encodeURIComponent(String(body || '').slice(0, 6000));
  shell.openExternal(url);
});

function enableWithPreset(dirs, tid, rel, presetName) {
  try {
    const pk = gpList(tid, '').packs.find(p => normRel(p.id) === normRel(rel));
    if (!pk) return false;
    const pr = {};
    for (const c of pk.categories) pr[c.name] = c.options.includes(presetName) ? presetName : c.active;
    gpWrite(dirs, pk.id, true, pr);
    return true;
  } catch {
    return false;
  }
}

// ---------- Auto-optimize: picks good settings for this PC and game ----------
function gpuProfile(name) {
  const n = String(name || '').toLowerCase();
  const vendor = /nvidia|geforce|rtx|gtx|quadro/.test(n)
    ? 'nvidia'
    : /amd|radeon|\brx\b/.test(n)
      ? 'amd'
      : /intel/.test(n)
        ? 'intel'
        : /apple/.test(n)
          ? 'apple'
          : '';
  let tier = 'unknown';
  if (!n) tier = 'unknown';
  else if (/swiftshader|llvmpipe|basic render|microsoft basic/.test(n)) tier = 'low';
  // Apple silicon: Max and Ultra chips are fast, Pro chips in the middle, the plain M chips like integrated graphics
  else if (/apple m\d+ (max|ultra)/.test(n)) tier = 'high';
  else if (/apple m\d+ pro/.test(n)) tier = 'mid';
  else if (/apple/.test(n)) tier = 'low';
  else if (/rtx\s*(40|50)\d\d|rtx\s*30(7|8|9)0|rtx\s*2080|titan|rx\s*(7|9)\d{3}|rx\s*6(7|8|9)\d0|arc\s*b\d/.test(n))
    tier = 'high';
  else if (
    /intel(?!.*arc)|uhd|iris|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|780m|680m|gtx\s*9\d\d|gt\s*\d{3,4}|rx\s*(4|5)\d\d\b|mx\s*\d{3}/.test(
      n,
    )
  )
    tier = 'low';
  else tier = 'mid';
  return { vendor, tier };
}
const TIER_QUALITY = { high: 'Ultra', mid: 'Quality', low: 'Native', unknown: 'Quality' };
ipcMain.handle('autoOptimize', (_, tid, name, key, gpu) => {
  tid = String(tid || '');
  name = String(name || '');
  key = String(key || name);
  const prof = gpuProfile(gpu),
    preset = TIER_QUALITY[prof.tier],
    done = [],
    skipped = [];
  const s = read();
  write({
    ...s,
    gameSettings: { ...(s.gameSettings || {}), [key]: preset },
    cemuOverrides: { ...(s.cemuOverrides || {}), api: 1, asyncCompile: true },
  });
  done.push('Quick quality: ' + preset + ' (' + QRES[preset].join('×') + ')', 'Graphics API: Vulkan', 'Async shader compile: on');
  const data = cemuDirsOf(s.cemuPath);
  if (!data) skipped.push('Graphic packs: Cemu’s data folder wasn’t found yet');
  else if (cemuRunning()) skipped.push('Graphic packs: close Cemu and press Auto-optimize again');
  else {
    const list = gpList(tid, name).packs;
    if (!list.length) skipped.push('No graphic packs for this game yet (use Graphic packs → Download)');
    const size = o => o.match(/(\d{3,4})\s*x\s*(\d{3,4})/i) || [];
    const [W, H] = QRES[preset];
    const res = list.find(p =>
      p.categories.some(
        c => c.options.some(o => size(o)[1]) && (/resolution/i.test(c.name) || /resolution|graphics/i.test(p.name)),
      ),
    );
    if (res) {
      const pr = {};
      for (const c of res.categories) {
        pr[c.name] = c.active;
        if (!c.options.some(o => size(o)[1])) continue;
        let best = c.active,
          bd = Infinity;
        for (const o of c.options) {
          const m = size(o);
          if (!m[1]) continue;
          const d = Math.abs(+m[2] - H) + Math.abs(+m[1] - W) / 1000;
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
        pr[c.name] = best;
      }
      try {
        gpWrite(data, res.id, true, pr);
        done.push(res.name + ' pack on');
      } catch (e) {
        skipped.push(res.name + ': ' + e.message);
      }
    }
    const fps = list.find(p => /fps\s*\+\+/i.test(p.name));
    if (fps && prof.tier !== 'low' && !fps.enabled) {
      const pr = {};
      for (const c of fps.categories) pr[c.name] = c.active;
      try {
        gpWrite(data, fps.id, true, pr);
        done.push('FPS++ on');
      } catch {}
    } else if (fps && prof.tier === 'low') skipped.push('FPS++ left off (needs a stronger PC)');
    if (prof.vendor)
      for (const p of list) {
        if (p.group !== 'Fixes' || p.enabled || !new RegExp(prof.vendor, 'i').test(p.name + ' ' + p.desc)) continue;
        const pr = {};
        for (const c of p.categories) pr[c.name] = c.active;
        try {
          gpWrite(data, p.id, true, pr);
          done.push(p.name + ' on');
        } catch {}
      }
  }
  return { ok: true, tier: prof.tier, vendor: prof.vendor, preset, done, skipped, settings: read() };
});

// ---------- Other apps (emulators, PC games) in the library ----------
// Windows: .exe, .bat, .cmd, .lnk · Linux: AppImages, programs, .sh scripts and .desktop files (see platform.js)
const appsDir = () => path.join(app.getPath('userData'), 'covers-apps');
function withApps(list) {
  const names = new Set(list.map(g => g.name));
  for (const a of read().customApps || []) {
    const base = a.name || path.parse(a.path).name;
    let n = base,
      k = 1;
    while (names.has(n)) n = base + ' (app' + (k++ > 1 ? ' ' + k : '') + ')';
    names.add(n);
    list.push({
      name: n,
      path: a.path,
      appId: a.id,
      kind: 'app',
      args: a.args || '',
      format: 'App' + (path.extname(a.path) ? ' · ' + path.extname(a.path).slice(1).toUpperCase() : ''),
      cover: a.cover && fs.existsSync(a.cover) ? pathToFileURL(a.cover).href : '',
    });
  }
  return list.sort((x, y) => x.name.localeCompare(y.name));
}
function splitArgs(s) {
  return (String(s || '').match(/"[^"]*"|\S+/g) || []).map(x => x.replace(/^"(.*)"$/, '$1'));
}
function launchApp(id) {
  const a = (read().customApps || []).find(x => x.id === id);
  if (!a) return { ok: false, error: 'This app isn’t in your library anymore.' };
  if (!fs.existsSync(a.path))
    return { ok: false, error: 'The program file no longer exists. Edit the entry to choose it again.' };
  const cmd = P.appCommand(a.path, splitArgs(a.args));
  if (cmd) {
    const child = spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', cwd: path.dirname(a.path), env: P.childEnv(a.path) });
    child.on('error', () => {});
    child.unref();
    return { ok: true, note: 'app', child };
  }
  shell.openPath(a.path);
  return { ok: true, note: 'app' };
}
// ---------- Other systems: CosmoU takes on the look of the console you play ----------
// Wii U is Cemu (everything above). Every other console (js/systems-data.js) has one emulator and one games folder
// (Settings → Cemu & Games → Other systems); its games get that console's look in the window (js/systems.js).
// CosmoU only starts the emulator people chose: it never downloads emulators, keys, firmware or games.
const SD = require('./js/systems-data.js');
const SYSTEMS = SD.SYSTEMS;
const sysOk = s => typeof s === 'string' && s !== 'wiiu' && Object.prototype.hasOwnProperty.call(SYSTEMS, s);
// Switch files carry their title id: [0100ABCD12340000] is the game, …800 its update, other endings are DLC
function scanSystem(sys, dir) {
  const def = SYSTEMS[sys],
    out = [],
    updates = new Set();
  if (!dir || !fs.existsSync(dir)) return out;
  const exts = def.ext.map(e => '.' + e);
  const walk = (d, depth) => {
    let list = [];
    try {
      list = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && depth < 3 && !e.name.startsWith('.')) walk(p, depth + 1);
      else if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) {
        const base = path.parse(e.name).name,
          tid = sys === 'switch' ? ((base.match(/\[(0100[0-9a-f]{12})\]/i) || [])[1] || '').toLowerCase() : '';
        if (tid && tid.slice(-3) === '800') {
          updates.add(tid.slice(0, 13));
          continue;
        }
        if ((tid && tid.slice(-3) !== '000') || /\b(update|upd|dlc)\b/i.test(base)) continue;
        const ext = path.extname(e.name).slice(1).toLowerCase();
        out.push({
          name: SD.titleOf(e.name) || base,
          file: e.name,
          path: p,
          sys,
          tid,
          format: (ext === 'gbc' ? 'Game Boy Color' : def.short) + ' · ' + ext.toUpperCase(),
        });
      }
    }
  };
  walk(dir, 0);
  for (const g of out) if (g.tid && updates.has(g.tid.slice(0, 13))) g.format += ' · Update';
  return out;
}
// where a game's picture is kept (covers-auto/<system>-<name>.png|jpg) and when CosmoU last looked for one
const sysArtKey = g => g.sys + '-' + (g.tid || safeName(SD.norm(g.file || g.name)).slice(0, 80));
const sysArt = g => ['.png', '.jpg'].map(x => path.join(autoDir(), sysArtKey(g) + '-cover' + x)).find(f => fs.existsSync(f));
function withSystems(list) {
  const systems = read().systems || {},
    names = new Set(list.map(g => g.name)),
    found = [];
  for (const sys of SD.ORDER) {
    const c = sysOk(sys) && systems[sys];
    if (!c || !c.gamesDir) continue;
    for (const g of scanSystem(sys, c.gamesDir)) {
      // the same title on two consoles: the second one says which console it is
      let n = g.name;
      if (names.has(n)) n += ' (' + SYSTEMS[sys].short + ')';
      for (let k = 2; names.has(n); k++) n = g.name + ' (' + SYSTEMS[sys].short + ' ' + k + ')';
      names.add(n);
      g.name = n;
      const art = sysArt(g);
      g.cover = manualCover(n) || (art ? pathToFileURL(art).href : '');
      found.push(g);
      list.push(g);
    }
  }
  if (read().onlineCovers !== false) queueSysArt(found);
  return list;
}

// ---------- covers for the other consoles ----------
const sysJobs = [],
  sysBusy = new Set(),
  thumbLists = {};
let sysRunning = false;
const sysMiss = g => path.join(autoDir(), sysArtKey(g) + '-art.miss');
function queueSysArt(list) {
  fs.mkdirSync(autoDir(), { recursive: true });
  for (const g of list) {
    const k = sysArtKey(g);
    if (sysBusy.has(k) || sysArt(g) || manualCover(g.name)) continue;
    try {
      if (Date.now() - Number(fs.readFileSync(sysMiss(g), 'utf8')) < 7 * 864e5) continue;
    } catch {}
    sysBusy.add(k);
    sysJobs.push(g);
  }
  if (!sysRunning) runSysArt();
}
function getText(url, max = 12 * 1048576, hops = 0) {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CosmoU', Accept: '*/*' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 4) {
        res.resume();
        return resolve(getText(new URL(res.headers.location, url).href, max, hops + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let body = '',
        size = 0;
      res.setEncoding('utf8');
      res.on('data', c => {
        size += c.length;
        if (size > max) req.destroy();
        else body += c;
      });
      res.on('end', () => resolve(body));
      res.on('error', () => resolve(null));
    });
    req.setTimeout(20000, () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
// the list of pictures of one console on the libretro server (kept for two weeks)
async function thumbFiles(folder) {
  if (thumbLists[folder]) return thumbLists[folder];
  const f = path.join(autoDir(), 'thumbs-' + safeName(folder) + '.json');
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - c.at < 14 * 864e5 && Array.isArray(c.files)) return (thumbLists[folder] = c.files);
  } catch {}
  const html = await getText(SD.listUrl(folder));
  if (!html) return [];
  const files = SD.thumbList(html);
  try {
    fs.writeFileSync(f, JSON.stringify({ at: Date.now(), files }));
  } catch {}
  return (thumbLists[folder] = files);
}
async function findSysArt(g) {
  const def = SYSTEMS[g.sys];
  if (def.eshop) {
    for (const tid of g.tid ? [g.tid, ''] : ['']) {
      const j = await getText(SD.eshopUrl(SD.titleOf(g.file || g.name), tid));
      const u = j && SD.eshopPick(j, SD.titleOf(g.file || g.name), tid);
      if (u) return u;
    }
    return '';
  }
  for (const folder of def.thumbs || []) {
    const files = await thumbFiles(folder);
    const hit = SD.bestThumb(files, g.file || g.name);
    if (hit) return SD.thumbUrl(folder, hit);
  }
  return '';
}
async function runSysArt() {
  sysRunning = true;
  while (sysJobs.length) {
    const g = sysJobs.shift(),
      k = sysArtKey(g);
    try {
      const url = await findSysArt(g);
      if (process.env.COSMOU_DEBUG) console.error('cover for', g.sys, g.name, '→', url || 'none');
      const dest = path.join(autoDir(), k + '-cover' + (/\.png(\?|$)/i.test(url) ? '.png' : '.jpg'));
      if (url && (await fetchImage(url, dest))) {
        if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('covers-updated');
      } else fs.writeFileSync(sysMiss(g), String(Date.now()));
    } catch {}
    sysBusy.delete(k);
    await new Promise(r => setTimeout(r, 250));
  }
  sysRunning = false;
}

// ---------- starting the emulator of another console ----------
// RetroArch needs a core for the console: the first one of CORES that is installed
function retroCore(emu, sys) {
  const ext = P.IS_WIN ? '.dll' : P.IS_MAC ? '.dylib' : '.so';
  const home = os.homedir();
  const dirs = P.IS_WIN
    ? [path.join(path.dirname(emu), 'cores'), path.join(process.env.APPDATA || '', 'RetroArch', 'cores')]
    : P.IS_MAC
      ? [path.join(home, 'Library', 'Application Support', 'RetroArch', 'cores'), path.join(emu, 'Contents', 'Resources', 'cores')]
      : [
          path.join(home, '.config', 'retroarch', 'cores'),
          path.join(home, '.var', 'app', 'org.libretro.RetroArch', 'config', 'retroarch', 'cores'),
          '/usr/lib/libretro',
          '/usr/lib/x86_64-linux-gnu/libretro',
          '/usr/lib64/libretro',
          '/usr/local/lib/libretro',
          path.join(path.dirname(emu), 'cores'),
        ];
  for (const core of SD.CORES[sys] || [])
    for (const d of dirs) {
      const f = path.join(d, core + '_libretro' + ext);
      if (fs.existsSync(f)) return f;
    }
  return '';
}
function launchSystemGame(sys, game) {
  const c = sysOk(sys) && (read().systems || {})[sys];
  const name = sysOk(sys) ? SYSTEMS[sys].name : 'this console';
  if (!c || !c.emuPath || !fs.existsSync(c.emuPath))
    return { ok: false, error: 'No ' + name + ' emulator chosen yet. Choose it in Settings → Cemu & Games → Other systems.' };
  if (typeof game !== 'string' || !fs.existsSync(game)) return { ok: false, error: 'The game file no longer exists.' };
  const base = path.basename(c.emuPath);
  const rule = SD.DESKTOP.find(r => r.re.test(base));
  let args = [game];
  if (c.args) args = splitArgs(c.args).map(a => a.replace('{game}', game));
  else if (rule && rule.retroarch) {
    const core = retroCore(c.emuPath, sys);
    if (!core)
      return {
        ok: false,
        error:
          'RetroArch has no ' + name + ' core yet. Download one in RetroArch (Load Core → Download a Core), for example ' + SD.CORES[sys][0] + '.',
      };
    args = ['-L', core, game];
  } else if (rule) args = rule.args(game);
  const cmd = P.appCommand(c.emuPath, args);
  if (!cmd) return { ok: false, error: 'The ' + name + ' emulator can’t be started. Choose it again in Settings → Cemu & Games.' };
  const child = spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', cwd: path.dirname(c.emuPath), env: P.childEnv(c.emuPath) });
  child.on('error', () => {});
  child.unref();
  return { ok: true, note: 'system', child };
}
const sysSave = (sys, patch) => {
  const s = read(),
    systems = { ...(s.systems || {}) };
  systems[sys] = { ...(systems[sys] || {}), ...patch };
  write({ ...s, systems });
  return read();
};
ipcMain.handle('systemPickEmu', async (_, sys) => {
  if (!sysOk(sys)) return read();
  const name = SYSTEMS[sys].name;
  const r = await dialog.showOpenDialog(
    P.IS_WIN
      ? { title: 'Choose your ' + name + ' emulator', filters: [{ name: 'Programs', extensions: ['exe'] }], properties: ['openFile'] }
      : P.IS_MAC
        ? { title: 'Choose your ' + name + ' emulator', filters: [{ name: 'Apps', extensions: ['app'] }], properties: ['openFile'], defaultPath: '/Applications' }
        : { title: 'Choose your ' + name + ' emulator (AppImage or program)', properties: ['openFile'], defaultPath: os.homedir() },
  );
  if (r.canceled) return read();
  const f = r.filePaths[0];
  if (!P.appCommand(f, [])) return { ...read(), error: 'This file can’t be started as a program.' };
  return sysSave(sys, { emuPath: f, emuName: path.parse(f).name });
});
ipcMain.handle('systemPickFolder', async (_, sys) => {
  if (!sysOk(sys)) return read();
  const r = await dialog.showOpenDialog({ title: 'Choose your ' + SYSTEMS[sys].name + ' games folder', properties: ['openDirectory'] });
  if (r.canceled) return read();
  return sysSave(sys, { gamesDir: r.filePaths[0] });
});
ipcMain.handle('systemRemove', (_, sys) => {
  if (!sysOk(sys)) return read();
  const s = read(),
    systems = { ...(s.systems || {}) };
  delete systems[sys];
  write({ ...s, systems });
  return read();
});

ipcMain.handle('appPick', async () => {
  const r = await dialog.showOpenDialog(
    P.IS_WIN
      ? { title: 'Choose a program', filters: [{ name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk'] }], properties: ['openFile'] }
        : P.IS_MAC
        ? { title: 'Choose an app', properties: ['openFile'], defaultPath: '/Applications' }
        : { title: 'Choose a program (AppImage, program, .sh or .desktop)', properties: ['openFile'], defaultPath: os.homedir() },
  );
  if (r.canceled) return null;
  const f = r.filePaths[0].replace(/\/$/, '');
  // a .desktop file names the app inside
  let name = path.parse(f).name;
  if (/\.desktop$/i.test(f))
    try {
      const m = fs.readFileSync(f, 'utf8').match(/^Name=(.+)$/m);
      if (m) name = m[1].trim();
    } catch {}
  return { path: f, name };
});
ipcMain.handle('appCoverPick', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Choose a cover image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    properties: ['openFile'],
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('appSave', (_, a) => {
  if (!a || typeof a.path !== 'string' || !P.appOk(a.path))
    return {
      ok: false,
      error: P.IS_WIN
        ? 'Please choose a program (.exe) first.'
        : P.IS_MAC
          ? 'Please choose an app (.app), a program or a .command file first.'
          : 'Please choose a program, AppImage, .sh or .desktop file first.',
    };
  const s = read(),
    apps = [...(s.customApps || [])];
  const id = typeof a.id === 'string' && apps.some(x => x.id === a.id) ? a.id : crypto.randomBytes(6).toString('hex');
  const old = apps.find(x => x.id === id) || {};
  let cover = old.cover || '';
  if (typeof a.coverFile === 'string' && /\.(png|jpe?g|webp)$/i.test(a.coverFile) && fs.existsSync(a.coverFile)) {
    fs.mkdirSync(appsDir(), { recursive: true });
    for (const f of fs.readdirSync(appsDir()))
      if (f.startsWith(id + '.'))
        try {
          fs.unlinkSync(path.join(appsDir(), f));
        } catch {}
    cover = path.join(appsDir(), id + path.extname(a.coverFile).toLowerCase());
    fs.copyFileSync(a.coverFile, cover);
  }
  const entry = {
    id,
    name:
      String(a.name || '')
        .trim()
        .slice(0, 60) || path.parse(a.path).name,
    path: a.path,
    args: String(a.args || '').slice(0, 300),
    cover,
  };
  const i = apps.findIndex(x => x.id === id);
  if (i >= 0) apps[i] = entry;
  else apps.push(entry);
  write({ ...s, customApps: apps });
  return { ok: true, id };
});
ipcMain.handle('appRemove', (_, id) => {
  const s = read(),
    a = (s.customApps || []).find(x => x.id === id);
  if (a && a.cover)
    try {
      fs.unlinkSync(a.cover);
    } catch {}
  write({ ...s, customApps: (s.customApps || []).filter(x => x.id !== id) });
  return { ok: true };
});
ipcMain.handle('appGet', (_, id) => {
  const a = (read().customApps || []).find(x => x.id === id);
  return a ? { ...a, coverUrl: a.cover && fs.existsSync(a.cover) ? pathToFileURL(a.cover).href : '' } : null;
});

ipcMain.handle('openDiscord', () => shell.openExternal('https://discord.gg/BZry7jGjr7'));

// ---------- Recently played: saved on disk by the main process, so it survives restarts and updates ----------
function recordPlay(name) {
  if (typeof name !== 'string' || !name || name.length > 200) return;
  const s = read();
  write({ ...s, plays: { ...(s.plays || {}), [name]: Date.now() } });
}
ipcMain.handle('mergePlays', (_, p) => {
  const s = read(),
    plays = { ...(s.plays || {}) };
  if (p && typeof p === 'object')
    for (const [k, v] of Object.entries(p)) if (typeof k === 'string' && Number.isFinite(+v) && !(plays[k] >= +v)) plays[k] = +v;
  write({ ...s, plays });
  return plays;
});

// ---------- Theme: System / Light / Dark ----------
function applyTheme(t) {
  nativeTheme.themeSource = t === 'light' || t === 'dark' ? t : 'system';
}
ipcMain.handle('setTheme', (_, t) => {
  const v = t === 'light' || t === 'dark' ? t : 'system';
  applyTheme(v);
  write({ ...read(), theme: v });
  return v;
});

// ---------- Update checker (GitHub releases) ----------
const RELEASES = 'https://github.com/Eryski/CosmoU/releases/latest';
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
function latestRelease() {
  return new Promise(resolve => {
    const req = https.get(
      'https://api.github.com/repos/Eryski/CosmoU/releases/latest',
      { headers: { 'User-Agent': 'CosmoU', Accept: 'application/vnd.github+json' } },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => (body += c));
        res.on('end', () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.setTimeout(10000, () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
ipcMain.handle('checkUpdate', async () => {
  const current = app.getVersion(),
    rel = await latestRelease();
  if (!rel || !rel.tag_name) return { ok: false, current, error: 'Couldn’t reach GitHub. Check your internet connection.' };
  const latest = rel.tag_name.replace(/^v/i, '');
  return { ok: true, current, latest, available: newer(latest, current), notes: String(rel.body || '').slice(0, 1500) };
});
ipcMain.handle('openReleases', () => shell.openExternal(RELEASES));

// ---------- First-time setup ----------
ipcMain.handle('setSetupDone', (_, v) => {
  write({ ...read(), setupDone: v !== false });
  return read();
});
// Menu music: copy one chosen audio file into CosmoU's music folder (replaces the previous one), or remove it again.
const musicDir = () => path.join(app.getPath('userData'), 'music');
const AUDIO = /\.(mp3|ogg|wav|m4a|flac)$/i;
ipcMain.handle('pickMusic', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Choose your menu music',
    filters: [{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'm4a', 'flac'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !AUDIO.test(r.filePaths[0])) return null;
  fs.mkdirSync(musicDir(), { recursive: true });
  for (const f of fs.readdirSync(musicDir())) if (AUDIO.test(f)) fs.rmSync(path.join(musicDir(), f), { force: true });
  const dest = path.join(musicDir(), path.basename(r.filePaths[0]));
  fs.copyFileSync(r.filePaths[0], dest);
  return { url: pathToFileURL(dest).href, name: path.basename(dest) };
});
ipcMain.handle('resetMusic', () => {
  try {
    for (const f of fs.readdirSync(musicDir())) if (AUDIO.test(f)) fs.rmSync(path.join(musicDir(), f), { force: true });
  } catch {}
  return true;
});

// ---------- Export / import settings (no secrets: only paths and preferences) ----------
const EXPORT_KEYS = {
  theme: 'string',
  cemuPath: 'string',
  gamesDir: 'string',
  onlineCovers: 'boolean',
  defaultQuality: 'string',
  gameSettings: 'object',
  cemuOverrides: 'object',
  customApps: 'array',
  plays: 'object',
  playtime: 'object',
  sessions: 'array',
  autoSaveBackup: 'boolean',
};
const UI_KEYS = ['style', 'viewMode', 'wuView', 'hoverCases', 'uiSounds', 'music', 'buddies', 'posts', 'favs', 'sort', 'show'];
ipcMain.handle('exportSettings', async (_, ui) => {
  const r = await dialog.showSaveDialog({
    title: 'Export CosmoU settings',
    defaultPath: path.join(app.getPath('documents'), 'cosmou-settings.json'),
    filters: [{ name: 'CosmoU settings', extensions: ['json'] }],
  });
  if (r.canceled || !r.filePath) return { ok: false, cancelled: true };
  const s = read(),
    settings = {};
  for (const k of Object.keys(EXPORT_KEYS)) if (s[k] !== undefined) settings[k] = s[k];
  const uiOut = {};
  for (const k of UI_KEYS) if (ui && typeof ui[k] === 'string') uiOut[k] = ui[k].slice(0, 20000);
  const data = { app: 'CosmoU', version: app.getVersion(), exportedAt: new Date().toISOString(), settings, ui: uiOut };
  fs.writeFileSync(r.filePath, JSON.stringify(data, null, 2));
  return { ok: true, file: r.filePath };
});
const typeOk = (v, t) =>
  t === 'array' ? Array.isArray(v) : t === 'object' ? v && typeof v === 'object' && !Array.isArray(v) : typeof v === t;
ipcMain.handle('importSettings', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Import CosmoU settings',
    filters: [{ name: 'CosmoU settings', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (r.canceled) return { ok: false, cancelled: true };
  let data;
  try {
    if (fs.statSync(r.filePaths[0]).size > 2 * 1048576) throw new Error('too big');
    data = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
  } catch {
    return { ok: false, error: 'This file isn’t a CosmoU settings file.' };
  }
  if (!data || data.app !== 'CosmoU' || !data.settings || typeof data.settings !== 'object')
    return { ok: false, error: 'This file isn’t a CosmoU settings file.' };
  const s = read(),
    applied = [];
  for (const [k, t] of Object.entries(EXPORT_KEYS)) {
    const v = data.settings[k];
    if (v === undefined || !typeOk(v, t)) continue;
    s[k] = v;
    applied.push(k);
  }
  if (typeof s.cemuPath === 'string' && s.cemuPath && !fs.existsSync(s.cemuPath)) {
    s.cemuPath = '';
    s.cemuManaged = false;
  }
  if (Array.isArray(s.customApps))
    s.customApps = s.customApps.filter(a => a && typeof a.path === 'string' && typeof a.id === 'string');
  s.setupDone = true;
  write(s);
  applyTheme(s.theme);
  const ui = {};
  for (const k of UI_KEYS) if (data.ui && typeof data.ui[k] === 'string') ui[k] = data.ui[k];
  return { ok: true, applied, ui, from: data.version || '' };
});

// ---------- Button mapping inside CosmoU: writes Cemu's controllerProfiles/controllerN.xml ----------
// Mapping ids belong to the emulated controller (VPADController.h etc.), button codes to the API (Controller.h).
const MAP_APIS = P.IS_WIN ? ['XInput', 'SDLController', 'Keyboard'] : ['SDLController', 'Keyboard'];
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function mapRead(slot) {
  const dir = inputDir(),
    out = { found: !!dir, slot, configured: false, type: '', devices: [] };
  if (!dir) return out;
  const f = path.join(dir, 'controller' + slot + '.xml');
  if (!fs.existsSync(f)) return out;
  try {
    const x = fs.readFileSync(f, 'utf8');
    out.configured = true;
    out.type = tagGet(x.split('<controller>')[0], 'type');
    for (const m of x.matchAll(/<controller>([\s\S]*?)<\/controller>/g)) {
      const c = m[1],
        maps = {};
      for (const e of c.matchAll(/<entry>\s*<mapping>(\d+)<\/mapping>\s*<button>(\d+)<\/button>\s*<\/entry>/g))
        maps[e[1]] = +e[2];
      out.devices.push({ api: tagGet(c, 'api'), uuid: tagGet(c, 'uuid'), name: unxml(tagGet(c, 'display_name')), maps });
    }
  } catch {}
  return out;
}
function mapXml(maps, ind) {
  if (!maps.length) return '<mappings />';
  const t = n => '\n' + ind + '\t'.repeat(n);
  return (
    '<mappings>' +
    maps
      .map(
        ([id, code]) =>
          t(1) + '<entry>' + t(2) + '<mapping>' + id + '</mapping>' + t(2) + '<button>' + code + '</button>' + t(1) + '</entry>',
      )
      .join('') +
    '\n' +
    ind +
    '</mappings>'
  );
}
ipcMain.handle('inputMapGet', (_, slot) => mapRead(slotOk(slot) ? slot : 0));
ipcMain.handle('inputMapSave', (_, slot, d) => {
  try {
    if (!slotOk(slot) || !d || typeof d !== 'object') return { ok: false, error: 'Invalid request.' };
    const dir = inputDir();
    if (!dir) return { ok: false, error: 'Cemu’s data folder wasn’t found. Install Cemu and start it once first.' };
    if (!IN_TYPES.includes(d.type)) return { ok: false, error: 'Unknown controller type.' };
    if (!MAP_APIS.includes(d.api)) return { ok: false, error: 'This kind of device can only be mapped in Cemu.' };
    if (cemuRunning()) return { ok: false, error: 'Close Cemu first, otherwise it overwrites the mapping when it quits.' };
    const cur = mapRead(slot);
    let uuid, name;
    if (d.api === 'XInput') {
      const n = Number(d.uuid);
      if (!Number.isInteger(n) || n < 0 || n > 3) return { ok: false, error: 'Choose controller 1 to 4.' };
      uuid = String(n);
      name = 'Controller ' + (n + 1);
    } else if (d.api === 'Keyboard') {
      uuid = 'keyboard';
      name = 'Keyboard';
    } else {
      const ex = cur.devices.find(x => x.api === 'SDLController' && x.uuid === d.uuid);
      if (!ex) return { ok: false, error: 'Choose this controller once in Cemu first, then you can map it here.' };
      uuid = ex.uuid;
      name = ex.name;
    }
    const seen = new Set(),
      maps = (Array.isArray(d.maps) ? d.maps : [])
        .filter(
          m =>
            Array.isArray(m) &&
            Number.isInteger(m[0]) &&
            m[0] > 0 &&
            m[0] < 64 &&
            Number.isInteger(m[1]) &&
            m[1] >= 0 &&
            m[1] < 0x10000 &&
            !seen.has(m[0]) &&
            seen.add(m[0]),
        )
        .sort((a, b) => a[0] - b[0]);
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, 'controller' + slot + '.xml');
    let x = cur.configured ? fs.readFileSync(f, 'utf8') : '';
    const same = cur.devices.find(c => c.api === d.api && c.uuid === uuid);
    if (same && cur.type === d.type) {
      // keep everything Cemu wrote (deadzones, motion, rumble, other devices) and only swap this device's mappings
      x = x.replace(/<controller>[\s\S]*?<\/controller>/g, blk => {
        if (tagGet(blk, 'api') !== d.api || tagGet(blk, 'uuid') !== uuid) return blk;
        const ind = ((blk.match(/\n([ \t]*)<mappings/) || [])[1] || '\t\t').replace(/\r/g, '');
        return /<mappings\s*\/>|<mappings>[\s\S]*?<\/mappings>/.test(blk)
          ? blk.replace(/<mappings\s*\/>|<mappings>[\s\S]*?<\/mappings>/, mapXml(maps, ind))
          : blk.replace(/<\/controller>$/, '\t' + mapXml(maps, ind) + '\n\t</controller>');
      });
    } else {
      const dz = d.api === 'XInput' ? '0.15' : '0.25',
        st = n => `\t\t<${n}>\n\t\t\t<deadzone>${dz}</deadzone>\n\t\t\t<range>1</range>\n\t\t</${n}>\n`;
      x =
        '<?xml version="1.0" encoding="UTF-8"?>\n<emulated_controller>\n' +
        `\t<type>${xmlEsc(d.type)}</type>\n` +
        (d.type === 'Wii U GamePad' ? '\t<toggle_display>0</toggle_display>\n' : '') +
        `\t<controller>\n\t\t<api>${d.api}</api>\n\t\t<uuid>${xmlEsc(uuid)}</uuid>\n\t\t<display_name>${xmlEsc(name)}</display_name>\n` +
        st('axis') +
        st('rotation') +
        st('trigger') +
        '\t\t' +
        mapXml(maps, '\t\t') +
        '\n\t</controller>\n</emulated_controller>\n';
    }
    if (cur.configured) {
      const bk = f + '.cosmou-backup';
      if (!fs.existsSync(bk)) fs.copyFileSync(f, bk);
    }
    fs.writeFileSync(f, x);
    return { ok: true, ...mapRead(slot) };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
});

// ---------- Updates & DLC: Cemu loads them from mlc01/usr/title/0005000e/<low> (update) and 0005000c/<low> (DLC) ----------
const ADDON_KIND = { '0005000e': 'update', '0005000c': 'dlc', '00050000': 'game' };
function titleMeta(dir) {
  try {
    const x = fs.readFileSync(ci(dir, 'meta', 'meta.xml'), 'utf8'),
      tid = tag(x, 'title_id').toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(tid)) return null;
    return {
      tid,
      kind: ADDON_KIND[tid.slice(0, 8)] || '',
      low: tid.slice(8),
      version: parseInt(tag(x, 'title_version'), 10) || 0,
      title: tag(x, 'longname_en').replace(/\s+/g, ' '),
    };
  } catch {
    return null;
  }
}
// title ID of a NUS-format folder (title.tmd + .app files): 8 bytes at 0x18C of the TMD
function nusTid(dir) {
  try {
    const fd = fs.openSync(path.join(dir, 'title.tmd'), 'r'),
      b = Buffer.alloc(8);
    fs.readSync(fd, b, 0, 8, 0x18c);
    fs.closeSync(fd);
    return b.toString('hex');
  } catch {
    return '';
  }
}
const titleDir = (mlc, kind, low) => path.join(mlc, 'usr', 'title', kind === 'update' ? '0005000e' : '0005000c', low);
function installedAddons(mlc, low) {
  const up = titleDir(mlc, 'update', low),
    dlc = titleDir(mlc, 'dlc', low),
    m = fs.existsSync(ci(up, 'meta', 'meta.xml')) ? titleMeta(up) : null;
  return { update: m ? m.version : null, dlc: fs.existsSync(dlc) && fs.readdirSync(dlc).length > 0 };
}
function findAddons(roots) {
  const out = [],
    seen = new Set();
  const look = (dir, depth) => {
    let list = [];
    try {
      list = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      if (!e.isDirectory()) continue;
      const p = path.join(dir, e.name);
      if (seen.has(p.toLowerCase())) continue;
      if (fs.existsSync(ci(p, 'meta', 'meta.xml'))) {
        seen.add(p.toLowerCase());
        const m = titleMeta(p);
        if (m && (m.kind === 'update' || m.kind === 'dlc')) out.push({ ...m, dir: p, format: 'folder' });
        continue; // never look inside a title
      }
      if (fs.existsSync(ci(p, 'title.tmd'))) {
        seen.add(p.toLowerCase());
        const tid = nusTid(p),
          kind = ADDON_KIND[tid.slice(0, 8)];
        if (kind === 'update' || kind === 'dlc')
          out.push({ tid, kind, low: tid.slice(8), version: null, title: e.name, dir: p, format: 'nus' });
        continue;
      }
      if (depth < 2) look(p, depth + 1);
    }
  };
  for (const r of roots) if (r && fs.existsSync(r)) look(r, 0);
  return out;
}
function addonRoots() {
  const s = read();
  return [...new Set([s.gamesDir, ...(Array.isArray(s.addonDirs) ? s.addonDirs : [])].filter(x => typeof x === 'string' && x))];
}
function addonsInfo(gameLows) {
  const s = read(),
    mlc = mlcDir(s.cemuPath);
  if (!mlc) return { supported: false, roots: addonRoots(), installed: {}, found: [] };
  const found = findAddons(addonRoots()),
    installed = {},
    lows = new Set(
      [...found.map(f => f.low), ...(Array.isArray(gameLows) ? gameLows.slice(0, 2000) : [])].filter(l =>
        /^[0-9a-f]{8}$/.test(l),
      ),
    );
  for (const low of lows) installed[low] = installedAddons(mlc, low);
  for (const f of found) {
    const i = installed[f.low];
    f.state =
      f.format === 'nus'
        ? 'nus'
        : f.kind === 'dlc'
          ? i.dlc
            ? 'installed'
            : 'new'
          : i.update === null
            ? 'new'
            : f.version > i.update
              ? 'newer'
              : 'installed';
  }
  return { supported: true, mlc, roots: addonRoots(), installed, found, busy: !!addonJob };
}
let addonJob = null;
async function copyTree(src, dst, onBytes) {
  await fs.promises.mkdir(dst, { recursive: true });
  for (const e of await fs.promises.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name),
      d = path.join(dst, e.name);
    if (e.isDirectory()) await copyTree(s, d, onBytes);
    else if (e.isFile()) {
      await fs.promises.copyFile(s, d);
      onBytes((await fs.promises.stat(s)).size);
    }
  }
}
ipcMain.handle('addonsInfo', (_, lows) => {
  try {
    return addonsInfo(lows);
  } catch (e) {
    return { supported: false, roots: [], installed: {}, found: [], error: friendly(e) };
  }
});
ipcMain.handle('addonsInstall', async (_, dir) => {
  if (addonJob) return { ok: false, error: 'Another install is still running.' };
  const s = read(),
    mlc = mlcDir(s.cemuPath);
  if (!mlc) return { ok: false, error: 'Cemu isn’t set up yet. Install Cemu and start it once first.' };
  // only folders that the scan itself found can be installed
  const f = typeof dir === 'string' && findAddons(addonRoots()).find(x => x.dir === dir);
  if (!f) return { ok: false, error: 'This folder wasn’t found any more.' };
  if (f.format === 'nus')
    return {
      ok: false,
      error: 'This one is in NUS format (.app files). Install it in Cemu: File → Install game title, update or DLC.',
    };
  if (cemuRunning()) return { ok: false, error: 'Close Cemu first, then install.' };
  const dst = titleDir(mlc, f.kind, f.low),
    tmp = dst + '.cosmou-new',
    old = dst + '.cosmou-old',
    total = dirSize(f.dir);
  let done = 0,
    last = 0;
  const send = force => {
    const now = Date.now();
    if (!force && now - last < 150) return;
    last = now;
    if (mainWin && !mainWin.isDestroyed())
      mainWin.webContents.send('addon-progress', {
        low: f.low,
        kind: f.kind,
        done,
        total,
        percent: total ? Math.min(100, Math.round((done / total) * 100)) : 0,
      });
  };
  addonJob = f;
  try {
    await fs.promises.rm(tmp, { recursive: true, force: true });
    // DLC can come in parts: start from what is already installed, the new files go on top
    if (f.kind === 'dlc' && fs.existsSync(dst)) await copyTree(dst, tmp, () => {});
    await copyTree(f.dir, tmp, n => {
      done += n;
      send();
    });
    // swap in one step, so a failed copy never leaves a half-installed title behind
    await fs.promises.rm(old, { recursive: true, force: true });
    if (fs.existsSync(dst)) await fs.promises.rename(dst, old);
    await fs.promises.rename(tmp, dst);
    await fs.promises.rm(old, { recursive: true, force: true });
    send(true);
    return { ok: true, kind: f.kind, version: f.version, low: f.low };
  } catch (e) {
    await fs.promises.rm(tmp, { recursive: true, force: true }).catch(() => {});
    if (!fs.existsSync(dst) && fs.existsSync(old)) await fs.promises.rename(old, dst).catch(() => {});
    return { ok: false, error: friendly(e) };
  } finally {
    addonJob = null;
  }
});
ipcMain.handle('addonsAddFolder', async (_, lows) => {
  const r = await dialog.showOpenDialog({ title: 'Choose a folder with updates or DLC', properties: ['openDirectory'] });
  if (r.canceled) return addonsInfo(lows);
  const p = r.filePaths[0],
    s = read(),
    // an update folder itself was picked: remember the folder it sits in
    keep = fs.existsSync(ci(p, 'meta', 'meta.xml')) || fs.existsSync(ci(p, 'title.tmd')) ? path.dirname(p) : p;
  write({ ...s, addonDirs: [...new Set([...(Array.isArray(s.addonDirs) ? s.addonDirs : []), keep])].slice(-10) });
  return addonsInfo(lows);
});
ipcMain.handle('addonsForget', (_, dir, lows) => {
  const s = read();
  write({ ...s, addonDirs: (Array.isArray(s.addonDirs) ? s.addonDirs : []).filter(d => d !== dir) });
  return addonsInfo(lows);
});
ipcMain.handle('addonsOpen', (_, low, kind) => {
  const mlc = mlcDir(read().cemuPath);
  if (!mlc) return '';
  const d = /^[0-9a-f]{8}$/.test(String(low))
    ? titleDir(mlc, kind === 'dlc' ? 'dlc' : 'update', low)
    : path.join(mlc, 'usr', 'title');
  return shell.openPath(fs.existsSync(d) ? d : path.join(mlc, 'usr', 'title'));
});

// ---------- Add to Steam: non-Steam shortcuts in userdata/<id>/config/shortcuts.vdf (binary VDF) ----------
const CRC_T = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = s => {
  let c = 0xffffffff;
  for (const b of Buffer.from(s, 'utf8')) c = CRC_T[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
// the same id Steam and Steam ROM Manager use, so artwork in config/grid matches
const steamAppId = (exe, name) => (crc32(exe + name) | 0x80000000) >>> 0;
function vdfParse(buf) {
  let i = 0;
  const str = () => {
    const e = buf.indexOf(0, i);
    if (e < 0) throw new Error('Broken shortcuts file');
    const s = buf.toString('utf8', i, e);
    i = e + 1;
    return s;
  };
  const map = () => {
    const out = [];
    for (;;) {
      if (i >= buf.length) return out;
      const t = buf[i++];
      if (t === 8) return out;
      const k = str();
      if (t === 0) out.push([k, 0, map()]);
      else if (t === 1) out.push([k, 1, str()]);
      else if (t === 2) {
        out.push([k, 2, buf.readInt32LE(i)]);
        i += 4;
      } else if (t === 3 || t === 4 || t === 6) {
        out.push([k, t, Buffer.from(buf.subarray(i, i + 4))]);
        i += 4;
      } else if (t === 7 || t === 10) {
        out.push([k, t, Buffer.from(buf.subarray(i, i + 8))]);
        i += 8;
      } else throw new Error('Unknown entry in shortcuts file');
    }
  };
  return map();
}
function vdfWrite(list) {
  const parts = [];
  const w = l => {
    for (const [k, t, v] of l) {
      parts.push(Buffer.from([t]), Buffer.from(k + '\0', 'utf8'));
      if (t === 0) w(v);
      else if (t === 1) parts.push(Buffer.from(v + '\0', 'utf8'));
      else if (t === 2) {
        const b = Buffer.alloc(4);
        b.writeInt32LE(v | 0);
        parts.push(b);
      } else parts.push(v);
    }
    parts.push(Buffer.from([8]));
  };
  w(list);
  return Buffer.concat(parts);
}
const vget = (e, k) => {
  const f = e.find(x => x[0].toLowerCase() === k.toLowerCase());
  return f ? f[2] : undefined;
};
function steamRoot() {
  if (process.platform === 'win32') {
    try {
      const o = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
      });
      const m = o.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (m && fs.existsSync(m[1].trim())) return path.normalize(m[1].trim());
    } catch {}
  }
  if (!P.IS_WIN) return P.steamRootLinux();
  const tries = ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'];
  return tries.find(p => fs.existsSync(path.join(p, 'userdata'))) || '';
}
function steamUsers(root) {
  const names = {};
  try {
    const x = fs.readFileSync(path.join(root, 'config', 'loginusers.vdf'), 'utf8');
    for (const m of x.matchAll(/"(\d{17})"\s*\{([^}]*)\}/g)) {
      const id = String(BigInt(m[1]) - 76561197960265728n),
        f = {};
      for (const k of m[2].matchAll(/"(\w+)"\s*"([^"]*)"/g)) f[k[1]] = k[2];
      names[id] = { name: f.PersonaName || f.AccountName || '', recent: f.MostRecent === '1' || f.mostrecent === '1' };
    }
  } catch {}
  let ids = [];
  try {
    ids = fs.readdirSync(path.join(root, 'userdata')).filter(d => /^\d+$/.test(d) && d !== '0');
  } catch {}
  return ids
    .map(id => {
      let at = 0;
      try {
        at = fs.statSync(path.join(root, 'userdata', id, 'config')).mtimeMs;
      } catch {}
      return { id, name: (names[id] && names[id].name) || 'Steam account ' + id, recent: !!(names[id] && names[id].recent), at };
    })
    .sort((a, b) => b.recent - a.recent || b.at - a.at);
}
const scFile = (root, user) => path.join(root, 'userdata', user, 'config', 'shortcuts.vdf');
function readShortcuts(root, user) {
  const f = scFile(root, user);
  if (!fs.existsSync(f)) return [['shortcuts', 0, []]];
  const top = vdfParse(fs.readFileSync(f));
  if (!top.length || top[0][1] !== 0) throw new Error('Steam’s shortcuts file looks unusual, nothing was changed.');
  return top;
}
const steamRunning = P.steamRunning;
// how Steam starts CosmoU: the installed exe, the portable exe, or electron + app folder while developing
function selfLaunch() {
  const exe = P.selfExe();
  return { exe, dir: path.dirname(exe), pre: app.isPackaged ? '' : `"${app.getAppPath()}" ` };
}
// Steam on Linux can't use a program as its icon: give it CosmoU's icon as a picture file
function selfIcon() {
  if (P.IS_WIN) return selfLaunch().exe;
  const dst = path.join(app.getPath('userData'), 'cosmou-icon.png');
  try {
    if (!fs.existsSync(dst)) fs.copyFileSync(path.join(__dirname, 'build', 'icon.png'), dst);
    return dst;
  } catch {
    return '';
  }
}
const q = s => '"' + s + '"';
function steamInfo(user) {
  const root = steamRoot();
  if (!root) return { found: false, users: [] };
  const users = steamUsers(root),
    u = users.find(x => x.id === user) || users[0];
  const out = { found: true, root, users, user: u ? u.id : '', running: steamRunning(), have: [] };
  if (!u) return out;
  try {
    const me = selfLaunch().exe.toLowerCase();
    for (const [, , e] of readShortcuts(root, u.id)[0][2]) {
      const exe = String(vget(e, 'Exe') || '')
        .replace(/"/g, '')
        .toLowerCase();
      if (exe !== me) continue;
      const opts = String(vget(e, 'LaunchOptions') || ''),
        m = opts.match(/--play "([^"]+)"/);
      out.have.push(m ? 'game:' + m[1].toLowerCase() : 'cosmou');
    }
  } catch (e) {
    out.error = friendly(e);
  }
  return out;
}
// artwork only from CosmoU's own cover folders
const fromUrl = u => {
  try {
    const p = u && /^file:/.test(u) ? path.resolve(require('url').fileURLToPath(u)) : '';
    return p && [autoDir(), coversDir()].some(d => p.toLowerCase().startsWith(path.resolve(d).toLowerCase() + path.sep)) ? p : '';
  } catch {
    return '';
  }
};
function addShortcuts(root, user, items, art) {
  const top = readShortcuts(root, user),
    list = top[0][2],
    me = selfLaunch(),
    grid = path.join(root, 'userdata', user, 'config', 'grid'),
    added = [];
  for (const it of items) {
    const isApp = it.kind === 'cosmou',
      name = isApp ? 'CosmoU' : String(it.name || '').slice(0, 120),
      opts = me.pre + (isApp ? '' : '--play ' + q(it.path)),
      exe = q(me.exe),
      appid = steamAppId(exe, name);
    if (!name || (!isApp && (typeof it.path !== 'string' || !fs.existsSync(it.path) || !fs.statSync(it.path).isFile()))) continue;
    const icon = isApp ? selfIcon() : fromUrl(it.icon) || selfIcon();
    const entry = [
      ['appid', 2, appid | 0],
      ['AppName', 1, name],
      ['Exe', 1, exe],
      ['StartDir', 1, q(me.dir)],
      ['icon', 1, icon],
      ['ShortcutPath', 1, ''],
      ['LaunchOptions', 1, opts],
      ['IsHidden', 2, 0],
      ['AllowDesktopConfig', 2, 1],
      ['AllowOverlay', 2, 1],
      ['OpenVR', 2, 0],
      ['Devkit', 2, 0],
      ['DevkitGameID', 1, ''],
      ['DevkitOverrideAppID', 2, 0],
      ['LastPlayTime', 2, 0],
      ['FlatpakAppID', 1, ''],
      ['tags', 0, [['0', 1, isApp ? 'CosmoU' : 'Wii U']]],
    ];
    // same game again: update it in place (keeps play time and the user's own tweaks)
    const at = list.findIndex(([, , e]) => {
      const o = String(vget(e, 'LaunchOptions') || '');
      return (
        String(vget(e, 'Exe') || '').toLowerCase() === exe.toLowerCase() &&
        (isApp ? !/--play /.test(o) : o.toLowerCase() === opts.toLowerCase())
      );
    });
    if (at >= 0) {
      const old = list[at][2];
      for (const [k, t, v] of entry) {
        if (['LastPlayTime', 'IsHidden', 'tags', 'AllowOverlay', 'AllowDesktopConfig'].includes(k) && vget(old, k) !== undefined)
          continue;
        const f = old.find(x => x[0].toLowerCase() === k.toLowerCase());
        if (f) {
          f[1] = t;
          f[2] = v;
        } else old.push([k, t, v]);
      }
    } else list.push([String(list.length), 0, entry]);
    if (art) {
      fs.mkdirSync(grid, { recursive: true });
      const put = (src, dst) => {
        try {
          if (src && fs.existsSync(src)) fs.copyFileSync(src, path.join(grid, dst + path.extname(src).toLowerCase()));
        } catch {}
      };
      if (!isApp) {
        put(fromUrl(it.cover), appid + 'p');
        put(fromUrl(it.hero), appid + '_hero');
        put(fromUrl(it.hero), String(appid));
      }
    }
    added.push(name);
  }
  // keep the keys 0, 1, 2 … in order
  list.forEach((e, i) => (e[0] = String(i)));
  const f = scFile(root, user);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (fs.existsSync(f) && !fs.existsSync(f + '.cosmou-backup')) fs.copyFileSync(f, f + '.cosmou-backup');
  fs.writeFileSync(f, vdfWrite(top));
  return added;
}
const waitFor = async (test, ms) => {
  for (let t = 0; t < ms; t += 500) {
    if (test()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return test();
};
ipcMain.handle('steamInfo', (_, user) => steamInfo(typeof user === 'string' ? user : ''));
ipcMain.handle('steamAdd', async (_, d) => {
  try {
    const root = steamRoot();
    if (!root) return { ok: false, error: 'Steam wasn’t found on this ' + (P.IS_WIN ? 'PC.' : 'computer.') };
    const users = steamUsers(root),
      u = users.find(x => x.id === (d && d.user)) || users[0];
    if (!u) return { ok: false, error: 'Sign in to Steam once, then try again.' };
    const items = Array.isArray(d && d.items) ? d.items.slice(0, 500) : [];
    if (!items.length) return { ok: false, error: 'Choose at least one entry.' };
    const wasRunning = steamRunning();
    // Steam rewrites shortcuts.vdf when it quits, so it has to be closed while CosmoU writes the file
    if (wasRunning) {
      if (!d.restart) return { ok: false, needRestart: true };
      const [c, a] = P.steamCommand(root, ['-shutdown']);
      const sp = spawn(c, a, { detached: true, stdio: 'ignore', env: P.childEnv(c) });
      sp.on('error', () => {});
      sp.unref();
      if (!(await waitFor(() => !steamRunning(), 30000)))
        return { ok: false, error: 'Steam didn’t close. Close it yourself and try again.' };
      await new Promise(r => setTimeout(r, 1500));
    }
    const added = addShortcuts(root, u.id, items, d.art !== false);
    if (wasRunning) {
      const [c, a] = P.steamCommand(root, []);
      const sp = spawn(c, a, { detached: true, stdio: 'ignore', env: P.childEnv(c) });
      sp.on('error', () => {});
      sp.unref();
    }
    return { ok: true, added, restarted: wasRunning };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
});

// ---------- Started from a Steam shortcut: CosmoU.exe --play "<game path>" ----------
const playArg = (() => {
  const a = process.argv,
    i = a.indexOf('--play');
  return i >= 0 && typeof a[i + 1] === 'string' ? a[i + 1] : '';
})();
ipcMain.on('launchArg', e => (e.returnValue = playArg));
ipcMain.on('appVersion', e => (e.returnValue = app.getVersion()));
ipcMain.on('systemList', e => (e.returnValue = SD.ORDER.filter(k => k !== 'wiiu')));
