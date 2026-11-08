// Commands: one registry for everything the IDE can do. The menus, the command palette (Ctrl+Shift+P)
// and the keyboard read it, so a command is registered once. See docs/03-app-flow.md, Flow 7.
//
// A command: { id, title, run(), key?, enabled?(), inEditor?, inInput? }
//   key       a combination such as "Ctrl+Shift+P", or a list of them: ["Ctrl+Enter", "F5"]
//   inEditor  the key also works while the editor has focus (VS Code's editor keys)
//   inInput   the key also works in a text field (the palette, save, run)

const commands = new Map();

export function registerCommand(command) {
  if (!command || typeof command.id !== "string") throw new Error("command: needs an id");
  if (commands.has(command.id)) throw new Error(`command '${command.id}' is already registered`);
  commands.set(command.id, command);
}

export function getCommand(id) {
  return commands.get(id) ?? null;
}

export function isEnabled(command) {
  return command.enabled ? !!command.enabled() : true;
}

export function runCommand(id) {
  const command = commands.get(id);
  if (!command) throw new Error(`command '${id}' is not registered`);
  if (!isEnabled(command)) return false;
  command.run();
  return true;
}

export function allCommands() {
  return [...commands.values()];
}

// "Ctrl+Shift+P" from an event: modifiers in a fixed order, then the key name.
export function keyOf(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  let key = event.key;
  if (key === " ") key = "Space";
  if (key.length === 1) key = key.toUpperCase();
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) parts.push(key);
  return parts.join("+");
}

const keysOf = (command) => (Array.isArray(command.key) ? command.key : command.key ? [command.key] : []);

export function commandForKey(event) {
  const combo = keyOf(event);
  for (const command of commands.values()) {
    if (keysOf(command).includes(combo)) return command;
  }
  return null;
}

// Key handling: a command's key runs unless focus is in a field where that command is not allowed.
export function installKeys(target = window) {
  target.addEventListener("keydown", (event) => {
    const command = commandForKey(event);
    if (!command) return;
    const inEditor = !!event.target?.closest?.(".cm-editor");
    const inField = !!event.target?.closest?.("input, textarea, select");
    if (inField && !command.inInput) return;
    if (inEditor && !command.inEditor && !command.inInput) return;
    if (!isEnabled(command)) return;
    event.preventDefault();
    command.run();
  });
}

// ---- List overlay: the command palette and quick open ------------------------------------------
// openList shows a filterable list; each item is { label, detail?, run, enabled? }.
let palette = null;
let shown = [];
let cursor = 0;
let source = [];
let placeholderText = "";

function ensurePalette() {
  if (palette) return palette;
  palette = document.createElement("div");
  palette.id = "palette";
  palette.className = "palette";
  palette.hidden = true;
  palette.innerHTML = `
    <div class="palette-box" role="dialog" aria-modal="true" aria-label="Palette">
      <input id="palette-input" type="text" autocomplete="off" aria-controls="palette-list" />
      <ul id="palette-list" role="listbox"></ul>
    </div>`;
  palette.addEventListener("mousedown", (e) => {
    if (e.target === palette) closePalette();
  });
  document.body.append(palette);
  const input = palette.querySelector("#palette-input");
  input.addEventListener("input", () => renderList(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { cursor = Math.min(cursor + 1, shown.length - 1); highlight(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { cursor = Math.max(cursor - 1, 0); highlight(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); const item = shown[cursor]; closePalette(); if (item && isItemEnabled(item)) item.run(); }
    else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
  });
  return palette;
}

const isItemEnabled = (item) => (item.enabled ? !!item.enabled() : true);

function renderList(query) {
  const q = query.trim().toLowerCase();
  shown = source.filter((item) => item.label && (q === "" || item.label.toLowerCase().includes(q)
    || (item.detail ?? "").toLowerCase().includes(q)));
  cursor = 0;
  const list = palette.querySelector("#palette-list");
  list.replaceChildren(...shown.map((item, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.index = String(i);
    li.append(document.createTextNode(item.label));
    if (item.detail) {
      const k = document.createElement("span");
      k.className = "palette-key";
      k.textContent = item.detail;
      li.append(k);
    }
    if (!isItemEnabled(item)) li.classList.add("disabled");
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      closePalette();
      if (isItemEnabled(item)) item.run();
    });
    return li;
  }));
  highlight();
}

function highlight() {
  const items = palette.querySelectorAll("#palette-list li");
  items.forEach((li, i) => li.setAttribute("aria-selected", String(i === cursor)));
  items[cursor]?.scrollIntoView?.({ block: "nearest" });
}

export function openList({ placeholder = "", items }) {
  const p = ensurePalette();
  source = items;
  placeholderText = placeholder;
  p.hidden = false;
  const input = p.querySelector("#palette-input");
  input.value = "";
  input.placeholder = placeholderText;
  renderList("");
  input.focus();
}

// The command palette: every command, with its key.
export function openPalette() {
  openList({
    placeholder: "Amri",
    items: allCommands()
      .filter((c) => c.title)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((c) => ({
        label: c.title,
        detail: keysOf(c).join(" · "),
        enabled: () => isEnabled(c),
        run: () => runCommand(c.id),
      })),
  });
}

export function closePalette() {
  if (palette) palette.hidden = true;
}

export function paletteOpen() {
  return !!palette && !palette.hidden;
}
