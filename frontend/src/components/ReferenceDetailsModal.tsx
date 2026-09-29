import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PORT_CONVENTION_NOTE, type ReferenceItem } from "../data/cyberReferenceData";

type ReferenceDetailsModalProps = { item: ReferenceItem; onClose: () => void };

export default function ReferenceDetailsModal({ item, onClose }: ReferenceDetailsModalProps) {
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
    <dialog ref={dialogRef} aria-labelledby="reference-detail-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/70">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-cyan-400">{item.category}</p>
          <h2 id="reference-detail-title" className="break-words text-2xl font-semibold text-white">{item.title}</h2>
        </div>
        <button type="button" onClick={onClose} autoFocus aria-label="Close reference details"
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      {item.network && <dl className="mb-5 grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div><dt className="text-xs text-slate-400">Common ports</dt><dd className="mt-1 font-mono text-2xl text-cyan-400">{item.network.ports.join(" / ")}</dd></div>
        <div><dt className="text-xs text-slate-400">Common transport</dt><dd className="mt-1 font-mono text-lg text-white">{item.network.transports.join(" / ")}</dd></div>
      </dl>}
      <p className="mb-4 text-base leading-7 text-slate-200">{item.shortDescription}</p>
      <div className="space-y-4 text-sm leading-7 text-slate-400">
        {item.details.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      {item.network && <p className="mt-5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-400">{PORT_CONVENTION_NOTE}</p>}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-5">
        {item.tags.map((tag) => <span key={tag} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">{tag}</span>)}
      </div>
    </dialog>
  );
}
