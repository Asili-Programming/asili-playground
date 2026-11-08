# Asili Playground — Workspaces

As of 8 November 2026 · Victor Kaiuki

Samples stay read-only; a sample can be saved as a workspace to edit it.

A workspace is the set of Asili files the playground keeps, shows, exports and imports. The
interface says "workspace", as VS Code does; there is no separate "project" concept.

## How VS Code's workspaces work (the model used here)

Checked against VS Code's documentation (Multi-root Workspaces, code.visualstudio.com):

- A workspace is the folder or folders open in the window. By default it is one root folder.
- The **Explorer** shows each root as a collapsible tree, with the root's name at the top.
- A workspace can be saved to a file (`.code-workspace`, a JSON list of roots and settings) and
  reopened. Until it is saved, it is kept only for the session.
- Workspace commands live in the **File** menu (New Window, Open Workspace, Save Workspace As,
  Add Folder); the Explorer's header holds only the file commands (new file, new folder, collapse).

Here the workspace has one root: its files, shown under the workspace's name in the Explorer. A
saved workspace is a `.asili.json` file. The playground keeps workspaces in the browser; File menu
commands open, save, export, import, rename and delete them.

## The model

```json
{
  "schema": "asili-project",
  "version": 2,
  "name": "Hesabu",
  "entry": "kuu",
  "folders": ["lib"],
  "files": { "kuu.as": "leta msaidizi\n...", "lib/msaidizi.as": "...\n" },
  "created": "2026-11-08T12:00:00Z",
  "updated": "2026-11-08T12:30:00Z"
}
```

- **Files** are keyed by file name. A file name is `<module>.as`, where `<module>` is an Asili
  identifier (letters, digits and `_`, not starting with a digit). `leta <module>` in another file
  imports it, which is why names must be identifiers.
- **Entry** is the file that holds `kazi kuu`. It is `kuu` for every project; a project always has
  `kuu.as`, and it cannot be deleted.
- **Size limits:** 256 KB per file, 2 MB per project, 32 files. An import above a limit is refused.

## Closing and deleting

- **Close workspace** (File menu): closes its open files and leaves the Explorer with no workspace.
  The workspace is kept: it stays under Open Recent and Open workspace. If it has unsaved changes, the
  page asks first (Save, Don't save, Cancel).
- **Delete workspace** (File menu, or the right-click menu on the workspace's name): removes it. A
  dialog with a Delete button asks first; Undo brings it back for a few seconds.

## Opening a sample, and Open Recent

- **Open sample** opens a sample as a workspace of its own (its `kuu.as` is the sample's source). The
  workspace is saved in the browser at once, so it is listed with the others.
- **Before switching workspaces**, if the open workspace has unsaved changes, the page asks: *Save
  changes to "<name>" before opening "<next>"?* with Save, Don't save, and Cancel. Cancel keeps the
  current workspace open.
- **Open Recent** (File menu) lists the workspaces by when each was last opened, most recent first.
  A workspace's time is set when it is opened, and it is kept with the workspace.

## The workspace file

A workspace's configuration is a file at the root of the workspace, `asili-workspace.json`, as a
VS Code workspace keeps its `.code-workspace` file. It holds what describes the workspace:

```json
{ "schema": "asili-workspace", "version": 1, "name": "Hesabu", "entry": "kuu.as",
  "folders": ["lib"], "settings": {} }
```

- The file is kept with the workspace's files, so it is saved, exported and imported with them. It
  is shown in the Explorer at the root, with a configuration icon.
- The playground writes it from the workspace's state after each change (rename, a folder made or
  removed). Its name and folders are read back on import.
- It is not an Asili module: it does not count as a file of the program, and `leta` cannot name it.
- It cannot be deleted, renamed or moved.

## Folders

A workspace is a directory tree, as on an operating system:

- A **file** has a path: `kuu.as` at the root, `lib/msaidizi.as` in the folder `lib`. Folders are
  nested to any depth. A path's segments are identifiers (letters, digits and `_`), and the last
  segment ends in `.as`.
- A **folder** is a path too. A folder that holds no file is kept in `folders`, so an empty folder
  survives a save and an export.
- **Module name.** `leta <module>` names a file by its base name without `.as`: `lib/msaidizi.as` is
  the module `msaidizi`. So base names must be unique across the whole workspace: a second
  `msaidizi.as` in another folder is refused, with a message that names the folder it clashes with.
- **Entry.** `kuu.as` stays at the root and cannot be moved, renamed or deleted.
- **Operations:** create a file or folder inside a folder; rename a file or folder; move a file to
  another folder (drag and drop, or Cut and Paste); delete a file, or a folder with everything in it
  (the entry excepted). Deleting a folder that holds `kuu.as` is refused.
- **Format.** Version 2 has `files` (keyed by path) and `folders` (a list of paths). Version 1 (flat
  `files`) is still imported; its names are paths at the root.

## The Explorer tree

The Explorer shows the workspace as a tree, with the workspace's name as its root. Its header has
three buttons: New file, New folder, Collapse all. The workspace is managed from the File menu:

- **Folders** come first, then files, each group sorted by name. A folder has a chevron: it opens and
  closes on a click. Which folders are open is remembered per workspace.
- **Indentation** shows depth. Each file has an icon for its type: Asili (`.as`), Markdown, TOML,
  lock files, and a generic file for the rest. The entry `kuu.as` is marked as the entry.
- **Opening:** a click opens a file in a tab. A double click renames it.
- **Right-click on a file:** Rename, Duplicate, Delete (confirmed with a second click).
- **Right-click on a folder:** New file, New folder, Rename, Delete (with everything in it, confirmed).
- **New file / New folder:** the name field makes an item at the root, or in a folder typed as a path
  (`lib/msaidizi`).
- Each file's status (saved, modified, errors) shows on its row.

## Storage

- Projects are kept in the browser (`localStorage`, key `asili-projects-v1`), as a list. Nothing is
  sent to a server. The browser keeps them per site; they do not follow the user to another browser.
- If storage is unavailable (private window, blocked site data), the projects still work for the
  session, and the status bar says the projects are not kept.
- **Export** downloads the project as `<name>.asili.json` (the model above, pretty-printed).
- **Import** reads such a file. It must have `schema` `asili-project` and `version` 1, a valid name,
  a valid file set with `kuu.as`, and the size limits. Anything else is refused with a message that
  says which check failed. An imported project with a name already in use gets a numbered name
  (`Hesabu (2)`), so an import never replaces a project.

## Files and tracking

- **Create:** the Faili section has a name field; `msaidizi` creates `msaidizi.as`. Names are
  checked as above, and a name already in use is refused.
- **Delete:** removes a file from the project; `kuu.as` cannot be deleted.
- **Status:** each file is `saved` (its text equals the saved project) or `modified` (edited since the
  last save). A file with errors from `check` shows the error count. The editor tab shows the same:
  a dot for errors, and an italic name for unsaved changes.
- **Save** (Ctrl+S, or Faili > Hifadhi) writes the project to storage and marks its files saved.
  Each tab has a × button. Closing a modified tab (its ×, Ctrl+W, or Faili > Funga kichupo) first
  shows a warning; a second close drops the unsaved change. Closing the last tab opens the first sample.

## Running a project

- A project with one file runs as the single-module program it is.
- A project with several files runs with `runBundle(entry, modules)`: the entry is `kuu`, and every
  `leta` in any file resolves against the other files of the project. Module names are the file names
  without `.as`.
- Diagnostics (`check`) are for the file in the editor. Checking a whole project will follow the
  `check(files)` export in the technical requirements.

## Limits in this version

- The virtual board (`ubao`) is driven by the sample's `# in:` lines; a project has no scripted pin
  levels, so a project that uses pins runs with all pins low.
- No version history. Save overwrites the stored project; export a copy first to keep one.
- Projects are per browser. Export and import are how a project moves.
