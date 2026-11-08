// Workspaces: a directory tree of Asili files, with the rules docs/06-projects.md sets out. A file is
// keyed by its path ("lib/msaidizi.as"); a folder is a path too. No DOM here, so
// scripts/test_project.mjs can check it under Node.

export const SCHEMA = "asili-project";
export const VERSION = 2;
export const ENTRY = "kuu.as";
export const LIMITS = { fileBytes: 256 * 1024, projectBytes: 2 * 1024 * 1024, files: 32, folders: 64 };

const SEGMENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STORAGE_KEY = "asili-projects-v1";
const encoder = new TextEncoder();
const bytes = (text) => encoder.encode(text).length;

// An error with a key (the page shows the text for its language) and an optional detail.
export class ProjectError extends Error {
  constructor(key, detail = "") {
    super(detail ? `${key}: ${detail}` : key);
    this.key = key;
    this.detail = detail;
  }
}

// A stable id for a workspace: kept in storage, so an export does not carry it.
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Workspaces kept in browser storage. Storage can be missing (private window, blocked site data):
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

// "lib/msaidizi" or "lib/msaidizi.as" -> "lib/msaidizi.as". Throws unless every segment is an
// identifier. An empty folder part is the root.
export function pathFor(input) {
  const raw = String(input ?? "").trim().replace(/\.as$/, "");
  const parts = raw.split("/");
  if (parts.some((part) => !SEGMENT.test(part))) throw new ProjectError("badName", raw);
  return `${parts.join("/")}.as`;
}

// "msaidizi" -> "msaidizi.as" (a root file). Kept for names typed at the root.
export function fileNameFor(module) {
  return pathFor(module);
}

// The module name of a file: its base name without .as. This is what `leta` names.
export function moduleOf(file) {
  return file.split("/").pop().replace(/\.as$/, "");
}

export function folderOf(file) {
  const i = file.lastIndexOf("/");
  return i < 0 ? "" : file.slice(0, i);
}

const ENTRY_TEMPLATE = 'leta matumizi\n\nkazi kuu(hoja: Orodha<Neno>) -> Tupu {\n  chapisha("Habari, Asili!")\n}\n';

export function newProject(name, now = new Date().toISOString()) {
  return {
    schema: SCHEMA,
    version: VERSION,
    name: String(name).trim() || "Nafasi ya kazi",
    entry: "kuu",
    folders: [],
    files: { [ENTRY]: ENTRY_TEMPLATE },
    created: now,
    updated: now,
  };
}

// A workspace made from one sample's source (Hifadhi kama nafasi ya kazi).
export function projectFromSample(name, source, now = new Date().toISOString()) {
  const p = newProject(name, now);
  p.files[ENTRY] = source;
  return p;
}

// Every folder the workspace has: the listed ones, and the folders of every file.
export function foldersOf(project) {
  const set = new Set(project.folders ?? []);
  for (const file of Object.keys(project.files)) {
    for (let folder = folderOf(file); folder; folder = folderOf(folder)) set.add(folder);
  }
  return [...set].sort();
}

// The base names in use, and the file that uses each: a module name must be unique.
function clashWith(project, file) {
  const name = moduleOf(file);
  return Object.keys(project.files).find((other) => other !== file && moduleOf(other) === name) ?? null;
}

function checkUnique(project, file) {
  const clash = clashWith(project, file);
  if (clash) throw new ProjectError("nameTaken", `${moduleOf(file)} (${clash})`);
}

export function addFile(project, path, text = "") {
  const file = pathFor(path);
  if (file in project.files) throw new ProjectError("fileExists", file);
  if (Object.keys(project.files).length >= LIMITS.files) throw new ProjectError("tooManyFiles");
  project.files[file] = text;
  try {
    checkUnique(project, file);
  } catch (e) {
    delete project.files[file];
    throw e;
  }
  return file;
}

export function addFolder(project, path) {
  const folder = String(path).trim().replace(/\/+$/, "");
  if (folder.split("/").some((part) => !SEGMENT.test(part))) throw new ProjectError("badName", folder);
  if (foldersOf(project).includes(folder)) throw new ProjectError("folderExists", folder);
  if (foldersOf(project).length >= LIMITS.folders) throw new ProjectError("tooManyFolders");
  project.folders = [...(project.folders ?? []), folder].sort();
  return folder;
}

export function deleteFile(project, file) {
  if (file === ENTRY) throw new ProjectError("entryDelete");
  if (!(file in project.files)) throw new ProjectError("fileMissing", file);
  delete project.files[file];
}

// Delete a folder with everything in it. The entry (kuu.as) must not be inside.
export function deleteFolder(project, folder) {
  const inside = Object.keys(project.files).filter((f) => f.startsWith(`${folder}/`));
  if (inside.includes(ENTRY)) throw new ProjectError("entryDelete");
  for (const f of inside) delete project.files[f];
  project.folders = (project.folders ?? []).filter((f) => f !== folder && !f.startsWith(`${folder}/`));
}

// Rename a file within its folder: the base name changes, the folder does not.
export function renameFile(project, file, newName) {
  if (file === ENTRY) throw new ProjectError("entryRename");
  if (!(file in project.files)) throw new ProjectError("fileMissing", file);
  const next = pathFor(folderOf(file) ? `${folderOf(file)}/${newName}` : newName);
  if (next === file) return file;
  if (next in project.files) throw new ProjectError("fileExists", next);
  project.files = Object.fromEntries(Object.entries(project.files).map(([k, v]) => [k === file ? next : k, v]));
  try {
    checkUnique(project, next);
  } catch (e) {
    project.files = Object.fromEntries(Object.entries(project.files).map(([k, v]) => [k === next ? file : k, v]));
    throw e;
  }
  return next;
}

// Move a file into another folder ("" is the root). The base name stays.
export function moveFile(project, file, folder) {
  if (file === ENTRY) throw new ProjectError("entryMove");
  if (!(file in project.files)) throw new ProjectError("fileMissing", file);
  const target = String(folder ?? "").replace(/\/+$/, "");
  if (target && !foldersOf(project).includes(target)) throw new ProjectError("folderMissing", target);
  const next = target ? `${target}/${moduleOf(file)}.as` : `${moduleOf(file)}.as`;
  if (next === file) return file;
  if (next in project.files) throw new ProjectError("fileExists", next);
  project.files = Object.fromEntries(Object.entries(project.files).map(([k, v]) => [k === file ? next : k, v]));
  return next;
}

// Rename a folder: every file and folder under it moves with it.
export function renameFolder(project, folder, newName) {
  const parent = folderOf(folder);
  const next = parent ? `${parent}/${newName}` : newName;
  if (next.split("/").some((part) => !SEGMENT.test(part))) throw new ProjectError("badName", newName);
  if (next === folder) return folder;
  const renamed = (k) => (k === folder || k.startsWith(`${folder}/`) ? next + k.slice(folder.length) : k);
  project.files = Object.fromEntries(Object.entries(project.files).map(([k, v]) => [renamed(k), v]));
  project.folders = (project.folders ?? []).map(renamed);
  return next;
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
  return JSON.stringify({ ...project, folders: foldersOf(project) }, null, 2) + "\n";
}

// Checks an imported document (version 1 or 2) and returns a workspace. Throws with the first
// failed check.
export function importProject(text, now = new Date().toISOString()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProjectError("notJson");
  }
  if (!data || typeof data !== "object") throw new ProjectError("notAsili");
  if (data.schema !== SCHEMA) throw new ProjectError("notAsili");
  if (data.version !== 1 && data.version !== VERSION) throw new ProjectError("version", String(data.version));
  if (typeof data.name !== "string" || data.name.trim() === "") throw new ProjectError("noName");
  if (!data.files || typeof data.files !== "object" || Array.isArray(data.files)) {
    throw new ProjectError("noFiles");
  }
  const names = Object.keys(data.files);
  if (names.length === 0) throw new ProjectError("noFiles");
  if (names.length > LIMITS.files) throw new ProjectError("tooManyFiles");
  if (!(ENTRY in data.files)) throw new ProjectError("noEntry");
  const files = {};
  for (const name of names) {
    if (!name.endsWith(".as")) throw new ProjectError("notAsiliFile", name);
    const file = name === ENTRY ? ENTRY : pathFor(name);
    if (file !== name) throw new ProjectError("badName", name);
    if (typeof data.files[name] !== "string") throw new ProjectError("notText", name);
    if (bytes(data.files[name]) > LIMITS.fileBytes) throw new ProjectError("fileTooBig", name);
    files[file] = data.files[name];
  }
  const project = {
    schema: SCHEMA,
    version: VERSION,
    name: data.name.trim(),
    entry: "kuu",
    folders: Array.isArray(data.folders) ? data.folders.filter((f) => typeof f === "string") : [],
    files,
    created: typeof data.created === "string" ? data.created : now,
    updated: now,
  };
  const modules = new Map();
  for (const file of Object.keys(files)) {
    const module = moduleOf(file);
    if (modules.has(module)) throw new ProjectError("nameTaken", `${module} (${modules.get(module)})`);
    modules.set(module, file);
  }
  if (sizeOf(project) > LIMITS.projectBytes) throw new ProjectError("projectTooBig");
  return project;
}

// The modules a workspace run passes to runBundle: module name -> source.
export function bundleOf(project) {
  return Object.fromEntries(Object.entries(project.files).map(([file, text]) => [moduleOf(file), text]));
}
