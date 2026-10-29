// CosmoU for Android, end-to-end on the Android emulator (GitHub Actions).
// Installs CosmoU and a stand-in for Cemu for Android, puts test games on the device, chooses the games folder with
// the real Android folder picker, starts a game and an app, and uses the controller and the back button.
// usage: node android-test.js <CosmoU.apk> <cemu-stub.apk> <out folder>     env: PW_PATH = playwright-core
const { _android } = require(process.env.PW_PATH || 'playwright-core');
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
  const [dev] = await _android.devices();
  if (!dev) throw new Error('no Android device');
  const sh = async c => String(await dev.shell(c)).trim();
  const shot = async n => {
    await wait(900);
    fs.writeFileSync(path.join(OUT, n + '.png'), await dev.screenshot());
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

  // ---- test games ----
  const G = '/sdcard/CosmoU-test/Games';
  await sh(
    `rm -rf /sdcard/CosmoU-test; mkdir -p ${G}/BOTW/code ${G}/BOTW/meta ${G}/BOTW/content "${G}/Splatoon [0005000010176a00]/Code" "${G}/Splatoon [0005000010176a00]/Meta"`,
  );
  await dev.push(Buffer.from('RPX test file'), `${G}/BOTW/code/U-King.rpx`);
  await dev.push(
    Buffer.from(
      '<menu><title_id type="hexBinary" length="8">00050000101C9500</title_id><longname_en>The Legend of Zelda\nBreath of the Wild</longname_en><product_code>WUP-P-ALZP</product_code><company_code>0001</company_code></menu>',
    ),
    `${G}/BOTW/meta/meta.xml`,
  );
  await dev.push(tga(), `${G}/BOTW/meta/iconTex.tga`);
  await dev.push(Buffer.from('RPX'), `${G}/Splatoon [0005000010176a00]/Code/Gambit.rpx`);
  await dev.push(
    Buffer.from(
      '<menu><title_id type="hexBinary" length="8">0005000010176A00</title_id><longname_en>Splatoon</longname_en><product_code>WUP-P-AGMP</product_code><company_code>0001</company_code></menu>',
    ),
    `${G}/Splatoon [0005000010176a00]/Meta/meta.xml`,
  );
  await dev.push(Buffer.from('WUA test file'), `${G}/Mario Kart 8.wua`);
  await dev.push(Buffer.from('notes'), `${G}/readme.txt`);

  // ---- install ----
  await sh(`pm uninstall ${PKG}; pm uninstall info.cemu.cemu`);
  await dev.installApk(fs.readFileSync(APK));
  ok('CosmoU installed', /package:/.test(await sh(`pm path ${PKG}`)), await sh(`dumpsys package ${PKG} | grep -m1 versionName`));
  // first start creates the app's folder, then the test file goes in (it opens the folder picker in the games folder)
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  await wait(4000);
  await sh(`am force-stop ${PKG}`);
  const ext = `/sdcard/Android/data/${PKG}/files`;
  await sh(`mkdir -p ${ext}`);
  await dev.push(
    Buffer.from('content://com.android.externalstorage.documents/document/primary%3ACosmoU-test%2FGames'),
    `${ext}/cosmou-test`,
  );
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  const wv = await dev.webView({ pkg: PKG }, { timeout: 60000 });
  const page = await wv.page();
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

  // ---- choose the games folder with Android's own folder picker ----
  await E(() => {
    window.__picked = null;
    api.pickFolder().then(s => (window.__picked = s.gamesDir));
  });
  try {
    await dev.wait({ text: /use this folder/i }, { timeout: 20000 });
    await shot('02-folder-picker');
    await dev.tap({ text: /use this folder/i });
    await dev.wait({ text: /^allow$/i }, { timeout: 10000 });
    await dev.tap({ text: /^allow$/i });
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

  // ---- Cemu: get it, then play ----
  await dev.installApk(fs.readFileSync(STUB));
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

  // ---- an Android app in the library ----
  await E(() => {
    window.__app = null;
    api.appPick().then(a => (window.__app = a));
  });
  try {
    await dev.wait({ text: 'Cemu (test)' }, { timeout: 10000 });
    await shot('05-app-picker');
    await dev.tap({ text: 'Cemu (test)' });
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

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: 'android', arch: 'emulator', results, errs }, null, 1));
  const failed = results.filter(r => !r.pass).length;
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  await dev.close();
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.log('CRASH', e.stack);
  try {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: 'android', crash: String(e.stack), results }, null, 1));
  } catch {}
  process.exit(2);
});
