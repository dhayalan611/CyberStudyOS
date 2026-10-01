import type { AuthUser, LoginInput } from "../services/authApi";

export type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  user: AuthUser | null;
  error: string;
  operation: "restore" | "login" | "logout";
  revision: number;
};
type SessionApi = {
  getCurrentUser: () => Promise<AuthUser | null>;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

// Memory only. Each transition invalidates requests and unmounts private state.
export function createAuthSession(api: SessionApi, invalidate: () => void) {
  let revision = 0;
  let state: AuthState = { status: "loading", user: null, error: "", operation: "restore", revision };
  const listeners = new Set<() => void>();
  function publish(next: AuthState) { state = next; listeners.forEach((listener) => listener()); }
  function begin(operation: AuthState["operation"]) {
    invalidate();
    const version = ++revision;
    publish({ status: "loading", user: null, error: "", operation, revision });
    return version;
  }
  async function run(operation: AuthState["operation"], work: () => Promise<AuthUser | null>) {
    const version = begin(operation);
    try {
      const user = await work();
      if (version !== revision) return false;
      publish({ ...state, user, status: user ? "authenticated" : "unauthenticated" });
      return true;
    } catch (error) {
      if (version !== revision) return false;
      const message = error instanceof Error ? error.message : "Unable to check your session. Please try again.";
      publish({ ...state, status: operation === "login" ? "unauthenticated" : "error", error: message });
      return false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    restore: () => run("restore", api.getCurrentUser),
    login: (input: LoginInput) => run("login", () => api.login(input)),
    logout: () => run("logout", async () => { await api.logout(); return null; }),
    expire() {
      invalidate(); ++revision;
      publish({ status: "unauthenticated", user: null, error: "Your session ended. Please sign in again.", operation: "restore", revision });
    },
  };
}

export function safeDestination(value: unknown): string {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)
    && !/^\/(?:login|register)(?:[/?#]|$)/i.test(value) ? value : "/dashboard";
}
