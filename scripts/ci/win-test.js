// CosmoU on Windows: every console with its own look, its emulator, covers and controller moves.
// GitHub Actions builds CosmoU, compiles a tiny stand-in emulator (records how it was started) and runs this.
// usage: node win-test.js <CosmoU.exe> <out folder> <stand-in emulator.exe>     env: PW_PATH = playwright-core
const { _electron } = require(process.env.PW_PATH || 'playwright-core');
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  cp = require('child_process');

const EXE = process.argv[2],
  OUT = path.resolve(process.argv[3] || 'win-out'),
  FAKE = process.argv[4];
const HOME = os.homedir(),
  T = path.join(HOME, 'CosmoU-test'),
  USERDATA = path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'CosmoU');

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + String(results.at(-1).detail).slice(0, 400) : ''));
};
const write = (f, t) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
};
const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await wait(500);
  }
  return false;
}

// every console: a game, the emulator's program name (its rule decides the arguments) and what the emulator must get
const CONSOLES = [
  ['switch', 'Super Mario Odyssey [0100000000010000][v0].nsp', 'eden.exe', 'row', g => ['-f', '-g', g]],
  ['wii', 'Super Mario Galaxy (USA).rvz', 'Dolphin.exe', 'channels', g => ['-b', '-e', g]],
  ['gamecube', 'Super Mario Sunshine (USA).rvz', 'Dolphin.exe', 'discs', g => ['-b', '-e', g]],
  ['3ds', 'Mario Kart 7.3ds', 'azahar.exe', 'dual', g => [g]],
  ['ds', 'New Super Mario Bros. (USA).nds', 'melonDS.exe', 'dual', g => [g]],
  ['n64', 'Super Mario 64 (USA).z64', 'simple64.exe', 'shelf', g => [g]],
  ['snes', 'Super Mario World (USA).sfc', 'snes9x.exe', 'shelf', g => [g]],
  ['nes', 'Super Mario Bros. (World).nes', 'mesen.exe', 'shelf', g => [g]],
  ['gb', 'Super Mario Land (World).gb', 'sameboy.exe', 'shelf', g => [g]],
  ['gba', 'Super Mario Advance (USA).gba', 'mGBA.exe', 'shelf', g => [g]],
  ['vb', 'Mario Clash (USA).vb', 'mednafen.exe', 'shelf', g => [g]],
];

function fixtures() {
  fs.rmSync(T, { recursive: true, force: true });
  const systems = {};
  for (const [k, game, emu] of CONSOLES) {
    const dir = path.join(T, 'Games', k);
    write(path.join(dir, game), 'GAME');
    // the stand-in emulator, under the name of the real one, in its own folder (it writes its arguments next to itself)
    const e = path.join(T, 'Emu', k, emu);
    fs.mkdirSync(path.dirname(e), { recursive: true });
    fs.copyFileSync(FAKE, e);
    systems[k] = { emuPath: e, emuName: path.basename(emu, '.exe'), gamesDir: dir };
  }
  write(path.join(T, 'Games', 'switch', 'Super Mario Odyssey [0100000000010800][v65536].nsp'), 'update');
  write(path.join(USERDATA, 'settings.json'), JSON.stringify({ gamesDir: '', setupDone: true, onlineCovers: false, systems }));
}

// the portable .exe keeps everything in "CosmoU-data" next to itself, and takes over an earlier %APPDATA%\CosmoU once
async function portableTest() {
  const exe = process.env.PORTABLE_EXE;
  if (!exe) return;
  const run = async (dir, until) => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const copy = path.join(dir, path.basename(exe));
    fs.copyFileSync(exe, copy);
    const child = cp.spawn(copy, [], { cwd: dir, stdio: 'ignore', detached: false });
    let got = null;
    await waitFor(() => (got = until()), 60000);
    await wait(3000);
    try {
      cp.execFileSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
    } catch {}
    try {
      cp.execFileSync('taskkill', ['/F', '/IM', 'CosmoU.exe'], { stdio: 'ignore' });
    } catch {}
    await wait(3000);
    return got;
  };
  const A = path.join(T + '-portable', 'Stick A'),
    B = path.join(T + '-portable', 'Stick B');
  fs.rmSync(USERDATA, { recursive: true, force: true });
  const a = await run(A, () => fs.existsSync(path.join(A, 'CosmoU-data')) && fs.readdirSync(path.join(A, 'CosmoU-data')).length > 2 && fs.readdirSync(path.join(A, 'CosmoU-data')));
  ok('portable: everything in CosmoU-data next to the .exe', Array.isArray(a) && a.length > 2, a);
  ok('portable: nothing in %APPDATA%\\CosmoU', !fs.existsSync(USERDATA), fs.existsSync(USERDATA) ? fs.readdirSync(USERDATA) : 'not there');
  // an earlier CosmoU in %APPDATA%: its settings move along, paths into the old folder are corrected
  // (the Cemu path then points into CosmoU-data – or CosmoU downloads Cemu there, since this test has none)
  write(path.join(USERDATA, 'settings.json'), JSON.stringify({ gamesDir: 'C:\\Old\\Games', cemuPath: path.join(USERDATA, 'cemu', 'Cemu.exe') }, null, 2));
  write(path.join(USERDATA, 'covers', 'Old Game.png'), 'png');
  const sf = path.join(B, 'CosmoU-data', 'settings.json');
  const b = await run(B, () => {
    try {
      // read once CosmoU is running (Chromium has written its own files), not while the settings are being copied
      if (!fs.existsSync(path.join(B, 'CosmoU-data', 'Local State'))) return null;
      return JSON.parse(fs.readFileSync(sf, 'utf8'));
    } catch {
      return null;
    }
  });
  ok(
    'portable: takes over the settings from %APPDATA% once',
    b && b.gamesDir === 'C:\\Old\\Games' && String(b.cemuPath).startsWith(path.join(B, 'CosmoU-data') + path.sep) && fs.existsSync(path.join(B, 'CosmoU-data', 'covers', 'Old Game.png')),
    b,
  );
  fs.rmSync(USERDATA, { recursive: true, force: true });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];
  let app;
  try {
    await portableTest();
    fixtures();
    app = await _electron.launch({ executablePath: EXE, env: { ...process.env, COSMOU_DEBUG: '1' }, timeout: 90000 });
    app.process().stderr.on('data', d => log.push(String(d)));
    const w = await app.firstWindow();
    w.on('pageerror', e => ok('no page error', false, e.message));
    await w.setViewportSize({ width: 1100, height: 680 }).catch(() => {});
    await w.waitForTimeout(5000);
    const E = async (fn, arg) => {
      try {
        return await w.evaluate(fn, arg);
      } catch (e) {
        return { thrown: e.message.slice(0, 300) };
      }
    };
    const shot = async n => {
      try {
        await w.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 38 });
      } catch {}
    };
    // the console cards on start: the arrow keys (the D-pad) choose, Enter (A) takes that console
    const cards = await E(() => (document.querySelector('#cpick[open]') ? [...document.querySelectorAll('#cpick .cp-card')].map(b => b.dataset.s) : null));
    ok('console cards on start, one per console', JSON.stringify(cards) === JSON.stringify(CONSOLES.map(c => c[0])), cards);
    await shot('00-consoles');
    for (const k of ['ArrowRight', 'ArrowRight']) {
      await w.keyboard.press(k);
      await w.waitForTimeout(200);
    }
    await shot('00-consoles-moved');
    await w.keyboard.press('Enter');
    await w.waitForTimeout(1500);
    const picked = await E(() => ({ open: !!document.querySelector('#cpick[open]'), sys: curSys, theme: style, lay: $('#sw').dataset.lay }));
    ok('a card takes you to that console (GameCube)', !picked.open && picked.sys === 'gamecube' && picked.theme === 'gamecube' && picked.lay === 'discs', picked);
    await E(() => document.querySelector('#sys button').click());
    await w.waitForTimeout(500);
    const opened = await E(() => !!document.querySelector('#cpick[open]'));
    await w.keyboard.press('Escape');
    await w.waitForTimeout(300);
    const again = await E(() => ({ open: !!document.querySelector('#cpick[open]'), sys: curSys }));
    ok('the console button opens the cards, Escape (B) closes them', opened === true && !again.open && again.sys === 'gamecube', again);
    await E(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    const info = await E(() => ({ p: api.platform, list: api.systemList }));
    ok('Windows', info.p === 'win32', info);
    await E(() => load());
    await w.waitForTimeout(1500);
    const av = await E(() => sysAvail());
    ok('all eleven consoles (no Wii U without Cemu)', JSON.stringify(av) === JSON.stringify(CONSOLES.map(c => c[0])), av);
    const sw = await E(async () => (await api.scan()).filter(g => g.sys).map(g => [g.sys, g.name, g.format]));
    ok('every console’s game found (a Switch update is no game)', Array.isArray(sw) && sw.length === CONSOLES.length && sw.some(g => g[0] === 'switch' && /Update/.test(g[2])), sw);
    await shot('01-start');

    for (const [k, game, emu, lay, want] of CONSOLES) {
      await E(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
      await E(s => setSystem(s), k);
      await w.waitForTimeout(1400);
      const lk = await E(() => ({
        sys: curSys,
        mode,
        theme: style,
        want: SYS[curSys].theme,
        lay: $('#sw').dataset.lay,
        n: list().filter(g => g.kind !== 'app').length,
        sw: $('#sys').hidden ? 'hidden' : $('#sys').textContent,
      }));
      ok(k + ': its home screen, its theme, its games', lk.sys === k && lk.mode === 'chome' && lk.lay === lay && lk.theme === lk.want && lk.n === 1, lk);
      // the keyboard is the controller here: right, down to the round buttons, right, Escape back
      for (const key of ['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight']) {
        await w.keyboard.press(key);
        await w.waitForTimeout(120);
      }
      const z = await E(() => [chZone, chApp]);
      await w.keyboard.press('Escape');
      await w.waitForTimeout(150);
      const z2 = await E(() => chZone);
      ok(k + ': down to the round buttons, Escape (B) back', z[0] === 'apps' && z[1] === 1 && z2 === 'games', [z, z2]);
      await shot('02-' + k);
      // start the game with Enter (A)
      const rec = path.join(T, 'Emu', k, 'started.txt');
      await E(() => {
        chZone = 'games';
        chAll = false;
        sel = list().find(g => g.kind !== 'app').name;
        render();
      });
      await w.waitForTimeout(300);
      await w.keyboard.press('Enter');
      await waitFor(() => fs.existsSync(rec), 15000);
      let a = '';
      try {
        a = fs.readFileSync(rec, 'utf8').trim();
      } catch {}
      const exp = want(path.join(T, 'Games', k, game)).join('\n');
      ok(k + ': Enter (A) starts the game in ' + emu, a === exp, [a, exp]);
      // CosmoU shows that the game runs; back to the library
      await w.waitForTimeout(1500);
      await E(() => typeof endSession === 'function' && endSession());
      await E(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    }

    // covers from the internet: Nintendo's eShop for the Switch, libretro's box art for the others
    await E(() => api.setOnlineCovers(true));
    await E(() => api.scan());
    let arts = null;
    await waitFor(async () => {
      arts = await E(async () => (await api.scan()).filter(g => g.sys).map(g => [g.sys, (g.cover || '').split('/').pop()]));
      return Array.isArray(arts) && arts.filter(x => x[1]).length >= CONSOLES.length;
    }, 150000);
    const have = Array.isArray(arts) ? arts.filter(x => x[1]).map(x => x[0]) : [];
    ok('covers: Switch from the eShop', have.includes('switch'), arts);
    ok('covers: the other consoles from libretro (at least nine of ten)', have.filter(k => k !== 'switch').length >= 9, arts);
    if (!have.includes('switch') || have.length < CONSOLES.length)
      ok('cover log', true, log.join('').split('\n').filter(l => /cover/.test(l)).slice(-20).join('\n'));
    await E(() => load());
    for (const k of ['switch', 'wii', 'gamecube', '3ds', 'n64', 'gba']) {
      await E(s => setSystem(s), k);
      await w.waitForTimeout(1300);
      await shot('03-covers-' + k);
    }
    await app.close().catch(() => {});
  } catch (e) {
    ok('test ran to the end', false, String(e.stack || e).slice(0, 600));
    if (app) await app.close().catch(() => {});
  }
  const errs = log
    .join('')
    .split('\n')
    .filter(l => /error|fatal|crash/i.test(l) && !/gpu|viz|GLES|cert|dxgi|d3d|angle/i.test(l));
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: process.platform, arch: process.arch, results, errs: errs.slice(-30) }, null, 1));
  console.log(results.filter(r => r.pass).length + ' passed, ' + results.filter(r => !r.pass).length + ' failed');
})();
