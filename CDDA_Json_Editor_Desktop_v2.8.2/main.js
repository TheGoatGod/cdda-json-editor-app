const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

let mainWindow;

function sendCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('native-command', command);
  }
}

async function fileExists(filePath) {
  if (!filePath || !path.isAbsolute(filePath)) return false;
  try {
    return (await fs.stat(filePath)).isFile();
  } catch (error) {
    return false;
  }
}

function fingerprint(stat) {
  return `${stat.size}:${Math.trunc(stat.mtimeMs)}`;
}

async function fileFingerprint(filePath) {
  if (!filePath || !path.isAbsolute(filePath)) return null;
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? fingerprint(stat) : null;
  } catch (error) {
    return null;
  }
}

function offlineSnapshotFile() {
  return path.join(app.getPath('userData'), 'offline-game-data-index.json');
}

function collectSnapshotDefinitions(value, relativePath, byType) {
  const visit = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.type === 'string') {
      const type = entry.type.toLowerCase();
      const ids = Array.isArray(entry.id) ? entry.id : [entry.id];
      if (!byType.has(type)) byType.set(type, new Map());
      const typeRecords = byType.get(type);
      ids.concat(typeof entry.abstract === 'string' ? [entry.abstract] : []).forEach(id => {
        if (typeof id !== 'string' || !id.trim() || typeRecords.has(id)) return;
        const nameValue = entry.name;
        const label = typeof nameValue === 'string' ? nameValue : (nameValue && typeof nameValue === 'object' ? nameValue.str : '');
        const description = typeof entry.description === 'string' ? entry.description : '';
        typeRecords.set(id, { id, file: relativePath, preview: String(label || description || '').replace(/\s+/g, ' ').slice(0, 180) });
      });
    }
    Object.values(entry).forEach(child => {
      if (child && typeof child === 'object') visit(child);
    });
  };
  visit(value);
}

async function readOfflineSnapshot() {
  try {
    return JSON.parse(await fs.readFile(offlineSnapshotFile(), 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

ipcMain.handle('get-offline-snapshot', async () => {
  try { return { ok: true, snapshot: await readOfflineSnapshot() }; }
  catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not load offline data index' }; }
});

ipcMain.handle('remove-offline-snapshot', async () => {
  try {
    await fs.rm(offlineSnapshotFile(), { force: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Could not remove offline data index' };
  }
});

ipcMain.handle('import-offline-snapshot', async () => {
  const selected = await dialog.showOpenDialog(mainWindow, {
    title: 'Import CDDA JSON data snapshot',
    buttonLabel: 'Index JSON data',
    properties: ['openDirectory']
  });
  if (selected.canceled || !selected.filePaths.length) return { canceled: true };

  const root = selected.filePaths[0];
  const byType = new Map();
  const maxFiles = 150000;
  const maxFileBytes = 32 * 1024 * 1024;
  let scanned = 0;
  let parsed = 0;
  let skipped = 0;
  let stoppedAtLimit = false;

  const visitDirectory = async (directory, depth = 0) => {
    if (depth > 80 || stoppedAtLimit) return;
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { skipped += 1; return; }
    for (const entry of entries) {
      if (stoppedAtLimit) break;
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visitDirectory(absolutePath, depth + 1);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') continue;
      scanned += 1;
      if (scanned > maxFiles) { stoppedAtLimit = true; break; }
      try {
        const stat = await fs.stat(absolutePath);
        if (stat.size > maxFileBytes) { skipped += 1; continue; }
        const source = await fs.readFile(absolutePath, 'utf8');
        const value = JSON.parse(source);
        const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
        collectSnapshotDefinitions(value, relativePath, byType);
        parsed += 1;
      } catch (error) { skipped += 1; }
      if (scanned % 250 === 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('offline-snapshot-progress', { scanned, parsed, skipped });
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  };

  try {
    await visitDirectory(root);
    const definitionsByType = {};
    let definitionCount = 0;
    byType.forEach((records, type) => {
      definitionsByType[type] = Array.from(records.values());
      definitionCount += records.size;
    });
    const snapshot = {
      version: 1,
      rootName: path.basename(root),
      importedAt: new Date().toISOString(),
      scannedFiles: Math.min(scanned, maxFiles),
      parsedFiles: parsed,
      skippedFiles: skipped,
      truncated: stoppedAtLimit,
      definitionCount,
      definitionsByType
    };
    const destination = offlineSnapshotFile();
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(snapshot), 'utf8');
      await fs.rename(temporary, destination);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    return { ok: true, snapshot };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Could not index selected JSON data' };
  }
});

async function writeTextSafely(filePath, text, createBackup) {
  const exists = await fileExists(filePath);
  if (createBackup && exists) await fs.copyFile(filePath, `${filePath}.bak`);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, text, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
  const stat = await fs.stat(filePath);
  return fingerprint(stat);
}

function safeExtension(defaultName) {
  const extension = path.extname(path.basename(defaultName || '')).slice(1).toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : 'json';
}

function withExtension(filePath, extension) {
  return path.extname(filePath).toLowerCase() === `.${extension}` ? filePath : `${filePath}.${extension}`;
}

async function chooseSaveAs(defaultPath, extension = 'json') {
  let suggestedPath = defaultPath;
  while (true) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Save ${extension.toUpperCase()} As`,
      defaultPath: suggestedPath,
      filters: [{ name: `${extension.toUpperCase()} files`, extensions: [extension] }, { name: 'All files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) return null;

    const chosenPath = withExtension(result.filePath, extension);
    if (!(await fileExists(chosenPath))) return chosenPath;

    const overwrite = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Override', 'Choose another', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'File already exists',
      message: `${path.basename(chosenPath)} already exists.`,
      detail: 'Choose Override to replace it, or Choose another to select a different filename.'
    });
    if (overwrite.response === 0) return chosenPath;
    if (overwrite.response === 2) return null;
    suggestedPath = chosenPath;
  }
}

ipcMain.handle('save-json', async (_event, payload = {}) => {
  const text = typeof payload.text === 'string' ? payload.text : '';
  const requestedPath = typeof payload.filePath === 'string' && path.isAbsolute(payload.filePath)
    ? payload.filePath
    : null;
  const defaultName = path.basename(
    typeof payload.defaultName === 'string' && payload.defaultName ? payload.defaultName : 'untitled.json'
  );
  const extension = safeExtension(defaultName);
  let chosenPath = null;
  const backupBeforeSave = Boolean(payload.backupBeforeSave);

  if (requestedPath && await fileExists(requestedPath)) {
    const currentFingerprint = await fileFingerprint(requestedPath);
    if (payload.fingerprint && currentFingerprint && payload.fingerprint !== currentFingerprint) {
      const decision = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Save As', 'Overwrite changed file', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'File changed outside the editor',
        message: `${path.basename(requestedPath)} has changed on disk since it was opened.`,
        detail: 'Save As keeps the external version safe. Overwrite changed file replaces it with your editor contents.'
      });
      if (decision.response === 0) chosenPath = await chooseSaveAs(requestedPath, extension);
      else if (decision.response === 1) chosenPath = requestedPath;
      else return { canceled: true };
    } else {
      const decision = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Override', 'Save As', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: `Save ${extension.toUpperCase()}`,
        message: `${path.basename(requestedPath)} already exists.`,
        detail: 'Override the opened file, or use Save As to write a new copy.'
      });
      if (decision.response === 0) chosenPath = requestedPath;
      else if (decision.response === 1) chosenPath = await chooseSaveAs(requestedPath, extension);
      else return { canceled: true };
    }
  } else {
    const defaultPath = requestedPath || path.join(app.getPath('documents'), defaultName);
    chosenPath = await chooseSaveAs(defaultPath, extension);
  }

  if (!chosenPath) return { canceled: true };

  try {
    const nextFingerprint = await writeTextSafely(chosenPath, text, backupBeforeSave);
    return { ok: true, filePath: chosenPath, fileName: path.basename(chosenPath), fingerprint: nextFingerprint };
  } catch (error) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Could not save JSON',
      message: `Unable to save ${path.basename(chosenPath)}.`,
      detail: error && error.message ? error.message : 'The file could not be written.'
    });
    return { ok: false, error: error && error.message ? error.message : 'Save failed' };
  }
});

ipcMain.handle('read-text-file', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return { ok: false, error: 'Invalid file path' };
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return { ok: false, error: 'Path is not a file' };
    return { ok: true, text: await fs.readFile(filePath, 'utf8'), fingerprint: fingerprint(stat), size: stat.size };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Unable to read file' };
  }
});

ipcMain.handle('get-file-fingerprint', async (_event, filePaths = []) => {
  if (!Array.isArray(filePaths)) return [];
  return Promise.all(filePaths.slice(0, 300).map(async item => ({
    id: item && item.id,
    filePath: item && item.filePath,
    fingerprint: await fileFingerprint(item && item.filePath)
  })));
});

ipcMain.handle('write-project-file', async (_event, payload = {}) => {
  const filePath = typeof payload.filePath === 'string' && path.isAbsolute(payload.filePath) ? payload.filePath : null;
  if (!filePath || typeof payload.text !== 'string') return { ok: false, error: 'Invalid save request' };
  try {
    const currentFingerprint = await fileFingerprint(filePath);
    if (!currentFingerprint) return { ok: false, error: 'File no longer exists' };
    if (payload.expectedFingerprint && currentFingerprint !== payload.expectedFingerprint) {
      return { ok: false, conflict: true, fingerprint: currentFingerprint, error: 'File changed on disk; reload it before applying project-wide replacements.' };
    }
    const nextFingerprint = await writeTextSafely(filePath, payload.text, Boolean(payload.backupBeforeSave));
    return { ok: true, fingerprint: nextFingerprint };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Unable to save file' };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'json-app-icon-real-json.ico'),
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'cdda_json_color_editor_local_formatter.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

function installMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open JSON', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('open-json') },
        { label: 'Quick Open project file', accelerator: 'CmdOrCtrl+P', click: () => sendCommand('quick-open') },
        { label: 'Go to line', accelerator: 'CmdOrCtrl+G', click: () => sendCommand('go-to-line') },
        { label: 'Save JSON', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save-json') },
        { label: 'Save JSON As', click: () => sendCommand('save-json-as') },
        { label: 'Save all', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-all') },
        { label: 'Restore previous save', accelerator: 'CmdOrCtrl+Alt+R', click: () => sendCommand('restore-backup') },
        { type: 'separator' },
        { label: 'Open folder as project', click: () => sendCommand('open-folder') },
        { label: 'Toggle Projects panel', click: () => sendCommand('toggle-projects') },
        { type: 'separator' },
        { label: 'Validate project JSON', click: () => sendCommand('validate-project') },
        { label: 'Search project files', click: () => sendCommand('search-project') },
        { label: 'Find ID references', click: () => sendCommand('find-project-references') },
        { label: 'Browse project IDs', click: () => sendCommand('browse-project-ids') },
        { type: 'separator' },
        { label: 'Close editor tab', accelerator: 'CmdOrCtrl+Shift+W', click: () => sendCommand('close-tab') },
        { label: 'New editor tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendCommand('new-tab') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        { label: 'Open settings…', click: () => sendCommand('open-settings') }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendCommand('find') },
        { label: 'Find and replace', accelerator: 'CmdOrCtrl+H', click: () => sendCommand('replace') },
        { label: 'Copy JSON Pointer at cursor', accelerator: 'CmdOrCtrl+Shift+C', click: () => sendCommand('copy-json-path') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  installMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
