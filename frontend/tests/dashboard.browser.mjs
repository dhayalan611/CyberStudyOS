// Read-only smoke test. Requires the app on :5173, API on :8000, and
// an isolated headless Chrome instance with --remote-debugging-port=9223.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const tabs = await (await fetch("http://127.0.0.1:9223/json/list")).json();
const socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
const settled = `document.querySelector('.dashboard-page') && !document.querySelector('.dashboard-page .animate-pulse') && !document.querySelector('.dashboard-page [role="status"] .sr-only') && !document.querySelector('.dashboard-page [role="status"] > .sr-only')`;
const loaded = `document.querySelector('.dashboard-page') && !document.querySelector('.dashboard-page').innerText.includes('Loading')`;
try {
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://localhost:5173/dashboard" });
  await waitFor(loaded);
  await waitFor(settled);
  const actual = await evaluate(`(async () => {
    const endpoints = ['courses', 'tasks', 'ctf', 'study-sessions', 'projects', 'certifications'];
    const records = await Promise.all(endpoints.map(async name => {
      const response = await fetch('http://127.0.0.1:8000/api/' + name);
      if (!response.ok) throw new Error(name + ' failed');
      return response.json();
    }));
    const [courses, tasks, ctf, sessions] = records;
    const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const minutes = Math.round(sessions.reduce((sum, session) => sum + Math.max(0, Math.min(Date.parse(session.end_time), +end) - Math.max(Date.parse(session.start_time), +start)) / 60000, 0));
    const duration = [Math.floor(minutes / 60) ? Math.floor(minutes / 60) + 'h' : '', minutes % 60 || !minutes ? minutes % 60 + 'm' : ''].filter(Boolean).join(' ');
    return {
      counts: Object.fromEntries(endpoints.map((name, i) => [name, records[i].length])),
      expected: [courses.filter(c => c.progress < 100).length + ' Active', tasks.filter(t => t.status !== 'Completed').length + ' Pending', ctf.filter(c => c.flag_captured).length + (ctf.filter(c => c.flag_captured).length === 1 ? ' Flag' : ' Flags'), duration],
      rendered: [...document.querySelectorAll('.dashboard-page > div:nth-child(2) section')].map(s => s.querySelector('p').textContent),
      text: document.querySelector('.dashboard-page').innerText,
      today: sessions.filter(s => new Date(s.start_time).toDateString() === now.toDateString()).sort((a,b) => Date.parse(a.start_time)-Date.parse(b.start_time)).slice(0,4).map(s=>s.title),
      points: ctf.filter(c => c.status === 'Completed').reduce((sum,c)=>sum+c.points,0)
    };
  })()`);
  assert.deepEqual(actual.rendered, actual.expected);
  for (const title of actual.today) assert.ok(actual.text.includes(title));
  const renderedPoints = await evaluate(`[...document.querySelectorAll('dt')].find(e=>e.textContent==='Completed Points').nextElementSibling.textContent`);
  assert.equal(Number(renderedPoints), actual.points);
  console.log("Live database summary verified:", JSON.stringify({ records: actual.counts, values: actual.rendered }));
  await mkdir(new URL("../node_modules/.tmp/", import.meta.url), { recursive: true });
  for (const width of [1440, 1024, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await new Promise(resolve => setTimeout(resolve, 150));
    const overflow = await evaluate(`({ page: document.documentElement.scrollWidth > innerWidth, main: document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth })`);
    assert.deepEqual(overflow, { page: false, main: false }, `overflow at ${width}px`);
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL(`../node_modules/.tmp/dashboard-${width}.png`, import.meta.url), Buffer.from(screenshot.data, "base64"));
  }
  await send("Page.reload"); await waitFor(loaded); await waitFor(settled);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.dashboard-page > div:nth-child(2) section')].map(s => s.querySelector('p').textContent)`), actual.expected);
  await send("Network.setBlockedURLs", { urls: ["*127.0.0.1:8000/api/ctf*"] });
  await send("Page.reload"); await waitFor(loaded); await waitFor(settled);
  const partial = await evaluate(`[...document.querySelectorAll('.dashboard-page > div:nth-child(2) section')].map(s => s.querySelector('p').textContent)`);
  assert.equal(partial[2], "Temporarily unavailable");
  assert.equal(partial[0], actual.expected[0]); assert.equal(partial[1], actual.expected[1]); assert.equal(partial[3], actual.expected[3]);
  await send("Network.setBlockedURLs", { urls: [] });
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Refresh').click()`);
  await waitFor(loaded); await waitFor(settled);
  for (const route of ["/tasks", "/planner", "/ai", "/ctf", "/networking", "/learning", "/projects", "/certifications"]) {
    await evaluate(`document.querySelector('.dashboard-page a[href="${route}"]').click()`);
    await waitFor(`location.pathname === '${route}' && !document.querySelector('.dashboard-page')`);
    await send("Page.navigate", { url: "http://localhost:5173/dashboard" });
    await waitFor(loaded); await waitFor(settled);
  }
  console.log("Passed: live totals, today's preview, completed CTF points, refresh persistence, CTF failure/recovery, eight routes, responsive widths 1440/1024/390.");
} finally {
  await send("Network.setBlockedURLs", { urls: [] });
  socket.close();
}
