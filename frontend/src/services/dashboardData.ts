import { getCourses } from "./courseApi";
import { getTasks } from "./taskApi";
import { getChallenges } from "./ctfApi";
import { getStudySessions } from "./studySessionApi";
import { getProjects } from "./projectApi";
import { getCertifications } from "./certificationApi";

export type ModuleData<T> = { status: "loading" | "ready" | "unavailable"; items: T[] };
export const dashboardLoaders = {
  learning: getCourses, tasks: getTasks, ctf: getChallenges,
  sessions: getStudySessions, projects: getProjects, certifications: getCertifications,
};
export type DashboardKey = keyof typeof dashboardLoaders;
export type DashboardData = { [K in DashboardKey]: ModuleData<Awaited<ReturnType<typeof dashboardLoaders[K]>>[number]> };
export const emptyDashboard = (): DashboardData => ({
  learning: { status: "loading", items: [] }, tasks: { status: "loading", items: [] },
  ctf: { status: "loading", items: [] }, sessions: { status: "loading", items: [] },
  projects: { status: "loading", items: [] }, certifications: { status: "loading", items: [] },
});

// Publish independently so a slow request cannot hide successful sections.
export async function loadDashboard(signal: AbortSignal, publish: <K extends DashboardKey>(key: K, result: DashboardData[K]) => void) {
  async function load<K extends DashboardKey>(key: K) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(abort, 15_000);
    try {
      const items = await dashboardLoaders[key](controller.signal);
      if (!signal.aborted) publish(key, { status: "ready", items } as DashboardData[K]);
    } catch {
      if (!signal.aborted) publish(key, { status: "unavailable", items: [] } as DashboardData[K]);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  }
  await Promise.allSettled((Object.keys(dashboardLoaders) as DashboardKey[]).map(load));
}
