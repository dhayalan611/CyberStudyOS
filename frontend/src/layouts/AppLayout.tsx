import { Outlet, useMatch } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useState } from "react";
import { defaultPreferences, readPreferences, resetPreferences, savePreferences, type SettingsContext } from "../utils/settings";

function AppLayout() {
  const isAIStudy = useMatch("/ai");
  const [preferences, setPreferences] = useState(readPreferences);
  const settings: SettingsContext = {
    preferences,
    updateCompactMode(enabled) {
      const next = { ...preferences, compactMode: enabled };
      setPreferences(next);
      return savePreferences(next);
    },
    reset() {
      setPreferences(defaultPreferences());
      return resetPreferences();
    },
  };
  return (
    <div data-compact={preferences.compactMode} className="app-layout flex h-dvh overflow-hidden bg-slate-950">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />

        <main className={`min-h-0 flex-1 bg-slate-900 p-8 ${isAIStudy ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
          <Outlet context={settings} />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
