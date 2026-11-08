# Asili Playground — IDE behaviour

As of 8 November 2026 · Victor Kaiuki

The playground should behave the way an IDE does. This page lists the gaps found by an audit of the
current page, and what each change does. Each item has a status.

| # | Gap | Change | Status |
| --- | --- | --- | --- |
| 1 | Unsaved edits lost on close or reload | Unload guard while anything is unsaved; drafts kept in browser storage and restored | Done |
| 2 | Share link drops the other files of a project | A project's share link carries every file | Done |
| 3 | Ctrl+S does nothing on a sample | Ctrl+S on a sample offers to save it as a project | Done |
| 4 | Undo lost on every tab switch | Each open file keeps its editor state | Done |
| 5 | Session not restored on reload | Open tabs and the active tab are restored | Done |
| 6 | No find, replace or go to line | Find and replace (Ctrl+F, Ctrl+H); Go to line (Ctrl+G) | Done (plain text, not case-sensitive; no regular expressions yet) |
| 7 | No quick open | Ctrl+P opens a file by name | Done |
| 8 | Explorer: no rename, no context menu, deletion cannot be undone | Rename, right-click menu, Undo for a deleted file; project rename and delete | Done (no folders: the project model is flat) |
| 9 | Menus lack Edit commands and close badly | Edit menu with undo, redo, cut, copy, paste, find; menus close on outside click and Escape | Done |
| 10 | Problems list covers only the active file | Problems for every file of the project | Done |
| 11 | Tabs cannot be reordered or closed in groups | Drag to reorder; close others; close to the right | Done |
| 12 | Ctrl+N focuses a field; Ctrl+W on the last tab opens a sample | Ctrl+N makes an untitled module; closing the last tab leaves the editor open with a notice | Done |
| 13 | Sidebars and panels have fixed sizes | Drag to resize; sizes remembered | Done |
| 14 | Status bar lacks language and error counts | Language mode, error count (opens Problems), engine state | Done |
| 15 | No comment toggle | Ctrl+/ comments the lines with `#` | Done |
| 16 | Browser keeps Ctrl+W and Ctrl+N | Close tab is Alt+W; new file is Alt+N | Done |
| 17 | Dark theme only | Light and dark themes; follows the system setting by default | Done |
| 18 | Project messages stay in Swahili in English | Project errors are coded and shown in the interface language | Done |
| 19 | Board takes the right side of every layout | The board starts hidden and opens when a run uses pins | Done |

Items 6 and 8 are partly done, as the status column says. Item 18 covers the project errors; the
names in the menus and the palette follow the interface language.

The sample and workspace lists moved from the sidebar into the File menu (Open sample, Open
workspace). "Project" is called "workspace" in the interface, as VS Code calls it. The language
switch is an icon at the right end of the tab row.

Notes on what is not available in this build:

- The vendored editor has no search or bracket-closing package. Find and Go to line are built on the
  editor's own selection and decorations, not the `@codemirror/search` package, because installing
  npm packages is not part of the playground build.
- Folders in the explorer are not part of the project model yet (`docs/06-workspaces.md`); a project's
  files stay flat.
