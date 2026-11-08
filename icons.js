// Icons as VS Code shows them: file and folder icons from the Material Icon Theme, and interface icons
// from the Material product icon font. The data is in icons/material/theme.json and
// product-icons/product-icons.json (MIT: see the LICENSE files beside them). No DOM here, so
// scripts/test_icons.mjs can check the lookups under Node.
//
// The lookup follows an icon theme's rules: the file name (lower case) first, then the longest
// extension ("x.d.ts" tries "d.ts", then "ts"), then the default file icon. A folder uses its
// expanded icon when it is open. Until a theme is loaded, the lookups return null and the page shows its
// own icons.

let theme = null;
let product = null;

// Install the data (the parsed JSON of the two files above).
export function setIconTheme(data) { theme = data; }
export function setProductIcons(data) { product = data; }
export const iconThemeLoaded = () => theme !== null;
export const productIconsLoaded = () => product !== null;

// A key of an object, when it is the object's own (not "constructor" or another inherited name).
const own = (object, key) => (object && Object.hasOwn(object, key) ? object[key] : undefined);

// The image path of a named icon definition, relative to the page.
function srcOf(definition) {
  const file = own(theme.iconDefinitions, definition);
  return file ? `icons/material/${file}` : null;
}

// The icon for the longest extension that the theme knows: "a.d.ts" -> "d.ts", then "ts".
function extensionIcon(lower) {
  const parts = lower.split(".");
  for (let i = 1; i < parts.length; i += 1) {
    const hit = own(theme.fileExtensions, parts.slice(i).join("."));
    if (hit) return hit;
  }
  return undefined;
}

// The image of a file, by its name; null without a theme.
export function fileIconSrc(name) {
  if (!theme) return null;
  const lower = String(name).split("/").pop().toLowerCase();
  const definition = own(theme.fileNames, lower) ?? extensionIcon(lower) ?? theme.file;
  return srcOf(definition);
}

// The image of a folder, open or closed; null without a theme.
export function folderIconSrc(name, open) {
  if (!theme) return null;
  const lower = String(name).split("/").pop().toLowerCase();
  const definition = (open && own(theme.folderNamesExpanded, lower)) || own(theme.folderNames, lower)
    || (open ? theme.folderExpanded : theme.folder);
  return srcOf(definition);
}

// The image of the workspace's root folder (its name is the workspace's); null without a theme.
export function rootFolderIconSrc(open) {
  if (!theme) return null;
  return srcOf(open ? theme.rootFolderExpanded : theme.rootFolder);
}

// The character of a product icon by its name ("files", "search", ...); null when there is none.
export function productGlyph(name) {
  if (!product) return null;
  const hex = own(product.glyphs, name);
  return hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : null;
}
