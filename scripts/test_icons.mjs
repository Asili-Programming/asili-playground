// The icon lookups (icons.js) under Node, on the data in icons/material and product-icons.
//   node scripts/test_icons.mjs
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as I from "../icons.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const theme = JSON.parse(readFileSync(join(root, "icons/material/theme.json"), "utf8"));
const product = JSON.parse(readFileSync(join(root, "product-icons/product-icons.json"), "utf8"));

// Without a theme, the page keeps its own icons.
assert.equal(I.fileIconSrc("kuu.as"), null);
assert.equal(I.productGlyph("files"), null);
assert.equal(I.iconThemeLoaded(), false);

I.setIconTheme(theme);
I.setProductIcons(product);
assert.equal(I.iconThemeLoaded(), true);

// Every icon the theme names is on disk, and every product glyph is one character from the font's range.
for (const [name, file] of Object.entries(theme.iconDefinitions)) {
  assert.ok(existsSync(join(root, "icons/material", file)), `${name}: ${file} exists`);
}
for (const [name, hex] of Object.entries(product.glyphs)) {
  assert.match(hex, /^[0-9A-F]{4,5}$/i, `${name}: a code point`);
}

// A file: its exact name, then its longest extension, then the default.
const icon = (name) => I.fileIconSrc(name);
assert.equal(icon("README.md"), "icons/material/readme.svg", "an exact file name wins: README has its own icon");
assert.equal(icon("notes.md"), `icons/material/${theme.iconDefinitions[theme.fileExtensions.md]}`, "a .md file takes the markdown icon");
assert.notEqual(icon("README.md"), icon("notes.txt"), "a text file is not a markdown file");
assert.notEqual(icon("data.json"), icon("data.zzz"), "a known extension has its own icon");
assert.equal(icon("data.zzz"), `icons/material/${theme.iconDefinitions[theme.file]}`, "an unknown file gets the default");
assert.equal(icon("Dockerfile"), icon("dockerfile"), "names are matched without case");
assert.equal(icon("a.d.ts"), icon("b.d.ts"), "the longest extension is tried first");
assert.equal(icon("constructor"), icon("zzz"), "an inherited name is not an icon");
assert.equal(icon("lib/picha.png"), icon("picha.png"), "a path is judged by its last part");

assert.equal(icon("kuu.as"), "icons/material/asili.svg", "an Asili program has the Asili icon");

// A folder: its name, closed or open; an unknown folder gets the default folder icons.
assert.notEqual(I.folderIconSrc("src", false), I.folderIconSrc("zzz", false), "a known folder has its own icon");
assert.equal(I.folderIconSrc("zzz", false), `icons/material/${theme.iconDefinitions[theme.folder]}`);
assert.equal(I.folderIconSrc("zzz", true), `icons/material/${theme.iconDefinitions[theme.folderExpanded]}`);
assert.equal(I.folderIconSrc("constructor", false), I.folderIconSrc("zzz", false));

// The workspace's root folder has its own icon, closed or open.
assert.equal(I.rootFolderIconSrc(false), `icons/material/${theme.iconDefinitions[theme.rootFolder]}`);
assert.equal(I.rootFolderIconSrc(true), `icons/material/${theme.iconDefinitions[theme.rootFolderExpanded]}`);

// Product icons: the interface's names resolve to glyphs; an unknown name has none.
assert.equal(typeof I.productGlyph("files"), "string");
assert.equal([...I.productGlyph("files")].length, 1, "one character");
assert.equal(I.productGlyph("no-such-icon"), null);
assert.equal(I.productGlyph("constructor"), null);

console.log("icons: file, folder and product lookups check out on the bundled data");
