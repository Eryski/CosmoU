// CosmoU – choosing a console: big cards with a picture of each console's look (its theme in small), its name and
// how many games it has. Opens on start when there is more than one console (Settings → Look can turn that off),
// from the console button in the header and from the round "Consoles" button.
// Mouse, touch, keyboard (arrows, Enter, Escape) and controller (D-pad, A, B) all work.
function consolePick(onStart) {
  const av = sysAvail();
  if (av.length < 2) return;
  let d = $('#cpick');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'cpick';
    d.className = 'cpick';
    d.innerHTML = '<div class="cp-in"><h2>Choose a console</h2><div class="cp-row" role="listbox"></div><p class="cp-hint"></p></div>';
    d.addEventListener('click', e => e.target === d && d.close());
    d.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      e.stopPropagation();
      const bs = [...d.querySelectorAll('.cp-card')],
        i = bs.indexOf(document.activeElement),
        n = bs[Math.max(0, Math.min(bs.length - 1, (i < 0 ? 0 : i) + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1)))];
      if (n && n !== document.activeElement) {
        n.focus();
        if (typeof blip === 'function') blip('move');
      }
    });
    document.body.append(d);
  }
  const row = d.querySelector('.cp-row');
  row.replaceChildren();
  for (const k of av) {
    const p = SYS[k],
      n = games.filter(g => sysOf(g) === k && g.kind !== 'app' && g.format !== 'Demo').length;
    const b = document.createElement('button');
    b.className = 'cp-card' + (k === curSys ? ' cur' : '');
    b.dataset.s = k;
    b.setAttribute('role', 'option');
    b.innerHTML =
      `<span class="pv pv-${p.theme}" aria-hidden="true"><i class="pv-top"></i><i class="pv-t"></i><i class="pv-t"></i>` +
      `<i class="pv-t"></i><i class="pv-x"></i><i class="pv-nav"></i></span><b></b><small></small>`;
    b.querySelector('b').textContent = p.name;
    b.querySelector('small').textContent = n + (n === 1 ? ' game' : ' games') + ' · ' + p.homeLabel;
    b.onclick = () => {
      d.close();
      if (k !== curSys) setSystem(k);
      else if (typeof blip === 'function') blip('open');
    };
    b.onfocus = () => b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    row.append(b);
  }
  d.querySelector('.cp-hint').textContent = onStart ? 'You can change the console any time at the top – or with L and R on a controller.' : '';
  if (!d.open) d.showModal();
  const c = row.querySelector('.cur') || row.firstElementChild;
  requestAnimationFrame(() => c && c.focus());
}
const closeConsolePick = () => {
  const d = $('#cpick');
  if (d && d.open) d.close();
};
// on start: only when nothing else is on the screen (setup, a window, a game started from Steam)
function consolePickOnStart() {
  if (!lsGet('consolePick', true) || (window.api && api.launchPlay)) return;
  if (document.querySelector('dialog[open]') || $('#setup').classList.contains('on') || $('#launch').classList.contains('on')) return;
  consolePick(true);
}
// the header button and the round "Consoles" button open the cards instead of a small menu
sysMenu = function () {
  consolePick(false);
};
// a new console closes the cards (also when it is chosen another way)
const _setSystemCp = setSystem;
setSystem = function (k) {
  closeConsolePick();
  return _setSystemCp.apply(this, arguments);
};
// Settings → Look: "Choose the console on start"
$('#cpst').onclick = () => {
  lsSet('consolePick', !lsGet('consolePick', true));
  extrasUi();
};
const _extrasUiCp = extrasUi;
extrasUi = function () {
  _extrasUiCp();
  tgUi('#cpst', lsGet('consolePick', true));
};
