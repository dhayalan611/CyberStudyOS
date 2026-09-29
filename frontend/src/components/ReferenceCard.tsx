import { ArrowUpRight, BookOpen } from "lucide-react";
import type { ReferenceItem } from "../data/cyberReferenceData";

type ReferenceCardProps = { item: ReferenceItem; onSelect: (item: ReferenceItem) => void };

export default function ReferenceCard({ item, onSelect }: ReferenceCardProps) {
  return (
    <button type="button" onClick={() => onSelect(item)} aria-haspopup="dialog"
      aria-label={`Read more about ${item.title}${item.network ? `, port ${item.network.ports.join(" / ")}` : ""}`}
      className="group flex h-full min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400">
      <span className="mb-4 flex w-full items-center justify-between gap-3">
        {item.network ? <>
          <span className="font-mono text-2xl font-semibold text-cyan-400">{item.network.ports.join(" / ")}</span>
          <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">{item.network.transports.join(" / ")}</span>
        </> : <>
          <BookOpen aria-hidden="true" className="h-5 w-5 text-cyan-400" />
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-600 group-hover:text-cyan-400" />
        </>}
      </span>
      <span className="break-words text-lg font-semibold text-white">{item.title}</span>
      <span className="mt-1 text-xs text-slate-500">{item.category}</span>
      <span className="mb-5 mt-3 text-sm leading-6 text-slate-400">{item.shortDescription}</span>
      <span className="mt-auto flex flex-wrap gap-2">
        {item.tags.map((tag) => <span key={tag} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">{tag}</span>)}
      </span>
    </button>
  );
}
