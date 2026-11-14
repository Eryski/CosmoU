// CosmoU – the bar of CosmoU's own browser window (browser.html): back, forward, reload, home, the address.
// Only these few messages go to the main process; the pages themselves get nothing from CosmoU.
const { contextBridge, ipcRenderer: r } = require('electron');
contextBridge.exposeInMainWorld('web', {
  go: url => r.send('web:go', String(url || '')),
  back: () => r.send('web:back'),
  fwd: () => r.send('web:fwd'),
  reload: () => r.send('web:reload'),
  home: () => r.send('web:home'),
  onState: fn => r.on('web:state', (_, s) => fn(s)),
});
