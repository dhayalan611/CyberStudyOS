export const SETTINGS_KEY = "cyberstudy.settings";
export type Preferences = { version: 1; compactMode: boolean };
export const defaultPreferences = (): Preferences => ({ version: 1, compactMode: false });

export function parsePreferences(raw: string | null): Preferences {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaultPreferences();
    const record = value as Record<string, unknown>;
    if (record.version !== 1) return defaultPreferences();
    return { version: 1, compactMode: record.compactMode === true };
  } catch { return defaultPreferences(); }
}

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readPreferences(storage?: PreferenceStorage): Preferences {
  try { return parsePreferences((storage ?? window.localStorage).getItem(SETTINGS_KEY)); }
  catch { return defaultPreferences(); }
}

export function savePreferences(preferences: Preferences, storage?: PreferenceStorage): boolean {
  try {
    // Whitelist UI fields; never serialize additional caller properties.
    (storage ?? window.localStorage).setItem(SETTINGS_KEY, JSON.stringify({ version: 1, compactMode: preferences.compactMode === true }));
    return true;
  } catch { return false; }
}

export function resetPreferences(storage?: PreferenceStorage): boolean {
  try { (storage ?? window.localStorage).removeItem(SETTINGS_KEY); return true; }
  catch { return false; }
}

export type SettingsContext = {
  preferences: Preferences;
  updateCompactMode: (enabled: boolean) => boolean;
  reset: () => boolean;
};
