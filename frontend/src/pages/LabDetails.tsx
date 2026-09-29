import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FlaskConical, Save } from "lucide-react";
import { getLab, updateLab, LAB_STATUSES, type Lab, type LabUpdate } from "../services/labApi";

function requestError(error: unknown): string {
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Unable to reach the backend. Check that FastAPI is running and try again.";
}

function externalUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function LabContent({ id }: { id: number }) {
  const [lab, setLab] = useState<Lab | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState<"notes" | "status" | null>(null);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getLab(id, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) {
          setLab(loaded);
          setNotes(loaded.notes ?? "");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(requestError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  async function saveChanges(kind: "notes" | "status", changes: LabUpdate) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(kind);
    setSaveError(null);
    setFeedback("");
    try {
      const saved = await updateLab(id, changes);
      setLab(saved);
      // A status response must not overwrite an unsaved notes draft.
      if (kind === "notes") setNotes(saved.notes ?? "");
      setFeedback(kind === "notes" ? "Notes saved" : "Status updated");
    } catch (error: unknown) {
      setSaveError(requestError(error));
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  if (isLoading) return <p role="status" className="text-slate-400">Loading lab...</p>;
  if (loadError) return (
    <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      <p className="text-slate-300">{loadError}</p>
      <button onClick={() => { setLoadError(null); setIsLoading(true); setAttempt((value) => value + 1); }}
        className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Try again</button>
    </div>
  );
  if (!lab) return null;

  const url = externalUrl(lab.labUrl);
  const information = [
    ["Platform", lab.platform], ["Category", lab.category], ["Difficulty", lab.difficulty],
    ["Status", lab.status], ["Created", formatDate(lab.createdAt)],
    ...(lab.completedAt ? [["Completed", formatDate(lab.completedAt)]] : []),
  ];

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2 text-sm text-cyan-400">
              <FlaskConical aria-hidden="true" className="h-5 w-5" /> Lab Details
            </div>
            <h1 className="break-words text-3xl font-bold text-white">{lab.title}</h1>
            <p className="mt-3 break-words text-slate-300">{lab.platform}</p>
            <p className="mt-1 break-words text-sm text-slate-400">{lab.category} &bull; {lab.difficulty}</p>
          </div>
          <span className={`max-w-full break-words rounded-full border px-3 py-1 text-sm ${lab.status === "Completed"
            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            : "border-slate-700 bg-slate-950 text-slate-300"}`}>{lab.status}</span>
        </div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
          Open Lab <ExternalLink aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="lab-information" className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 id="lab-information" className="mb-5 text-lg font-semibold text-white">Progress / Information</h2>
          <dl className="space-y-4 text-sm">
            {information.map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-slate-400">{label}</dt>
              <dd className="break-words text-slate-200">{value}</dd>
            </div>)}
            <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-slate-400">Lab URL</dt>
              <dd className="break-all text-slate-200">{lab.labUrl?.trim() || "Not provided"}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-slate-800 pt-5">
            <label htmlFor="lab-status" className="mb-2 block text-sm font-medium text-slate-300">Update status</label>
            <select id="lab-status" value={lab.status} disabled={saving !== null}
              onChange={(event) => { if (event.target.value !== lab.status) void saveChanges("status", { status: event.target.value }); }}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500 disabled:cursor-wait disabled:opacity-50">
              {!LAB_STATUSES.some((status) => status === lab.status) && <option>{lab.status}</option>}
              {LAB_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            {saving === "status" && <p role="status" className="mt-2 text-sm text-slate-400">Saving status...</p>}
          </div>
        </section>

        <section aria-labelledby="lab-notes-heading" className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 id="lab-notes-heading" className="mb-2 text-lg font-semibold text-white">Notes</h2>
          <p id="lab-notes-help" className="mb-4 text-sm text-slate-400">Record what you practiced. Click Save Notes to save your changes.</p>
          <form onSubmit={(event) => { event.preventDefault(); void saveChanges("notes", { notes }); }}>
            <label htmlFor="lab-notes" className="sr-only">Lab notes</label>
            <textarea id="lab-notes" aria-describedby="lab-notes-help" value={notes} rows={12} disabled={saving === "notes"}
              onChange={(event) => { setNotes(event.target.value); setFeedback(""); }}
              placeholder="Practiced ARP, Ethernet switching and LAN concepts."
              className="w-full resize-y rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:opacity-50" />
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={saving !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-50">
                <Save aria-hidden="true" className="h-4 w-4" /> {saving === "notes" ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </form>
        </section>
      </div>
      {saveError && <p role="alert" className="mt-4 text-sm text-rose-400">{saveError}</p>}
      <p role="status" className="mt-4 text-sm text-cyan-400">{feedback}</p>
    </>
  );
}

export default function LabDetails() {
  const { labId } = useParams<{ labId: string }>();
  const id = Number(labId);
  const validId = /^\d+$/.test(labId ?? "") && Number.isSafeInteger(id) && id > 0 && id <= 2147483647;

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/labs" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Labs
      </Link>
      {validId ? <LabContent key={labId} id={id} /> : (
        <p role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-slate-300">Invalid lab ID. Choose a lab from the Labs page.</p>
      )}
    </div>
  );
}
