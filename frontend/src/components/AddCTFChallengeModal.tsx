import { useEffect, useRef, useState, type FormEvent } from "react";
import { Flag, X } from "lucide-react";
import { CTF_PLATFORMS } from "../constants/ctfPlatforms";
import { CTF_DIFFICULTIES, CTF_STATUSES, type CTFChallenge, type CTFDifficulty, type CTFStatus, type NewCTFChallenge } from "../services/ctfApi";
import { challengeLink } from "../utils/ctfTracker";

type Props = { challenge?: CTFChallenge; onClose: () => void; onSave: (data: NewCTFChallenge) => Promise<void> };
const inputClass = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500";
const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";
const platformOptions = [...CTF_PLATFORMS, "Other"];

export default function AddCTFChallengeModal({ challenge, onClose, onSave }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState(() =>
    challenge ? platformOptions.includes(challenge.platform) ? challenge.platform : "Other" : ""
  );
  const [customPlatform, setCustomPlatform] = useState(() =>
    challenge && (!platformOptions.includes(challenge.platform) || challenge.platform === "Other") ? challenge.platform : ""
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    if (!["title", "platform", "category"].every((name) => value(name))) {
      setError("Enter a title, platform, and category."); return;
    }
    const platform = value("platform") === "Other" ? value("customPlatform") : value("platform");
    if (!platform) {
      setError("Enter a custom platform name."); return;
    }
    const points = Number(value("points"));
    const hintsUsed = Number(value("hintsUsed"));
    if (!["points", "hintsUsed"].every((name) => value(name)) ||
        ![points, hintsUsed].every((number) => Number.isInteger(number) && number >= 0 && number <= 2147483647)) {
      setError("Points and hints used must be whole numbers from 0 to 2,147,483,647."); return;
    }
    if (value("challengeUrl") && !challengeLink(value("challengeUrl"))) {
      setError("Use a complete http:// or https:// challenge URL, or leave it empty."); return;
    }
    submittingRef.current = true;
    setIsSubmitting(true); setError(null);
    try {
      await onSave({ title: value("title"), platform, category: value("category"),
        difficulty: value("difficulty") as CTFDifficulty, status: value("status") as CTFStatus,
        points, hintsUsed, flagCaptured: fields.get("flagCaptured") === "on",
        challengeUrl: value("challengeUrl") || null, notes: value("notes") || null });
      form.reset(); onClose();
    } catch (error: unknown) {
      setError(error instanceof Error && !(error instanceof TypeError) ? error.message : "Unable to reach the backend. Check that FastAPI is running and try again.");
    } finally { submittingRef.current = false; setIsSubmitting(false); }
  }

  return <dialog ref={dialogRef} aria-labelledby="ctf-modal-title"
    onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><h2 id="ctf-modal-title" className="text-xl font-semibold text-white">{challenge ? "Edit Challenge" : "Add Challenge"}</h2>
        <p className="mt-1 text-sm text-slate-400">Track your progress and whether a flag was captured.</p></div>
      <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close challenge modal" className={`rounded-lg p-2 hover:bg-slate-900 disabled:opacity-50 ${focusClass}`}><X aria-hidden="true" className="h-5 w-5" /></button>
    </div>
    <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-medium">Title<input name="title" required autoFocus maxLength={255} defaultValue={challenge?.title ?? ""} placeholder="e.g. Web Gauntlet" className={inputClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Platform
              <select name="platform" required value={selectedPlatform} onChange={(event) => setSelectedPlatform(event.target.value)} className={inputClass}>
                <option value="" disabled>Select a platform</option>
                {platformOptions.map((platform) => <option key={platform}>{platform}</option>)}
              </select>
            </label>
            {selectedPlatform === "Other" && <label className="mt-3 block text-sm font-medium">Custom platform name
              <input name="customPlatform" required maxLength={255} value={customPlatform} onChange={(event) => setCustomPlatform(event.target.value)} placeholder="e.g. CTFlearn" className={inputClass} />
            </label>}
          </div>
          <label className="block text-sm font-medium">Category<input name="category" required maxLength={255} defaultValue={challenge?.category ?? ""} placeholder="e.g. Web Exploitation" className={inputClass} /></label>
          <label className="block text-sm font-medium">Difficulty<select name="difficulty" defaultValue={challenge?.difficulty ?? "Easy"} className={inputClass}>{CTF_DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-medium">Status<select name="status" defaultValue={challenge?.status ?? "Not Started"} className={inputClass}>{CTF_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-medium">Points<input name="points" type="number" required min={0} max={2147483647} step={1} defaultValue={challenge?.points ?? 0} className={inputClass} /></label>
          <label className="block text-sm font-medium">Hints Used<input name="hintsUsed" type="number" required min={0} max={2147483647} step={1} defaultValue={challenge?.hintsUsed ?? 0} className={inputClass} /></label>
        </div>
        <label className="flex items-center gap-3 rounded-lg border border-slate-800 px-3 py-3 text-sm"><input name="flagCaptured" type="checkbox" defaultChecked={challenge?.flagCaptured ?? false} className={`h-4 w-4 accent-cyan-400 ${focusClass}`} /><Flag aria-hidden="true" className="h-4 w-4 text-cyan-400" />Flag Captured</label>
        <label className="block text-sm font-medium">Challenge URL <span className="text-slate-500">(optional)</span><input name="challengeUrl" type="url" maxLength={2048} defaultValue={challenge?.challengeUrl ?? ""} placeholder="https://..." className={inputClass} /></label>
        <label className="block text-sm font-medium">Notes <span className="text-slate-500">(optional)</span><textarea name="notes" rows={3} defaultValue={challenge?.notes ?? ""} placeholder="Learning notes and progress..." className={`${inputClass} resize-y`} /></label>
      </fieldset>
      {challenge && <dl className="mt-4 grid gap-2 border-t border-slate-800 pt-4 text-xs sm:grid-cols-2">
        {[["Started", challenge.startedAt], ["Completed", challenge.completedAt], ["Created", challenge.createdAt], ["Updated", challenge.updatedAt]].map(([label, date]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-slate-400">{date ? new Date(date).toLocaleString() : "Not set"}</dd></div>)}
      </dl>}
      {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={isSubmitting} className={`rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900 disabled:opacity-50 ${focusClass}`}>Cancel</button>
        <button type="submit" disabled={isSubmitting} className={`rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 ${focusClass}`}>{isSubmitting ? "Saving..." : challenge ? "Save Changes" : "Create Challenge"}</button>
      </div>
    </form>
  </dialog>;
}
