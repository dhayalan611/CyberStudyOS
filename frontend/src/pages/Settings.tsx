import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { SlidersHorizontal, ShieldCheck, Bot, Info } from "lucide-react";
import type { SettingsContext } from "../utils/settings";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400";

export default function Settings() {
  const { preferences, updateCompactMode, reset } = useOutletContext<SettingsContext>();
  const [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);

  return <div className="settings-page mx-auto max-w-5xl space-y-6">
    <header>
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      <p className="mt-2 text-slate-400">Customize your CyberStudy OS experience.</p>
    </header>

    <section aria-labelledby="appearance-heading" className="settings-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h2 id="appearance-heading" className="flex items-center gap-3 text-lg font-semibold text-white"><SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-cyan-400" />Appearance</h2>
      <p className="mt-2 text-sm text-slate-400">The dark CyberStudy interface, with room to adjust your workspace.</p>
      <div className="mt-5 flex items-center justify-between gap-6">
        <div>
          <label htmlFor="compact-mode" className="font-medium text-slate-100">Compact Mode</label>
          <p id="compact-description" className="mt-1 max-w-xl text-sm text-slate-400">Slightly reduce Settings card spacing and application header and content padding. Saved in this browser.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span aria-hidden="true" className="w-6 text-sm text-slate-300">{preferences.compactMode ? "On" : "Off"}</span>
          <input id="compact-mode" type="checkbox" role="switch" aria-describedby="compact-description" checked={preferences.compactMode}
            className={`h-6 w-6 cursor-pointer accent-cyan-400 ${focus}`}
            onChange={(event) => setStatus(updateCompactMode(event.target.checked) ? "Preferences saved in this browser." : "Applied for this session only. Browser storage is unavailable; your preference could not be saved.")} />
        </div>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="ai-heading" className="settings-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h2 id="ai-heading" className="flex items-center gap-3 text-lg font-semibold text-white"><Bot aria-hidden="true" className="h-5 w-5 text-cyan-400" />AI Assistant</h2>
        <p className="mt-4 text-sm leading-6 text-slate-300">Application context remains opt-in for each AI conversation.</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">Choose sources in the assistant’s context selector before sending a message. No sources are selected by default.</p>
      </section>
      <section aria-labelledby="privacy-heading" className="settings-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h2 id="privacy-heading" className="flex items-center gap-3 text-lg font-semibold text-white"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-cyan-400" />Data &amp; Privacy</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
          <li>V1 is a local single-user application. Learning, task, planner, and other records are stored in PostgreSQL.</li>
          <li>AI requests go through FastAPI to Gemini. Only selected application context is included.</li>
          <li>Gemini API credentials remain on the backend.</li>
        </ul>
      </section>
    </div>

    <section aria-labelledby="preferences-heading" className="settings-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h2 id="preferences-heading" className="text-lg font-semibold text-white">Local Preferences</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">UI preferences and your local Profile are stored in this browser. Resetting preferences does not delete your Profile, study records, conversations, or PostgreSQL data.</p>
      <button ref={resetButton} type="button" onClick={() => dialog.current?.showModal()} className={`mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-300 ${focus}`}>Reset Preferences</button>
      <p role="status" className="mt-3 min-h-5 text-sm text-slate-300">{status}</p>
    </section>

    <section aria-labelledby="about-heading" className="settings-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h2 id="about-heading" className="flex items-center gap-3 text-lg font-semibold text-white"><Info aria-hidden="true" className="h-5 w-5 text-cyan-400" />About</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3"><p className="font-semibold text-white">CyberStudy OS</p><span className="rounded-md bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">Version 1.0.0</span></div>
      <p className="mt-3 text-sm text-slate-400">A cybersecurity-focused learning and productivity workstation.</p>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300"><li>React + TypeScript</li><li>FastAPI + PostgreSQL</li><li>Gemini-powered AI assistant</li></ul>
    </section>

    <dialog ref={dialog} aria-labelledby="reset-heading" aria-describedby="reset-description" onClose={() => resetButton.current?.focus()}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 backdrop:bg-black/70">
      <h2 id="reset-heading" className="text-xl font-semibold">Reset UI preferences?</h2>
      <p id="reset-description" className="mt-3 text-sm leading-6 text-slate-400">Compact Mode will return to Off. This resets only Settings preferences in this browser. Your study records and database will not be changed.</p>
      <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus className={`rounded-lg border border-slate-600 px-4 py-2 ${focus}`}>Cancel</button>
        <button type="button" className={`rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 ${focus}`} onClick={() => {
          setStatus(reset() ? "Preferences reset. Your study records are unchanged." : "Reset for this session only. Browser storage is unavailable; saved preferences could not be removed.");
          dialog.current?.close();
        }}>Confirm Reset</button>
      </form>
    </dialog>
  </div>;
}
