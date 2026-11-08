// Round trip for share.js under Node: encode, decode, and refuse what is not a share link.
//   node scripts/test_share.mjs
import assert from "node:assert/strict";
import { encodeShare, decodeShare } from "../share.js";

const files = { "kuu.as": 'kazi kuu(hoja: Orodha<Neno>) -> Tupu {\n  chapisha("Habari")\n}\n' };
const token = await encodeShare(files);
assert.match(token, /^[A-Za-z0-9_-]+$/, "token is base64url");
assert.deepEqual(await decodeShare(token), files, "round trip gives the same files");

const two = { "kuu.as": "leta msaidizi\n", "msaidizi.as": "umma kazi a() {}\n" };
assert.deepEqual(await decodeShare(await encodeShare(two)), two, "several files keep their order");

await assert.rejects(decodeShare("not base64!"), /base64url/);
await assert.rejects(decodeShare("AAAA"), "bytes that are not deflate");

// A payload with the wrong version is refused even though it decompresses.
const wrong = new Response(new Blob([new TextEncoder().encode('{"v":2,"files":{"a":"b"}}')])
  .stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
const wrongToken = Buffer.from(await wrong).toString("base64url");
await assert.rejects(decodeShare(wrongToken), /version 1/);

console.log("share: round trip and refusals ok");
