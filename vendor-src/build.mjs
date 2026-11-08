// Bundles entry.js into ../vendor/codemirror.js, one ES module with no imports.
// Run `npm ci && npm run build` here after changing a pinned version, then commit the output.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(here, "entry.js")],
  outfile: path.join(here, "..", "vendor", "codemirror.js"),
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  legalComments: "none",
  banner: { js: "/* Bundled CodeMirror 6 (see vendor-src/package.json). Regenerate with vendor-src/build.mjs. */" },
});
console.log("wrote vendor/codemirror.js");
