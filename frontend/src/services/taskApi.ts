import { apiFetch } from "./apiClient";

export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export const TASK_STATUSES = ["To Do", "In Progress", "Completed"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export type NewTask = {
  title: string;
  description: string | null;
  category: string;
  priority: typeof TASK_PRIORITIES[number];
  status: TaskStatus;
  dueDate: string | null;
};
export type Task = NewTask & {
  id: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type ApiTask = Omit<Task, "dueDate" | "completedAt" | "createdAt" | "updatedAt"> & {
  due_date: string | null; completed_at: string | null; created_at: string; updated_at: string;
};
function toTask({ due_date, completed_at, created_at, updated_at, ...task }: ApiTask): Task {
  return { ...task, dueDate: due_date, completedAt: completed_at, createdAt: created_at, updatedAt: updated_at };
}
async function request(path: string, options?: RequestInit) {
  const response = await apiFetch(`/api/tasks${path}`, options);
  if (!response.ok) throw new Error(response.status === 404
    ? "Task not found. Refresh the page and try again."
    : response.status === 422 ? "Check the task fields. Title and category must contain 1–255 characters."
      : `Unable to save or load tasks (${response.status}). Please try again.`);
  return response;
}
export async function getTasks(signal?: AbortSignal): Promise<Task[]> {
  const data: ApiTask[] = await (await request("", { signal })).json();
  return data.map(toTask);
}
async function saveTask(path: string, method: string, { dueDate, ...fields }: Partial<NewTask>): Promise<Task> {
  return toTask(await (await request(path, {
    method, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, ...(dueDate !== undefined ? { due_date: dueDate } : {}) }),
  })).json());
}
export const createTask = (data: NewTask) => saveTask("", "POST", data);
export const updateTask = (id: number, data: Partial<NewTask>) => saveTask(`/${id}`, "PATCH", data);
