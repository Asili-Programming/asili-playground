# Asili Playground

A small browser-based playground that runs Asili source entirely client-side, using the
`asili-wasm` (`wasm-browser` feature) build of [driver/wasm](https://github.com/Asili-Programming/Asili/tree/develop/driver/wasm) in
[Asili](https://github.com/Asili-Programming/Asili), edited in a
[CodeMirror 6](https://codemirror.net/) editor. Its
`pata.toml`/`src/kuu.as` isn't the thing being demonstrated — it's a static file server (see
below) that *hosts* the static assets (`index.html`, `main.js`, the wasm build, the sample
programs), which is what actually runs the Asili source typed into the editor. No code is sent
to a remote server; everything executes in your browser.

## Build & run

The wasm package is built from an [Asili](https://github.com/Asili-Programming/Asili) checkout, by default a sibling clone
(`../Asili`; set `ASILI_DIR` to use another):

```bash
# 0. Get Asili (once) — it also provides `pata` for step 2
git clone https://github.com/Asili-Programming/Asili ../Asili

# 1. Build the wasm package (needs wasm-pack: `cargo install wasm-pack`)
./build.sh

# 2. Serve this directory with Asili itself
pata jenga --tenda

# 3. Open http://127.0.0.1:8080/
```

`build.sh` runs:

```bash
wasm-pack build "$ASILI_DIR/driver/wasm" --target web --out-dir pkg --no-typescript \
  -- --no-default-features --features wasm-browser
```

which produces `pkg/asili_wasm.js` + `pkg/asili_wasm_bg.wasm`, then base64-encodes the `.wasm`
into `pkg/asili_wasm_bg.wasm.b64` (see "Serving the wasm binary" below for why). `pkg/` is
gitignored — build it locally, it isn't checked in.

`pata.toml` + `src/kuu.as` make this directory itself a small Asili project: a static file
server built on the same `mkondo_tumikia_http` framing layer as
[examples/http_server](https://github.com/Asili-Programming/Asili/tree/develop/examples/http_server), so the playground can be self-hosted by the
language it's demonstrating. `pata jenga --tenda` builds and runs it, listening on
`127.0.0.1:8080`.

### Serving the wasm binary

Asili's `soma_faili` (file read) only handles valid-UTF-8 text — there's no raw-bytes file API
in the standard library yet — so `src/kuu.as` can't serve the `.wasm` binary directly. `build.sh`
works around this by base64-encoding it to `pkg/asili_wasm_bg.wasm.b64` at build time; `main.js`
fetches that text file, decodes it back to bytes with `atob`, and passes the bytes straight to
the wasm-bindgen `init()` glue.

## What it does

- `pata.toml` / `src/kuu.as` — a static file server (`mkondo_tumikia_http`, same pattern as
  [examples/http_server](https://github.com/Asili-Programming/Asili/tree/develop/examples/http_server)) that serves the files below. Run it with
  `pata jenga --tenda`.
- `index.html` / `style.css` — page layout (editor pane + output pane).
- `main.js` — loads the wasm package, wires up CodeMirror 6 (via `esm.sh`, no npm/bundler step),
  and calls the wasm build's exported `run(source)` on click (or Ctrl/Cmd+Enter). `run`
  compiles the program to bytecode and then to a wasm module of its own (Asili's `nguvu`
  backend), which `main.js`'s `asili_nguvu_load` instantiates beside the build — so programs
  run as native wasm code, not interpreted. Output is
  captured by temporarily wrapping `console.log`/`console.error`, which is what `driver/wasm`'s
  `wasm-browser` I/O shim writes to (see
  [core/evaluator/src/platform.rs](https://github.com/Asili-Programming/Asili/blob/develop/core/evaluator/src/platform.rs)).
- `samples/` — a few short, self-contained `.as` programs (listed in `samples/manifest.json`)
  shown in the sample picker.
- The editor uses a minimal `StreamLanguage` syntax-highlighting mode for Asili (keywords/types/
  strings/comments) — not a real parser, just enough for readability. Its keyword and type lists
  (between `const KEYWORDS` and `// </generated>` in `main.js`) are generated from Asili's
  compiler; CI checks them against Asili's `develop`. To regenerate, from the Asili checkout:
  `ASILI_PLAYGROUND_DIR=<this repo> ASILI_GOLDEN=write cargo test -p pata-core --test editor_word_lists`.

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
