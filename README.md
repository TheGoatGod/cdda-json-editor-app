# cdda-json-editor-app
CDDA JSON Editor Desktop v2.8.0

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

Ctrl/Cmd + P          Quick Open project files, recent files, and tabs

Ctrl/Cmd + G          Go to a line in the active file

Ctrl/Cmd + Shift + C  Copy the JSON Pointer at the cursor

Ctrl/Cmd + Alt + R    Restore the active tab's previous saved version

The Projects panel can open a folder, filter its JSON files, and open one or
all of them in tabs. Paths are shown relative to the selected folder, so a
root-level file appears as modinfo.json and nested paths do not repeat the
head folder. The main project folder and every nested folder can be expanded
or collapsed. Use the panel header toggle or File > Toggle Projects panel to
minimize it, or the left/right arrows in its header to dock it on either side.

v2.8.0 major project workflow release

- Validate every JSON file in a project, including syntax and common CDDA
  structure checks. Findings are clickable to open the relevant file and line,
  highlight the source, and repeated top-level IDs are reported for review.
- Clear stale project-validation results, copy a report, or export a standalone
  HTML report grouped by file and severity.
- Show validation, unsaved-tab, and external-change health badges in Projects,
  with filters to focus on files that need attention.
- Search and replace across project files with file-type and folder filters.
- Get ID autocomplete while editing, find exact-value references, and browse a
  searchable catalog of project definitions by ID, type, or file; copy IDs or
  jump directly to their definitions.
- Safely rename an ID across project JSON using an exact-value preview. JSON
  property keys are excluded; unsaved tabs and disk conflicts are protected,
  and changed files receive a .bak backup.
- Apply a reviewed trailing-comma quick fix only when the result is valid JSON;
  undo the fix while the document remains unchanged.
- Create, edit, and delete reusable JSON snippets with prompted placeholders,
  alongside starter snippets for common CDDA definitions.
- Compare tabs side-by-side with synchronized scrolling. Review an external
  disk change against the editor buffer in a synchronized diff, then choose
  which version to keep.
- Detect external file changes, recover unsaved tabs, and optionally keep .bak
  backups when saving.
- Quick Open fuzzy-searches project files, open tabs, and recent local files
  remembered between launches with Ctrl/Cmd + P; Go to Line uses Ctrl/Cmd + G.
- Inspect the current JSON Pointer in the editor footer and copy it with one
  click or Ctrl/Cmd + Shift + C. Inspection pauses on very large files.
- The Validation Report expands and wraps cleanly when shown without Structure.

v2.7.3 project tools and editing update

- Validate every project JSON file and click an issue to jump to the file and
  line.
- Search and replace across project files with file-type and folder filters.
- Autocomplete project IDs and find their references across JSON files.
- Compare tabs side-by-side with synchronized scrolling.
- Detect files changed outside the app, recover unsaved tabs, and optionally
  keep .bak backups when saving.
- Insert reusable starter JSON snippets for common CDDA definitions.
- Fixed the Validation Report layout when Structure is turned off, including
  readable wrapping and a responsive standalone panel width.


Search counts

The search bar reports the total number of plain-text or regex matches. After
using Next or Previous it reports the current position as "Match 3 of 12".
Huge files count matches in the background so the editor remains responsive.

v2.7.2 toolbar and menu update

- Removed top-bar Open JSON, Open folder, Projects, Save JSON, Save As, and Settings buttons that duplicated menu or panel actions.
- Added a Settings menu beside File in the app menu bar.
- Moved the version badge to the first position in the top toolbar.

v2.7.1 Structure and validation update

- Made the Structure panel a navigable tree with lazy branch rendering.
- Added keyboard-accessible branch controls and Expand all / Collapse all actions.
- Validation now refreshes when a file opens, a tab becomes active, or edited content changes.
- Removed the manual Validate button; automatic validation is enabled by default and can be turned off in Settings.

v2.7.0 desktop release

- Replaced the self-extracting portable build with a standard Windows installer.
- Install once, then launch the installed app directly without unpacking the app on every start.
- The installer can create Start menu and desktop shortcuts and lets you choose the install folder.
- Retained the supplied JSON application icon in the Windows build.

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

Run from CDDA_Json_Editor_Desktop_v2.8.0

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run: npm ci (or npm install)
4. Run: npm start

Windows users can install the prebuilt setup executable without Node.js.

Build the Windows installer

Run: npm run dist

The Windows setup executable is written to the dist folder.
