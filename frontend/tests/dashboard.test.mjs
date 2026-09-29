import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const cache = new Map();
async function moduleUrl(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  let { outputText } = ts.transpileModule(await readFile(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } });
  for (const match of [...outputText.matchAll(/from "(\.[^"]+)"/g)]) {
    outputText = outputText.replaceAll(`"${match[1]}"`, JSON.stringify(await moduleUrl(new URL(`${match[1]}.ts`, url))));
  }
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  cache.set(url.href, result);
  return result;
}
const load = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
const utils = await load("../src/utils/dashboard.ts");
const planner = await load("../src/utils/studySessions.ts");
const ctf = await load("../src/utils/ctfTracker.ts");
const { loadDashboard } = await load("../src/services/dashboardData.ts");

test("active learning includes unstarted courses but not finished courses", () => {
  assert.deepEqual(utils.activeCourses([{ id: 1, progress: 0 }, { id: 2, progress: 60 }, { id: 3, progress: 100 }]).map((c) => c.id), [1, 2]);
});
test("tasks exclude completed, then rank overdue, High, due date, and undated last", () => {
  const task = (id, priority, dueDate, status = "To Do") => ({ id, priority, dueDate, status });
  const records = [task(1, "High", null), task(2, "Low", "2026-09-27T10:00:00Z"), task(3, "High", "2026-09-28T10:00:00Z"), task(4, "Low", "2026-09-24T10:00:00Z"), task(5, "High", "2026-09-25T10:00:00Z"), task(6, "High", "2026-09-20T10:00:00Z", "Completed"), task(7, "Low", null)];
  assert.deepEqual(utils.priorityTasks(records, new Date("2026-09-26T12:00:00Z")).map((t) => t.id), [5, 4, 3, 1, 2, 7]);
  assert.equal(records[0].id, 1);
});
test("today uses local calendar dates across UTC midnight and orders all statuses", () => {
  const stamp = (day, time) => new Date(planner.calendarTimestamp(day, time)).toISOString();
  const records = [{ id: 1, start_time: stamp("2026-09-26", "23:50"), status: "Completed" }, { id: 2, start_time: stamp("2026-09-27", "00:10") }, { id: 3, start_time: stamp("2026-09-26", "00:10"), status: "Skipped" }, { id: 4, start_time: stamp("2026-09-25", "23:50") }];
  assert.deepEqual(utils.todaysSessions(records, new Date(2026, 8, 26, 12)).map((s) => s.id), [3, 1]);
});
test("weekly schedule clips both boundaries and counts all scheduled statuses", () => {
  const session = (start, end, status) => ({ start_time: planner.calendarTimestamp(...start), end_time: planner.calendarTimestamp(...end), status });
  const records = [session(["2026-09-20", "23:30"], ["2026-09-21", "00:30"], "Planned"), session(["2026-09-27", "23:00"], ["2026-09-28", "01:00"], "Skipped"), session(["2026-09-23", "12:00"], ["2026-09-23", "13:30"], "Completed")];
  assert.equal(planner.weeklyMinutes(records, new Date(2026, 8, 26)), 180);
  assert.equal(planner.formatDuration(390), "6h 30m");
});
test("flags use flagCaptured independently of completion; points only include completed", () => {
  const summary = ctf.summarizeChallenges([{ status: "In Progress", flagCaptured: true, points: 100 }, { status: "Completed", flagCaptured: false, points: 40 }, { status: "Completed", flagCaptured: true, points: 50 }]);
  assert.deepEqual([summary.total, summary.completed, summary.captured, summary.points], [3, 2, 2, 90]);
});
test("activity uses real timestamps, skips missing completion times, sorts and limits", () => {
  const sources = { tasks: [{ id: 1, title: "Done", status: "Completed", completedAt: "2026-09-25T12:00:00Z" }, { id: 2, status: "Completed", completedAt: null, updatedAt: "2026-09-26T12:00:00Z" }], ctf: [], sessions: [{ id: 1, title: "Session", status: "Completed", updated_at: "2026-09-24T12:00:00Z" }], projects: [], certifications: [{ id: 1, name: "Cert", createdAt: "2026-09-26T12:00:00Z", updatedAt: "2026-09-26T12:00:00Z" }] };
  assert.deepEqual(utils.recentActivity(sources).map((a) => a.action), ["Certification added", "Task completed", "Completed session updated"]);
  sources.projects = Array.from({ length: 8 }, (_, i) => ({ id: i, title: "Project", createdAt: "2026-09-01T12:00:00Z", updatedAt: `2026-09-${String(i + 20).padStart(2, "0")}T12:00:00Z` }));
  assert.equal(utils.recentActivity(sources).length, 5);
  assert.equal(utils.recentActivity(sources)[0].timestamp, "2026-09-27T12:00:00Z");
});
test("one failed API cannot suppress other results and success is reloaded", async (t) => {
  const calls = [];
  let fail = true;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push(url);
    assert.ok(options.signal instanceof AbortSignal);
    return url.endsWith("/ctf") && fail ? new Response(null, { status: 503 }) : Response.json([]);
  });
  const results = {};
  await loadDashboard(new AbortController().signal, (key, value) => { results[key] = value; });
  assert.equal(results.ctf.status, "unavailable");
  assert.equal(Object.values(results).filter((v) => v.status === "ready").length, 5);
  assert.equal(new Set(calls).size, 6);
  fail = false;
  await loadDashboard(new AbortController().signal, (key, value) => { results[key] = value; });
  assert.equal(results.ctf.status, "ready");
});
test("healthy results publish while another request is pending; unmount cancels it", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (!url.endsWith("/ctf")) return Response.json([]);
    return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
  });
  const results = {};
  const pending = loadDashboard(controller.signal, (key, value) => { results[key] = value; });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(Object.keys(results).length, 5);
  controller.abort();
  await pending;
  assert.equal(results.ctf, undefined);
});
