import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert, X } from "lucide-react";
import type { LinuxCommand } from "../data/linuxCommandsData";

function CopyableCode({ code, label }: { code: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); };
  }, []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      if (mounted.current) setStatus("copied");
    } catch {
      if (mounted.current) setStatus("error");
    }
    if (mounted.current) timer.current = setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div>
      <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-cyan-200">{code}</code>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`}
          className="flex shrink-0 items-center gap-1.5 rounded p-1 text-xs text-slate-400 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400">
          {status === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          <span>{status === "copied" ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <p role="status" aria-live="polite" className={status === "error" ? "mt-2 text-xs text-amber-300" : "sr-only"}>
        {status === "copied" ? `${label} copied.` : status === "error" ? "Couldn't copy. Select the command text and copy it manually." : ""}
      </p>
    </div>
  );
}

export default function LinuxCommandDetailsModal({ item, onClose }: { item: LinuxCommand; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="linux-command-title" aria-describedby="linux-command-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-300 shadow-2xl backdrop:bg-black/70 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-cyan-400">{item.category}</p>
          <h2 id="linux-command-title" className="break-words font-mono text-2xl font-semibold text-white">{item.command}</h2>
        </div>
        <button type="button" onClick={onClose} autoFocus aria-label="Close command details"
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <p id="linux-command-description" className="mb-5 text-sm leading-7 text-slate-300">{item.description}</p>
      {item.warning && <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200/90">
        <p className="mb-1 flex items-center gap-2 font-medium"><TriangleAlert aria-hidden="true" className="h-4 w-4" />Warning</p>
        <p>{item.warning}</p>
      </div>}
      <section aria-labelledby="linux-syntax-title">
        <h3 id="linux-syntax-title" className="mb-2 text-sm font-semibold text-white">Syntax</h3>
        <CopyableCode code={item.syntax} label="syntax" />
        <p className="mt-2 text-xs leading-5 text-slate-500">Square brackets mark optional arguments; ... means repeatable. Replace placeholders before using syntax in a shell.</p>
      </section>
      <section aria-labelledby="linux-examples-title" className="mt-6">
        <h3 id="linux-examples-title" className="mb-3 text-sm font-semibold text-white">Examples</h3>
        <p className="mb-4 text-xs leading-5 text-slate-500">File examples assume your own practice files exist. Available options may vary by distribution and shell.</p>
        <div className="space-y-4">{item.examples.map((example, index) => <div key={example.code}>
          <CopyableCode code={example.code} label={`example ${index + 1}`} />
          <p className="mt-2 text-sm leading-6 text-slate-400">{example.explanation}</p>
        </div>)}</div>
      </section>
      <section aria-labelledby="linux-tags-title" className="mt-6 border-t border-slate-800 pt-5">
        <h3 id="linux-tags-title" className="mb-3 text-sm font-semibold text-white">Tags</h3>
        <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">{tag}</span>)}</div>
      </section>
    </dialog>
  );
}
