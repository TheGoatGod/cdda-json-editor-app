const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('cddaDesktop', {
  onCommand(callback) {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('native-command', (_event, command) => callback(command));
  },
  getPathForFile(file) {
    try {
      return webUtils.getPathForFile(file) || null;
    } catch (error) {
      return null;
    }
  },
  saveJSON(payload) {
    return ipcRenderer.invoke('save-json', payload);
  },
  readTextFile(filePath) {
    return ipcRenderer.invoke('read-text-file', filePath);
  },
  getFileFingerprints(files) {
    return ipcRenderer.invoke('get-file-fingerprint', files);
  },
  writeProjectFile(payload) {
    return ipcRenderer.invoke('write-project-file', payload);
  }
});
