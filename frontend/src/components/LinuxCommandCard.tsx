import { ArrowUpRight, TriangleAlert } from "lucide-react";
import type { LinuxCommand } from "../data/linuxCommandsData";

type Props = { item: LinuxCommand; onSelect: (item: LinuxCommand) => void };

export default function LinuxCommandCard({ item, onSelect }: Props) {
  return (
    <button type="button" onClick={() => onSelect(item)} aria-haspopup="dialog"
      aria-label={`View ${item.command} command details${item.warning ? ", includes a warning" : ""}`}
      className="group flex h-full min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400">
      <span className="flex w-full items-center justify-between gap-3">
        <span className="break-words font-mono text-2xl font-semibold text-cyan-400"><span aria-hidden="true" className="text-slate-500">$ </span>{item.command}</span>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-cyan-400" />
      </span>
      <span className="mt-2 text-xs text-slate-500">{item.category}</span>
      <span className="mb-4 mt-3 text-sm leading-6 text-slate-400">{item.description}</span>
      <code className="mt-auto w-full break-words rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs leading-6 text-slate-300">{item.examples[0]?.code ?? item.syntax}</code>
      {item.warning && <span className="mt-3 flex items-center gap-2 text-xs text-amber-300/80"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />Read warning before use</span>}
    </button>
  );
}
