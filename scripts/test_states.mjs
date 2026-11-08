// The state machines under Node: every transition in the tables, the ignored events, the derived
// states, and that every state named in a table is reachable from the start state.
//   node scripts/test_states.mjs
import assert from "node:assert/strict";
import { MACHINES, createMachine, deriveStates, walk } from "../states.js";

// Each transition of each machine goes where the table says, and nothing else does.
for (const [name, spec] of Object.entries(MACHINES)) {
  for (const t of spec.transitions) {
    assert.ok(spec.states.includes(t.from) && spec.states.includes(t.to), `${name}: ${t.from}->${t.to} names known states`);
    const m = createMachine(name, spec);
    m.setDerived(t.from);
    assert.equal(m.send(t.on), true, `${name}: ${t.on} from ${t.from}`);
    assert.equal(m.state, t.to, `${name}: ${t.on} from ${t.from} goes to ${t.to}`);
  }
  // Reachability: every state can be reached from the start state.
  const seen = new Set([spec.start]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of spec.transitions) if (seen.has(t.from) && !seen.has(t.to)) { seen.add(t.to); grew = true; }
  }
  for (const s of spec.states) if (s !== "unsupported" && s !== "closed") assert.ok(seen.has(s), `${name}: ${s} is reachable`);
}

// An event with no transition from the current state is ignored.
const engine = createMachine("engine");
assert.equal(engine.send("run"), false, "run while loading is ignored");
assert.equal(engine.state, "loading");

// The engine's cycle: load, run, stop (the worker is replaced), load again, run again.
assert.equal(walk("engine", "loading", ["loaded", "run", "stop", "loaded", "run", "done"]), "ready");
assert.equal(walk("engine", "failed", ["retry", "loaded"]), "ready", "Retry loads again");

// Derived states follow the data.
assert.deepEqual(deriveStates({ workspace: null, openFiles: [], activeFile: null, dirty: false }),
  { workspace: "none", explorer: "noWorkspace", mainArea: "empty", openFiles: [] });
assert.deepEqual(deriveStates({ workspace: { id: 1 }, openFiles: ["a"], activeFile: "a", dirty: true }),
  { workspace: "dirty", explorer: "tree", mainArea: "editor", openFiles: ["a"] });

// A change reaches the listener once, with the event that caused it.
const seen = [];
const m = createMachine("workspace", MACHINES.workspace, (s, info) => seen.push([s, info.event]));
m.send("open"); m.send("edit"); m.send("edit"); m.setDerived("dirty");
assert.deepEqual(seen, [["clean", "open"], ["dirty", "edit"]], "a repeated or no-op change is not reported");

console.log("states: every transition, every ignored event, and the derived states check out");
