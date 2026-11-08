// The playground's states, declared in one place. Each machine is a table of states and transitions;
// the page sends it events, and it changes only along the table (an event that is not in the table
// for the current state is ignored, and returns false). Derived states (the workspace, the Explorer,
// the main area) are computed from the page's data by one function, so they cannot disagree with it.
// docs/03-app-flow.md ("States") is the reader's version of these tables. No DOM here, so
// scripts/test_states.mjs can check every transition under Node.

export const MACHINES = {
  // The engine (the wasm worker). "unsupported" is only a start state (no WebAssembly / Worker).
  engine: {
    start: "loading",
    states: ["unsupported", "loading", "ready", "running", "failed"],
    transitions: [
      { from: "loading", on: "loaded", to: "ready" },
      { from: "loading", on: "fail", to: "failed" },
      { from: "failed", on: "retry", to: "loading" },
      { from: "ready", on: "run", to: "running" },
      { from: "running", on: "done", to: "ready" },
      { from: "running", on: "error", to: "ready" },
      { from: "running", on: "stop", to: "loading" },
      { from: "ready", on: "restart", to: "loading" },
    ],
  },
  // The workspace: none open, or open and unchanged, or open with unsaved changes.
  workspace: {
    start: "none",
    states: ["none", "clean", "dirty"],
    transitions: [
      { from: "none", on: "open", to: "clean" },
      { from: "clean", on: "edit", to: "dirty" },
      { from: "dirty", on: "save", to: "clean" },
      { from: "clean", on: "close", to: "none" },
      { from: "dirty", on: "close", to: "none" },
      { from: "clean", on: "delete", to: "none" },
      { from: "dirty", on: "delete", to: "none" },
    ],
  },
  // A file in the editor's tabs: clean (its text is its saved text) or modified.
  document: {
    start: "clean",
    states: ["clean", "modified", "closed"],
    transitions: [
      { from: "clean", on: "edit", to: "modified" },
      { from: "modified", on: "save", to: "clean" },
      { from: "clean", on: "close", to: "closed" },
      { from: "modified", on: "close", to: "closed" },
    ],
  },
  // The lint findings of a file: none yet, shown (from the last Lint), or stale (the file was edited
  // since the last Lint, so its findings no longer match the text).
  lint: {
    start: "none",
    states: ["none", "shown", "stale"],
    transitions: [
      { from: "none", on: "lint", to: "shown" },
      { from: "shown", on: "edit", to: "stale" },
      { from: "stale", on: "edit", to: "stale" },
      { from: "shown", on: "lint", to: "shown" },
      { from: "stale", on: "lint", to: "shown" },
    ],
  },
  // A region (the primary sidebar, the secondary sidebar, the bottom panel): empty when it holds no
  // view (it is hidden whatever its toggle says), hidden when its toggle is off, shown otherwise.
  // Derived from the layout's data (deriveRegion), so it has no events.
  region: {
    derived: true,
    start: "empty",
    states: ["empty", "hidden", "shown"],
    transitions: [],
  },
  // The checks of a file: idle, checking after an edit, checked (its problems are shown).
  check: {
    start: "idle",
    states: ["idle", "checking", "checked"],
    transitions: [
      { from: "idle", on: "edit", to: "checking" },
      { from: "checked", on: "edit", to: "checking" },
      { from: "checking", on: "answer", to: "checked" },
      { from: "checking", on: "edit", to: "checking" },
    ],
  },
};

// A machine instance: its state, and a listener told of every change.
export function createMachine(name, spec = MACHINES[name], onChange = () => {}) {
  if (!spec) throw new Error(`states: no machine '${name}'`);
  let state = spec.start;
  return {
    name,
    get state() {
      return state;
    },
    is: (s) => state === s,
    // Send an event. Returns true when the state changed; an event the table has no transition for
    // in the current state is ignored and returns false.
    send(event) {
      const t = spec.transitions.find((x) => x.from === state && x.on === event);
      if (!t) return false;
      const from = state;
      state = t.to;
      onChange(state, { from, event, to: t.to });
      return true;
    },
    // Set the state from the data (for the derived machines); a listener is told only of a change.
    setDerived(next) {
      if (next === state) return false;
      if (!spec.states.includes(next)) throw new Error(`states: '${next}' is not a state of '${name}'`);
      const from = state;
      state = next;
      onChange(state, { from, event: "derived", to: next });
      return true;
    },
  };
}

// The derived states, from the page's data. Pure: the same data always gives the same states.
export function deriveStates({ workspace, openFiles, activeFile, dirty }) {
  return {
    workspace: !workspace ? "none" : dirty ? "dirty" : "clean",
    explorer: workspace ? "tree" : "noWorkspace",
    mainArea: activeFile ? "editor" : "empty",
    openFiles: openFiles,
  };
}

// The state of a region, from how many views it holds and whether it is visible.
export function deriveRegion({ count, visible }) {
  return count === 0 ? "empty" : visible ? "shown" : "hidden";
}

// Whether a list of events leads from `start` to `end` along a machine's table (used by the tests and
// by the docs check).
export function walk(name, start, events) {
  const m = createMachine(name, MACHINES[name]);
  m.setDerived(start);
  for (const e of events) m.send(e);
  return m.state;
}
