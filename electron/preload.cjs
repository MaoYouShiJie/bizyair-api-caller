const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  selectFolder: () => ipcRenderer.invoke('select-folder'),
});
