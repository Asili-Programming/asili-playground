// The projects rules (docs/06-projects.md) under Node: naming, import checks, export round trip.
//   node scripts/test_project.mjs
import assert from "node:assert/strict";
import * as P from "../project.js";

const p = P.newProject("Hesabu", "2026-11-08T00:00:00Z");
assert.deepEqual(Object.keys(p.files), ["kuu.as"]);

assert.equal(P.addFile(p, "msaidizi", "umma kazi a() {}\n"), "msaidizi.as");
assert.throws(() => P.addFile(p, "msaidizi"), /lipo tayari/);
assert.throws(() => P.addFile(p, "1abc"), /si sahihi/);
assert.throws(() => P.addFile(p, "a-b"), /si sahihi/);
assert.throws(() => P.deleteFile(p, "kuu.as"), /haiwezi kufutwa/);
P.deleteFile(p, "msaidizi.as");
assert.equal(P.fileStatus(p, "kuu.as", p.files["kuu.as"]), "saved");
assert.equal(P.fileStatus(p, "kuu.as", p.files["kuu.as"] + "x"), "modified");

// Export and import round trip.
P.addFile(p, "takwimu", "kazi b() {}\n");
const back = P.importProject(P.exportProject(p), "2026-11-09T00:00:00Z");
assert.deepEqual(back.files, p.files);
assert.equal(back.name, "Hesabu");
assert.equal(back.created, "2026-11-08T00:00:00Z");

// Refusals, each with its reason.
const bad = (doc, re) => assert.throws(() => P.importProject(typeof doc === "string" ? doc : JSON.stringify(doc)), re);
bad("{not json", /JSON/);
bad({ ...back, schema: "other" }, /schema/);
bad({ ...back, version: 2 }, /toleo/);
bad({ ...back, name: "" }, /jina/);
bad({ ...back, files: { "msaidizi.as": "x" } }, /kuu\.as/);
bad({ ...back, files: { "kuu.as": "x", "a-b.as": "y" } }, /si sahihi/);
bad({ ...back, files: { "kuu.as": "x", "notes.txt": "y" } }, /si la Asili/);
bad({ ...back, files: { "kuu.as": 3 } }, /si maandishi/);
bad({ ...back, files: { "kuu.as": "x".repeat(P.LIMITS.fileBytes + 1) } }, /kubwa mno/);

// Names taken on import get a number, never a replacement.
assert.equal(P.uniqueName("Hesabu", ["Hesabu"]), "Hesabu (2)");
assert.equal(P.uniqueName("Hesabu", ["Hesabu", "Hesabu (2)"]), "Hesabu (3)");
assert.equal(P.uniqueName("Hesabu", ["Mengine"]), "Hesabu");

// A project's bundle names modules by file name without .as.
assert.deepEqual(Object.keys(P.bundleOf(p)).sort(), ["kuu", "takwimu"]);

// Storage: a list round trip, and a refusal (not an error) when storage is unavailable.
const memory = new Map();
const fakeStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
assert.equal(P.saveProjects([{ id: "a", name: "Hesabu" }], fakeStorage), true);
assert.deepEqual(P.loadProjects(fakeStorage), [{ id: "a", name: "Hesabu" }]);
assert.deepEqual(P.loadProjects({ getItem: () => "{broken" }), []);
assert.equal(P.saveProjects([], { setItem() { throw new Error("quota"); } }), false);
assert.deepEqual(P.loadProjects(undefined), []);

console.log("projects: naming, import checks, export round trip and storage ok");
