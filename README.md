# cdda-json-editor-app
CDDA JSON Editor Desktop v2.6.1

This is a Windows/macOS/Linux desktop wrapper around the CDDA JSON Editor.
It runs the editor in Electron, so native menu shortcuts are handled by the
application instead of the web browser.

Important shortcuts

Ctrl/Cmd + Shift + W  Close the active editor tab

Ctrl/Cmd + Shift + T  Create a new editor tab

Ctrl/Cmd + S          Save JSON (same flow as Save As)

Ctrl/Cmd + Alt + S    Save As (same flow as Save JSON)

Ctrl/Cmd + Shift + S  Save all open files

Ctrl/Cmd + F          Focus search

Ctrl/Cmd + H          Focus replace

Ctrl/Cmd + Alt + R    Restore the active tab's previous saved version

The Projects panel can open a folder, filter its JSON files, and open one or
all of them in tabs. Paths are shown relative to the selected folder, so a
root-level file appears as modinfo.json and nested paths do not repeat the
head folder. The main project folder and every nested folder can be expanded
or collapsed. Use Hide projects in the top bar to minimize it, or the
left/right arrows in its header to dock it on either side.


Search counts

The search bar reports the total number of plain-text or regex matches. After
using Next or Previous it reports the current position as "Match 3 of 12".
Huge files count matches in the background so the editor remains responsive.

v2.6.1 release update

- Updated the package version, in-app labels, and portable executable name to 2.6.1.
- Retained the supplied JSON application icon in the Windows build.

v2.6.0 package update

- Updated the package version and in-app version labels to 2.6.0.
- Includes the Projects folder tree, save workflow, and custom JSON icon from 2.5.0.
- Added Focus view, color themes, and adjustable editor line spacing for a clearer workspace.
- Refined the Projects panel with a wider explorer layout, cleaner tree rows, indentation guides, and quieter hover actions.
- Fixed root-folder collapse state so the yellow project folder stays closed after toggling.
- Corrected file indentation and removed extra vertical spacing between open and collapsed project folders.

v2.5.0 feature update

- Save JSON and Save As now share one save flow: opened files ask whether to Override or Save As, while new files open the Save As dialog.
- The collapsible Projects panel lists JSON files from opened folders, with filtering and Open all.
- Added Copy JSON and Duplicate tab workflow actions.
- Made both CDDA release/sample selectors use the same readable styling.
- Removed the redundant status and filename badges from the top bar.
- New sessions now start on a clean untitled tab; samples remain available from the sample selector.
- The desktop build uses the supplied JSON application icon.

v2.4.1 maintenance update

- Corrected the in-app shortcut help so it matches the desktop menu.
- Updated the desktop package and window title to v2.4.1.

v2.4.0 search update

- Regex and plain-text search now report the total number of matches.
- Next and Previous show the current match position within the total.
- Huge-file search counts matches asynchronously and reports progress.

v2.3.1 reliability update

- Recovery drafts now preserve every dirty tab instead of only the active tab.
- Save and Save all keep the previous saved text for each file.
- Restore previous save is available from the tab toolbar and File menu.
- Formatting and minifying now mark changed documents as modified.

Run from CDDA_Json_Editor_Desktop_v2.6.1

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run: npm ci (or npm install)
4. Run: npm start

Windows users who use the prebuilt portable executable do not need Node.js.

Build a portable Windows executable

Run: npm run dist

The portable executable is written to the dist folder.
