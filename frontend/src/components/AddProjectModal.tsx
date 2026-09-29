import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { PROJECT_STATUSES, type NewProject, type Project } from "../services/projectApi";

type AddProjectModalProps = {
  project?: Project;
  onClose: () => void;
  onSave: (data: NewProject) => Promise<void>;
};

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500";

export default function AddProjectModal({ project, onClose, onSave }: AddProjectModalProps) {
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
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    const progress = Number(value("progress"));
    if (!value("title") || !value("category")) {
      setError("Enter a title and category.");
      return;
    }
    if (!value("progress") || !Number.isInteger(progress) || progress < 0 || progress > 100) {
      setError("Progress must be a whole number from 0 to 100.");
      return;
    }
    for (const name of ["githubUrl", "projectUrl"]) {
      if (!value(name)) continue;
      try {
        const url = new URL(value(name));
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError("Use a complete http:// or https:// URL, or leave the URL fields empty.");
        return;
      }
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: value("title"), description: value("description") || null,
        category: value("category"), status: value("status"),
        technologies: value("technologies") || null, progress,
        githubUrl: value("githubUrl") || null, projectUrl: value("projectUrl") || null,
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
    <dialog ref={dialogRef} aria-labelledby="project-modal-title"
      onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="project-modal-title" className="text-xl font-semibold text-white">{project ? "Edit Project" : "New Project"}</h2>
          <p className="mt-1 text-sm text-slate-400">{project ? "Update your work and track your progress." : "Start tracking your next technical project."}</p>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close project modal"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-50">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">Title
            <input name="title" defaultValue={project?.title ?? ""} required maxLength={255} autoFocus placeholder="e.g. Password Strength Checker" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Description <span className="text-slate-500">(optional)</span>
            <textarea name="description" defaultValue={project?.description ?? ""} rows={3} placeholder="What are you building?" className={`${inputClass} resize-y`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Category
              <input name="category" defaultValue={project?.category ?? ""} required maxLength={255} placeholder="e.g. Cybersecurity" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">Status
              <select name="status" defaultValue={project?.status ?? "Planning"} className={inputClass}>
                {project && !PROJECT_STATUSES.some((status) => status === project.status) && <option>{project.status}</option>}
                {PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Technologies <span className="text-slate-500">(optional, comma-separated)</span>
            <input name="technologies" defaultValue={project?.technologies ?? ""} placeholder="Python,FastAPI,PostgreSQL" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Progress (%)
            <input name="progress" type="number" min={0} max={100} step={1} required defaultValue={project?.progress ?? 0} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">GitHub URL <span className="text-slate-500">(optional)</span>
            <input name="githubUrl" type="url" maxLength={2048} defaultValue={project?.githubUrl ?? ""} placeholder="https://github.com/..." className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Project URL <span className="text-slate-500">(optional)</span>
            <input name="projectUrl" type="url" maxLength={2048} defaultValue={project?.projectUrl ?? ""} placeholder="https://..." className={inputClass} />
          </label>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-900 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Saving..." : project ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
