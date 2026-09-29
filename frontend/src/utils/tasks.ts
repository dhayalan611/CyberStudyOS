import type { Task } from "../services/taskApi";

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => Number(a.status === "Completed") - Number(b.status === "Completed")
    || (a.dueDate === null ? b.dueDate === null ? 0 : 1 : b.dueDate === null ? -1 : Date.parse(a.dueDate) - Date.parse(b.dueDate))
    || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    || Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
}
export function isOverdue(task: Task, now = Date.now()): boolean {
  return task.status !== "Completed" && task.dueDate !== null && Date.parse(task.dueDate) < now;
}
export function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
