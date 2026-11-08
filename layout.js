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

  const main = el("section", { id: "editor-pane", class: "main", "aria-label": t("editor") });
  main.append(
    el("div", { id: "doc-tabs", class: "doc-tabs", role: "tablist", "aria-label": t("openFiles") }),
    el("div", { id: "notice", class: "notice", role: "alert", hidden: true }),
    el("div", { id: "editor" }),
  );
  main.append(bottomPanel(keep, t));
  workbench.append(main);

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
