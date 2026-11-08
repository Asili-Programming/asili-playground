// Asili Playground: the page. The program runs in worker.js, so a long run never freezes the
// editor and Stop can end it. Everything here is relative to this file, so the same files work
// at /playground/, at a self-hosted root, and on 127.0.0.1:8080.

import { encodeShare, decodeShare } from "./share.js";
import {
  ENTRY, newProject, newId, projectFromSample, addFile, deleteFile, fileStatus, importProject,
  exportProject, loadProjects, saveProjects, uniqueName, bundleOf, moduleOf, renameFile, ProjectError,
  foldersOf, folderOf, renameFolder, deleteFolder, moveFile, addFolder, syncConfig, programFiles, isConfig,
} from "./project.js";
import {
  addMenu, addToolbarItem, addTabEndItem, addSidebarSection, addPanel, addStatusItem, addActivity, renderShell, setBrand,
  showPanel, showView, setRegionVisible, regionVisible, refreshMenus, menuViews,
} from "./layout.js";
import { registerCommand, runCommand, installKeys, openPalette, openList } from "./commands.js";
import { saveSession, loadSession } from "./session.js";
import { initSettings, defineToggle, setToggle, toggleSetting, isOn, onToggleChange } from "./settings.js";
import { MACHINES, createMachine, deriveStates } from "./states.js";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  EditorState, defaultKeymap, history, historyKeymap, indentWithTab,
  StreamLanguage, syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching,
  oneDark, Decoration, StateField, StateEffect, Compartment,
  undo, redo, selectAll,
} from "./vendor/codemirror.js";

// ---- Language -------------------------------------------------------------------------------
// ?lugha=sw|en picks the interface language, so the site's switch carries over. Anything else
// falls back to Swahili. The strings for each language live in one table, below.
const LANGS = ["sw", "en"];
const requested = new URLSearchParams(location.search).get("lugha");
const lang = LANGS.includes(requested) ? requested : "sw";

const STRINGS = {
  sw: {
    title: "Asili — Uwanja wa Kuchezea",
    run: "▶ Endesha", stop: "■ Simamisha", clear: "Futa", output: "Matokeo", editor: "Msimbo wa Asili",
    clearTitle: "Futa matokeo", sampleTitle: "Chagua mfano",
    loading: "Inapakia…", ready: "Tayari", running: "Inaendesha…", done: "Imekamilika",
    stopped: "Imesimamishwa", error: "Kosa", loadFailed: "Imeshindikana kupakia injini",
    retry: "Jaribu tena", unsupported: "Kivinjari hiki hakiwezi kuendesha Asili (inahitaji WebAssembly na Web Workers).",
    footer: "Inaendesha Asili kwenye kivinjari chako. Msimbo wako hautumwi kwa seva yoyote.",
    switchLabel: "English", switchTo: "en",
    board: "Bodi pepe", clock: "Saa (ms)", pin: "Pini", events: "Matukio",
    noEvents: "Hakuna tukio bado",
    share: "Shiriki", linkCopied: "Kiungo kimenakiliwa", linkInBar: "Kiungo kiko kwenye upau wa anwani",
    linkFailed: "Kiungo hakikuundwa", linkBad: "Kiungo hiki hakisomeki",
    menuFile: "Faili", menuEdit: "Hariri", menuRun: "Endesha", menuView: "Mwonekano", menuHelp: "Msaada",
    closeTab: "Funga kichupo", moveTo: "Hamisha hadi", menu: "Menyu", format: "Nadhifisha", togglePrimary: "Upau wa kushoto",
    toggleSecondary: "Upau wa kulia (Bodi pepe)", togglePanel: "Paneli ya chini", wiki: "Wiki ya Asili",
    explorer: "Faili", samples: "Mifano", openFiles: "Mafaili yaliyo wazi", editor: "Msimbo",
    panel: "Paneli ya chini", problems: "Matatizo", noProblems: "Hakuna makosa",
    subtitle: "Uwanja wa Kuchezea",
    projectSection: "Nafasi ya kazi", filesSection: "Faili za mradi", projectName: "Jina la nafasi ya kazi",
    newProject: "Nafasi mpya", exportProject: "Hamisha nje", importProject: "Ingiza", saveProject: "Hifadhi",
    saveAsProject: "Hifadhi mfano kama nafasi ya kazi", openSample: "Fungua mfano", openWorkspace: "Fungua nafasi ya kazi", newFile: "Unda faili", fileName: "jina la faili",
    deleteFile: "Futa", confirmDelete: "Thibitisha kufuta", noProject: "Hakuna nafasi ya kazi bado",
    stSaved: "imehifadhiwa", stModified: "imebadilishwa", stErrors: "makosa", noFiles: "Hakuna faili",
    savedNote: "Mradi umehifadhiwa", importedNote: "Mradi umeingizwa", exportedNote: "Mradi umehamishwa",
    storageOff: "Hifadhi haipatikani kwenye kivinjari hiki: mradi hautabaki", importFailed: "Kuingiza kumeshindikana",
    dirtyWarn: "Mabadiliko hayajahifadhiwa", menuProject: "Mradi", fileNew: "Mradi mpya",
    closeAgain: "Mabadiliko hayajahifadhiwa: bonyeza × tena kufunga bila kuhifadhi",
    activityBar: "Upau wa vitendo", explorer: "Faili", board: "Bodi pepe", problems: "Matatizo",
    menuPalette: "Amri",
    edit: "Hariri", undo: "Rudisha nyuma", redo: "Rudia", cut: "Kata", copy: "Nakili", paste: "Bandika",
    selectAll: "Chagua yote", find: "Tafuta", replace: "Badilisha", goToLine: "Nenda kwenye mstari",
    comment: "Weka maoni", goToFile: "Nenda kwenye faili", theme: "Rangi ya mandhari",
    findPlaceholder: "Tafuta", replacePlaceholder: "Badilisha na", linePlaceholder: "Namba ya mstari",
    findNext: "Ifuatayo", findPrev: "Iliyotangulia", replaceOne: "Badilisha", replaceAll: "Zote", closeFind: "Funga",
    lastFile: "Hili ndilo faili la mwisho: linabaki wazi", undoLabel: "Rudisha", deleted: "Limefutwa",
    rename: "Badilisha jina", duplicate: "Nakili faili", delete: "Futa", projectRename: "Badilisha jina",
    projectDelete: "Futa nafasi ya kazi", projectDeleted: "Nafasi ya kazi imefutwa", fileRenamed: "Faili limebadilishwa jina",
    problemsIn: "Makosa", noProblemsInProject: "Hakuna makosa kwenye mradi", lightLabel: "Mwanga", darkLabel: "Giza",
    errBadName: "Jina si sahihi: tumia herufi, namba na _", errFileExists: "Faili tayari lipo",
    errTooManyFiles: "Idadi ya mafaili imefikiwa", errEntryDelete: "kuu.as haiwezi kufutwa",
    errEntryRename: "kuu.as haiwezi kubadilishwa jina", errFileMissing: "Faili halipo",
    errNotJson: "Faili hili si JSON", errNotAsili: "Faili hili si nafasi ya kazi ya Asili",
    errVersion: "Toleo hili halitambuliki", errNoName: "Nafasi ya kazi haina jina",
    errNoFiles: "Nafasi ya kazi haina mafaili", errNoEntry: "Nafasi ya kazi haina kuu.as",
    errNotAsiliFile: "Si faili la Asili", errNotText: "Si maandishi", errFileTooBig: "Faili ni kubwa mno",
    errProjectTooBig: "Nafasi ya kazi ni kubwa mno", errNameTaken: "Jina hili la moduli tayari lipo",
    errFolderExists: "Folda tayari ipo", errTooManyFolders: "Idadi ya folda imefikiwa",
    errFolderMissing: "Folda haipo", errEntryMove: "kuu.as haiwezi kuhamishwa",
    newFolder: "Folda mpya", collapseAll: "Funga folda zote", notifications: "Arifa", lang: "Lugha",
    lintStale: "Imepitwa: msimbo umebadilishwa tangu ukaguzi",
    explorerEmpty: "Hakuna nafasi ya kazi iliyo wazi", explorerNew: "Nafasi mpya ya kazi",
    explorerOpen: "Fungua nafasi ya kazi", explorerSample: "Fungua mfano",
    emptyTitle: "Hakuna faili lililo wazi", emptyNew: "Nafasi mpya ya kazi", emptyOpen: "Fungua mfano",
    emptyRecent: "Fungua hivi karibuni",
    openView: "Fungua mwonekano…", appearance: "Mwonekano wa skrini", editorLayout: "Mpangilio wa mhariri",
    singleEditor: "Mhariri mmoja", wordWrap: "Kufunga maneno",
    closeWorkspace: "Funga nafasi ya kazi", openRecent: "Fungua hivi karibuni", saveBefore: "Hifadhi mabadiliko ya", beforeOpening: "kabla ya kufungua",
    dontSave: "Usihifadhi", cancel: "Ghairi",
    menuTools: "Zana", lintFile: "Kagua faili", formatted: "Msimbo umepangwa", formatUnchanged: "Msimbo uko sawa tayari",
    lintClean: "Hakuna makosa ya kukagua", closeOthers: "Funga zingine", closeRight: "Funga za kulia", stFiles: "mafaili",
  },
  en: {
    title: "Asili — Playground",
    run: "▶ Run", stop: "■ Stop", clear: "Clear", output: "Output", editor: "Asili source code",
    clearTitle: "Clear output", sampleTitle: "Choose a sample",
    loading: "Loading…", ready: "Ready", running: "Running…", done: "Finished",
    stopped: "Stopped", error: "Error", loadFailed: "The engine failed to load",
    retry: "Try again", unsupported: "This browser cannot run Asili (it needs WebAssembly and Web Workers).",
    footer: "Asili runs in your browser. Your code is never sent to any server.",
    switchLabel: "Kiswahili", switchTo: "sw",
    board: "Virtual board", clock: "Clock (ms)", pin: "Pin", events: "Events",
    noEvents: "No events yet",
    share: "Share", linkCopied: "Link copied", linkInBar: "The link is in the address bar",
    linkFailed: "Could not make the link", linkBad: "This link could not be read",
    menuFile: "File", menuEdit: "Edit", menuRun: "Run", menuView: "View", menuHelp: "Help",
    closeTab: "Close tab", moveTo: "Move to", menu: "Menu", format: "Format", togglePrimary: "Left sidebar",
    toggleSecondary: "Right sidebar (Virtual board)", togglePanel: "Bottom panel", wiki: "Asili wiki",
    explorer: "Explorer", samples: "Samples", openFiles: "Open files", editor: "Code",
    panel: "Bottom panel", problems: "Problems", noProblems: "No problems",
    subtitle: "Playground",
    projectSection: "Workspace", filesSection: "Project files", projectName: "Workspace name",
    newProject: "New workspace", exportProject: "Export workspace", importProject: "Import workspace", saveProject: "Save",
    saveAsProject: "Save sample as workspace", openSample: "Open sample", openWorkspace: "Open workspace", newFile: "Create file", fileName: "file name",
    deleteFile: "Delete", confirmDelete: "Confirm delete", noProject: "No workspace yet",
    stSaved: "saved", stModified: "modified", stErrors: "errors", noFiles: "No files",
    savedNote: "Project saved", importedNote: "Project imported", exportedNote: "Project exported",
    storageOff: "Storage is not available in this browser: the project will not be kept", importFailed: "Import failed",
    dirtyWarn: "Unsaved changes", menuProject: "Project", fileNew: "New project",
    closeAgain: "Unsaved changes: click × again to close without saving",
    activityBar: "Activity bar", explorer: "Explorer", board: "Board", problems: "Problems",
    menuPalette: "Commands",
    edit: "Edit", undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste",
    selectAll: "Select all", find: "Find", replace: "Replace", goToLine: "Go to line",
    comment: "Toggle comment", goToFile: "Go to file", theme: "Colour theme",
    findPlaceholder: "Find", replacePlaceholder: "Replace with", linePlaceholder: "Line number",
    findNext: "Next", findPrev: "Previous", replaceOne: "Replace", replaceAll: "All", closeFind: "Close",
    lastFile: "This is the last file: it stays open", undoLabel: "Undo", deleted: "Deleted",
    rename: "Rename", duplicate: "Duplicate", delete: "Delete", projectRename: "Rename",
    projectDelete: "Delete workspace", projectDeleted: "Workspace deleted", fileRenamed: "File renamed",
    problemsIn: "Problems", noProblemsInProject: "No problems in the project", lightLabel: "Light", darkLabel: "Dark",
    errBadName: "Name is not valid: use letters, digits and _", errFileExists: "A file with this name already exists",
    errTooManyFiles: "The workspace has reached its file limit", errEntryDelete: "kuu.as cannot be deleted",
    errEntryRename: "kuu.as cannot be renamed", errFileMissing: "File not found",
    errNotJson: "This file is not JSON", errNotAsili: "This file is not an Asili workspace",
    errVersion: "This version is not recognised", errNoName: "The workspace has no name",
    errNoFiles: "The workspace has no files", errNoEntry: "The workspace has no kuu.as",
    errNotAsiliFile: "Not an Asili file", errNotText: "Not text", errFileTooBig: "The file is too large",
    errProjectTooBig: "The workspace is too large", errNameTaken: "A module with this name already exists",
    errFolderExists: "The folder already exists", errTooManyFolders: "The folder limit has been reached",
    errFolderMissing: "Folder not found", errEntryMove: "kuu.as cannot be moved",
    newFolder: "New folder", collapseAll: "Collapse folders", notifications: "Notifications", lang: "Language",
    lintStale: "Stale: the file changed since it was linted",
    explorerEmpty: "No workspace is open", explorerNew: "New workspace",
    explorerOpen: "Open workspace", explorerSample: "Open sample",
    emptyTitle: "No file is open", emptyNew: "New workspace", emptyOpen: "Open sample",
    emptyRecent: "Open recent",
    openView: "Open View…", appearance: "Appearance", editorLayout: "Editor Layout",
    singleEditor: "Single editor", wordWrap: "Word Wrap",
    closeWorkspace: "Close workspace", openRecent: "Open recent", saveBefore: "Save changes to", beforeOpening: "before opening",
    dontSave: "Don't save", cancel: "Cancel",
    menuTools: "Tools", lintFile: "Lint file", formatted: "Code formatted", formatUnchanged: "Code is already formatted",
    lintClean: "No lint findings", closeOthers: "Close others", closeRight: "Close to the right", stFiles: "files",
  },
};
const T = STRINGS[lang];

document.documentElement.lang = lang;
document.title = T.title;
for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = T[el.dataset.i18n];
}
for (const el of document.querySelectorAll("[data-i18n-title]")) {
  el.title = T[el.dataset.i18nTitle];
}
// Open documents (see "Editor tabs" below), declared before the shell reads them.
const docs = []; // { id, name, text, inputs, error }
let activeDoc = null;

// ---- The IDE shell ---------------------------------------------------------------------------
// The layout is data (layout.js). Each feature registers its menus, toolbar buttons, sidebar
// sections, bottom-panel tabs and status items below; renderShell() builds the page from them.
// Adding a feature is adding an entry here.
setBrand({ logo: "logo-mark.svg", title: "Asili", subtitle: "subtitle" });
const isEmbed = new URLSearchParams(location.search).get("embed") === "1";
document.body.classList.toggle("embed", isEmbed);

// Commands are registered once; the menus, the palette and the keys all run them.
registerCommand({ id: "palette.open", title: "Command palette", key: ["Ctrl+Shift+P", "F1"],
  inEditor: true, inInput: true, run: () => openPalette() });
registerCommand({ id: "project.new", title: "New workspace", run: () => newProjectFromInput() });
registerCommand({ id: "file.openSample", title: "Open sample", run: () => openSampleList() });
registerCommand({ id: "file.openWorkspace", title: "Open workspace", run: () => openWorkspaceList() });
registerCommand({ id: "file.openRecent", title: "Open recent", run: () => openRecentList() });
registerCommand({ id: "project.save", title: "Save project", key: "Ctrl+S", inEditor: true, inInput: true,
  run: () => (activeDoc?.projectId ? saveActiveProject() : saveSampleAsProject()), enabled: () => !!activeDoc });
registerCommand({ id: "project.saveAsProject", title: "Save sample as workspace", run: () => saveSampleAsProject(),
  enabled: () => !!activeDoc && !activeDoc.projectId });
registerCommand({ id: "project.export", title: "Export workspace", run: () => exportActiveProject(),
  enabled: () => !!activeProject() });
registerCommand({
  id: "project.import",
  title: "Import workspace",
  run: () => {
    let input = document.getElementById("import-file");
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = "import-file";
      input.accept = ".json,application/json";
      input.hidden = true;
      document.body.append(input);
    }
    input.value = "";
    input.click();
  },
});
registerCommand({ id: "file.new", title: "New file", key: "Alt+N", inEditor: true, inInput: true,
  run: () => createUntitledFile() });
registerCommand({ id: "file.close", title: "Close tab", key: "Alt+W", inEditor: true, inInput: true,
  run: () => requestClose(activeDoc), enabled: () => !!activeDoc });
registerCommand({ id: "file.quickOpen", title: "Go to file", key: "Ctrl+P", inEditor: true,
  run: () => openQuickOpen() });
registerCommand({ id: "edit.find", title: "Find", key: "Ctrl+F", inEditor: true, run: () => openFind("find") });
registerCommand({ id: "edit.replace", title: "Replace", key: "Ctrl+H", inEditor: true, run: () => openFind("replace") });
registerCommand({ id: "edit.goToLine", title: "Go to line", key: "Ctrl+G", inEditor: true, run: () => openFind("goto") });
registerCommand({ id: "edit.comment", title: "Toggle comment", run: () => toggleLineComments() });
registerCommand({ id: "edit.undo", title: "Undo", run: () => undo(editor) });
registerCommand({ id: "edit.redo", title: "Redo", run: () => redo(editor) });
registerCommand({ id: "edit.cut", title: "Cut", run: () => { editor.focus(); document.execCommand("cut"); } });
registerCommand({ id: "edit.copy", title: "Copy", run: () => { editor.focus(); document.execCommand("copy"); } });
registerCommand({ id: "edit.paste", title: "Paste", run: () => pasteFromClipboard() });
registerCommand({ id: "edit.selectAll", title: "Select all", run: () => selectAll(editor) });
registerCommand({ id: "view.theme", title: "Toggle colour theme", run: () => toggleSetting("light") });
registerCommand({ id: "view.wrap", title: "Word wrap", key: "Alt+Z", inEditor: true, run: () => toggleSetting("wrap") });
registerCommand({ id: "tools.format", title: "Format document", key: "Alt+Shift+F", inEditor: true,
  run: () => requestFormat(), enabled: () => engineReady && !busy && !!activeDoc });
registerCommand({ id: "tools.lint", title: "Lint file", run: () => requestLint(),
  enabled: () => engineReady && !busy && !!activeDoc });
registerCommand({ id: "share.link", title: "Share link", run: () => shareCurrent() });
registerCommand({ id: "project.close", title: "Close workspace", run: () => closeWorkspace(),
  enabled: () => !!activeProject() });
registerCommand({ id: "project.rename", title: "Rename workspace", run: () => renameActiveProject(),
  enabled: () => !!activeProject() });
registerCommand({ id: "project.delete", title: "Delete workspace", run: () => deleteActiveProject(),
  enabled: () => !!activeProject() });
registerCommand({ id: "run.start", title: "Run", key: ["Ctrl+Enter", "F5"], inEditor: true, inInput: true,
  run: () => run(), enabled: () => engineReady && !busy });
registerCommand({ id: "run.stop", title: "Stop", key: "Shift+F5", inEditor: true, inInput: true,
  run: () => stop(), enabled: () => busy });
registerCommand({ id: "view.primary", title: "Toggle primary sidebar", key: "Ctrl+B", inEditor: true,
  run: () => toggleSetting("primary") });
registerCommand({ id: "view.secondary", title: "Toggle secondary sidebar (Board)", key: "Alt+B", inEditor: true,
  run: () => toggleSetting("secondary") });
registerCommand({ id: "view.panel", title: "Toggle bottom panel", key: "Ctrl+J", inEditor: true,
  run: () => toggleSetting("panel") });
registerCommand({ id: "view.problems", title: "Show problems", key: "Ctrl+Shift+M", inEditor: true,
  run: () => { setRegionVisible("panel", true); showPanel("problems"); } });
registerCommand({ id: "view.explorer", title: "Show explorer", key: "Ctrl+Shift+E", inEditor: true,
  run: () => showView("files") });
registerCommand({ id: "help.wiki", title: "Asili wiki",
  run: () => window.open("https://github.com/Asili-Programming/Asili/wiki", "_blank", "noopener") });

addMenu({
  id: "faili", label: "menuFile", order: 10, optional: true,
  items: [
    { id: "menu-project-new", label: "newProject", command: "project.new" },
    { id: "menu-open-sample", label: "openSample", command: "file.openSample" },
    { id: "menu-open-workspace", label: "openWorkspace", command: "file.openWorkspace" },
    { id: "menu-open-recent", label: "openRecent", command: "file.openRecent" },
    { id: "menu-project-save", label: "saveProject", command: "project.save" },
    { id: "menu-project-save-as", label: "saveAsProject", command: "project.saveAsProject" },
    { id: "menu-project-import", label: "importProject", command: "project.import" },
    { id: "menu-project-export", label: "exportProject", command: "project.export" },
    { id: "menu-project-close", label: "closeWorkspace", command: "project.close" },
    { id: "menu-project-rename", label: "projectRename", command: "project.rename" },
    { id: "menu-project-delete", label: "projectDelete", command: "project.delete" },
    { id: "share-btn", label: "share", optional: true, command: "share.link" },
    { id: "close-tab-btn", label: "closeTab", optional: true, command: "file.close" },
  ],
});
addMenu({
  id: "hariri", label: "menuEdit", order: 20,
  items: [
    { id: "menu-undo", label: "undo", command: "edit.undo" },
    { id: "menu-redo", label: "redo", command: "edit.redo" },
    { id: "menu-cut", label: "cut", command: "edit.cut" },
    { id: "menu-copy", label: "copy", command: "edit.copy" },
    { id: "menu-paste", label: "paste", command: "edit.paste" },
    { id: "menu-select-all", label: "selectAll", command: "edit.selectAll" },
    { id: "menu-find", label: "find", command: "edit.find" },
    { id: "menu-replace", label: "replace", command: "edit.replace" },
    { id: "menu-go-to-line", label: "goToLine", command: "edit.goToLine" },
    { id: "menu-comment", label: "comment", command: "edit.comment" },
    { id: "clear-btn", label: "clear" },
  ],
});
addMenu({
  id: "zana", label: "menuTools", order: 25,
  items: [
    { id: "menu-format", label: "format", command: "tools.format" },
    { id: "menu-lint", label: "lintFile", command: "tools.lint" },
  ],
});
addMenu({
  id: "endesha", label: "menuRun", order: 30,
  items: [
    { id: "menu-run-btn", label: "run", command: "run.start" },
    { id: "menu-stop-btn", label: "stop", command: "run.stop" },
  ],
});
// The View menu, built from the registries: the palette and Open View, the appearance and layout
// submenus, the views that are in the menu (each with its key), and word wrap.
addMenu({
  id: "mwonekano", label: "menuView", order: 40, optional: true,
  items: () => [
    { id: "menu-palette", label: "menuPalette", keyHint: "Ctrl+Shift+P", run: () => openPalette() },
    { id: "menu-open-view", label: "openView", run: () => openViewList() },
    { separator: true },
    { id: "menu-appearance", label: "appearance", submenu: [
      { id: "menu-theme", label: "theme", command: "view.theme", toggle: "light" },
      { id: "menu-wrap", label: "wordWrap", keyHint: "Alt+Z", command: "view.wrap", toggle: "wrap" },
      { id: "toggle-primary", label: "togglePrimary", keyHint: "Ctrl+B", command: "view.primary", toggle: "primary" },
      { id: "toggle-secondary", label: "toggleSecondary", keyHint: "Alt+B", command: "view.secondary", toggle: "secondary" },
      { id: "toggle-panel", label: "togglePanel", keyHint: "Ctrl+J", command: "view.panel", toggle: "panel" },
    ] },
    { id: "menu-layout", label: "editorLayout", submenu: [
      { id: "menu-layout-single", label: "singleEditor", run: () => {} },
    ] },
    { separator: true },
    ...menuViews().map((v) => ({ id: `menu-view-${v.id}`, label: v.title, keyHint: v.keyHint, run: () => showView(v.id) })),
  ],
});
addMenu({
  id: "msaada", label: "menuHelp", order: 50, optional: true,
  items: [
    { id: "wiki-link", label: "wiki", command: "help.wiki" },
  ],
});


// Run and Stop are icons at the right end of the tab row.
const PLAY_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>`;
const STOP_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="1.5" fill="currentColor"/></svg>`;
addTabEndItem({ id: "run-btn", title: "run", icon: PLAY_ICON, order: 10,
  run: () => run(), enabled: () => engineReady && !busy });
addTabEndItem({ id: "stop-btn", title: "stop", icon: STOP_ICON, order: 20,
  run: () => stop(), enabled: () => busy });
// The language switch: an icon at the right end of the tab row; its title names the other language.
// The language switch sits at the right end of the status bar; its label names the other language.
addStatusItem({ id: "lugha-switch", order: 90, optional: true, render(slot, t) {
  const link = document.createElement("a");
  link.id = "lugha-switch";
  link.className = "lang-switch";
  link.href = `?lugha=${T.switchTo}`;
  link.title = t("switchLabel");
  link.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>`;
  link.append(document.createTextNode(` ${t("switchLabel")}`));
  slot.append(link);
} });

// View icons: the side bars show these, as a column (SVG, no text).
const svgIcon = (body) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON_FOLDER = svgIcon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>');
const ICON_BOARD = svgIcon('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>');
const ICON_OUTPUT = svgIcon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>');
const ICON_PROBLEMS = svgIcon('<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/>');

// The Explorer view (as in VS Code): a header with file commands, then the workspace as the root
// of its tree. Workspace commands are in the File menu.
const ICON_NEW_FILE = svgIcon('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>');
const ICON_NEW_FOLDER = svgIcon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>');
const ICON_COLLAPSE = svgIcon('<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>');
addSidebarSection("primary", {
  id: "files", title: "explorer", order: 10, icon: ICON_FOLDER, menu: true, keyHint: "Ctrl+Shift+E",
  render(container, t) {
    container.innerHTML = `
      <div class="explorer-toolbar">
        <span class="explorer-title">${t("explorer")}</span>
        <button id="explorer-new-file" class="icon-btn" type="button" title="${t("newFile")}" aria-label="${t("newFile")}">${ICON_NEW_FILE}</button>
        <button id="explorer-new-folder" class="icon-btn" type="button" title="${t("newFolder")}" aria-label="${t("newFolder")}">${ICON_NEW_FOLDER}</button>
        <button id="explorer-collapse" class="icon-btn" type="button" title="${t("collapseAll")}" aria-label="${t("collapseAll")}">${ICON_COLLAPSE}</button>
      </div>
      <div id="undo-note" class="undo-note" role="status" hidden></div>
      <ul id="file-list" class="open-files" aria-label="${t("explorer")}"></ul>`;
  },
});
addSidebarSection("secondary", {
  id: "board", title: "board", order: 10, optional: false, icon: ICON_BOARD, menu: true, keyHint: "Alt+B",
  render(container, t) {
    container.innerHTML = `
      <div class="board-body">
        <div class="board-clock">${t("clock")} <output id="board-clock">0</output></div>
        <ol id="board-pins" class="board-pins" aria-label="${t("pin")}"></ol>
        <div class="board-events-title">${t("events")}</div>
        <ol id="board-events" class="board-events"><li class="board-empty">${t("noEvents")}</li></ol>
      </div>`;
  },
});

addPanel({
  id: "output", title: "output", order: 10, icon: ICON_OUTPUT, menu: true,
  render(body) {
    const pre = document.createElement("pre");
    pre.id = "output";
    body.append(pre);
  },
});
addPanel({
  id: "problems", title: "problems", order: 20, icon: ICON_PROBLEMS, menu: true, keyHint: "Ctrl+Shift+M",
  render(body) {
    const list = document.createElement("ol");
    list.id = "problems";
    list.className = "problems";
    body.append(list);
  },
});

addStatusItem({ id: "state", order: 10, render(slot) {
  slot.id = "status";
  slot.className = "status";
  slot.setAttribute("role", "status");
  slot.setAttribute("aria-live", "polite");
} });
addStatusItem({ id: "cursor", order: 20, render(slot) { slot.id = "cursor-pos"; } });
addStatusItem({ id: "file", order: 30, render(slot) { slot.id = "status-file"; } });
addStatusItem({ id: "bell", order: 45, render(slot) {
  slot.id = "status-bell";
  slot.className = "status-item clickable bell";
  slot.title = T.notifications;
  slot.setAttribute("role", "button");
  slot.tabIndex = 0;
  slot.setAttribute("aria-label", T.notifications);
  slot.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openNotifications();
    }
  });
  slot.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>`;
  slot.addEventListener("click", () => openNotifications());
} });
addStatusItem({ id: "language", order: 40, render(slot, t) { slot.id = "status-language"; slot.textContent = t("lang") + ": Asili"; } });
addStatusItem({ id: "problems", order: 50, render(slot) {
  slot.id = "status-problems";
  slot.className = "status-item clickable";
  slot.addEventListener("click", () => { setRegionVisible("panel", true); showPanel("problems"); });
} });

renderShell(document.querySelector(".ide"), { t: (key) => T[key] ?? key, embed: isEmbed });
// Every on/off setting is defined once (settings.js, and docs/03-app-flow.md "Toggles"). The editor
// is created after this; the toggles that need it reach it through `editorRef`.
initSettings();
let editorRef = null;
const systemLight = matchMedia("(prefers-color-scheme: light)").matches;
defineToggle("light", { initial: systemLight, apply: (light) => {
  document.body.classList.toggle("theme-light", light); // before the editor, so it starts in the theme
  editorRef?.dispatch({ effects: themeCell.reconfigure(light ? [] : oneDark) });
} });
defineToggle("wrap", { initial: false, apply: (on) => {
  editorRef?.dispatch({ effects: wrapCell.reconfigure(on ? EditorView.lineWrapping : []) });
} });
defineToggle("primary", { initial: true, apply: (on) => setRegionVisible("primary", on) });
defineToggle("secondary", { initial: false, apply: (on) => setRegionVisible("secondary", on) });
defineToggle("panel", { initial: true, apply: (on) => setRegionVisible("panel", on) });
if (isEmbed) {
  // Embed mode shows the editor, Run and output only: these are forced, and not saved.
  setToggle("primary", false, { force: true });
  setToggle("secondary", false, { force: true });
}
mountFindBar();
mountEmptyState();
showPanel("output");
onToggleChange(() => refreshMenus());

// Minimal StreamLanguage-based highlighting mode for Asili — comments (#, ///), strings, numbers,
// keywords and built-in type names. Not a real parser (no LSP/diagnostics), just enough to make
// the editor pleasant to read.
const asiliMode = {
  startState() {
    return { inBlockComment: false };
  },
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match("///")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match('"')) {
      while (!stream.eol()) {
        if (stream.next() === "\\") stream.next();
        else if (stream.string[stream.pos - 1] === '"') break;
      }
      return "string";
    }
    if (stream.match(/^-?\d+(\.\d+)?/)) return "number";
    const word = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (word) {
      const w = word[0];
      if (KEYWORDS.has(w)) return "keyword";
      if (BUILTIN_TYPES.has(w)) return "typeName";
      if (/^[A-Z]/.test(w)) return "typeName";
      return null;
    }
    stream.next();
    return null;
  },
};

// <generated by `ASILI_GOLDEN=write cargo test -p pata-core editor_word_lists`: keywords from
// asili_lexer::KEYWORDS, types from asili_parser::builtins (BUILTIN_TYPE_NAMES + builtin umbo)>
const KEYWORDS = new Set([
  "au", "au_biti", "au_ikiwa", "azima", "azima_tenda", "endelea", "hadi", "ikiwa", "jaribu",
  "jenum", "kama", "katika", "kazi", "kutoka", "kwa", "kweli", "lebo", "leta", "linganisha",
  "milele", "na", "na_biti", "rejesha", "sawia", "shughuli", "si_kweli", "sifa", "siyo",
  "siyo_biti", "sogeza_kulia", "sogeza_kushoto", "subiri", "thabiti", "tupa", "umbo", "umma",
  "vinginevyo", "vunja", "wakati", "weka", "xor_biti", "ya",
]);
const BUILTIN_TYPES = new Set([
  "Namba", "Neno", "Baiti", "Ukweli", "Herufi", "Tupu", "Hamna", "Orodha", "Kamusi", "Seti",
  "Jozi", "Chaguo", "Tokeo", "Wakati", "Anuani", "Namba_Kuu", "Namba_Sahihi", "Kumbukumbu",
  "Kasha_GC", "Kasha_GC_Dhaifu", "Faili", "Mkondo", "MkondoSikilizaji", "MkondoUdp", "MkondoWs",
  "TlsUsanidi", "NjiaTx", "NjiaRx", "Fungo", "Ahadi", "Biti8", "Biti16", "Biti32", "Biti64",
  "uBiti8", "uBiti16", "uBiti32", "uBiti64", "OmbiHttp", "JibuHttp", "ChaguoSeva",
  "ChaguoMkondo", "ChaguoSikiliza", "ChaguoHttp",
]);
// </generated>

// ---- Errors on the line ---------------------------------------------------------------------
// The engine's `check` (driver/wasm) reports each diagnostic with its line. The page marks that
// line; the message is the line's tooltip. Results are for one version of the source: a result
// for an older edit is dropped (see `checkSeq`).
const setDiagnostics = StateEffect.define();

function diagnosticMarks(items, doc) {
  const marks = [];
  for (const d of items) {
    if (!d.line || d.line < 1 || d.line > doc.lines) continue;
    marks.push(
      Decoration.line({ attributes: { class: "cm-err-line", title: `${d.code}: ${d.message}` } })
        .range(doc.line(d.line).from),
    );
  }
  return Decoration.set(marks, true);
}

const diagnosticField = StateField.define({
  create: () => Decoration.none,
  update(marks, tr) {
    marks = marks.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setDiagnostics)) marks = diagnosticMarks(effect.value, tr.state.doc);
    }
    return marks;
  },
  provide: (field) => EditorView.decorations.from(field),
});

let checkSeq = 0;
let checkTimer = null;

function requestCheck() {
  if (!engineReady || !worker) return;
  checks.send("edit");
  // The workspace file is JSON, not Asili: it has no diagnostics.
  if (activeDoc && isConfig(activeDoc.file ?? "")) {
    renderProblems([]);
    return;
  }
  checkSeq += 1;
  // The other modules of the active project, so `leta <module>` is not reported as unknown.
  const p = activeDoc?.projectId ? projectById(activeDoc.projectId) : null;
  const modules = p ? programFiles(p).filter((f) => f !== activeDoc.file).map(moduleOf) : [];
  worker.postMessage({ type: "check", seq: checkSeq, source: editor.state.doc.toString(), modules });
  if (p) {
    for (const file of programFiles(p)) {
      if (file === activeDoc.file) continue;
      worker.postMessage({
        type: "check", seq: -1, key: `p:${p.id}:${file}`, source: liveText(p, file),
        modules: programFiles(p).filter((f) => f !== file).map(moduleOf),
      });
    }
  }
}

// The tabs and the file list show unsaved changes; they follow edits after a short pause.
let tabsTimer = null;
function scheduleTabs() {
  clearTimeout(tabsTimer);
  tabsTimer = setTimeout(() => renderTabs(), 150);
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(persistSession, 400);
}

// The open files, their unsaved text and the active one, so a reload brings the work back.
let sessionTimer = null;
let sessionSaved = true;
function persistSession() {
  const data = {
    active: activeDoc?.key ?? null,
    workspace: activeProjectId,
    docs: docs.map((d) => ({ key: d.key, name: d.name, projectId: d.projectId, file: d.file,
      text: d === activeDoc ? editor.state.doc.toString() : d.text })),
  };
  sessionSaved = saveSession(data);
}

// Without storage, unsaved work would be lost on close: ask before the page goes.
window.addEventListener("beforeunload", (e) => {
  if (!sessionSaved || docs.some((d) => isDirty(d))) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Put the saved files back as tabs; returns false when there was nothing to restore.
function restoreSession(samplesOf) {
  const saved = loadSession();
  if (!saved) return false;
  activeProjectId = projectById(saved.workspace) ? saved.workspace : null;
  if (saved.docs.length === 0) {
    showEmptyState();
    return true;
  }
  for (const sd of saved.docs) {
    if (docs.some((d) => d.key === sd.key)) continue;
    if (sd.key.startsWith("p:")) {
      const p = projectById(sd.projectId);
      if (!p || !(sd.file in p.files)) continue;
      docs.push({ key: sd.key, name: sd.name, text: sd.text, inputs: [], error: false,
        projectId: p.id, file: sd.file });
    } else if (sd.key.startsWith("s:")) {
      const file = sd.key.slice(2);
      docs.push({ key: sd.key, name: sd.name, text: sd.text, inputs: samplesOf(file), error: false,
        projectId: null, file: null });
    }
  }
  const active = docs.find((d) => d.key === saved.active) ?? docs[0];
  if (!active) return false;
  activate(active);
  return true;
}

function scheduleCheck() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(requestCheck, 400);
}

// ---- Find highlights and the colour theme ----------------------------------------------------
// The find bar's matches are marks in the editor (a field, like the diagnostics). The theme is a
// compartment, so switching it reconfigures the editor without losing its text or history.
const setFindEffect = StateEffect.define();
const findField = StateField.define({
  create: () => Decoration.none,
  update(marks, tr) {
    marks = marks.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setFindEffect)) {
        marks = Decoration.set(effect.value.map((m) => Decoration.mark({ class: "cm-find-match" }).range(m.from, m.to)), true);
      }
    }
    return marks;
  },
  provide: (field) => EditorView.decorations.from(field),
});
const themeCell = new Compartment();
const wrapCell = new Compartment();

const darkThemeExtension = () => (document.body.classList.contains("theme-light") ? [] : oneDark);

// ---- Editor ---------------------------------------------------------------------------------
const state0 = () => EditorState.create({
  doc: "",
  extensions: [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    indentOnInput(),
    bracketMatching(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    StreamLanguage.define({ ...asiliMode, languageData: { commentTokens: { line: "#" } } }),
    // Ctrl+/ is bound here, before the editor's own toggle, so the editor handles it once.
    keymap.of([{ key: "Mod-/", run: () => { toggleLineComments(); return true; } }, indentWithTab, ...defaultKeymap, ...historyKeymap]),
    themeCell.of(darkThemeExtension()),
    findField,
    // Line numbers need 4.5:1 contrast; oneDark's default gutter colour is too faint.
    EditorView.theme({ ".cm-gutters": { color: "#9aa2b5" } }),
    wrapCell.of(isOn("wrap") ? EditorView.lineWrapping : []),
    diagnosticField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (activeDoc) activeDoc.text = update.state.doc.toString();
        scheduleCheck();
        lintState.send("edit");
        scheduleTabs();
        if (findState.query) setTimeout(() => runFind(findState.query), 0);
      }
      if (update.docChanged || update.selectionSet) updateCursor(update.state);
    }),
    EditorView.contentAttributes.of({ "aria-label": T.editor }),
  ],
});

const editor = new EditorView({
  state: state0(),
  parent: document.getElementById("editor"),
});
editorRef = editor;

const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run-btn");
const stopBtn = document.getElementById("stop-btn");
const clearBtn = document.getElementById("clear-btn");
const params = new URLSearchParams(location.search);
const sampleId = params.get("sample");
// ?embed=1: editor, Run and output only, for an <iframe> (see style.css, body.embed).
document.body.classList.toggle("embed", params.get("embed") === "1");
const notice = document.getElementById("notice");
// The notice is an overlay (see style.css), so showing it never moves the editor.

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? ` ${kind}` : "");
}

// ---- Virtual board (ubao) ---------------------------------------------------------------------
// The engine reports each pin write, pin read and clock step as an event (platform.rs,
// ubao.rs). The panel shows the pins as the events leave them, the clock, and the event list.
const BOARD_PINS = 8;
const boardPins = document.getElementById("board-pins");
const boardClock = document.getElementById("board-clock");
const boardEvents = document.getElementById("board-events");

function resetBoard() {
  boardPins.replaceChildren();
  for (let n = 0; n < BOARD_PINS; n++) {
    const li = document.createElement("li");
    li.dataset.pin = String(n);
    li.dataset.high = "false";
    li.textContent = `${T.pin} ${n}`;
    boardPins.appendChild(li);
  }
  boardClock.textContent = "0";
  boardEvents.replaceChildren();
  const empty = document.createElement("li");
  empty.className = "board-empty";
  empty.textContent = T.noEvents;
  boardEvents.appendChild(empty);
}

function handleEvent(json) {
  if (!isEmbed && !isOn("secondary")) setToggle("secondary", true, { force: true });
  let ev;
  try {
    ev = JSON.parse(json);
  } catch {
    return;
  }
  if (boardEvents.querySelector(".board-empty")) boardEvents.replaceChildren();
  boardClock.textContent = String(ev.saa);
  if ((ev.aina === "andika" || ev.aina === "soma") && ev.pini >= 0 && ev.pini < BOARD_PINS) {
    const li = boardPins.children[ev.pini];
    if (li && ev.aina === "andika") li.dataset.high = String(ev.hali);
  }
  const item = document.createElement("li");
  const when = `${ev.saa} ms`;
  item.textContent = ev.aina === "subiri"
    ? `${ev.hatua}: subiri → ${when}`
    : `${ev.hatua}: ${ev.aina} ${T.pin.toLowerCase()} ${ev.pini} = ${ev.hali ? "1" : "0"} (${when})`;
  boardEvents.appendChild(item);
  boardEvents.parentElement.scrollTop = boardEvents.parentElement.scrollHeight;
}

function appendOutput(text, isErr) {
  const span = document.createElement("span");
  if (isErr) span.className = "line-err";
  span.textContent = text + "\n";
  outputEl.appendChild(span);
  outputEl.scrollTop = outputEl.scrollHeight;
}

// ---- Engine (worker) ------------------------------------------------------------------------
// Each run goes to a worker. Stop terminates that worker, which ends any run in progress; the
// next run starts a fresh worker and loads the engine again (the browser caches the file).
let worker = null;
// The engine's state machine (states.js). engineReady and busy are read from it, never set directly.
let engineReady = false;
let busy = false;
const engine = createMachine("engine", MACHINES.engine, (state) => {
  engineReady = state === "ready" || state === "running";
  busy = state === "running";
  runBtn.hidden = busy;
  stopBtn.hidden = !busy;
  refreshMenus();
});
const checks = createMachine("check", MACHINES.check);
// The lint findings: shown, or stale after an edit (they no longer match the text). Its changes redraw
// the Problems list, so a stale finding is marked as such.
const lintState = createMachine("lint", MACHINES.lint, () => renderAllProblems());

function showState(state, message) {
  // state: "loading" | "ready" | "failed" | "unsupported" | "running"
  notice.hidden = state === "ready" || state === "running";
  notice.dataset.state = state;
  notice.textContent = message || "";
  if (state === "failed") {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = T.retry;
    retry.addEventListener("click", () => startEngine());
    notice.append(" ", retry);
  }
  runBtn.disabled = state !== "ready";
}

function onWorkerMessage(e) {
  const m = e.data;
  if (m.type === "ready") {
    engine.send("loaded");
    showState("ready");
    setStatus(T.ready, "ok");
    refreshMenus();
    requestCheck();
  } else if (m.type === "out") {
    appendOutput(m.text, m.err);
  } else if (m.type === "tukio") {
    handleEvent(m.json);
  } else if (m.type === "formatted") {
    if (m.seq === formatSeq) applyFormatted(m.text);
  } else if (m.type === "linted") {
    if (m.seq === lintSeq) {
      try {
        activeLint = JSON.parse(m.json).map((d) => ({ ...d, code: d.code, lint: true }));
        lintState.send("lint");
        renderProblems(activeProblems);
        note(activeLint.length ? `${activeLint.length} ${T.problemsIn.toLowerCase()}` : T.lintClean, "ok");
      } catch {
        note(T.error, "error");
      }
    }
  } else if (m.type === "diag" && m.key) {
    try {
      // Only the entry file has a main function; a module's "no kuu" is not a problem.
      const items = JSON.parse(m.json).filter((d) => !(d.code === "SEM000" && !m.key.endsWith(`:${ENTRY}`)));
      projectProblems.set(m.key, items);
      const d = docs.find((x) => x.key === m.key);
      if (d) d.error = items.length > 0;
      renderAllProblems();
    } catch {
      // A malformed result leaves that file's previous problems in place.
    }
  } else if (m.type === "diag") {
    if (m.seq !== checkSeq) return;
    checks.send("answer");
    try {
      const items = JSON.parse(m.json);
      renderProblems(items);
    } catch {
      // A malformed result only means no marks; the run still reports errors in the output.
    }
  } else if (m.type === "done") {
    engine.send("done");
    finishRun(T.done, "ok");
  } else if (m.type === "error") {
    engine.send("error");
    appendOutput(m.message, true);
    finishRun(T.error, "error");
  } else if (m.type === "loadfail") {
    engine.send("fail");
    showState("failed", `${T.loadFailed}: ${m.message}`);
    setStatus(T.error, "error");
    worker = null;
  }
}

function startEngine() {
  if (worker) worker.terminate();
  // From Ready or Failed the engine is loaded again; from Loading (after Stop) nothing is sent.
  if (engine.is("failed")) engine.send("retry");
  else if (engine.is("ready")) engine.send("restart");
  showState("loading", T.loading);
  setStatus(T.loading);
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.addEventListener("message", onWorkerMessage);
  worker.addEventListener("error", (e) => onWorkerMessage({ data: { type: "loadfail", message: e.message || "worker" } }));
}

function finishRun(text, kind) {
  notice.hidden = true;
  refreshMenus();
  setStatus(text, kind);
  runBtn.disabled = false;
}

function run() {
  if (!activeDoc || !engine.send("run")) return;
  outputEl.textContent = "";
  resetBoard();
  stopBtn.disabled = false;
  setStatus(T.running);
  // The sample's scripted pin levels (manifest `inputs`), flattened to saa, pini, hali triples.
  // A project with more than one file runs as a bundle: the entry is kuu, and each file is a module.
  const p = activeDoc?.projectId ? projectById(activeDoc.projectId) : null;
  const bundle = p && Object.keys(p.files).length > 1
    ? { entry: "kuu", modules: bundleOf(liveProject(p)) }
    : null;
  worker.postMessage({
    type: "run",
    source: editor.state.doc.toString(),
    board: currentInputs.flat(),
    bundle,
  });
}

function stop() {
  if (!engine.send("stop")) return;
  worker.terminate();
  worker = null;
  appendOutput(T.stopped, true);
  setStatus(T.stopped, "error");
  startEngine();
}

// ---- Samples --------------------------------------------------------------------------------
// samples/manifest.json lists {file, label, label_en}; the label follows the interface language.
let currentInputs = [];
// The empty state's buttons run the commands they name.
function mountEmptyState() {
  const box = document.createElement("div");
  box.id = "empty-state";
  box.className = "empty-state";
  box.hidden = true;
  box.innerHTML = `<h2>${T.emptyTitle}</h2>
    <div class="empty-actions">
      <button type="button" data-run="project.new">${T.emptyNew}</button>
      <button type="button" data-run="file.openSample">${T.emptyOpen}</button>
      <button type="button" data-run="file.openRecent">${T.emptyRecent}</button>
    </div>`;
  box.addEventListener("click", (e) => {
    const id = e.target?.dataset?.run;
    if (id) runCommand(id);
  });
  document.querySelector(".main-body")?.append(box);
}
let samplesById = new Map();

// ---- Documents: the tabs ---------------------------------------------------------------------
// A document is an open file: a project file (key "p:<project>:<file>") or a sample (key
// "s:<file>"). Its text is the editor's text while it is active, and its last text otherwise.
// `docs` and `activeDoc` are declared with the shell above.

function projectById(id) {
  return projects.find((p) => p.id === id) ?? null;
}
// A workspace is what the interface calls a project (VS Code's word for the same thing).
function activeWorkspace() {
  return activeProject();
}
function activeProject() {
  return projectById(activeProjectId);
}
let projects = loadProjects();
// A workspace saved before the configuration file existed gets one now.
for (const p of projects) syncConfig(p);
let activeProjectId = null; // set by the saved session, or when a workspace is opened

function isDirty(d) {
  const p = d.projectId ? projectById(d.projectId) : null;
  return !!p && fileStatus(p, d.file, d.text) === "modified";
}

// Each open file has a document machine (states.js): "modified" while its text differs from the
// saved text, "clean" otherwise, "closed" once it has left the tabs. Derived from the data, like the
// workspace and the Explorer, so every tab change keeps them in step.
function syncDocStates() {
  for (const d of docs) {
    d.machine ??= createMachine("document", MACHINES.document);
    d.machine.setDerived(isDirty(d) ? "modified" : "clean");
  }
  syncStates();
}

// Remove an open file from the tabs; its document machine ends in "closed".
function forgetDoc(d) {
  d.machine?.setDerived("closed");
  const i = docs.indexOf(d);
  if (i >= 0) docs.splice(i, 1);
}

function renderTabs() {
  syncDocStates();
  const bar = document.getElementById("doc-tabs");
  bar.replaceChildren();
  docs.forEach((d, index) => {
    const tab = document.createElement("div");
    tab.className = "doc-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(d === activeDoc));
    tab.dataset.doc = d.key;
    tab.draggable = true;
    tab.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    });
    tab.addEventListener("dragover", (e) => { e.preventDefault(); tab.classList.add("drop-target"); });
    tab.addEventListener("dragleave", () => tab.classList.remove("drop-target"));
    tab.addEventListener("drop", (e) => {
      e.preventDefault();
      tab.classList.remove("drop-target");
      moveDoc(Number(e.dataTransfer.getData("text/plain")), index);
    });
    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showTabMenu(e.clientX, e.clientY, d);
    });
    if (d.error) {
      const dot = document.createElement("span");
      dot.className = "dot-error";
      dot.textContent = "●";
      tab.append(dot);
    }
    const name = document.createElement("span");
    const owner = d.projectId ? projectById(d.projectId) : null;
    name.textContent = owner ? `${owner.name}/${d.file}` : d.name;
    if (isDirty(d)) {
      name.className = "dirty";
      name.title = T.dirtyWarn;
    }
    tab.append(name);
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "×";
    close.setAttribute("aria-label", `${T.closeTab}: ${d.name}`);
    close.title = T.closeTab;
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      requestClose(d);
    });
    tab.append(close);
    tab.addEventListener("click", () => activate(d));
    bar.append(tab);
  });
  renderFiles();
}

function openDoc(key, name, text, extra = {}) {
  let d = docs.find((x) => x.key === key);
  if (!d) {
    d = { key, name, text, inputs: [], error: false, projectId: null, file: null, ...extra };
    docs.push(d);
  }
  activate(d);
  return d;
}

function activate(d) {
  if (d === activeDoc) return;
  if (activeDoc) {
    activeDoc.text = editor.state.doc.toString();
    activeDoc.state = editor.state; // keeps undo history and the cursor for this file
  }
  activeDoc = d;
  activeLint = [];
  lintState.setDerived("none");
  currentInputs = d.inputs;
  if (d.state) {
    editor.setState(d.state);
  } else {
    editor.setState(state0());
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: d.text } });
  }
  persistSession();
  renderProblems([]);
  renderTabs();
  if (d.projectId) activeProjectId = d.projectId;
  renderProjectSection();
  refreshMenus();
}

// Close a tab. A modified project file first shows a warning; a second request closes it.
function requestClose(d) {
  if (!d) return;
  if (isDirty(d) && !d.closeArmed) {
    d.closeArmed = true;
    note(T.closeAgain, "error");
    setTimeout(() => { d.closeArmed = false; }, 4000);
    return;
  }
  closeDoc(d);
}

function closeDoc(d) {
  if (!d) return;
  const i = docs.indexOf(d);
  if (i < 0) return;
  forgetDoc(d);
  if (d === activeDoc) {
    activeDoc = null;
    if (docs.length) activate(docs[Math.max(0, i - 1)]);
    else showEmptyState();
  } else {
    renderTabs();
  }
  persistSession();
  refreshMenus();
}

// No open file: the main area shows its empty state (the editor is hidden), and the menus that need
// a file are off.
function showEmptyState() {
  activeDoc = null;
  currentInputs = [];
  editor.setState(state0());
  setEmptyState(true);
  renderProblems([]);
  renderTabs();
  persistSession();
  refreshMenus();
}

// The main area's empty state follows the derived main-area state (see syncStates).
function setEmptyState() {
  syncStates();
}

function openProjectFile(p, file) {
  return openDoc(`p:${p.id}:${file}`, file, p.files[file], {
    projectId: p.id, file, inputs: file === ENTRY ? (p.inputs ?? []) : [],
  });
}

// File > Open sample: every sample, by its label.
function openSampleList() {
  openList({
    placeholder: T.openSample,
    items: [...samplesById].map(([file, sample]) => ({
      label: (lang === "en" && sample.label_en) ? sample.label_en : sample.label,
      detail: file,
      run: () => openSample(file),
    })),
  });
}

// File > Open workspace: every workspace kept in this browser.
function openWorkspaceList() {
  openList({
    placeholder: T.openWorkspace,
    items: projects.map((p) => ({
      label: p.name,
      detail: `${Object.keys(p.files).filter((f) => !isConfig(f)).length} ${T.stFiles ?? "files"}`,
      run: () => askToSaveCurrent(p.name, () => switchWorkspace(p)),
    })),
  });
}

// File > Open Recent: the workspaces, the most recently opened first.
function openRecentList() {
  openList({
    placeholder: T.openRecent,
    items: [...projects].sort((a, b) => (b.opened ?? 0) - (a.opened ?? 0)).map((p) => ({
      label: p.name,
      detail: p.opened ? new Date(p.opened).toLocaleString() : "",
      run: () => askToSaveCurrent(p.name, () => switchWorkspace(p)),
    })),
  });
}

// A sample opens as a workspace of its own: its kuu.as is the sample's source, and the workspace is
// kept in the browser at once (so it is listed under Open Recent).
async function openSample(file) {
  const sample = samplesById.get(file);
  const res = await fetch(`samples/${file}`);
  const text = await res.text();
  const label = (lang === "en" && sample?.label_en) ? sample.label_en : (sample?.label ?? file);
  // A sample already open as a workspace is switched to, not copied again.
  const existing = projects.find((x) => x.origin === `sample:${file}`);
  if (existing) {
    askToSaveCurrent(existing.name, () => switchWorkspace(existing));
    return;
  }
  askToSaveCurrent(label, () => {
    const p = projectFromSample(uniqueName(label, projects.map((x) => x.name)), text);
    p.id = newId();
    p.origin = `sample:${file}`;
    p.inputs = sample?.inputs ?? [];
    p.opened = Date.now();
    projects.push(p);
    activeProjectId = p.id;
    persistProjects();
    openProjectFile(p, ENTRY);
    renderProjectSection();
    renderTabs();
  });
}

// Make `p` the open workspace, and record when it was opened (Open Recent).
function switchWorkspace(p) {
  p.opened = Date.now();
  activeProjectId = p.id;
  persistProjects();
  openProjectFile(p, ENTRY);
  renderProjectSection();
  renderTabs();
}

// Before the open workspace is replaced: when it has unsaved changes, ask to save them.
function workspaceDirty(p) {
  return docs.some((d) => d.projectId === p.id && d.text !== p.files[d.file]);
}

function askToSaveCurrent(nextName, next) {
  const p = activeProject();
  if (!p || !workspaceDirty(p)) {
    next();
    return;
  }
  showDialog(`${T.saveBefore} "${p.name}" ${T.beforeOpening} "${nextName}"?`, [
    { label: T.saveProject, run: () => { saveActiveProject(); next(); } },
    { label: T.dontSave, run: () => { discardUnsaved(p); next(); } },
    { label: T.cancel, run: () => {} },
  ]);
}

// Drop the open files of a workspace whose changes are not kept.
function discardUnsaved(p) {
  for (const d of docs.filter((x) => x.projectId === p.id)) forgetDoc(d);
  activeDoc = null;
  editor.setState(state0());
  renderTabs();
}

// A small dialog with its buttons (no browser dialogs).
function showDialog(message, buttons) {
  document.getElementById("dialog")?.remove();
  const box = document.createElement("div");
  box.id = "dialog";
  box.className = "dialog-overlay";
  box.setAttribute("role", "alertdialog");
  const text = document.createElement("p");
  text.textContent = message;
  const row = document.createElement("div");
  row.className = "dialog-buttons";
  for (const b of buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = b.label;
    button.addEventListener("click", () => {
      box.remove();
      b.run();
    });
    row.append(button);
  }
  const inner = document.createElement("div");
  inner.className = "dialog";
  inner.append(text, row);
  box.append(inner);
  document.body.append(box);
  row.querySelector("button")?.focus();
}

// The text a project file has now: the open document's text, or the saved text.
function liveText(p, file) {
  const d = docs.find((x) => x.key === `p:${p.id}:${file}`);
  return d ? d.text : p.files[file];
}
function liveProject(p) {
  return { ...p, files: Object.fromEntries(Object.keys(p.files).map((f) => [f, liveText(p, f)])) };
}

// ---- Projects: create, save, export, import --------------------------------------------------
// Notifications: a message from an action, shown in the stack at the bottom right (and kept in the
// bell's history). The status bar text is the engine's, so a message never replaces it.
const notifyHistory = [];
function note(text, kind = "ok") {
  const stack = document.getElementById("notifications");
  notifyHistory.push({ text, kind, at: new Date() });
  if (notifyHistory.length > 100) notifyHistory.shift();
  renderBell();
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  const message = document.createElement("span");
  message.textContent = text;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.textContent = "×";
  close.setAttribute("aria-label", T.closeFind);
  const dismiss = () => toast.remove();
  close.addEventListener("click", dismiss);
  toast.append(message, close);
  stack.append(toast);
  setTimeout(dismiss, kind === "error" ? 8000 : 4000);
  while (stack.children.length > 4) stack.firstElementChild.remove();
}

function renderBell() {
  const bell = document.getElementById("status-bell");
  if (bell) bell.textContent = notifyHistory.length ? `${notifyHistory.length}` : "";
}

// The bell lists the notifications of this visit, newest first, in a list overlay.
function openNotifications() {
  openList({
    placeholder: T.notifications,
    items: notifyHistory.slice().reverse().map((n) => ({
      label: n.text,
      detail: `${n.at.toLocaleTimeString()} · ${n.kind}`,
      run: () => {},
    })),
  });
}

function persistProjects() {
  // The workspace file at the root is written from the workspace's state before each save.
  for (const p of projects) syncConfig(p);
  if (saveProjects(projects)) return true;
  note(T.storageOff, "error");
  return false;
}

function saveActiveProject() {
  const p = activeProject();
  if (!p) return;
  for (const d of docs) {
    if (d.projectId === p.id) p.files[d.file] = d.text;
  }
  p.updated = new Date().toISOString();
  if (persistProjects()) note(T.savedNote, "ok");
  renderTabs();
  renderProjectSection();
}

function createProject(name) {
  const p = newProject(name);
  p.id = newId();
  projects.push(p);
  activeProjectId = p.id;
  persistProjects();
  openProjectFile(p, ENTRY);
  renderProjectSection();
  return p;
}

function newProjectFromInput() {
  const name = document.getElementById("project-name")?.value.trim() || `Mradi ${projects.length + 1}`;
  createProject(name);
  note(T.savedNote, "ok");
}

function saveSampleAsProject() {
  if (!activeDoc || activeDoc.projectId) return;
  const p = projectFromSample(activeDoc.name.replace(/\.as$/, ""), editor.state.doc.toString());
  p.id = newId();
  projects.push(p);
  activeProjectId = p.id;
  persistProjects();
  openProjectFile(p, ENTRY);
  renderProjectSection();
}

function exportActiveProject() {
  const p = activeProject();
  if (!p) return;
  const copy = liveProject(p);
  const blob = new Blob([exportProject(copy)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${p.name.replace(/[^A-Za-z0-9_ -]+/g, "_")}.asili.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  note(T.exportedNote, "ok");
}

async function importFile(file) {
  try {
    const project = importProject(await file.text());
    project.name = uniqueName(project.name, projects.map((x) => x.name));
    project.id = newId();
    projects.push(project);
    activeProjectId = project.id;
    persistProjects();
    openProjectFile(project, ENTRY);
    renderProjectSection();
    note(T.importedNote, "ok");
  } catch (e) {
    note(`${T.importFailed}: ${errText(e)}`, "error");
  }
}

// ---- Files: create, delete, and their status --------------------------------------------------
// ---- Explorer tree: folders, files, icons ---------------------------------------------------------
const TREE_ICON = (body, cls) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="ico ${cls}" aria-hidden="true">${body}</svg>`;
const CHEVRON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="chev" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
const FOLDER_ICON = TREE_ICON('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', "ico-folder");
const DOC_BODY = '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>';
// The icon of a file by its kind: Asili, Markdown, configuration, lock, or a generic file.
function fileIcon(file) {
  const name = file.split("/").pop();
  if (name.endsWith(".as")) return TREE_ICON(DOC_BODY, "ico-as");
  if (name.endsWith(".md")) return TREE_ICON(DOC_BODY, "ico-md");
  if (/\.(toml|json|ya?ml)$/.test(name)) return TREE_ICON('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>', "ico-config");
  if (name.endsWith(".lock")) return TREE_ICON('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', "ico-lock");
  return TREE_ICON(DOC_BODY, "ico-file");
}

const treeOpen = new Set(loadTreeOpen());
function loadTreeOpen() {
  try {
    return JSON.parse(localStorage.getItem("asili-tree-v1") ?? "[]");
  } catch {
    return [];
  }
}
function saveTreeOpen() {
  try {
    localStorage.setItem("asili-tree-v1", JSON.stringify([...treeOpen]));
  } catch {
    // The open folders are kept for this visit only.
  }
}

// The workspace as nested folders and files: { folders: Map(name -> node), files: [file paths] }.
function buildTree(p) {
  const root = { folders: new Map(), files: [] };
  const nodeAt = (path) => {
    let n = root;
    for (const part of path.split("/").filter(Boolean)) {
      if (!n.folders.has(part)) n.folders.set(part, { folders: new Map(), files: [] });
      n = n.folders.get(part);
    }
    return n;
  };
  for (const folder of foldersOf(p)) nodeAt(folder);
  for (const file of Object.keys(p.files)) {
    const folder = folderOf(file);
    (folder ? nodeAt(folder) : root).files.push(file);
  }
  return root;
}

// One row per visible item, indented by depth. Folders first, then files, each sorted by name.
function renderTreeLevel(p, node, path, depth, list) {
  for (const name of [...node.folders.keys()].sort()) {
    const folder = path ? `${path}/${name}` : name;
    const open = treeOpen.has(`${p.id}:${folder}`);
    const li = document.createElement("li");
    li.className = "tree-row folder";
    li.dataset.folder = folder;
    li.setAttribute("aria-expanded", String(open));
    li.style.paddingLeft = `${0.4 + depth * 0.9}rem`;
    li.draggable = true;
    li.innerHTML = CHEVRON + FOLDER_ICON;
    const label = document.createElement("span");
    label.className = "tree-name";
    label.textContent = name;
    li.append(label);
    li.addEventListener("click", () => {
      if (open) treeOpen.delete(`${p.id}:${folder}`);
      else treeOpen.add(`${p.id}:${folder}`);
      saveTreeOpen();
      renderFiles();
    });
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showFolderMenu(e.clientX, e.clientY, p, folder);
    });
    attachTreeDrop(li, p, folder);
    list.append(li);
    if (open) renderTreeLevel(p, node.folders.get(name), folder, depth + 1, list);
  }
  for (const file of [...node.files].sort()) {
    const li = fileRow(p, file, depth);
    list.append(li);
  }
}

function fileRow(p, file, depth) {
  const li = document.createElement("li");
  const open = docs.find((x) => x.key === `p:${p.id}:${file}`);
  li.className = "tree-row file";
  li.dataset.file = file;
  li.setAttribute("aria-current", String(open !== undefined && open === activeDoc));
  li.style.paddingLeft = `${0.4 + depth * 0.9 + 0.9}rem`;
  li.draggable = true;
  li.innerHTML = fileIcon(file);
  const label = document.createElement("span");
  label.className = "tree-name";
  label.textContent = isConfig(file) ? file : `${moduleOf(file)}.as`;
  label.title = file;
  const meta = document.createElement("span");
  meta.className = "file-meta";
  const status = fileStatus(p, file, liveText(p, file)) === "modified" ? T.stModified : T.stSaved;
  meta.textContent = `${status}${open?.error ? ` · ${T.stErrors}` : ""}`;
  if (file === ENTRY) label.classList.add("entry");
  if (isConfig(file)) li.classList.add("config");
  li.append(label, meta);
  li.addEventListener("click", () => openProjectFile(p, file));
  li.addEventListener("dblclick", () => startRename(p, file, li));
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showFileMenu(e.clientX, e.clientY, p, file, li);
  });
  li.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/x-asili-file", file);
    e.dataTransfer.effectAllowed = "move";
  });
  return li;
}

// Drop a file on a folder to move it into that folder.
function attachTreeDrop(li, p, folder) {
  li.addEventListener("dragover", (e) => {
    if (![...e.dataTransfer.types].includes("application/x-asili-file")) return;
    e.preventDefault();
    li.classList.add("drop-target");
  });
  li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
  li.addEventListener("drop", (e) => {
    const file = e.dataTransfer.getData("application/x-asili-file");
    li.classList.remove("drop-target");
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    moveFileTo(p, file, folder);
  });
}

function moveFileTo(p, file, folder) {
  try {
    const next = moveFile(p, file, folder);
    if (next === file) return;
    for (const d of docs.filter((x) => x.key === `p:${p.id}:${file}`)) {
      d.key = `p:${p.id}:${next}`;
      d.file = next;
      d.name = next;
    }
    persistProjects();
    renderTabs();
  } catch (e) {
    note(errText(e), "error");
  }
}

// Folder operations: New file, New folder, Rename, Delete (the second click confirms).
function showFolderMenu(x, y, p, folder) {
  fileMenu?.remove();
  const menu = document.createElement("div");
  menu.className = "file-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const add = (label, run, armedLabel) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => {
      if (armedLabel && b.dataset.armed !== "yes") {
        b.dataset.armed = "yes";
        b.textContent = armedLabel;
        return;
      }
      menu.remove();
      fileMenu = null;
      run();
    });
    menu.append(b);
  };
  add(T.newFile, () => newItemIn(p, folder, "file"));
  add(T.newFolder, () => newItemIn(p, folder, "folder"));
  add(T.rename, () => startFolderRename(p, folder));
  add(T.delete, () => removeFolder(p, folder), T.confirmDelete);
  document.body.append(menu);
  fileMenu = menu;
  const dismiss = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      fileMenu = null;
      document.removeEventListener("pointerdown", dismiss);
    }
  };
  document.addEventListener("pointerdown", dismiss);
}

// A new file or folder inside `folder`, named by the first free name, and opened for renaming.
function newItemIn(p, folder, kind) {
  treeOpen.add(`${p.id}:${folder}`);
  saveTreeOpen();
  const base = kind === "file" ? "bila_jina" : "folda";
  let n = 1;
  const taken = (name) => (kind === "file" ? `${name}.as` in p.files : foldersOf(p).includes(name));
  while (taken(folder ? `${folder}/${base}_${n}` : `${base}_${n}`)) n += 1;
  const name = `${base}_${n}`;
  const path = folder ? `${folder}/${name}` : name;
  try {
    if (kind === "file") addFile(p, path, "");
    else addFolder(p, path);
    persistProjects();
    if (kind === "file") openProjectFile(p, `${path}.as`);
    renderFiles();
    // A new folder opens for its name, as in VS Code.
    if (kind === "folder") startFolderRename(p, path);
  } catch (e) {
    note(errText(e), "error");
  }
}

function startFolderRename(p, folder) {
  const li = document.querySelector(`.tree-row.folder[data-folder="${CSS.escape(folder)}"] .tree-name`);
  if (!li) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "file-rename";
  input.value = folder.split("/").pop();
  input.setAttribute("aria-label", T.rename);
  li.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (commit) {
      try {
        const next = renameFolder(p, folder, input.value.trim());
        for (const d of docs.filter((x) => x.projectId === p.id && x.file.startsWith(`${folder}/`))) {
          d.file = next + d.file.slice(folder.length);
          d.key = `p:${p.id}:${d.file}`;
          d.name = d.file;
        }
        treeOpen.delete(`${p.id}:${folder}`);
        treeOpen.add(`${p.id}:${next}`);
        saveTreeOpen();
        persistProjects();
      } catch (e) {
        note(errText(e), "error");
      }
    }
    renderTabs();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(false));
}

function removeFolder(p, folder) {
  const inside = Object.keys(p.files).filter((f) => f.startsWith(`${folder}/`));
  try {
    deleteFolder(p, folder);
  } catch (e) {
    note(errText(e), "error");
    return;
  }
  for (const d of docs.filter((x) => x.projectId === p.id && inside.includes(x.file))) closeDoc(d, { force: true });
  persistProjects();
  renderTabs();
  note(`${folder}: ${T.deleted}`, "ok");
}

function createFileFromInput() {
  const p = activeProject();
  const input = document.getElementById("file-name");
  if (!p || !input) return;
  try {
    const module = input.value.trim();
    const file = addFile(p, module, "");
    persistProjects();
    input.value = "";
    openProjectFile(p, file);
    renderFiles();
  } catch (e) {
    note(e.message, "error");
  }
}


function renderProjectSection() {
  const has = !!activeWorkspace();
  for (const id of ["project-save-btn", "project-export-btn", "project-rename-btn", "project-delete-btn"]) {
    const b = document.getElementById(id);
    if (b) b.disabled = !has;
  }
  refreshMenus();
}

// The workspace's name, the root of the tree: double-click to rename; right-click for its menu.
function workspaceRoot(p) {
  const li = document.createElement("li");
  li.className = "tree-row root";
  li.dataset.workspace = p.id;
  li.innerHTML = FOLDER_ICON;
  const label = document.createElement("span");
  label.className = "tree-name";
  label.textContent = p.name;
  li.append(label);
  li.addEventListener("dblclick", () => startRootRename(p, li));
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showRootMenu(e.clientX, e.clientY, p, li);
  });
  return li;
}

function startRootRename(p, li) {
  const old = li.querySelector(".tree-name");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "file-rename";
  input.value = p.name;
  input.setAttribute("aria-label", T.projectRename);
  old.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (commit && input.value.trim()) {
      p.name = uniqueName(input.value.trim(), projects.filter((x) => x.id !== p.id).map((x) => x.name));
      p.updated = new Date().toISOString();
      persistProjects();
      note(T.fileRenamed, "ok");
    }
    renderFiles();
    renderTabs();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(false));
}

function showRootMenu(x, y, p, li) {
  fileMenu?.remove();
  const menu = document.createElement("div");
  menu.className = "file-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const add = (label, run, armedLabel) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => {
      if (armedLabel && b.dataset.armed !== "yes") {
        b.dataset.armed = "yes";
        b.textContent = armedLabel;
        return;
      }
      menu.remove();
      fileMenu = null;
      run();
    });
    menu.append(b);
  };
  add(T.newFile, () => newItemIn(p, "", "file"));
  add(T.newFolder, () => newItemIn(p, "", "folder"));
  add(T.closeWorkspace, () => closeWorkspace());
  add(T.projectRename, () => startRootRename(p, li));
  add(T.projectDelete, () => deleteActiveProject());
  document.body.append(menu);
  fileMenu = menu;
  const dismiss = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      fileMenu = null;
      document.removeEventListener("pointerdown", dismiss);
    }
  };
  document.addEventListener("pointerdown", dismiss);
}
// The derived states (workspace, Explorer, main area), read from the page's data by states.js.
const derived = {};
const workspaceMachine = createMachine("workspace", MACHINES.workspace);
function syncStates() {
  const p = activeProject();
  const d = deriveStates({
    workspace: p, openFiles: docs, activeFile: activeDoc,
    dirty: p ? workspaceDirty(p) : false,
  });
  workspaceMachine.setDerived(d.workspace);
  derived.explorer = d.explorer;
  derived.mainArea = d.mainArea;
  const empty = d.mainArea === "empty";
  document.querySelector(".main")?.classList.toggle("no-doc", empty);
  const box = document.getElementById("empty-state");
  if (box) box.hidden = !empty;
  refreshMenus();
}

function renderFiles() {
  const list = document.getElementById("file-list");
  if (!list) return;
  list.tabIndex = -1;
  const p = activeProject();
  list.replaceChildren();
  // The toolbar's file commands need a workspace.
  for (const id of ["explorer-new-file", "explorer-new-folder", "explorer-collapse"]) {
    const b = document.getElementById(id);
    if (b) b.disabled = !p;
  }
  syncStates();
  if (!p) {
    // No workspace: say so, and offer the ways to get one (as VS Code's Explorer does).
    const box = document.createElement("li");
    box.className = "explorer-empty";
    box.innerHTML = `<p>${T.explorerEmpty}</p><div class="empty-actions">
      <button type="button" data-run="project.new">${T.explorerNew}</button>
      <button type="button" data-run="file.openWorkspace">${T.explorerOpen}</button>
      <button type="button" data-run="file.openSample">${T.explorerSample}</button></div>`;
    box.addEventListener("click", (e) => {
      const id = e.target?.dataset?.run;
      if (id) runCommand(id);
    });
    list.append(box);
    return;
  }
  list.append(workspaceRoot(p));
  renderTreeLevel(p, buildTree(p), "", 1, list);
  if (Object.keys(p.files).length === 0) {
    const none = document.createElement("li");
    none.className = "none";
    none.textContent = T.noFiles;
    list.append(none);
  }
}

// ---- Problems: the diagnostics of the active document -----------------------------------------
// The problems of the active file (from its last check), and of the other files of the project.
let activeProblems = [];
const projectProblems = new Map(); // document key -> diagnostics from the last check of that file

function renderProblems(items) {
  activeProblems = items;
  const all = [...items, ...activeLint];
  editor.dispatch({ effects: setDiagnostics.of(all) });
  if (activeDoc) activeDoc.error = all.length > 0;
  renderAllProblems();
}

// The lint findings of the active file (from the last Lint), shown with its diagnostics.
let activeLint = [];

function renderAllProblems() {
  const list = document.getElementById("problems");
  const count = document.getElementById("problem-count");
  if (!list) return;
  const entries = [];
  if (activeDoc) {
    for (const d of activeProblems) entries.push({ key: activeDoc.key, file: activeDoc.file ?? activeDoc.name, ...d });
  }
  const p = activeProject();
  for (const [key, items] of projectProblems) {
    if (key === activeDoc?.key || !p || !key.startsWith(`p:${p.id}:`)) continue;
    const file = key.slice(`p:${p.id}:`.length);
    for (const d of items) entries.push({ key, file, ...d });
  }
  list.replaceChildren();
  if (entries.length === 0) {
    const none = document.createElement("li");
    none.className = "none";
    none.textContent = p ? T.noProblemsInProject : T.noProblems;
    list.append(none);
  }
  for (const e of entries) {
    const li = document.createElement("li");
    li.textContent = `${e.file} · Ln ${e.line}: ${e.code} ${e.message}`;
    if (e.lint && lintState.is("stale")) {
      li.classList.add("stale");
      li.title = T.lintStale;
    }
    li.addEventListener("click", () => openProblem(e));
    list.append(li);
  }
  count.textContent = entries.length ? String(entries.length) : "";
  const status = document.getElementById("status-problems");
  if (status) status.textContent = entries.length ? `● ${entries.length}` : "";
  renderTabs();
}

function openProblem(e) {
  if (activeDoc && e.key === activeDoc.key) {
    goToLine(e.line);
    return;
  }
  const d = docs.find((x) => x.key === e.key);
  if (d) activate(d);
  else {
    const p = activeProject();
    if (p) openProjectFile(p, e.file);
  }
  setTimeout(() => goToLine(e.line), 0);
}

function goToLine(line) {
  const doc = editor.state.doc;
  if (!line || line < 1 || line > doc.lines) return;
  editor.dispatch({ selection: { anchor: doc.line(line).from }, scrollIntoView: true });
  editor.focus();
}

function updateCursor(state) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  document.getElementById("cursor-pos").textContent = `Ln ${line.number}, Col ${head - line.from + 1}`;
  document.getElementById("status-file").textContent = activeDoc?.name ?? "";
}

// Share: the program goes into the link's fragment (see share.js), so the server never sees it.
// A shared link with one file opens as a tab; with several files it becomes a project (named Kiungo).
function openSharedFiles(files) {
  const names = Object.keys(files);
  if (names.length === 1) {
    openDoc("link", names[0], files[names[0]]);
    return;
  }
  const name = uniqueName("Kiungo", projects.map((x) => x.name));
  const project = importProject(JSON.stringify({
    schema: "asili-project", version: 1, name, entry: "kuu", files,
    created: new Date().toISOString(),
  }));
  project.id = newId();
  projects.push(project);
  activeProjectId = project.id;
  persistProjects();
  openProjectFile(project, ENTRY);
  renderProjectSection();
}

async function shareCurrent() {
  try {
    const p = activeProject();
    const files = p && activeDoc?.projectId === p.id
      ? liveProject(p).files
      : { "kuu.as": editor.state.doc.toString() };
    const token = await encodeShare(files);
    const url = `${location.origin}${location.pathname}?lugha=${lang}#k=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(T.linkCopied, "ok");
    } catch {
      location.hash = `k=${token}`;
      setStatus(T.linkInBar, "ok");
    }
  } catch {
    setStatus(T.linkFailed, "error");
  }
}

// ---- Start-up --------------------------------------------------------------------------------
async function loadSamples() {
  const res = await fetch("samples/manifest.json");
  const manifest = await res.json();
  samplesById = new Map(manifest.map((sample) => [sample.file, sample]));
  // A share link (#k=) wins; then the saved session; then the active project's entry; then the sample.
  let opened = false;
  if (location.hash.startsWith("#k=")) {
    try {
      openSharedFiles(await decodeShare(location.hash.slice(3)));
      opened = true;
    } catch {
      setStatus(T.linkBad, "error");
    }
  }
  if (!opened && !location.hash.startsWith("#k=")) {
    opened = restoreSession((file) => samplesById.get(file)?.inputs ?? []);
  }
  if (!opened && activeProject()) {
    openProjectFile(activeProject(), ENTRY);
    opened = true;
  }
  if (!opened && manifest.length > 0) {
    const sampleId = new URLSearchParams(location.search).get("sample");
    const wanted = manifest.find((sample) => sample.id === sampleId) ?? manifest[0];
    await openSample(wanted.file);
  }
  renderProjectSection();
  renderFiles();
}

// Wire the sidebar controls (they exist once the shell is rendered).
document.body.addEventListener("click", (e) => {
  const id = e.target?.id;
  const p = activeProject();
  if (id === "explorer-new-file" && p) newItemIn(p, "", "file");
  if (id === "explorer-new-folder" && p) newItemIn(p, "", "folder");
  if (id === "explorer-collapse") {
    treeOpen.clear();
    saveTreeOpen();
    renderFiles();
  }
});
document.body.addEventListener("change", (e) => {
  if (e.target?.id === "import-file" && e.target.files?.[0]) importFile(e.target.files[0]);
});
document.body.addEventListener("keydown", (e) => {

});

clearBtn.addEventListener("click", () => {
  outputEl.textContent = "";
});
runBtn.addEventListener("click", run);
stopBtn.addEventListener("click", stop);

// Keys come from the command registry (commands.js).
installKeys(window);


// ---- Tabs: reorder, context menu, close groups -------------------------------------------------
function moveDoc(from, to) {
  if (from === to || from < 0 || from >= docs.length || to < 0 || to >= docs.length) return;
  const [d] = docs.splice(from, 1);
  docs.splice(to, 0, d);
  renderTabs();
  persistSession();
}

function closeOthers(keep, right = false) {
  const index = docs.indexOf(keep);
  const targets = docs.filter((d, i) => d !== keep && (!right || i > index));
  let kept = 0;
  for (const d of targets) {
    if (isDirty(d)) {
      kept += 1;
      continue;
    }
    closeDoc(d, { force: true });
  }
  if (kept) note(`${T.dirtyWarn}: ${kept}`, "error");
}

let tabMenu = null;
function showTabMenu(x, y, d) {
  tabMenu?.remove();
  const menu = document.createElement("div");
  menu.className = "tab-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const add = (label, run) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => { menu.remove(); tabMenu = null; run(); });
    menu.append(b);
  };
  add(T.closeTab, () => requestClose(d));
  add(T.closeOthers, () => closeOthers(d));
  add(T.closeRight, () => closeOthers(d, true));
  document.body.append(menu);
  tabMenu = menu;
  const dismiss = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      tabMenu = null;
      document.removeEventListener("pointerdown", dismiss);
    }
  };
  document.addEventListener("pointerdown", dismiss);
}

// ---- Explorer: rename, duplicate, delete with undo -----------------------------------------------
let lastRemoved = null; // { kind: "file" | "project", ... } for the Undo notice
let undoTimer = null;

function showUndo(message) {
  const box = document.getElementById("undo-note");
  if (!box) return;
  box.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = T.undoLabel;
  button.addEventListener("click", undoRemoval);
  box.append(text, button);
  box.hidden = false;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { box.hidden = true; lastRemoved = null; }, 8000);
}

function undoRemoval() {
  const r = lastRemoved;
  if (!r) return;
  lastRemoved = null;
  document.getElementById("undo-note").hidden = true;
  if (r.kind === "file") {
    const p = projectById(r.projectId);
    if (!p) return;
    try {
      addFile(p, moduleOf(r.file), r.text);
    } catch (e) {
      note(errText(e), "error");
      return;
    }
    persistProjects();
    openProjectFile(p, r.file);
    renderFiles();
  } else {
    projects.push(r.project);
    activeProjectId = r.project.id;
    persistProjects();
    openProjectFile(r.project, ENTRY);
    renderProjectSection();
  }
}

function removeFile(p, file) {
  const text = p.files[file];
  try {
    deleteFile(p, file);
  } catch (e) {
    note(errText(e), "error");
    return;
  }
  for (const d of docs.filter((x) => x.key === `p:${p.id}:${file}`)) closeDoc(d, { force: true });
  persistProjects();
  lastRemoved = { kind: "file", projectId: p.id, file, text };
  showUndo(`${file}: ${T.deleted}`);
  renderTabs();
}

function startRename(p, file, li) {
  const old = li.querySelector(".tree-name") ?? li.querySelector("span");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "file-rename";
  input.value = moduleOf(file);
  input.setAttribute("aria-label", T.rename);
  old.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (!commit) {
      renderFiles();
      return;
    }
    try {
      const next = renameFile(p, file, input.value.trim());
      for (const d of docs.filter((x) => x.key === `p:${p.id}:${file}`)) {
        d.key = `p:${p.id}:${next}`;
        d.name = next;
        d.file = next;
      }
      persistProjects();
      note(T.fileRenamed, "ok");
    } catch (e) {
      note(errText(e), "error");
    }
    renderTabs();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(false));
}

function duplicateFile(p, file) {
  const folder = folderOf(file);
  const base = `${moduleOf(file)}_kopi`;
  let name = base;
  for (let n = 2; `${folder ? `${folder}/` : ""}${name}.as` in p.files; n++) name = `${base}_${n}`;
  try {
    const next = addFile(p, folder ? `${folder}/${name}` : name, p.files[file]);
    persistProjects();
    openProjectFile(p, next);
    renderFiles();
  } catch (e) {
    note(errText(e), "error");
  }
}

let fileMenu = null;
function showFileMenu(x, y, p, file, li) {
  fileMenu?.remove();
  const menu = document.createElement("div");
  menu.className = "file-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const add = (label, run, armedLabel) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => {
      if (armedLabel && b.dataset.armed !== "yes") {
        b.dataset.armed = "yes";
        b.textContent = armedLabel;
        return;
      }
      menu.remove();
      fileMenu = null;
      run();
    });
    menu.append(b);
  };
  add(T.rename, () => startRename(p, file, li));
  add(T.duplicate, () => duplicateFile(p, file));
  if (file !== ENTRY && !isConfig(file)) add(T.delete, () => removeFile(p, file), T.confirmDelete);
  document.body.append(menu);
  fileMenu = menu;
  const dismiss = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      fileMenu = null;
      document.removeEventListener("pointerdown", dismiss);
    }
  };
  document.addEventListener("pointerdown", dismiss);
}

function deleteProjectFile(p, file, button) {
  if (button.dataset.armed !== "yes") {
    button.dataset.armed = "yes";
    button.textContent = T.confirmDelete;
    setTimeout(() => {
      button.dataset.armed = "";
      button.textContent = T.deleteFile;
    }, 3000);
    return;
  }
  removeFile(p, file);
}

function renameActiveProject() {
  const p = activeProject();
  if (p) startRootRename(p, document.querySelector(".tree-row.root"));
}

let deleteArmedAt = 0;
// Delete the open workspace after a confirmation dialog with a Delete button.
function deleteActiveProject() {
  const p = activeProject();
  if (!p) return;
  showDialog(`${T.projectDelete} "${p.name}"?`, [
    { label: T.projectDelete, run: () => performDeleteWorkspace(p) },
    { label: T.cancel, run: () => {} },
  ]);
}

// Delete a workspace: its files close, and it is no longer the open workspace. The Explorer then
// shows its empty state (no other workspace is opened in its place).
// Close a workspace: its files close, and it is kept (Open Recent lists it). Unsaved changes are
// asked about first.
function closeWorkspace() {
  const p = activeProject();
  if (!p) return;
  if (!workspaceDirty(p)) {
    performCloseWorkspace(p);
    return;
  }
  showDialog(`${T.saveBefore} "${p.name}"?`, [
    { label: T.saveProject, run: () => { saveActiveProject(); performCloseWorkspace(p); } },
    { label: T.dontSave, run: () => performCloseWorkspace(p) },
    { label: T.cancel, run: () => {} },
  ]);
}

function performCloseWorkspace(p) {
  const removed = docs.filter((x) => x.projectId === p.id);
  for (const d of removed) forgetDoc(d);
  if (removed.includes(activeDoc)) activeDoc = null;
  if (activeProjectId === p.id) activeProjectId = null;
  persistProjects();
  if (docs.length) activate(docs[0]);
  else showEmptyState();
  renderProjectSection();
  renderTabs();
  renderFiles();
}

function performDeleteWorkspace(p) {
  const wasOpen = activeProjectId === p.id;
  const removed = docs.filter((x) => x.projectId === p.id);
  for (const d of removed) forgetDoc(d);
  if (removed.includes(activeDoc)) activeDoc = null;
  projects = projects.filter((x) => x.id !== p.id);
  lastRemoved = { kind: "project", project: p };
  if (wasOpen) activeProjectId = null;
  persistProjects();
  showUndo(`${p.name}: ${T.deleted}`);
  if (wasOpen) {
    if (docs.length) activate(docs[0]);
    else showEmptyState();
  }
  renderProjectSection();
  renderTabs();
  renderFiles();
}

function errText(e) {
  if (e instanceof Error && e.key) {
    const text = T[`err${e.key[0].toUpperCase()}${e.key.slice(1)}`] ?? e.key;
    return `${text}${e.detail ? `: ${e.detail}` : ""}`;
  }
  return e.message;
}

function createUntitledFile() {
  try {
    let p = activeProject();
    if (!p) p = createProject(`Mradi ${projects.length + 1}`);
    let n = 1;
    while (`bila_jina_${n}.as` in p.files) n += 1;
    const file = addFile(p, `bila_jina_${n}`, "");
    persistProjects();
    openProjectFile(p, file);
    renderFiles();
    setRegionVisible("primary", true);
  } catch (e) {
    note(errText(e), "error");
  }
}

// ---- Quick open, the find bar, go to line ---------------------------------------------------------
function openQuickOpen() {
  const items = [];
  const p = activeProject();
  if (p) {
    for (const file of Object.keys(p.files)) {
      items.push({ label: file, detail: p.name, run: () => openProjectFile(p, file) });
    }
  }
  for (const [file, sample] of samplesById) {
    const label = (lang === "en" && sample.label_en) ? sample.label_en : sample.label;
    items.push({ label, detail: file, run: () => openSample(file) });
  }
  openList({ placeholder: T.goToFile, items });
}

const findState = { query: "", matches: [], index: -1 };
let findMode = "find";

function mountFindBar() {
  const bar = document.createElement("div");
  bar.className = "findbar";
  bar.hidden = true;
  bar.innerHTML = `
    <input id="find-input" type="text" aria-label="${T.findPlaceholder}" placeholder="${T.findPlaceholder}" />
    <span id="find-count" class="count"></span>
    <button type="button" id="find-prev">${T.findPrev}</button>
    <button type="button" id="find-next">${T.findNext}</button>
    <input id="replace-input" type="text" aria-label="${T.replacePlaceholder}" placeholder="${T.replacePlaceholder}" hidden />
    <button type="button" id="replace-one" hidden>${T.replaceOne}</button>
    <button type="button" id="replace-all" hidden>${T.replaceAll}</button>
    <input id="goto-input" type="number" min="1" aria-label="${T.linePlaceholder}" placeholder="${T.linePlaceholder}" hidden />
    <button type="button" id="find-close">${T.closeFind}</button>`;
  document.getElementById("editor").before(bar);
  const $ = (id) => document.getElementById(id);
  $("find-input").addEventListener("input", (e) => runFind(e.target.value));
  $("find-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); moveFind(e.shiftKey ? -1 : 1); }
    if (e.key === "Escape") { e.preventDefault(); closeFind(); }
  });
  $("replace-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); replaceOne(); }
    if (e.key === "Escape") { e.preventDefault(); closeFind(); }
  });
  $("goto-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); const n = parseInt(e.target.value, 10); closeFind(); goToLine(n); }
    if (e.key === "Escape") { e.preventDefault(); closeFind(); }
  });
  $("find-next").addEventListener("click", () => moveFind(1));
  $("find-prev").addEventListener("click", () => moveFind(-1));
  $("replace-one").addEventListener("click", replaceOne);
  $("replace-all").addEventListener("click", replaceAll);
  $("find-close").addEventListener("click", closeFind);
}

function openFind(mode) {
  const bar = document.querySelector(".findbar");
  if (!bar) return;
  findMode = mode;
  bar.hidden = false;
  const $ = (id) => document.getElementById(id);
  const replaceRow = mode === "replace";
  const gotoRow = mode === "goto";
  for (const id of ["replace-input", "replace-one", "replace-all"]) $(id).hidden = !replaceRow;
  $("goto-input").hidden = !gotoRow;
  for (const id of ["find-input", "find-count", "find-prev", "find-next"]) $(id).hidden = gotoRow;
  if (gotoRow) {
    $("goto-input").focus();
    return;
  }
  const sel = editor.state.selection.main;
  if (!sel.empty) {
    const text = editor.state.sliceDoc(sel.from, sel.to);
    if (!text.includes("\n")) $("find-input").value = text;
  }
  $("find-input").focus();
  $("find-input").select();
  runFind($("find-input").value);
}

function closeFind() {
  const bar = document.querySelector(".findbar");
  if (bar) bar.hidden = true;
  findState.query = "";
  findState.matches = [];
  findState.index = -1;
  editor.dispatch({ effects: setFindEffect.of([]) });
  editor.focus();
}

function runFind(query) {
  findState.query = query;
  const text = editor.state.doc.toString().toLowerCase();
  const q = query.toLowerCase();
  const matches = [];
  if (q) {
    for (let i = text.indexOf(q); i !== -1 && matches.length < 5000; i = text.indexOf(q, i + q.length)) {
      matches.push({ from: i, to: i + q.length });
    }
  }
  findState.matches = matches;
  const head = editor.state.selection.main.head;
  const near = matches.findIndex((m) => m.from >= head);
  findState.index = matches.length ? (near === -1 ? 0 : near) : -1;
  editor.dispatch({ effects: setFindEffect.of(matches) });
  selectCurrentMatch();
  updateFindCount();
}

function selectCurrentMatch() {
  const m = findState.matches[findState.index];
  if (m) editor.dispatch({ selection: { anchor: m.from, head: m.to }, scrollIntoView: true });
}

function moveFind(step) {
  const n = findState.matches.length;
  if (!n) return;
  findState.index = (findState.index + step + n) % n;
  selectCurrentMatch();
  updateFindCount();
}

function updateFindCount() {
  const n = findState.matches.length;
  const el = document.getElementById("find-count");
  if (el) el.textContent = n ? `${findState.index + 1} / ${n}` : "0";
}

function replaceOne() {
  const m = findState.matches[findState.index];
  if (!m) return;
  const sel = editor.state.selection.main;
  const replacement = document.getElementById("replace-input").value;
  if (sel.from === m.from && sel.to === m.to) {
    editor.dispatch({ changes: { from: m.from, to: m.to, insert: replacement } });
  }
  runFind(findState.query);
}

function replaceAll() {
  const replacement = document.getElementById("replace-input").value;
  const changes = findState.matches.map((m) => ({ from: m.from, to: m.to, insert: replacement }));
  if (changes.length) editor.dispatch({ changes });
  runFind(findState.query);
}

// ---- Colour theme -----------------------------------------------------------------------------




// Ctrl+/: comment the selected lines with "# " (Asili's line comment), or uncomment them when every
// selected line already starts with it.
function toggleLineComments() {
  const { state } = editor;
  const sel = state.selection.main;
  const first = state.doc.lineAt(sel.from).number;
  const last = state.doc.lineAt(sel.to).number;
  const lines = [];
  for (let n = first; n <= last; n++) lines.push(state.doc.line(n));
  const allCommented = lines.every((l) => /^\s*#/.test(l.text));
  const changes = lines.map((l) => {
    if (allCommented) {
      const m = /^(\s*)# ?/.exec(l.text);
      return m ? { from: l.from + m[1].length, to: l.from + m[0].length, insert: "" } : null;
    }
    const indent = /^\s*/.exec(l.text)[0].length;
    return { from: l.from + indent, to: l.from + indent, insert: "# " };
  }).filter(Boolean);
  editor.dispatch({ changes });
}

// ---- Format and lint (the pata toolchain's libraries, run in the engine) ---------------------
let formatSeq = 0;
let lintSeq = 0;

function requestFormat() {
  if (!engineReady || !worker || !activeDoc) return;
  formatSeq += 1;
  worker.postMessage({ type: "format", seq: formatSeq, source: editor.state.doc.toString() });
}

// Replace the text with its formatted form, as one edit: Undo brings the old text back.
function applyFormatted(text) {
  const current = editor.state.doc.toString();
  if (text === current) {
    note(T.formatUnchanged, "ok");
    return;
  }
  editor.dispatch({ changes: { from: 0, to: current.length, insert: text } });
  note(T.formatted, "ok");
}

function requestLint() {
  if (!engineReady || !worker || !activeDoc) return;
  lintSeq += 1;
  worker.postMessage({ type: "lint", seq: lintSeq, source: editor.state.doc.toString() });
}

// ---- Paste from the clipboard ----------------------------------------------------------------
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    editor.focus();
    editor.dispatch(editor.state.replaceSelection(text));
  } catch {
    note(T.error, "error");
  }
}

// Word wrap: the editor's lines wrap, or run on.


// View > Open View…: every view, to show it.
function openViewList() {
  openList({
    placeholder: T.openView,
    items: menuViews().map((v) => ({ label: v.title, detail: v.keyHint ?? "", run: () => showView(v.id) })),
  });
}

// ---- Start ----------------------------------------------------------------------------------
const notificationStack = document.createElement("div");
notificationStack.id = "notifications";
notificationStack.className = "notifications";
notificationStack.setAttribute("aria-live", "polite");
document.body.append(notificationStack);
stopBtn.hidden = true;
refreshMenus();
resetBoard();
if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") {
  engine.setDerived("unsupported");
  showState("unsupported", T.unsupported);
  setStatus(T.error, "error");
} else {
  startEngine();
}
loadSamples().catch((e) => setStatus(`${T.error}: ${e.message}`, "error"));
