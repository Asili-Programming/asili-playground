// The IDE shell as data. Features register what they add (menus and their items, toolbar buttons,
// sidebar sections, bottom-panel tabs, status items); renderShell() builds the page from those
// registries. Nothing here knows what a feature does, so a new feature is one registration.
//
// Entries are registered before renderShell() runs. A duplicate id is an error, so two features
// cannot silently replace each other. After rendering, entries can be shown, hidden or disabled at
// run time (setRegionVisible, refreshMenus, showPanel).

import { getCommand, isEnabled, runCommand } from "./commands.js";
import { isOn, hasToggle, setToggle } from "./settings.js";
import { MACHINES, createMachine, deriveRegion } from "./states.js";

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
  views: new Map(),
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

// A view is a tab in one of the regions: "primary" (left sidebar), "secondary" (right sidebar) or
// "panel" (bottom panel). { id, title (key), region, order, render(container), optional? }. Views can
// be dragged to another region; the page remembers where each one is.
export function addView(view) {
  if (!REGIONS.includes(view.region)) throw new Error(`layout: no region '${view.region}'`);
  // menu: true lists the view in the View menu; keyHint is the key shown beside it.
  add(registry.views, view, "view");
}
export function addSidebarSection(side, section) { addView({ ...section, region: side }); }
export function addPanel(panel) { addView({ ...panel, region: "panel" }); }

const REGIONS = ["primary", "secondary", "panel"];
const REGION_IDS = { primary: "primary", secondary: "board-pane", panel: "panel" };
const VIEW_TYPE = "application/x-asili-view";
const VIEWS_KEY = "asili-views-v1";
const viewNodes = new Map(); // view id -> { tab, pane }

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
  // A plain group of menus and buttons: the menus are native <details>, so no menubar role (it
  // would need menuitem children).
  const menubar = el("div", { class: "menubar", "aria-label": t("menu") });
  const brandNode = el("span", { class: "brand" });
  if (brand.logo) brandNode.append(el("img", { class: "logo", src: brand.logo, alt: "", width: 22, height: 24 }));
  brandNode.append(document.createTextNode(` ${brand.title} `));
  if (brand.subtitle) brandNode.append(el("span", {}, t(brand.subtitle)));
  menubar.append(brandNode);
  for (const menu of [...registry.menus.values()].filter(keep).sort(byOrder)) {
    const details = el("details", { class: "menu", id: `menu-${menu.id}` });
    details.append(el("summary", { "data-i18n": menu.label }, t(menu.label)));
    const items = el("div", { class: "menu-items" });
    const entries = typeof menu.items === "function" ? menu.items() : menu.items;
    appendMenuItems(items, entries.filter(keep), details, t, keep);
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
  if (activity.childElementCount) bodyRow.append(activity); // no icon column without icons
  const workbench = el("div", { class: "workbench" });
  workbench.append(regionNode("primary", t));
  workbench.append(splitter("primary"));

  // The editor area is the page's main landmark.
  const main = el("main", { id: "editor-pane", class: "main", "aria-label": t("editor") });
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
  main.append(tabbar);
  // The main area's view: the editor, with the notice above it.
  main.append(el("div", { class: "region-body main-body" }, undefined));
  main.lastChild.append(
    el("div", { id: "notice", class: "notice", role: "alert", hidden: true }),
    el("div", { id: "editor" }),
  );
  main.append(regionNode("panel", t));
  workbench.append(main);

  workbench.append(splitter("secondary"));
  workbench.append(regionNode("secondary", t));
  bodyRow.append(workbench);
  root.append(bodyRow);
  // On a phone the sidebars and the bottom panel are sheets: a tap on the scrim closes them all.
  const scrim = el("div", { class: "scrim", id: "scrim", "aria-hidden": "true" });
  scrim.addEventListener("click", () => {
    for (const region of REGIONS) if (hasToggle(region)) setToggle(region, false);
    else setRegionVisible(region, false);
  });
  root.append(scrim);

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
  createViews(keep, t);
  placeViews();
  renderMobileNav(t);
  // Dropping a view on the editor area puts it in the bottom panel.
  const area = document.getElementById("editor-pane");
  area.addEventListener("dragover", (e) => { if (hasView(e)) e.preventDefault(); });
  area.addEventListener("drop", (e) => {
    const id = viewFrom(e);
    if (!id) return;
    e.preventDefault();
    moveView(id, "panel", null);
  });

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

// The items of a menu: buttons (with their key), separators, and submenus (an item whose
// `submenu` lists items of its own).
function appendMenuItems(container, entries, details, t, keep) {
  for (const item of entries) {
    if (item.separator) {
      container.append(el("hr", { class: "menu-sep", role: "separator" }));
      continue;
    }
    if (item.submenu) {
      const sub = el("div", { class: "submenu", id: item.id });
      const head = el("button", { class: "submenu-head", type: "button", "aria-haspopup": "true", "aria-expanded": "false" }, t(item.label));
      head.append(el("span", { class: "menu-key", "aria-hidden": "true" }, "›"));
      const body = el("div", { class: "submenu-items", hidden: true });
      head.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = body.hidden;
        body.hidden = !open;
        head.setAttribute("aria-expanded", String(open));
      });
      appendMenuItems(body, item.submenu.filter(keep), details, t, keep);
      sub.append(head, body);
      container.append(sub);
      continue;
    }
    const button = el("button", { id: item.id, "data-menu-item": item.id }, t(item.label));
    if (item.toggle) button.dataset.toggle = item.toggle;
    if (item.keyHint) button.append(el("span", { class: "menu-key" }, item.keyHint));
    const run = actionOf(item);
    button.addEventListener("click", () => {
      details.open = false;
      run?.();
    });
    container.append(button);
  }
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

// A region: its tab strip, and the body that holds the views' panes. The views are placed in it by
// placeViews (their tabs and panes are created once, and moved from region to region).
function regionNode(region, t) {
  const node = el(region === "panel" ? "section" : "aside", {
    id: REGION_IDS[region],
    class: region === "panel" ? "bottom-panel" : "sidebar",
    "data-region": region,
    "aria-label": t(region === "panel" ? "panel" : region),
  });
  const strip = el("div", { class: "panel-tabs region-strip", role: "tablist", "data-region": region });
  const body = el("div", { class: "region-body" });
  node.append(strip, body);
  for (const target of [strip, body]) {
    target.addEventListener("dragover", (e) => {
      if (!hasView(e)) return;
      e.preventDefault();
      strip.classList.add("drop-target");
    });
    target.addEventListener("dragleave", () => strip.classList.remove("drop-target"));
    target.addEventListener("drop", (e) => {
      const id = viewFrom(e);
      if (!id) return;
      e.preventDefault();
      strip.classList.remove("drop-target");
      moveView(id, region, null);
    });
  }
  return node;
}

const hasView = (e) => [...(e.dataTransfer?.types ?? [])].includes(VIEW_TYPE);
const viewFrom = (e) => e.dataTransfer?.getData(VIEW_TYPE) || null;

// The tab and the pane of every view, made once.
function createViews(keep, t) {
  for (const view of [...registry.views.values()].filter(keep)) {
    const tab = el("button", {
      id: `tab-${view.id}`, role: "tab", class: "panel-tab region-tab", "data-panel": view.id,
      "data-view": view.id, draggable: "true", "aria-controls": `panel-${view.id}`, "aria-selected": "false",
      title: t(view.title), "aria-label": t(view.title),
    });
    // The icon shows in the side bars, the name in the bottom panel (see style.css).
    const icon = el("span", { class: "tab-icon", "aria-hidden": "true" });
    icon.innerHTML = view.icon ?? "";
    tab.append(icon, el("span", { class: "tab-text" }, t(view.title)));
    if (view.id === "problems") tab.append(el("span", { id: "problem-count", class: "problem-count" }));
    tab.addEventListener("click", () => showView(view.id));
    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showViewMenu(e.clientX, e.clientY, view.id, t);
    });
    tab.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(VIEW_TYPE, view.id);
      e.dataTransfer.effectAllowed = "move";
    });
    // A drop on a tab puts the dragged view in front of it.
    tab.addEventListener("dragover", (e) => {
      if (!hasView(e)) return;
      e.preventDefault();
      tab.classList.add("drop-target");
    });
    tab.addEventListener("dragleave", () => tab.classList.remove("drop-target"));
    tab.addEventListener("drop", (e) => {
      const id = viewFrom(e);
      if (!id) return;
      e.preventDefault();
      e.stopPropagation(); // the strip would otherwise also move the view to its end
      tab.classList.remove("drop-target");
      moveView(id, tab.closest(".region-strip").dataset.region, tab);
    });
    const pane = el("div", { id: `panel-${view.id}`, class: "panel-body view-pane", role: "tabpanel", "aria-labelledby": `tab-${view.id}`, hidden: true });
    view.render?.(pane, t);
    viewNodes.set(view.id, { tab, pane, region: view.region, order: view.order ?? 100 });
  }
}

// Where each view is: the saved place when there is one, else its registered region.
function placeViews() {
  const saved = loadViewState();
  const placed = new Set();
  for (const region of REGIONS) {
    const ids = (saved.order?.[region] ?? []).filter((id) => viewNodes.has(id) && !placed.has(id));
    for (const id of ids) {
      placed.add(id);
      putView(id, region, null);
    }
  }
  const rest = [...viewNodes.values()].filter((n, i) => !placed.has([...viewNodes.keys()][i]))
    .sort((a, b) => a.order - b.order);
  for (const n of rest) {
    const id = [...viewNodes].find(([, v]) => v === n)[0];
    putView(id, n.region, null);
  }
  for (const region of REGIONS) {
    const active = saved.active?.[region];
    if (active && viewNodes.has(active)) showView(active, { remember: false });
    else showFirstIn(region);
  }
  updateRegions();
}

// Put a view's tab and pane in a region, before the tab `before` (or at the end).
function putView(id, region, before) {
  const n = viewNodes.get(id);
  if (!n) return;
  const strip = document.querySelector(`.region-strip[data-region="${region}"]`);
  const body = document.querySelector(`[data-region="${region}"] .region-body`);
  if (!strip || !body) return;
  if (before && before !== n.tab) strip.insertBefore(n.tab, before);
  else if (!before) strip.append(n.tab);
  body.append(n.pane);
  n.region = region;
}

// Right-click a view's tab: "Move to" lists the panels the view is not in now.
let viewMenu = null;
function showViewMenu(x, y, id, t) {
  viewMenu?.remove();
  const current = viewNodes.get(id)?.region;
  const menu = el("div", { class: "tab-menu", role: "menu" });
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.append(el("div", { class: "tab-menu-head" }, t("moveTo")));
  const labels = { primary: t("togglePrimary"), secondary: t("toggleSecondary"), panel: t("panel") };
  const close = () => {
    menu.remove();
    viewMenu = null;
    document.removeEventListener("pointerdown", dismiss, true);
    document.removeEventListener("keydown", onKey, true);
  };
  for (const region of REGIONS) {
    if (region === current) continue;
    const item = el("button", { type: "button", role: "menuitem" }, labels[region]);
    item.addEventListener("click", () => {
      close();
      moveView(id, region, null);
    });
    menu.append(item);
  }
  const dismiss = (e) => { if (!menu.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.body.append(menu);
  viewMenu = menu;
  document.addEventListener("pointerdown", dismiss, true);
  document.addEventListener("keydown", onKey, true);
  menu.querySelector("button")?.focus();
}

// Move a view to a region, before a tab, and show it there.
function moveView(id, region, beforeTab) {
  if (!viewNodes.has(id)) return;
  putView(id, region, beforeTab);
  updateRegions();
  saveViewState();
  showView(id);
}

function showFirstIn(region) {
  const first = [...document.querySelectorAll(`.region-strip[data-region="${region}"] > .region-tab`)][0];
  if (first) showView(first.dataset.view, { remember: false });
}

// A region with no views is hidden; the others show.
function updateRegions() {
  for (const region of REGIONS) {
    const node = document.querySelector(`[data-region="${region}"]`);
    const count = document.querySelectorAll(`.region-strip[data-region="${region}"] > .region-tab`).length;
    if (node) node.hidden = count === 0;
    syncRegion(region);
  }
}

// Each region's state (states.js, "region"): derived from its view count and its toggle.
const regionMachines = Object.fromEntries(REGIONS.map((r) => [r, createMachine("region", MACHINES.region)]));
function syncRegion(region) {
  const count = document.querySelectorAll(`.region-strip[data-region="${region}"] > .region-tab`).length;
  regionMachines[region].setDerived(deriveRegion({ count, visible: regionVisible(region) }));
}
export function regionState(region) {
  return regionMachines[region]?.state;
}

// The views the View menu lists, in their order.
export function menuViews() {
  return [...registry.views.values()].filter((v) => v.menu).sort(byOrder);
}

// Show one view: its tab is selected, its pane shown, and its region made visible.
export function showView(id, { remember = true } = {}) {
  const n = viewNodes.get(id);
  if (!n) return;
  const region = n.region;
  // Showing a view shows its region through the region's toggle, so the menus stay right.
  if (hasToggle(region)) setToggle(region, true);
  else setRegionVisible(region, true);
  for (const tab of document.querySelectorAll(`.region-strip[data-region="${region}"] > .region-tab`)) {
    tab.setAttribute("aria-selected", String(tab === n.tab));
  }
  for (const pane of document.querySelectorAll(`[data-region="${region}"] .region-body > .view-pane`)) {
    pane.hidden = pane !== n.pane;
  }
  if (remember) saveViewState();
  updateMobileNav();
}

// The views' places and the selected view of each region, kept in the browser.
function saveViewState() {
  const order = {};
  const active = {};
  for (const region of REGIONS) {
    order[region] = [...document.querySelectorAll(`.region-strip[data-region="${region}"] > .region-tab`)]
      .map((tab) => tab.dataset.view);
    const selected = document.querySelector(`.region-strip[data-region="${region}"] > .region-tab[aria-selected="true"]`);
    if (selected) active[region] = selected.dataset.view;
  }
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify({ order, active }));
  } catch {
    // The places are kept for this visit only.
  }
}

function loadViewState() {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

// The bottom panel's tabs were showPanel's; a view is shown the same way.
export const showPanel = (id) => showView(id);

// Show or hide a whole region (a sidebar, the bottom panel) by its id, at run time.
export function setRegionVisible(region, visible) {
  const ide = document.querySelector(".ide");
  ide?.classList.toggle(`hide-${region}`, !visible);
  if (regionMachines[region]) syncRegion(region);
  // A sheet (phone layout) is open while any of the three regions is shown; the scrim follows it.
  ide?.classList.toggle("sheet-open", REGIONS.some((r) => regionVisible(r)));
  updateMobileNav();
}

export function regionVisible(region) {
  return !document.querySelector(".ide")?.classList.contains(`hide-${region}`);
}

// Re-evaluate each menu item's `enabled()` (for example Close tab needs more than one open file).
export function refreshMenus() {
  // A toggle's menu item shows a dot while the toggle is on.
  for (const button of document.querySelectorAll("[data-toggle]")) {
    button.setAttribute("aria-checked", String(isOn(button.dataset.toggle)));
  }
  const all = [
    ...[...registry.menus.values()].flatMap((m) => (typeof m.items === "function" ? [] : m.items)),
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

// ---- The phone's navigation bar (under 720 px) ---------------------------------------------------
// On a phone the views have no activity bar or menu buttons in reach, so a bar at the bottom holds the
// editor and the views: each button shows its view (as a sheet), and "Editor" closes the sheets.
const phoneQuery = matchMedia("(max-width: 719px)");
const EDITOR_NAV_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>';

// Close every sheet (phone only): the editor is then in full view.
export function closeSheets() {
  if (!phoneQuery.matches) return;
  for (const region of REGIONS) {
    if (hasToggle(region)) setToggle(region, false);
    else setRegionVisible(region, false);
  }
}

function renderMobileNav(t) {
  const nav = el("nav", { class: "mobile-nav", id: "mobile-nav", "aria-label": t("editor") });
  const editorBtn = el("button", { type: "button", class: "mobile-nav-btn", "data-mobile": "editor", "aria-label": t("editor") });
  editorBtn.innerHTML = EDITOR_NAV_ICON;
  editorBtn.append(el("span", { class: "mobile-nav-text" }, t("editor")));
  editorBtn.addEventListener("click", () => closeSheets());
  nav.append(editorBtn);
  for (const id of ["files", "board", "output", "problems"]) {
    const view = registry.views.get(id);
    if (!view) continue;
    const button = el("button", { type: "button", class: "mobile-nav-btn", "data-mobile": id, "aria-label": t(view.title) });
    button.innerHTML = view.icon ?? "";
    button.append(el("span", { class: "mobile-nav-text" }, t(view.title)));
    button.addEventListener("click", () => showView(id));
    nav.append(button);
  }
  document.querySelector(".ide")?.append(nav);
  updateMobileNav();
}

// A view's button is marked while its view is the one shown in a visible region; "Editor" while none is.
function updateMobileNav() {
  const nav = document.getElementById("mobile-nav");
  if (!nav) return;
  let anyShown = false;
  for (const button of nav.querySelectorAll("[data-mobile]")) {
    const id = button.dataset.mobile;
    const n = viewNodes.get(id);
    const shown = !!n && regionVisible(n.region) && n.tab.getAttribute("aria-selected") === "true";
    if (shown) anyShown = true;
    button.setAttribute("aria-current", String(shown));
  }
  nav.querySelector('[data-mobile="editor"]')?.setAttribute("aria-current", String(!anyShown));
}
