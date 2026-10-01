import { useEffect, useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authSession } from "./session";
import AppLayout from "../layouts/AppLayout";

export function SessionScreen() {
  const state = useSyncExternalStore(authSession.subscribe, authSession.getSnapshot);
  return <div className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
    <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
      <h1 className="text-xl font-semibold">CyberStudy OS</h1>
      <p role={state.status === "error" ? "alert" : "status"} className="mt-3 text-slate-300">{state.status === "error" ? state.error : state.operation === "logout" ? "Signing out…" : "Checking your session…"}</p>
      {state.status === "error" && <button className="mt-5 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300" onClick={() => void (state.operation === "logout" ? authSession.logout() : authSession.restore())}>Try again</button>}
    </div>
  </div>;
}

export function AuthStartup() {
  useEffect(() => { void authSession.restore(); }, []);
  return null;
}

export function ProtectedApp() {
  const state = useSyncExternalStore(authSession.subscribe, authSession.getSnapshot);
  const location = useLocation();
  if (state.status === "loading" || state.status === "error") return <SessionScreen />;
  if (state.status !== "authenticated") return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  return <AppLayout key={`${state.user?.id}:${state.revision}`} />;
}
