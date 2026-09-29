import {
  Search,
  Flame,
  Bot,
  Bell,
} from "lucide-react";

import { Link } from "react-router-dom";

function Topbar() {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">

      {/* Left */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white">
          CyberStudy OS
        </span>

        <span className="text-slate-600">/</span>

        <span className="text-sm text-slate-400">
          Workstation
        </span>
      </div>

      {/* Search */}
      <div className="mx-4 hidden min-w-0 max-w-xl xl:flex flex-1 items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2">

        <Search className="h-4 w-4 text-slate-500" />

        <input
          type="text"
          disabled
          aria-label="Global search is coming soon"
          placeholder="Global search coming soon"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />



      </div>

      {/* Right */}
      <div className="flex items-center gap-3">

        <button disabled aria-label="Notifications coming soon" title="Notifications coming soon" className="rounded-lg p-2 text-slate-500 opacity-60">
          <Bell className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 xl:flex">
          <Flame className="h-4 w-4 text-orange-400" />

          <span className="text-sm font-medium text-orange-300">
            Streak coming soon
          </span>
        </div>

        <Link to="/ai" className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          <Bot className="h-4 w-4" />
          Ask AI
        </Link>

      </div>

    </header>
  );
}

export default Topbar;
