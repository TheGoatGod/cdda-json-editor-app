CDDA JSON Editor Desktop v2.8.3

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

v2.8.3 project and editor workflow update

- Inspect copy-from inheritance across opened projects, including the complete
  parent chain and the file and line where each effective top-level field is
  defined.
- Save custom validation profiles, choose additional checks, and assign a
  separate profile per project. JSON syntax is always checked.
- Review before/after quick-fix previews, choose which files to stage, and undo
  the batch. Fixes remain unsaved editor changes until saved normally.
- Manage multiple offline game-data snapshots. See source and detected version,
  activate a different snapshot, refresh from its saved folder, or remove one.
- Keep validation history across app restarts. Reopen an old report or compare
  it with current files; checks disabled in one profile are marked not
  comparable, not falsely reported as fixed.
- Search a JSON outline of top-level entries and jump to them in the editor.
  Expand or collapse nested objects and arrays in Structure without rewriting
  the source JSON.
- Choose a per-project mod load order and surface duplicate typed IDs with an
  estimated winning definition. This is an ordering aid, not a simulation of
  CDDA's definition-specific merge rules.
- Use the active offline snapshot for context-aware editor suggestions:
  definition fields, common values observed in that game-data version, and
  project/snapshot IDs. Observed values are suggestions, not a complete schema.
- Compare matching definitions semantically by type and ID. Object key order
  and whitespace are ignored; array order remains significant.
- Find IDs with no exact string-value occurrences outside their definitions in
  the opened projects. These project-local results are not confirmed game
  errors and may still be used by unopened mods or the base game.
- Expand Ctrl/Cmd+P Quick Open with `>` commands and `#` ID navigation. Run
  validation, open project tools, switch panels, and jump directly to project
  definitions from the keyboard.
- Stage exact multi-file text replacements with a before/after preview for
  each file. Apply selected edits to unsaved tabs, then undo the batch; saving
  remains a separate action.
- View a project overview with MOD_INFO metadata, file and definition counts,
  validation health, unsaved tabs, snapshot details, and recent in-app edits.

Project tools

- Compare consecutive project-validation runs and filter findings as new, fixed,
  or unchanged. A first run becomes the baseline; the next run reports the diff.
- Build a visual MOD_INFO dependency overview, including missing/unopened
  dependencies and cycles among the opened mods.
- Click an ID value in the editor to preview its local definition and jump to
  that file and line. Offline snapshot IDs are also included in autocomplete.
- Dismiss a known advisory with a saved reason scoped to the project folder.
  Show dismissed findings later or restore them without changing JSON.
- Import a compatible CDDA JSON-data folder to create an offline typed-ID
  snapshot. Only the compact index is saved under app data; the original game
  files are not copied, modified, or bundled. Matching vanilla IDs suppress
  “not found in opened projects” advisories, and known vanilla MOD_INFO IDs
  can resolve dependency advisories too.
- Run a full-project validation or recheck changed files. Unchanged files reuse
  their indexed results, while project-wide references, inheritance cycles,
  mod IDs, and dependencies are re-evaluated against the current open projects.
- Validate JSON syntax, common CDDA structure, type-specific fields for
  monsters, recipes, terrain, and furniture, and exact repeated definition
  lines (`id`, `abstract`, or `ident`). Click a located finding to open and
  highlight its source.
- Check project-local `copy-from` and selected common ID references, detect
  unambiguous inheritance cycles, and compare MOD_INFO dependencies and IDs
  across opened projects. Unresolved references are explicitly advisory:
  CDDA or a project not currently open may define them.
- Findings are profiled as definite errors, likely issues, or checks needing
  game data. Filter by severity, confidence profile, duplicates, empty files,
  or text from the file, line, message, and JSON context. Findings include a
  JSON Pointer, value, and source-line excerpt.
- Validation results stay visible after project edits and are marked stale
  until validation is run again. Copy the full report or export all findings
  or only the filtered view as detailed HTML.
- Syntax findings caused by trailing commas offer an undoable Quick fix.
- Search and replace across project JSON, Markdown, text/config, source code,
  Lua, YAML, XML, CSV, map, and template files, with file-type and folder filters.
- Find exact ID references in project JSON. Typing a project ID as a JSON value
  also offers autocomplete suggestions; select an ID and use Find ID to locate
  its occurrences.
- Browse top-level definition IDs across project JSON, filter by ID/type/file,
  copy an ID, jump to its definition, or find exact string-value matches.
- Compare tabs in aligned side-by-side panes with synchronized scrolling.
- Open files are checked for outside changes. The tab is marked when the disk
  copy changes; use the review action to reload it. Saves guard against changed
  files, and Settings can optionally keep a neighboring .bak disk copy.
- Insert starter JSON definitions for common item, recipe, monster, terrain,
  and furniture types from the Editor header.
- Run the built-in offline CDDA-aware checks without installing or bundling the
  game. They cover JSON syntax, duplicate properties, typed entries, common
  inheritance fields, MOD_INFO metadata, selected vehicle placements, and
  additional checks listed below. This is not the CDDA engine: game registries,
  version-specific schemas, and references outside opened projects still need
  matching game data for confirmation.

Search counts

The search bar reports the total number of plain-text or regex matches. After
using Next or Previous it reports the current position as "Match 3 of 12".
Huge files count matches in the background so the editor remains responsive.

v2.8.3 project and editor workflow update

- Review duplicate typed IDs across opened mods in a configurable load order.
  Winner labels are estimates and do not simulate every CDDA merge rule.
- Use the active offline game-data snapshot for context-aware field, common
  value, and ID suggestions while editing.
- Compare definitions by type and ID, ignoring formatting and object key order
  while preserving array order.
- Find project IDs with no matching string references in opened project JSON.
  These are local-only hints, not confirmed game errors.
- Open Quick Open with Ctrl/Cmd+P, use `>` for commands and `#` for ID
  navigation, and jump directly to definitions or project tools.
- Preview exact text changes across multiple files, select which edits to
  stage, apply them to unsaved tabs, and undo the batch before saving.
- See mod metadata, file and definition counts, validation health, unsaved
  tabs, active snapshot, and recent editor changes in the project overview.

v2.8.3 validation comparison maintenance update

- Stabilized validation finding identity when repeated-reference counts change,
  so existing advisories remain unchanged across runs.
- Excluded files and projects removed from the current validation scope from the
  comparison baseline, preventing removed findings from being mislabeled fixed.

v2.8.2 offline CDDA validation update

- Added project-local reference checks for `copy-from`, recipe results, and
  selected monster, terrain, and furniture ID fields. Unresolved IDs are
  labelled “needs game data,” not reported as definite game errors.
- Detect inheritance cycles when the opened definitions resolve to one
  unambiguous chain, and check duplicate MOD_INFO IDs and dependencies across
  opened projects. Dependencies not found in opened folders remain advisory.
- Added conservative type-specific field-shape checks for monsters, recipes,
  terrain, and furniture, with clickable source locations.
- Added definite-error, likely-issue, and needs-game-data profiles with a
  profile filter and profile labels in copied/exported reports.
- Added “Recheck changed files.” It uses file fingerprints to avoid rereading
  unchanged desktop files while refreshing project-wide checks; “Run full
  validation” remains available at any time.
- Expanded the lightweight validator with duplicate JSON-property detection,
  required typed-entry checks, ID/copy-from/abstract structure checks,
  inheritance-field validation, MOD_INFO required fields and property types,
  and vehicle placement validation.
- Duplicate JSON properties and other located findings can be clicked to
  highlight their source. Repeated ID values alone are not duplicates; the
  Projects duplicate filter covers exact repeated definition-identifier lines
  and duplicate JSON properties.
- Object-shaped special JSON files are informational rather than automatically
  treated as project errors; unusual blank IDs and copy-from values are warnings.
- No CDDA game executable or full game data is required. The offline checker
  cannot guarantee detection of engine-only errors, unknown IDs, all schema
  rules, or references outside the opened project.

v2.8.1 duplicate validation precision update

- Project validation now reports only exact repeated definition-identifier
  lines (`id`, `abstract`, or `ident`) across entries, rather than common
  repeated JSON properties such as `type`.
- Clicking a duplicate finding opens the file and highlights the complete line.
- Filter validation findings by severity, duplicates, empty files, or matching
  file, line, message, and JSON context text.
- Findings include JSON Pointers, values, and source-line excerpts; located
  findings highlight their source. Results remain visible as stale until rerun.
- Export either the complete validation report or the filtered findings as HTML.
- Syntax findings caused by trailing commas offer an undoable Quick fix.
- Vehicle placement entries may share coordinates; repeated `x`/`y` values
  are no longer reported as duplicates. Invalid coordinate types are still checked.

v2.8.0 major project workflow release

- Validate every JSON file in a project, including syntax and common CDDA
  structure checks. Findings are clickable to open the relevant file and line.
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

- Validate every project JSON file and click an issue to open the file at its
  reported line.
- Search and replace across project files, filtered by file type and folder.
- Get autocomplete for project IDs and find references across JSON files.
- Compare tabs side-by-side with synchronized scrolling.
- Detect outside file changes, recover unsaved tabs, and optionally keep .bak
  backups when saving.
- Insert reusable starter JSON snippets for common CDDA definitions.
- Fixed the Validation Report layout so it fills the side panel cleanly when
  Structure is turned off, with readable wrapping and a responsive width.

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

Run from this folder (app version v2.8.3)

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run: npm ci (or npm install)
4. Run: npm start

Windows users can install the prebuilt setup executable without Node.js.

Build the Windows installer

Run: npm run dist

The Windows setup executable is written to the dist folder.
