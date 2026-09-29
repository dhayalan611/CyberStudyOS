import { apiFetch } from "./apiClient";

export const LAB_PLATFORMS = ["TryHackMe", "LetsDefend", "CyberDefenders", "Cisco", "Hack The Box", "Other"] as const;
export const LAB_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export const LAB_STATUSES = ["Not Started", "In Progress", "Completed"] as const;
export type LabStatus = typeof LAB_STATUSES[number];

// The backend permits custom strings as well as the suggested select options.
export type Lab = {
  id: number;
  title: string;
  platform: string;
  category: string;
  difficulty: string;
  status: string;
  notes: string | null;
  labUrl: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type NewLab = Pick<Lab, "title" | "platform" | "category" | "difficulty"> &
  Partial<Pick<Lab, "status" | "notes" | "labUrl">>;
export type LabUpdate = Partial<NewLab>;
type ApiLab = Omit<Lab, "labUrl" | "completedAt" | "createdAt"> & {
  lab_url: string | null;
  completed_at: string | null;
  created_at: string;
};

function toLab({ lab_url, completed_at, created_at, ...lab }: ApiLab): Lab {
  return { ...lab, labUrl: lab_url, completedAt: completed_at, createdAt: created_at };
}

function toPayload({ labUrl, ...fields }: LabUpdate) {
  return { ...fields, ...(labUrl !== undefined ? { lab_url: labUrl } : {}) };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`/api/labs${path}`, options);
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Lab not found. Refresh the page and try again."
      : response.status === 422
        ? "Check the required fields (up to 255 characters) and Lab URL (up to 2048 characters)."
        : `Unable to save or load labs (${response.status}). Please try again.`);
  }
  return response;
}

export async function getLabs(signal?: AbortSignal): Promise<Lab[]> {
  const response = await request("", { signal });
  const labs: ApiLab[] = await response.json();
  return labs.map(toLab);
}

export async function getLab(id: number, signal?: AbortSignal): Promise<Lab> {
  return toLab(await (await request(`/${id}`, { signal })).json());
}

export async function createLab(data: NewLab): Promise<Lab> {
  const response = await request("", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(data)),
  });
  return toLab(await response.json());
}

export async function updateLab(id: number, data: LabUpdate): Promise<Lab> {
  const response = await request(`/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(data)),
  });
  return toLab(await response.json());
}
