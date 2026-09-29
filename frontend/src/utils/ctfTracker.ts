import type { CTFChallenge } from "../services/ctfApi";

export interface CTFFilters { search: string; platform: string; category: string; status: string; difficulty: string }

export function filterChallenges(challenges: CTFChallenge[], filters: CTFFilters): CTFChallenge[] {
  const query = filters.search.trim().toLowerCase();
  return challenges.filter((challenge) =>
    [challenge.title, challenge.platform, challenge.category, challenge.notes ?? ""].some((value) => value.toLowerCase().includes(query)) &&
    (!filters.platform || challenge.platform === filters.platform) &&
    (!filters.category || challenge.category === filters.category) &&
    (!filters.status || challenge.status === filters.status) &&
    (!filters.difficulty || challenge.difficulty === filters.difficulty)
  ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id);
}

export function summarizeChallenges(challenges: CTFChallenge[]) {
  const completed = challenges.filter((challenge) => challenge.status === "Completed");
  const categories = new Map<string, number>();
  for (const challenge of completed) categories.set(challenge.category, (categories.get(challenge.category) ?? 0) + 1);
  return {
    total: challenges.length, completed: completed.length,
    captured: challenges.filter((challenge) => challenge.flagCaptured).length,
    points: completed.reduce((sum, challenge) => sum + challenge.points, 0),
    percentage: challenges.length ? Math.round(completed.length / challenges.length * 100) : 0,
    categories: [...categories].map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  };
}

export function challengeLink(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}
