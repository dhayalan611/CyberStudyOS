import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { LAB_DIFFICULTIES, LAB_PLATFORMS, LAB_STATUSES, type NewLab } from "../services/labApi";

type AddLabModalProps = {
  onClose: () => void;
  onAddLab: (data: NewLab) => Promise<void>;
};

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500";

export default function AddLabModal({ onClose, onAddLab }: AddLabModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    if (!value("title") || !value("category")) {
      setError("Enter a title and category.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddLab({
        title: value("title"), platform: value("platform"), category: value("category"),
        difficulty: value("difficulty"), status: value("status"),
        labUrl: value("labUrl"), notes: value("notes"),
      });
      form.reset();
      onClose();
    } catch (error: unknown) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message : "Unable to reach the backend. Check that FastAPI is running and try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="add-lab-title"
      onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="add-lab-title" className="text-xl font-semibold text-white">Add Lab</h2>
          <p className="mt-1 text-sm text-slate-400">Add your next hands-on practice.</p>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close add lab modal"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-50">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">Title
            <input name="title" required maxLength={255} autoFocus placeholder="e.g. Intro to LAN" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Platform
            <select name="platform" defaultValue="TryHackMe" className={inputClass}>
              {LAB_PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Category
            <input name="category" required maxLength={255} placeholder="e.g. Networking" className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Difficulty
              <select name="difficulty" defaultValue="Easy" className={inputClass}>
                {LAB_DIFFICULTIES.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Status
              <select name="status" defaultValue="Not Started" className={inputClass}>
                {LAB_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Lab URL <span className="text-slate-500">(optional)</span>
            <input name="labUrl" type="url" maxLength={2048} placeholder="https://..." className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Notes <span className="text-slate-500">(optional)</span>
            <textarea name="notes" rows={3} placeholder="What are you practicing?" className={`${inputClass} resize-y`} />
          </label>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-900 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Add Lab"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
