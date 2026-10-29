// CosmoU – texts and small differences for Linux and macOS (Windows is what the HTML says by default).
(function () {
  if (IS_MAC) return macTexts();
  if (IS_ANDROID) return androidTexts();
  if (!IS_LINUX) return;
  const set = (sel, text) => {
    const e = document.querySelector(sel);
    if (e) e.textContent = text;
  };
  // first-time setup
  set(
    '.wz-page[data-s="1"] p',
    'CosmoU starts your games with Cemu, the Wii U emulator. Get the latest Cemu AppImage automatically, or choose the Cemu you already have (AppImage, Flatpak or installed).',
  );
  set('#wzpick', 'Choose Cemu');
  // settings
  const look = document.querySelector('[data-k~="windows"] small');
  if (look) look.textContent = 'Follow your system, or always light or dark';
  const fb = document.querySelector('[data-k~="feedback"] small');
  if (fb) fb.textContent = 'Collects your Cemu and Linux version so the report is useful';
  const ex = document.querySelector('[data-k~="emulator"]');
  if (ex) ex.dataset.k += ' appimage flatpak linux';
})();
function macTexts() {
  const set = (sel, text) => {
    const e = document.querySelector(sel);
    if (e) e.textContent = text;
  };
  set(
    '.wz-page[data-s="1"] p',
    'CosmoU starts your games with Cemu, the Wii U emulator. Get the latest Cemu for Mac automatically, or choose the Cemu.app you already have.',
  );
  set('#wzpick', 'Choose Cemu.app');
  const tvs = document.querySelector('[data-k~="tv"] small');
  if (tvs && /F11/.test(tvs.textContent)) tvs.textContent = tvs.textContent.replace('F11', '⌃⌘F');
  const look = document.querySelector('[data-k~="windows"] small');
  if (look) look.textContent = 'Follow macOS, or always light or dark';
  const fb = document.querySelector('[data-k~="feedback"] small');
  if (fb) fb.textContent = 'Collects your Cemu and macOS version so the report is useful';
  const ex = document.querySelector('[data-k~="emulator"]');
  if (ex) ex.dataset.k += ' mac macos dmg apple';
}

// Android: CosmoU starts the games in Cemu for Android; Cemu's own settings, graphic packs and saves live inside that app
function androidTexts() {
  const set = (sel, text) => {
    const e = document.querySelector(sel);
    if (e) e.textContent = text;
  };
  set(
    '.wz-page[data-s="1"] p',
    'CosmoU starts your games with Cemu for Android, a community version of the Wii U emulator. Install it once, then CosmoU finds it by itself.',
  );
  set('#wzdl', 'Get Cemu for Android');
  set('#wzpick', 'Check again');
  set('#upC', 'Get Cemu for Android');
  set('#pickC', 'Check again');
  const apps = document.querySelector('[data-k~="apps"] small');
  if (apps) apps.textContent = 'Add other apps from this device, like emulators or games';
  const look = document.querySelector('[data-k~="windows"] small');
  if (look) look.textContent = 'Follow Android, or always light or dark';
  const fb = document.querySelector('[data-k~="feedback"] small');
  if (fb) fb.textContent = 'Collects your Cemu and Android version so the report is useful';
  const ex = document.querySelector('[data-k~="emulator"]');
  if (ex) ex.dataset.k += ' android apk phone tablet';
  // things that need the desktop version of Cemu
  for (const sel of [
    '[data-k~="dlc"]',
    '[data-k~="steam"]',
    '[data-k~="own"][data-k~="covers"]',
    '#mf',
    '#dgp',
    '#dao',
    '#dfold',
    '#dsteam',
    '#dsv',
    '#dup',
    '#dqs',
  ])
    document.querySelectorAll(sel).forEach(e => e.classList.add('no-android'));
  const saves = document.querySelector('[data-k~="backup"][data-k~="saves"]');
  if (saves) (saves.closest('.grp').classList.add('no-android'), saves.closest('.grp').previousElementSibling.classList.add('no-android'));
}
