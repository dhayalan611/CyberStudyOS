import { useRef, useState, useSyncExternalStore } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { authSession } from "../auth/session";
import { SessionScreen } from "../auth/AuthBoundary";
import { register } from "../services/authApi";
import { safeDestination } from "../utils/authSession";

const inputClass = "mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const state = useSyncExternalStore(authSession.subscribe, authSession.getSnapshot);
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const isRegister = mode === "register";
  const destination = safeDestination(location.state?.from);
  if (state.status === "authenticated") return <Navigate to={destination} replace />;
  if (state.status === "error" || (state.status === "loading" && state.operation !== "login")) return <SessionScreen />;

  return <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
    <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8" aria-labelledby="auth-title">
      <p className="mb-6 flex items-center gap-3 font-semibold text-cyan-300"><Shield aria-hidden="true" className="h-6 w-6" />CyberStudy OS</p>
      <h1 id="auth-title" className="text-3xl font-bold">{isRegister ? "Create your account" : "Sign in"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">{isRegister ? "Start your own learning workspace." : "Return to your learning workstation."}</p>
      {!isRegister && location.state?.registered && <p role="status" className="mt-4 text-sm text-cyan-200">Account created. Sign in with your username and password.</p>}
      <form className="mt-6 space-y-5" aria-busy={pending} onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const username = String(data.get("username") ?? "").trim().toLowerCase();
        const password = String(data.get("password") ?? "");
        if (isRegister && password !== data.get("confirm")) { setError("Passwords do not match."); return; }
        submitting.current = true; setPending(true); setError("");
        try {
          if (isRegister) {
            await register({ username, email: String(data.get("email") ?? "").trim(), password });
            form.reset();
            navigate("/login", { replace: true, state: { from: destination, registered: true } });
          } else {
            await authSession.login({ username, password });
          }
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : "Unable to complete the request. Please try again.");
        } finally { submitting.current = false; setPending(false); }
      }}>
        <div><label htmlFor="username" className="text-sm font-medium">Username</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]{3,32}" aria-describedby="username-help" className={inputClass} />
          <p id="username-help" className="mt-1 text-xs text-slate-400">3–32 letters, numbers or underscores.</p></div>
        {isRegister && <div><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} /></div>}
        <div><label htmlFor="password" className="text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 12 : 1} maxLength={128} aria-describedby={isRegister ? "password-help" : undefined} className={inputClass} />
          {isRegister && <p id="password-help" className="mt-1 text-xs text-slate-400">12–128 characters. No special character rules.</p>}</div>
        {isRegister && <div><label htmlFor="confirm" className="text-sm font-medium">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={inputClass} /></div>}
        {(error || (!isRegister && state.error)) && <p role="alert" className="text-sm text-rose-300">{error || state.error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60">{pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-400">{isRegister ? "Already have an account? " : "New to CyberStudy OS? "}<Link to={isRegister ? "/login" : "/register"} state={{ from: destination }} aria-disabled={pending} onClick={(event) => { if (submitting.current) event.preventDefault(); }} className="text-cyan-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-cyan-300">{isRegister ? "Sign in" : "Register"}</Link></p>
    </section>
  </main>;
}
