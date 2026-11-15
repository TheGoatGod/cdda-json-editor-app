const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

let mainWindow;
let pendingOpenPaths = [];
const hasSingleInstanceLock = app.requestSingleInstanceLock();

function getJsonPathsFromArgs(args, workingDirectory = process.cwd()) {
  const paths = [];
  const seen = new Set();
  for (const argument of args || []) {
    if (typeof argument !== 'string' || argument.startsWith('--') || path.extname(argument).toLowerCase() !== '.json') continue;
    const filePath = path.resolve(workingDirectory, argument);
    const key = process.platform === 'win32' ? filePath.toLowerCase() : filePath;
    if (!seen.has(key)) {
      seen.add(key);
      paths.push(filePath);
    }
  }
  return paths.slice(0, 100);
}

function openJsonPaths(filePaths) {
  const normalized = getJsonPathsFromArgs(filePaths);
  if (!normalized.length) return;
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) {
    pendingOpenPaths = [...new Set([...pendingOpenPaths, ...normalized])].slice(0, 100);
  } else {
    mainWindow.webContents.send('open-json-paths', normalized);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    openJsonPaths(getJsonPathsFromArgs(argv, workingDirectory));
  });
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    openJsonPaths([filePath]);
  });
} else {
  app.quit();
}

async function registerJsonOpenWith() {
  if (process.platform !== 'win32') return { ok: false, error: 'Default JSON app registration is currently supported on Windows.' };
  try {
    const executablePath = app.getPath('exe');
    const executableName = path.basename(executablePath);
    const progId = 'CDDAJsonEditor.Json';
    const capabilitiesPath = 'Software\\CDDA JSON Editor\\Capabilities';
    const commandParts = [executablePath];
    if (!app.isPackaged) commandParts.push(path.join(__dirname, 'main.js'));
    commandParts.push('%1');
    const openCommand = commandParts.map(part => `"${part.replaceAll('"', '\\"')}"`).join(' ');
    const iconValue = `"${executablePath}",0`;
    const values = [
      ['HKCU\\Software\\Classes\\.json\\OpenWithProgids', progId, 'REG_NONE'],
      [`HKCU\\Software\\Classes\\${progId}`, null, 'REG_SZ', 'CDDA JSON file'],
      [`HKCU\\Software\\Classes\\${progId}\\DefaultIcon`, null, 'REG_SZ', iconValue],
      [`HKCU\\Software\\Classes\\${progId}\\shell\\open\\command`, null, 'REG_SZ', openCommand],
      [`HKCU\\Software\\Classes\\Applications\\${executableName}\\SupportedTypes`, '.json', 'REG_SZ', ''],
      [`HKCU\\Software\\Classes\\Applications\\${executableName}\\shell\\open\\command`, null, 'REG_SZ', openCommand],
      [`HKCU\\${capabilitiesPath}`, 'ApplicationName', 'REG_SZ', 'CDDA JSON Editor'],
      [`HKCU\\${capabilitiesPath}`, 'ApplicationDescription', 'REG_SZ', 'Edit and validate Cataclysm: Dark Days Ahead JSON files.'],
      [`HKCU\\${capabilitiesPath}\\FileAssociations`, '.json', 'REG_SZ', progId],
      ['HKCU\\Software\\RegisteredApplications', 'CDDA JSON Editor', 'REG_SZ', capabilitiesPath]
    ];
    for (const [key, valueName, type, data] of values) {
      const args = ['add', key, valueName === null ? '/ve' : '/v', ...(valueName === null ? [] : [valueName]), '/t', type];
      if (data !== undefined) args.push('/d', data);
      args.push('/f');
      await execFileAsync('reg.exe', args, { windowsHide: true });
    }
    const settingsUri = `ms-settings:defaultapps?registeredAppUser=${encodeURIComponent('CDDA JSON Editor')}`;
    await shell.openExternal(settingsUri);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : 'Could not register the app with Windows.' };
  }
}

ipcMain.handle('register-json-open-with', registerJsonOpenWith);

const MAX_GIT_DIFF_BYTES = 8 * 1024 * 1024;

async function resolveGitProjectRoot(folderPath) {
  if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath)) throw new Error('Choose an opened project folder first.');
  const absolutePath = path.resolve(folderPath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isDirectory()) throw new Error('The selected project path is not a folder.');
  const { stdout } = await execFileAsync('git', ['-C', absolutePath, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8', timeout: 15000, windowsHide: true, maxBuffer: 1024 * 1024
  });
  return path.resolve(stdout.trim());
}

async function runGitAtRoot(root, args, options = {}) {
  return execFileAsync('git', ['-C', root, ...args], {
    encoding: options.encoding || 'utf8', timeout: 30000, windowsHide: true,
    maxBuffer: MAX_GIT_DIFF_BYTES + 1024 * 1024
  });
}

function validateGitRelativePath(root, filePath) {
  if (typeof filePath !== 'string' || !filePath.trim() || path.isAbsolute(filePath)) throw new Error('Select a file from the Git change list.');
  const normalized = filePath.replace(/[\\/]+/g, path.sep);
  const absolutePath = path.resolve(root, normalized);
  const relative = path.relative(root, absolutePath);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('The selected path is outside this project.');
  return relative;
}

async function getGitStatus(root) {
  const { stdout } = await runGitAtRoot(root, ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all']);
  const records = stdout.split('\0').filter(Boolean);
  const header = records.shift() || '';
  const branch = header.startsWith('## ') ? header.slice(3).split('...')[0] : 'HEAD';
  const files = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4) continue;
    const code = record.slice(0, 2);
    let filePath = record.slice(3);
    if (code.includes('R') || code.includes('C')) index += 1;
    filePath = filePath.replace(/\\/g, '/');
    files.push({
      path: filePath,
      code,
      staged: code[0] !== ' ' && code[0] !== '?',
      unstaged: code[1] !== ' ',
      untracked: code === '??',
      deleted: code.includes('D'),
      renamed: code.includes('R') || code.includes('C')
    });
  }
  return { branch, files };
}

ipcMain.handle('git-review-status', async (_event, folderPath) => {
  try {
    const root = await resolveGitProjectRoot(folderPath);
    const status = await getGitStatus(root);
    return { ok: true, root, branch: status.branch, files: status.files };
  } catch (error) {
    const missingGit = error && (error.code === 'ENOENT' || /not a git repository/i.test(error.message || ''));
    return { ok: false, error: missingGit && error.code === 'ENOENT' ? 'Git was not found. Install Git for Windows to use change review.' : (error?.message || 'Could not read Git status.') };
  }
});

ipcMain.handle('git-review-diff', async (_event, payload = {}) => {
  try {
    const root = await resolveGitProjectRoot(payload.rootPath);
    const filePath = validateGitRelativePath(root, payload.filePath);
    const status = await getGitStatus(root);
    const change = status.files.find(item => item.path === filePath.split(path.sep).join('/'));
    if (!change) return { ok: false, error: 'That file is no longer in the Git change list. Refresh and try again.' };
    if (change.untracked) {
      const absolutePath = path.resolve(root, filePath);
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) return { ok: false, error: 'The selected path is not a file.' };
      if (stat.size > MAX_GIT_DIFF_BYTES) return { ok: false, error: 'Untracked file is over the 8 MB preview limit. Stage it to include it in a Git diff.' };
      const text = await fs.readFile(absolutePath, 'utf8');
      const lines = text.split(/\r?\n/).map(line => `+${line}`).join('\n');
      return { ok: true, diff: `New untracked file: ${filePath.split(path.sep).join('/')}\n${lines}`, kind: 'untracked' };
    }
    const args = ['diff', '--no-ext-diff', '--no-color', '--unified=3'];
    if (payload.staged) args.push('--cached');
    args.push('--', filePath.split(path.sep).join('/'));
    const { stdout } = await runGitAtRoot(root, args);
    return { ok: true, diff: stdout || 'No differences in this view.', kind: payload.staged ? 'staged' : 'working' };
  } catch (error) {
    const missingGit = error && error.code === 'ENOENT';
    return { ok: false, error: missingGit ? 'Git was not found. Install Git for Windows to use change review.' : (error?.message || 'Could not read the selected diff.') };
  }
});

ipcMain.handle('git-review-stage', async (_event, payload = {}) => {
  try {
    const root = await resolveGitProjectRoot(payload.rootPath);
    if (payload.all === true) await runGitAtRoot(root, ['add', '-A']);
    else await runGitAtRoot(root, ['add', '--', validateGitRelativePath(root, payload.filePath)]);
    return { ok: true, ...(await getGitStatus(root)) };
  } catch (error) {
    const missingGit = error && error.code === 'ENOENT';
    return { ok: false, error: missingGit ? 'Git was not found. Install Git for Windows to use change review.' : (error?.message || 'Could not stage changes.') };
  }
});

ipcMain.handle('git-review-unstage', async (_event, payload = {}) => {
  try {
    const root = await resolveGitProjectRoot(payload.rootPath);
    const filePath = validateGitRelativePath(root, payload.filePath);
    try {
      await runGitAtRoot(root, ['reset', '--quiet', 'HEAD', '--', filePath]);
    } catch (error) {
      if (!/ambiguous argument 'HEAD'|unknown revision.*HEAD/i.test(error?.stderr || error?.message || '')) throw error;
      await runGitAtRoot(root, ['rm', '--cached', '--', filePath]);
    }
    return { ok: true, ...(await getGitStatus(root)) };
  } catch (error) {
    const missingGit = error && error.code === 'ENOENT';
    return { ok: false, error: missingGit ? 'Git was not found. Install Git for Windows to use change review.' : (error?.message || 'Could not unstage this file.') };
  }
});

ipcMain.handle('git-review-commit', async (_event, payload = {}) => {
  try {
    const root = await resolveGitProjectRoot(payload.rootPath);
    const message = typeof payload.message === 'string' ? payload.message.trim().slice(0, 500) : '';
    if (!message) return { ok: false, error: 'Enter a commit message first.' };
    const { stdout } = await runGitAtRoot(root, ['commit', '-m', message]);
    return { ok: true, output: stdout, ...(await getGitStatus(root)) };
  } catch (error) {
    const missingGit = error && error.code === 'ENOENT';
    return { ok: false, error: missingGit ? 'Git was not found. Install Git for Windows to use change review.' : (error?.stderr || error?.message || 'Could not commit staged changes.') };
  }
});

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

function validationHistoryFile() {
  return path.join(app.getPath('userData'), 'project-validation-history.json');
}

ipcMain.handle('get-validation-history', async () => {
  try {
    const history = JSON.parse(await fs.readFile(validationHistoryFile(), 'utf8'));
    return { ok: true, history: Array.isArray(history) ? history : [] };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { ok: true, history: [] };
    return { ok: false, error: error && error.message ? error.message : 'Could not load validation history' };
  }
});

ipcMain.handle('save-validation-history', async (_event, history) => {
  try {
    const safeHistory = Array.isArray(history) ? history.filter(run => run && typeof run.id === 'string' && Array.isArray(run.issues)).slice(0, 20) : [];
    const serialized = JSON.stringify(safeHistory);
    if (Buffer.byteLength(serialized, 'utf8') > 64 * 1024 * 1024) return { ok: false, error: 'Validation history exceeds the 64 MB safety limit.' };
    const destination = validationHistoryFile();
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temporary, serialized, 'utf8');
      await fs.rename(temporary, destination);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    return { ok: true, count: safeHistory.length };
  } catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not save validation history' }; }
});

function collectSnapshotDefinitions(value, relativePath, byType, fieldCatalogByType) {
  const visit = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.type === 'string') {
      const type = entry.type.toLowerCase();
      if (!fieldCatalogByType.has(type)) fieldCatalogByType.set(type, new Map());
      const fields = fieldCatalogByType.get(type);
      Object.entries(entry).forEach(([field, fieldValue]) => {
        if (!fields.has(field)) fields.set(field, new Map());
        const valueCounts = fields.get(field);
        if (['id', 'abstract', 'name', 'description', 'copy-from', 'snippet', 'text', 'message', 'ascii_art'].includes(field) || /(?:^|_)id$/.test(field)) return;
        const observedValues = typeof fieldValue === 'string' ? [fieldValue] : (Array.isArray(fieldValue) ? fieldValue : []);
        observedValues.forEach(observed => {
          if (typeof observed !== 'string' || !observed.trim() || observed.length > 72 || /[\r\n\t]/.test(observed)) return;
          if (!valueCounts.has(observed) && valueCounts.size >= 500) return;
          valueCounts.set(observed, (valueCounts.get(observed) || 0) + 1);
        });
      });
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

function collectTypedDefinitions(value, relativePath, output) {
  const visit = entry => {
    if (Array.isArray(entry)) { entry.forEach(visit); return; }
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.type === 'string') {
      const ids = Array.isArray(entry.id) ? entry.id : [entry.id];
      if (typeof entry.abstract === 'string') ids.push(entry.abstract);
      ids.filter(id => typeof id === 'string' && id.trim()).forEach(id => {
        output.push({ type: entry.type.toLowerCase(), id, value: entry, file: relativePath });
      });
    }
    Object.values(entry).forEach(child => { if (child && typeof child === 'object') visit(child); });
  };
  visit(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function changedDefinitionFieldPaths(before, after, prefix = '', output = []) {
  if (output.length >= 1000 || canonicalJson(before) === canonicalJson(after)) return output;
  const beforeObject = before !== null && typeof before === 'object' && !Array.isArray(before);
  const afterObject = after !== null && typeof after === 'object' && !Array.isArray(after);
  if (beforeObject && afterObject) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    if (!keys.length && prefix) output.push(prefix);
    keys.forEach(key => changedDefinitionFieldPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key, output));
  } else if (prefix) output.push(prefix);
  return output;
}

async function readTypedDefinitionsFromFile(root, relativePath) {
  const absolutePath = path.resolve(root, ...String(relativePath).split('/'));
  const relativeCheck = path.relative(path.resolve(root), absolutePath);
  if (!relativeCheck || relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) return [];
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024) return [];
  const parsed = JSON.parse(await fs.readFile(absolutePath, 'utf8'));
  const output = [];
  collectTypedDefinitions(parsed, relativePath, output);
  return output;
}

async function compareOfflineSnapshots(oldSnapshot, newSnapshot) {
  if (!oldSnapshot?.sourcePath || !newSnapshot?.sourcePath || !oldSnapshot.fileHashes || !newSnapshot.fileHashes) {
    throw new Error('Refresh or re-import both snapshots first. File fingerprints are required to compare versions.');
  }
  const oldHashes = oldSnapshot.fileHashes;
  const newHashes = newSnapshot.fileHashes;
  const changedFiles = Array.from(new Set([...Object.keys(oldHashes), ...Object.keys(newHashes)]))
    .filter(file => oldHashes[file] !== newHashes[file]).sort();
  const oldDefinitions = new Map();
  const newDefinitions = new Map();
  const add = (map, definition) => {
    const key = `${definition.type}\u0000${definition.id}`;
    if (!map.has(key)) map.set(key, definition);
  };
  for (const file of changedFiles) {
    if (oldHashes[file]) {
      try { (await readTypedDefinitionsFromFile(oldSnapshot.sourcePath, file)).forEach(definition => add(oldDefinitions, definition)); }
      catch (error) { /* deleted or unreadable in this snapshot */ }
    }
    if (newHashes[file]) {
      try { (await readTypedDefinitionsFromFile(newSnapshot.sourcePath, file)).forEach(definition => add(newDefinitions, definition)); }
      catch (error) { /* deleted or unreadable in this snapshot */ }
    }
  }
  const changes = [];
  const keys = new Set([...oldDefinitions.keys(), ...newDefinitions.keys()]);
  for (const key of keys) {
    const before = oldDefinitions.get(key), after = newDefinitions.get(key);
    if (!before) changes.push({ status: 'added', type: after.type, id: after.id, file: after.file, changedFields: Object.keys(after.value).filter(field => !['type', 'id'].includes(field)).sort() });
    else if (!after) changes.push({ status: 'removed', type: before.type, id: before.id, file: before.file, changedFields: Object.keys(before.value).filter(field => !['type', 'id'].includes(field)).sort() });
    else {
      const fields = changedDefinitionFieldPaths(before.value, after.value).filter(field => !['type', 'id', 'abstract'].includes(field)).sort();
      if (fields.length) changes.push({ status: 'changed', type: after.type, id: after.id, file: after.file, changedFields: fields });
    }
    if (changes.length >= 20000) break;
  }
  return { oldVersion: oldSnapshot.detectedVersion || oldSnapshot.rootName, newVersion: newSnapshot.detectedVersion || newSnapshot.rootName, changedFiles: changedFiles.length, changes, truncated: changes.length >= 20000 };
}

async function readOfflineSnapshotStore() {
  try {
    const saved = JSON.parse(await fs.readFile(offlineSnapshotFile(), 'utf8'));
    if (saved && saved.version === 2 && Array.isArray(saved.snapshots)) {
      const activeSnapshotId = saved.snapshots.some(snapshot => snapshot.id === saved.activeSnapshotId)
        ? saved.activeSnapshotId
        : (saved.snapshots[0]?.id || null);
      return { version: 2, activeSnapshotId, snapshots: saved.snapshots.map(snapshot => ({ ...snapshot, active: snapshot.id === activeSnapshotId })) };
    }
    if (saved && saved.definitionsByType) {
      const legacy = { ...saved, id: 'legacy-offline-snapshot', detectedVersion: saved.detectedVersion || '', sourcePath: saved.sourcePath || '', active: true };
      return { version: 2, activeSnapshotId: legacy.id, snapshots: [legacy] };
    }
    return { version: 2, activeSnapshotId: null, snapshots: [] };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { version: 2, activeSnapshotId: null, snapshots: [] };
    throw error;
  }
}

async function writeOfflineSnapshotStore(store) {
  const destination = offlineSnapshotFile();
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(store), 'utf8');
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function detectGameVersion(root) {
  const candidates = [
    path.join(root, 'VERSION.txt'),
    path.join(root, '..', 'VERSION.txt'),
    path.join(root, '..', '..', 'VERSION.txt'),
    path.join(root, '..', '..', 'data', 'VERSION.txt'),
    path.join(root, 'version.txt')
  ];
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile() || stat.size > 100000) continue;
      const source = await fs.readFile(candidate, 'utf8');
      const version = source.match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/);
      if (version) return version[0];
    } catch (error) {}
  }
  return '';
}

async function buildOfflineSnapshot(root, previous = null) {
  const byType = new Map();
  const fieldCatalogByType = new Map();
  const fileHashes = {};
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
        fileHashes[relativePath] = crypto.createHash('sha256').update(source).digest('hex');
        collectSnapshotDefinitions(value, relativePath, byType, fieldCatalogByType);
        parsed += 1;
      } catch (error) { skipped += 1; }
      if (scanned % 250 === 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('offline-snapshot-progress', { scanned, parsed, skipped, rootName: path.basename(root) });
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  };

  await visitDirectory(root);
  const definitionsByType = {};
  let definitionCount = 0;
  byType.forEach((records, type) => {
    definitionsByType[type] = Array.from(records.values());
    definitionCount += records.size;
  });
  const fieldCatalog = {};
  fieldCatalogByType.forEach((fields, type) => {
    fieldCatalog[type] = {};
    fields.forEach((valueCounts, field) => {
      const commonValues = Array.from(valueCounts.entries())
        .filter(([, count]) => count >= 4)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 60)
        .map(([value]) => value);
      fieldCatalog[type][field] = commonValues;
    });
  });
  const detectedVersion = await detectGameVersion(root);
  return {
    ...(previous || {}),
    id: previous?.id || `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version: 2,
    rootName: path.basename(root),
    sourcePath: root,
    detectedVersion,
    importedAt: new Date().toISOString(),
    scannedFiles: Math.min(scanned, maxFiles),
    parsedFiles: parsed,
    skippedFiles: skipped,
    truncated: stoppedAtLimit,
    definitionCount,
    definitionsByType,
    fieldCatalogByType: fieldCatalog,
    fileHashes
  };
}

ipcMain.handle('compare-offline-snapshots', async (_event, payload = {}) => {
  try {
    const store = await readOfflineSnapshotStore();
    const oldSnapshot = store.snapshots.find(snapshot => snapshot.id === payload.oldSnapshotId);
    const newSnapshot = store.snapshots.find(snapshot => snapshot.id === payload.newSnapshotId);
    if (!oldSnapshot || !newSnapshot) throw new Error('Choose two snapshots that are still available.');
    return { ok: true, result: await compareOfflineSnapshots(oldSnapshot, newSnapshot) };
  } catch (error) { return { ok: false, error: error?.message || 'Could not compare snapshots' }; }
});

ipcMain.handle('get-offline-definition', async (_event, payload = {}) => {
  try {
    const store = await readOfflineSnapshotStore();
    const snapshot = store.snapshots.find(item => item.id === payload.snapshotId);
    const type = String(payload.type || '').toLowerCase();
    const id = String(payload.id || '');
    const record = snapshot?.definitionsByType?.[type]?.find(item => (typeof item === 'string' ? item : item?.id) === id);
    if (!snapshot?.sourcePath || !record || typeof record.file !== 'string') throw new Error('Definition is not available in the selected snapshot index.');
    const definitions = await readTypedDefinitionsFromFile(snapshot.sourcePath, record.file);
    const definition = definitions.find(item => item.type === type && item.id === id);
    if (!definition) throw new Error('Definition could not be read from the snapshot source folder.');
    return { ok: true, definition: definition.value, file: record.file, version: snapshot.detectedVersion || snapshot.rootName };
  } catch (error) { return { ok: false, error: error?.message || 'Could not read snapshot definition' }; }
});

ipcMain.handle('scan-project-folder', async (_event, folderPath) => {
  if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath)) return { ok: false, error: 'Invalid project folder path.' };
  const root = path.resolve(folderPath);
  const allowedExtensions = new Set(['.json', '.md', '.txt', '.cfg', '.conf', '.ini', '.lua', '.yaml', '.yml']);
  const files = [];
  let truncated = false;
  const visit = async (directory, depth = 0) => {
    if (depth > 80 || truncated) return;
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) { return; }
    for (const entry of entries) {
      if (truncated) break;
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(absolutePath, depth + 1); continue; }
      if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      if (files.length >= 150000) { truncated = true; break; }
      try {
        const stat = await fs.stat(absolutePath);
        const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
        files.push({ name: entry.name, relativePath, filePath: absolutePath, fingerprint: fingerprint(stat), size: stat.size, lastModified: stat.mtimeMs });
      } catch (error) {}
    }
  };
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) return { ok: false, error: 'Project path is not a folder.' };
    await visit(root);
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return { ok: true, rootPath: root, name: path.basename(root), files, truncated };
  } catch (error) { return { ok: false, error: error?.message || 'Could not scan project folder.' }; }
});

ipcMain.handle('get-offline-snapshot', async () => {
  try {
    const store = await readOfflineSnapshotStore();
    const snapshot = store.snapshots.find(item => item.id === store.activeSnapshotId) || null;
    return { ok: true, snapshot, snapshots: store.snapshots, activeSnapshotId: store.activeSnapshotId };
  } catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not load offline data index' }; }
});

ipcMain.handle('remove-offline-snapshot', async (_event, snapshotId) => {
  try {
    const store = await readOfflineSnapshotStore();
    const targetId = typeof snapshotId === 'string' && snapshotId ? snapshotId : store.activeSnapshotId;
    store.snapshots = store.snapshots.filter(snapshot => snapshot.id !== targetId);
    if (store.activeSnapshotId === targetId) store.activeSnapshotId = store.snapshots[0]?.id || null;
    store.snapshots = store.snapshots.map(snapshot => ({ ...snapshot, active: snapshot.id === store.activeSnapshotId }));
    await writeOfflineSnapshotStore(store);
    return { ok: true, snapshots: store.snapshots, activeSnapshotId: store.activeSnapshotId };
  } catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not remove offline data index' }; }
});

ipcMain.handle('activate-offline-snapshot', async (_event, snapshotId) => {
  try {
    const store = await readOfflineSnapshotStore();
    if (!store.snapshots.some(snapshot => snapshot.id === snapshotId)) return { ok: false, error: 'Snapshot no longer exists.' };
    store.activeSnapshotId = snapshotId;
    store.snapshots = store.snapshots.map(snapshot => ({ ...snapshot, active: snapshot.id === snapshotId }));
    await writeOfflineSnapshotStore(store);
    return { ok: true, snapshots: store.snapshots, activeSnapshotId: store.activeSnapshotId };
  } catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not activate offline snapshot' }; }
});

ipcMain.handle('refresh-offline-snapshot', async (_event, snapshotId) => {
  try {
    const store = await readOfflineSnapshotStore();
    const previous = store.snapshots.find(snapshot => snapshot.id === snapshotId);
    if (!previous?.sourcePath || !path.isAbsolute(previous.sourcePath)) return { ok: false, error: 'This snapshot has no saved source path. Import its JSON folder again to refresh it.' };
    const refreshed = await buildOfflineSnapshot(previous.sourcePath, previous);
    store.snapshots = store.snapshots.map(snapshot => snapshot.id === snapshotId ? { ...refreshed, active: snapshot.id === store.activeSnapshotId } : snapshot);
    await writeOfflineSnapshotStore(store);
    return { ok: true, snapshot: store.snapshots.find(snapshot => snapshot.id === snapshotId), snapshots: store.snapshots, activeSnapshotId: store.activeSnapshotId };
  } catch (error) { return { ok: false, error: error && error.message ? error.message : 'Could not refresh selected snapshot' }; }
});

ipcMain.handle('import-offline-snapshot', async () => {
  const selected = await dialog.showOpenDialog(mainWindow, {
    title: 'Import CDDA JSON data snapshot',
    buttonLabel: 'Index JSON data',
    properties: ['openDirectory']
  });
  if (selected.canceled || !selected.filePaths.length) return { canceled: true };

  try {
    const root = selected.filePaths[0];
    const snapshot = await buildOfflineSnapshot(root);
    const store = await readOfflineSnapshotStore();
    store.snapshots.unshift({ ...snapshot, active: true });
    store.snapshots = store.snapshots.map((item, index) => ({ ...item, active: index === 0 }));
    store.activeSnapshotId = snapshot.id;
    await writeOfflineSnapshotStore(store);
    return { ok: true, snapshot: store.snapshots[0], snapshots: store.snapshots, activeSnapshotId: store.activeSnapshotId };
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
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingOpenPaths.length) {
      mainWindow.webContents.send('open-json-paths', pendingOpenPaths);
      pendingOpenPaths = [];
    }
  });
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
  if (!hasSingleInstanceLock) return;
  installMenu();
  createWindow();
  openJsonPaths(getJsonPathsFromArgs(process.argv, process.cwd()));
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
