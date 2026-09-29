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
const api = await import(await moduleUrl("../src/services/taskApi.ts", { "./courseApi": await moduleUrl("../src/services/courseApi.ts") }));
const { sortTasks, isOverdue, toLocalDateTime } = await import(await moduleUrl("../src/utils/tasks.ts"));
const wire = { id: 1, title: "Practice VLSM", category: "Networking", description: null, priority: "High", status: "To Do", due_date: "2026-09-26T10:30:00+05:30", completed_at: null, created_at: "2026-09-24T10:00:00Z", updated_at: "2026-09-25T10:00:00Z" };
const task = { id: 1, title: wire.title, category: wire.category, description: null, priority: "High", status: "To Do", dueDate: wire.due_date, completedAt: null, createdAt: wire.created_at, updatedAt: wire.updated_at };

test("GET maps task fields and forwards cancellation", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/api\/tasks$/);
    assert.equal(options.signal.aborted, false);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json([wire]);
  });
  assert.deepEqual(await api.getTasks(controller.signal), [task]);
});
test("create and partial updates use API fields and preserve explicit null", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, ...options }); return Response.json(wire); });
  const { id, createdAt, updatedAt, completedAt, ...data } = task;
  assert.deepEqual(await api.createTask(data), task);
  await api.updateTask(1, { status: "Completed" });
  await api.updateTask(1, { dueDate: null, description: null });
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), { title: wire.title, category: wire.category, description: null, priority: "High", status: "To Do", due_date: wire.due_date });
  assert.equal(calls[1].method, "PATCH");
  assert.match(calls[1].url, /\/api\/tasks\/1$/);
  assert.deepEqual(JSON.parse(calls[1].body), { status: "Completed" });
  assert.deepEqual(JSON.parse(calls[2].body), { description: null, due_date: null });
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.equal(id, 1); assert.ok(createdAt && updatedAt); assert.equal(completedAt, null);
});
test("API errors surface actionable messages", async (t) => {
  for (const [status, message] of [[404, /not found/], [422, /Check the task fields/], [500, /500/]]) {
    const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status }));
    await assert.rejects(api.getTasks(), message);
    mock.mock.restore();
  }
});
test("ordering keeps completed last and undated last within each group without mutation", () => {
  const tasks = [
    { ...task, id: 2, status: "Completed", dueDate: "2020-01-01T00:00:00Z" },
    { ...task, id: 3, dueDate: null },
    { ...task, id: 4, dueDate: "2026-09-26T06:00:00Z" },
    task,
    { ...task, id: 5 },
    { ...task, id: 6, updatedAt: "2026-09-26T00:00:00Z" },
  ];
  const original = structuredClone(tasks);
  assert.deepEqual(sortTasks(tasks).map((item) => item.id), [6, 5, 1, 4, 3, 2]);
  assert.deepEqual(tasks, original);
});
test("overdue compares instants and excludes completed and undated tasks", () => {
  const now = Date.parse("2026-09-26T05:01:00Z");
  assert.equal(isOverdue(task, now), true);
  assert.equal(isOverdue(task, Date.parse("2026-09-26T05:00:00Z")), false);
  assert.equal(isOverdue({ ...task, status: "Completed" }, now), false);
  assert.equal(isOverdue({ ...task, dueDate: null }, now), false);
});
test("datetime input uses local wall time and round-trips the due instant", () => {
  assert.equal(toLocalDateTime(null), "");
  const date = new Date(wire.due_date);
  const local = toLocalDateTime(wire.due_date);
  assert.equal(new Date(local).getTime(), date.getTime());
  assert.equal(Number(local.slice(11, 13)), date.getHours());
});
