// The session: the open files, their unsaved text, and which one is active. Kept in browser storage
// so a reload restores the work (docs/07-ide-behaviour.md, items 1 and 5). No DOM here, so
// scripts/test_session.mjs can check it under Node.

const KEY = "asili-session-v1";
export const SESSION_VERSION = 1;

// data: { active: key|null, docs: [{ key, name, projectId, file, text }] }
export function saveSession(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify({ version: SESSION_VERSION, ...data }));
    return true;
  } catch {
    return false;
  }
}

// Returns the saved session, or null when there is none or it cannot be read.
export function loadSession(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) ?? "null");
    if (!data || data.version !== SESSION_VERSION || !Array.isArray(data.docs)) return null;
    const docs = data.docs.filter((d) => d && typeof d.key === "string" && typeof d.text === "string");
    return { active: typeof data.active === "string" ? data.active : null, docs };
  } catch {
    return null;
  }
}

export function clearSession(storage = globalThis.localStorage) {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing to clear when storage is not available.
  }
}
