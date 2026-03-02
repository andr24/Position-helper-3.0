const { ipcRenderer } = require('electron');

window.selectDirectory = () => ipcRenderer.invoke('select-directory');
window.isElectron = true;
