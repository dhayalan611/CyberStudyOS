import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { TASK_PRIORITIES, TASK_STATUSES, type NewTask, type Task } from "../services/taskApi";
import { toLocalDateTime } from "../utils/tasks";

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500";

export default function TaskModal({ task, onClose, onSave }: {
  task?: Task; onClose: () => void; onSave: (data: NewTask) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (focused instanceof HTMLElement) focused.focus();
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const fields = new FormData(event.currentTarget);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    if (!value("title") || !value("category")) { setError("Enter a title and category."); return; }
    const localDue = value("dueDate");
    const date = localDue ? new Date(localDue) : null;
    if (date && Number.isNaN(date.getTime())) { setError("Enter a valid due date and time."); return; }
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: value("title"), category: value("category"), description: value("description") || null,
        priority: value("priority") as NewTask["priority"], status: value("status") as NewTask["status"],
        // Preserve seconds and the original offset when the user has not changed the date.
        dueDate: task && localDue === toLocalDateTime(task.dueDate) ? task.dueDate : date?.toISOString() ?? null,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Unable to reach the backend. Check that FastAPI is running and try again.");
    } finally { submittingRef.current = false; setSaving(false); }
  }
  return (
    <dialog ref={dialogRef} aria-labelledby="task-modal-title"
      onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="task-modal-title" className="text-xl font-semibold text-white">{task ? "Edit Task" : "New Task"}</h2>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close task editor" className="rounded-lg p-2 hover:bg-slate-900 disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm">Title<input name="title" required maxLength={255} autoFocus defaultValue={task?.title ?? ""} placeholder="e.g. Practice VLSM" className={inputClass} /></label>
          <label className="block text-sm">Description (optional)<textarea name="description" rows={3} defaultValue={task?.description ?? ""} className={inputClass} /></label>
          <label className="block text-sm">Category<input name="category" required maxLength={255} defaultValue={task?.category ?? ""} placeholder="e.g. Networking" className={inputClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Priority<select name="priority" defaultValue={task?.priority ?? "Medium"} className={inputClass}>{TASK_PRIORITIES.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className="block text-sm">Status<select name="status" defaultValue={task?.status ?? "To Do"} className={inputClass}>{TASK_STATUSES.map((v) => <option key={v}>{v}</option>)}</select></label>
          </div>
          <label className="block text-sm">Due date (optional, local time)<input type="datetime-local" name="dueDate" defaultValue={toLocalDateTime(task?.dueDate ?? null)} className={inputClass} /></label>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? "Saving..." : task ? "Save Changes" : "Create Task"}</button>
        </div>
      </form>
    </dialog>
  );
}
