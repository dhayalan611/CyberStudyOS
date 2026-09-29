import { X } from "lucide-react";
import type { ContextSource } from "../../services/aiApi";

const sources: { value: ContextSource; label: string }[] = [
  { value: "learning", label: "My Learning" },
  { value: "labs", label: "Labs" },
  { value: "notes", label: "Notes" },
  { value: "projects", label: "Projects" },
  { value: "certifications", label: "Certifications" },
  { value: "ctf", label: "CTF Progress" },
];

type Props = {
  selected: ContextSource[];
  onChange: (sources: ContextSource[]) => void;
  disabled: boolean;
};

export default function ContextSelector({ selected, onChange, disabled }: Props) {
  function toggle(source: ContextSource) {
    onChange(selected.includes(source) ? selected.filter((item) => item !== source) : [...selected, source]);
  }

  return <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-2 sm:px-5">
    <details className="relative">
      <summary className="w-fit cursor-pointer rounded text-xs font-medium text-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-400">Context{selected.length > 0 ? ` (${selected.length})` : " (none selected)"}</summary>
      <fieldset disabled={disabled} className="absolute bottom-full z-10 mb-2 w-72 max-w-full rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl disabled:opacity-60">
        <legend className="sr-only">Application context to share with AI</legend>
        <p className="mb-2 text-xs leading-5 text-slate-400">Share a limited snapshot of selected sources with AI for your next message.</p>
        <div className="grid grid-cols-2 gap-2">
          {sources.map(({ value, label }) => <label key={value} className="flex items-center gap-2 text-xs text-slate-200">
            <input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} className="accent-cyan-400" />{label}
          </label>)}
        </div>
      </fieldset>
    </details>
    {selected.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="Selected context sources">
      {sources.filter(({ value }) => selected.includes(value)).map(({ value, label }) => <button key={value} type="button" disabled={disabled} onClick={() => toggle(value)} aria-label={`Remove ${label} context`} className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-cyan-400">
        {label}<X aria-hidden="true" className="h-3 w-3" />
      </button>)}
    </div>}
  </div>;
}
