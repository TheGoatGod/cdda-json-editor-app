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
  },
  importOfflineSnapshot() {
    return ipcRenderer.invoke('import-offline-snapshot');
  },
  getOfflineSnapshot() {
    return ipcRenderer.invoke('get-offline-snapshot');
  },
  getValidationHistory() {
    return ipcRenderer.invoke('get-validation-history');
  },
  saveValidationHistory(history) {
    return ipcRenderer.invoke('save-validation-history', history);
  },
  removeOfflineSnapshot(snapshotId) {
    return ipcRenderer.invoke('remove-offline-snapshot', snapshotId);
  },
  activateOfflineSnapshot(snapshotId) {
    return ipcRenderer.invoke('activate-offline-snapshot', snapshotId);
  },
  refreshOfflineSnapshot(snapshotId) {
    return ipcRenderer.invoke('refresh-offline-snapshot', snapshotId);
  },
  onOfflineSnapshotProgress(callback) {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('offline-snapshot-progress', (_event, progress) => callback(progress));
  }
});
