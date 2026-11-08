// The session store under Node: round trip, refusals, and a missing store.
//   node scripts/test_session.mjs
import assert from "node:assert/strict";
import { saveSession, loadSession, clearSession } from "../session.js";

const memory = new Map();
const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) };
const data = { active: "p:1:kuu.as", docs: [{ key: "p:1:kuu.as", name: "kuu.as", projectId: "1", file: "kuu.as", text: "x" }] };

assert.equal(saveSession(data, storage), true);
assert.deepEqual(loadSession(storage), data);
assert.equal(loadSession({ getItem: () => "{broken" }), null);
assert.equal(loadSession({ getItem: () => JSON.stringify({ version: 9, docs: [] }) }), null);
assert.deepEqual(loadSession({ getItem: () => JSON.stringify({ version: 1, active: 3, docs: [{ key: "a", text: "t" }, { key: 5 }] }) }),
  { active: null, docs: [{ key: "a", text: "t" }] });
assert.equal(saveSession(data, { setItem() { throw new Error("quota"); } }), false);
clearSession(storage);
assert.equal(loadSession(storage), null);
assert.equal(loadSession(undefined), null);

console.log("session: round trip and refusals ok");
