// CosmoU – the full Home Menu of the Wii U Look (js/wiiu-home.js): the bar of round buttons under the games.
// CosmoU's own menu, the Plaza, Notes (js/stickies.js), the Browser and YouTube (CosmoU's own browser window –
// main.js, browser.html; on a phone the system's browser), the CosmoU Discord, Controllers, Settings and Power.
// With a controller or the keyboard: down from the last row of games goes to the bar, left and right along it,
// A (Enter) presses, up or B (Escape) goes back to the games. (Idea: Flowery)
let whZone = 'grid',
  whDk = 1;
const whD = (vb, d) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${d}</svg>`;
const WH_DOCK_IC = {
  plaza: WH_ICON.friends,
  notes: whD(
    32,
    '<path d="M6.5 5h19A1.5 1.5 0 0 1 27 6.5V19l-8 8H6.5A1.5 1.5 0 0 1 5 25.500V6.5A1.5 1.5 0 0 1 6.5 5z" fill="#ffd34d"/><path d="M27 19h-5.500a2.5 2.5 0 0 0-2.5 2.500V27z" fill="#eda913"/><path d="M10 11.500h12M10 16.500h8" stroke="#9a6a05" stroke-width="2.3" stroke-linecap="round"/>',
  ),
  web: whD(
    32,
    '<circle cx="16" cy="16" r="11.5" fill="#e6f3ff" stroke="#2f8fe6" stroke-width="2.6"/><path d="M4.5 16h23M16 4.500c-4.4 3.3-4.4 19.7 0 23M16 4.500c4.4 3.3 4.4 19.7 0 23M6.8 10.200h18.400M6.8 21.800h18.4" fill="none" stroke="#2f8fe6" stroke-width="2" stroke-linecap="round"/>',
  ),
  tv: whD(
    32,
    '<path d="M11 3.500l5 4 5-4" fill="none" stroke="#7b6cf0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="8" width="24" height="17" rx="4.5" fill="#efeaff" stroke="#7b6cf0" stroke-width="2.6"/><path d="M13.6 12.600v7.800l6.8-3.900z" fill="#7b6cf0"/><path d="M10 28.500h12" stroke="#7b6cf0" stroke-width="2.6" stroke-linecap="round"/>',
  ),
  chat: whD(
    32,
    '<path d="M25 12.200a4 4 0 0 1 2.5 3.700v4.200a4 4 0 0 1-2 3.500V27l-4-3.200h-5.600a4 4 0 0 1-3-1.400h6.100a6.5 6.5 0 0 0 6-6.400z" fill="#9aa6ff"/><path d="M5 9.500A4.5 4.5 0 0 1 9.5 5h9A4.5 4.5 0 0 1 23 9.500v5a4.5 4.5 0 0 1-4.5 4.500H12l-5 4v-4.600a4.5 4.5 0 0 1-2-3.900z" fill="#5b6ef5"/><circle cx="10.5" cy="12" r="1.4" fill="#fff"/><circle cx="14" cy="12" r="1.4" fill="#fff"/><circle cx="17.5" cy="12" r="1.4" fill="#fff"/>',
  ),
  pad: whD(
    32,
    '<path d="M9.5 9h13a6.5 6.5 0 0 1 6.4 5.400l1 6.200a3.6 3.6 0 0 1-6.3 2.900L21 20.500H11l-2.6 3a3.6 3.6 0 0 1-6.3-2.900l1-6.200A6.5 6.5 0 0 1 9.5 9z" fill="#3d4654"/><path d="M10.5 12.500v5M8 15h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="20.3" cy="16.7" r="1.6" fill="#35c2ff"/><circle cx="23.7" cy="13.5" r="1.6" fill="#ff5d73"/>',
  ),
  set: WH_ICON.sgear,
  power: WH_ICON.power,
};
// what a web address opens in: CosmoU's own browser window on a computer, the system's browser on a phone
function whWeb(url) {
  if (window.api && api.openWeb) return api.openWeb(url || '');
  window.open(url || WH_WEB_HOME, '_blank');
}
const WH_WEB_HOME = 'https://duckduckgo.com/',
  WH_TUBE = 'https://www.youtube.com/';
// key, name, what it does (b: the button itself – menus open above it)
const WH_DOCK = [
  ['menu', 'CosmoU', b => whMenu('logo', b)],
  ['plaza', 'Plaza', () => setWuLayout('plaza')],
  ['notes', 'Notes', () => typeof openStickies === 'function' && openStickies()],
  ['web', 'Browser', () => whWeb('')],
  ['tv', 'YouTube', () => whWeb(WH_TUBE)],
  ['chat', 'Discord', () => (window.api && api.openDiscord ? api.openDiscord() : window.open(DISCORD_URL, '_blank'))],
  ['pad', 'Controllers', () => openSettings('controls')],
  ['set', 'Settings', () => openSettings()],
  ['power', 'Power', b => whMenu('power', b)],
];
(function whDockBuild() {
  const box = $('#whdock');
  WH_DOCK.forEach(([k, name, fn], i) => {
    const b = document.createElement('button'),
      ic = document.createElement('span');
    b.type = 'button';
    b.className = 'wh-dk wh-dk-' + k;
    b.dataset.k = k;
    b.dataset.t = name;
    b.setAttribute('aria-label', name);
    ic.className = 'wh-dki';
    if (k === 'menu') ic.innerHTML = '<img src="build/icon.png" alt="" />';
    else ic.innerHTML = WH_DOCK_IC[k];
    b.append(ic);
    b.onclick = () => {
      whDk = i;
      // (a menu opens with its own sound)
      if (k !== 'menu' && k !== 'power') blip('open');
      fn(b);
      whDockUi();
    };
    box.append(b);
  });
})();
const whDockOn = () => typeof isHome === 'function' && isHome() && whFull() && whZone === 'dock';
// (another layout, another view: back to the games)
function whDockReset() {
  whZone = 'grid';
  whDockUi();
}
function whDockUi() {
  const home = $('#whome'),
    on = whDockOn();
  if (!on && whZone === 'dock' && !(typeof isHome === 'function' && isHome() && whFull())) whZone = 'grid';
  home.classList.toggle('dockz', on);
  [...$('#whdock').children].forEach((b, i) => b.classList.toggle('pad', on && i === whDk));
  // the name in the middle says what is chosen: the game – or the button
  if (on) $('#whtitle').textContent = WH_DOCK[whDk][1];
  else if (typeof isHome === 'function' && isHome()) {
    const g = cur();
    $('#whtitle').textContent = typeof whAdd === 'boolean' && whAdd ? 'Add app' : g ? g.name : '';
  }
}
function whDockEnter() {
  if (!$('#whmenu').hidden) whMenuClose();
  whZone = 'dock';
  whDk = Math.max(0, Math.min(WH_DOCK.length - 1, whDk));
  blip('move');
  whDockUi();
}
function whDockLeave() {
  if (!$('#whmenu').hidden) return whMenuClose();
  whZone = 'grid';
  blip('move');
  whDockUi();
}
function whDockStep(dir) {
  if (!$('#whmenu').hidden) {
    // a menu of the bar is open: up and down go through it
    const its = [...$('#whmenu').querySelectorAll('input, button')],
      at = its.indexOf(document.activeElement);
    if (dir === 'u' || dir === 'd') {
      const n = its[Math.max(0, Math.min(its.length - 1, at + (dir === 'd' ? 1 : -1)))];
      if (n) n.focus();
      blip('move');
    }
    return;
  }
  if (dir === 'u') return whDockLeave();
  if (dir === 'd') return;
  const n = Math.max(0, Math.min(WH_DOCK.length - 1, whDk + (dir === 'r' ? 1 : -1)));
  if (n === whDk) return;
  whDk = n;
  blip('move');
  whDockUi();
}
function whDockPress() {
  if (!$('#whmenu').hidden) {
    const f = document.activeElement;
    if (f && f.closest && f.closest('#whmenu') && f.tagName === 'BUTTON') return f.click();
    return;
  }
  const b = $('#whdock').children[whDk];
  if (b) b.click();
}
// the keyboard: Enter presses the chosen button, Escape goes back up to the games
addEventListener(
  'keydown',
  e => {
    if (!whDockOn() || document.querySelector('dialog[open]') || (typeof mkIsOpen === 'function' && mkIsOpen())) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      // (a menu of the bar is open: Enter is for its own buttons)
      if (!$('#whmenu').hidden) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      whDockPress();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      if (!$('#whmenu').hidden) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      whDockLeave();
    }
  },
  true,
);
// a click on a game: the games are chosen again
$('#whgrid').addEventListener('pointerdown', () => whZone === 'dock' && whDockReset(), true);
// leaving the Home Menu (another view, another console): the next visit starts on the games
const _renderWhDock = render;
render = function () {
  if (whZone === 'dock' && !(isHome() && whFull())) whZone = 'grid';
  return _renderWhDock.apply(this, arguments);
};
