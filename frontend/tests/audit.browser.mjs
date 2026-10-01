// Read-only production UI smoke test. Start preview on :4173 and an isolated
// headless Chrome on :9225. API lists are mocked empty; writes are rejected.
import assert from "node:assert/strict";
import { fixtureSource } from "./browserFixture.mjs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tab = await (await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  clearTimeout(entry.timeout);
  if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
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
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
const routes = ["/dashboard", "/learning", "/labs", "/notes", "/projects", "/certifications", "/cyber-reference", "/linux", "/networking", "/ctf", "/ai", "/tasks", "/planner"];
try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: fixtureSource + `
    Object.keys(window.fixture.records).forEach(key => window.fixture.records[key] = []);
  ` });
  for (const width of [390, 1024, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const route of routes) {
      await send("Page.navigate", { url: `http://127.0.0.1:4173${route}` });
      await waitFor(`document.querySelector('main h1') && !document.querySelector('main').innerText.includes('Loading')`);
      const result = await evaluate(`(() => {
        const main = document.querySelector('main');
        return { heading: main.querySelector('h1').textContent, width: main.clientWidth, overflow: main.scrollWidth - main.clientWidth,
          documentOverflow: document.documentElement.scrollWidth - innerWidth,
          courseCalls: window.fixture.requests.filter(request => request.path === '/api/courses').length };
      })()`);
      assert.notEqual(result.heading, "Page not found", route);
      assert.ok(result.overflow <= 1, `${width} ${route}: content overflow ${result.overflow}`);
      assert.ok(result.documentOverflow <= 1, `${width} ${route}: document overflow`);
      assert.equal(result.courseCalls, ["/dashboard", "/learning"].includes(route) ? 1 : 0, `${route}: course loading scope`);
      console.log(width, route, "PASS");
    }
  }
  for (const [route, destination] of [["/", "/dashboard"], ["/reference", "/cyber-reference"]]) {
    await send("Page.navigate", { url: `http://127.0.0.1:4173${route}` });
    await waitFor(`location.pathname === ${JSON.stringify(destination)} && document.querySelector('main h1')`);
  }
  await send("Page.navigate", { url: "http://127.0.0.1:4173/missing-page" });
  await waitFor(`document.querySelector('main h1')?.textContent === 'Page not found'`);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 550, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4173/learning" });
  await waitFor(`document.querySelector('main h1') && !document.querySelector('main').innerText.includes('Loading')`);
  await evaluate(`(() => { const button = Array.from(document.querySelectorAll('main button')).find(b => b.textContent.includes('Add Course')); button.focus(); button.click(); })()`);
  await waitFor(`document.querySelector('dialog[open]')`);
  const modal = await evaluate(`(() => {const d = document.querySelector('dialog'); const r = d.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, height:innerHeight, focus:document.activeElement.id, overflow:d.scrollWidth-d.clientWidth };})()`);
  assert.ok(modal.top >= 0 && modal.bottom <= modal.height && modal.overflow <= 1);
  assert.equal(modal.focus, "course-name");
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  const screenshotPath = join(tmpdir(), "cyberstudy-course-modal.png");
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  console.log("Modal screenshot:", screenshotPath);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('dialog[open]')`);
  assert.ok(await evaluate(`document.activeElement.textContent.includes('Add Course')`), "Focus returns to opener");
  assert.deepEqual(errors, []);
  console.log("Redirects, not-found page, modal scrolling, autofocus, Escape and focus restoration PASS");
} finally {
  socket.close(); await fetch(`http://127.0.0.1:9225/json/close/${tab.id}`);
}
