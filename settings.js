// The page's on/off settings, in one place: each toggle has one definition (its start value and
// how to apply it), one saved value, and one place where the commands, the keys and the menus read
// it. docs/03-app-flow.md ("Toggles") lists every toggle and its states. No DOM here, so
// scripts/test_settings.mjs can check the cycles under Node.

const KEY = "asili-settings-v1";
const defs = new Map(); // id -> { initial, apply, persist }
const listeners = new Set();
let values = {};
let store = globalThis.localStorage;

export function loadValues(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) ?? "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function saveValues() {
  try {
    store.setItem(KEY, JSON.stringify(values));
    return true;
  } catch {
    return false;
  }
}

// Define a toggle. `initial` is the start value (used when nothing is saved); `apply(value)` makes
// the page show it. A toggle can be `forced` (embed mode): forced values are applied but not saved.
export function defineToggle(id, { initial, apply, persist = true }) {
  if (defs.has(id)) throw new Error(`toggle '${id}' is already defined`);
  defs.set(id, { initial, apply, persist });
  const value = persist && id in values ? values[id] : initial;
  apply?.(value);
}

export function isOn(id) {
  const d = defs.get(id);
  if (!d) throw new Error(`toggle '${id}' is not defined`);
  return d.persist && id in values ? values[id] : d.initial;
}

// Set a toggle to `value`. Saved values are kept; a non-persisted set only changes the page.
export function setToggle(id, value, { force = false } = {}) {
  const d = defs.get(id);
  if (!d) throw new Error(`toggle '${id}' is not defined`);
  const next = !!value;
  if (d.persist && !force) {
    values[id] = next;
    saveValues();
  }
  d.apply?.(next);
  for (const fn of listeners) fn(id, next);
  return next;
}

// Flip a toggle: on becomes off, off becomes on. Two flips give the start state again.
export function toggleSetting(id) {
  return setToggle(id, !isOn(id));
}

// Called whenever any toggle changes (the menus redraw their check marks).
export function onToggleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// For tests and for a reset: forget the saved values.
export function resetSettings() {
  values = {};
  try {
    store.removeItem(KEY);
  } catch {
    // Nothing to remove when storage is not available.
  }
}

// Start from the saved values; `storage` is where changes are saved from now on.
export function initSettings(saved = loadValues(), storage = globalThis.localStorage) {
  values = saved;
  store = storage;
}
