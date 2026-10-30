// CosmoU – the consoles CosmoU knows: their files, how their emulators are started and where their covers come from.
// Shared by the computer version (main.js) and the window (js/systems.js, js/mobile-api.js).
// CosmoU only starts emulators people already have; it never downloads emulators, keys, firmware or games.
(function (root) {
  const SYSTEMS = {
    wiiu: { name: 'Wii U', short: 'Wii U', theme: 'wii-u', home: 'wiiu', homeLabel: 'Wii U Look' },
    switch: {
      homeLabel: 'Switch Home',
      name: 'Switch',
      short: 'Switch',
      ext: ['nsp', 'xci', 'nro'],
      theme: 'switch',
      home: 'row',
      sound: 'click',
      eshop: true,
      case: 'switch',
    },
    wii: {
      homeLabel: 'Wii Menu',
      name: 'Wii',
      short: 'Wii',
      ext: ['wbfs', 'rvz', 'iso', 'wia', 'ciso', 'gcz', 'wad'],
      theme: 'classic-wii',
      home: 'channels',
      sound: 'soft',
      thumbs: ['Nintendo - Wii'],
      case: 'wii',
    },
    gamecube: {
      homeLabel: 'GameCube Menu',
      name: 'GameCube',
      short: 'GameCube',
      ext: ['rvz', 'iso', 'gcm', 'ciso', 'gcz', 'wia'],
      theme: 'gamecube',
      home: 'discs',
      sound: 'deep',
      thumbs: ['Nintendo - GameCube'],
      case: 'gamecube',
    },
    '3ds': {
      homeLabel: 'HOME Menu',
      name: '3DS',
      short: '3DS',
      ext: ['3ds', 'cci', 'cia', 'cxi', '3dsx', 'zcci', 'zcxi'],
      theme: '3ds',
      home: 'dual',
      variant: '3ds',
      sound: 'pluck',
      thumbs: ['Nintendo - Nintendo 3DS'],
      case: 'ds',
    },
    ds: {
      homeLabel: 'DS Menu',
      name: 'DS',
      short: 'DS',
      ext: ['nds', 'dsi', 'srl'],
      theme: 'ds',
      home: 'dual',
      variant: 'ds',
      sound: 'pluck',
      thumbs: ['Nintendo - Nintendo DS'],
      case: 'ds',
    },
    n64: {
      homeLabel: 'Cartridges',
      name: 'Nintendo 64',
      short: 'N64',
      ext: ['z64', 'n64', 'v64', 'zip', '7z'],
      theme: 'n64',
      home: 'shelf',
      cart: 'n64',
      sound: 'chip',
      thumbs: ['Nintendo - Nintendo 64'],
    },
    snes: {
      homeLabel: 'Cartridges',
      name: 'Super Nintendo',
      short: 'SNES',
      ext: ['sfc', 'smc', 'zip', '7z'],
      theme: 'snes',
      home: 'shelf',
      cart: 'snes',
      sound: 'chip',
      thumbs: ['Nintendo - Super Nintendo Entertainment System'],
    },
    nes: {
      homeLabel: 'Cartridges',
      name: 'NES',
      short: 'NES',
      ext: ['nes', 'fds', 'unf', 'zip', '7z'],
      theme: 'nes',
      home: 'shelf',
      cart: 'nes',
      sound: 'chip',
      thumbs: ['Nintendo - Nintendo Entertainment System', 'Nintendo - Family Computer Disk System'],
    },
    gb: {
      homeLabel: 'Cartridges',
      name: 'Game Boy',
      short: 'Game Boy',
      ext: ['gb', 'gbc', 'sgb', 'zip', '7z'],
      theme: 'gameboy',
      home: 'shelf',
      cart: 'gb',
      sound: 'chip',
      thumbs: ['Nintendo - Game Boy', 'Nintendo - Game Boy Color'],
    },
    gba: {
      homeLabel: 'Cartridges',
      name: 'Game Boy Advance',
      short: 'GBA',
      ext: ['gba', 'zip', '7z'],
      theme: 'gba',
      home: 'shelf',
      cart: 'gba',
      sound: 'chip',
      thumbs: ['Nintendo - Game Boy Advance'],
    },
    vb: {
      homeLabel: 'Cartridges',
      name: 'Virtual Boy',
      short: 'Virtual Boy',
      ext: ['vb', 'vboy', 'zip'],
      theme: 'virtualboy',
      home: 'shelf',
      cart: 'vb',
      sound: 'chip',
      thumbs: ['Nintendo - Virtual Boy'],
    },
  };
  const ORDER = ['wiiu', 'switch', 'wii', 'gamecube', '3ds', 'ds', 'n64', 'snes', 'nes', 'gb', 'gba', 'vb'];

  // ---------- starting an emulator on a computer ----------
  // known emulators by their program name; anything else simply gets the game file
  const DESKTOP = [
    { re: /eden|citron|sudachi|suyu|torzu|yuzu/i, args: g => ['-f', '-g', g] },
    { re: /dolphin/i, args: g => ['-b', '-e', g] },
    { re: /retroarch/i, retroarch: true },
  ];
  // RetroArch needs a core; the first one that is installed is used
  const CORES = {
    switch: [],
    wii: ['dolphin'],
    gamecube: ['dolphin'],
    '3ds': ['citra', 'azahar'],
    ds: ['melondsds', 'melonds', 'desmume', 'noods'],
    n64: ['mupen64plus_next', 'parallel_n64'],
    snes: ['snes9x', 'bsnes', 'mesen-s', 'snes9x2010'],
    nes: ['mesen', 'fceumm', 'nestopia', 'quicknes'],
    gb: ['gambatte', 'sameboy', 'mgba', 'gearboy'],
    gba: ['mgba', 'vbam', 'vba_next', 'gpsp'],
    vb: ['mednafen_vb'],
  };

  // ---------- starting an emulator on Android (app package → how it wants a game) ----------
  // uri = the game as a content:// link, path = the file path (only for games in the phone's own storage)
  const ANDROID = [
    { re: /^org\.dolphinemu\.dolphinemu/, how: 'dolphin', activity: 'org.dolphinemu.dolphinemu.ui.main.MainActivity' },
    { re: /^dev\.eden\.eden_emulator|^org\.yuzu\.yuzu_emu/, how: 'yuzu', activity: 'org.yuzu.yuzu_emu.activities.EmulationActivity' },
    { re: /^org\.citron\.citron_emu/, how: 'yuzu', activity: 'org.citron.citron_emu.activities.EmulationActivity' },
    { re: /^org\.sudachi\.sudachi_emu/, how: 'yuzu', activity: 'org.sudachi.sudachi_emu.activities.EmulationActivity' },
    { re: /^com\.retroarch/, how: 'retroarch', activity: 'com.retroarch.browser.retroactivity.RetroActivityFuture' },
    { re: /^com\.github\.pizzaboy|^it\.dbtecno\.pizzaboy/, how: 'extra', extra: 'rom_uri' },
    { re: /^com\.dsemu\.drastic/, how: 'extra-path', extra: 'GAMEPATH' },
  ];

  // ---------- covers ----------
  // retro and disc systems: the box art of the libretro thumbnail project, matched by name;
  // Switch: Nintendo's own eShop search (by title id, or by name)
  const THUMBS = 'https://thumbnails.libretro.com/';
  const norm = s =>
    String(s || '')
      .toLowerCase()
      .replace(/\.[a-z0-9]{2,5}$/, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      // libretro writes "&" as "_" in its file names
      .replace(/\s_\s/g, ' and ')
      .replace(/&/g, 'and')
      .replace(/^the\s+|,\s*the\b/g, ' ')
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '');
  // a name as people see it: without the brackets and the extension
  const titleOf = file =>
    String(file || '')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .replace(/[_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  // the libretro listing is an ordinary "Index of" page: the names of its pictures
  const thumbList = html => [...String(html).matchAll(/href="([^"?/]+\.png)"/g)].map(m => decodeURIComponent(m[1]));
  // the best picture for a game: same name (without region and brackets), preferring Europe, USA and full releases
  const REGION_RANK = name =>
    (/\(Europe\)|\(World\)/.test(name) ? 0 : /\(USA\)/.test(name) ? 1 : /\(Japan\)/.test(name) ? 3 : 2) +
    (/\((Beta|Proto|Demo|Sample|Kiosk|Pirate|Unl)[^)]*\)/i.test(name) ? 10 : 0) +
    (/\(Rev|\(v\d/.test(name) ? 1 : 0);
  function bestThumb(files, game) {
    const want = norm(game),
      exact = files.find(f => f.replace(/\.png$/, '') === String(game).replace(/\.[a-z0-9]{2,5}$/i, ''));
    if (exact) return exact;
    const same = files.filter(f => norm(f) === want);
    if (!same.length) return '';
    return same.sort((a, b) => REGION_RANK(a) - REGION_RANK(b))[0];
  }
  const thumbUrl = (folder, file) =>
    THUMBS + encodeURIComponent(folder).replace(/%20/g, '%20') + '/Named_Boxarts/' + encodeURIComponent(file);
  const listUrl = folder => THUMBS + encodeURIComponent(folder) + '/Named_Boxarts/';
  // Nintendo's eShop search (Europe): square pictures, and every Switch game has its title id there
  const eshopUrl = (title, tid) =>
    'https://searching.nintendo-europe.com/en/select?rows=8&wt=json&fl=title,application_id_s,image_url_sq_s,image_url&q=' +
    encodeURIComponent(title || '*') +
    '&fq=' +
    // HAC = games for the (first) Switch; Nintendo keeps the title ids in small letters
    encodeURIComponent('type:GAME AND playable_on_txt:HAC' + (tid ? ' AND application_id_s:' + String(tid).toLowerCase() : ''));
  function eshopPick(json, title, tid) {
    let docs = [];
    try {
      docs = (typeof json === 'string' ? JSON.parse(json) : json).response.docs || [];
    } catch {}
    const t = String(tid || '').toUpperCase(),
      w = norm(title);
    const d =
      (t && docs.find(x => String(x.application_id_s || '').toUpperCase() === t)) ||
      docs.find(x => norm(x.title) === w) ||
      (t ? null : docs.find(x => norm(x.title).startsWith(w) || w.startsWith(norm(x.title))));
    let u = d ? d.image_url_sq_s || d.image_url || '' : '';
    // Nintendo often writes its picture addresses without "https:"
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u && !/^https?:/.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return u;
  }

  const api = { SYSTEMS, ORDER, DESKTOP, CORES, ANDROID, norm, titleOf, thumbList, bestThumb, thumbUrl, listUrl, eshopUrl, eshopPick };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SYSDATA = api;
})(this);
