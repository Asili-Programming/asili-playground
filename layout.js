// The IDE shell as data. Features register what they add (menus and their items, toolbar buttons,
// sidebar sections, bottom-panel tabs, status items); renderShell() builds the page from those
// registries. Nothing here knows what a feature does, so a new feature is one registration.
//
// Entries are registered before renderShell() runs. A duplicate id is an error, so two features
// cannot silently replace each other. After rendering, entries can be shown, hidden or disabled at
// run time (setRegionVisible, refreshMenus, showPanel).

import { getCommand, isEnabled, runCommand } from "./commands.js";

let brand = { logo: "", title: "Asili", subtitle: "" };

// A menu or palette item runs its own `run`, or the command it names; `enabled` likewise.
function actionOf(item) {
  return item.run ?? (item.command ? () => runCommand(item.command) : null);
}
function enabledOf(item) {
  if (item.enabled) return item.enabled;
  const command = item.command ? getCommand(item.command) : null;
  return command ? () => isEnabled(command) : null;
}

const registry = {
  menus: new Map(),
  toolbar: new Map(),
  activity: new Map(),
  tabEnd: new Map(),
  sections: { primary: new Map(), secondary: new Map() },
  panels: new Map(),
  status: new Map(),
};

let rendered = false;

function add(map, entry, kind) {
  if (rendered) throw new Error(`layout: ${kind} '${entry.id}' registered after the shell was rendered`);
  if (!entry || typeof entry.id !== "string" || entry.id === "") {
    throw new Error(`layout: a ${kind} needs an id`);
  }
  if (map.has(entry.id)) throw new Error(`layout: ${kind} '${entry.id}' is already registered`);
  map.set(entry.id, entry);
}

const byOrder = (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id);

// The name and logo at the start of the menu bar: { logo, title, subtitle (string-table key) }.
export function setBrand(next) { brand = { ...brand, ...next }; }

// menu: { id, label (string-table key), order, items: [{ id, label, run, enabled?, optional? }] }
export function addMenu(menu) { add(registry.menus, menu, "menu"); }

// icon at the right end of the tab row: { id, title (key or text), icon (SVG markup), order, run }
export function addTabEndItem(item) { add(registry.tabEnd, item, "tab row item"); }

// activity bar button (the far-left strip): { id, title (key), icon, order, run, enabled? }
export function addActivity(item) { add(registry.activity, item, "activity item"); }

// toolbar button, shown on the right of the menu bar: { id, label, run, order, enabled?, className? }
export function addToolbarItem(item) { add(registry.toolbar, item, "toolbar item"); }

// side: "primary" | "secondary". section: { id, title (string-table key), order, render(container), optional? }
export function addSidebarSection(side, section) {
  if (!registry.sections[side]) throw new Error(`layout: no sidebar '${side}'`);
  add(registry.sections[side], section, "sidebar section");
}

// bottom panel tab: { id, title (key), order, render(container), optional? }
export function addPanel(panel) { add(registry.panels, panel, "panel"); }

// status bar item: { id, order, render(container), optional? }
export function addStatusItem(item) { add(registry.status, item, "status item"); }

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

// Build the whole shell into `root`. `t` maps a string-table key to its text; `embed` drops the
// entries marked optional (the embed page shows the editor, Run and output only).
export function renderShell(root, { t, embed = false }) {
  const keep = (entry) => !(embed && entry.optional);
  rendered = true;
  root.replaceChildren();

  // Menu bar.
  const menubar = el("div", { class: "menubar", role: "menubar" });
  const brandNode = el("span", { class: "brand" });
  if (brand.logo) brandNode.append(el("img", { class: "logo", src: brand.logo, alt: "", width: 22, height: 24 }));
  brandNode.append(document.createTextNode(` ${brand.title} `));
  if (brand.subtitle) brandNode.append(el("span", {}, t(brand.subtitle)));
  menubar.append(brandNode);
  for (const menu of [...registry.menus.values()].filter(keep).sort(byOrder)) {
    const details = el("details", { class: "menu", id: `menu-${menu.id}` });
    details.append(el("summary", { "data-i18n": menu.label }, t(menu.label)));
    const items = el("div", { class: "menu-items" });
    for (const item of menu.items.filter(keep)) {
      const button = el("button", { id: item.id, "data-menu-item": item.id }, t(item.label));
      const run = actionOf(item);
      button.addEventListener("click", () => {
        details.open = false;
        run?.();
      });
      items.append(button);
    }
    details.append(items);
    menubar.append(details);
  }
  menubar.append(el("span", { class: "menubar-spacer" }));
  for (const item of [...registry.toolbar.values()].filter(keep).sort(byOrder)) {
    const button = el("button", { id: item.id, class: item.className ?? "" }, t(item.label));
    button.addEventListener("click", () => item.run?.());
    menubar.append(button);
  }
  root.append(menubar);

  // Activity bar, then the workbench: primary sidebar | main | secondary sidebar.
  const bodyRow = el("div", { class: "body-row" });
  const activity = el("nav", { class: "activitybar", "aria-label": t("activityBar") });
  for (const item of [...registry.activity.values()].filter(keep).sort(byOrder)) {
    const button = el("button", { id: item.id, class: "activity-btn", title: t(item.title), "aria-label": t(item.title) });
    button.innerHTML = item.icon ?? ""; // trusted markup from main.js: an SVG icon, never text
    button.addEventListener("click", () => item.run?.());
    activity.append(button);
  }
  bodyRow.append(activity);
  const workbench = el("div", { class: "workbench" });
  workbench.append(sidebar("primary", "aside", keep, t));
  workbench.append(splitter("primary"));

  const main = el("section", { id: "editor-pane", class: "main", "aria-label": t("editor") });
  // The tab row: the open files, then icons at its right end (the language switch).
  const tabbar = el("div", { class: "tabbar" });
  tabbar.append(el("div", { id: "doc-tabs", class: "doc-tabs", role: "tablist", "aria-label": t("openFiles") }));
  const tabEnd = el("div", { class: "tabbar-end" });
  for (const item of [...registry.tabEnd.values()].filter(keep).sort(byOrder)) {
    const button = el("button", { id: item.id, class: "tab-end-btn", title: t(item.title), "aria-label": t(item.title) });
    button.innerHTML = item.icon ?? "";
    button.addEventListener("click", () => item.run?.());
    tabEnd.append(button);
  }
  tabbar.append(tabEnd);
  main.append(
    tabbar,
    el("div", { id: "notice", class: "notice", role: "alert", hidden: true }),
    el("div", { id: "editor" }),
  );
  main.append(bottomPanel(keep, t));
  workbench.append(main);

  workbench.append(splitter("secondary"));
  workbench.append(sidebar("secondary", "aside", keep, t));
  bodyRow.append(workbench);
  root.append(bodyRow);

  // Status bar.
  const statusbar = el("footer", { class: "statusbar" });
  for (const item of [...registry.status.values()].filter(keep).sort(byOrder)) {
    const slot = el("span", { class: "status-item", id: `status-${item.id}` });
    item.render?.(slot, t);
    statusbar.append(slot);
  }
  root.append(statusbar);
  wireMenus(root);
  applyStoredSizes();

}

// Sizes of the regions, as CSS variables on .ide: --primary-w, --secondary-w, --panel-h.
const SIZES_KEY = "asili-layout-v1";
const SIZE_LIMITS = { primary: [120, 480], secondary: [140, 480], panel: [80, 600] };
const DEFAULT_SIZES = { primary: 240, secondary: 272, panel: 208 };
const VARIABLES = { primary: "--primary-w", secondary: "--secondary-w", panel: "--panel-h" };

function storedSizes() {
  try {
    return { ...DEFAULT_SIZES, ...JSON.parse(localStorage.getItem(SIZES_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_SIZES };
  }
}

function applySize(region, px) {
  const [min, max] = SIZE_LIMITS[region];
  const value = Math.min(max, Math.max(min, Math.round(px)));
  document.querySelector(".ide")?.style.setProperty(VARIABLES[region], `${value}px`);
  return value;
}

// A draggable bar between two regions. Dragging changes the region's size; the size is kept.
function splitter(region) {
  const bar = el("div", { class: `splitter splitter-${region}`, role: "separator", "aria-orientation": region === "panel" ? "horizontal" : "vertical", "data-region": region });
  bar.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    bar.setPointerCapture(event.pointerId);
    const start = region === "panel" ? event.clientY : event.clientX;
    const size = storedSizes()[region];
    const move = (e) => {
      const now = region === "panel" ? e.clientY : e.clientX;
      // The primary sidebar grows to the right; the secondary and the panel grow to the left and up.
      const delta = region === "primary" ? now - start : start - now;
      applySize(region, size + delta);
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      const sizes = storedSizes();
      sizes[region] = parseInt(getComputedStyle(document.querySelector(".ide")).getPropertyValue(VARIABLES[region]), 10) || sizes[region];
      try { localStorage.setItem(SIZES_KEY, JSON.stringify(sizes)); } catch { /* sizes are kept for this visit only */ }
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
  });
  return bar;
}

// Apply the remembered sizes once the shell exists.
function applyStoredSizes() {
  const sizes = storedSizes();
  for (const region of Object.keys(VARIABLES)) applySize(region, sizes[region]);
}

// Menus: a click outside or Escape closes the open menu; hovering another menu opens it; arrow keys
// move through the items.
function wireMenus(root) {
  const menus = () => [...root.querySelectorAll("details.menu")];
  document.addEventListener("click", (e) => {
    for (const m of menus()) if (m.open && !m.contains(e.target)) m.open = false;
  });
  root.addEventListener("keydown", (e) => {
    const open = menus().find((m) => m.open);
    if (e.key === "Escape" && open) {
      open.open = false;
      open.querySelector("summary").focus();
      e.preventDefault();
      return;
    }
    if (!open || !(e.key === "ArrowDown" || e.key === "ArrowUp")) return;
    const items = [...open.querySelectorAll(".menu-items button:not(:disabled), .menu-items a")];
    const at = items.indexOf(document.activeElement);
    const next = items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    next?.focus();
    e.preventDefault();
  });
  for (const m of menus()) {
    m.querySelector("summary").addEventListener("pointerenter", () => {
      const current = menus().find((x) => x.open);
      if (current && current !== m) {
        current.open = false;
        m.open = true;
      }
    });
  }
}

function sidebar(side, tag, keep, t) {
  const sections = [...registry.sections[side].values()].filter(keep).sort(byOrder);
  const node = el("aside", { id: side === "primary" ? "primary" : "board-pane", class: "sidebar", "data-region": side, "aria-label": side });
  for (const section of sections) {
    const wrap = el("section", { class: "sidebar-section", id: `section-${section.id}`, "data-section": section.id });
    wrap.append(el("h2", { class: "sidebar-title" }, t(section.title)));
    section.render?.(wrap, t);
    node.append(wrap);
  }
  return node;
}

function bottomPanel(keep, t) {
  const panel = el("section", { id: "panel", class: "bottom-panel", "aria-label": t("panel") });
  const tabs = el("div", { class: "panel-tabs", role: "tablist" });
  const bodies = el("div", { class: "panel-bodies" });
  for (const p of [...registry.panels.values()].filter(keep).sort(byOrder)) {
    const tab = el("button", {
      id: `tab-${p.id}`, role: "tab", class: "panel-tab", "data-panel": p.id,
      "aria-controls": `panel-${p.id}`, "aria-selected": false, "data-i18n": p.title,
    }, t(p.title));
    tab.addEventListener("click", () => showPanel(p.id));
    tabs.append(tab);
    const body = el("div", { id: `panel-${p.id}`, class: "panel-body", role: "tabpanel", "aria-labelledby": `tab-${p.id}`, hidden: true });
    p.render?.(body, t);
    bodies.append(body);
  }
  tabs.append(el("span", { id: "problem-count", class: "problem-count" }));
  panel.append(tabs, bodies);
  return panel;
}

// Show one bottom-panel tab and hide the others.
export function showPanel(id) {
  for (const tab of document.querySelectorAll(".panel-tab")) {
    const active = tab.dataset.panel === id;
    tab.setAttribute("aria-selected", String(active));
  }
  for (const body of document.querySelectorAll(".panel-body")) {
    body.hidden = body.id !== `panel-${id}`;
  }
}

// Show or hide a whole region (a sidebar, the bottom panel) by its id, at run time.
export function setRegionVisible(region, visible) {
  document.querySelector(".ide")?.classList.toggle(`hide-${region}`, !visible);
}

export function regionVisible(region) {
  return !document.querySelector(".ide")?.classList.contains(`hide-${region}`);
}

// Re-evaluate each menu item's `enabled()` (for example Close tab needs more than one open file).
export function refreshMenus() {
  const all = [
    ...[...registry.menus.values()].flatMap((m) => m.items),
    ...registry.toolbar.values(),
    ...registry.tabEnd.values(),
  ];
  for (const item of all) {
    const button = document.getElementById(item.id);
    const enabled = enabledOf(item);
    if (button && enabled) button.disabled = !enabled();
  }
}

// Mark a status item or sidebar section hidden without removing it.
export function setSectionHidden(side, id, hidden) {
  document.getElementById(`section-${id}`)?.toggleAttribute("hidden", hidden);
}
