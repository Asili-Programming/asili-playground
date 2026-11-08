// Asili Playground: the page. The program runs in worker.js, so a long run never freezes the
// editor and Stop can end it. Everything here is relative to this file, so the same files work
// at /playground/, at a self-hosted root, and on 127.0.0.1:8080.

import { encodeShare, decodeShare } from "./share.js";
import {
  ENTRY, newProject, newId, projectFromSample, addFile, deleteFile, fileStatus, importProject,
  exportProject, loadProjects, saveProjects, uniqueName, bundleOf, moduleOf, renameFile, ProjectError,
} from "./project.js";
import {
  addMenu, addToolbarItem, addTabEndItem, addSidebarSection, addPanel, addStatusItem, addActivity, renderShell, setBrand,
  showPanel, setRegionVisible, regionVisible, refreshMenus,
} from "./layout.js";
import { registerCommand, runCommand, installKeys, openPalette, openList } from "./commands.js";
import { saveSession, loadSession } from "./session.js";
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
    closeTab: "Funga kichupo", format: "Nadhifisha", togglePrimary: "Upau wa kushoto",
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
    errProjectTooBig: "Nafasi ya kazi ni kubwa mno",
    lang: "Lugha", closeOthers: "Funga zingine", closeRight: "Funga za kulia", stFiles: "mafaili",
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
    closeTab: "Close tab", format: "Format", togglePrimary: "Left sidebar",
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
    errProjectTooBig: "The workspace is too large",
    lang: "Language", closeOthers: "Close others", closeRight: "Close to the right", stFiles: "files",
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
registerCommand({ id: "project.save", title: "Save project", key: "Ctrl+S", inEditor: true, inInput: true,
  run: () => (activeDoc?.projectId ? saveActiveProject() : saveSampleAsProject()), enabled: () => !!activeDoc });
registerCommand({ id: "project.saveAsProject", title: "Save sample as workspace", run: () => saveSampleAsProject(),
  enabled: () => !!activeDoc && !activeDoc.projectId });
registerCommand({ id: "project.export", title: "Export workspace", run: () => exportActiveProject(),
  enabled: () => !!activeProject() });
registerCommand({ id: "project.import", title: "Import workspace", run: () => document.getElementById("import-file").click() });
registerCommand({ id: "file.new", title: "New file", key: "Alt+N", inEditor: true, inInput: true,
  run: () => createUntitledFile() });
registerCommand({ id: "file.close", title: "Close tab", key: "Alt+W", inEditor: true, inInput: true,
  run: () => requestClose(activeDoc), enabled: () => !!activeDoc });
registerCommand({ id: "file.quickOpen", title: "Go to file", key: "Ctrl+P", inEditor: true,
  run: () => openQuickOpen() });
registerCommand({ id: "edit.find", title: "Find", key: "Ctrl+F", inEditor: true, run: () => openFind("find") });
registerCommand({ id: "edit.replace", title: "Replace", key: "Ctrl+H", inEditor: true, run: () => openFind("replace") });
registerCommand({ id: "edit.goToLine", title: "Go to line", key: "Ctrl+G", inEditor: true, run: () => openFind("goto") });
registerCommand({ id: "edit.comment", title: "Toggle comment", key: "Ctrl+/", inEditor: true,
  run: () => toggleLineComments() });
registerCommand({ id: "edit.undo", title: "Undo", run: () => undo(editor) });
registerCommand({ id: "edit.redo", title: "Redo", run: () => redo(editor) });
registerCommand({ id: "edit.cut", title: "Cut", run: () => { editor.focus(); document.execCommand("cut"); } });
registerCommand({ id: "edit.copy", title: "Copy", run: () => { editor.focus(); document.execCommand("copy"); } });
registerCommand({ id: "edit.paste", title: "Paste", run: () => pasteFromClipboard() });
registerCommand({ id: "edit.selectAll", title: "Select all", run: () => selectAll(editor) });
registerCommand({ id: "view.theme", title: "Toggle colour theme", run: () => toggleTheme() });
registerCommand({ id: "share.link", title: "Share link", run: () => shareCurrent() });
registerCommand({ id: "run.start", title: "Run", key: ["Ctrl+Enter", "F5"], inEditor: true, inInput: true,
  run: () => run(), enabled: () => engineReady && !busy });
registerCommand({ id: "run.stop", title: "Stop", key: "Shift+F5", inEditor: true, inInput: true,
  run: () => stop(), enabled: () => busy });
registerCommand({ id: "view.primary", title: "Toggle primary sidebar", key: "Ctrl+B", inEditor: true,
  run: () => setRegionVisible("primary", !regionVisible("primary")) });
registerCommand({ id: "view.secondary", title: "Toggle secondary sidebar (Board)", key: "Alt+B", inEditor: true,
  run: () => setRegionVisible("secondary", !regionVisible("secondary")) });
registerCommand({ id: "view.panel", title: "Toggle bottom panel", key: "Ctrl+J", inEditor: true,
  run: () => setRegionVisible("panel", !regionVisible("panel")) });
registerCommand({ id: "view.problems", title: "Show problems", key: "Ctrl+Shift+M", inEditor: true,
  run: () => { setRegionVisible("panel", true); showPanel("problems"); } });
registerCommand({ id: "view.explorer", title: "Focus explorer", key: "Ctrl+Shift+E", inEditor: true,
  run: () => { setRegionVisible("primary", true); document.getElementById("file-list")?.focus(); } });
registerCommand({ id: "help.wiki", title: "Asili wiki",
  run: () => window.open("https://github.com/Asili-Programming/Asili/wiki", "_blank", "noopener") });

addMenu({
  id: "faili", label: "menuFile", order: 10, optional: true,
  items: [
    { id: "menu-project-new", label: "newProject", command: "project.new" },
    { id: "menu-open-sample", label: "openSample", command: "file.openSample" },
    { id: "menu-open-workspace", label: "openWorkspace", command: "file.openWorkspace" },
    { id: "menu-project-save", label: "saveProject", command: "project.save" },
    { id: "menu-project-save-as", label: "saveAsProject", command: "project.saveAsProject" },
    { id: "menu-project-import", label: "importProject", command: "project.import" },
    { id: "menu-project-export", label: "exportProject", command: "project.export" },
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
    { id: "format-btn", label: "format", enabled: () => false },
  ],
});
addMenu({
  id: "endesha", label: "menuRun", order: 30,
  items: [
    { id: "menu-run-btn", label: "run", command: "run.start" },
    { id: "menu-stop-btn", label: "stop", command: "run.stop" },
  ],
});
addMenu({
  id: "mwonekano", label: "menuView", order: 40, optional: true,
  items: [
    { id: "toggle-primary", label: "togglePrimary", command: "view.primary" },
    { id: "toggle-secondary", label: "toggleSecondary", command: "view.secondary" },
    { id: "toggle-panel", label: "togglePanel", command: "view.panel" },
    { id: "menu-theme", label: "theme", command: "view.theme" },
    { id: "menu-palette", label: "menuPalette", command: "palette.open" },
  ],
});
addMenu({
  id: "msaada", label: "menuHelp", order: 50, optional: true,
  items: [
    { id: "wiki-link", label: "wiki", command: "help.wiki" },
  ],
});

addActivity({ id: "act-explorer", title: "explorer", icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`, order: 10, run: () => runCommand("view.explorer") });
addActivity({ id: "act-board", title: "board", icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>`, order: 20, run: () => runCommand("view.secondary") });
addActivity({ id: "act-problems", title: "problems", icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/></svg>`, order: 30, run: () => runCommand("view.problems") });
addActivity({ id: "act-palette", title: "menuPalette", icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7l5 5-5 5M12 17h8"/></svg>`, order: 40, run: () => runCommand("palette.open") });

addToolbarItem({ id: "run-btn", label: "run", className: "primary", order: 10,
  run: () => run(), enabled: () => engineReady && !busy });
addToolbarItem({ id: "stop-btn", label: "stop", className: "danger", order: 20,
  run: () => stop(), enabled: () => busy });
// The language switch: an icon at the right end of the tab row; its title names the other language.
addTabEndItem({ id: "lugha-switch", title: "switchLabel", order: 10, optional: true,
  icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>`,
  run: () => { location.href = `?lugha=${T.switchTo}`; } });

addSidebarSection("primary", {
  id: "project", title: "projectSection", order: 20,
  render(container, t) {
    container.innerHTML = `
      <div class="sidebar-row">
        <input id="project-name" type="text" placeholder="${t("projectName")}" aria-label="${t("projectName")}" />
        <button id="project-new-btn" type="button">${t("newProject")}</button>
      </div>
      <div class="sidebar-row">
        <button id="project-save-btn" type="button">${t("saveProject")}</button>
        <button id="project-export-btn" type="button">${t("exportProject")}</button>
        <button id="project-import-btn" type="button">${t("importProject")}</button>
        <input id="import-file" type="file" accept=".json,application/json" hidden />
      </div>
      <div class="sidebar-row">
        <button id="project-rename-btn" type="button">${t("projectRename")}</button>
        <button id="project-delete-btn" type="button">${t("projectDelete")}</button>
      </div>
      <p id="project-note" class="sidebar-note" role="status"></p>
      <div id="undo-note" class="undo-note" role="status" hidden></div>`;
  },
});
addSidebarSection("primary", {
  id: "files", title: "filesSection", order: 30,
  render(container, t) {
    container.innerHTML = `
      <ul id="file-list" class="open-files" aria-label="${t("filesSection")}"></ul>
      <div class="sidebar-row">
        <input id="file-name" type="text" placeholder="${t("fileName")}" aria-label="${t("fileName")}" />
        <button id="file-create-btn" type="button">${t("newFile")}</button>
      </div>`;
  },
});
addSidebarSection("secondary", {
  id: "board", title: "board", order: 10, optional: false,
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
  id: "output", title: "output", order: 10,
  render(body) {
    const pre = document.createElement("pre");
    pre.id = "output";
    body.append(pre);
  },
});
addPanel({
  id: "problems", title: "problems", order: 20,
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
addStatusItem({ id: "file", order: 30, render(slot) { slot.id = "file-name"; } });
addStatusItem({ id: "language", order: 40, render(slot, t) { slot.id = "status-language"; slot.textContent = t("lang") + ": Asili"; } });
addStatusItem({ id: "problems", order: 50, render(slot) {
  slot.id = "status-problems";
  slot.className = "status-item clickable";
  slot.addEventListener("click", () => { setRegionVisible("panel", true); showPanel("problems"); });
} });

renderShell(document.querySelector(".ide"), { t: (key) => T[key] ?? key, embed: isEmbed });
// The theme is set before the editor exists, so the editor starts in it.
document.body.classList.toggle("theme-light", initialTheme() === "light");
mountFindBar();
// The board opens when a run uses pins (handleEvent); it does not take the right side before then.
if (!isEmbed) setRegionVisible("secondary", false);
if (isEmbed) {
  setRegionVisible("primary", false);
  setRegionVisible("secondary", false);
}
showPanel("output");

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
  checkSeq += 1;
  // The other modules of the active project, so `leta <module>` is not reported as unknown.
  const p = activeDoc?.projectId ? projectById(activeDoc.projectId) : null;
  const modules = p ? Object.keys(p.files).filter((f) => f !== activeDoc.file).map(moduleOf) : [];
  worker.postMessage({ type: "check", seq: checkSeq, source: editor.state.doc.toString(), modules });
  if (p) {
    for (const file of Object.keys(p.files)) {
      if (file === activeDoc.file) continue;
      worker.postMessage({
        type: "check", seq: -1, key: `p:${p.id}:${file}`, source: liveText(p, file),
        modules: Object.keys(p.files).filter((f) => f !== file).map(moduleOf),
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
  if (!saved || saved.docs.length === 0) return false;
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
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    themeCell.of(darkThemeExtension()),
    findField,
    // Line numbers need 4.5:1 contrast; oneDark's default gutter colour is too faint.
    EditorView.theme({ ".cm-gutters": { color: "#9aa2b5" } }),
    EditorView.lineWrapping,
    diagnosticField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (activeDoc) activeDoc.text = update.state.doc.toString();
        scheduleCheck();
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
  if (!isEmbed && !regionVisible("secondary")) setRegionVisible("secondary", true);
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
let engineReady = false;
let busy = false;

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
    engineReady = true;
    showState("ready");
    setStatus(T.ready, "ok");
    refreshMenus();
    requestCheck();
  } else if (m.type === "out") {
    appendOutput(m.text, m.err);
  } else if (m.type === "tukio") {
    handleEvent(m.json);
  } else if (m.type === "diag" && m.key) {
    try {
      projectProblems.set(m.key, JSON.parse(m.json));
      const d = docs.find((x) => x.key === m.key);
      if (d) d.error = JSON.parse(m.json).length > 0;
      renderAllProblems();
    } catch {
      // A malformed result leaves that file's previous problems in place.
    }
  } else if (m.type === "diag") {
    if (m.seq !== checkSeq) return;
    try {
      const items = JSON.parse(m.json);
      editor.dispatch({ effects: setDiagnostics.of(items) });
      renderProblems(items);
    } catch {
      // A malformed result only means no marks; the run still reports errors in the output.
    }
  } else if (m.type === "done") {
    finishRun(T.done, "ok");
  } else if (m.type === "error") {
    appendOutput(m.message, true);
    finishRun(T.error, "error");
  } else if (m.type === "loadfail") {
    engineReady = false;
    showState("failed", `${T.loadFailed}: ${m.message}`);
    setStatus(T.error, "error");
    worker = null;
  }
}

function startEngine() {
  if (worker) worker.terminate();
  engineReady = false;
  showState("loading", T.loading);
  setStatus(T.loading);
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.addEventListener("message", onWorkerMessage);
  worker.addEventListener("error", (e) => onWorkerMessage({ data: { type: "loadfail", message: e.message || "worker" } }));
}

function finishRun(text, kind) {
  busy = false;
  runBtn.hidden = false;
  stopBtn.hidden = true;
  notice.hidden = true;
  refreshMenus();
  setStatus(text, kind);
  runBtn.disabled = false;
}

function run() {
  if (!engineReady || busy) return;
  busy = true;
  outputEl.textContent = "";
  refreshMenus();
  resetBoard();
  runBtn.hidden = true;
  stopBtn.hidden = false;
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
  if (!busy) return;
  worker.terminate();
  worker = null;
  busy = false;
  appendOutput(T.stopped, true);
  refreshMenus();
  runBtn.hidden = false;
  stopBtn.hidden = true;
  setStatus(T.stopped, "error");
  startEngine();
}

// ---- Samples --------------------------------------------------------------------------------
// samples/manifest.json lists {file, label, label_en}; the label follows the interface language.
let currentInputs = [];
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
let activeProjectId = projects[0]?.id ?? null;

function isDirty(d) {
  const p = d.projectId ? projectById(d.projectId) : null;
  return !!p && fileStatus(p, d.file, d.text) === "modified";
}

function renderTabs() {
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

function closeDoc(d, { force = false } = {}) {
  if (!d) return;
  const i = docs.indexOf(d);
  if (i < 0) return;
  if (docs.length === 1 && !force) {
    note(T.lastFile, "ok");
    return;
  }
  docs.splice(i, 1);
  if (d === activeDoc) {
    activeDoc = null;
    if (docs.length) {
      activate(docs[Math.max(0, i - 1)]);
    } else {
      const first = [...samplesById.keys()][0];
      if (first) openSample(first);
    }
  } else {
    renderTabs();
  }
  persistSession();
  refreshMenus();
}

function openProjectFile(p, file) {
  return openDoc(`p:${p.id}:${file}`, file, p.files[file], { projectId: p.id, file });
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
      detail: `${Object.keys(p.files).length} ${T.stFiles ?? "files"}`,
      run: () => openProjectFile(p, ENTRY),
    })),
  });
}

async function openSample(file) {
  const sample = samplesById.get(file);
  const res = await fetch(`samples/${file}`);
  return openDoc(`s:${file}`, file, await res.text(), { inputs: sample?.inputs ?? [] });
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
function note(text, kind = "ok") {
  const el = document.getElementById("project-note");
  if (el) {
    el.textContent = text;
    el.className = `sidebar-note ${kind}`;
  }
  setStatus(text, kind);
}

function persistProjects() {
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

function renderFiles() {
  const list = document.getElementById("file-list");
  if (!list) return;
  list.tabIndex = -1;
  const p = activeProject();
  list.replaceChildren();
  if (!p) return;
  for (const file of Object.keys(p.files)) {
    const li = document.createElement("li");
    const open = docs.find((x) => x.key === `p:${p.id}:${file}`);
    const status = fileStatus(p, file, liveText(p, file)) === "modified" ? T.stModified : T.stSaved;
    li.dataset.file = file;
    li.setAttribute("aria-current", String(open !== undefined && open === activeDoc));
    const name = document.createElement("span");
    name.textContent = file;
    name.title = file;
    name.addEventListener("click", () => openProjectFile(p, file));
    name.addEventListener("dblclick", () => startRename(p, file, li));
    const meta = document.createElement("span");
    meta.className = "file-meta";
    meta.textContent = `${status}${open?.error ? ` · ${T.stErrors}` : ""}`;
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showFileMenu(e.clientX, e.clientY, p, file, li);
    });
    li.append(name, meta);
    if (file !== ENTRY) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "file-delete";
      del.textContent = T.deleteFile;
      del.addEventListener("click", () => deleteProjectFile(p, file, del));
      li.append(del);
    }
    list.append(li);
  }
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
  if (activeDoc) activeDoc.error = items.length > 0;
  renderAllProblems();
}

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
  document.getElementById("file-name").textContent = activeDoc?.name ?? "";
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
  if (id === "project-new-btn") newProjectFromInput();
  if (id === "project-save-btn") saveActiveProject();
  if (id === "project-export-btn") exportActiveProject();
  if (id === "project-import-btn") document.getElementById("import-file").click();
  if (id === "file-create-btn") createFileFromInput();
  if (id === "project-rename-btn") renameActiveProject();
  if (id === "project-delete-btn") deleteActiveProject(e.target);
});
document.body.addEventListener("change", (e) => {
  if (e.target?.id === "import-file" && e.target.files?.[0]) importFile(e.target.files[0]);
});
document.body.addEventListener("keydown", (e) => {
  if (e.target?.id === "file-name" && e.key === "Enter") createFileFromInput();
  if (e.target?.id === "project-name" && e.key === "Enter") newProjectFromInput();
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
  const old = li.querySelector("span");
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
  const base = `${moduleOf(file)}_kopi`;
  let name = base;
  for (let n = 2; `${name}.as` in p.files; n++) name = `${base}_${n}`;
  try {
    const next = addFile(p, name, p.files[file]);
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
  if (file !== ENTRY) add(T.delete, () => removeFile(p, file), T.confirmDelete);
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
  const input = document.getElementById("project-name");
  const name = input?.value.trim();
  if (!p || !name) {
    note(T.noProject, "error");
    return;
  }
  p.name = uniqueName(name, projects.filter((x) => x.id !== p.id).map((x) => x.name));
  p.updated = new Date().toISOString();
  input.value = "";
  persistProjects();
  for (const d of docs) if (d.projectId === p.id) renderTabs();
  renderProjectSection();
  note(T.fileRenamed, "ok");
}

function deleteActiveProject(button) {
  const p = activeProject();
  if (!p) return;
  if (button.dataset.armed !== "yes") {
    button.dataset.armed = "yes";
    button.textContent = T.confirmDelete;
    setTimeout(() => { button.dataset.armed = ""; button.textContent = T.projectDelete; }, 3000);
    return;
  }
  button.dataset.armed = "";
  button.textContent = T.projectDelete;
  for (const d of docs.filter((x) => x.projectId === p.id)) closeDoc(d, { force: true });
  projects = projects.filter((x) => x.id !== p.id);
  lastRemoved = { kind: "project", project: p };
  activeProjectId = projects[0]?.id ?? null;
  persistProjects();
  showUndo(`${p.name}: ${T.deleted}`);
  renderProjectSection();
  renderTabs();
  if (docs.length === 0) {
    const first = [...samplesById.keys()][0];
    if (first) openSample(first);
  }
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
function initialTheme() {
  try {
    const saved = localStorage.getItem("asili-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage unavailable: follow the system.
  }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function toggleTheme() {
  const light = !document.body.classList.contains("theme-light");
  document.body.classList.toggle("theme-light", light);
  try {
    localStorage.setItem("asili-theme", light ? "light" : "dark");
  } catch {
    // The choice is kept for this visit only.
  }
  editor.dispatch({ effects: themeCell.reconfigure(light ? [] : oneDark) });
}

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

// ---- Start ----------------------------------------------------------------------------------
stopBtn.hidden = true;
refreshMenus();
resetBoard();
if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") {
  showState("unsupported", T.unsupported);
  setStatus(T.error, "error");
} else {
  startEngine();
}
loadSamples().catch((e) => setStatus(`${T.error}: ${e.message}`, "error"));
