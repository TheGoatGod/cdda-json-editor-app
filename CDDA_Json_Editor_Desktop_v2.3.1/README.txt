CDDA JSON Editor Desktop v2.3.1

This is a Windows/macOS/Linux desktop wrapper around the CDDA JSON Editor.
It runs the editor in Electron, so native menu shortcuts are handled by the
application instead of the web browser.

Important shortcuts

Ctrl/Cmd + Shift + W  Close the active editor tab
Ctrl/Cmd + Shift + T  Create a new editor tab
Ctrl/Cmd + S          Save the active JSON file
Ctrl/Cmd + Shift + S  Save all open files
Ctrl/Cmd + F          Focus search
Ctrl/Cmd + H          Focus replace
Ctrl/Cmd + Alt + R    Restore the active tab's previous saved version

v2.3.1 reliability update

- Recovery drafts now preserve every dirty tab instead of only the active tab.
- Save and Save all keep the previous saved text for each file.
- Restore previous save is available from the tab toolbar and File menu.
- Formatting and minifying now mark changed documents as modified.

Run from this folder

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run: npm ci (or npm install)
4. Run: npm start

Windows users who use the prebuilt portable executable do not need Node.js.

Build a portable Windows executable

Run: npm run dist

The portable executable is written to the dist folder.
