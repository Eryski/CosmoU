// CosmoU for Android, end-to-end on the Android emulator (GitHub Actions).
// Installs CosmoU and a stand-in for Cemu for Android, puts test games on the device, chooses the games folder with
// the real Android folder picker, starts a game and an app, and uses the controller and the back button.
// usage: node android-test.js <CosmoU.apk> <cemu-stub.apk> <out folder>     env: PW_PATH = playwright-core
const { chromium } = require(process.env.PW_PATH || 'playwright-core');
const fs = require('fs'),
  path = require('path');
const [APK, STUB] = process.argv.slice(2, 4),
  OUT = path.resolve(process.argv[4] || 'e2e-out');
const PKG = 'com.cosmou.app';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail === undefined ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  ' + String(results.at(-1).detail).slice(0, 400) : ''));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
// files and apps go to the device with adb itself (more reliable than Playwright's own push)
const cp = require('child_process'),
  os = require('os');
const adb = (...args) => cp.execFileSync('adb', args, { encoding: 'utf8', timeout: 180000 }).trim();
let tmpN = 0;
function push(data, remote) {
  const f = path.join(os.tmpdir(), 'cosmou-push-' + tmpN++);
  fs.writeFileSync(f, data);
  adb('push', f, remote);
  fs.rmSync(f);
}
const install = apk => adb('install', '-r', '-g', apk);
// the Android screen as text: the buttons and labels uiautomator sees, with their position
function uiNodes() {
  adb('shell', 'uiautomator dump /sdcard/ui.xml >/dev/null');
  const x = adb('shell', 'cat /sdcard/ui.xml');
  return [...x.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].map(m => ({
    text: m[1].replace(/&amp;/g, '&'),
    x: (+m[2] + +m[4]) >> 1,
    y: (+m[3] + +m[5]) >> 1,
  }));
}
async function waitText(re, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (uiNodes().some(n => re.test(n.text))) return;
    await new Promise(r => setTimeout(r, 700));
  }
  throw new Error(
    'not on screen: ' +
      re +
      ' – seen: ' +
      uiNodes()
        .map(n => n.text)
        .filter(Boolean)
        .slice(0, 30)
        .join(' | '),
  );
}
async function tapText(re) {
  const n = uiNodes().find(n => re.test(n.text));
  if (!n) throw new Error('nothing to tap: ' + re);
  adb('shell', `input tap ${n.x} ${n.y}`);
  await new Promise(r => setTimeout(r, 900));
}
// what the test is doing right now, so a hang shows where it stopped
let step = 'start';
const t0 = Date.now();
const at = s => {
  step = s;
  console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);
};
setTimeout(() => {
  results.push({ name: 'test finished in time', pass: false, detail: 'stopped after 12 minutes at: ' + step });
  try {
    results.push({ name: 'CosmoU log', pass: true, detail: adb('logcat', '-d', '-t', '120', '-s', 'CosmoU:*', 'chromium:*').slice(-6000) });
  } catch {}
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: 'android', arch: 'emulator', results }, null, 1));
  } catch {}
  process.exit(3);
}, 12 * 60e3).unref();

// a tiny 4×4 Wii U style icon (uncompressed 32-bit TGA, top-left origin)
function tga() {
  const w = 4,
    h = 4,
    b = Buffer.alloc(18 + w * h * 4);
  b[2] = 2;
  b.writeUInt16LE(w, 12);
  b.writeUInt16LE(h, 14);
  b[16] = 32;
  b[17] = 0x28;
  for (let i = 0; i < w * h; i++) b.set([200, 120, 30, 255], 18 + i * 4); // B G R A
  return b;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  at('devices');
  const sh = async c => adb('shell', c);
  const shot = async n => {
    await wait(900);
    fs.writeFileSync(path.join(OUT, n + '.png'), cp.execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64e6 }));
  };
  ok(
    'device',
    true,
    (await sh('getprop ro.build.version.release')) +
      ' · ' +
      (await sh('getprop ro.product.model')) +
      ' · ' +
      (await sh('getprop ro.product.cpu.abi')),
  );

  // right after the emulator starts, its storage may not be ready yet
  at('wait for storage');
  for (let i = 0; i < 60; i++) {
    let r = '';
    try {
      r = await sh('mkdir -p /sdcard/CosmoU-test && touch /sdcard/CosmoU-test/.ok && echo ready');
    } catch {}
    if (/ready/.test(r)) break;
    await wait(2000);
  }
  at('push test games');
  // ---- test games ----
  const G = '/sdcard/CosmoU-test/Games';
  await sh(
    `rm -rf /sdcard/CosmoU-test; mkdir -p ${G}/BOTW/code ${G}/BOTW/meta ${G}/BOTW/content "${G}/Splatoon [0005000010176a00]/Code" "${G}/Splatoon [0005000010176a00]/Meta"`,
  );
  push(Buffer.from('RPX test file'), `${G}/BOTW/code/U-King.rpx`);
  push(
    Buffer.from(
      '<menu><title_id type="hexBinary" length="8">00050000101C9500</title_id><longname_en>The Legend of Zelda\nBreath of the Wild</longname_en><product_code>WUP-P-ALZP</product_code><company_code>0001</company_code></menu>',
    ),
    `${G}/BOTW/meta/meta.xml`,
  );
  push(tga(), `${G}/BOTW/meta/iconTex.tga`);
  push(Buffer.from('RPX'), `${G}/Splatoon [0005000010176a00]/Code/Gambit.rpx`);
  push(
    Buffer.from(
      '<menu><title_id type="hexBinary" length="8">0005000010176A00</title_id><longname_en>Splatoon</longname_en><product_code>WUP-P-AGMP</product_code><company_code>0001</company_code></menu>',
    ),
    `${G}/Splatoon [0005000010176a00]/Meta/meta.xml`,
  );
  push(Buffer.from('WUA test file'), `${G}/Mario Kart 8.wua`);
  push(Buffer.from('notes'), `${G}/readme.txt`);

  at('install');
  // ---- install ----
  await sh(`pm uninstall ${PKG}; pm uninstall info.cemu.cemu`);
  install(APK);
  ok('CosmoU installed', /package:/.test(await sh(`pm path ${PKG}`)), await sh(`dumpsys package ${PKG} | grep -m1 versionName`));
  // test mode: the page can be looked into with adb, and the folder picker starts in the test games folder
  adb(
    'shell',
    'am start -W -n ' +
      PKG +
      '/.MainActivity --es cosmou_test content://com.android.externalstorage.documents/document/primary%3ACosmoU-test%2FGames',
  );
  await wait(3000);
  ok(
    'test mode on',
    /test mode/.test(adb('logcat', '-d', '-s', 'CosmoU:I')),
    adb('shell', 'cat /proc/net/unix | grep -c devtools_remote || true'),
  );
  at('connect to the page');
  // the page inside CosmoU, through Chrome's DevTools connection of the Android WebView
  const pid = await sh('pidof ' + PKG);
  const sock =
    (await sh('cat /proc/net/unix')).match(new RegExp('@(webview_devtools_remote_' + pid + ')\\b')) ||
    (await sh('cat /proc/net/unix')).match(/@(webview_devtools_remote_\d+)/);
  if (!sock) throw new Error('no WebView DevTools socket for pid ' + pid);
  adb('forward', 'tcp:9333', 'localabstract:' + sock[1]);
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333', { timeout: 60000 });
  const page =
    browser
      .contexts()[0]
      .pages()
      .find(p => /index\.html/.test(p.url())) || browser.contexts()[0].pages()[0];
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.waitForTimeout(3500);
  const E = async (fn, arg) => {
    try {
      return await page.evaluate(fn, arg);
    } catch (e) {
      return { thrown: e.message.slice(0, 300) };
    }
  };
  const info = await E(() => ({
    os: OS,
    android: IS_ANDROID,
    v: api.appVersion,
    w: innerWidth,
    h: innerHeight,
    vp: document.querySelector('meta[name=viewport]').content,
    wiz: !$('#wiz').hidden,
  }));
  ok('CosmoU starts on Android', info.os === 'android' && info.android, info);
  await shot('01-first-start');
  const c0 = await E(() => api.cemuStatus());
  ok('no Cemu yet', !c0.installed, c0);

  at('folder picker');
  // ---- choose the games folder with Android's own folder picker ----
  await E(() => {
    window.__picked = null;
    api.pickFolder().then(s => (window.__picked = s.gamesDir));
  });
  try {
    await waitText(/use this folder/i, 20000);
    await shot('02-folder-picker');
    await tapText(/use this folder/i);
    await waitText(/^allow$/i, 10000);
    await tapText(/^allow$/i);
  } catch (e) {
    ok('folder picker', false, e.message.slice(0, 300));
    await shot('02-folder-picker');
  }
  await page.waitForTimeout(2500);
  const picked = await E(() => window.__picked);
  ok('games folder chosen', picked === 'Games', picked);
  const games = await E(async () => (await api.scan()).map(g => [g.name, g.format, g.tid, !!g.icon, g.color]));
  ok('games found (folders, upper-case folders and .wua; not .txt)', Array.isArray(games) && games.length === 3, games);
  ok('icon from iconTex.tga', Array.isArray(games) && games.some(g => /Zelda/.test(g[0]) && g[3] && /^rgb/.test(g[4])), games);
  await E(() => closeWizard && closeWizard());
  await E(() => api.setSetupDone(true).then(load));
  // covers from GameTDB need the internet; give them a moment
  await page.waitForTimeout(9000);
  const covers = await E(async () => (await api.scan()).map(g => [g.name, g.cover.split('/').pop()]));
  ok('covers', true, covers);
  await E(() => load());
  await shot('03-library');

  at('Cemu');
  // ---- Cemu: get it, then play ----
  install(STUB);
  const c1 = await E(() => api.cemuStatus());
  ok('Cemu for Android found', c1.installed && c1.path === 'info.cemu.cemu', c1);
  await sh('logcat -c');
  const pl = await E(async () => {
    const g = (await api.scan()).find(x => /Zelda/.test(x.name));
    return api.play({ path: g.path, tid: g.tid, key: g.tid, name: g.name });
  });
  ok('play starts Cemu', pl && pl.ok, pl);
  await wait(3500);
  const log = await sh('logcat -d -s CemuStub:I');
  ok('Cemu got the game', /data=content:\/\/.*U-King\.rpx/.test(log), log.slice(-900));
  ok('Cemu can read the game file', /game readable=true/.test(log), '');
  ok('Cemu can see the game folder (code, content, meta)', /folder listable=3/.test(log), (log.match(/folder listable=.*/) || [''])[0]);
  await shot('04-cemu');
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  await page.waitForTimeout(1500);
  const wua = await E(async () => {
    const g = (await api.scan()).find(x => /Mario/.test(x.name));
    return api.play({ path: g.path, name: g.name });
  });
  await wait(2500);
  const log2 = await sh('logcat -d -s CemuStub:I');
  ok(
    'a .wua game starts too',
    wua && wua.ok && /Mario%20Kart%208\.wua|Mario Kart 8\.wua/.test(log2) && /game readable=true/.test(log2),
    log2.slice(-400),
  );
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  await page.waitForTimeout(1500);

  at('apps');
  // ---- an Android app in the library ----
  await E(() => {
    window.__app = null;
    api.appPick().then(a => (window.__app = a));
  });
  try {
    await waitText(/^Cemu \(test\)$/, 10000);
    await shot('05-app-picker');
    await tapText(/^Cemu \(test\)$/);
  } catch (e) {
    ok('app picker', false, e.message.slice(0, 200));
  }
  await page.waitForTimeout(1200);
  const picked2 = await E(() => window.__app);
  ok('app picked', picked2 && picked2.path === 'android-app:info.cemu.cemu', picked2);
  const saved = picked2 && (await E(a => api.appSave({ path: a.path, name: 'Test app' }), picked2));
  ok('app added', saved && saved.ok, saved);
  const apps = await E(async () => (await api.scan()).filter(g => g.kind === 'app').map(g => [g.name, g.cover.split('/').pop()]));
  ok('app in the library with its icon', Array.isArray(apps) && apps.length === 1 && /\.png$/.test(apps[0][1]), apps);

  at('back and controller');
  // ---- back button and controller ----
  await E(() => openSettings('general'));
  await page.waitForTimeout(800);
  await shot('06-settings');
  const rows = await E(() =>
    [...document.querySelectorAll('.pane[data-c=general] .set')]
      .filter(e => e.offsetParent)
      .map(e => e.querySelector('strong').textContent),
  );
  ok('only Android settings shown', Array.isArray(rows) && !rows.includes('Steam') && !rows.some(r => /DLC/.test(r)), rows);
  await sh('input keyevent 4');
  await page.waitForTimeout(800);
  ok('back button closes the window', (await E(() => !document.querySelector('dialog[open]'))) === true, '');
  await sh('input gamepad keyevent KEYCODE_BUTTON_START');
  await page.waitForTimeout(1200);
  ok(
    'controller Start opens Settings',
    (await E(() => document.querySelector('#dlg').open)) === true,
    await E(() => navigator.getGamepads().length),
  );
  await sh('input gamepad keyevent KEYCODE_BUTTON_B');
  await page.waitForTimeout(800);
  ok('controller B closes it', (await E(() => !document.querySelector('#dlg').open)) === true, '');
  const before = await E(() => cur() && cur().name);
  await sh('input gamepad keyevent KEYCODE_DPAD_RIGHT');
  await page.waitForTimeout(800);
  const after = await E(() => cur() && cur().name);
  ok('controller D-pad moves', before !== after, [before, after]);
  await E(() => openSettings('about'));
  await shot('07-about');
  await E(() => document.querySelector('#dlg').close());
  await E(() => openDetail(cur()));
  await shot('08-details');
  await E(() => document.querySelector('#det').close());
  const fb = await E(() => api.feedbackInfo());
  ok('feedback info', /^Android /.test(fb.os), fb);
  const up = await E(() => api.checkUpdate());
  ok('update check reaches GitHub', up && (up.ok || /GitHub/.test(up.error)), up);
  ok('no errors in the page', !errs.length, errs);
  await sh('input keyevent 4');
  await page.waitForTimeout(800);
  await shot('09-end');

  ok('CosmoU log', true, adb('logcat', '-d', '-t', '60', '-s', 'CosmoU:*').slice(-4000));
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: 'android', arch: 'emulator', results, errs }, null, 1));
  const failed = results.filter(r => !r.pass).length;
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  await browser.close().catch(() => {});
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.log('CRASH', e.stack);
  try {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: 'android', crash: String(e.stack), results }, null, 1));
  } catch {}
  process.exit(2);
});
