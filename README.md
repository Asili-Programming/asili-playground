# Asili IDE

A small browser-based playground that runs Asili source entirely client-side, using the
`asili-wasm` (`wasm-browser` feature) build of [driver/wasm](https://github.com/Asili-Programming/Asili/tree/develop/driver/wasm) in
[Asili](https://github.com/Asili-Programming/Asili), edited in a
[CodeMirror 6](https://codemirror.net/) editor. Its
`pata.toml`/`src/kuu.as` isn't the thing being demonstrated — it's a static file server (see
below) that *hosts* the static assets (`index.html`, `main.js`, the wasm build, the sample
programs), which is what actually runs the Asili source typed into the editor. No code is sent
to a remote server; everything executes in your browser.

## Hosted

The IDE runs on the Asili website at **https://asili-programming.github.io/ide/**.
The site builds it from this repository and the wasm build of Asili's `main` on every push to the
site's `main`, on a weekly schedule, and when this repository's `main` changes (the `notify-site`
job in `.github/workflows/ci.yml` sends the signal). It accepts `?lugha=sw` or `?lugha=en` for the
interface language.

## Build & run

Two routes: the hosted page needs nothing; to run it yourself, build the wasm package and serve
these files, either with any static server or with Asili itself.

The wasm package is built from an [Asili](https://github.com/Asili-Programming/Asili) checkout, by default a sibling clone
(`../Asili`; set `ASILI_DIR` to use another):

```bash
# 0. Get Asili (once) — it also provides `pata` for step 2
git clone https://github.com/Asili-Programming/Asili ../Asili

# 1. Build the wasm package (needs wasm-pack: `cargo install wasm-pack`)
./build.sh

# 2a. Serve this directory with Asili itself
pata jenga --tenda

# 2b. ...or with any static server, e.g.
python3 -m http.server 8080

# 3. Open http://127.0.0.1:8080/
```

`build.sh` runs:

```bash
wasm-pack build "$ASILI_DIR/driver/wasm" --target web --out-dir pkg --no-typescript \
  -- --no-default-features --features wasm-browser
```

which produces `pkg/asili_wasm.js` + `pkg/asili_wasm_bg.wasm`, then base64-encodes the `.wasm`
into `pkg/asili_wasm_bg.wasm.b64` (for Asili's own server; see below). `pkg/` is gitignored.

`pata.toml` + `src/kuu.as` make this directory itself a small Asili project: a static file
server built on the same `mkondo_tumikia_http` framing layer as
[examples/http_server](https://github.com/Asili-Programming/Asili/tree/develop/examples/http_server), so the playground can be self-hosted by the
language it's demonstrating. `pata jenga --tenda` builds and runs it, listening on
`127.0.0.1:8080`.

### Serving the wasm binary

A normal web server sends `pkg/asili_wasm_bg.wasm` as it is. Asili's `soma_faili` (file read)
only handles valid-UTF-8 text, so `src/kuu.as` cannot serve the binary. `worker.js` tries the
binary first and falls back to the base64 text copy, so both kinds of server work without
configuration.

### Editor dependencies

`vendor/codemirror.js` is one committed ES module with CodeMirror 6, so the page loads nothing
from a third-party server. Regenerate it only when a pinned version changes:

```bash
cd vendor-src && npm ci && npm run build
```

The versions are pinned in `vendor-src/package.json`. Commit the regenerated `vendor/codemirror.js`.

## What it does

- `index.html` / `style.css` / `favicon.svg` — the page: editor pane, output pane, notices.
- `main.js` — the page. Chooses the interface language (`?lugha=`), wires up the CodeMirror 6
  editor from `vendor/codemirror.js`, and sends each program to the worker. Shows the states:
  loading, ready, running, stopped, engine failed to load (with a retry), and unsupported browser.
- `worker.js` — the engine. Loads the wasm build once and runs programs in a Web Worker, so a
  long run never freezes the page. **Stop** terminates the worker, which ends the run; the next
  run starts a fresh worker. Programs run as native code: the build compiles each one to a wasm
  module of its own (Asili's `nguvu` backend), which `worker.js`'s `asili_nguvu_load` instantiates
  beside the build. Output is sent back with `console.log`/`console.error` messages, which is what
  `driver/wasm`'s `wasm-browser` I/O shim writes to (see
  [core/evaluator/src/platform.rs](https://github.com/Asili-Programming/Asili/blob/develop/core/evaluator/src/platform.rs)).
- `samples/` — short, self-contained `.as` programs shown in the sample picker. Each declares its
  label in its first lines (`# sw: <label>`, and optionally `# en: <label>` for `?lugha=en`).
  `samples/manifest.json` is generated from those files: after adding or relabelling a sample, run
  `python3 scripts/gen_samples.py` and commit the result. CI fails if it is stale.
  A sample that drives the virtual board also scripts its pin levels with `# in: <saa> <pini>
  <0|1>` lines (clock in milliseconds); the page sends them with the run.
- The **virtual board** (Bodi pepe) panel shows the pins, the clock and the event list of a run.
  The engine reports each pin write, pin read and clock step as an event: a tagged console line
  (`\u0001ASILI-EVT <json>`, from `core/evaluator/src/platform.rs`), which `worker.js` passes to the
  page as a `tukio` message. The events come from Asili's `ubao` builtins (`ubao_andika`,
  `ubao_soma`, `ubao_subiri`, `ubao_saa`); pin calls need `#[wazi]`.
- The editor uses a minimal `StreamLanguage` syntax-highlighting mode for Asili (keywords/types/
  strings/comments), not a real parser. Its keyword and type lists (between `const KEYWORDS` and
  `// </generated>` in `main.js`) are generated from Asili's compiler; CI checks them against
  Asili's `develop`. To regenerate, from the Asili checkout:
  `ASILI_PLAYGROUND_DIR=<this repo> ASILI_GOLDEN=write cargo test -p pata-core --test editor_word_lists`.
- Interface strings for both languages are in one table at the top of `main.js` (`STRINGS`).

## Limitations / Baadaye (next steps)

- **Single module only.** `run(source)` maps to `asili_wasm::run_source`, which tokenizes,
  parses, and runs one module — no cross-file `leta` resolution (that's what `run_bundle`/
  `runBundle` is for; wiring up a multi-file editor is a possible follow-up).
- **No `pata` tooling in the browser yet** — no diagnostics-as-you-type, hover, formatting, or
  lint. `pata-lsp` (Mwalimu) is built on `tower-lsp` + `tokio` over stdio, which doesn't target
  `wasm32-unknown-unknown` as-is. Bringing in diagnostics/hover/format would mean exposing
  `pata-lsp`'s underlying logic (or a subset of it) as plain synchronous `wasm-bindgen` functions
  the editor calls directly — not a real LSP/JSON-RPC session. Left out of this first pass by
  request; revisit if/when it's wanted.
