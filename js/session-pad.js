// CosmoU – while a game runs: L + D-pad Down + Select on the controller closes it and brings CosmoU back
// (the main process watches the game too: js/game-session.js). This is the window's own controller reading, for
// controllers Windows' XInput doesn't know and for Linux and macOS.
let spTimer = 0,
  spHeld = 0;
function sessionPad(on) {
  clearInterval(spTimer);
  spTimer = 0;
  spHeld = 0;
  if (!on || !window.api || !api.closeGame) return;
  spTimer = setInterval(() => {
    const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    const b = i => !!(p && p.buttons[i] && p.buttons[i].pressed);
    if (p && b(4) && b(13) && b(8)) spHeld++;
    else spHeld = 0;
    if (spHeld >= 3) {
      sessionPad(false);
      api.closeGame();
    }
  }, 120);
}
if (typeof launch === 'function') {
  const _launchSp = launch;
  launch = async function () {
    const r = await _launchSp.apply(this, arguments);
    sessionPad(true);
    return r;
  };
}
if (window.api && api.onGameBack)
  api.onGameBack(d => {
    sessionPad(false);
    // (the controller buttons of the combo are still held: CosmoU doesn't act on them)
    if (typeof pad === 'object') pad.prev = { l: true, r: true, u: true, d: true, a: true, b: true, x: true, y: true, st: true, sl: true, lb: true, rb: true, hm: true, lt: true, rt: true, l3: true, r3: true };
    if (typeof syncMusic === 'function') syncMusic();
    toast(d && d.kind === 'closed' ? '✓ Game closed – welcome back' : '✓ Welcome back', 2600);
  });
