import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, FolderGit2, GitFork, Pencil, Percent, Plus, Search } from "lucide-react";
import AddProjectModal from "../components/AddProjectModal";
import { createProject, getProjects, updateProject, PROJECT_STATUSES, type NewProject, type Project } from "../services/projectApi";

const selectClass = "min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500";

function externalUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Project | "new" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getProjects(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setProjects(data); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  async function handleSave(data: NewProject) {
    if (editor === "new") {
      const saved = await createProject(data);
      setProjects((current) => [...current, saved]);
    } else if (editor) {
      const saved = await updateProject(editor.id, data);
      setProjects((current) => current.map((project) => project.id === saved.id ? saved : project));
      if (category === editor.category && saved.category !== editor.category &&
          !projects.some((project) => project.id !== editor.id && project.category === category)) {
        setCategory("");
      }
    }
  }

  const categories = [...new Set(projects.map((project) => project.category))].sort((a, b) => a.localeCompare(b));
  const averageProgress = projects.length ? projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0;
  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderGit2 },
    { label: "In Progress", value: projects.filter((project) => project.status === "In Progress").length, icon: Clock3 },
    { label: "Completed", value: projects.filter((project) => project.status === "Completed").length, icon: CheckCircle2 },
    { label: "Average Progress", value: `${Number(averageProgress.toFixed(1))}%`, icon: Percent },
  ];
  const query = search.trim().toLowerCase();
  const filteredProjects = projects.filter((project) =>
    [project.title, project.description ?? "", project.technologies ?? ""].some((value) => value.toLowerCase().includes(query)) &&
    (!category || project.category === category) && (!status || project.status === status),
  ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="mt-2 text-slate-400">Build, track and showcase your technical work.</p>
        </div>
        <button onClick={() => setEditor("new")} disabled={isLoading || loadError}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus aria-hidden="true" className="h-4 w-4" /> New Project
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
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 focus-within:border-cyan-500 sm:col-span-2 xl:col-span-1">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <input aria-label="Search projects" placeholder="Search title, description, or technologies..." value={search} onChange={(event) => setSearch(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </div>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {PROJECT_STATUSES.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {categories.map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      {isLoading && <p role="status" className="text-slate-400">Loading projects...</p>}
      {loadError && <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-slate-300">Unable to load projects.</p>
        <button onClick={() => { setIsLoading(true); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }}
          className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Try again</button>
      </div>}
      {!isLoading && !loadError && (filteredProjects.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <FolderGit2 aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" />
          <p className="text-slate-300">No projects found.</p>
          <p className="mt-2 text-sm text-slate-500">{projects.length ? "Try another search or adjust your filters." : "Create your first project to start tracking your work."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const technologies = [...new Set((project.technologies ?? "").split(",").map((value) => value.trim()).filter(Boolean))];
            const githubUrl = externalUrl(project.githubUrl);
            const projectUrl = externalUrl(project.projectUrl);
            return (
              <article key={project.id} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-cyan-500/10 p-3"><FolderGit2 aria-hidden="true" className="h-5 w-5 text-cyan-400" /></div>
                  <span className={`break-words rounded-full border px-3 py-1 text-xs ${project.status === "Completed" || project.status === "In Progress" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{project.status}</span>
                </div>
                <h2 className="line-clamp-2 break-words text-lg font-semibold text-white">{project.title}</h2>
                <p className="mt-2 break-words text-sm text-slate-400">{project.category}</p>
                <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{project.description || "No description yet."}</p>
                <div className="mb-5 mt-4 flex flex-wrap gap-2">
                  {technologies.map((technology) => <span key={technology} className="max-w-full break-words rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">{technology}</span>)}
                </div>
                <div className="mt-auto">
                  <div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-400">Progress</span><span className="font-medium text-white">{project.progress}%</span></div>
                  <div role="progressbar" aria-label={`Progress for ${project.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.progress}
                    className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                    <button onClick={() => setEditor(project)} aria-label={`Edit project: ${project.title}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-900">
                      <Pencil aria-hidden="true" className="h-4 w-4" /> Edit Project
                    </button>
                    {githubUrl && <a href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`GitHub for ${project.title}`}
                      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><GitFork aria-hidden="true" className="h-4 w-4" /> GitHub</a>}
                    {projectUrl && <a href={projectUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open project: ${project.title}`}
                      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><ExternalLink aria-hidden="true" className="h-4 w-4" /> Open Project</a>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}
      {editor !== null && <AddProjectModal key={editor === "new" ? "new" : editor.id} project={editor === "new" ? undefined : editor}
        onClose={() => setEditor(null)} onSave={handleSave} />}
    </div>
  );
}
