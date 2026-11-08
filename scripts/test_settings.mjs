// The toggles' cycles under Node: each toggle returns to its start after two flips, its saved value
// survives a reload, a forced value is not saved, and an undefined toggle is an error.
//   node scripts/test_settings.mjs
import assert from "node:assert/strict";
import * as S from "../settings.js";

const memory = new Map();
const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) };
S.initSettings(S.loadValues(storage), storage);

const applied = {};
S.defineToggle("primary", { initial: true, apply: (v) => { applied.primary = v; } });
S.defineToggle("secondary", { initial: false, apply: (v) => { applied.secondary = v; } });
S.defineToggle("wrap", { initial: false, apply: (v) => { applied.wrap = v; } });

assert.equal(applied.primary, true, "applied at start");
assert.equal(applied.secondary, false);
for (const id of ["primary", "secondary", "wrap"]) {
  const start = S.isOn(id);
  S.toggleSetting(id);
  assert.equal(S.isOn(id), !start, `${id} flips once`);
  S.toggleSetting(id);
  assert.equal(S.isOn(id), start, `${id} returns to its start after two flips`);
}

// A saved value survives a restart (a new load of the same storage).
S.setToggle("secondary", true);
S.initSettings(S.loadValues(storage), storage);
assert.equal(S.isOn("secondary"), true, "saved across a reload");

// A forced value is applied but not saved.
S.setToggle("primary", false, { force: true });
assert.equal(applied.primary, false, "forced value is applied");
S.initSettings(S.loadValues(storage), storage);
assert.equal(S.isOn("primary"), true, "forced value is not saved");

assert.throws(() => S.isOn("nowhere"), /not defined/);
assert.throws(() => S.defineToggle("primary", { initial: true }), /already defined/);

const seen = [];
const stop = S.onToggleChange((id, v) => seen.push([id, v]));
S.toggleSetting("wrap");
stop();
assert.deepEqual(seen, [["wrap", true]]);

console.log("settings: every toggle cycles, saves, and forced values stay out of storage");
