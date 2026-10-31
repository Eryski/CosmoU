// CosmoU end-to-end check on a real computer, used by GitHub Actions after a build (macOS and Linux).
// It sets up a fake Cemu folder, games, a Steam folder and an app, starts the packaged CosmoU and uses it
// through the same API the window uses. Results and screenshots go to OUT (results.json + *.png).
// usage: node e2e.js <CosmoU program> <out folder>     env: PW_PATH = playwright-core, CEMU_DOWNLOAD=1
const { _electron } = require(process.env.PW_PATH || 'playwright-core');
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  cp = require('child_process');

const EXE = process.argv[2],
  OUT = path.resolve(process.argv[3] || 'e2e-out');
const MAC = process.platform === 'darwin',
  HOME = os.homedir();
const CEMU_CFG = MAC ? path.join(HOME, 'Library', 'Application Support', 'Cemu') : path.join(HOME, '.config', 'Cemu');
const CEMU_DATA = MAC ? CEMU_CFG : path.join(HOME, '.local', 'share', 'Cemu');
const USERDATA = MAC ? path.join(HOME, 'Library', 'Application Support', 'CosmoU') : path.join(HOME, '.config', 'CosmoU');
const STEAM = MAC ? path.join(HOME, 'Library', 'Application Support', 'Steam') : path.join(HOME, '.local', 'share', 'Steam');
const GAMES = path.join(HOME, 'CosmoU-test', 'Games');
const BOTW = '00050000101c9500';

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + String(results.at(-1).detail).slice(0, 400) : ''));
};
const sh = (c, a) => {
  try {
    return cp.execFileSync(c, a, { encoding: 'utf8', timeout: 20000 }).trim();
  } catch (e) {
    return (
      'ERR ' +
      String(e.stderr || e.message)
        .trim()
        .slice(0, 300)
    );
  }
};
const procs = () =>
  MAC
    ? sh('ps', ['-A', '-o', 'comm='])
        .split('\n')
        .map(l => path.basename(l.trim()))
    : sh('ps', ['-A', '-o', 'comm=']).split('\n');
const write = (f, t) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, t);
};

function fixtures() {
  write(
    path.join(CEMU_CFG, 'settings.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<content>
	<logflag>0</logflag>
	<mlc_path></mlc_path>
	<GamePaths />
	<GraphicPack />
	<Graphic>
		<api>1</api>
		<device>00000000000000000000000000000000</device>
		<VSync>0</VSync>
		<AsyncCompile>false</AsyncCompile>
		<UpscaleFilter>1</UpscaleFilter>
		<DownscaleFilter>0</DownscaleFilter>
		<FullscreenScaling>0</FullscreenScaling>
		<Overlay>
			<Position>1</Position>
			<TextScale>100</TextScale>
			<FPS>true</FPS>
		</Overlay>
	</Graphic>
	<Audio>
		<TVVolume>50</TVVolume>
	</Audio>
</content>
`,
  );
  write(
    path.join(CEMU_CFG, 'controllerProfiles', 'controller0.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<emulated_controller>
	<type>Wii U GamePad</type>
	<toggle_display>0</toggle_display>
	<controller>
		<api>SDLController</api>
		<uuid>0_030000005e0400008e02000010010000</uuid>
		<display_name>Xbox Wireless Controller</display_name>
		<axis><deadzone>0.25</deadzone><range>1</range></axis>
		<mappings>
			<entry><mapping>1</mapping><button>1</button></entry>
		</mappings>
	</controller>
</emulated_controller>
`,
  );
  const gp = path.join(CEMU_DATA, 'graphicPacks', 'downloadedGraphicPacks', 'BreathOfTheWild');
  write(
    path.join(gp, 'Graphics', 'rules.txt'),
    `[Definition]
titleIds = 00050000101C9300,00050000101C9400,00050000101C9500
name = Graphics
path = "The Legend of Zelda: Breath of the Wild/Graphics"
description = Changes the resolution.
version = 7

[Preset]
category = Resolution
name = 1280x720 (Default)
default = 1

[Preset]
category = Resolution
name = 1920x1080

[Preset]
category = Resolution
name = 2560x1440
`,
  );
  write(
    path.join(gp, 'Mods', 'FPS++', 'rules.txt'),
    `[Definition]
titleIds = 00050000101C9300,00050000101C9400,00050000101C9500
name = FPS++
path = "The Legend of Zelda: Breath of the Wild/Mods/FPS++"
description = Unlocks the frame rate.
version = 7
[Preset]
category = FPS Limit
name = 60FPS (ideal for 240/120/60Hz displays)
default = 1
[Preset]
category = FPS Limit
name = 30FPS (ideal for 240/120/60/30Hz displays)
`,
  );
  write(path.join(CEMU_DATA, 'mlc01', 'usr', 'save', '00050000', '101c9500', 'user', '80000001', 'game_data.sav'), 'savegame');
  write(path.join(GAMES, 'BOTW', 'code', 'U-King.rpx'), '');
  write(
    path.join(GAMES, 'BOTW', 'meta', 'meta.xml'),
    '<menu><title_id type="hexBinary" length="8">00050000101C9500</title_id><longname_en>The Legend of Zelda\nBreath of the Wild</longname_en><product_code>WUP-P-ALZP</product_code><company_code>0001</company_code></menu>',
  );
  // upper-case folder names (case-sensitive file systems)
  write(path.join(GAMES, 'Splatoon [0005000010176a00]', 'Code', 'Gambit.rpx'), '');
  write(
    path.join(GAMES, 'Splatoon [0005000010176a00]', 'Meta', 'meta.xml'),
    '<menu><title_id type="hexBinary" length="8">0005000010176A00</title_id><longname_en>Splatoon</longname_en><product_code>WUP-P-AGMP</product_code><company_code>0001</company_code></menu>',
  );
  write(
    path.join(STEAM, 'config', 'loginusers.vdf'),
    '"users"\n{\n\t"76561197960389184"\n\t{\n\t\t"AccountName"\t\t"tester"\n\t\t"PersonaName"\t\t"Tester"\n\t\t"MostRecent"\t\t"1"\n\t}\n}\n',
  );
  fs.mkdirSync(path.join(STEAM, 'userdata', '123456', 'config'), { recursive: true });
  write(path.join(HOME, 'CosmoU-test', 'Apps', 'hello.sh'), '#!/bin/sh\necho hi > "$HOME/CosmoU-test/app-started.txt"\n');
  // Switch: games (with an update and a DLC that are no games of their own) and a stand-in emulator named like Eden
  const SW = path.join(HOME, 'CosmoU-test', 'Switch');
  write(path.join(SW, 'Super Mario Odyssey [0100000000010000][v0].nsp'), 'NSP');
  write(path.join(SW, 'Super Mario Odyssey [0100000000010800][v65536].nsp'), 'NSP update');
  write(path.join(SW, 'Super Mario Odyssey Costume [0100000000011001].nsp'), 'NSP dlc');
  write(path.join(SW, 'Dread', 'Metroid Dread.xci'), 'XCI');
  write(path.join(SW, 'readme.txt'), 'notes');
  write(path.join(HOME, 'CosmoU-test', 'Emu', 'eden.sh'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$HOME/CosmoU-test/switch-started.txt"\n');
  // Nintendo 64 (any emulator: the game file) and Wii (Dolphin: -b -e <game>)
  write(path.join(HOME, 'CosmoU-test', 'N64', 'Super Mario 64 (USA).z64'), 'N64');
  write(path.join(HOME, 'CosmoU-test', 'N64', 'Mario Kart 64.z64'), 'N64');
  write(path.join(HOME, 'CosmoU-test', 'Wii', 'Super Mario Galaxy (USA).rvz'), 'RVZ');
  write(path.join(HOME, 'CosmoU-test', 'Emu', 'mupen.sh'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$HOME/CosmoU-test/n64-started.txt"\n');
  write(path.join(HOME, 'CosmoU-test', 'Emu', 'dolphin.sh'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$HOME/CosmoU-test/wii-started.txt"\n');
  write(
    path.join(USERDATA, 'settings.json'),
    JSON.stringify({
      gamesDir: GAMES,
      setupDone: true,
      onlineCovers: false,
      systems: {
        switch: { emuPath: path.join(HOME, 'CosmoU-test', 'Emu', 'eden.sh'), emuName: 'eden', gamesDir: SW },
        n64: { emuPath: path.join(HOME, 'CosmoU-test', 'Emu', 'mupen.sh'), emuName: 'mupen', gamesDir: path.join(HOME, 'CosmoU-test', 'N64') },
        wii: { emuPath: path.join(HOME, 'CosmoU-test', 'Emu', 'dolphin.sh'), emuName: 'dolphin', gamesDir: path.join(HOME, 'CosmoU-test', 'Wii') },
      },
    }),
  );
}

const wait = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await wait(500);
  }
  return false;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fixtures();
  const log = [];
  const app = await _electron.launch({
    executablePath: EXE,
    args: [...(MAC ? [] : ['--no-sandbox']), ...(process.env.E2E_APP ? [process.env.E2E_APP] : [])],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1', COSMOU_DEBUG: '1' },
    timeout: 60000,
  });
  app.process().stderr.on('data', d => log.push(String(d)));
  const w = await app.firstWindow();
  w.on('pageerror', e => ok('no page error', false, e.message));
  await w.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
  await w.waitForTimeout(4000);
  const E = async (fn, arg) => {
    try {
      return await w.evaluate(fn, arg);
    } catch (e) {
      return { thrown: e.message.slice(0, 300) };
    }
  };
  const shot = async name => {
    await w.waitForTimeout(900);
    await w.screenshot({ path: path.join(OUT, name + '.png') });
  };
  // with several consoles CosmoU starts with the console cards (not while it is setting up Cemu)
  const cards = await E(() =>
    document.querySelector('#cpick[open]') ? [...document.querySelectorAll('#cpick .cp-card')].map(b => b.dataset.s) : $('#setup').classList.contains('on') ? 'setup' : null,
  );
  ok('console cards on start', JSON.stringify(cards) === '["wiiu","switch","wii","n64"]' || cards === 'setup', cards);
  if (Array.isArray(cards)) await shot('00-consoles');
  await E(() => document.querySelector('#cpick') && document.querySelector('#cpick').close());

  const info = await E(() => ({
    p: api.platform,
    v: api.appVersion,
    html: document.documentElement.className,
    mac: IS_MAC,
    cemuFile: CEMU_FILE,
  }));
  ok('platform', info.p === process.platform && (!MAC || (info.mac && info.cemuFile === 'Cemu.app')), info);
  await shot('01-start');

  // ---- Cemu: download the real one from GitHub ----
  if (process.env.CEMU_DOWNLOAD) {
    // CosmoU may already have started the download on its own (first start without Cemu)
    const before = await E(() => api.cemuStatus());
    ok('Cemu status before', true, before);
    const t = Date.now();
    const r = await E(() => api.cemuInstall());
    ok('Cemu download and set up', r && r.ok, { r, sec: Math.round((Date.now() - t) / 1000) });
    const st = await E(() => api.cemuStatus());
    ok('Cemu installed', st.installed && st.managed && (!MAC || /Cemu\.app\/Contents\/MacOS\/[^/]+$/.test(st.path)), st);
    if (st.path) {
      ok('Cemu program architectures', true, MAC ? sh('lipo', ['-archs', st.path]) : sh('file', [st.path]));
      if (MAC) {
        const bundle = st.path.replace(/\/Contents\/MacOS\/[^/]+$/, '');
        const q = sh('xattr', ['-p', 'com.apple.quarantine', bundle]);
        ok('Cemu.app has no quarantine flag', /^ERR/.test(q), q);
        // the official Cemu.app signs only its program, so check that one
        ok(
          'Cemu program is signed (own or ad-hoc)',
          !/^ERR/.test(sh('codesign', ['--verify', st.path])),
          sh('codesign', ['--verify', st.path]),
        );
        ok('no leftover .dmg mount', !/cosmou-cemu-/.test(sh('hdiutil', ['info'])), '');
      }
    }
  } else {
    const st = await E(() => api.cemuStatus());
    ok('Cemu found automatically', st.installed, st);
  }
  const cfg = await E(() => api.getSettings());
  ok('settings', !!cfg.cemuPath, { cemuPath: cfg.cemuPath, version: cfg.cemuVersion, found: cfg.cemuFound });

  // ---- library and Cemu's own files ----
  const scan = await E(async () => (await api.scan()).map(g => [g.name, g.tid, g.format]));
  ok('scan finds both games', Array.isArray(scan) && scan.length >= 2 && scan.some(g => g[1] === '0005000010176a00'), scan);
  const cs = await E(() => api.cemuSettingsGet());
  ok('Cemu settings.xml found', cs.found, cs.current);
  const ov = await E(async () => (await api.setCemuSetting('vsync', 1)).overrides);
  ok('global setting saved', ov && ov.vsync === 1, ov);
  const gl = await E(id => api.gpList(id, 'BOTW'), BOTW);
  ok('graphic packs listed', gl.found && gl.total >= 2, gl.packs && gl.packs.map(p => p.name));
  const fps = gl.packs && gl.packs.find(p => /FPS/.test(p.name));
  const gs = fps && (await E(([id, pid]) => api.gpSet(id, 'BOTW', pid, true, {}), [BOTW, fps.id]));
  const xml = fs.readFileSync(path.join(CEMU_CFG, 'settings.xml'), 'utf8');
  ok(
    'FPS++ switched on in settings.xml',
    gs && !gs.error && /FPS\+\+\/rules\.txt/.test(xml),
    gs && (gs.error || gs.packs.filter(p => p.enabled).map(p => p.id)),
  );
  const inp = await E(() => api.inputGet(0));
  ok('controller API list', inp.found && inp.apis.includes('SDLController') && !inp.apis.includes('XInput'), inp.apis);
  const sv = await E(id => api.savesBackup(id, 'BOTW'), BOTW);
  ok('save backup', sv && sv.ok, sv);
  const fb = await E(() => api.feedbackInfo());
  ok('feedback info', MAC ? /^macOS \d/.test(fb.os) : /linux|ubuntu/i.test(fb.os), fb);

  // ---- screens ----
  await E(() => openSettings('general'));
  await shot('02-settings-cemu');
  await E(() => openSettings('graphics'));
  await shot('03-settings-graphics');
  const apis = await E(() => {
    const row = [...document.querySelectorAll('#dlg .set')].find(e => /Graphics API/.test(e.textContent));
    return row ? [...row.querySelectorAll('button')].map(b => b.textContent.trim()) : 'not found';
  });
  ok('graphics API choices', Array.isArray(apis) && apis.includes('Vulkan') && (!MAC || !apis.includes('OpenGL')), apis);
  await E(() => openSettings('about'));
  await shot('04-settings-about');
  await E(() => {
    $('#dlg').close();
    openFeedback();
  });
  await shot('05-feedback');
  await E(() => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    openMapper(0);
  });
  await shot('06-mapper');
  const dev = await E(() => [...document.querySelectorAll('#mpdev option')].map(o => o.value + '=' + o.textContent));
  ok('mapper devices', Array.isArray(dev) && dev.some(d => d.startsWith('kb=')) && !dev.some(d => d.startsWith('xi:')), dev);
  await E(() => {
    $('#mpdev').value = 'kb';
    $('#mpdev').dispatchEvent(new Event('change'));
  });
  const keys = await E(() =>
    Object.entries(mp.maps)
      .slice(0, 8)
      .map(([k, v]) => k + ':' + v + '=' + keyName(v)),
  );
  ok('keyboard defaults', Array.isArray(keys) && keys.length > 4, keys);
  if (MAC) {
    const mk = await E(() =>
      [
        ['KeyA', 'a'],
        ['KeyK', 'k'],
        ['Enter', 'Enter'],
        ['ArrowUp', 'ArrowUp'],
        ['ShiftLeft', 'Shift'],
        ['MetaLeft', 'Meta'],
        ['Digit1', '1'],
      ].map(([code, key]) => [code, macOf({ code, key, keyCode: 0 }), macName(macOf({ code, key, keyCode: 0 }))]),
    );
    ok('Mac key codes', JSON.stringify(mk.map(x => x[1])) === '[0,40,36,126,56,55,18]', mk);
  }
  await E(() => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    openWizard();
    wz.step = 1;
    wzRender();
  });
  await shot('07-wizard');
  await E(() => closeWizard());
  await w.waitForTimeout(600);
  await E(() => setView && setView('grid'));
  await shot('08-grid');

  // ---- play a game: Cemu starts (the game file is empty, so Cemu shows an error, but it runs) ----
  const g = await E(async () => (await api.scan()).find(x => /Zelda/.test(x.name)));
  const pl = await E(gg => api.play({ path: gg.path, tid: gg.tid, key: gg.tid, name: gg.name }), g);
  ok('play starts', pl && pl.ok, pl);
  const up = await waitFor(() => procs().some(n => /^cemu$/i.test(n)), 45000);
  ok(
    'Cemu is running',
    up,
    procs().filter(n => /cemu|rosetta|oah/i.test(n)),
  );
  if (up) {
    const busy = await E(([id, pid]) => api.gpSet(id, 'BOTW', pid, false, {}).then(r => r.error || 'no error'), [BOTW, fps && fps.id]);
    ok('graphic packs locked while Cemu runs', /close Cemu/i.test(busy), busy);
    await shot('09-playing');
    // the whole screen, to see Cemu's own window
    if (MAC) {
      await wait(6000);
      sh('screencapture', ['-x', path.join(OUT, '11-screen.png')]);
    }
    sh('pkill', ['-x', 'Cemu']);
    sh('pkill', ['-x', 'cemu']);
    ok('Cemu closed again', await waitFor(() => !procs().some(n => /^cemu$/i.test(n)), 15000), '');
  }

  // ---- other apps ----
  if (MAC) {
    const calc = ['/System/Applications/Calculator.app', '/Applications/Calculator.app'].find(f => fs.existsSync(f));
    const a = await E(p => api.appSave({ path: p, name: 'Calculator' }), calc);
    ok('add a Mac app', a && a.ok, a);
    const r = a && a.ok ? await E(id => api.play({ appId: id, name: 'Calculator' }), a.id) : null;
    ok('start a Mac app', r && r.ok && (await waitFor(() => procs().includes('Calculator'), 20000)), r);
    sh('pkill', ['-x', 'Calculator']);
  }
  const hello = path.join(HOME, 'CosmoU-test', 'Apps', 'hello.sh');
  const a2 = await E(p => api.appSave({ path: p, name: 'Hello' }), hello);
  ok('add a .sh script', a2 && a2.ok, a2);
  if (a2 && a2.ok) await E(id => api.play({ appId: id, name: 'Hello' }), a2.id);
  ok('script ran', await waitFor(() => fs.existsSync(path.join(HOME, 'CosmoU-test', 'app-started.txt')), 10000), '');
  const bad = await E(p => api.appSave({ path: p, name: 'x' }), path.join(GAMES, 'BOTW', 'meta', 'meta.xml'));
  ok('a text file is refused', bad && !bad.ok, bad);

  // ---- Steam ----
  const si = await E(() => api.steamInfo(''));
  ok('Steam found', si.found && si.users.length === 1, si);
  const gg = await E(async () => (await api.scan()).find(x => /Zelda/.test(x.name)));
  const sa = await E(
    x => api.steamAdd({ user: '', items: [{ kind: 'cosmou' }, { kind: 'game', name: x.name, path: x.path }], art: true }),
    gg,
  );
  let vdf = '';
  try {
    vdf = fs
      .readFileSync(path.join(STEAM, 'userdata', '123456', 'config', 'shortcuts.vdf'))
      .toString('latin1')
      .replace(/[\x00-\x08]/g, '|');
  } catch {}
  ok('Steam shortcuts written', sa && sa.ok && /CosmoU/.test(vdf), { sa, vdf: vdf.slice(0, 500) });

  // ---- Switch: its own emulator, its games, its own look ----
  const sw = await E(async () => (await api.scan()).filter(g => g.sys === 'switch').map(g => [g.name, g.tid, g.format]));
  ok(
    'Switch games found (updates and DLC are not games)',
    Array.isArray(sw) && sw.length === 2 && sw.some(g => g[0] === 'Super Mario Odyssey' && /Update/.test(g[2])) && sw.some(g => g[0] === 'Metroid Dread'),
    sw,
  );
  await E(() => load());
  const sys = await E(() => sysAvail());
  ok('four consoles: Wii U, Switch, Wii and N64', JSON.stringify(sys) === '["wiiu","switch","wii","n64"]', sys);
  await E(() => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    setSystem('switch');
  });
  await w.waitForTimeout(2000);
  const look = await E(() => ({
    sys: curSys,
    mode,
    theme: style,
    tiles: document.querySelectorAll('#swrow .sw-t').length,
    wiiuLook: !$('#wu').hidden,
    shown: list().map(g => g.name),
    brand: $('.brand small').textContent,
  }));
  ok(
    'Switch look: Switch Home, Switch theme, only Switch games',
    look.sys === 'switch' &&
      look.mode === 'chome' &&
      look.theme === 'switch' &&
      look.tiles === Math.min(12, look.shown.length) + 1 &&
      !look.wiiuLook &&
      look.shown.includes('Metroid Dread') &&
      !look.shown.some(n => /Zelda|Splatoon/.test(n)),
    look,
  );
  await shot('11-switch-home');
  const sp = await E(async () => {
    const g = list().find(x => x.sys === 'switch' && /Odyssey/.test(x.name));
    return api.play({ path: g.path, name: g.name, sys: 'switch' });
  });
  const started = path.join(HOME, 'CosmoU-test', 'switch-started.txt');
  await waitFor(() => fs.existsSync(started), 10000);
  let swArgs = '';
  try {
    swArgs = fs.readFileSync(started, 'utf8');
  } catch {}
  ok('a Switch game starts in its emulator (Eden: -f -g <game>)', sp && sp.ok && /^-f\n-g\n.*Odyssey \[0100000000010000\]/.test(swArgs), [sp, swArgs]);
  await E(() => openDetail(list().find(x => x.sys === 'switch')));
  await w.waitForTimeout(800);
  const det = await E(() => ({ kind: $('#df').textContent, packs: $('#dgp').hidden, saves: $('#dsv').hidden }));
  ok('Switch details: no Cemu tools', det.kind === 'Switch game' && det.packs && det.saves, det);
  await shot('12-switch-details');
  await E(() => {
    $('#det').close();
    setSystem('wiiu');
  });
  await w.waitForTimeout(1500);
  const back = await E(() => ({ sys: curSys, mode, n: list().filter(g => g.kind !== 'app').length }));
  ok('back to Wii U', back.sys === 'wiiu' && back.mode !== 'chome' && back.n >= 2, back);

  // ---- every console its own look: Wii channels, N64 cartridges; games start in their emulator ----
  for (const [k, lay, cls, emuOut, want] of [
    ['wii', 'channels', '.wch', 'wii-started.txt', /^-b\n-e\n.*Super Mario Galaxy \(USA\)\.rvz/],
    ['n64', 'shelf', '.cart', 'n64-started.txt', /^.*Super Mario 64 \(USA\)\.z64\n$/],
  ]) {
    await E(s => setSystem(s), k);
    await w.waitForTimeout(1800);
    const lk = await E(() => ({ sys: curSys, mode, theme: style, want: SYS[curSys].theme, lay: $('#sw').dataset.lay, n: document.querySelectorAll('#swrow > *').length }));
    ok(k + ': its own home screen and theme', lk.sys === k && lk.mode === 'chome' && lk.lay === lay && lk.theme === lk.want, lk);
    // controller-style moves: right, then down to the round buttons and back up
    await E(() => {
      chNav('r');
      chNav('d');
      chNav('d');
      chNav('d');
    });
    const z = await E(() => chZone);
    await E(() => chB());
    ok(k + ': down reaches the round buttons, B comes back', z === 'apps' && (await E(() => chZone)) === 'games', z);
    await shot('13-' + k);
    const g = await E(s => list().find(x => x.sys === s && /Super Mario/.test(x.name)), k);
    const started = path.join(HOME, 'CosmoU-test', emuOut);
    const r = g ? await E(x => api.play({ path: x.path, name: x.name, sys: x.sys }), g) : null;
    await waitFor(() => fs.existsSync(started), 10000);
    let a = '';
    try {
      a = fs.readFileSync(started, 'utf8');
    } catch {}
    ok(k + ': the game starts in its emulator', r && r.ok && want.test(a), [r, a]);
  }
  // covers from the internet: Nintendo's eShop for Switch, libretro's box art for the N64
  await E(() => api.setOnlineCovers(true));
  await E(() => api.scan());
  let arts = null;
  await waitFor(async () => {
    arts = await E(async () => (await api.scan()).filter(g => g.sys && g.sys !== 'wiiu').map(g => [g.sys, g.name, (g.cover || '').split('/').pop()]));
    return Array.isArray(arts) && arts.some(x => x[0] === 'n64' && /Super Mario 64/.test(x[1]) && x[2]) && arts.some(x => x[0] === 'switch' && /Odyssey/.test(x[1]) && x[2]);
  }, 60000);
  if (!(Array.isArray(arts) && arts.some(x => x[0] === 'switch' && x[2]))) ok('cover log', true, log.join('').split('\n').filter(l => /cover/.test(l)).slice(-12).join('\n'));
  ok('covers: Switch from the eShop, N64 from libretro', Array.isArray(arts) && arts.some(x => x[0] === 'n64' && /Super Mario 64/.test(x[1]) && x[2]) && arts.some(x => x[0] === 'switch' && /Odyssey/.test(x[1]) && x[2]), arts);
  await E(() => load());
  await w.waitForTimeout(1500);
  await E(() => setSystem('n64'));
  await w.waitForTimeout(1500);
  await shot('14-n64-covers');
  await E(() => setSystem('switch'));
  await w.waitForTimeout(1500);
  await shot('15-switch-covers');
  await E(() => setSystem('wiiu'));
  await w.waitForTimeout(800);

  // Cemu's own log helps when something went wrong
  try {
    const cl = fs.readFileSync(path.join(CEMU_DATA, 'log.txt'), 'utf8').trim().split('\n');
    ok('Cemu log', true, cl.slice(-25).join('\n'));
  } catch (e) {
    ok('Cemu log', true, 'none: ' + e.code);
  }
  await shot('10-end');
  await app.close().catch(() => {});
  const errs = log
    .join('')
    .split('\n')
    .filter(l => /error|fatal|crash/i.test(l) && !/dbus|gpu|viz|GLES|vaapi|Fontconfig|bus\.cc|cert/i.test(l));
  fs.writeFileSync(
    path.join(OUT, 'results.json'),
    JSON.stringify({ platform: process.platform, arch: process.arch, results, errs: errs.slice(-30) }, null, 1),
  );
  const failed = results.filter(r => !r.pass).length;
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.log('CRASH', e.stack);
  try {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ crash: String(e.stack), results }, null, 1));
  } catch {}
  process.exit(2);
});
