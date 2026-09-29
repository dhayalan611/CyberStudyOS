import { useEffect, useRef, useState } from "react";
import { CheckCheck, ListTodo, Pencil, Plus } from "lucide-react";
import TaskModal from "../components/TaskModal";
import { createTask, getTasks, updateTask, TASK_PRIORITIES, TASK_STATUSES, type NewTask, type Task } from "../services/taskApi";
import { isOverdue, sortTasks } from "../utils/tasks";

const controlClass = "min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500";
const errorMessage = (error: unknown) => error instanceof Error && !(error instanceof TypeError) ? error.message : "Unable to reach the backend. Check that FastAPI is running and try again.";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const pendingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getTasks(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setTasks(data); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  function replace(saved: Task) {
    setTasks((current) => current.map((task) => task.id === saved.id ? saved : task));
  }
  async function save(data: NewTask) {
    if (editor === "new") {
      const saved = await createTask(data);
      setTasks((current) => [...current, saved]);
    } else if (editor) {
      replace(await updateTask(editor.id, data));
      if (category === editor.category && data.category !== editor.category && !tasks.some((task) => task.id !== editor.id && task.category === category)) setCategory("");
    }
  }
  async function toggleComplete(task: Task) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(task.id);
    setSaveError(null);
    try { replace(await updateTask(task.id, { status: task.status === "Completed" ? "To Do" : "Completed" })); }
    catch (error) { setSaveError(errorMessage(error)); }
    finally { pendingRef.current = false; setPending(null); }
  }
  const categories = [...new Set(tasks.map((task) => task.category))].sort((a, b) => a.localeCompare(b));
  const query = search.trim().toLowerCase();
  const visible = sortTasks(tasks.filter((task) => (!category || task.category === category)
    && (!status || task.status === status) && (!priority || task.priority === priority)
    && (!overdueOnly || isOverdue(task, now))
    && `${task.title} ${task.category} ${task.description ?? ""}`.toLowerCase().includes(query)));
  const stats = [
    { label: "Total Tasks", count: tasks.length },
    { label: "In Progress", count: tasks.filter((task) => task.status === "In Progress").length },
    { label: "Completed", count: tasks.filter((task) => task.status === "Completed").length },
    { label: "Overdue", count: tasks.filter((task) => isOverdue(task, now)).length },
  ];
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">Tasks</h1><p className="mt-2 text-slate-400">Turn your learning goals into daily progress.</p></div>
        <button disabled={loading || !!loadError || pending !== null} onClick={() => { setSaveError(null); setEditor("new"); }} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />New Task</button>
      </div>
      {loading ? <p role="status" className="text-slate-400">Loading tasks...</p> : loadError ? (
        <div role="alert" className="rounded-xl border border-rose-500/30 p-5 text-rose-400"><p>{loadError}</p><button onClick={() => { setLoading(true); setLoadError(null); setAttempt((v) => v + 1); }} className="mt-3 text-cyan-400">Try again</button></div>
      ) : <>
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"><p className="text-sm text-slate-400">{stat.label}</p><p className="mt-3 text-3xl font-bold text-white">{stat.count}</p></div>)}</div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={(event) => setSearch(event.target.value)} className={controlClass} />
          <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={controlClass}><option value="">All categories</option>{categories.map((v) => <option key={v}>{v}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={controlClass}><option value="">All statuses</option>{TASK_STATUSES.map((v) => <option key={v}>{v}</option>)}</select>
          <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)} className={controlClass}><option value="">All priorities</option>{TASK_PRIORITIES.map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <label className="flex items-center gap-2"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} className="accent-cyan-500" />Overdue only</label>
          <button onClick={() => { setSearch(""); setCategory(""); setStatus(""); setPriority(""); setOverdueOnly(false); }} className="text-cyan-400">Clear filters</button>
          <span aria-live="polite">{visible.length} of {tasks.length} tasks</span>
        </div>
        {saveError && <p role="alert" className="mb-4 text-sm text-rose-400">{saveError}</p>}
        {!visible.length ? <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-400"><ListTodo aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-cyan-400" /><p>{tasks.length ? "No tasks match your filters." : "Create your first task to plan your next study session."}</p></div> : (
          <div className="space-y-3">{visible.map((task) => <article key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold text-white">{task.title}</h2><p className="mt-1 break-words text-sm text-slate-400">{task.category}</p></div>
              <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-300">{task.status}</span><span className={`rounded-full px-3 py-1 ${task.priority === "High" ? "bg-rose-500/10 text-rose-300" : "bg-slate-800 text-slate-300"}`}>{task.priority} priority</span></div>
            </div>
            {task.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-400">{task.description}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className={`text-sm ${isOverdue(task, now) ? "text-rose-400" : "text-slate-400"}`}>{isOverdue(task, now) ? "Overdue · " : ""}{task.dueDate ? <>Due <time dateTime={task.dueDate}>{new Date(task.dueDate).toLocaleString()}</time></> : "No due date"}</p>
              <div className="flex gap-3">
                <button disabled={pending !== null} onClick={() => { setSaveError(null); setEditor(task); }} aria-label={`Edit task: ${task.title}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-50"><Pencil aria-hidden="true" className="h-4 w-4" />Edit</button>
                <button disabled={pending !== null} onClick={() => void toggleComplete(task)} aria-label={`${task.status === "Completed" ? "Reopen" : "Complete"} task: ${task.title}`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-2 text-sm text-cyan-400 disabled:opacity-50"><CheckCheck aria-hidden="true" className="h-4 w-4" />{pending === task.id ? "Saving..." : task.status === "Completed" ? "Reopen" : "Complete"}</button>
              </div>
            </div>
          </article>)}</div>
        )}
      </>}
      {editor !== null && <TaskModal key={editor === "new" ? "new" : editor.id} task={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={save} />}
    </div>
  );
}
