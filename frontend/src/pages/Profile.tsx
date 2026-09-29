import { useRef, useState } from "react";
import { ShieldCheck, UserRound, X } from "lucide-react";
import { addProfileItem, clearProfile, emptyProfile, profileInitials, readProfile, saveProfile } from "../utils/profile";
import type { LearnerProfile } from "../utils/profile";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400";
const input = `w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 ${focus}`;
const button = `rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400 ${focus}`;
const card = "rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6";
const fields = [
  ["displayName", "Display Name"], ["headline", "Headline"],
  ["organization", "University / Organization"], ["currentFocus", "Current Focus"],
] as const;

function ListEditor({ kind, items, onChange }: {
  kind: "Skills" | "Learning Goals"; items: string[]; onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const id = kind === "Skills" ? "skill" : "goal";
  function add() {
    const next = addProfileItem(items, draft);
    if (next === items) { setError(`Enter a non-blank ${id} that is not already listed.`); return; }
    onChange(next); setDraft(""); setError("");
  }
  return <section className={card} aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="text-lg font-semibold text-white">{kind}</h2>
    <p className="mt-2 text-sm text-slate-400">{id === "skill" ? "Add the skills you are learning or practicing." : "Keep a short list of what you want to learn."}</p>
    <ul className={`mt-4 flex gap-2 ${id === "skill" ? "flex-wrap" : "flex-col"}`}>
      {items.map((item, index) => <li key={item} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
        <button type="button" aria-label={`Remove ${id}: ${item}`} className={`shrink-0 rounded p-1 text-slate-400 hover:text-white ${focus}`} onClick={() => onChange(items.filter((_, i) => i !== index))}><X aria-hidden="true" size={16} /></button>
      </li>)}
    </ul>
    {!items.length && <p className="mt-3 text-sm text-slate-500">No {kind.toLowerCase()} added yet.</p>}
    <label htmlFor={`new-${id}`} className="mt-4 mb-2 block text-sm text-slate-300">New {id}</label>
    <div className="flex gap-2">
      <input id={`new-${id}`} className={`${input} min-w-0`} value={draft} aria-invalid={!!error} aria-describedby={`${id}-error`} onChange={event => { setDraft(event.target.value); setError(""); }} onKeyDown={event => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); add(); }
      }} />
      <button type="button" className={`${button} shrink-0`} onClick={add}>Add {id}</button>
    </div>
    <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-amber-300">{error}</p>
  </section>;
}

export default function Profile() {
  const [profile, setProfile] = useState(readProfile);
  const [status, setStatus] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);
  function update<K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) {
    setProfile(current => ({ ...current, [key]: value })); setStatus("Unsaved changes.");
  }
  const initials = profileInitials(profile.displayName);
  return <div className="profile-page mx-auto max-w-5xl space-y-6">
    <header><h1 className="text-3xl font-bold text-white">Profile</h1><p className="mt-2 text-slate-400">Your CyberStudy OS learner profile.</p></header>
    <section aria-label="Profile summary" className={`${card} flex items-center gap-4`}>
      <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-2xl font-semibold text-cyan-300">{initials || <UserRound size={28} />}</div>
      <div className="min-w-0 break-words [overflow-wrap:anywhere]">
        <h2 className="text-xl font-semibold text-white">{profile.displayName.trim() || "Your learner profile"}</h2>
        {profile.headline.trim() && <p className="mt-1 text-slate-300">{profile.headline}</p>}
        {profile.currentFocus.trim() && <p className="mt-2 text-sm text-cyan-300">Current focus: {profile.currentFocus}</p>}
      </div>
    </section>
    <form className="space-y-6" onSubmit={event => {
      event.preventDefault();
      setStatus(saveProfile(profile) ? "Profile saved in this browser." : "Profile could not be saved. Browser storage is unavailable or full. Your edits are still here; try again.");
    }}>
      <section className={card} aria-labelledby="personal-heading">
        <h2 id="personal-heading" className="text-lg font-semibold text-white">Personal Information</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label]) => <div key={key}><label htmlFor={key} className="mb-2 block text-sm text-slate-300">{label}</label><input id={key} className={input} value={profile[key]} onChange={event => update(key, event.target.value)} /></div>)}
          <div className="sm:col-span-2"><label htmlFor="bio" className="mb-2 block text-sm text-slate-300">Bio</label><textarea id="bio" rows={4} className={`${input} resize-y`} value={profile.bio} onChange={event => update("bio", event.target.value)} /></div>
        </div>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ListEditor key={`skills-${editorVersion}`} kind="Skills" items={profile.skills} onChange={items => update("skills", items)} />
        <ListEditor key={`goals-${editorVersion}`} kind="Learning Goals" items={profile.learningGoals} onChange={items => update("learningGoals", items)} />
      </div>
      <section className={card} aria-labelledby="profile-privacy">
        <h2 id="profile-privacy" className="flex items-center gap-2 text-lg font-semibold text-white"><ShieldCheck aria-hidden="true" size={20} className="text-cyan-400" />Privacy / Local Profile</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">Profile information is stored locally in this browser for V1. It is not an authenticated public account and does not sync to the cloud. Profile information is not sent to the AI assistant.</p>
        <p className="mt-2 text-sm text-slate-400">Use Add for each skill or goal, then Save Profile to keep your changes.</p>
      </section>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-300">{status}</p>
      <div className="flex flex-wrap justify-between gap-3">
        <button ref={clearButton} type="button" className={button} onClick={() => dialog.current?.showModal()}>Clear Profile</button>
        <button type="submit" className={`rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300 ${focus}`}>Save Profile</button>
      </div>
    </form>
    <dialog ref={dialog} aria-labelledby="clear-heading" aria-describedby="clear-description" onClose={() => clearButton.current?.focus()} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 backdrop:bg-black/70">
      <h2 id="clear-heading" className="text-xl font-semibold">Clear local profile?</h2>
      <p id="clear-description" className="mt-3 text-sm leading-6 text-slate-400">This removes your saved profile and current profile edits. Settings, study records, and AI configuration remain unchanged.</p>
      <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus className={button}>Cancel</button>
        <button type="button" className={button} onClick={() => {
          if (clearProfile()) { setProfile(emptyProfile()); setEditorVersion(version => version + 1); setStatus("Profile cleared. Settings and study records are unchanged."); }
          else setStatus("Profile could not be cleared. Browser storage is unavailable; please try again.");
          dialog.current?.close();
        }}>Confirm Clear</button>
      </form>
    </dialog>
  </div>;
}
