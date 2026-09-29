import type { StudySession } from "../services/studySessionApi";

const pad = (value: number) => String(value).padStart(2, "0");
export function dateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function timeInput(value: string): string {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function calendarTimestamp(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const value = new Date(`${date}T${normalizedTime}`);
  // Reject impossible dates and DST gaps instead of silently normalizing input.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(normalizedTime)
    || Number.isNaN(value.getTime()) || dateKey(value) !== date || timeInput(value.toString()) !== normalizedTime) {
    throw new Error("Enter a valid calendar date and time. This time may not exist in your timezone.");
  }
  const offset = -value.getTimezoneOffset();
  return `${date}T${normalizedTime}${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
export function weekStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return addDays(result, -((result.getDay() + 6) % 7));
}
export function sortSessions(sessions: StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time) || a.id - b.id);
}
export function upcomingSessions(sessions: StudySession[], now: Date): StudySession[] {
  return sortSessions(sessions.filter((session) => session.status === "Planned" && Date.parse(session.start_time) > now.getTime()));
}
export const durationMinutes = (session: StudySession) => (Date.parse(session.end_time) - Date.parse(session.start_time)) / 60_000;
export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  return [hours ? `${hours}h` : "", rounded % 60 || !hours ? `${rounded % 60}m` : ""].filter(Boolean).join(" ");
}
export function weeklyMinutes(sessions: StudySession[], now: Date): number {
  const start = weekStart(now);
  const end = addDays(start, 7);
  return sessions.reduce((total, session) => total + Math.max(0,
    Math.min(Date.parse(session.end_time), end.getTime()) - Math.max(Date.parse(session.start_time), start.getTime())) / 60_000, 0);
}
export const plannerError = (error: unknown) => error instanceof Error && !(error instanceof TypeError)
  ? error.message : "Unable to reach the backend. Check that FastAPI is running and try again.";
