import { apiFetch } from "./apiClient";

export const STUDY_SESSION_STATUSES = ["Planned", "Completed", "Skipped"] as const;
export type StudySessionStatus = typeof STUDY_SESSION_STATUSES[number];
export type NewStudySession = {
  title: string;
  category: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: StudySessionStatus;
};
// Keep API timestamp strings intact, including their timezone offsets.
export type StudySession = NewStudySession & { id: number; created_at: string; updated_at: string };

async function request(path: string, options?: RequestInit): Promise<StudySession | StudySession[]> {
  const response = await apiFetch(`/api/study-sessions${path}`, options);
  if (!response.ok) {
    let message = response.status === 404 ? "Study session not found. Refresh and try again."
      : `Unable to save or load study sessions (${response.status}). Please try again.`;
    if (response.status === 422) {
      const body = await response.json().catch(() => null);
      const detail: unknown = body?.detail;
      message = typeof detail === "string" ? detail : Array.isArray(detail)
        ? detail.map((item) => `${Array.isArray(item.loc) ? item.loc.filter((part: unknown) => part !== "body").join(" · ") : ""}: ${item.msg ?? "Invalid value"}`).join("; ")
        : "Check the session fields. End time must be later than start time.";
    }
    throw new Error(message);
  }
  return response.json();
}
export const getStudySessions = (signal?: AbortSignal) => request("", { signal }) as Promise<StudySession[]>;
// Retained for detail consumers and service contract tests.
export const getStudySession = (id: number, signal?: AbortSignal) => request(`/${id}`, { signal }) as Promise<StudySession>;
function save(path: string, method: string, data: Partial<NewStudySession>) {
  return request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) as Promise<StudySession>;
}
export const createStudySession = (data: NewStudySession) => save("", "POST", data);
export const updateStudySession = (id: number, data: Partial<NewStudySession>) => save(`/${id}`, "PATCH", data);
