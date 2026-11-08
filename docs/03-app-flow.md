# Asili Playground — App Flow

As of 7 November 2026 · Victor Kaiuki

The playground opens with a runnable sample, keeps the editor usable while the wasm loads, and puts
every tool one click away in the tool bar.

## Layout regions

The page is an IDE shell. Every region has a fixed place, so the editor is never pushed around by a
panel opening.

```mermaid
flowchart TB
  menu["Menu bar: Faili · Hariri · Endesha · Zana · Mwonekano · Msaada"]
  subgraph body["Workbench"]
    direction LR
    primary["Primary sidebar: Faili (samples and open files)"]
    subgraph center["Main"]
      tabs["Editor tabs: one per open program, × to close"]
      editor["Editor with errors marked on their lines"]
      panel["Bottom panel tabs: Matokeo (output) · Matatizo (problems) · Majaribio (tests, later)"]
      tabs --> editor --> panel
    end
    secondary["Secondary sidebar: Bodi pepe (pins, clock, events)"]
    primary --- center --- secondary
  end
  status["Status bar: engine state · Ln, Col · file · language"]
  menu --> body --> status
```

- **Menu bar** holds every command. A menu item that is not built yet is shown disabled, not hidden.
- **Primary sidebar** lists the samples and the open files. Choosing a sample opens it in a tab.
- **Editor tabs** keep one program each. Switching tabs keeps each program's text.
- **Secondary sidebar** shows the virtual board. Collapsing it gives the editor the width.
- **Bottom panel** is tabbed. Matatizo lists each diagnostic; choosing one moves the cursor to its line.
- **Status bar** shows the engine state (Ready, Running, Error), the cursor position, the open file
  and the interface language.

The layout is data, not markup. `layout.js` holds a registry of **menus**, **sidebar sections**
(primary and secondary), **bottom-panel tabs** and **status items**. Each entry has an `id`, a label
key in the string table, an `order` and what it renders or does. `renderShell()` builds the page from
the registry, so the page HTML only has the root element. To add a feature, register an entry; no
other file changes. Entries are checked when registered: a duplicate `id` is an error, so two
features cannot silently replace each other.

Narrow screens (under 760 px) stack the regions in the order of the list above, with each sidebar
collapsed by default.

## States

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Ready: wasm loaded
  Loading --> LoadFailed: fails
  LoadFailed --> Loading: Retry
  Loading --> Unsupported: no WebAssembly
  Ready --> Working: Run, Format, Lint or Test
  Working --> Results: done
  Working --> Ready: Stop
  Results --> Ready: edit
```

Typing works in every state except Unsupported. Check-as-you-type runs in Ready and Results, with
a short pause after the last keystroke.

## Flow 1: run and fix

1. Opens `/playground/` (or a share link): the Karibu sample loads in Swahili.
2. Presses **Endesha** (or Ctrl+Enter): output streams into Matokeo.
3. Introduces a mistake: the line gets a red underline as they type; hovering shows the Swahili
   message and code; Matatizo lists it.
4. Fixes it; the mark clears; runs again.
5. A program that never ends: **Simamisha** stops it; output so far stays.

## Flow 2: try the toolchain

1. **Nadhifisha** reformats the active file with `nadhifu` rules; undo restores the old text.
2. **Kagua** runs the `pata kagua` rules; findings appear as yellow underlines and in Matatizo with their rule
   code.
3. **Jaribu** runs every `#[jaribio]`; Majaribio lists pass and fail with output per test.
4. v2: **Ufuatiliaji** shows the last run's trace as a tree.

## Flow 3: several files

1. Clicks **+** to add `msaada.as`; writes a function there.
2. In `kuu.as`, `leta msaada` imports it; Run uses `runBundle` with both files.
3. A diagnostic in `msaada.as` marks that tab with a dot.

## Flow 4: share and embed

1. **Shiriki** copies a link holding all files; a note says the code is in the link, not on a server.
2. Opening the link restores the files and the language.
3. The website and wiki embed `?embed=1&sample=<id>`: a compact editor with Run and output only, and
   an "Fungua kwenye uwanja" (open in playground) link to the full page.

## Flow 5: explore features

1. Opens the sample gallery: samples grouped by area (basics, types, errors, structs and traits,
   collections, concurrency, and one group per stdlib module).
2. Picking a module that cannot run in a browser (for example a file-system module) shows the
   browser support note instead of failing at run time.

## Flow 6: projects

1. **Faili > Mradi mpya** creates a project with `kuu.as`. The sidebar lists its files with their status.
2. The name field in the sidebar creates a file: `msaidizi` becomes `msaidizi.as`.
3. Edits mark the file modified; **Ctrl+S** saves the project to the browser.
4. **Hamisha nje** downloads `<name>.asili.json`. **Ingiza** loads one, checked before it is kept.
5. A sample opened with **Hifadhi kama mradi** becomes a project, so it can be edited and saved.

See [06-workspaces.md](06-workspaces.md) for the model, the storage and the export format.

## Flow 7: work the way VS Code does

The IDE follows VS Code's conventions where they fit a browser page, so someone who knows VS Code
finds the same keys and places.

- **Activity bar** (far left, one button per sidebar view): Explorer (projects and files), Samples,
  and Board. Each button shows or hides its sidebar, or focuses it when it is already shown.
- **Command palette** (Ctrl+Shift+P, or F1): every command by name, filtered as you type. Commands
  come from the same registry as the menus, so a command in a menu is also in the palette.
- **Keys:**

| Key | Command |
| --- | --- |
| Ctrl+Shift+P, F1 | Command palette |
| Ctrl+S | Save the project |
| Ctrl+Enter, F5 | Run |
| Shift+F5 | Stop |
| Ctrl+B | Show or hide the primary sidebar |
| Alt+B | Show or hide the secondary sidebar (Board) |
| Ctrl+J | Show or hide the bottom panel |
| Ctrl+W | Close the active tab |
| Ctrl+N | Focus the new-file name field |
| Ctrl+Shift+M | Show the Problems panel |
| Ctrl+Shift+E | Focus the Explorer |

Keys are not taken while the focus is in a text field, except the palette and Ctrl+S.

## Flow 8: move the views

Every view is a tab: Explorer (the file list), Workspace (its controls), Board, Output and Problems.
A view can be dragged to another region, or to another place in its own region's tab strip:

- **Primary sidebar**, **secondary sidebar** and **bottom panel** each have a tab strip. Drop a tab on
  a strip to put it there; drop it on a tab to put it in front of that tab; drop it on a region's
  body to add it at the end.
- **Editor area**: dropping a view on the editor moves it to the bottom panel.
- The place of every view is kept in the browser, so the layout comes back after a reload.
- A view moves with its content: the output text, the board's pins and the file list stay as they are.

Each region's tabs use the same tab style, so a region is only a place to show views.

The side bars show their tabs as a column of icons, on the outer edge of the bar (the left sidebar's
on the left, the right sidebar's on the right). The bottom panel shows its tabs as text across its
top. Each view has an icon and a name: the icon is what the side bar shows, the name is the tooltip
and the bottom panel's label.

## Edge cases

| Situation | What the user sees |
| --- | --- |
| JavaScript off | A message that the playground needs JavaScript, and a link to install Pata |
| No WebAssembly | "Kivinjari hiki hakiwezi kuendesha Asili", with supported browsers |
| Wasm fails to load | Error state, Retry; the editor keeps its text |
| Share link too long | Warning before copying; suggestion to remove files |
| Share link corrupt | Opens the default sample with a notice |
| Format of code that does not parse | Matatizo shows the parse error; the text is unchanged |
