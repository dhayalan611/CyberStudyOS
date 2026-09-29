import { useState } from "react";
import { Search, Terminal, X } from "lucide-react";
import LinuxCommandCard from "../components/LinuxCommandCard";
import LinuxCommandDetailsModal from "../components/LinuxCommandDetailsModal";
import { filterLinuxCommands, LINUX_CATEGORIES, linuxCommandsData, type LinuxCommand, type LinuxFilter } from "../data/linuxCommandsData";

const filters: LinuxFilter[] = ["All", ...LINUX_CATEGORIES];

export default function LinuxCommands() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LinuxFilter>("All");
  const [selected, setSelected] = useState<LinuxCommand | null>(null);
  const filtered = filterLinuxCommands(linuxCommandsData, search, category);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="hidden rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 sm:block"><Terminal aria-hidden="true" className="h-6 w-6 text-cyan-400" /></div>
        <div>
          <h1 className="text-3xl font-bold text-white">Linux Commands</h1>
          <p className="mt-2 text-slate-400">Quick-reference Linux commands for administration, networking and cybersecurity labs.</p>
        </div>
      </div>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-4 focus-within:border-cyan-500">
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-cyan-400" />
        <input type="search" aria-label="Search Linux commands" placeholder="Search commands, descriptions, syntax..."
          value={search} onChange={(event) => setSearch(event.target.value)}
          className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"
          className="rounded p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"><X aria-hidden="true" className="h-4 w-4" /></button>}
      </div>
      <div role="group" aria-label="Linux command category" className="mb-5 flex flex-wrap gap-2">
        {filters.map((filter) => <button key={filter} type="button" aria-pressed={category === filter} onClick={() => setCategory(filter)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${category === filter ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
          {filter}
        </button>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status" aria-live="polite" className="text-slate-500">{filtered.length} {filtered.length === 1 ? "command" : "commands"}{category !== "All" ? ` in ${category}` : " across all categories"}</p>
        {(search || category !== "All") && <button type="button" onClick={() => { setSearch(""); setCategory("All"); }}
          className="rounded text-cyan-400 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400">Reset filters</button>}
      </div>
      {filtered.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => <LinuxCommandCard key={item.id} item={item} onSelect={setSelected} />)}
      </div> : <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
        <Search aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" />
        <p className="text-slate-300">No commands found.</p>
        <p className="mt-2 text-sm text-slate-500">Try another keyword or category, or reset the filters.</p>
      </div>}
      {selected && <LinuxCommandDetailsModal key={selected.id} item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
