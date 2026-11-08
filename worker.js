// The Asili engine, in a Web Worker: loads the wasm build once, then runs each program sent to it.
// Output goes back to the page as messages, so the page stays responsive while a program runs.

// Programs run as native code: the build compiles each one to a small wasm module of its own
// (core/evaluator/src/nguvu/wasm.rs) and asks this worker to instantiate it against the build's
// memory and function table, in table slots grown for it.
globalThis.asili_nguvu_load = (bytes, count, memory, table) => {
  const base = table.grow(count);
  new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { memory, table, base } });
  return base;
};

// The wasm build writes program output through console.log / console.error
// (core/evaluator/src/platform.rs, wasm-browser shim). Send it to the page instead.
const send = (m) => postMessage(m);
const format = (args) => args.map(String).join(" ");
console.log = (...args) => send({ type: "out", text: format(args), err: false });
console.error = (...args) => send({ type: "out", text: format(args), err: true });

// The engine's bytes. A normal web server sends the binary file (pkg/asili_wasm_bg.wasm). Asili's
// own static server in src/kuu.as only serves UTF-8 text (no raw-bytes file API yet), so there the
// binary request fails and the base64 text copy (pkg/asili_wasm_bg.wasm.b64, from build.sh) is used.
async function engineBytes() {
  const binRes = await fetch(new URL("./pkg/asili_wasm_bg.wasm", import.meta.url));
  const type = binRes.headers.get("content-type") || "";
  if (binRes.ok && !type.includes("text/html")) {
    return new Uint8Array(await binRes.arrayBuffer());
  }
  const res = await fetch(new URL("./pkg/asili_wasm_bg.wasm.b64", import.meta.url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const binary = atob((await res.text()).trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function loadEngine() {
  const bytes = await engineBytes();
  const glue = await import("./pkg/asili_wasm.js");
  await glue.default({ module_or_path: bytes });
  return glue.run;
}

const engine = loadEngine().then(
  (run) => { send({ type: "ready" }); return run; },
  (e) => { send({ type: "loadfail", message: String(e && e.message ? e.message : e) }); throw e; },
);
engine.catch(() => {});

self.addEventListener("message", async (e) => {
  if (e.data.type !== "run") return;
  let run;
  try {
    run = await engine;
  } catch {
    return;
  }
  try {
    run(e.data.source);
    send({ type: "done" });
  } catch (err) {
    send({ type: "error", message: String(err && err.message ? err.message : err) });
  }
});
