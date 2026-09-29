import type { Course } from "../data/courses";
import type { Task } from "../services/taskApi";
import type { CTFChallenge } from "../services/ctfApi";
import type { StudySession } from "../services/studySessionApi";
import type { Project } from "../services/projectApi";
import type { Certification } from "../services/certificationApi";
import { dateKey, sortSessions } from "./studySessions";
import { isOverdue } from "./tasks";

// Courses expose progress, but no status. Include unstarted courses.
export const activeCourses = (courses: Course[]) => courses.filter((course) => course.progress < 100);
export const todaysSessions = (sessions: StudySession[], now: Date) =>
  sortSessions(sessions.filter((session) => dateKey(session.start_time) === dateKey(now)));

export function priorityTasks(tasks: Task[], now: Date): Task[] {
  const due = (task: Task) => task.dueDate ? Date.parse(task.dueDate) : Infinity;
  return tasks.filter((task) => task.status !== "Completed").sort((a, b) =>
    Number(isOverdue(b, now.getTime())) - Number(isOverdue(a, now.getTime()))
    || Number(b.priority === "High") - Number(a.priority === "High")
    || due(a) - due(b) || a.id - b.id);
}

export type Activity = { id: string; title: string; action: string; timestamp: string; to: string };
type ActivitySources = { tasks: Task[]; ctf: CTFChallenge[]; sessions: StudySession[]; projects: Project[]; certifications: Certification[] };
export function recentActivity(data: ActivitySources): Activity[] {
  const events: Activity[] = [];
  const add = (id: string, title: string, action: string, timestamp: string | null, to: string) => {
    if (timestamp && Number.isFinite(Date.parse(timestamp))) events.push({ id, title, action, timestamp, to });
  };
  data.tasks.filter((task) => task.status === "Completed").forEach((task) =>
    add(`task-${task.id}`, task.title, "Task completed", task.completedAt, "/tasks"));
  data.ctf.filter((challenge) => challenge.status === "Completed").forEach((challenge) =>
    add(`ctf-${challenge.id}`, challenge.title, "Challenge completed", challenge.completedAt, "/ctf"));
  // No completed_at exists for sessions: updated_at is not a completion time.
  data.sessions.filter((session) => session.status === "Completed").forEach((session) =>
    add(`session-${session.id}`, session.title, "Completed session updated", session.updated_at, "/planner"));
  for (const [prefix, records, to] of [
    ["Project", data.projects, "/projects"], ["Certification", data.certifications, "/certifications"],
  ] as const) {
    records.forEach((record) => {
      const updated = Number.isFinite(Date.parse(record.updatedAt)) && Date.parse(record.updatedAt) > Date.parse(record.createdAt);
      add(`${prefix}-${record.id}`, "title" in record ? record.title : record.name,
        `${prefix} ${updated ? "updated" : "added"}`, updated ? record.updatedAt : record.createdAt, to);
    });
  }
  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.id.localeCompare(b.id)).slice(0, 5);
}

export function recentRecords<T extends { id: number; createdAt: string; updatedAt: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt) || b.id - a.id);
}
