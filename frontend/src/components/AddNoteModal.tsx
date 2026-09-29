import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { NewNote, Note } from "../services/noteApi";

type AddNoteModalProps = {
  note?: Note;
  onClose: () => void;
  onSave: (data: NewNote) => Promise<void>;
};

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500";

export default function AddNoteModal({ note, onClose, onSave }: AddNoteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const value = (name: string) => String(fields.get(name) ?? "");
    if (!value("title").trim() || !value("category").trim() || !value("content").trim()) {
      setError("Enter a title, category, and content.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: value("title").trim(), category: value("category").trim(),
        tags: value("tags").trim() || null, content: value("content"),
        // Editing text must not overwrite the independently managed pin state.
        ...(!note ? { pinned: fields.has("pinned") } : {}),
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
    <dialog ref={dialogRef} aria-labelledby="note-modal-title"
      onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="note-modal-title" className="text-xl font-semibold text-white">{note ? "Edit Note" : "New Note"}</h2>
          <p className="mt-1 text-sm text-slate-400">{note ? "Review and update your study notes." : "Capture something worth remembering."}</p>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close note modal"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-50">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">Title
            <input name="title" defaultValue={note?.title ?? ""} required maxLength={255} autoFocus placeholder="e.g. OSI Model" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Category
            <input name="category" defaultValue={note?.category ?? ""} required maxLength={255} placeholder="e.g. Networking" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Tags <span className="text-slate-500">(optional, comma-separated)</span>
            <input name="tags" defaultValue={note?.tags ?? ""} placeholder="networking,osi,ccna" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Content
            <textarea name="content" defaultValue={note?.content ?? ""} required rows={9} placeholder="Write your study notes..." className={`${inputClass} resize-y`} />
          </label>
          {!note && <label className="flex items-center gap-3 text-sm font-medium">
            <input name="pinned" type="checkbox" className="h-4 w-4 accent-cyan-500" /> Pinned
          </label>}
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-900 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Saving..." : note ? "Save Changes" : "Create Note"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
