// Runs inside an isolated browser. Every API request is intercepted; no backend/Gemini I/O.
export function installFixture() {
  const stamp = new Date().toISOString();
  const user = { id: 1, username: 'user_a', email: 'a@example.com', created_at: stamp, updated_at: stamp };
  const start = new Date(); start.setHours(10, 0, 0, 0);
  const end = new Date(start); end.setHours(11);
  window.fixture = { user, requests: [], delay: 0, loginStatus: 200, registerStatus: 201, logoutStatus: 204, expire: false, failCTF: false,
    records: {
      courses: [{ id: 1, title: 'Private course A', category: 'Networking', progress: 25, completed_topics: 1, total_topics: 4, created_at: stamp }],
      tasks: [{ id: 1, title: 'Private task A', category: 'Learning', priority: 'High', status: 'To Do', due_date: null, notes: '', created_at: stamp, updated_at: stamp, completed_at: null }],
      ctf: [{ id: 1, title: 'Private CTF A', platform: 'Local', category: 'Web', difficulty: 'Easy', status: 'Completed', points: 100, flag_captured: true, hints_used: 0, notes: '', challenge_url: '', created_at: stamp, updated_at: stamp, completed_at: stamp }],
      'study-sessions': [{ id: 1, title: 'Private session A', category: 'Learning', start_time: start.toISOString(), end_time: end.toISOString(), status: 'Planned', notes: '', created_at: stamp, updated_at: stamp }],
      projects: [], certifications: [], labs: [], notes: [],
    },
  };
  const original = window.fetch.bind(window);
  window.fetch = async (url, options = {}) => {
    if (!String(url).includes('/api/')) return original(url, options);
    const f = window.fixture;
    const path = new URL(url, location.href).pathname;
    // Record transport only, never submitted passwords.
    f.requests.push({ path, method: options.method || 'GET', credentials: options.credentials, cache: options.cache });
    if (f.delay) await new Promise(resolve => setTimeout(resolve, f.delay));
    const response = (value, status = 200) => Response.json(value, { status });
    if (path === '/api/auth/me') return f.user ? response(f.user) : response({}, 401);
    if (path === '/api/auth/login') {
      if (f.loginStatus !== 200) return response({ detail: 'secret server diagnostic' }, f.loginStatus);
      const input = JSON.parse(options.body);
      f.user = { ...user, id: input.username === 'user_b' ? 2 : 1, username: input.username };
      return response(f.user);
    }
    if (path === '/api/auth/register') return response(user, f.registerStatus);
    if (path === '/api/auth/logout') {
      if (f.logoutStatus !== 204) return response({}, f.logoutStatus);
      f.user = null; return new Response(null, { status: 204 });
    }
    if (f.expire || !f.user) return response({}, 401);
    if (path === '/api/ctf' && f.failCTF) throw new TypeError('Mock connection failure');
    if (path === '/api/ai/chat') return response({ reply: 'Private AI reply A' });
    if (options.method && options.method !== 'GET') throw new Error('Unexpected API write in fixture');
    const [resource, id] = path.slice(5).split('/');
    const records = f.user.id === 2 ? [] : (f.records[resource] || []);
    return id ? response(records.find(record => record.id === Number(id)) || {}, records.some(record => record.id === Number(id)) ? 200 : 404) : response(records);
  };
}

export const fixtureSource = `(${installFixture.toString()})();`;
