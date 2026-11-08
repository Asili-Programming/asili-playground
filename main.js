// Asili Playground: the page. The program runs in worker.js, so a long run never freezes the
// editor and Stop can end it. Everything here is relative to this file, so the same files work
// at /playground/, at a self-hosted root, and on 127.0.0.1:8080.

import { encodeShare, decodeShare } from "./share.js";
import {
  ENTRY, newProject, newId, projectFromSample, addFile, deleteFile, fileStatus, importProject,
  exportProject, loadProjects, saveProjects, uniqueName, bundleOf, moduleOf,
} from "./project.js";
import {
  addMenu, addToolbarItem, addSidebarSection, addPanel, addStatusItem, addActivity, renderShell, setBrand,
  showPanel, setRegionVisible, regionVisible, refreshMenus,
} from "./layout.js";
import { registerCommand, runCommand, installKeys, openPalette } from "./commands.js";
import { saveSession, loadSession } from "./session.js";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  EditorState, defaultKeymap, history, historyKeymap, indentWithTab,
  StreamLanguage, syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching,
  oneDark, Decoration, StateField, StateEffect,
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
    projectSection: "Mradi", filesSection: "Faili za mradi", projectName: "Jina la mradi",
    newProject: "Mradi mpya", exportProject: "Hamisha nje", importProject: "Ingiza", saveProject: "Hifadhi",
    saveAsProject: "Hifadhi kama mradi", newFile: "Unda faili", fileName: "jina la faili",
    deleteFile: "Futa", confirmDelete: "Thibitisha kufuta", noProject: "Hakuna mradi bado",
    stSaved: "imehifadhiwa", stModified: "imebadilishwa", stErrors: "makosa", noFiles: "Hakuna faili",
    savedNote: "Mradi umehifadhiwa", importedNote: "Mradi umeingizwa", exportedNote: "Mradi umehamishwa",
    storageOff: "Hifadhi haipatikani kwenye kivinjari hiki: mradi hautabaki", importFailed: "Kuingiza kumeshindikana",
    dirtyWarn: "Mabadiliko hayajahifadhiwa", menuProject: "Mradi", fileNew: "Mradi mpya",
    closeAgain: "Mabadiliko hayajahifadhiwa: bonyeza × tena kufunga bila kuhifadhi",
    activityBar: "Upau wa vitendo", explorer: "Faili", board: "Bodi pepe", problems: "Matatizo",
    menuPalette: "Amri",
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
    projectSection: "Project", filesSection: "Project files", projectName: "Project name",
    newProject: "New project", exportProject: "Export", importProject: "Import", saveProject: "Save",
    saveAsProject: "Save as project", newFile: "Create file", fileName: "file name",
    deleteFile: "Delete", confirmDelete: "Confirm delete", noProject: "No project yet",
    stSaved: "saved", stModified: "modified", stErrors: "errors", noFiles: "No files",
    savedNote: "Project saved", importedNote: "Project imported", exportedNote: "Project exported",
    storageOff: "Storage is not available in this browser: the project will not be kept", importFailed: "Import failed",
    dirtyWarn: "Unsaved changes", menuProject: "Project", fileNew: "New project",
    closeAgain: "Unsaved changes: click × again to close without saving",
    activityBar: "Activity bar", explorer: "Explorer", board: "Board", problems: "Problems",
    menuPalette: "Commands",
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
registerCommand({ id: "project.new", title: "New project", run: () => newProjectFromInput() });
registerCommand({ id: "project.save", title: "Save project", key: "Ctrl+S", inEditor: true, inInput: true,
  run: () => (activeDoc?.projectId ? saveActiveProject() : saveSampleAsProject()), enabled: () => !!activeDoc });
registerCommand({ id: "project.saveAsProject", title: "Save sample as project", run: () => saveSampleAsProject(),
  enabled: () => !!activeDoc && !activeDoc.projectId });
registerCommand({ id: "project.export", title: "Export project", run: () => exportActiveProject(),
  enabled: () => !!activeProject() });
registerCommand({ id: "project.import", title: "Import project", run: () => document.getElementById("import-file").click() });
registerCommand({ id: "file.new", title: "New file", key: "Ctrl+N", inEditor: true,
  run: () => { setRegionVisible("primary", true); document.getElementById("file-name")?.focus(); } });
registerCommand({ id: "file.close", title: "Close tab", key: "Ctrl+W", inEditor: true,
  run: () => requestClose(activeDoc), enabled: () => !!activeDoc });
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
    { id: "menu-project-save", label: "saveProject", command: "project.save" },
    { id: "menu-project-save-as", label: "saveAsProject", command: "project.saveAsProject" },
    { id: "menu-project-export", label: "exportProject", command: "project.export" },
    { id: "menu-project-import", label: "importProject", command: "project.import" },
    { id: "share-btn", label: "share", optional: true, command: "share.link" },
    { id: "close-tab-btn", label: "closeTab", optional: true, command: "file.close" },
  ],
});
addMenu({
  id: "hariri", label: "menuEdit", order: 20,
  items: [
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
addToolbarItem({ id: "lugha-switch", label: "switchLabel", order: 90, optional: true,
  run: () => { location.href = `?lugha=${T.switchTo}`; } });

addSidebarSection("primary", {
  id: "samples", title: "samples", order: 10,
  render(container, t) {
    const picker = document.createElement("select");
    picker.id = "sample-picker";
    picker.title = t("sampleTitle");
    picker.addEventListener("change", () => openSample(picker.value));
    container.append(picker);
  },
});
addSidebarSection("primary", {
  id: "project", title: "projectSection", order: 20,
  render(container, t) {
    container.innerHTML = `
      <select id="project-picker" aria-label="${t("projectSection")}"></select>
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
      <p id="project-note" class="sidebar-note" role="status"></p>`;
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

renderShell(document.querySelector(".ide"), { t: (key) => T[key] ?? key, embed: isEmbed });
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
    oneDark,
    // Line numbers need 4.5:1 contrast; oneDark's default gutter colour is too faint.
    EditorView.theme({ ".cm-gutters": { color: "#9aa2b5" } }),
    EditorView.lineWrapping,
    diagnosticField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (activeDoc) activeDoc.text = update.state.doc.toString();
        scheduleCheck();
        scheduleTabs();
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
const samplePicker = document.getElementById("sample-picker");
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
  for (const d of docs) {
    const tab = document.createElement("div");
    tab.className = "doc-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(d === activeDoc));
    tab.dataset.doc = d.key;
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
  }
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

function closeDoc(d) {
  if (!d) return;
  const i = docs.indexOf(d);
  if (i < 0) return;
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
  refreshMenus();
}

function openProjectFile(p, file) {
  return openDoc(`p:${p.id}:${file}`, file, p.files[file], { projectId: p.id, file });
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
    note(`${T.importFailed}: ${e.message}`, "error");
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
  try {
    deleteFile(p, file);
  } catch (e) {
    note(e.message, "error");
    return;
  }
  for (const d of docs.filter((x) => x.key === `p:${p.id}:${file}`)) closeDoc(d);
  persistProjects();
  renderTabs();
}

function renderProjectSection() {
  const picker = document.getElementById("project-picker");
  if (!picker) return;
  picker.replaceChildren(...(projects.length
    ? projects.map((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      opt.selected = p.id === activeProjectId;
      return opt;
    })
    : [Object.assign(document.createElement("option"), { textContent: T.noProject, value: "" })]));
  const has = !!activeProject();
  for (const id of ["project-save-btn", "project-export-btn"]) {
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
    name.addEventListener("click", () => openProjectFile(p, file));
    const meta = document.createElement("span");
    meta.className = "file-meta";
    meta.textContent = `${status}${open?.error ? ` · ${T.stErrors}` : ""}`;
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
function renderProblems(items) {
  const list = document.getElementById("problems");
  const count = document.getElementById("problem-count");
  list.replaceChildren();
  if (items.length === 0) {
    const none = document.createElement("li");
    none.className = "none";
    none.textContent = T.noProblems;
    list.append(none);
  }
  for (const d of items) {
    const li = document.createElement("li");
    li.textContent = `Ln ${d.line}: ${d.code} ${d.message}`;
    li.addEventListener("click", () => goToLine(d.line));
    list.append(li);
  }
  count.textContent = items.length ? String(items.length) : "";
  if (activeDoc) {
    activeDoc.error = items.length > 0;
    renderTabs();
  }
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
  const picker = document.getElementById("sample-picker");
  for (const sample of manifest) {
    const opt = document.createElement("option");
    opt.value = sample.file;
    opt.textContent = (lang === "en" && sample.label_en) ? sample.label_en : sample.label;
    picker.appendChild(opt);
  }
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
    picker.value = wanted.file;
    await openSample(wanted.file);
  }
  renderProjectSection();
  renderFiles();
}

// Wire the sidebar controls (they exist once the shell is rendered).
document.getElementById("project-picker")?.addEventListener("change", (e) => {
  const p = projectById(e.target.value);
  if (p) openProjectFile(p, ENTRY);
});
document.body.addEventListener("click", (e) => {
  const id = e.target?.id;
  if (id === "project-new-btn") newProjectFromInput();
  if (id === "project-save-btn") saveActiveProject();
  if (id === "project-export-btn") exportActiveProject();
  if (id === "project-import-btn") document.getElementById("import-file").click();
  if (id === "file-create-btn") createFileFromInput();
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
