import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Flag, Lightbulb, Pencil, Plus, Search, Trophy } from "lucide-react";
import AddCTFChallengeModal from "../components/AddCTFChallengeModal";
import { CTF_PLATFORMS } from "../constants/ctfPlatforms";
import { CTF_DIFFICULTIES, CTF_STATUSES, createChallenge, getChallenges, updateChallenge, type CTFChallenge, type CTFStatus, type NewCTFChallenge } from "../services/ctfApi";
import { challengeLink, filterChallenges, summarizeChallenges } from "../utils/ctfTracker";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";
const selectClass = `min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 ${focusClass}`;

export default function CTFTracker() {
  const [challenges, setChallenges] = useState<CTFChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [editor, setEditor] = useState<CTFChallenge | "new" | null>(null);
  const pendingRef = useRef(new Set<number>());
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [actionErrors, setActionErrors] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getChallenges(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setChallenges(data); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  function acceptUpdate(saved: CTFChallenge) {
    setChallenges((current) => current.map((challenge) => challenge.id === saved.id ? saved : challenge));
    setActionErrors((current) => ({ ...current, [saved.id]: "" }));
  }

  async function handleSave(data: NewCTFChallenge) {
    if (editor === "new") {
      const saved = await createChallenge(data);
      setChallenges((current) => [saved, ...current]);
      setNotice(`Created ${saved.title}.`);
    } else if (editor) {
      const saved = await updateChallenge(editor.id, data);
      acceptUpdate(saved);
      setNotice(`Saved ${saved.title}.`);
    }
  }

  async function changeStatus(challenge: CTFChallenge, nextStatus: CTFStatus) {
    if (pendingRef.current.has(challenge.id) || nextStatus === challenge.status) return;
    pendingRef.current.add(challenge.id);
    setPending(new Set(pendingRef.current));
    setActionErrors((current) => ({ ...current, [challenge.id]: "" }));
    setNotice("");
    try {
      const saved = await updateChallenge(challenge.id, { status: nextStatus });
      acceptUpdate(saved);
      setNotice(`${saved.title}: ${saved.status}.`);
    } catch (error: unknown) {
      setActionErrors((current) => ({ ...current, [challenge.id]: error instanceof Error && !(error instanceof TypeError)
        ? error.message : "Unable to save status. Check your connection and try again." }));
    } finally {
      pendingRef.current.delete(challenge.id);
      setPending(new Set(pendingRef.current));
    }
  }

  const customPlatforms = [...new Set(challenges.map((challenge) => challenge.platform))]
    .filter((value) => value !== "Other" && !CTF_PLATFORMS.includes(value))
    .sort((a, b) => a.localeCompare(b));
  const platforms = [...CTF_PLATFORMS, ...customPlatforms];
  const categories = [...new Set(challenges.map((challenge) => challenge.category))].sort((a, b) => a.localeCompare(b));
  // If an edit removes the last member of a dynamic option, fall back to All.
  const activePlatform = platforms.includes(platform) ? platform : "";
  const activeCategory = categories.includes(category) ? category : "";
  const filtered = filterChallenges(challenges, { search, platform: activePlatform, category: activeCategory, status, difficulty });
  const summary = summarizeChallenges(challenges);
  const stats = [
    { label: "Total Challenges", value: summary.total, icon: Flag },
    { label: "Completed", value: summary.completed, icon: CheckCircle2 },
    { label: "Flags Captured", value: summary.captured, icon: Flag },
    { label: "Total Points", value: summary.points, icon: Trophy },
  ];
  function resetFilters() { setSearch(""); setPlatform(""); setCategory(""); setStatus(""); setDifficulty(""); }

  return <div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4"><div className="hidden rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 sm:block"><Flag aria-hidden="true" className="h-6 w-6 text-cyan-400" /></div>
        <div><h1 className="text-3xl font-bold text-white">CTF Tracker</h1><p className="mt-2 text-slate-400">Track challenges, captured flags and CTF progress.</p></div></div>
      <button onClick={() => setEditor("new")} disabled={isLoading || loadError} className={`flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 ${focusClass}`}><Plus aria-hidden="true" className="h-4 w-4" />Add Challenge</button>
    </header>
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-400">{label}</p><Icon aria-hidden="true" className="h-4 w-4 text-cyan-400" /></div>
      <p className="mt-3 font-mono text-2xl font-semibold text-white">{isLoading || loadError ? "—" : value.toLocaleString()}</p>
    </div>)}</div>
    {!isLoading && !loadError && <p className="mb-6 text-xs text-slate-400">{summary.percentage}% complete · Points count completed challenges only · Statistics cover all challenges.</p>}
    <div className="mb-3 mt-6 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 focus-within:border-cyan-500"><Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><input type="search" aria-label="Search challenges" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, platform, category, or notes..." className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <select aria-label="Filter by platform" value={activePlatform} onChange={(event) => setPlatform(event.target.value)} className={selectClass}><option value="">All Platforms</option>{platforms.map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter by category" value={activeCategory} onChange={(event) => setCategory(event.target.value)} className={selectClass}><option value="">All Categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}><option value="">All Statuses</option>{CTF_STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={selectClass}><option value="">All Difficulties</option>{CTF_DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    <p role="status" className="mb-3 text-sm text-cyan-300">{notice}</p>
    {isLoading && <p role="status" className="text-slate-400">Loading challenges...</p>}
    {loadError && <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"><p className="text-slate-300">Unable to load challenges.</p><button onClick={() => { setIsLoading(true); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }} className={`mt-3 rounded text-sm text-cyan-400 ${focusClass}`}>Try again</button></div>}
    {!isLoading && !loadError && <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-slate-500">{filtered.length} of {challenges.length} challenges</p>{(search || activePlatform || activeCategory || status || difficulty) && <button onClick={resetFilters} className={`rounded text-cyan-400 ${focusClass}`}>Reset filters</button>}</div>
      {filtered.length === 0 ? <div role="status" className="rounded-xl border border-dashed border-slate-700 p-10 text-center"><Flag aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" /><p className="text-slate-300">No challenges found.</p><p className="mt-2 text-sm text-slate-500">{challenges.length ? "Try another search or adjust your filters." : "Add your first challenge to start tracking progress."}</p></div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((challenge) => {
          const url = challengeLink(challenge.challengeUrl);
          const saving = pending.has(challenge.id);
          return <article key={challenge.id} aria-busy={saving} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{challenge.difficulty}</span><span className={`inline-flex items-center gap-1.5 text-xs ${challenge.flagCaptured ? "text-cyan-300" : "text-slate-500"}`}><Flag aria-hidden="true" className="h-3.5 w-3.5" />{challenge.flagCaptured ? "Captured" : "Not captured"}</span></div>
            <h2 className="break-words text-lg font-semibold text-white">{challenge.title}</h2><p className="mt-1 break-words text-sm text-cyan-400">{challenge.platform}</p><p className="mt-1 break-words text-sm text-slate-400">{challenge.category}</p>
            <div className="my-4 flex flex-wrap gap-4 text-sm text-slate-300"><span className="inline-flex items-center gap-1.5"><Trophy aria-hidden="true" className="h-4 w-4 text-slate-500" />{challenge.points.toLocaleString()} points</span><span className="inline-flex items-center gap-1.5"><Lightbulb aria-hidden="true" className="h-4 w-4 text-slate-500" />{challenge.hintsUsed.toLocaleString()} hints used</span></div>
            <div className="mt-auto"><label className="block text-xs text-slate-400">Status<select aria-label={`Status for ${challenge.title}`} value={challenge.status} disabled={saving || editor !== null} onChange={(event) => void changeStatus(challenge, event.target.value as CTFStatus)} className={`${selectClass} mt-2 w-full disabled:opacity-50`}>{CTF_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>
              {saving && <p role="status" className="mt-2 text-xs text-cyan-400">Saving status...</p>}
              {actionErrors[challenge.id] && <p role="alert" className="mt-2 text-sm text-rose-400">{actionErrors[challenge.id]}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-4"><button onClick={() => setEditor(challenge)} disabled={saving} aria-label={`Edit challenge: ${challenge.title}`} className={`inline-flex items-center gap-2 rounded text-sm text-cyan-400 disabled:opacity-50 ${focusClass}`}><Pencil aria-hidden="true" className="h-4 w-4" />Edit Challenge</button>
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded text-sm text-slate-400 hover:text-cyan-300 ${focusClass}`}><ExternalLink aria-hidden="true" className="h-4 w-4" />Open Challenge</a>}
              </div>
            </div>
          </article>;
        })}</div>}
      <section aria-labelledby="ctf-category-title" className="mt-8 border-t border-slate-800 pt-5"><h2 id="ctf-category-title" className="font-semibold text-white">Solved by category</h2>
        {summary.categories.length ? <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">{summary.categories.map(({ category: name, count }) => <div key={name}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="min-w-0 break-words text-slate-300">{name}</span><span className="shrink-0 font-mono text-cyan-300">{count} solved</span></div><div aria-hidden="true" className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${count / summary.completed * 100}%` }} /></div></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Complete a challenge to see your category breakdown.</p>}
      </section>
    </>}
    {editor !== null && <AddCTFChallengeModal key={editor === "new" ? "new" : editor.id} challenge={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={handleSave} />}
  </div>;
}
