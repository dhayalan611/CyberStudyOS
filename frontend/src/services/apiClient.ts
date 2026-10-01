// Keep local HTTP cookie requests same-site: localhost and 127.0.0.1 are
// different sites to the browser. Production should always configure the URL.
const localApiBase = typeof window === "undefined"
  ? "http://127.0.0.1:8000"
  : `${window.location.protocol}//${window.location.hostname}:8000`;
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? localApiBase).trim().replace(/\/+$/, "");

let session = new AbortController();
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}
export function invalidateApiSession() {
  session.abort();
  session = new AbortController();
}

// Services retain their domain-specific HTTP errors. Never retry writes automatically.
export async function apiFetch(path: string, options: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const currentSession = session.signal;
  const signal = AbortSignal.any([timeout, currentSession, ...(options.signal ? [options.signal] : [])]);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include", cache: "no-store", signal });
    if (!currentSession.aborted && response.status === 401 && !path.startsWith("/api/auth/")) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    // Buffer the body while the deadline is active, so a stalled body cannot hang a form.
    const body = await response.arrayBuffer();
    currentSession.throwIfAborted();
    return new Response(response.status === 204 || response.status === 205 || response.status === 304 ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("The request timed out. Refresh to check whether your changes were saved before trying again.", { cause: error });
    throw error;
  }
}
