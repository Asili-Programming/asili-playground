// Share links: a program's files in the URL fragment, `#k=<base64url of deflate of JSON>`, where
// the JSON is {"v": 1, "files": {name: source}}. The first file is the entry. This module has no
// DOM, so scripts/test_share.mjs can check the round trip under Node.

const VERSION = 1;
const MAX_BYTES = 1 << 20; // a link that inflates to more than this is refused

function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error("share: not base64url");
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function through(bytes, stream) {
  const out = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  if (out.byteLength > MAX_BYTES) throw new Error("share: too large");
  return new Uint8Array(out);
}

// files: {name: source}. Returns the token to put after `#k=`.
export async function encodeShare(files) {
  const json = new TextEncoder().encode(JSON.stringify({ v: VERSION, files }));
  return toBase64Url(await through(json, new CompressionStream("deflate-raw")));
}

// Returns {name: source}. Throws if the token is not a version-1 share.
export async function decodeShare(token) {
  const json = new TextDecoder().decode(
    await through(fromBase64Url(token), new DecompressionStream("deflate-raw")),
  );
  const data = JSON.parse(json);
  if (!data || data.v !== VERSION || !data.files || typeof data.files !== "object") {
    throw new Error("share: not a version 1 link");
  }
  const names = Object.keys(data.files);
  if (names.length === 0 || names.some((n) => typeof data.files[n] !== "string")) {
    throw new Error("share: no program in the link");
  }
  return data.files;
}
