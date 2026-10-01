import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtureSource } from './browserFixture.mjs';
import { send, evaluate, waitFor, close, errors } from './browserHarness.mjs';

let script;
let passed = 0;
async function check(name, work) { await work(); passed++; console.log(`PASS ${name}`); }
async function navigate(path, setup = 'window.fixture.user = null;') {
  if (script) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
  ({ identifier: script } = await send('Page.addScriptToEvaluateOnNewDocument', { source: fixtureSource + setup }));
  await send('Page.navigate', { url: `http://127.0.0.1:4173${path}` });
  await waitFor('window.fixture && document.querySelector("h1")');
}
async function fill(id, value) {
  await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(id)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
const submit = () => evaluate('document.querySelector("form").requestSubmit()');
async function login(username = 'user_a') {
  await waitFor('document.getElementById("username")');
  await fill('username', username); await fill('password', 'test-password-123'); await submit();
  await waitFor('document.querySelector(".app-layout")');
}
const logout = async () => { await evaluate('document.querySelector(".auth-logout").click()'); await waitFor('location.pathname === "/login" && document.getElementById("username")'); };

try {
  await send('Runtime.enable'); await send('Page.enable');
  await navigate('/login', 'window.fixture.user = null; localStorage.clear(); sessionStorage.clear();');
  await check('all protected routes redirect, including details', async () => {
    for (const route of ['/dashboard', '/learning', '/learning/1', '/labs', '/labs/1', '/notes', '/projects', '/certifications', '/ctf', '/tasks', '/planner', '/ai', '/settings', '/profile']) {
      await navigate(route); await waitFor('location.pathname === "/login" && document.getElementById("username")');
      assert.equal(await evaluate('!!document.querySelector(".app-layout")'), false);
      assert.deepEqual(await evaluate('window.fixture.requests.map(r => r.path)'), ['/api/auth/me']);
    }
  });
  await check('unresolved restoration never mounts private content', async () => {
    await navigate('/dashboard', 'window.fixture.delay = 1000;');
    assert.match(await evaluate('document.body.innerText'), /Checking your session/);
    assert.equal(await evaluate('!!document.querySelector(".app-layout")'), false);
    await waitFor('document.querySelector(".dashboard-page")');
    assert.equal(await evaluate('document.querySelector(".auth-user").textContent'), 'user_a');
  });
  await check('invalid login is safe; retry preserves intended path/query/hash; Enter submits', async () => {
    await navigate('/learning?tab=all#courses'); await waitFor('document.getElementById("username")');
    await evaluate('window.fixture.loginStatus = 401');
    await fill('username', 'user_a'); await fill('password', 'wrong'); await submit();
    await waitFor('document.querySelector("[role=alert]")');
    assert.match(await evaluate('document.querySelector("[role=alert]").textContent'), /Invalid username or password/);
    assert.equal(await evaluate('document.body.innerText.includes("secret server diagnostic")'), false);
    await evaluate('window.fixture.loginStatus = 200; document.getElementById("password").focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'char', text: '\r', unmodifiedText: '\r', key: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await waitFor('document.querySelector(".app-layout")');
    assert.equal(await evaluate('location.pathname + location.search + location.hash'), '/learning?tab=all#courses');
  });
  await check('registration validation, duplicate conflicts, server errors and no automatic login', async () => {
    await navigate('/register'); await waitFor('document.getElementById("confirm")');
    await fill('username', 'user_a'); await fill('email', 'a@example.com'); await fill('password', 'test-password-123'); await fill('confirm', 'other-password-123');
    await submit(); assert.match(await evaluate('document.querySelector("[role=alert]").textContent'), /do not match/);
    assert.equal(await evaluate('window.fixture.requests.length'), 1);
    await fill('confirm', 'test-password-123');
    for (const [status, message] of [[409, 'already registered'], [422, 'Check your username'], [500, 'could not complete']]) {
      await evaluate(`window.fixture.registerStatus = ${status}`); await submit();
      await waitFor(`document.querySelector('[role=alert]')?.textContent.includes(${JSON.stringify(message)})`);
    }
    await evaluate('window.fixture.registerStatus = 201; window.fixture.delay = 300');
    const before = await evaluate('window.fixture.requests.length');
    await evaluate('document.querySelector("form").requestSubmit(); document.querySelector("form").requestSubmit()');
    assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'), true);
    await waitFor('location.pathname === "/login" && document.getElementById("username")');
    assert.equal(await evaluate('window.fixture.requests.length'), before + 1);
    assert.match(await evaluate('document.body.innerText'), /Account created/);
    assert.equal(await evaluate('window.fixture.user'), null);
  });
  await check('login cannot double submit or leave via Register while pending', async () => {
    await evaluate('window.fixture.delay = 500');
    await fill('username', 'user_a'); await fill('password', 'test-password-123');
    const before = await evaluate('window.fixture.requests.filter(r => r.path.endsWith("/login")).length');
    await evaluate('document.querySelector("form").requestSubmit(); document.querySelector("form").requestSubmit(); document.querySelector("a").click()');
    assert.equal(await evaluate('location.pathname'), '/login');
    await waitFor('document.querySelector(".app-layout")');
    assert.equal(await evaluate('window.fixture.requests.filter(r => r.path.endsWith("/login")).length'), before + 1);
    assert.equal(await evaluate('location.pathname'), '/dashboard');
  });
  await check('logout clears shell immediately; account B never sees account A records', async () => {
    await waitFor('document.body.innerText.includes("Private course A")');
    await evaluate('localStorage.setItem("cyberstudy.profile", JSON.stringify({displayName:"Local learner"})); localStorage.setItem("cyberstudy.settings", JSON.stringify({version:1,compactMode:true})); document.querySelector(".auth-logout").click()');
    await waitFor('!document.querySelector(".app-layout")');
    assert.equal(await evaluate('document.body.innerText.includes("Private course A")'), false);
    await waitFor('document.getElementById("username")');
    await evaluate('window.fixture.delay = 0; window.leaked = false; new MutationObserver(() => { if (window.fixture.user?.id === 2 && document.body.innerText.includes("Private course A")) window.leaked = true; }).observe(document.body, {subtree:true,childList:true,characterData:true})');
    await login('user_b'); await waitFor('document.querySelector(".dashboard-page") && !document.querySelector(".dashboard-page").innerText.includes("Loading")');
    assert.equal(await evaluate('window.leaked || document.body.innerText.includes("Private course A")'), false);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("cyberstudy.profile")).displayName'), 'Local learner');
    assert.equal(await evaluate('document.querySelector(".app-layout").dataset.compact'), 'true');
  });
  await check('private 401 expires session and returns to intended destination without looping', async () => {
    await evaluate('window.fixture.expire = true; Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === "/notes").click()');
    await waitFor('location.pathname === "/login" && document.getElementById("username")');
    assert.equal(await evaluate('!!document.querySelector(".app-layout")'), false);
    await evaluate('window.fixture.expire = false'); await login('user_b');
    assert.equal(await evaluate('location.pathname'), '/notes');
  });
  await check('AI conversation, draft and selected context reset on account switch', async () => {
    await navigate('/ai', ''); await waitFor('document.querySelector("textarea")');
    await evaluate(`(() => { const e = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(e, 'Private prompt A'); e.dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('summary').click(); document.querySelector('input[type=checkbox]').click(); })()`);
    await evaluate('document.querySelector("textarea").dispatchEvent(new KeyboardEvent("keydown", {key:"Enter", bubbles:true}))');
    await waitFor('document.body.innerText.includes("Private AI reply A")');
    await logout(); await login('user_b'); await waitFor('document.querySelector("textarea")');
    assert.equal(await evaluate('document.querySelector("textarea").value'), '');
    assert.equal(await evaluate('document.querySelectorAll("input[type=checkbox]:checked").length'), 0);
    assert.equal(await evaluate('document.body.innerText.includes("Private prompt A") || document.body.innerText.includes("Private AI reply A")'), false);
  });
  await check('failed logout hides private UI and offers retry', async () => {
    await evaluate('window.fixture.logoutStatus = 500; document.querySelector(".auth-logout").click()');
    await waitFor('document.querySelector("[role=alert]")');
    assert.equal(await evaluate('!!document.querySelector(".app-layout")'), false);
    await evaluate('window.fixture.logoutStatus = 204; document.querySelector("button").click()');
    await waitFor('location.pathname === "/login" && document.getElementById("username")');
  });
  await check('credentials included; auth never writes tokens/passwords to storage', async () => {
    assert.equal(await evaluate('window.fixture.requests.every(r => r.credentials === "include" && r.cache === "no-store")'), true);
    assert.deepEqual(await evaluate('Object.keys(sessionStorage)'), []);
    assert.deepEqual(await evaluate('Object.keys(localStorage).sort()'), ['cyberstudy.profile', 'cyberstudy.settings']);
  });
  await check('Login/Register labels, password semantics, focus and widths 390/768/1440', async () => {
    await mkdir(new URL('../node_modules/.tmp/', import.meta.url), { recursive: true });
    for (const width of [390, 768, 1440]) for (const route of ['/login', '/register']) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await navigate(route); await waitFor('document.getElementById("username")');
      const result = await evaluate(`(() => { const e = document.getElementById('password'); return { overflow: document.documentElement.scrollWidth > innerWidth, labels: [...document.querySelectorAll('input')].every(e => e.labels.length > 0), type: e.type, autocomplete: e.autocomplete }; })()`);
      assert.deepEqual(result, { overflow: false, labels: true, type: 'password', autocomplete: route === '/login' ? 'current-password' : 'new-password' });
      await evaluate('document.getElementById("username").focus()');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert.equal(await evaluate('document.activeElement.id'), route === '/login' ? 'password' : 'email');
      assert.notEqual(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'none');
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`../node_modules/.tmp/auth-${route.slice(1)}-${width}.png`, import.meta.url), Buffer.from(screenshot.data, 'base64'));
    }
  });
  await check('Settings save, reload and reset preserve browser-local Profile', async () => {
    await navigate('/settings', ''); await waitFor('document.getElementById("compact-mode")');
    await evaluate('document.getElementById("compact-mode").click()');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("cyberstudy.settings")).compactMode'), false);
    await navigate('/settings', ''); await waitFor('document.getElementById("compact-mode")');
    assert.equal(await evaluate('document.getElementById("compact-mode").checked'), false);
    await evaluate('document.getElementById("compact-mode").click(); Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Reset Preferences").click()');
    await waitFor('document.querySelector("dialog[open]")');
    await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Confirm Reset").click()');
    assert.equal(await evaluate('localStorage.getItem("cyberstudy.settings")'), null);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("cyberstudy.profile")).displayName'), 'Local learner');
  });
  assert.deepEqual(errors, []);
  console.log(`Auth browser: ${passed} passed, 0 failed, 0 skipped`);
} finally { await close(); }
