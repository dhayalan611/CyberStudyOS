import { apiFetch } from "./apiClient";

export type AuthUser = {
  id: number; username: string; email: string; created_at: string; updated_at: string;
};
export type LoginInput = { username: string; password: string };
export type RegisterInput = LoginInput & { email: string };

async function request(action: string, input?: LoginInput | RegisterInput): Promise<Response> {
  try {
    return await apiFetch(`/api/auth/${action}`, action === "me" ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
  } catch {
    throw new Error("Unable to reach CyberStudy OS. Check the backend connection and try again.");
  }
}

function check(response: Response, action: string) {
  if (response.ok) return;
  if (response.status === 401) throw new Error("Invalid username or password.");
  if (response.status === 409) throw new Error("That username or email is already registered. Try another or sign in.");
  if (response.status === 422) throw new Error(action === "register"
    ? "Check your username (3–32 letters, numbers or underscores), email, and password (12–128 characters)."
    : "Check your username and password, then try again.");
  if (response.status === 403) throw new Error("This browser origin is not allowed. Check the local frontend/backend configuration.");
  if (response.status === 429) throw new Error("Too many sign-in attempts. Please wait a moment before trying again.");
  throw new Error("CyberStudy OS could not complete the request. Please try again.");
}

async function user(response: Response): Promise<AuthUser> {
  try {
    const value = await response.json();
    if (!Number.isInteger(value.id) || typeof value.username !== "string" || typeof value.email !== "string"
      || typeof value.created_at !== "string" || typeof value.updated_at !== "string") throw new Error();
    return { id: value.id, username: value.username, email: value.email, created_at: value.created_at, updated_at: value.updated_at };
  } catch { throw new Error("CyberStudy OS returned an unexpected response. Please try again."); }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await request("me");
  if (response.status === 401) return null;
  check(response, "me");
  return user(response);
}
export async function login(input: LoginInput): Promise<AuthUser> {
  const response = await request("login", input); check(response, "login"); return user(response);
}
export async function register(input: RegisterInput): Promise<AuthUser> {
  const response = await request("register", input); check(response, "register"); return user(response);
}
export async function logout(): Promise<void> {
  const response = await request("logout"); check(response, "logout");
}
