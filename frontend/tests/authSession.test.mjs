import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSession, safeDestination } from '../src/utils/authSession.ts';

const a = { id: 1, username: 'user_a' };
const b = { id: 2, username: 'user_b' };
function setup(overrides = {}) {
  let invalidations = 0;
  const api = { getCurrentUser: async () => null, login: async () => a, logout: async () => {}, ...overrides };
  return { session: createAuthSession(api, () => invalidations++), invalidations: () => invalidations };
}
test('startup is loading without a user; restoration uses server truth', async () => {
  const { session } = setup({ getCurrentUser: async () => a });
  assert.equal(session.getSnapshot().status, 'loading');
  assert.equal(session.getSnapshot().user, null);
  await session.restore();
  assert.equal(session.getSnapshot().user, a);
  assert.equal(session.getSnapshot().status, 'authenticated');
});
test('missing session and failed restoration are distinct and hide private state', async () => {
  const { session } = setup(); await session.restore();
  assert.equal(session.getSnapshot().status, 'unauthenticated');
  const broken = setup({ getCurrentUser: async () => { throw new Error('Backend unavailable'); } }).session;
  await broken.restore();
  assert.equal(broken.getSnapshot().status, 'error');
  assert.equal(broken.getSnapshot().user, null);
});
test('login, immediate logout hiding, and account switch use different revisions', async () => {
  let finish;
  let account = a;
  const { session, invalidations } = setup({ login: async () => account, logout: () => new Promise(resolve => { finish = resolve; }) });
  await session.login({}); const first = session.getSnapshot().revision;
  const logout = session.logout();
  assert.equal(session.getSnapshot().user, null);
  assert.equal(session.getSnapshot().status, 'loading');
  finish(); await logout;
  assert.equal(session.getSnapshot().status, 'unauthenticated');
  account = b; await session.login({});
  assert.equal(session.getSnapshot().user, b);
  assert.ok(session.getSnapshot().revision > first);
  assert.equal(invalidations(), 3);
});
test('invalid login has a safe error; failed logout never restores private data', async () => {
  const { session } = setup({ login: async () => { throw new Error('Invalid username or password.'); }, logout: async () => { throw new Error('Connection failed'); } });
  assert.equal(await session.login({}), false);
  assert.equal(session.getSnapshot().status, 'unauthenticated');
  assert.match(session.getSnapshot().error, /Invalid username/);
  await session.logout();
  assert.equal(session.getSnapshot().status, 'error');
  assert.equal(session.getSnapshot().user, null);
});
test('expiry invalidates private state and ignores stale restoration completion', async () => {
  let finish;
  const { session } = setup({ getCurrentUser: () => new Promise(resolve => { finish = resolve; }) });
  const restoring = session.restore(); session.expire(); finish(a); await restoring;
  assert.equal(session.getSnapshot().status, 'unauthenticated');
  assert.equal(session.getSnapshot().user, null);
});
test('redirect destinations reject external URLs and auth loops', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register?x=1', null]) assert.equal(safeDestination(value), '/dashboard');
  assert.equal(safeDestination('/learning/42?tab=topics#progress'), '/learning/42?tab=topics#progress');
});
