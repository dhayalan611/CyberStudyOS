import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { STUDY_SESSION_STATUSES, type NewStudySession, type StudySession } from "../services/studySessionApi";
import { calendarTimestamp, dateKey, plannerError, timeInput } from "../utils/studySessions";

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500";

export default function AddStudySessionModal({ session, onClose, onSave }: {
  session?: StudySession; onClose: () => void; onSave: (data: NewStudySession) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spansDays = session && dateKey(session.start_time) !== dateKey(session.end_time);
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
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    setError(null);
    try {
      if (!value("title") || !value("category")) throw new Error("Enter a title and category.");
      const timestamp = (field: "start_time" | "end_time", day: string, time: string) => {
        // Preserve the exact instant and subsecond precision for untouched fields.
        const normalizedTime = time.length === 5 ? `${time}:00` : time;
        if (session && day === dateKey(session[field]) && normalizedTime === timeInput(session[field])) return session[field];
        return calendarTimestamp(day, time);
      };
      const start_time = timestamp("start_time", value("date"), value("start"));
      const end_time = timestamp("end_time", spansDays ? value("endDate") : value("date"), value("end"));
      if (Date.parse(end_time) <= Date.parse(start_time)) throw new Error("End time must be later than start time.");
      submitting.current = true;
      setSaving(true);
      await onSave({ title: value("title"), category: value("category"), description: value("description") || null,
        start_time, end_time, status: value("status") as NewStudySession["status"] });
      onClose();
    } catch (cause) { setError(plannerError(cause)); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <dialog ref={dialogRef} aria-labelledby="session-editor-title"
    onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="session-editor-title" className="text-xl font-semibold text-white">{session ? "Edit Session" : "Schedule Session"}</h2>
      <button type="button" disabled={saving} onClick={onClose} aria-label="Close session editor" className="rounded-lg p-2 hover:bg-slate-800 disabled:opacity-50"><X className="h-5 w-5" /></button>
    </div>
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm">Title<input autoFocus name="title" required maxLength={255} defaultValue={session?.title ?? ""} placeholder="e.g. VLSM Practice" className={inputClass} /></label>
        <label className="block text-sm">Category<input name="category" required maxLength={255} defaultValue={session?.category ?? ""} placeholder="e.g. Networking" className={inputClass} /></label>
        <label className="block text-sm">Description (optional)<textarea name="description" rows={3} defaultValue={session?.description ?? ""} className={inputClass} /></label>
        <label className="block text-sm">Date<input type="date" name="date" required defaultValue={session ? dateKey(session.start_time) : dateKey(new Date())} className={inputClass} /></label>
        {spansDays && <label className="block text-sm">End date<input type="date" name="endDate" required defaultValue={dateKey(session.end_time)} className={inputClass} /></label>}
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">Start Time<input type="time" step="1" name="start" required defaultValue={session ? timeInput(session.start_time) : ""} className={inputClass} /></label>
          <label className="block text-sm">End Time<input type="time" step="1" name="end" required defaultValue={session ? timeInput(session.end_time) : ""} className={inputClass} /></label>
        </div>
        <p className="text-xs text-slate-500">Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
        <label className="block text-sm">Status<select name="status" defaultValue={session?.status ?? "Planned"} className={inputClass}>{STUDY_SESSION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
        <button disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? "Saving..." : session ? "Save Changes" : "Schedule Session"}</button>
      </div>
    </form>
  </dialog>;
}
