import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function moduleUrl(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } });
  if (path.endsWith('authApi.ts')) outputText = outputText.replace('"./apiClient"', JSON.stringify(await moduleUrl('../src/services/apiClient.ts')));
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}
const api = await import(await moduleUrl('../src/services/authApi.ts'));
const user = { id: 1, username: 'learner', email: 'learner@example.com', created_at: '2026-01-01', updated_at: '2026-01-01' };

test('auth contract: JSON POST, credentialed GET restoration, 204 logout, response allowlist', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ path: new URL(url).pathname, ...options });
    return url.endsWith('/logout') ? new Response(null, { status: 204 }) : Response.json({ ...user, token: 'must-not-retain', password_hash: 'must-not-retain' });
  });
  const input = { username: 'learner', password: 'only-in-request' };
  assert.deepEqual(await api.login(input), user);
  assert.deepEqual(await api.register({ ...input, email: user.email }), user);
  assert.deepEqual(await api.getCurrentUser(), user);
  await api.logout();
  assert.deepEqual(calls.map(c => c.path), ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/logout']);
  assert.deepEqual(calls.map(c => c.method || 'GET'), ['POST', 'POST', 'GET', 'POST']);
  assert.ok(calls.every(c => c.credentials === 'include' && c.cache === 'no-store'));
  assert.deepEqual(JSON.parse(calls[0].body), input);
  assert.deepEqual(JSON.parse(calls[1].body), { ...input, email: user.email });
});

test('auth errors never expose response diagnostics; missing session is normal', async t => {
  let status = 401;
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'secret hash/internal diagnostic' }, { status }));
  assert.equal(await api.getCurrentUser(), null);
  for (const [code, pattern] of [[401, /Invalid username or password/], [409, /already registered/], [422, /Check your username/], [403, /origin is not allowed/], [429, /Too many sign-in attempts/], [500, /could not complete/]]) {
    status = code;
    await assert.rejects(api.register({}), error => pattern.test(error.message) && !/secret|hash|diagnostic/.test(error.message));
  }
});

test('network failures and malformed auth responses use safe actionable messages', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('private network internals'); });
  await assert.rejects(api.login({}), /Unable to reach CyberStudy OS/);
  fetch.mock.mockImplementation(async () => Response.json({ token: 'not-a-user' }));
  await assert.rejects(api.login({}), /unexpected response/);
});
