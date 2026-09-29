export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").trim().replace(/\/+$/, "");

// Services retain their domain-specific HTTP errors. Never retry writes automatically.
export async function apiFetch(path: string, options: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal });
    // Buffer the body while the deadline is active, so a stalled body cannot hang a form.
    const body = await response.arrayBuffer();
    return new Response(response.status === 204 || response.status === 205 || response.status === 304 ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) throw new Error("The request timed out. Refresh to check whether your changes were saved before trying again.", { cause: error });
    throw error;
  }
}
