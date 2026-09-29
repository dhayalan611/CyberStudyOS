import { apiFetch } from "./apiClient";

export const CTF_STATUSES = ["Not Started", "In Progress", "Completed"] as const;
export const CTF_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type CTFStatus = typeof CTF_STATUSES[number];
export type CTFDifficulty = typeof CTF_DIFFICULTIES[number];

export interface CTFChallenge {
  id: number;
  title: string;
  platform: string;
  category: string;
  difficulty: CTFDifficulty;
  status: CTFStatus;
  points: number;
  flagCaptured: boolean;
  hintsUsed: number;
  notes: string | null;
  challengeUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export type NewCTFChallenge = Pick<CTFChallenge, "title" | "platform" | "category" | "difficulty"> &
  Partial<Pick<CTFChallenge, "status" | "points" | "flagCaptured" | "hintsUsed" | "notes" | "challengeUrl">>;
export type CTFChallengeUpdate = Partial<NewCTFChallenge>;
type ApiChallenge = Omit<CTFChallenge, "flagCaptured" | "hintsUsed" | "challengeUrl" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"> & {
  flag_captured: boolean; hints_used: number; challenge_url: string | null;
  started_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
};

function toChallenge({ flag_captured, hints_used, challenge_url, started_at, completed_at, created_at, updated_at, ...fields }: ApiChallenge): CTFChallenge {
  return { ...fields, flagCaptured: flag_captured, hintsUsed: hints_used, challengeUrl: challenge_url,
    startedAt: started_at, completedAt: completed_at, createdAt: created_at, updatedAt: updated_at };
}

function toPayload(data: CTFChallengeUpdate) {
  // Explicit editable-field allowlist: never submit server-owned timestamps.
  return { title: data.title, platform: data.platform, category: data.category,
    difficulty: data.difficulty, status: data.status, points: data.points,
    flag_captured: data.flagCaptured, hints_used: data.hintsUsed,
    notes: data.notes, challenge_url: data.challengeUrl };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`/api/ctf${path}`, options);
  if (!response.ok) throw new Error(response.status === 404
    ? "Challenge not found. Refresh the page and try again."
    : response.status === 422
      ? "Check the challenge fields. Required text cannot be blank; points and hints must be whole numbers from 0 to 2,147,483,647."
      : `Unable to save or load challenges (${response.status}). Please try again.`);
  return response;
}

export async function getChallenges(signal?: AbortSignal): Promise<CTFChallenge[]> {
  const data: ApiChallenge[] = await (await request("", { signal })).json();
  return data.map(toChallenge);
}
// Retained for detail views and API consumers; current page uses the collection response.
export async function getChallenge(id: number, signal?: AbortSignal): Promise<CTFChallenge> {
  return toChallenge(await (await request(`/${id}`, { signal })).json());
}
export async function createChallenge(data: NewCTFChallenge): Promise<CTFChallenge> {
  return toChallenge(await (await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(data)) })).json());
}
export async function updateChallenge(id: number, data: CTFChallengeUpdate): Promise<CTFChallenge> {
  return toChallenge(await (await request(`/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(data)) })).json());
}
