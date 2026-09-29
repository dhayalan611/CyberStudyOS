import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckSquare, Flag, Clock, Plus, CalendarDays, Bot, Network, RefreshCw } from "lucide-react";
import { emptyDashboard, loadDashboard, type ModuleData } from "../services/dashboardData";
import { activeCourses, todaysSessions, priorityTasks, recentActivity, recentRecords } from "../utils/dashboard";
import { formatDuration, weeklyMinutes } from "../utils/studySessions";
import { isOverdue } from "../utils/tasks";
import { summarizeChallenges } from "../utils/ctfTracker";
import "./Dashboard.css";

const linkStyle = "rounded text-sm font-medium text-cyan-400 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400";
const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dateTime = (value: string) => new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Panel({ title, to, action, children }: { title: string; to?: string; action?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold text-white">{title}</h2>
      {to && <Link to={to} className={linkStyle}>{action}</Link>}
    </div>{children}
  </section>;
}
function Loading() {
  return <div role="status" className="space-y-3"><span className="sr-only">Loading dashboard data</span>
    {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-800/60 motion-safe:animate-pulse" />)}
  </div>;
}
function Content({ data, empty, children }: { data: ModuleData<unknown>; empty: string; children: ReactNode }) {
  if (data.status === "loading") return <Loading />;
  if (data.status === "unavailable") return <p role="status" className="text-sm text-slate-400">Temporarily unavailable. Use Refresh to try again.</p>;
  if (!data.items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return children;
}

export default function Dashboard() {
  const [data, setData] = useState(emptyDashboard);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal, (key, result) => setData((current) => ({ ...current, [key]: result })));
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const learning = activeCourses(data.learning.items);
  const tasks = priorityTasks(data.tasks.items, now);
  const sessions = todaysSessions(data.sessions.items, now);
  const ctf = summarizeChallenges(data.ctf.items);
  const activity = recentActivity({ tasks: data.tasks.items, ctf: data.ctf.items, sessions: data.sessions.items, projects: data.projects.items, certifications: data.certifications.items });
  const activitySources = [data.tasks, data.ctf, data.sessions, data.projects, data.certifications];
  const activityLoading = activitySources.some((source) => source.status === "loading");
  const unavailable = activitySources.filter((source) => source.status === "unavailable").length;
  const projects = recentRecords(data.projects.items).sort((a, b) => Number(b.status === "In Progress" || b.status === "Planning") - Number(a.status === "In Progress" || a.status === "Planning")).slice(0, 2);
  const certifications = recentRecords(data.certifications.items).sort((a, b) => Number(b.status === "In Progress") - Number(a.status === "In Progress")).slice(0, 2);
  const stats = [
    { title: "Learning", value: `${learning.length} Active`, description: "Courses below 100% progress", icon: BookOpen, data: data.learning },
    { title: "Tasks", value: `${tasks.length} Pending`, description: "Incomplete tasks", icon: CheckSquare, data: data.tasks },
    { title: "CTF", value: `${ctf.captured} ${ctf.captured === 1 ? "Flag" : "Flags"}`, description: "Flags captured", icon: Flag, data: data.ctf },
    { title: "Study Time", value: formatDuration(weeklyMinutes(data.sessions.items, now)), description: "This Week · Scheduled · Mon–Sun", icon: Clock, data: data.sessions },
  ];
  return <div className="dashboard-page w-full min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium uppercase tracking-wider text-cyan-400">Learning Workstation</p>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Your cybersecurity study overview · {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
      </div>
      <button type="button" onClick={() => { setData(emptyDashboard()); setNow(new Date()); setAttempt((value) => value + 1); }} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-500 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"><RefreshCw className="h-4 w-4" />Refresh</button>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ title, value, description, icon: Icon, data: source }) => <section key={title} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm text-slate-400">{title}</h2><div className="rounded-lg bg-cyan-500/10 p-2"><Icon className="h-4 w-4 text-cyan-400" /></div></div>
        {source.status === "loading" ? <div role="status" className="h-9 w-32 rounded bg-slate-800 motion-safe:animate-pulse"><span className="sr-only">Loading {title}</span></div>
          : <p className={source.status === "ready" ? "text-3xl font-bold text-white" : "text-sm text-slate-400"}>{source.status === "ready" ? value : "Temporarily unavailable"}</p>}
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      </section>)}
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel title="Today's Study Plan" to="/planner" action="View Planner">
        <Content data={{ ...data.sessions, items: sessions }} empty="No sessions scheduled today. Open the Planner to schedule some study time.">
          <ul className="divide-y divide-slate-800">{sessions.slice(0, 4).map((session) => <li key={session.id} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"><span className="text-cyan-400"><time dateTime={session.start_time}>{time(session.start_time)}</time> – {time(session.end_time)}</span><span className="text-slate-400">{session.status}</span></div>
            <p className="break-words text-sm font-medium text-slate-200">{session.title}</p><p className="mt-1 text-xs text-slate-500">{session.category}</p>
          </li>)}</ul>
        </Content>
      </Panel>
      <Panel title="Priority Tasks" to="/tasks" action="View Tasks">
        <Content data={{ ...data.tasks, items: tasks }} empty="No pending tasks. Open Tasks to plan your next step.">
          <ul className="divide-y divide-slate-800">{tasks.slice(0, 4).map((task) => <li key={task.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-medium text-slate-200">{task.title}</p><span className={`shrink-0 rounded px-2 py-0.5 text-xs ${task.priority === "High" ? "bg-amber-500/10 text-amber-300" : "bg-slate-800 text-slate-400"}`}>{task.priority}</span></div>
            <p className="mt-1 text-xs text-slate-500">{task.category} · {task.status}</p>
            <p className={`mt-1 text-xs ${isOverdue(task, now.getTime()) ? "text-rose-400" : "text-slate-400"}`}>{task.dueDate ? <>{isOverdue(task, now.getTime()) ? "Overdue" : "Due"} · <time dateTime={task.dueDate}>{dateTime(task.dueDate)}</time></> : "No due date"}</p>
          </li>)}</ul>
        </Content>
      </Panel>
      <Panel title="Learning Progress" to="/learning" action="View Learning">
        <Content data={{ ...data.learning, items: learning }} empty="No active courses. Open My Learning to add a course or review completed work.">
          <ul className="space-y-4">{learning.slice(0, 4).map((course) => <li key={course.id}>
            <p className="break-words text-sm font-medium text-slate-200">{course.title}</p>
            <div className="my-2 flex justify-between gap-3 text-xs text-slate-400"><span>{course.category} · {course.progress > 0 ? "In progress" : "Not started"}</span><span>{course.progress}%</span></div>
            <div role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${course.progress}%` }} /></div>
          </li>)}</ul>
        </Content>
      </Panel>
      <Panel title="CTF Progress" to="/ctf" action="View CTF Tracker">
        {data.ctf.status === "ready" ? <>
          <dl className="grid grid-cols-2 gap-3">{[["Total Challenges", ctf.total], ["Completed", ctf.completed], ["Flags Captured", ctf.captured], ["Completed Points", ctf.points]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-2 text-2xl font-semibold text-white">{value}</dd></div>)}</dl>
          {!ctf.total && <p className="mt-4 text-sm text-slate-400">Add your first challenge in the CTF Tracker.</p>}
        </> : <Content data={data.ctf} empty="">{null}</Content>}
      </Panel>
    </div>
    <Panel title="Projects & Certifications">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0"><Link to="/projects" className={linkStyle}>View Projects</Link><div className="mt-3"><Content data={data.projects} empty="No projects yet. Add a project to track your practical work."><ul className="space-y-3">{projects.map((project) => <li key={project.id}><p className="break-words text-sm text-slate-200">{project.title}</p><p className="mt-1 text-xs text-slate-500">{project.category} · {project.status} · {project.progress}%</p></li>)}</ul></Content></div></div>
        <div className="min-w-0"><Link to="/certifications" className={linkStyle}>View Certifications</Link><div className="mt-3"><Content data={data.certifications} empty="No certifications yet. Add a certification goal to get started."><ul className="space-y-3">{certifications.map((certification) => <li key={certification.id}><p className="break-words text-sm text-slate-200">{certification.name}</p><p className="mt-1 text-xs text-slate-500">{certification.issuer} · {certification.status}</p></li>)}</ul></Content></div></div>
      </div>
    </Panel>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
      <Panel title="Recent Activity">
        {unavailable > 0 && <p className="mb-3 text-xs text-slate-400">{unavailable === activitySources.length ? "Activity sources are temporarily unavailable. Use Refresh to try again." : "Some sources are unavailable; showing activity from loaded modules."}</p>}
        {activity.length > 0 && <ul className="space-y-4">{activity.map((event) => <li key={event.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div className="min-w-0"><p className="mb-1 text-xs text-slate-500">{event.action}</p><Link className={`${linkStyle} break-words`} to={event.to}>{event.title}</Link></div><time className="text-xs text-slate-500" dateTime={event.timestamp}>{dateTime(event.timestamp)}</time></li>)}</ul>}
        {activityLoading && <div className="mt-3"><Loading /></div>}
        {!activityLoading && !activity.length && unavailable < activitySources.length && <p className="text-sm text-slate-400">No recent activity in the available records yet.</p>}
      </Panel>
      <Panel title="Quick Actions">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">{[
          { label: "Open Tasks", to: "/tasks", icon: Plus }, { label: "Open Planner", to: "/planner", icon: CalendarDays },
          { label: "Open AI Assistant", to: "/ai", icon: Bot }, { label: "CTF Tracker", to: "/ctf", icon: Flag }, { label: "Networking Tools", to: "/networking", icon: Network },
        ].map(({ label, to, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-lg border border-slate-800 px-3 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-400"><Icon className="h-4 w-4 shrink-0 text-cyan-400" />{label}</Link>)}</div>
      </Panel>
    </div>
  </div>;
}
