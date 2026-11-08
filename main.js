// Asili Playground: the page. The program runs in worker.js, so a long run never freezes the
// editor and Stop can end it. Everything here is relative to this file, so the same files work
// at /playground/, at a self-hosted root, and on 127.0.0.1:8080.

import { encodeShare, decodeShare } from "./share.js";
import {
  addMenu, addToolbarItem, addSidebarSection, addPanel, addStatusItem, renderShell, setBrand,
  showPanel, setRegionVisible, regionVisible, refreshMenus,
} from "./layout.js";
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

addMenu({
  id: "faili", label: "menuFile", order: 10, optional: true,
  items: [
    { id: "share-btn", label: "share", optional: true, run: () => shareCurrent() },
    { id: "close-tab-btn", label: "closeTab", optional: true,
      run: () => closeDoc(activeDoc), enabled: () => docs.length > 1 },
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
    { id: "menu-run-btn", label: "run", run: () => run(), enabled: () => engineReady && !busy },
    { id: "menu-stop-btn", label: "stop", run: () => stop(), enabled: () => busy },
  ],
});
addMenu({
  id: "mwonekano", label: "menuView", order: 40, optional: true,
  items: [
    { id: "toggle-primary", label: "togglePrimary",
      run: () => setRegionVisible("primary", !regionVisible("primary")) },
    { id: "toggle-secondary", label: "toggleSecondary",
      run: () => setRegionVisible("secondary", !regionVisible("secondary")) },
    { id: "toggle-panel", label: "togglePanel",
      run: () => setRegionVisible("panel", !regionVisible("panel")) },
  ],
});
addMenu({
  id: "msaada", label: "menuHelp", order: 50, optional: true,
  items: [
    { id: "wiki-link", label: "wiki",
      run: () => window.open("https://github.com/Asili-Programming/Asili/wiki", "_blank", "noopener") },
  ],
});

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
  id: "open", title: "openFiles", order: 20,
  render(container) {
    const list = document.createElement("ul");
    list.id = "open-files";
    list.className = "open-files";
    container.append(list);
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
  worker.postMessage({ type: "check", seq: checkSeq, source: editor.state.doc.toString() });
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
    StreamLanguage.define(asiliMode),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    oneDark,
    // Line numbers need 4.5:1 contrast; oneDark's default gutter colour is too faint.
    EditorView.theme({ ".cm-gutters": { color: "#9aa2b5" } }),
    EditorView.lineWrapping,
    diagnosticField,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) scheduleCheck();
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
  worker.postMessage({
    type: "run",
    source: editor.state.doc.toString(),
    board: currentInputs.flat(),
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

// ---- Editor tabs: one document per open program ----------------------------------------------
// Each document keeps its text and its scripted pin levels. The editor shows the active one;
// switching saves the text being edited and loads the other (undo history is per session only).
function renderTabs() {
  const bar = document.getElementById("doc-tabs");
  bar.replaceChildren();
  for (const d of docs) {
    const tab = document.createElement("div");
    tab.className = "doc-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(d === activeDoc));
    tab.dataset.doc = d.id;
    if (d.error) {
      const dot = document.createElement("span");
      dot.className = "dot-error";
      dot.textContent = "●";
      tab.append(dot);
    }
    tab.append(document.createTextNode(d.name));
    tab.addEventListener("click", () => activate(d));
    bar.append(tab);
  }
  const list = document.getElementById("open-files");
  list.replaceChildren(...docs.map((d) => {
    const li = document.createElement("li");
    li.textContent = d.name;
    li.setAttribute("aria-current", String(d === activeDoc));
    li.addEventListener("click", () => activate(d));
    return li;
  }));
}

function openDoc(id, name, text, inputs = []) {
  let d = docs.find((x) => x.id === id);
  if (!d) {
    d = { id, name, text, inputs, error: false };
    docs.push(d);
  }
  activate(d);
}

function activate(d) {
  if (d === activeDoc) return;
  if (activeDoc) activeDoc.text = editor.state.doc.toString();
  activeDoc = d;
  currentInputs = d.inputs;
  editor.setState(state0());
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: d.text } });
  renderProblems([]);
  renderTabs();
  refreshMenus();
}

function closeDoc(d) {
  if (!d || docs.length < 2) return;
  const i = docs.indexOf(d);
  docs.splice(i, 1);
  if (d === activeDoc) {
    activeDoc = null;
    activate(docs[Math.max(0, i - 1)]);
  } else {
    renderTabs();
  }
  refreshMenus();
}

async function openSample(file) {
  const sample = samplesById.get(file);
  const res = await fetch(`samples/${file}`);
  openDoc(file, file, await res.text(), sample?.inputs ?? []);
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
async function shareCurrent() {
  try {
    const token = await encodeShare({ "kuu.as": editor.state.doc.toString() });
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
  // A share link (#k=) wins over the sample; ?sample=<id> picks the sample; otherwise the first.
  let opened = false;
  if (location.hash.startsWith("#k=")) {
    try {
      const files = await decodeShare(location.hash.slice(3));
      const [name, text] = Object.entries(files)[0];
      openDoc("link", name, text, []);
      opened = true;
    } catch {
      setStatus(T.linkBad, "error");
    }
  }
  if (!opened && manifest.length > 0) {
    const sampleId = new URLSearchParams(location.search).get("sample");
    const wanted = manifest.find((sample) => sample.id === sampleId) ?? manifest[0];
    picker.value = wanted.file;
    await openSample(wanted.file);
  }
}

clearBtn.addEventListener("click", () => {
  outputEl.textContent = "";
});
runBtn.addEventListener("click", run);
stopBtn.addEventListener("click", stop);

// Ctrl/Cmd+Enter runs the current source.
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
});

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
