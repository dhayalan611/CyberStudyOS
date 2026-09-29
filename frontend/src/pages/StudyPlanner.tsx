import { useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Clock3, Pencil, Plus } from "lucide-react";
import AddStudySessionModal from "../components/AddStudySessionModal";
import { createStudySession, getStudySessions, updateStudySession, STUDY_SESSION_STATUSES, type NewStudySession, type StudySession, type StudySessionStatus } from "../services/studySessionApi";
import { addDays, dateKey, durationMinutes, formatDuration, plannerError, sortSessions, upcomingSessions, weeklyMinutes, weekStart } from "../utils/studySessions";

const controlClass = "rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500 disabled:opacity-50";
const dateLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
const clockLabel = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
const badgeClass = { Planned: "border-cyan-900 text-cyan-300", Completed: "border-emerald-900 text-emerald-300", Skipped: "border-slate-700 text-slate-400" };

function SessionCard({ session, busy, onEdit, onStatus }: {
  session: StudySession; busy: boolean; onEdit: () => void; onStatus: (status: StudySessionStatus) => void;
}) {
  return <article className="min-w-0 rounded-lg border border-slate-800 border-l-cyan-700 bg-slate-950/70 p-4">
    <div className="flex items-center gap-2 font-mono text-xs text-cyan-300">
      <time dateTime={session.start_time}>{clockLabel(session.start_time)}</time><span className="h-px min-w-3 flex-1 bg-slate-800" />
      <time dateTime={session.end_time}>{dateKey(session.start_time) !== dateKey(session.end_time) && `${new Date(session.end_time).toLocaleDateString()} `}{clockLabel(session.end_time)}</time>
    </div>
    <div className="mt-3 flex items-start justify-between gap-2">
      <h3 className="min-w-0 break-words font-semibold text-white">{session.title}</h3>
      <button disabled={busy} onClick={onEdit} aria-label={`Edit ${session.title}`} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-50"><Pencil className="h-4 w-4" /></button>
    </div>
    <p className="mt-1 break-words text-xs text-slate-400">{session.category}</p>
    {session.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-400">{session.description}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{formatDuration(durationMinutes(session))}</span>
      <select aria-label={`Status for ${session.title}`} value={session.status} disabled={busy} onChange={(event) => onStatus(event.target.value as StudySessionStatus)}
        className={`rounded-md border bg-slate-950 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${badgeClass[session.status]}`}>
        {STUDY_SESSION_STATUSES.map((status) => <option key={status}>{status}</option>)}
      </select>
    </div>
  </article>;
}

export default function StudyPlanner() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<"Today" | "Week" | "Upcoming">("Today");
  const [category, setCategory] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [editor, setEditor] = useState<StudySession | "new" | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const pendingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getStudySessions(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSessions(data); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoadError(plannerError(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  function replace(saved: StudySession) {
    setSessions((current) => current.map((session) => session.id === saved.id ? saved : session));
  }
  async function save(data: NewStudySession) {
    if (editor === "new") {
      const saved = await createStudySession(data);
      setSessions((current) => [...current, saved]);
    } else if (editor) replace(await updateStudySession(editor.id, data));
  }
  async function changeStatus(session: StudySession, status: StudySessionStatus) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(session.id);
    setSaveError(null);
    try { replace(await updateStudySession(session.id, { status })); }
    catch (error) { setSaveError(plannerError(error)); }
    finally { pendingRef.current = false; setPending(null); }
  }
  const categories = [...new Set(sessions.map((session) => session.category))].sort((a, b) => a.localeCompare(b));
  const activeCategory = categories.includes(category) ? category : "";
  const visible = sortSessions(sessions.filter((session) => !activeCategory || session.category === activeCategory));
  const today = dateKey(now);
  const todaysSessions = visible.filter((session) => dateKey(session.start_time) === today);
  const upcoming = upcomingSessions(visible, now);
  const start = addDays(weekStart(now), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const upcomingDates = [...new Set(upcoming.map((session) => dateKey(session.start_time)))];
  const summaries = [
    { label: "Today's Sessions", value: sessions.filter((session) => dateKey(session.start_time) === today).length, icon: CalendarDays },
    { label: "Upcoming", value: upcomingSessions(sessions, now).length, icon: ChevronRight },
    { label: "Completed", value: sessions.filter((session) => session.status === "Completed").length, icon: CheckCheck },
    { label: "Study Time This Week", value: formatDuration(weeklyMinutes(sessions, now)), icon: Clock3 },
  ];
  const card = (session: StudySession) => <SessionCard key={session.id} session={session} busy={pending !== null}
    onEdit={() => { setSaveError(null); setEditor(session); }} onStatus={(status) => { void changeStatus(session, status); }} />;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-white">Study Planner</h1><p className="mt-2 text-slate-400">Plan your study sessions and stay consistent.</p></div>
      <button disabled={loading || !!loadError || pending !== null} onClick={() => setEditor("new")} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"><Plus className="h-4 w-4" />Schedule Session</button>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaries.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between gap-2 text-sm text-slate-400"><span>{label}</span><Icon className="h-4 w-4 text-cyan-500" /></div>
        <p className="mt-3 text-2xl font-semibold text-white">{loading || loadError ? "—" : value}</p>
        {label === "Study Time This Week" && <p className="mt-1 text-xs text-slate-500">Mon–Sun · all statuses</p>}
      </div>)}
    </div>
    <section aria-label="Study schedule" className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1" aria-label="Schedule view">
          {(["Today", "Week", "Upcoming"] as const).map((name) => <button key={name} aria-pressed={view === name} onClick={() => setView(name)} className={`rounded-md px-3 py-2 text-sm ${view === name ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:text-white"}`}>{name}</button>)}
        </div>
        <select aria-label="Filter by category" value={activeCategory} onChange={(event) => setCategory(event.target.value)} className={`${controlClass} max-w-full`}><option value="">All Categories</option>{categories.map((name) => <option key={name}>{name}</option>)}</select>
      </div>
      {saveError && <p role="alert" className="mb-4 text-sm text-rose-400">{saveError}</p>}
      {pending !== null && <p role="status" className="mb-4 text-sm text-cyan-300">Updating session status...</p>}
      {loading ? <p role="status" className="py-8 text-center text-slate-400">Loading study planner...</p>
        : loadError ? <div role="alert" className="py-8 text-center"><p className="text-rose-400">Unable to load study sessions.</p><p className="mt-2 text-sm text-slate-400">{loadError}</p><button className="mt-4 text-cyan-400" onClick={() => { setLoading(true); setLoadError(null); setAttempt((value) => value + 1); }}>Try again</button></div>
          : <>
            {sessions.length === 0 && <p className="mb-4 text-sm text-slate-400">No study sessions found. Schedule your first session to get started.</p>}
            {activeCategory && visible.length === 0 && <p className="mb-4 text-slate-400">No study sessions found.</p>}
            {view === "Today" && <div><h2 className="mb-4 text-sm font-medium text-slate-300">{dateLabel(now)}</h2>
              {todaysSessions.length ? <div className="grid gap-3 lg:grid-cols-2">{todaysSessions.map(card)}</div> : <p className="py-8 text-center text-slate-500">No study sessions scheduled for today.{activeCategory && " Try another category."}</p>}
            </div>}
            {view === "Week" && <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-slate-300">{start.toLocaleDateString()} – {days[6].toLocaleDateString()}</h2>
                <div className="flex flex-wrap gap-2"><button className={`${controlClass} flex items-center gap-1`} onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft className="h-4 w-4" />Previous Week</button><button className={controlClass} onClick={() => setWeekOffset(0)}>Today</button><button className={`${controlClass} flex items-center gap-1`} onClick={() => setWeekOffset((value) => value + 1)}>Next Week<ChevronRight className="h-4 w-4" /></button></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {days.map((day) => {
                  const key = dateKey(day);
                  const scheduled = visible.filter((session) => dateKey(session.start_time) === key);
                  return <section key={key} className={`min-w-0 rounded-lg border p-3 ${key === today ? "border-cyan-900 bg-cyan-950/10" : "border-slate-800"}`}>
                    <h3 className={`mb-3 text-sm font-medium ${key === today ? "text-cyan-300" : "text-slate-300"}`}>{day.toLocaleDateString(undefined, { weekday: "long" })}<span className="ml-2 text-xs text-slate-500">{day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></h3>
                    <div className="space-y-3">{scheduled.length ? scheduled.map(card) : <p className="py-5 text-xs text-slate-500">No sessions scheduled.</p>}</div>
                  </section>;
                })}
              </div>
            </div>}
            {view === "Upcoming" && <div className="space-y-6">
              {upcomingDates.length ? upcomingDates.map((key) => {
                const group = upcoming.filter((session) => dateKey(session.start_time) === key);
                return <section key={key}><h2 className="mb-3 text-sm font-medium text-slate-300">{dateLabel(new Date(group[0].start_time))}</h2><div className="grid gap-3 lg:grid-cols-2">{group.map(card)}</div></section>;
              }) : <p className="py-8 text-center text-slate-500">No upcoming study sessions.{activeCategory && " Try another category."}</p>}
            </div>}
          </>}
    </section>
    {editor && <AddStudySessionModal session={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={save} />}
  </div>;
}
