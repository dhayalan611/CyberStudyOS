export const PROFILE_KEY = "cyberstudy.profile";
export type LearnerProfile = {
  displayName: string;
  headline: string;
  organization: string;
  currentFocus: string;
  bio: string;
  skills: string[];
  learningGoals: string[];
};

export const emptyProfile = (): LearnerProfile => ({
  displayName: "", headline: "", organization: "", currentFocus: "", bio: "", skills: [], learningGoals: [],
});

export function normalizeTag(value: string): string { return value.trim().replace(/\s+/g, " "); }

export function addProfileItem(items: string[], value: string): string[] {
  const item = normalizeTag(value);
  return !item || items.some(existing => normalizeTag(existing).toLowerCase() === item.toLowerCase())
    ? items : [...items, item];
}

export function parseProfile(raw: string | null): LearnerProfile {
  const profile = emptyProfile();
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return profile;
    const record = value as Record<string, unknown>;
    for (const key of ["displayName", "headline", "organization", "currentFocus", "bio"] as const) {
      if (typeof record[key] === "string") profile[key] = record[key];
    }
    for (const key of ["skills", "learningGoals"] as const) {
      if (Array.isArray(record[key])) {
        profile[key] = record[key].reduce<string[]>((items, item: unknown) =>
          typeof item === "string" ? addProfileItem(items, item) : items, []);
      }
    }
  } catch { /* Invalid stored data falls back to an empty local profile. */ }
  return profile;
}

type ProfileStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function readProfile(storage?: ProfileStorage): LearnerProfile {
  try { return parseProfile((storage ?? window.localStorage).getItem(PROFILE_KEY)); }
  catch { return emptyProfile(); }
}
export function saveProfile(profile: LearnerProfile, storage?: ProfileStorage): boolean {
  try {
    (storage ?? window.localStorage).setItem(PROFILE_KEY, JSON.stringify(parseProfile(JSON.stringify(profile))));
    return true;
  } catch { return false; }
}
export function clearProfile(storage?: ProfileStorage): boolean {
  try { (storage ?? window.localStorage).removeItem(PROFILE_KEY); return true; }
  catch { return false; }
}
export function profileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? [words[0], words[words.length - 1]] : words)
    .map(word => Array.from(word)[0]).join("").toUpperCase();
}
