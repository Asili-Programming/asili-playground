#!/usr/bin/env bash
# Builds the asili-wasm (wasm-browser) package used by main.js, from an Asili checkout named by
# ASILI_DIR (default: ../Asili, a sibling clone of https://github.com/Asili-Programming/Asili).
# Run from anywhere; writes output into pkg/ (gitignored).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="${ASILI_DIR:-$script_dir/../Asili}"
[ -f "$repo_root/driver/wasm/Cargo.toml" ] || {
  echo "Nakala ya Asili haipatikani katika $repo_root. Ipakue kwa:" >&2
  echo "  git clone https://github.com/Asili-Programming/Asili \"$repo_root\"" >&2
  echo "au weka ASILI_DIR." >&2
  exit 1
}

command -v wasm-pack >/dev/null 2>&1 || {
  echo "wasm-pack haipatikani. Sakinisha kwa: cargo install wasm-pack" >&2
  exit 1
}

# Size over speed for the browser build: the engine is downloaded on every first visit, and the
# generated programs run as native wasm in the browser, so the host's optimisation level only
# affects how fast the compiler itself runs. Measured on the first build: engine 943,709 bytes
# (gzip) with the default release profile, 786,403 bytes with these settings.
export CARGO_PROFILE_RELEASE_OPT_LEVEL=s
export CARGO_PROFILE_RELEASE_LTO=fat
export CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1
export CARGO_PROFILE_RELEASE_PANIC=abort

wasm-pack build "$repo_root/driver/wasm" \
  --target web \
  --out-dir "$script_dir/pkg" \
  --no-typescript \
  -- --no-default-features --features wasm-browser

# main.js fetches the wasm module as base64 text (not the raw .wasm binary) so it can be served
# by the Asili static server in src/kuu.as, whose soma_faili only reads valid-UTF-8 text files.
base64 -w0 "$script_dir/pkg/asili_wasm_bg.wasm" > "$script_dir/pkg/asili_wasm_bg.wasm.b64"

echo
echo "Imekamilika. Anza seva (mkondo_tumikia_http, ona src/kuu.as):"
echo "  cd \"$script_dir\" && pata jenga --tenda"
echo
echo "kisha fungua http://127.0.0.1:8080/"
