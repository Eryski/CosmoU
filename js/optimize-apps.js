// CosmoU – Auto-optimize per game and "other apps" (emulators, PC games) in the library.
// --- Auto-optimize ---
$('#dao').onclick = async () => {
  const g = cur();
  if (!g) return;
  const gpu = gpuName(),
    b = $('#dao');
  b.disabled = true;
  const bl = b.querySelector('b') || b;
  bl.textContent = 'Optimizing…';
  let r;
  if (window.api) r = await api.autoOptimize(g.tid || '', g.name, g.tid || g.name, gpu);
  else {
    r = {
      tier: 'mid',
      preset: 'Quality',
      done: [
        'Quick quality: Quality (1920×1080)',
        'Graphics API: Vulkan',
        'Async shader compile: on',
        'Resolution pack on',
        'FPS++ on',
      ],
      skipped: [],
    };
    cfg.gameSettings = { ...(cfg.gameSettings || {}), [g.tid || g.name]: 'Quality' };
    if (gp.demo) {
      gp.demo.packs[0].enabled = true;
      gp.demo.packs[2].enabled = true;
    }
  }
  b.disabled = false;
  bl.textContent = 'Auto-optimize';
  if (r.settings) cfg = r.settings;
  if (sel !== g.name) return;
  qTiles(g);
  gpSummary(g);
  const box = $('#daor');
  box.replaceChildren();
  const h = document.createElement('b');
  h.textContent =
    'Optimized for ' +
    (gpu || 'your PC') +
    ({ high: ' · strong graphics card', mid: '', low: ' · lighter settings', unknown: '' }[r.tier] || '');
  box.append(h);
  for (const t of r.done) {
    const d = document.createElement('div');
    d.textContent = t;
    box.append(d);
  }
  for (const t of r.skipped) {
    const d = document.createElement('div');
    d.className = 'sk';
    d.textContent = t;
    box.append(d);
  }
  box.hidden = false;
};
// --- Other apps ---
let appEd = {};
async function openApp(g) {
  appEd = {};
  if (g && g.appId && window.api) {
    const a = await api.appGet(g.appId);
    if (a) appEd = { id: a.id, path: a.path, name: a.name, args: a.args, coverUrl: a.coverUrl };
  }
  $('#apt').textContent = appEd.id ? 'Edit app' : 'Add app';
  $('#app_rm').hidden = !appEd.id;
  appUi();
  $('#appdlg').showModal();
}
function appUi() {
  $('#app_p').textContent = appEd.path || 'No program chosen';
  $('#app_n').value = appEd.name || '';
  $('#app_a').value = appEd.args || '';
  $('#app_c').textContent = appEd.coverFile
    ? appEd.coverFile.split(/[\\/]/).pop()
    : appEd.coverUrl
      ? 'Custom image'
      : 'Generated from the name';
}
const appKeep = () => {
  appEd.name = $('#app_n').value;
  appEd.args = $('#app_a').value;
};
$('#app_pick').onclick = async () => {
  if (!need()) return;
  appKeep();
  const r = await api.appPick();
  if (r) {
    appEd.path = r.path;
    if (!appEd.name) appEd.name = r.name;
    appUi();
  }
};
$('#app_cov').onclick = async () => {
  if (!need()) return;
  appKeep();
  const f = await api.appCoverPick();
  if (f) {
    appEd.coverFile = f;
    appUi();
  }
};
$('#app_s').onclick = async () => {
  if (!need()) return;
  appKeep();
  const r = await api.appSave(appEd);
  if (!r.ok) {
    toast(r.error);
    return;
  }
  $('#appdlg').close();
  if ($('#det').open) $('#det').close();
  await load();
  toast('Saved to your library.');
};
$('#app_rm').onclick = async () => {
  if (!need() || !appEd.id) return;
  await api.appRemove(appEd.id);
  $('#appdlg').close();
  if ($('#det').open) $('#det').close();
  await load();
  toast('Removed from your library.');
};
$('#app_x').onclick = () => $('#appdlg').close();
$('#addapp').onclick = () => {
  if (need()) openApp(null);
};
$('#dedit').onclick = () => openApp(cur());
