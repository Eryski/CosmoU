// CosmoU – Notes: little sticky notes for yourself (the Wii U Look's Notes button, js/wiiu-dock.js).
// Kept in this computer's CosmoU (localStorage cosmou.notes), at most 60, each up to 500 characters.
const NT_MAX = 60,
  NT_LEN = 500,
  NT_COLS = ['#ffe27a', '#ffc2a8', '#bfe9b4', '#b9dcff', '#e3c8ff'];
let notes = [];
try {
  const l = JSON.parse(localStorage.getItem('cosmou.notes') || '[]');
  if (Array.isArray(l)) notes = l.filter(n => n && typeof n.t === 'string').slice(0, NT_MAX);
} catch {}
function ntSave() {
  try {
    localStorage.setItem('cosmou.notes', JSON.stringify(notes.filter(n => n.t.trim() || n.id === ntNew)));
  } catch {}
}
let ntNew = '';
function ntUi() {
  const box = $('#nt_list');
  box.replaceChildren();
  if (!notes.length) {
    const e = document.createElement('p');
    e.className = 'nt-empty';
    e.textContent = 'No notes yet – press “New note”.';
    box.append(e);
  }
  for (const n of notes) {
    const c = document.createElement('div'),
      t = document.createElement('textarea'),
      tools = document.createElement('div'),
      col = document.createElement('button'),
      del = document.createElement('button'),
      when = document.createElement('small');
    c.className = 'nt';
    c.style.setProperty('--nc', NT_COLS[n.c % NT_COLS.length] || NT_COLS[0]);
    t.maxLength = NT_LEN;
    t.value = n.t;
    t.placeholder = 'Write something…';
    t.setAttribute('aria-label', 'Note');
    t.oninput = () => {
      n.t = t.value.slice(0, NT_LEN);
      n.at = Date.now();
      ntSave();
    };
    tools.className = 'nt-tools';
    when.textContent = new Date(n.at || Date.now()).toLocaleDateString();
    col.type = del.type = 'button';
    col.className = 'nt-b';
    col.title = 'Colour';
    col.setAttribute('aria-label', 'Another colour');
    col.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
    col.onclick = () => {
      n.c = ((n.c || 0) + 1) % NT_COLS.length;
      c.style.setProperty('--nc', NT_COLS[n.c]);
      ntSave();
    };
    del.className = 'nt-b';
    del.title = 'Delete';
    del.setAttribute('aria-label', 'Delete the note');
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M10 7V5h4v2M8 7l1 12h6l1-12"/></svg>';
    del.onclick = () => {
      notes = notes.filter(x => x !== n);
      ntSave();
      ntUi();
      blip('back');
    };
    tools.append(when, col, del);
    c.append(t, tools);
    box.append(c);
  }
}
function openStickies() {
  ntUi();
  $('#notedlg').showModal();
  const first = $('#nt_list textarea');
  if (first) first.focus();
}
$('#nt_add').onclick = () => {
  if (notes.length >= NT_MAX) return toast('That is a lot of notes – delete one first', 3000);
  const n = { id: Date.now().toString(36), t: '', c: notes.length % NT_COLS.length, at: Date.now() };
  ntNew = n.id;
  notes.unshift(n);
  ntSave();
  ntUi();
  $('#nt_list textarea').focus();
  blip('open');
};
$('#nt_x').onclick = () => $('#notedlg').close();
// (an empty note goes when the window closes)
$('#notedlg').addEventListener('close', () => {
  ntNew = '';
  notes = notes.filter(n => n.t.trim());
  ntSave();
});
