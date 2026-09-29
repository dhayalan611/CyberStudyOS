import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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
const api = await import(await moduleUrl("../src/services/studySessionApi.ts", { "./courseApi": await moduleUrl("../src/services/courseApi.ts") }));
const utils = await import(await moduleUrl("../src/utils/studySessions.ts"));
const wire = { id: 1, title: "VLSM", category: "Networking", description: null, status: "Planned", start_time: "2026-09-28T18:00:00+05:30", end_time: "2026-09-28T19:30:00+05:30", created_at: "2026-09-26T12:00:00Z", updated_at: "2026-09-26T12:00:00Z" };

test("list and detail preserve all timestamps and cancellation", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.signal.aborted, false);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(url.endsWith("/1") ? wire : [wire]);
  });
  assert.deepEqual(await api.getStudySessions(controller.signal), [wire]);
  assert.deepEqual(await api.getStudySession(1, controller.signal), wire);
});
test("POST and PATCH send exact fields, explicit null, and return server state", async (t) => {
  const calls = [];
  const saved = { ...wire, status: "Completed", updated_at: "2026-09-27T12:00:00Z" };
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, ...options }); return Response.json(saved); });
  const { id, created_at, updated_at, ...data } = wire;
  assert.deepEqual(await api.createStudySession(data), saved);
  assert.deepEqual(await api.updateStudySession(id, { status: "Completed" }), saved);
  await api.updateStudySession(id, { description: null });
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/api\/study-sessions$/);
  assert.deepEqual(JSON.parse(calls[0].body), data);
  assert.equal(calls[1].method, "PATCH");
  assert.match(calls[1].url, /\/api\/study-sessions\/1$/);
  assert.deepEqual(JSON.parse(calls[1].body), { status: "Completed" });
  assert.deepEqual(JSON.parse(calls[2].body), { description: null });
  assert.ok(created_at && updated_at);
});
test("backend validation detail and missing records produce useful errors", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ detail: [{ loc: ["body", "end_time"], msg: "end_time must be later than start_time" }] }, { status: 422 }));
  await assert.rejects(api.updateStudySession(1, {}), /end_time must be later/);
  mock.mock.restore();
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  await assert.rejects(api.getStudySession(1), /not found/);
});
test("entered calendar time round trips through UTC without changing local fields", () => {
  const stamp = utils.calendarTimestamp("2026-09-28", "18:00");
  const utcResponse = new Date(stamp).toISOString();
  assert.equal(utils.dateKey(utcResponse), "2026-09-28");
  assert.equal(utils.timeInput(utcResponse), "18:00:00");
  assert.throws(() => utils.calendarTimestamp("2026-02-30", "18:00"), /valid calendar/);
  assert.throws(() => utils.calendarTimestamp("2026-09-28", "25:00"), /valid calendar/);
});
test("weeks start Monday, handle Sunday and cross a year boundary", () => {
  assert.equal(utils.dateKey(utils.weekStart(new Date(2027, 0, 3, 15))), "2026-12-28");
  assert.equal(utils.dateKey(utils.weekStart(new Date(2027, 0, 4, 15))), "2027-01-04");
  assert.equal(utils.dateKey(utils.addDays(new Date(2026, 11, 28), 7)), "2027-01-04");
});
test("DST gaps are rejected and calendar weeks retain local midnight", () => {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== "America/New_York") return;
  assert.throws(() => utils.calendarTimestamp("2026-03-08", "02:30"), /valid calendar/);
  const start = utils.weekStart(new Date(2026, 2, 8, 15));
  const end = utils.addDays(start, 7);
  assert.equal(start.getHours(), 0);
  assert.equal(end.getHours(), 0);
  assert.equal((end - start) / 3_600_000, 167);
});
test("weekly time clips intervals at both boundaries and includes all statuses", () => {
  const stamp = utils.calendarTimestamp;
  const sessions = [
    { ...wire, start_time: stamp("2026-09-27", "23:30"), end_time: stamp("2026-09-28", "00:30") },
    { ...wire, status: "Skipped", start_time: stamp("2026-10-04", "23:00"), end_time: stamp("2026-10-05", "01:00") },
    { ...wire, status: "Completed", start_time: stamp("2026-09-29", "18:00"), end_time: stamp("2026-09-29", "19:30") },
  ];
  assert.equal(utils.weeklyMinutes(sessions, new Date(2026, 8, 30)), 180);
  assert.equal(utils.formatDuration(utils.durationMinutes(wire)), "1h 30m");
  assert.equal(utils.formatDuration(60), "1h");
  assert.equal(utils.formatDuration(45), "45m");
  assert.equal(utils.formatDuration(0), "0m");
});
test("upcoming excludes past and non-planned records and orders by instant", () => {
  const records = [
    { ...wire, id: 2, start_time: "2026-09-29T18:00:00Z" }, wire,
    { ...wire, id: 3, status: "Completed" }, { ...wire, id: 4, status: "Skipped" },
    { ...wire, id: 5, start_time: "2026-09-20T18:00:00Z" },
  ];
  assert.deepEqual(utils.upcomingSessions(records, new Date("2026-09-28T00:00:00Z")).map((s) => s.id), [1, 2]);
  assert.equal(records[0].id, 2);
});
