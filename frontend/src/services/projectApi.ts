import { apiFetch } from "./apiClient";

export const PROJECT_STATUSES = ["Planning", "In Progress", "Completed", "On Hold"] as const;

export type Project = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  technologies: string | null;
  githubUrl: string | null;
  projectUrl: string | null;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewProject = Pick<Project, "title" | "category"> &
  Partial<Pick<Project, "description" | "status" | "technologies" | "githubUrl" | "projectUrl" | "progress" | "startedAt">>;
export type ProjectUpdate = Partial<NewProject>;
type ApiProject = Omit<Project, "githubUrl" | "projectUrl" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"> & {
  github_url: string | null;
  project_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toProject({ github_url, project_url, started_at, completed_at, created_at, updated_at, ...project }: ApiProject): Project {
  return { ...project, githubUrl: github_url, projectUrl: project_url, startedAt: started_at,
    completedAt: completed_at, createdAt: created_at, updatedAt: updated_at };
}

function toPayload({ githubUrl, projectUrl, startedAt, ...fields }: ProjectUpdate) {
  return { ...fields,
    ...(githubUrl !== undefined ? { github_url: githubUrl } : {}),
    ...(projectUrl !== undefined ? { project_url: projectUrl } : {}),
    ...(startedAt !== undefined ? { started_at: startedAt } : {}),
  };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`/api/projects${path}`, options);
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Project not found. Refresh the page and try again."
      : response.status === 422
        ? "Check the project fields. Progress must be an integer from 0 to 100; title, category, and status must be 1–255 characters."
        : `Unable to save or load projects (${response.status}). Please try again.`);
  }
  return response;
}

export async function getProjects(signal?: AbortSignal): Promise<Project[]> {
  const projects: ApiProject[] = await (await request("", { signal })).json();
  return projects.map(toProject);
}

// Retained for detail views and API consumers; current page uses the collection response.
export async function getProject(id: number, signal?: AbortSignal): Promise<Project> {
  return toProject(await (await request(`/${id}`, { signal })).json());
}

export async function createProject(data: NewProject): Promise<Project> {
  return toProject(await (await request("", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(data)),
  })).json());
}

export async function updateProject(id: number, data: ProjectUpdate): Promise<Project> {
  return toProject(await (await request(`/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(data)),
  })).json());
}
