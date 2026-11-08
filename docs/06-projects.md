# Asili Playground — Projects

As of 8 November 2026 · Victor Kaiuki

A project is a named set of Asili files that the playground keeps, exports and imports. Samples
stay read-only; a sample can be saved as a project to edit it.

## The model

```json
{
  "schema": "asili-project",
  "version": 1,
  "name": "Hesabu",
  "entry": "kuu",
  "files": { "kuu.as": "leta msaidizi\n...", "msaidizi.as": "...\n" },
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
