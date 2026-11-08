// The playground's service worker: it makes the page installable and lets it open offline.
//
// Network first: a page, script, style or wasm file is fetched from the network when there is one (so a
// new build is seen at once), and each fetched copy is kept. Offline, the kept copy is used; a page that
// was never kept falls back to the start page. The files in PRECACHE are kept when the worker installs,
// so the first offline visit works too. Every file listed there must be served by the site (see
// scripts/copy_playground.sh in the website repository).

const CACHE = "asili-playground-v2";
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "main.js",
  "layout.js",
  "commands.js",
  "settings.js",
  "states.js",
  "project.js",
  "icons.js",
  "icons/material/theme.json",
  "product-icons/material-icons.woff",
  "product-icons/product-icons.json",
  "session.js",
  "share.js",
  "worker.js",
  "vendor/codemirror.js",
  "pkg/asili_wasm.js",
  "pkg/asili_wasm_bg.wasm",
  "samples/manifest.json",
  "samples/karibu.as",
  "samples/makosa.as",
  "samples/sifa.as",
  "samples/ubao.as",
  "favicon.svg",
  "logo-mark.svg",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One file that cannot be fetched must not stop the rest from being kept.
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("asili-playground-") && n !== CACHE)
        .map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only this site's GET requests: other origins and posts are left to the browser.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) =>
          hit ?? (request.mode === "navigate" ? caches.match("index.html") : Response.error()),
        ),
      ),
  );
});
