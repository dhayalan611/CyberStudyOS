import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, FlaskConical, Percent, Plus, Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AddLabModal from "../components/AddLabModal";
import {
  createLab, getLabs, updateLab, LAB_DIFFICULTIES, LAB_PLATFORMS, LAB_STATUSES,
  type Lab, type NewLab,
} from "../services/labApi";

const selectClass = "min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500";

export default function Labs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const savingRef = useRef(new Set<number>());
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    getLabs(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setLabs(data); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  async function handleAddLab(data: NewLab) {
    const lab = await createLab(data);
    setLabs((current) => [...current, lab]);
  }

  async function handleStatusChange(lab: Lab, nextStatus: string) {
    if (savingRef.current.has(lab.id) || nextStatus === lab.status) return;
    savingRef.current.add(lab.id);
    setSavingIds(new Set(savingRef.current));
    setSaveErrors((current) => ({ ...current, [lab.id]: "" }));
    try {
      const savedLab = await updateLab(lab.id, { status: nextStatus });
      setLabs((current) => current.map((item) => item.id === savedLab.id ? savedLab : item));
    } catch (error: unknown) {
      setSaveErrors((current) => ({ ...current, [lab.id]:
        error instanceof Error && !(error instanceof TypeError)
          ? error.message : "Unable to update status. Check that FastAPI is running and try again.",
      }));
    } finally {
      savingRef.current.delete(lab.id);
      setSavingIds(new Set(savingRef.current));
    }
  }

  const completed = labs.filter((lab) => lab.status === "Completed").length;
  const stats = [
    { label: "Total Labs", value: labs.length, icon: FlaskConical },
    { label: "In Progress", value: labs.filter((lab) => lab.status === "In Progress").length, icon: Clock3 },
    { label: "Completed", value: completed, icon: CheckCircle2 },
    { label: "Completion Rate", value: `${labs.length ? Math.round(completed / labs.length * 100) : 0}%`, icon: Percent },
  ];
  const query = search.trim().toLowerCase();
  const filteredLabs = labs.filter((lab) =>
    [lab.title, lab.platform, lab.category].some((value) => value.toLowerCase().includes(query)) &&
    (!platform || lab.platform === platform) && (!status || lab.status === status) &&
    (!difficulty || lab.difficulty === difficulty),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Labs</h1>
          <p className="mt-2 text-slate-400">Track your cybersecurity hands-on practice.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} disabled={isLoading || loadError}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Lab
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{label}</p>
              <Icon aria-hidden="true" className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{isLoading || loadError ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(3,auto)]">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 focus-within:border-cyan-500">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <input aria-label="Search labs" placeholder="Search labs..." value={search} onChange={(event) => setSearch(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </div>
        <select aria-label="Filter by platform" value={platform} onChange={(event) => setPlatform(event.target.value)} className={selectClass}>
          <option value="">All Platforms</option>
          {LAB_PLATFORMS.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {LAB_STATUSES.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={selectClass}>
          <option value="">All Difficulties</option>
          {LAB_DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      {isLoading && <p role="status" className="text-slate-400">Loading labs...</p>}
      {loadError && <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-slate-300">Unable to load labs.</p>
        <button onClick={() => { setIsLoading(true); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }}
          className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Try again</button>
      </div>}
      {!isLoading && !loadError && (filteredLabs.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <FlaskConical aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" />
          <p className="text-slate-300">No labs found.</p>
          <p className="mt-2 text-sm text-slate-500">{labs.length ? "Try another search or adjust your filters." : "Add your first lab to start tracking your practice."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredLabs.map((lab) => (
            <article key={lab.id} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 p-3"><FlaskConical aria-hidden="true" className="h-5 w-5 text-cyan-400" /></div>
                <p className="min-w-0 break-words text-sm font-medium text-slate-400">{lab.platform}</p>
              </div>
              <h2 className="break-words text-lg font-semibold text-white">{lab.title}</h2>
              <p className="mt-2 break-words text-sm text-slate-400">{lab.category}</p>
              <div className="mb-5 mt-4 flex flex-wrap gap-2">
                <span className="break-words rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">{lab.difficulty}</span>
                <span className={`break-words rounded-full border px-3 py-1 text-xs ${lab.status === "Completed" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{lab.status}</span>
              </div>
              <div className="mt-auto border-t border-slate-800 pt-4">
                <label htmlFor={`lab-status-${lab.id}`} className="mb-2 block text-xs font-medium text-slate-400">Update status</label>
                <select id={`lab-status-${lab.id}`} aria-label={`Status for ${lab.title}`} value={lab.status} disabled={savingIds.has(lab.id)}
                  onChange={(event) => void handleStatusChange(lab, event.target.value)}
                  className={`${selectClass} w-full py-2 disabled:cursor-wait disabled:opacity-50`}>
                  {!LAB_STATUSES.some((value) => value === lab.status) && <option>{lab.status}</option>}
                  {LAB_STATUSES.map((value) => <option key={value}>{value}</option>)}
                </select>
                {savingIds.has(lab.id) && <p role="status" className="mt-2 text-xs text-slate-400">Saving status...</p>}
                {saveErrors[lab.id] && <p role="alert" className="mt-2 text-sm text-rose-400">{saveErrors[lab.id]}</p>}
                <Link to={`/labs/${lab.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300">
                  View Details <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ))}
      {isModalOpen && <AddLabModal onClose={() => setIsModalOpen(false)} onAddLab={handleAddLab} />}
    </div>
  );
}
