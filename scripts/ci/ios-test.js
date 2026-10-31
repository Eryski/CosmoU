// CosmoU for iPhone and iPad, end-to-end in the iOS Simulator (GitHub Actions, macOS).
// Installs CosmoU and MeloStub (a stand-in for MeloCafe, which only runs on real devices), gets the games from
// "MeloCafe" through its links, starts a game and an app, imports and exports a theme, and uses a controller.
// The page is reached through CosmoU's test mode: JavaScript files in its folder (test/in) are run in the page
// and the answers come back in test/out (ios/CosmoU/Test.swift).
// usage: node ios-test.js <CosmoU.app> <MeloStub.app> <device name pattern> <out folder>
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const [APP, STUB, WANT] = process.argv.slice(2, 5),
  OUT = path.resolve(process.argv[5] || 'e2e-out');
const ID = 'com.cosmou.app',
  STUB_ID = 'com.cosmou.melostub';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + String(results.at(-1).detail).slice(0, 400) : ''));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const simctl = (...a) => cp.execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', timeout: 300000 }).trim();
const trySim = (...a) => {
  try {
    return simctl(...a);
  } catch (e) {
    return 'ERR ' + String(e.stderr || e.message).trim().slice(0, 300);
  }
};
let step = 'start',
  device = { name: '?', ver: '?' };
const t0 = Date.now();
const at = s => {
  step = s;
  console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);
};
const save = extra =>
  fs.writeFileSync(
    path.join(OUT, 'results.json'),
    JSON.stringify({ platform: 'ios', arch: device.name + ' · iOS ' + device.ver, results, ...extra }, null, 1),
  );
setTimeout(() => {
  results.push({ name: 'test finished in time', pass: false, detail: 'stopped after 25 minutes at: ' + step });
  try {
    save({});
  } catch {}
  process.exit(3);
}, 25 * 60e3).unref();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // ---- a simulator: the newest iOS with a device that matches ----
  at('simulator');
  const all = JSON.parse(simctl('list', 'devices', 'available', '-j')).devices;
  const cand = [];
  for (const [rt, list] of Object.entries(all)) {
    const m = rt.match(/iOS-(\d+)-(\d+)/);
    if (!m) continue;
    for (const d of list) if (new RegExp(WANT, 'i').test(d.name)) cand.push({ ...d, ver: m[1] + '.' + m[2], n: +m[1] * 100 + +m[2] });
  }
  cand.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  if (!cand.length) {
    const names = Object.entries(all)
      .filter(([rt]) => /iOS/.test(rt))
      .map(([rt, l]) => rt.split('.').pop() + ': ' + l.map(d => d.name).join(', '));
    throw new Error('no simulator like "' + WANT + '": ' + names.join(' | ').slice(0, 1500));
  }
  device = cand[0];
  const U = device.udid;
  trySim('boot', U);
  simctl('bootstatus', U, '-b');
  ok('simulator', true, device.name + ' · iOS ' + device.ver);
  trySim('ui', U, 'appearance', 'light');

  // the simulator stays upright; CosmoU is landscape: on an iPhone the picture is turned, on an iPad (which shows
  // landscape apps in a landscape window on the upright screen) the empty bars above and below are cut off
  const IPAD = /^iPad/i.test(device.name);
  let ratio = 0;
  const shot = async n => {
    await wait(900);
    const f = path.join(OUT, n + '.png');
    const t = Date.now();
    try {
      cp.execFileSync('xcrun', ['simctl', 'io', U, 'screenshot', '--type=png', f], { stdio: 'ignore', timeout: 240000 });
    } catch (e) {
      console.log('screenshot ' + n + ': ' + e.message.slice(0, 200));
    }
    try {
      const s = cp.execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f], { encoding: 'utf8', timeout: 120000 });
      const w = +s.match(/pixelWidth: (\d+)/)[1],
        h = +s.match(/pixelHeight: (\d+)/)[1];
      if (h > w && !IPAD) cp.execFileSync('sips', ['-r', '270', f], { stdio: 'ignore', timeout: 120000 });
      if (h > w && IPAD && ratio) cp.execFileSync('sips', ['-c', String(Math.round(w * ratio)), String(w), f], { stdio: 'ignore', timeout: 120000 });
    } catch (e) {
      console.log('picture ' + n + ': ' + e.message.slice(0, 200));
    }
    console.log('shot ' + n + ' in ' + (Date.now() - t) + ' ms');
  };

  // ---- install ----
  at('install');
  trySim('uninstall', U, ID);
  trySim('uninstall', U, STUB_ID);
  simctl('install', U, APP);
  ok('CosmoU installed', true, trySim('appinfo', U, ID).split('\n').filter(l => /CFBundleShortVersionString|CFBundleIdentifier/.test(l)).join(' '));
  // a slow simulator sometimes hangs on the first start: try again once
  const launch = () => {
    const args = ['launch', '--terminate-running-process', U, ID, '-cosmouTest', 'YES', '-cosmouQuiet', 'YES'];
    try {
      return cp.execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8', timeout: 150000 }).trim();
    } catch (e) {
      console.log('launch again: ' + String(e.message).slice(0, 120));
      trySim('terminate', U, ID);
      return simctl(...args);
    }
  };
  const data = simctl('get_app_container', U, ID, 'data');
  const ROOT = path.join(data, 'Library', 'Application Support', 'CosmoU'),
    T = path.join(ROOT, 'test');
  const waitFile = async (f, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (fs.existsSync(f)) return true;
      await wait(300);
    }
    return false;
  };
  at('start');
  ok('CosmoU starts', /\d/.test(launch()), '');
  ok('test mode on', await waitFile(path.join(T, 'started'), 90000), T);

  // run a function in the page (answers as JSON)
  let seq = 0;
  async function E(fn, arg, ms = 30000) {
    const n = String(++seq).padStart(5, '0');
    const call = `(${fn})(${arg === undefined ? '' : JSON.stringify(arg)})`;
    const body = `try { return JSON.stringify({ v: await ${call} }); } catch (e) { return JSON.stringify({ thrown: String(e && (e.stack || e)) }); }`;
    fs.writeFileSync(path.join(T, 'in', n + '.tmp'), body);
    fs.renameSync(path.join(T, 'in', n + '.tmp'), path.join(T, 'in', n + '.js'));
    const out = path.join(T, 'out', n + '.json');
    if (!(await waitFile(out, ms))) return { thrown: 'no answer from the page in ' + ms / 1000 + ' s' };
    await wait(50);
    const o = JSON.parse(fs.readFileSync(out, 'utf8'));
    if (o.error) return { thrown: o.error };
    const r = JSON.parse(o.value || '{}');
    return r.thrown ? { thrown: r.thrown } : r.v;
  }
  const answer = (name, text) => fs.writeFileSync(path.join(T, 'answers', name), text);
  const noAnswer = name => fs.rmSync(path.join(T, 'answers', name), { force: true });
  const stubLinks = () => {
    try {
      return fs.readFileSync(path.join(simctl('get_app_container', U, STUB_ID, 'data'), 'Documents', 'links.txt'), 'utf8');
    } catch {
      return '';
    }
  };
  // the stand-in got this link (the simulator on GitHub can be slow)
  const gotLink = async (text, ms = 60000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (stubLinks().includes(text)) return true;
      await wait(500);
    }
    return false;
  };
  // back to CosmoU (like tapping it in the app switcher); a link would ask "Open in CosmoU?" first
  const back = async () => {
    trySim('launch', U, ID, '-cosmouTest', 'YES', '-cosmouQuiet', 'YES');
    await wait(2500);
  };
  const waitFor = async (fn, ms) => {
    const end = Date.now() + ms;
    let v;
    while (Date.now() < end) {
      v = await E(fn, undefined, 5000);
      if (v && !v.thrown) return v;
      await wait(700);
    }
    return v;
  };

  at('page');
  const pg = await waitFor(() => (window.api && document.readyState === 'complete' ? location.href : null), 60000);
  ok('page loaded', /index\.html/.test(String(pg)), pg);
  await wait(2500);
  const info = await E(() => ({
    os: OS,
    ios: IS_IOS,
    name: OS_NAME,
    v: api.appVersion,
    w: innerWidth,
    h: innerHeight,
    vp: document.querySelector('meta[name=viewport]').content,
    wiz: !$('#wiz').hidden,
    cls: document.documentElement.className,
  }));
  ok('CosmoU runs as the iOS version', info && info.os === 'ios' && info.ios && /^(iOS|iPadOS)$/.test(info.name), info);
  ok('the page has room for the whole window (at least about 1100 × 600)', info && info.w >= 1090 && info.h >= 560, info);
  ok('first start shows the setup', info && info.wiz, '');
  if (info && info.w && info.h) ratio = info.h / info.w;
  await shot('01-first-start');
  const c0 = await E(() => api.cemuStatus());
  ok('no MeloCafe yet', c0 && !c0.installed, c0);
  const g0 = await E(() => api.pickFolder());
  ok('getting games without MeloCafe explains it', g0 && /MeloCafe isn’t installed/.test(g0.error || ''), g0);

  // ---- "MeloCafe" ----
  at('MeloCafe');
  simctl('install', U, STUB);
  // iOS needs a moment before the new app's links work
  await wait(8000);
  const c1 = await E(() => api.cemuStatus());
  ok('MeloCafe found', c1 && c1.installed && c1.path === 'MeloCafe', c1);
  await E(() => {
    window.__picked = null;
    api.pickFolder().then(s => (window.__picked = s));
    return true;
  });
  await wait(400);
  await shot('02-melocafe-sends-games');
  let picked = await waitFor(() => window.__picked, 120000);
  if (!picked || !stubLinks()) {
    // what happened: the links CosmoU opened, and what iOS knows about the stand-in
    ok('note: first try to reach MeloCafe', true, {
      picked,
      opens: await E(() => JSON.parse(CosmoNative.sync('openLog', '[]'))),
      stub: trySim('appinfo', U, STUB_ID).split('\n').filter(l => /Scheme|melocafe|Bundle|Path/i.test(l)).join(' ').slice(0, 800),
    });
    await back();
    await E(() => {
      window.__picked = null;
      api.pickFolder().then(s => (window.__picked = s));
      return true;
    });
    picked = await waitFor(() => window.__picked, 120000);
  }
  ok('games from MeloCafe', picked && picked.gamesDir === 'MeloCafe' && !picked.error, [picked, await E(() => JSON.parse(CosmoNative.sync('openLog', '[]')))]);
  const links1 = stubLinks();
  ok('MeloCafe was asked with its link', /melocafe:\/\/gameInfo\?scheme=cosmou/.test(links1), links1);
  const games = await E(async () => (await api.scan()).map(g => ({ name: g.name, path: g.path, tid: g.tid, icon: g.icon, color: g.color, format: g.format })));
  ok('three games in the library', Array.isArray(games) && games.length === 3, games);
  const zelda = Array.isArray(games) && games.find(g => /Zelda/.test(g.name));
  ok(
    'title id, icon and color of each game',
    zelda && zelda.tid === '00050000101c9500' && zelda.path === 'melocafe:' + BigInt('0x00050000101C9500') && /icon\.png$/.test(zelda.icon) && /^rgb/.test(zelda.color),
    zelda,
  );
  const icon = zelda && (await E(async u => {
    const r = await fetch(u);
    return [r.status, r.headers.get('content-type'), (await r.blob()).size];
  }, zelda.icon));
  ok('the game icon loads in the page', Array.isArray(icon) && icon[0] === 200 && /png/.test(icon[1]) && icon[2] > 200, icon);
  await E(() => {
    if (typeof closeWizard === 'function') closeWizard();
    return api.setSetupDone(true).then(load);
  });
  await wait(2500);
  await shot('03-library');

  // ---- play ----
  at('play');
  await E(z => {
    window.__played = null;
    api.play({ path: z.path, name: z.name }).then(r => (window.__played = r));
    return true;
  }, zelda);
  const started = await gotLink('melocafe://game?id=' + BigInt('0x00050000101C9500'));
  await wait(1500);
  await shot('04-melocafe-starts-the-game');
  ok('MeloCafe starts the game', started, stubLinks().split('\n').slice(-3).join(' '));
  await back();
  const played = await waitFor(() => window.__played, 60000);
  ok('play answers ok', played && played.ok, played);
  ok('back in CosmoU', (await E(() => document.visibilityState)) === 'visible', '');

  // ---- an app ----
  at('apps');
  answer('pick-app', 'MeloNX');
  const app = await E(() => api.appPick());
  ok('app picked (an emulator that is on the device)', app && app.path === 'ios-app:melonx://' && app.name === 'MeloNX', app);
  const saved = app && (await E(a => api.appSave({ path: a.path, name: a.name }), app));
  ok('app added', saved && saved.ok, saved);
  const apps = await E(async () => (await api.scan()).filter(g => g.kind === 'app').map(g => [g.name, g.format]));
  ok('app in the library', Array.isArray(apps) && apps.length === 1 && apps[0][0] === 'MeloNX' && /iOS|iPadOS/.test(apps[0][1]), apps);
  const appPlay = await E(async () => {
    const a = (await api.scan()).find(g => g.kind === 'app');
    window.__appPlayed = null;
    api.play(a).then(r => (window.__appPlayed = r));
    return a.appId;
  });
  ok('the app opens', await gotLink('melonx://'), [appPlay, stubLinks().split('\n').slice(-2).join(' ')]);
  await back();
  noAnswer('pick-app');

  // ---- JIT: StikDebug starts MeloCafe (the stand-in answers StikDebug's link too) ----
  at('jit');
  await E(() => {
    window.__jit = null;
    api.jitStart().then(r => (window.__jit = r));
    return true;
  });
  ok(
    'Start with JIT asks StikDebug to start this MeloCafe',
    await gotLink('stikjit://enable-jit?bundle-id=' + STUB_ID),
    stubLinks().split('\n').slice(-2).join(' '),
  );
  await back();
  const jit = await waitFor(() => window.__jit, 60000);
  ok('… and answers ok', jit && jit.ok === true, jit);

  // ---- Switch: the games come from MeloNX (the stand-in answers its links too) ----
  at('switch');
  const sl = await E(() => api.systemList);
  ok('iPhone and iPad offer Switch', JSON.stringify(sl) === '["switch"]', sl);
  await E(() => {
    window.__sw = null;
    api.systemPickFolder('switch').then(s => (window.__sw = s));
    return true;
  });
  const swr = await waitFor(() => window.__sw, 120000);
  ok('Switch games from MeloNX', swr && swr.systems && swr.systems.switch && swr.systems.switch.list && !swr.error, swr);
  ok('MeloNX was asked with its link', await gotLink('melonx://gameInfo?scheme=cosmou', 10000), stubLinks().split('\n').slice(-2).join(' '));
  const sg = await E(async () => (await api.scan()).filter(g => g.sys === 'switch').map(g => [g.name, g.path, g.tid]));
  ok('two Switch games', Array.isArray(sg) && sg.length === 2 && sg.some(g => g[1] === 'melonx:0100000000010000'), sg);
  await E(() => load().then(() => setSystem('switch')));
  await wait(2500);
  const swl = await E(() => ({ sys: curSys, mode, lay: $('#sw').dataset.lay, tiles: document.querySelectorAll('#swrow .sw-t').length, theme: style }));
  // (apps added earlier in this test are shown with every console, so there can be more than the two games and “All games”)
  ok('Switch Home on iPhone and iPad', swl && swl.sys === 'switch' && swl.mode === 'chome' && swl.lay === 'row' && swl.tiles >= 3, swl);
  await shot('04b-switch-home');
  await E(() => {
    const g = list().find(x => x.sys === 'switch' && /Odyssey/.test(x.name));
    window.__sp = null;
    api.play({ path: g.path, name: g.name, sys: 'switch' }).then(r => (window.__sp = r));
    return true;
  });
  ok('MeloNX starts the Switch game', await gotLink('melonx://game?id=0100000000010000'), stubLinks().split('\n').slice(-2).join(' '));
  await back();
  await E(() => setSystem('wiiu'));
  await wait(1500);

  // ---- light and dark ----
  at('dark mode');
  const bg = async () => {
    const r = await E(() => [getComputedStyle(document.body).backgroundColor, document.documentElement.classList.contains('dark')]);
    return Array.isArray(r) ? r : [null, null, r];
  };
  const light0 = await bg();
  await E(() => api.setTheme('dark'));
  await wait(900);
  const dark1 = await bg();
  ok('Dark in Settings makes CosmoU dark', dark1[1] === true && light0[0] && dark1[0] !== light0[0], [light0, dark1]);
  await shot('05-dark');
  await E(() => api.setTheme('system'));
  trySim('ui', U, 'appearance', 'dark');
  // a busy simulator can take a while to tell the app (the same wait as for the way back)
  let sys = null;
  for (let i = 0; i < 8; i++) {
    await wait(2500);
    sys = await bg();
    if (sys && sys[1] === true) break;
  }
  ok('System follows the iPhone’s dark mode', sys[1] === true, sys);
  trySim('ui', U, 'appearance', 'light');
  // a busy simulator can take a while to tell the app
  let sys2 = null;
  for (let i = 0; i < 8; i++) {
    await wait(2500);
    sys2 = await bg();
    if (sys2 && sys2[1] === false) break;
  }
  ok('… and back to light', sys2[1] === false && sys2[0] === light0[0], sys2);

  // ---- music (theme songs come as .m4a; playing them needs byte ranges from the app) ----
  at('music');
  const mus = await E(async () => {
    const m = await api.themeMusic('wii-u');
    if (!m) return null;
    const a = new Audio(m.url);
    a.muted = true;
    let played = 'yes';
    await a.play().catch(e => (played = String(e)));
    await new Promise(r => setTimeout(r, 3000));
    const out = { url: m.url.split('/').pop(), played, ready: a.readyState, dur: a.duration, t: a.currentTime, err: a.error && a.error.code };
    a.pause();
    return out;
  });
  ok('theme music plays', mus && mus.dur > 5 && !mus.err && mus.ready >= 2, mus);
  const menuMusic = await E(async () => {
    const m = await api.getMusic();
    const r = m && (await fetch(m.url, { headers: { Range: 'bytes=0-99' } }));
    return m && [m.name, r.status, r.headers.get('content-range'), (await r.arrayBuffer()).byteLength];
  });
  ok('menu music is there (and the app answers byte ranges)', Array.isArray(menuMusic) && menuMusic[1] === 206 && menuMusic[3] === 100, menuMusic);

  // ---- own theme: import a .cosmoutheme (zip with theme.json and a song) and export it again ----
  at('themes');
  const work = path.join(T, 'files');
  fs.mkdirSync(path.join(work, 'theme'), { recursive: true });
  fs.writeFileSync(
    path.join(work, 'theme', 'theme.json'),
    JSON.stringify({
      name: 'Test Theme',
      author: 'CI',
      colors: { background: '#203040', card: '#304050', selection: '#40a0ff', text: '#ffffff' },
      background: 'stars',
      music: 'song.m4a',
    }),
  );
  fs.copyFileSync(path.join(APP, 'www', 'assets', 'music', 'themes', fs.readdirSync(path.join(APP, 'www', 'assets', 'music', 'themes'))[0]), path.join(work, 'theme', 'song.m4a'));
  fs.rmSync(path.join(work, 'test.cosmoutheme'), { force: true });
  cp.execFileSync('zip', ['-q', '-9', path.join(work, 'test.cosmoutheme'), 'theme.json', 'song.m4a'], { cwd: path.join(work, 'theme') });
  answer('pick-theme', path.join(work, 'test.cosmoutheme'));
  const imp = await E(() => api.ownThemeImport());
  ok('theme imported from a .cosmoutheme file', imp && imp.ok && imp.theme.id === 'u-test-theme' && imp.hasMusic, imp);
  const own = await E(async () => [(await api.ownThemes()).map(t => t.id), await api.themeMusic('u-test-theme')]);
  ok('the theme and its song are there', own && own[0].includes('u-test-theme') && own[1] && /music\.m4a$/.test(own[1].url), own);
  fs.mkdirSync(path.join(work, 'exported'), { recursive: true });
  answer('export', path.join(work, 'exported'));
  const exp = await E(() => api.ownThemeExport('u-test-theme'));
  const zf = path.join(work, 'exported', 'test-theme.cosmoutheme');
  let zl = '';
  try {
    zl = cp.execFileSync('unzip', ['-l', zf], { encoding: 'utf8' });
  } catch (e) {
    zl = 'unzip: ' + e.message;
  }
  ok('theme exported as a zip with theme.json and the song', exp && exp.ok && /theme\.json/.test(zl) && /music\.m4a/.test(zl), [exp, zl.slice(-400)]);
  // settings file: save, then read it back
  const ex = await E(() => api.exportSettings({ style: 'wiiu' }));
  const sf = path.join(work, 'exported', 'cosmou-settings.json');
  ok('settings saved to a file', ex && ex.ok && fs.existsSync(sf), ex);
  answer('pick-file', sf);
  const im = await E(() => api.importSettings());
  ok('settings read from the file', im && im.ok && im.applied.includes('gamesDir') && im.ui.style === 'wiiu', im);
  noAnswer('pick-file');
  noAnswer('export');

  // ---- settings, controller ----
  at('settings and controller');
  await E(() => openSettings('general'));
  await wait(900);
  await shot('06-settings');
  const rows = await E(() =>
    [...document.querySelectorAll('.pane[data-c=general] .set')].filter(e => e.offsetParent).map(e => e.querySelector('strong').textContent),
  );
  ok(
    'only the iOS settings are shown',
    Array.isArray(rows) && !rows.includes('Steam') && !rows.some(r => /DLC|Rescan/.test(r)) && rows.includes('Games') && rows.includes('Full speed (JIT)'),
    rows,
  );
  await E(() => document.querySelector('#dlg').close());
  await wait(500);
  const pad = (b, d) => E((x) => CosmoNative.sync('testPad', JSON.stringify(x)), [b, d]);
  await pad(9, true);
  await wait(150);
  await pad(9, false);
  await wait(1200);
  ok('controller Start opens Settings', (await E(() => document.querySelector('#dlg').open)) === true, await E(() => navigator.getGamepads().map(p => p && p.id)));
  // B goes back: from the options to the categories first, then it closes Settings
  for (let k = 0; k < 2 && (await E(() => document.querySelector('#dlg').open)) === true; k++) {
    await pad(1, true);
    await wait(150);
    await pad(1, false);
    await wait(900);
  }
  ok('controller B closes it', (await E(() => !document.querySelector('#dlg').open)) === true, '');
  const before = await E(() => cur() && cur().name);
  await pad(15, true);
  await wait(150);
  await pad(15, false);
  await wait(900);
  const after = await E(() => cur() && cur().name);
  ok('controller D-pad moves', before !== after, [before, after]);
  await E(() => openSettings('about'));
  await wait(700);
  await shot('07-about');
  await E(() => document.querySelector('#dlg').close());
  await E(() => openDetail(cur()));
  await wait(700);
  await shot('08-details');
  await E(() => document.querySelector('#det').close());
  const fb = await E(() => api.feedbackInfo());
  ok('feedback info', fb && /^(iOS|iPadOS) \d/.test(fb.os) && fb.platform === 'ios', fb);
  const up = await E(() => api.checkUpdate());
  ok('update check reaches GitHub', up && (up.ok || /GitHub/.test(up.error)), up);
  const vp = await E(() => [document.querySelector('meta[name=viewport]').content, innerWidth, innerHeight, CosmoNative.sync('viewSize', '[]')]);
  ok('page size', true, vp);
  // iPhones with a Dynamic Island: only the island's side keeps its room, the other side is narrow
  const room = await E(() => JSON.parse(CosmoNative.sync('viewSize', '[]')));
  if (!IPAD) ok('the page is wider than the safe area (room only next to the Dynamic Island)', Array.isArray(room) && room[0] >= 780, room);
  const fps = await E(
    () =>
      new Promise(res => {
        let n = 0;
        const t0 = performance.now();
        const f = () => (++n < 60 ? requestAnimationFrame(f) : res(Math.round((60 * 1000) / (performance.now() - t0))));
        requestAnimationFrame(f);
      }),
  );
  ok('display', true, { fps, info: await E(() => ({ fps: api.ios.fps, fast: api.ios.fast })) });

  // ---- start again: everything is still there ----
  at('restart');
  launch();
  await wait(4000);
  await waitFor(() => (window.api && document.readyState === 'complete' ? 1 : null), 60000);
  await wait(1500);
  const again = await E(async () => [(await api.scan()).length, (await api.getSettings()).gamesDir, $('#wiz').hidden]);
  ok('after a restart the library is still there', Array.isArray(again) && again[0] === 6 && again[1] === 'MeloCafe' && again[2], again);
  const errs = (await E(() => window.__errs)) || [];
  ok('no errors in the page', Array.isArray(errs) && !errs.length, errs);
  await shot('09-end');

  save({ errs });
  const failed = results.filter(r => !r.pass).length;
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.log('CRASH', e.stack);
  try {
    save({ crash: String(e.stack) });
  } catch {}
  process.exit(2);
});
