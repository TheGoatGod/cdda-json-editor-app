const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');

let mainWindow;

function sendCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('native-command', command);
  }
}

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
        { label: 'Save all', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-all') },
        { label: 'Restore previous save', accelerator: 'CmdOrCtrl+Alt+R', click: () => sendCommand('restore-backup') },
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
