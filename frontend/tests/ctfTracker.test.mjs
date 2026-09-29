import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Load the real TypeScript modules without changing app imports or adding a runner.
async function moduleUrl(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } });
  for (const [specifier, url] of Object.entries(dependencies)) outputText = outputText.replaceAll(`"${specifier}"`, JSON.stringify(url));
  for (const match of [...outputText.matchAll(/from "(\.[^"]+)"/g)]) {
    const dependency = new URL(`${match[1]}.ts`, new URL(path, import.meta.url));
    outputText = outputText.replaceAll(`"${match[1]}"`, JSON.stringify(await moduleUrl(dependency)));
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const courseApiUrl = await moduleUrl("../src/services/courseApi.ts");
const api = await import(await moduleUrl("../src/services/ctfApi.ts", { "./courseApi": courseApiUrl }));
const { filterChallenges, summarizeChallenges, challengeLink } = await import(await moduleUrl("../src/utils/ctfTracker.ts"));
const wire = { id: 10, title: "Web Gauntlet", platform: "picoCTF", category: "Web Exploitation", difficulty: "Easy", status: "Not Started", points: 100,
  flag_captured: false, hints_used: 0, notes: null, challenge_url: "https://example.com/challenge", started_at: null, completed_at: null,
  created_at: "2026-09-22T10:00:00Z", updated_at: "2026-09-22T10:00:00Z" };
const challenge = { id: 10, title: "Web Gauntlet", platform: "picoCTF", category: "Web Exploitation", difficulty: "Easy", status: "Not Started", points: 100,
  flagCaptured: false, hintsUsed: 0, notes: null, challengeUrl: "https://example.com/challenge", startedAt: null, completedAt: null,
  createdAt: wire.created_at, updatedAt: wire.updated_at };
const data = [challenge,
  { ...challenge, id: 11, title: "Cipher", platform: "Other", category: "Cryptography", difficulty: "Hard", status: "Completed", points: 200, notes: "Caesar rotation", flagCaptured: false },
  { ...challenge, id: 12, title: "Forms", status: "Completed", points: 50, flagCaptured: true },
  { ...challenge, id: 13, title: "Cookies", status: "In Progress", points: 900, flagCaptured: true },
  { ...challenge, id: 14, title: "Headers", status: "Completed", points: 75, flagCaptured: true },
];
const allFilters = { search: "", platform: "", category: "", status: "", difficulty: "" };

test("summary counts completed points and independent captured flags across all data", () => {
  assert.deepEqual(summarizeChallenges(data), { total: 5, completed: 3, captured: 3, points: 325, percentage: 60,
    categories: [{ category: "Web Exploitation", count: 2 }, { category: "Cryptography", count: 1 }] });
  assert.deepEqual(summarizeChallenges([]), { total: 0, completed: 0, captured: 0, points: 0, percentage: 0, categories: [] });
});

test("search covers title, platform, category, notes and tolerates null notes", () => {
  for (const [search, expected] of [["  GAUNTLET ", [10]], ["other", [11]], ["cryptography", [11]], ["rotation", [11]], ["missing", []]]) {
    assert.deepEqual(filterChallenges(data, { ...allFilters, search }).map((item) => item.id), expected);
  }
});

test("filters combine and results sort by updated time then descending id without mutation", () => {
  const before = structuredClone(data);
  assert.deepEqual(filterChallenges(data, { ...allFilters, platform: "picoCTF", category: "Web Exploitation", status: "Completed", difficulty: "Easy" }).map((item) => item.id), [14, 12]);
  assert.deepEqual(filterChallenges(data, { ...allFilters, difficulty: "Hard" }).map((item) => item.id), [11]);
  assert.deepEqual(filterChallenges([{ ...challenge, updatedAt: "2026-09-23T10:00:00Z" }, data[1]], allFilters).map((item) => item.id), [10, 11]);
  assert.deepEqual(data, before);
});

test("challenge links allow only complete HTTP(S) URLs", () => {
  for (const value of [null, "", "   ", "javascript:alert(1)", "data:text/html,test", "file:///test", "/relative", "example.com"]) assert.equal(challengeLink(value), null);
  assert.equal(challengeLink(" https://example.com/task "), "https://example.com/task");
  assert.equal(challengeLink("http://example.com"), "http://example.com/");
});

test("GET list and detail map all backend fields and forward AbortSignal", async (t) => {
  const controller = new AbortController();
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, options }); return Response.json(url.endsWith("/10") ? wire : [wire]); });
  assert.deepEqual(await api.getChallenges(controller.signal), [challenge]);
  assert.deepEqual(await api.getChallenge(10, controller.signal), challenge);
  assert.match(calls[0].url, /\/api\/ctf$/);
  assert.match(calls[1].url, /\/api\/ctf\/10$/);
  controller.abort();
  assert.equal(calls[0].options.signal.aborted, true);
  assert.equal(calls[1].options.signal.aborted, true);
});

test("POST maps editable fields, omits timestamps and returns the server record", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => { request = { url, ...options }; return Response.json({ ...wire, id: 42, flag_captured: true, hints_used: 2 }, { status: 201 }); });
  const result = await api.createChallenge({ ...challenge, flagCaptured: true, hintsUsed: 2, flag: "must-not-be-sent" });
  assert.equal(request.method, "POST");
  assert.equal(request.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.body), { title: "Web Gauntlet", platform: "picoCTF", category: "Web Exploitation", difficulty: "Easy", status: "Not Started", points: 100,
    flag_captured: true, hints_used: 2, notes: null, challenge_url: "https://example.com/challenge" });
  assert.equal(result.id, 42);
  assert.equal(result.flagCaptured, true);
  assert.equal(result.hintsUsed, 2);
});

test("PATCH is partial and accepts authoritative lifecycle timestamps", async (t) => {
  const bodies = [];
  const completed = "2026-09-22T12:00:00Z";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/api\/ctf\/10$/); assert.equal(options.method, "PATCH"); bodies.push(JSON.parse(options.body));
    return Response.json({ ...wire, status: "Completed", completed_at: completed, updated_at: completed });
  });
  const result = await api.updateChallenge(10, { status: "Completed" });
  assert.deepEqual(bodies[0], { status: "Completed" });
  assert.equal(result.completedAt, completed); assert.equal(result.updatedAt, completed); assert.equal(result.flagCaptured, false);
  await api.updateChallenge(10, { notes: null, challengeUrl: null, flagCaptured: false, hintsUsed: 0 });
  assert.deepEqual(bodies[1], { notes: null, challenge_url: null, flag_captured: false, hints_used: 0 });
});

test("API errors and network failures reject instead of returning invented saved data", async (t) => {
  for (const status of [404, 422, 500]) {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json({}, { status }));
    await assert.rejects(api.updateChallenge(10, { status: "Completed" }), /not found|Check the challenge fields|Unable to save or load/);
    mock.mock.restore();
  }
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(api.getChallenges(), /Failed to fetch/);
});

test("optional live API read verifies existing challenges without modifying them", { skip: process.env.CTF_LIVE_API !== "1" }, async () => {
  const records = await api.getChallenges();
  assert.ok(Array.isArray(records));
  for (const record of records) {
    assert.equal(typeof record.flagCaptured, "boolean");
    assert.equal(typeof record.hintsUsed, "number");
    assert.ok(Number.isFinite(Date.parse(record.updatedAt)));
  }
  if (records.length) assert.deepEqual(await api.getChallenge(records[0].id), records[0]);
});
