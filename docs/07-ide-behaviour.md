# Asili Playground — IDE behaviour

As of 8 November 2026 · Victor Kaiuki

The playground should behave the way an IDE does. This page lists the gaps found by an audit of the
current page, and what each change does. Each item has a status.

| # | Gap | Change | Status |
| --- | --- | --- | --- |
| 1 | Unsaved edits lost on close or reload | Unload guard while anything is unsaved; drafts kept in browser storage and restored | Planned |
| 2 | Share link drops the other files of a project | A project's share link carries every file | Planned |
| 3 | Ctrl+S does nothing on a sample | Ctrl+S on a sample offers to save it as a project | Planned |
| 4 | Undo lost on every tab switch | Each open file keeps its editor state | Planned |
| 5 | Session not restored on reload | Open tabs and the active tab are restored | Planned |
| 6 | No find, replace or go to line | Find and replace (Ctrl+F, Ctrl+H); Go to line (Ctrl+G) | Planned |
| 7 | No quick open | Ctrl+P opens a file by name | Planned |
| 8 | Explorer: no rename, no context menu, deletion cannot be undone | Rename, right-click menu, Undo for a deleted file; project rename and delete | Planned |
| 9 | Menus lack Edit commands and close badly | Edit menu with undo, redo, cut, copy, paste, find; menus close on outside click and Escape | Planned |
| 10 | Problems list covers only the active file | Problems for every file of the project | Planned |
| 11 | Tabs cannot be reordered or closed in groups | Drag to reorder; close others; close to the right | Planned |
| 12 | Ctrl+N focuses a field; Ctrl+W on the last tab opens a sample | Ctrl+N makes an untitled module; closing the last tab leaves the editor open with a notice | Planned |
| 13 | Sidebars and panels have fixed sizes | Drag to resize; sizes remembered | Planned |
| 14 | Status bar lacks language and error counts | Language mode, error count (opens Problems), engine state | Planned |
| 15 | No comment toggle | Ctrl+/ comments the lines with `#` | Planned |
| 16 | Browser keeps Ctrl+W and Ctrl+N | Close tab is Alt+W; new file is Alt+N | Planned |
| 17 | Dark theme only | Light and dark themes; follows the system setting by default | Planned |
| 18 | Project messages stay in Swahili in English | Project errors are coded and shown in the interface language | Planned |
| 19 | Board takes the right side of every layout | The board starts hidden and opens when a run uses pins | Planned |

Notes on what is not available in this build:

- The vendored editor has no search or bracket-closing package. Find and Go to line are built on the
  editor's own selection and decorations, not the `@codemirror/search` package, because installing
  npm packages is not part of the playground build.
- Folders in the explorer are not part of the project model yet (`docs/06-projects.md`); a project's
  files stay flat.
