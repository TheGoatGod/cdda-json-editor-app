# cdda-json-editor-app
CDDA JSON Editor Desktop v2.8.4

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

v2.8.4 project workflow update

- Added a live JSON code-suggestion popup for property names and complete field
  lines. Suggestions adapt to the current CDDA definition and available offline
  snapshot, preserve the current indentation, and avoid fields already present
  in that object. Click a suggestion to insert it, or click elsewhere in the
  app to dismiss the popup. Accepted fields are remembered locally and ranked
  higher in future suggestions; no code or usage data is sent online. Settings
  can disable suggestions, disable snapshot-derived fields, turn off learning,
  or clear the learned ranking.
- Expand the snippet picker with full starter definitions for generic items,
  food, drinks, tools, armor, books, melee weapons, recipes, monsters, terrain,
  furniture, constructions, mutations, and MOD_INFO. Corrected schema fields
  in the earlier examples. Inserting an object into a blank editor wraps it in
  a top-level JSON array; replace example IDs and project/game references.
- Focus view now uses the full available editor width instead of leaving wide
  empty margins on either side.
- Compare two offline game-data snapshots to list added, removed, and changed
  vanilla definition IDs and field paths. Opened projects are marked as
  potentially affected when they define the same type and ID. Snapshot source
  folders must still be available; refresh older snapshots to add comparison
  fingerprints.
- Save named workspace presets that restore opened project folders, mod load
  order, active game-data snapshot, validation profiles, and editor/panel
  layout. Presets save folder paths, not copies of project files.
- Add custom project rules for required JSONPaths, allowed values, and
  existence/equality/type conditions. Rules run during full project validation
  and are stored locally in the app.
- Save JSONPath project searches and click results to open their source file
  and jump to the matched value. Supported selectors include properties,
  quoted keys, array indexes/wildcards, and recursive descent; full JSONPath
  filter expressions are not supported.
- Compare an opened mod definition with its counterpart in the active offline
  snapshot to review added, removed, and overridden fields without changing
  either source.
- Optionally warn before saving when the current document has definite JSON
  syntax or structure errors. Choose Cancel save or Save anyway; this does not
  run game-data validation or block saving by default.

v2.8.3 project and editor workflow update

- Inspect `copy-from` inheritance across opened projects. See the parent chain
  and the project file and line that supplies each effective top-level field.
- Create custom validation profiles, choose which additional checks they run,
  and assign a different saved profile to each project. JSON syntax remains an
  always-on safety check.
- Review safe quick fixes with before/after previews, select which files to
  stage, and undo the complete batch. Fixes stay in unsaved editor tabs until
  you save them.
- Manage multiple offline game-data snapshots. View the source folder and
  detected game version, activate another snapshot, refresh it from its saved
  source, or remove one without touching the original data.
- Reopen saved validation runs after restarting the app and compare a chosen
  run with current project files. If a profile disabled a check in one run,
  its findings are marked not comparable instead of falsely called fixed.
- Browse a searchable outline of top-level JSON entries and jump to one in the
  editor. Expand or collapse nested objects and arrays in the Structure tree
  without rewriting the JSON source.
- Set a per-project mod load order and review duplicate typed IDs with an
  estimated winning definition. The view does not simulate all CDDA merge
  rules, which vary by definition type.
- Use the active offline snapshot for context-aware suggestions of fields,
  common values observed in that game-data version, and project/snapshot IDs.
  Observed values are useful hints, not an exhaustive schema.
- Compare matching definitions semantically by type and ID, ignoring object
  key order and formatting while preserving array order.
- Find IDs with no matching string-value occurrences outside their definitions
  in opened project JSON. These local-only results are not confirmed game
  errors; unopened mods or the base game may still use the IDs.
- Use Ctrl/Cmd+P Quick Open with `>` for commands and `#` for ID navigation to
  run validation, switch project tools, open files, and jump to definitions.
- Stage exact text changes across multiple JSON files with individual diffs,
  apply selected edits to unsaved tabs, and undo the batch before saving.
- Review project metadata, file and definition counts, validation status,
  unsaved tabs, active snapshot, and recent editor changes in the overview.

v2.8.3 validation comparison maintenance update

- Stabilized validation finding identity when repeated-reference counts change,
  so existing advisories remain unchanged across runs.
- Excluded files and projects removed from the current validation scope from the
  comparison baseline, preventing removed findings from being mislabeled fixed.

v2.8.2 offline CDDA validation update

- Run a full-project validation or recheck changed files. Unchanged desktop
  files reuse their indexed results while cross-file checks are refreshed.
- Added project-local `copy-from`, recipe result, and selected monster, terrain,
  and furniture reference checks. Unresolved references are advisory and marked
  as needing game data, since the ID may come from CDDA or an unopened project.
- Detect unambiguous inheritance cycles, duplicate MOD_INFO IDs, and
  dependencies missing from opened projects. Missing dependencies remain
  advisory; they may be supplied by the base game or an unopened mod.
- Added conservative type-specific field checks for monsters, recipes, terrain,
  and furniture, plus definite-error, likely-issue, and needs-game-data profiles
  that can be filtered and appear in copied/exported reports.
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
  cannot guarantee detection of engine-only errors, version-specific schema
  rules, or references outside the opened projects; unresolved references are
  therefore not presented as confirmed game errors.

Additional v2.8.2 project tools

- Compare consecutive validation runs and filter to new, fixed, or unchanged
  findings.
- View MOD_INFO dependency links, missing/unopened dependencies, and cycles
  among the opened mods.
- Click an ID value in the editor to preview its project definition and jump to
  the definition file and line.
- Dismiss known project advisories with a saved reason; dismissals are scoped to
  the selected project folder and can be shown or restored later.
- Import a compatible CDDA JSON-data folder as an offline typed-ID snapshot.
  The app stores its compact index locally, uses it to resolve vanilla
  references and known vanilla mod dependencies, and never edits or bundles the
  selected game files.

v2.8.1 duplicate validation precision update

- Project validation now reports only exact repeated definition-identifier
  lines (`id`, `abstract`, or `ident`) across entries, rather than common
  repeated JSON properties such as `type`.
- Clicking a duplicate finding opens the file and highlights the complete line.
- Filter validation findings by severity, duplicates, empty files, or matching
  file, line, message, and JSON context text.
- Validation findings include JSON Pointers, the related value, and a source-line
  excerpt; clicking any located finding highlights its source in the editor.
- Project validation results stay visible after project edits and are marked
  stale until validation is run again.
- Export either the complete validation report or only the currently filtered
  findings as HTML; both reports include the JSON context details.
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

Run from CDDA_Json_Editor_Desktop_v2.8.4 (source folder; app version 2.8.4)

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run: npm ci (or npm install)
4. Run: npm start

Windows users can install the prebuilt setup executable without Node.js.

Build the Windows installer

Run: npm run dist

The Windows setup executable is written to the dist folder.
