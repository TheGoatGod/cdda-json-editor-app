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

function withJsonExtension(filePath) {
  return /\.json$/i.test(filePath) ? filePath : `${filePath}.json`;
}

async function chooseSaveAs(defaultPath) {
  let suggestedPath = defaultPath;
  while (true) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save JSON As',
      defaultPath: suggestedPath,
      filters: [{ name: 'JSON files', extensions: ['json'] }, { name: 'All files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) return null;

    const chosenPath = withJsonExtension(result.filePath);
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
  let chosenPath = null;

  if (requestedPath && await fileExists(requestedPath)) {
    const decision = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Override', 'Save As', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Save JSON',
      message: `${path.basename(requestedPath)} already exists.`,
      detail: 'Override the opened file, or use Save As to write a new copy.'
    });
    if (decision.response === 0) chosenPath = requestedPath;
    else if (decision.response === 1) chosenPath = await chooseSaveAs(requestedPath);
    else return { canceled: true };
  } else {
    const defaultPath = requestedPath || path.join(app.getPath('documents'), defaultName);
    chosenPath = await chooseSaveAs(defaultPath);
  }

  if (!chosenPath) return { canceled: true };

  try {
    await fs.writeFile(chosenPath, text, 'utf8');
    return { ok: true, filePath: chosenPath, fileName: path.basename(chosenPath) };
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0f172a',
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
        { label: 'Save JSON', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save-json') },
        { label: 'Save JSON As', click: () => sendCommand('save-json-as') },
        { label: 'Save all', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-all') },
        { label: 'Restore previous save', accelerator: 'CmdOrCtrl+Alt+R', click: () => sendCommand('restore-backup') },
        { type: 'separator' },
        { label: 'Open folder as project', click: () => sendCommand('open-folder') },
        { label: 'Toggle Projects panel', click: () => sendCommand('toggle-projects') },
        { type: 'separator' },
        { label: 'Close editor tab', accelerator: 'CmdOrCtrl+Shift+W', click: () => sendCommand('close-tab') },
        { label: 'New editor tab', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendCommand('new-tab') },
        { type: 'separator' },
        { role: 'quit' }
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
        { label: 'Find and replace', accelerator: 'CmdOrCtrl+H', click: () => sendCommand('replace') }
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
