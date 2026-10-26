const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const fs = require('fs'),
  path = require('path'),
  { pathToFileURL } = require('url'),
  { spawn } = require('child_process');
const https = require('https'),
  crypto = require('crypto'),
  AdmZip = require('adm-zip');
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

function readMeta(gameDir) {
  const f = path.join(gameDir, 'meta', 'meta.xml');
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
      const code = path.join(p, 'code');
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
      cacheTga(path.join(g.dir, 'meta', 'iconTex.tga'), path.join(autoDir(), key + '-icon.png'));
      cacheTga(path.join(g.dir, 'meta', 'bootTvTex.tga'), path.join(autoDir(), key + '-hero.png'));
    }
    const icon = path.join(autoDir(), key + '-icon.png');
    g.cover = manualCover(g.name) || urlIf(path.join(autoDir(), key + '-box.png')) || urlIf(icon);
    g.hero = urlIf(path.join(autoDir(), key + '-hero.png'));
    g.color = fs.existsSync(icon) ? avgColor(icon) : '';
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Optional online box art from GameTDB (one request at a time, results cached, misses remembered for 7 days)
const boxBusy = new Set(),
  boxJobs = [];
let boxRunning = false;
function fetchImage(url, dest) {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': 'CosmoU' } }, res => {
      if (res.statusCode !== 200 || !/^image\//.test(res.headers['content-type'] || '')) {
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
function queueBoxArt(list) {
  for (const g of list) {
    if (!g.meta || !g.meta.code || !g.tid || boxBusy.has(g.tid)) continue;
    const dest = path.join(autoDir(), g.tid + '-box.png'),
      miss = dest + '.miss';
    if (fs.existsSync(dest)) continue;
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
      L = g.meta.code[3];
    const regions = L === 'E' ? ['US', 'EN'] : L === 'J' ? ['JA'] : ['EN', 'EU'];
    const dest = path.join(autoDir(), g.tid + '-box.png');
    let ok = false;
    for (const kind of ['coverHQ', 'cover']) {
      for (const r of regions) {
        ok = await fetchImage(`https://art.gametdb.com/wiiu/${kind}/${r}/${id}.png`, dest);
        if (ok) break;
      }
      if (ok) break;
    }
    if (ok) {
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('covers-updated');
    } else {
      try {
        fs.writeFileSync(dest + '.miss', String(Date.now()));
      } catch {}
    }
    boxBusy.delete(g.tid);
    await new Promise(r => setTimeout(r, 400));
  }
  boxRunning = false;
}

app.whenReady().then(() => {
  fs.mkdirSync(coversDir(), { recursive: true });
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
  mainWin = win;
  win.loadFile('index.html');
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('settings', () => read());
ipcMain.handle('scan', () => {
  const l = scan(read().gamesDir);
  if (read().onlineCovers !== false) queueBoxArt(l);
  return withApps(l);
});
ipcMain.handle('setOnlineCovers', (_, v) => {
  const s = { ...read(), onlineCovers: !!v };
  write(s);
  return s;
});
ipcMain.handle('covers', () => shell.openPath(coversDir()));
ipcMain.handle('pickCemu', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Choose Cemu.exe',
    filters: [{ name: 'Cemu', extensions: ['exe'] }],
    properties: ['openFile'],
  });
  if (r.canceled) return read();
  const s = { ...read(), cemuPath: r.filePaths[0], cemuManaged: false, cemuVersion: '' };
  write(s);
  return s;
});
ipcMain.handle('pickFolder', async () => {
  const r = await dialog.showOpenDialog({ title: 'Choose games folder', properties: ['openDirectory'] });
  if (r.canceled) return read();
  const s = { ...read(), gamesDir: r.filePaths[0] };
  write(s);
  return s;
});
ipcMain.handle('play', (_, arg) => {
  if (arg && typeof arg === 'object' && arg.appId) return launchApp(arg.appId);
  const gamePath = typeof arg === 'string' ? arg : arg && arg.path;
  const s = read();
  if (!s.cemuPath || !fs.existsSync(s.cemuPath))
    return { ok: false, error: 'Cemu isn’t installed yet. Open Settings to download it or choose Cemu.exe.' };
  if (typeof gamePath !== 'string' || !fs.existsSync(gamePath)) return { ok: false, error: 'The game file no longer exists.' };
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
  spawn(s.cemuPath, ['-g', gamePath, '-f'], { detached: true, stdio: 'ignore', cwd: path.dirname(s.cemuPath) }).unref();
  return { ok: true, note, preset };
});

ipcMain.handle('showInFolder', (_, p) => {
  if (typeof p === 'string' && fs.existsSync(p)) shell.showItemInFolder(p);
});

ipcMain.handle('music', () => {
  const dirs = [
    path.join(app.getPath('userData'), 'music'),
    path.join(process.resourcesPath || '', 'music'),
    path.join(__dirname, 'assets', 'music'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    const f = fs.readdirSync(d).find(n => /\.(mp3|ogg|wav|m4a|flac)$/i.test(n));
    if (f) return { url: pathToFileURL(path.join(d, f)).href, name: f };
  }
  return null;
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
  for (const e of items) if (e.isFile() && e.name.toLowerCase() === 'cemu.exe') return path.join(dir, e.name);
  for (const e of items)
    if (e.isDirectory()) {
      const f = findExe(path.join(dir, e.name), depth + 1);
      if (f) return f;
    }
  return '';
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'CosmoU', Accept: 'application/vnd.github+json' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => {
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
ipcMain.handle('cemuInstall', async () => {
  cancelled = false;
  const send = d => {
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('cemu-progress', d);
  };
  const tmp = path.join(app.getPath('userData'), 'cemu-download.zip.tmp');
  try {
    send({ stage: 'find', text: 'Looking for the latest Cemu release…' });
    const rel = await getJson('https://api.github.com/repos/cemu-project/Cemu/releases/latest');
    const asset = (rel.assets || []).find(a => /windows.*x64.*\.zip$/i.test(a.name));
    if (!asset) throw new Error('No Windows download found in the latest Cemu release.');
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
    send({ stage: 'extract', text: 'Unpacking Cemu…' });
    await new Promise(r => setTimeout(r, 80));
    fs.mkdirSync(cemuDir(), { recursive: true });
    new AdmZip(tmp).extractAllTo(cemuDir(), true); // overwrite only, never delete (keeps Cemu settings and saves)
    const exe = findExe(cemuDir());
    if (!exe) throw new Error('Cemu.exe was not found in the download.');
    write({ ...read(), cemuPath: exe, cemuManaged: true, cemuVersion: rel.tag_name || '' });
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

function cemuDataDir(exe) {
  const dir = path.dirname(exe);
  return (
    [path.join(dir, 'portable'), dir, path.join(process.env.APPDATA || '', 'Cemu')].find(d =>
      fs.existsSync(path.join(d, 'settings.xml')),
    ) || ''
  );
}
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
    const data = cemuDataDir(exe);
    if (!data) return 'no-settings';
    const t = (tid || '').toLowerCase();
    if (!t) return 'no-pack';
    let found = null;
    for (const f of findRules(path.join(data, 'graphicPacks'))) {
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
      const rel = path.relative(data, f);
      if (!found || /resolution/i.test(rel)) found = { rel, pick };
    }
    if (!found) return 'no-pack';
    let res = patchSettings(path.join(data, 'settings.xml'), found.rel, found.pick);
    if (res === 'no-entry') res = enableWithPreset(data, t, found.rel, found.pick.name) ? 'applied' : res;
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
    const d = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
    if (d) {
      const xml = fs.readFileSync(path.join(d, 'settings.xml'), 'utf8');
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
  const keys = Object.keys(ov || {}).filter(k => CEMU_KEYS[k] && Number.isFinite(Number(ov[k])));
  if (!keys.length) return res;
  try {
    const d = cemuDataDir(exe);
    if (!d) {
      res.missing = keys;
      return res;
    }
    const f = path.join(d, 'settings.xml');
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
const IN_APIS = ['Keyboard', 'XInput', 'SDLController', 'DirectInput', 'DSUController'];
function inputDir() {
  const s = read();
  const d = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
  return d ? path.join(d, 'controllerProfiles') : '';
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
  spawn(s.cemuPath, [], { detached: true, stdio: 'ignore', cwd: path.dirname(s.cemuPath) }).unref();
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
      else if (k === 'description') d.desc = unq(v);
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
  const s = read();
  const data = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
  if (!data) return { found: false, packs: [], total: 0 };
  let ent = {};
  try {
    ent = gpEntries(fs.readFileSync(path.join(data, 'settings.xml'), 'utf8'));
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
function cemuRunning() {
  if (process.platform !== 'win32') return false;
  try {
    return /cemu\.exe/i.test(
      execFileSync('tasklist', ['/FI', 'IMAGENAME eq Cemu.exe', '/NH'], { encoding: 'utf8', timeout: 4000, windowsHide: true }),
    );
  } catch {
    return false;
  }
}
function gpWrite(data, rel, enabled, presets) {
  const file = path.join(data, 'settings.xml');
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
    gpWrite(cemuDataDir(read().cemuPath), pack.id, !!enabled, clean);
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
  const s = read(),
    data = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
  if (!data) return { ok: false, error: 'Cemu’s data folder wasn’t found. Start Cemu once first.' };
  const root = path.join(data, 'graphicPacks'),
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
  const data = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
  let mode = 'not found';
  if (data)
    mode =
      data === path.join(path.dirname(s.cemuPath), 'portable')
        ? 'portable'
        : data === path.dirname(s.cemuPath)
          ? 'next to Cemu.exe'
          : '%APPDATA%\\Cemu';
  let packs = 0,
    ctrl = 0;
  try {
    if (data) packs = findRules(path.join(data, 'graphicPacks')).length;
  } catch {}
  try {
    if (data) ctrl = fs.readdirSync(path.join(data, 'controllerProfiles')).filter(n => /^controller\d\.xml$/i.test(n)).length;
  } catch {}
  let games = 0;
  try {
    games = scan(s.gamesDir).length;
  } catch {}
  return {
    app: app.getVersion(),
    os: (os.version ? os.version() + ' · ' : '') + os.release() + ' · ' + os.arch(),
    cemu: s.cemuPath
      ? (s.cemuVersion || 'unknown version') + (s.cemuManaged ? ' (downloaded by CosmoU)' : ' (chosen manually)')
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

function enableWithPreset(data, tid, rel, presetName) {
  try {
    const pk = gpList(tid, '').packs.find(p => normRel(p.id) === normRel(rel));
    if (!pk) return false;
    const pr = {};
    for (const c of pk.categories) pr[c.name] = c.options.includes(presetName) ? presetName : c.active;
    gpWrite(data, pk.id, true, pr);
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
        : '';
  let tier = 'unknown';
  if (!n) tier = 'unknown';
  else if (/swiftshader|llvmpipe|basic render|microsoft basic/.test(n)) tier = 'low';
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
  const data = s.cemuPath && fs.existsSync(s.cemuPath) ? cemuDataDir(s.cemuPath) : '';
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
const APP_EXT = ['.exe', '.bat', '.cmd', '.lnk'];
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
      format: 'App · ' + path.extname(a.path).slice(1).toUpperCase(),
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
  const ext = path.extname(a.path).toLowerCase();
  if (ext === '.exe') spawn(a.path, splitArgs(a.args), { detached: true, stdio: 'ignore', cwd: path.dirname(a.path) }).unref();
  else shell.openPath(a.path);
  return { ok: true, note: 'app' };
}
ipcMain.handle('appPick', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Choose a program',
    filters: [{ name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk'] }],
    properties: ['openFile'],
  });
  if (r.canceled) return null;
  return { path: r.filePaths[0], name: path.parse(r.filePaths[0]).name };
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
  if (!a || typeof a.path !== 'string' || !fs.existsSync(a.path) || !APP_EXT.includes(path.extname(a.path).toLowerCase()))
    return { ok: false, error: 'Please choose a program (.exe) first.' };
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
