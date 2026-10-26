// CosmoU – Buddy maker: create your own characters for the Wii U Look plaza.
// --- Buddy maker ---
const SKIN = ['#ffe1cc', '#f6c9a6', '#e2ab84', '#bd845e', '#8d5c3e', '#5e3b27', '#cdeedd', '#d9d2f6', '#cfe7fa', '#fbeab4'];
const OUTFIT = [
  '#f29a86',
  '#e5534b',
  '#f0c85a',
  '#7fcaa4',
  '#3fae8f',
  '#6fb2e8',
  '#3a74d6',
  '#9b8fe0',
  '#ee8fb6',
  '#8d97a4',
  '#39424d',
  '#f4f4f2',
];
const B_EY = ['Dots', 'Happy', 'Sleepy', 'Wink'],
  B_MO = ['Smile', 'Grin', 'Oh'],
  B_AC = ['Star', 'Leaf', 'Bow', 'Cap', 'None'];
let buddies = [],
  bsel = 0,
  bmOn = false;
try {
  buddies = JSON.parse(localStorage.getItem('cosmou.buddies') || '[]')
    .filter(b => b && typeof b === 'object')
    .slice(0, 12);
} catch {}
const bNew = () => ({
  name: 'Buddy ' + (buddies.length + 1),
  fc: SKIN[Math.floor(Math.random() * 6)],
  bc: OUTFIT[Math.floor(Math.random() * OUTFIT.length)],
  ey: Math.floor(Math.random() * 4),
  mo: Math.floor(Math.random() * 3),
  acc: Math.floor(Math.random() * 5),
});
function bSave() {
  try {
    localStorage.setItem('cosmou.buddies', JSON.stringify(buddies));
  } catch {}
  if (mii.list.length) applyBuddies();
}
function bUi() {
  const b = buddies[bsel];
  $('#b_del').disabled = !b;
  for (const id of ['#b_n', '#b_fc', '#b_bc', '#b_ey', '#b_mo', '#b_ac']) $(id).style.opacity = b ? 1 : 0.4;
  $('#b_n').value = b ? b.name : '';
  $('#b_n').disabled = !b;
  const sw = (box, list, key) => {
    box.replaceChildren();
    for (const col of list) {
      const e = document.createElement('button');
      e.style.background = col;
      e.setAttribute('aria-label', col);
      if (b && b[key] === col) e.className = 'on';
      e.onclick = () => {
        if (!b) return;
        b[key] = col;
        bSave();
        bUi();
      };
      box.append(e);
    }
  };
  const sg = (box, list, key) => {
    box.replaceChildren();
    list.forEach((n, i) => {
      const e = document.createElement('button');
      e.textContent = n;
      if (b && b[key] === i) e.className = 'on';
      e.onclick = () => {
        if (!b) return;
        b[key] = i;
        bSave();
        bUi();
      };
      box.append(e);
    });
  };
  sw($('#b_fc'), SKIN, 'fc');
  sw($('#b_bc'), OUTFIT, 'bc');
  sg($('#b_ey'), B_EY, 'ey');
  sg($('#b_mo'), B_MO, 'mo');
  sg($('#b_ac'), B_AC, 'acc');
  const l = $('#b_list');
  l.replaceChildren();
  buddies.forEach((x, i) => {
    const e = document.createElement('button');
    e.className = i === bsel ? 'on' : '';
    const dot = document.createElement('i');
    dot.style.background = x.bc;
    e.append(dot, document.createTextNode(x.name || 'Buddy'));
    e.onclick = () => {
      bsel = i;
      bUi();
    };
    l.append(e);
  });
  if (!buddies.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.style.margin = '0';
    p.textContent = 'No buddies yet. Press “New buddy” to make one.';
    l.append(p);
  }
  $('#b_cnt').textContent = buddies.length ? `(${buddies.length} / 12)` : '';
  $('#b_new').disabled = buddies.length >= 12;
}
function bmFrame(now) {
  if (!bmOn) return;
  const c = $('#bcv'),
    x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  const b = buddies[bsel] || { fc: FACE[0], bc: BODY[3], ey: 0, mo: 0, acc: 0 },
    t = now / 1000;
  drawBuddy(
    x,
    {
      x: c.width / 2,
      y: c.height * 0.86,
      st: t % 5 < 1.8 ? 'wave' : 'idle',
      v: 0,
      t0: 0,
      ph: 0,
      c: 0,
      lx: Math.sin(t * 0.8) * 0.7,
      ba: 0,
      ...b,
      name: '',
    },
    t,
    9,
    false,
  );
  requestAnimationFrame(bmFrame);
}
function openBuddies() {
  if (!buddies.length) {
    buddies.push(bNew());
    bSave();
  }
  bsel = Math.min(bsel, buddies.length - 1);
  bUi();
  $('#bdlg').showModal();
  bmOn = true;
  requestAnimationFrame(bmFrame);
}
$('#bdlg').addEventListener('close', () => {
  bmOn = false;
});
$('#b_n').oninput = () => {
  const b = buddies[bsel];
  if (!b) return;
  b.name = $('#b_n').value.slice(0, 14);
  bSave();
  const e = $('#b_list').children[bsel];
  if (e) e.lastChild.textContent = b.name || 'Buddy';
};
$('#b_new').onclick = () => {
  if (buddies.length >= 12) return;
  buddies.push(bNew());
  bsel = buddies.length - 1;
  bSave();
  bUi();
};
$('#b_del').onclick = () => {
  if (!buddies[bsel]) return;
  buddies.splice(bsel, 1);
  bsel = Math.max(0, bsel - 1);
  bSave();
  bUi();
};
$('#b_x').onclick = () => $('#bdlg').close();
$('#obud').onclick = openBuddies;
$('#wbud').onclick = openBuddies;
