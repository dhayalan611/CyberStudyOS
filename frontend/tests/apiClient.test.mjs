import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/services/apiClient.ts", import.meta.url), "utf8");
let loadSequence = 0;
async function load(env = {}) {
  const { outputText } = ts.transpileModule(source.replaceAll("import.meta.env", JSON.stringify(env)), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}#${++loadSequence}`);
}

test("API URL supports configured hosts and a same-origin empty prefix", async () => {
  assert.equal((await load()).API_BASE_URL, "http://127.0.0.1:8000");
  assert.equal((await load({ VITE_API_BASE_URL: " https://example.test/ " })).API_BASE_URL, "https://example.test");
  assert.equal((await load({ VITE_API_BASE_URL: "" })).API_BASE_URL, "");
});

test("local API default follows the browser hostname so SameSite cookies are returned", async () => {
  globalThis.window = { location: { protocol: "http:", hostname: "localhost" } };
  try { assert.equal((await load()).API_BASE_URL, "http://localhost:8000"); }
  finally { delete globalThis.window; }
  globalThis.window = { location: { protocol: "http:", hostname: "127.0.0.1" } };
  try { assert.equal((await load()).API_BASE_URL, "http://127.0.0.1:8000"); }
  finally { delete globalThis.window; }
});

test("caller cancellation reaches fetch without retrying writes", async (t) => {
  const { apiFetch } = await load();
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, "fetch", (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  const pending = apiFetch("/api/tasks", { method: "POST", signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("deadline also covers a stalled response body", async (t) => {
  const { apiFetch } = await load();
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    arrayBuffer: () => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  }));
  // AbortSignal.timeout uses an unreferenced timer in Node.
  const keepAlive = setInterval(() => {}, 100);
  try { await assert.rejects(apiFetch("/api/tasks", {}, 10), /timed out.*check whether your changes were saved/); }
  finally { clearInterval(keepAlive); }
});

test("HTTP validation bodies and status remain available to services", async (t) => {
  const { apiFetch } = await load();
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Invalid interval" }, { status: 422 }));
  const result = await apiFetch("/api/study-sessions");
  assert.equal(result.status, 422);
  assert.deepEqual(await result.json(), { detail: "Invalid interval" });
});

test("all requests include credentials and disable response caching", async (t) => {
  const { apiFetch } = await load();
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json([]));
  await apiFetch('/api/tasks', { credentials: 'omit' });
  assert.equal(mock.mock.calls[0].arguments[1].credentials, 'include');
  assert.equal(mock.mock.calls[0].arguments[1].cache, 'no-store');
});

test("private 401 notifies centrally; auth endpoint 401 never creates a loop", async (t) => {
  const { apiFetch, onUnauthorized } = await load();
  let expired = 0;
  const unsubscribe = onUnauthorized(() => expired++);
  t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 401 }));
  try {
    await apiFetch('/api/auth/me'); await apiFetch('/api/auth/login');
    assert.equal(expired, 0);
    await apiFetch('/api/notes'); assert.equal(expired, 1);
  } finally { unsubscribe(); }
});

test("old-account responses and 401s cannot affect a new session", async (t) => {
  const { apiFetch, invalidateApiSession, onUnauthorized } = await load();
  let finish, expired = 0;
  const unsubscribe = onUnauthorized(() => expired++);
  t.mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  try {
    const pending = apiFetch('/api/courses');
    invalidateApiSession(); finish(Response.json({}, { status: 401 }));
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(expired, 0);
  } finally { unsubscribe(); }
});
