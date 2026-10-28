// CosmoU – texts and small differences for Linux (Windows is what the HTML says by default).
(function () {
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
