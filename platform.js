// CosmoU – everything that differs between Windows, Linux and macOS (main process only).
// Cemu's folders, finding Cemu, checking running programs, Steam, and how programs are started.
const fs = require('fs'),
  path = require('path'),
  os = require('os');

const IS_WIN = process.platform === 'win32',
  IS_LINUX = process.platform === 'linux',
  IS_MAC = process.platform === 'darwin';
const HOME = os.homedir();
const xdg = (v, d) => (process.env[v] && path.isAbsolute(process.env[v]) ? process.env[v] : path.join(HOME, d));
const exists = p => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

// ---------- Cemu's folders ----------
// Cemu splits its files into a config folder (settings.xml, controllerProfiles) and a data folder
// (graphicPacks, mlc01, keys.txt). On Windows and macOS both are the same folder; on Linux they follow XDG.
// Graphic pack paths in settings.xml are relative to the data folder.
const FLATPAK_ID = 'info.cemu.Cemu';
const isFlatpak = exe => IS_LINUX && /(^|[\\/])info\.cemu\.Cemu$/.test(String(exe || ''));
function cemuDirs(exe) {
  if (!exe) return null;
  const dir = path.dirname(exe),
    has = d => exists(path.join(d, 'settings.xml'));
  if (IS_WIN) {
    // portable folder, next to Cemu.exe (installs older than 2.0-89), or %APPDATA%\Cemu
    const portable = path.join(dir, 'portable'),
      roaming = path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'Cemu');
    const hit = [
      [portable, 'portable'],
      [dir, 'next to Cemu.exe'],
      [roaming, '%APPDATA%\\Cemu'],
    ].find(([d]) => has(d));
    return hit ? { config: hit[0], data: hit[0], mode: hit[1] } : null;
  }
  if (IS_MAC) {
    // a "portable" folder next to Cemu.app, otherwise ~/Library/Application Support/Cemu
    const bundle = appBundleOf(exe),
      portable = bundle ? path.join(path.dirname(bundle), 'portable') : path.join(dir, 'portable'),
      lib = path.join(HOME, 'Library', 'Application Support', 'Cemu');
    if (has(portable)) return { config: portable, data: portable, mode: 'portable' };
    return has(lib) ? { config: lib, data: lib, mode: '~/Library/Application Support/Cemu' } : null;
  }
  // Linux: a "portable" folder next to the program (or next to the AppImage file) wins
  const portable = path.join(dir, 'portable');
  if (has(portable)) return { config: portable, data: portable, mode: 'portable' };
  if (isFlatpak(exe)) {
    const root = path.join(HOME, '.var', 'app', FLATPAK_ID),
      d = { config: path.join(root, 'config', 'Cemu'), data: path.join(root, 'data', 'Cemu'), mode: 'Flatpak' };
    return has(d.config) ? d : null;
  }
  const d = {
    config: path.join(xdg('XDG_CONFIG_HOME', '.config'), 'Cemu'),
    data: path.join(xdg('XDG_DATA_HOME', path.join('.local', 'share')), 'Cemu'),
    mode: '~/.config/Cemu',
  };
  return has(d.config) ? d : null;
}

// ---------- finding Cemu ----------
// Linux: Cemu can be an AppImage, a Flatpak, a distro package or a downloaded build.
function findCemuLinux() {
  if (!IS_LINUX) return '';
  const tries = [];
  const pathDirs = String(process.env.PATH || '')
    .split(':')
    .filter(Boolean);
  for (const d of pathDirs) for (const n of ['cemu', 'Cemu']) tries.push(path.join(d, n));
  for (const d of ['/var/lib/flatpak/exports/bin', path.join(HOME, '.local', 'share', 'flatpak', 'exports', 'bin')])
    tries.push(path.join(d, FLATPAK_ID));
  for (const d of [
    path.join(HOME, 'Applications'),
    path.join(HOME, 'Apps'),
    path.join(HOME, '.local', 'bin'),
    path.join(HOME, 'Downloads'),
    HOME,
  ])
    try {
      for (const f of fs.readdirSync(d).sort().reverse()) if (/^cemu.*\.appimage$/i.test(f)) tries.push(path.join(d, f));
    } catch {}
  return tries.find(p => isProgram(p)) || '';
}
// macOS: Cemu.app in /Applications or ~/Applications (also Homebrew installs it there)
function findCemuMac() {
  if (!IS_MAC) return '';
  for (const d of ['/Applications', path.join(HOME, 'Applications'), path.join(HOME, 'Downloads'), path.join(HOME, 'Desktop')])
    try {
      const apps = fs
        .readdirSync(d)
        .filter(f => /^cemu.*\.app$/i.test(f))
        .sort((a, b) => (a.toLowerCase() === 'cemu.app' ? -1 : b.toLowerCase() === 'cemu.app' ? 1 : 0));
      for (const a of apps) {
        const exe = bundleExe(path.join(d, a));
        if (exe) return exe;
      }
    } catch {}
  return '';
}
const findCemu = () => (IS_LINUX ? findCemuLinux() : IS_MAC ? findCemuMac() : '');
// macOS apps are folders (Something.app); the program itself is Contents/MacOS/<name>
function appBundleOf(p) {
  if (!IS_MAC || !p) return '';
  const m = String(p).match(/^(.*?\.app)(\/|$)/i);
  return m && exists(path.join(m[1], 'Contents')) ? m[1] : '';
}
function bundleExe(app) {
  const dir = path.join(app, 'Contents', 'MacOS');
  let name = '';
  try {
    const plist = fs.readFileSync(path.join(app, 'Contents', 'Info.plist'), 'utf8');
    const m = plist.match(/<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/);
    if (m) name = m[1].trim();
  } catch {}
  const tries = [name, path.basename(app, path.extname(app))].filter(Boolean);
  try {
    for (const f of fs.readdirSync(dir)) if (!tries.includes(f)) tries.push(f);
  } catch {}
  for (const n of tries) {
    const f = path.join(dir, n);
    if (isProgram(f)) return f;
  }
  return '';
}
// what the user picked (a program, or on macOS an .app) → the program CosmoU starts
function programOf(p) {
  if (IS_MAC && /\.app\/?$/i.test(p)) return bundleExe(p.replace(/\/$/, ''));
  return p;
}
// how to start Cemu: on macOS through "open", so the app comes to the front and macOS can offer Rosetta when needed;
// -W waits until Cemu is closed (CosmoU counts the play time), -n starts a new Cemu even if one is open
function launchCommand(exe, args) {
  const bundle = appBundleOf(exe);
  if (IS_MAC && bundle) return ['open', ['-W', '-n', '-a', bundle, '--args', ...args]];
  return [exe, args];
}
// a file that can be started: executable bit on Linux and macOS, .exe on Windows
function isProgram(p) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile()) return false;
    if (IS_WIN) return /\.exe$/i.test(p);
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
function makeRunnable(p) {
  if (IS_WIN) return;
  try {
    const m = fs.statSync(p).mode;
    if (!(m & 0o100)) fs.chmodSync(p, m | 0o755);
  } catch {}
}
// Environment for programs CosmoU starts (Cemu, other apps).
// AppImages need FUSE; without it they can still run by unpacking themselves first.
function childEnv(exe) {
  const env = { ...process.env };
  if (IS_LINUX && /\.appimage$/i.test(exe)) {
    const fuse = exists('/dev/fuse') && pathDirsHave(['fusermount', 'fusermount3']);
    if (!fuse) env.APPIMAGE_EXTRACT_AND_RUN = '1';
  }
  // CosmoU's own AppImage variables must not reach Cemu: with APPIMAGE set, Cemu would look for its
  // "portable" folder next to CosmoU, and CosmoU's libraries could clash with Cemu's
  if (IS_LINUX) {
    const appdir = env.APPDIR;
    for (const k of ['APPDIR', 'APPIMAGE', 'ARGV0', 'OWD']) delete env[k];
    for (const k of ['LD_LIBRARY_PATH', 'LD_PRELOAD'])
      if (appdir && env[k] && env[k].includes(appdir))
        env[k] = env[k]
          .split(':')
          .filter(p => p && !p.startsWith(appdir))
          .join(':');
  }
  return env;
}
function pathDirsHave(names) {
  for (const d of String(process.env.PATH || '/usr/bin:/bin').split(':'))
    for (const n of names) if (d && exists(path.join(d, n))) return true;
  return exists('/usr/bin/fusermount') || exists('/bin/fusermount');
}

// ---------- running programs ----------
// Linux: look at /proc/<pid>/comm (the program name, 15 characters at most); macOS: ask ps
function procNames() {
  const out = [];
  if (IS_MAC) {
    try {
      const txt = require('child_process').execFileSync('ps', ['-A', '-o', 'comm='], { encoding: 'utf8', timeout: 4000 });
      for (const l of txt.split('\n')) if (l.trim()) out.push(path.basename(l.trim()));
    } catch {}
    return out;
  }
  try {
    for (const d of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(d)) continue;
      try {
        out.push(fs.readFileSync(path.join('/proc', d, 'comm'), 'utf8').trim());
      } catch {}
    }
  } catch {}
  return out;
}
function running(winImage, linuxRe) {
  if (IS_WIN) {
    try {
      return new RegExp(winImage.replace('.', '\\.'), 'i').test(
        require('child_process').execFileSync('tasklist', ['/FI', 'IMAGENAME eq ' + winImage, '/NH'], {
          encoding: 'utf8',
          timeout: 4000,
          windowsHide: true,
        }),
      );
    } catch {
      return false;
    }
  }
  if (IS_LINUX || IS_MAC) return procNames().some(n => linuxRe.test(n));
  return false;
}
const cemuRunning = () => running('Cemu.exe', /^cemu$/i);
const steamRunning = () => running('steam.exe', IS_MAC ? /^steam_osx$/ : /^steam$/);

// ---------- Steam ----------
const STEAM_FLATPAK = path.join(HOME, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam');
function steamRootLinux() {
  const tries = IS_MAC
    ? [path.join(HOME, 'Library', 'Application Support', 'Steam')]
    : [path.join(HOME, '.steam', 'steam'), path.join(HOME, '.local', 'share', 'Steam'), path.join(HOME, '.steam', 'root'), STEAM_FLATPAK];
  for (const p of tries) {
    if (!exists(path.join(p, 'userdata'))) continue;
    try {
      return fs.realpathSync(p);
    } catch {
      return p;
    }
  }
  return '';
}
// the command that controls Steam (shut down / start again)
function steamCommand(root, args) {
  if (IS_WIN) return [path.join(root, 'steam.exe'), args];
  // macOS: Steam is an app; steam://exit closes it, "open -a Steam" starts it again
  if (IS_MAC)
    return args.includes('-shutdown') ? ['open', ['steam://exit']] : ['open', ['-a', 'Steam', ...(args.length ? ['--args', ...args] : [])]];
  if (root && path.resolve(root) === path.resolve(STEAM_FLATPAK)) return ['flatpak', ['run', 'com.valvesoftware.Steam', ...args]];
  return ['steam', args];
}

// ---------- other apps in the library ----------
const APP_EXT_WIN = ['.exe', '.bat', '.cmd', '.lnk'];
const APP_EXT_LINUX = ['.appimage', '.sh', '.desktop', '.x86_64', '.run', ''];
function appOk(p) {
  if (!p || !exists(p)) return false;
  const ext = path.extname(p).toLowerCase();
  if (IS_WIN) return APP_EXT_WIN.includes(ext);
  if (IS_MAC && (ext === '.app' || ext === '.command')) return true;
  return ext === '.sh' || ext === '.desktop' || isProgram(p) || /\.appimage$/i.test(p);
}
// how to start an app: [command, args] (null = let the system open it)
function appCommand(p, args) {
  const ext = path.extname(p).toLowerCase();
  if (IS_WIN) return ext === '.exe' ? [p, args] : null;
  if (IS_MAC && ext === '.app') return ['open', ['-W', '-n', '-a', p, ...(args.length ? ['--args', ...args] : [])]];
  if (ext === '.sh' || ext === '.command') return ['sh', [p, ...args]];
  if (ext === '.desktop') return ['gio', ['launch', p, ...args]];
  makeRunnable(p);
  return [p, args];
}

// ---------- system name for bug reports ----------
function osName() {
  if (IS_LINUX) {
    let name = 'Linux';
    try {
      const m = fs.readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (m) name = m[1];
    } catch {}
    const desk = process.env.XDG_CURRENT_DESKTOP || '',
      sess = process.env.XDG_SESSION_TYPE || '';
    return [name, 'kernel ' + os.release(), [desk, sess].filter(Boolean).join(' / '), os.arch()].filter(Boolean).join(' · ');
  }
  if (IS_MAC) {
    let v = '';
    try {
      v = require('child_process').execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8', timeout: 3000 }).trim();
    } catch {}
    const cpu = os.cpus()[0];
    return ['macOS ' + (v || os.release()), cpu && /apple/i.test(cpu.model) ? cpu.model.trim() : '', os.arch()].filter(Boolean).join(' · ');
  }
  return (os.version ? os.version() + ' · ' : '') + os.release() + ' · ' + os.arch();
}

// the CosmoU program that Steam should start: the AppImage file, the portable exe or the installed program
// (on macOS the program inside CosmoU.app, so Steam can pass the game to it)
function selfExe() {
  return process.env.APPIMAGE || process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

module.exports = {
  IS_WIN,
  IS_LINUX,
  IS_MAC,
  findCemu,
  findCemuMac,
  appBundleOf,
  bundleExe,
  programOf,
  launchCommand,
  cemuDirs,
  isFlatpak,
  findCemuLinux,
  isProgram,
  makeRunnable,
  childEnv,
  cemuRunning,
  steamRunning,
  steamRootLinux,
  steamCommand,
  appOk,
  appCommand,
  osName,
  selfExe,
};
