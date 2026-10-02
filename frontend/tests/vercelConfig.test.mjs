import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("Vercel proxies API paths to Railway before the SPA fallback", () => {
  assert.deepEqual(config.rewrites[0], {
    source: "/api/:path*",
    destination: "https://cyberstudyos-production.up.railway.app/api/:path*",
  });
  assert.deepEqual(config.rewrites[1], {
    source: "/:path*",
    destination: "/index.html",
  });
});
