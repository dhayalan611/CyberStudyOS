// Requires production preview on :4173 and isolated Chrome on :9225. All APIs mocked.
import assert from "node:assert/strict";
import { fixtureSource } from "./browserFixture.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const tab = await (await fetch("http://127.0.0.1:9225/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
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

const loaded = `!!document.querySelector('.profile-page')`;
const click = text => evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(text)}).click()`);
async function fill(id, value) {
  await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
async function reload() {
  // Network events cannot see intercepted fetches. Check the fixture too, before
  // each reload resets its request log; only startup session restoration is allowed.
  assert.deepEqual(await evaluate(`window.fixture.requests.filter(r => r.path !== '/api/auth/me')`), []);
  await evaluate(`document.querySelector('.profile-page')?.setAttribute('data-old', 'true')`);
  await send('Page.reload');
  await waitFor(`${loaded} && !document.querySelector('.profile-page').hasAttribute('data-old')`);
}
try {
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixtureSource });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/profile' });
  await waitFor(loaded);
  await evaluate(`localStorage.removeItem('cyberstudy.profile'); localStorage.setItem('cyberstudy.settings', JSON.stringify({version:1,compactMode:true})); localStorage.setItem('test.other', 'keep')`);
  await reload();
  assert.equal(await evaluate(`document.getElementById('displayName').value`), '');
  // Watch every request made while editing/saving. Profile must make no API calls.
  await send('Network.enable');
  const requests = [];
  socket.addEventListener('message', ({data}) => {
    const message = JSON.parse(data);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  const fields = { displayName: 'Test Learner', headline: 'Student', organization: 'Test Campus', currentFocus: 'Networks', bio: 'Private local biography' };
  for (const [id, value] of Object.entries(fields)) await fill(id, value);
  await click('Add skill');
  assert.match(await evaluate(`document.getElementById('skill-error').textContent`), /non-blank/);
  await fill('new-skill', ' Linux '); await click('Add skill');
  await fill('new-skill', 'linux'); await click('Add skill');
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label^="Remove skill:"]').length`), 1);
  await fill('new-goal', 'Practice networks'); await click('Add goal');
  await fill('new-goal', 'Temporary goal'); await click('Add goal');
  await evaluate(`document.querySelector('[aria-label="Remove goal: Temporary goal"]').click()`);
  assert.equal(await evaluate(`localStorage.getItem('cyberstudy.profile')`), null);
  await click('Save Profile');
  const expected = { ...fields, skills: ['Linux'], learningGoals: ['Practice networks'] };
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cyberstudy.profile'))`), expected);
  await reload();
  for (const [id, value] of Object.entries(fields)) assert.equal(await evaluate(`document.getElementById('${id}').value`), value);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label^="Remove goal:"]').length`), 1);
  await evaluate(`document.querySelector('[aria-label="Remove skill: Linux"]').click()`);
  await click('Save Profile');
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cyberstudy.profile')).skills`), []);
  await mkdir(new URL('../node_modules/.tmp/', import.meta.url), {recursive:true});
  for (const width of [1440, 768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height:1000, deviceScaleFactor:1, mobile:false});
    assert.equal(await evaluate(`document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth`), false);
    const screenshot = await send('Page.captureScreenshot', {format:'png'});
    await writeFile(new URL(`../node_modules/.tmp/profile-${width}.png`, import.meta.url), Buffer.from(screenshot.data, 'base64'));
  }
  await click('Clear Profile');
  assert.equal(await evaluate(`document.activeElement.textContent`), 'Cancel');
  await click('Cancel');
  assert.notEqual(await evaluate(`localStorage.getItem('cyberstudy.profile')`), null);
  await click('Clear Profile'); await click('Confirm Clear');
  assert.equal(await evaluate(`localStorage.getItem('cyberstudy.profile')`), null);
  assert.equal(await evaluate(`document.getElementById('displayName').value`), '');
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('cyberstudy.settings'))`), {version:1,compactMode:true});
  assert.equal(await evaluate(`localStorage.getItem('test.other')`), 'keep');
  await evaluate(`localStorage.setItem('cyberstudy.profile', '{bad json')`);
  await reload();
  assert.equal(await evaluate(`document.getElementById('displayName').value`), '');
  await fill('displayName', 'Recovered'); await click('Save Profile');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('cyberstudy.profile')).displayName`), 'Recovered');
  assert.deepEqual(requests.filter(url => /\/api\/|gemini|googleapis/i.test(url)), []);
  // Simulate quota/permission errors without modifying the browser's actual storage.
  await evaluate(`Storage.prototype.setItem = () => { throw new Error('blocked'); }`);
  await fill('displayName', 'Still editable'); await click('Save Profile');
  assert.match(await evaluate(`document.querySelector('.profile-page [role="status"]').textContent`), /could not be saved/);
  await reload();
  console.log('PASS: route, editing, explicit save, reload persistence, skills, goals, clear confirmation/cancellation, Settings isolation, malformed data, save failure, no API requests, responsive widths 1440/768/390.');
} finally { socket.close(); await fetch(`http://127.0.0.1:9225/json/close/${tab.id}`); }

