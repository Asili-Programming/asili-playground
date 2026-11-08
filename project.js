// Projects: a named set of Asili files, with the rules docs/06-projects.md sets out. No DOM here,
// so scripts/test_project.mjs can check it under Node.

export const SCHEMA = "asili-project";
export const VERSION = 1;
export const ENTRY = "kuu.as";
export const LIMITS = { fileBytes: 256 * 1024, projectBytes: 2 * 1024 * 1024, files: 32 };

const MODULE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STORAGE_KEY = "asili-projects-v1";

// A stable id for a project: kept in storage, so an export does not carry it.
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Projects kept in browser storage. Storage can be missing (private window, blocked site data):
// then the list is empty and saveProjects reports false, so the page can say so.
export function loadProjects(storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveProjects(list, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
const encoder = new TextEncoder();
const bytes = (text) => encoder.encode(text).length;

// "msaidizi" -> "msaidizi.as". Throws for a name that is not an Asili module name.
export function fileNameFor(module) {
  const name = String(module ?? "").trim();
  if (!MODULE.test(name)) throw new Error(`jina '${name}' si sahihi: tumia herufi, namba na _`);
  return `${name}.as`;
}

export function moduleOf(fileName) {
  return fileName.replace(/\.as$/, "");
}

const ENTRY_TEMPLATE = 'leta matumizi\n\nkazi kuu(hoja: Orodha<Neno>) -> Tupu {\n  chapisha("Habari, Asili!")\n}\n';

export function newProject(name, now = new Date().toISOString()) {
  return {
    schema: SCHEMA,
    version: VERSION,
    name: String(name).trim() || "Mradi",
    entry: "kuu",
    files: { [ENTRY]: ENTRY_TEMPLATE },
    created: now,
    updated: now,
  };
}

// A project made from one sample's source (Hifadhi kama mradi).
export function projectFromSample(name, source, now = new Date().toISOString()) {
  const p = newProject(name, now);
  p.files[ENTRY] = source;
  return p;
}

export function addFile(project, module, text = "") {
  const file = fileNameFor(module);
  if (file in project.files) throw new Error(`faili '${file}' lipo tayari`);
  if (Object.keys(project.files).length >= LIMITS.files) throw new Error("miradi imefikia idadi ya mafaili");
  project.files[file] = text;
  return file;
}

export function deleteFile(project, file) {
  if (file === ENTRY) throw new Error("kuu.as haiwezi kufutwa");
  if (!(file in project.files)) throw new Error(`faili '${file}' halipo`);
  delete project.files[file];
}

// "saved" when the text equals what the project holds, otherwise "modified".
export function fileStatus(project, file, text) {
  return project.files[file] === text ? "saved" : "modified";
}

export function sizeOf(project) {
  return Object.values(project.files).reduce((n, text) => n + bytes(text), 0);
}

// Name for an import whose name is taken: "Hesabu" -> "Hesabu (2)", "Hesabu (3)", ...
export function uniqueName(name, taken) {
  if (!taken.includes(name)) return name;
  for (let i = 2; ; i++) {
    const candidate = `${name} (${i})`;
    if (!taken.includes(candidate)) return candidate;
  }
}

export function exportProject(project) {
  return JSON.stringify(project, null, 2) + "\n";
}

// Checks an imported document and returns a project. Throws with the first failed check.
export function importProject(text, now = new Date().toISOString()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("faili hili si JSON");
  }
  if (!data || typeof data !== "object") throw new Error("faili hili si mradi wa Asili");
  if (data.schema !== SCHEMA) throw new Error("faili hili si mradi wa Asili (schema)");
  if (data.version !== VERSION) throw new Error(`toleo la mradi ${data.version} halitambuliki`);
  if (typeof data.name !== "string" || data.name.trim() === "") throw new Error("mradi hauna jina");
  if (!data.files || typeof data.files !== "object" || Array.isArray(data.files)) {
    throw new Error("mradi hauna mafaili");
  }
  const names = Object.keys(data.files);
  if (names.length === 0) throw new Error("mradi hauna mafaili");
  if (names.length > LIMITS.files) throw new Error("mradi una mafaili mengi mno");
  if (!(ENTRY in data.files)) throw new Error("mradi hauna kuu.as");
  for (const name of names) {
    if (!name.endsWith(".as")) throw new Error(`faili '${name}' si la Asili`);
    if (name !== ENTRY) fileNameFor(moduleOf(name));
    if (typeof data.files[name] !== "string") throw new Error(`faili '${name}' si maandishi`);
    if (bytes(data.files[name]) > LIMITS.fileBytes) throw new Error(`faili '${name}' ni kubwa mno`);
  }
  const project = {
    schema: SCHEMA,
    version: VERSION,
    name: data.name.trim(),
    entry: "kuu",
    files: Object.fromEntries(names.map((n) => [n, data.files[n]])),
    created: typeof data.created === "string" ? data.created : now,
    updated: now,
  };
  if (sizeOf(project) > LIMITS.projectBytes) throw new Error("mradi ni mkubwa mno");
  return project;
}

// The modules a project run passes to runBundle: module name -> source, without kuu.as's name.
export function bundleOf(project) {
  return Object.fromEntries(Object.entries(project.files).map(([file, text]) => [moduleOf(file), text]));
}
