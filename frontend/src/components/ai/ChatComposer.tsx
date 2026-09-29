import { useLayoutEffect, type RefObject } from "react";
import { ArrowUp, Terminal } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
};

export default function ChatComposer({ value, onChange, onSend, inputRef, isLoading }: Props) {
  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const resize = () => {
      // Reset before measuring so deleting text also shrinks the composer.
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.value ? Math.min(152, Math.max(48, textarea.scrollHeight)) : 48}px`;
    };
    resize();
    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== width) {
        width = textarea.clientWidth;
        resize();
      }
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [value, inputRef]);

  return <form onSubmit={(event) => { event.preventDefault(); if (!isLoading) onSend(); }} className="shrink-0 border-t border-slate-800 bg-slate-950 px-3 py-2 sm:px-4">
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 transition focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/20">
      <label htmlFor="study-prompt" className="mb-1 flex items-center gap-2 font-mono text-xs text-cyan-400"><Terminal aria-hidden="true" className="h-3.5 w-3.5" />Study prompt</label>
      <div className="flex items-end gap-2">
      <textarea
        ref={inputRef}
        id="study-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            if (!isLoading) onSend();
          }
        }}
        rows={1}
        maxLength={8000}
        aria-describedby="study-composer-help"
        placeholder="Ask about cybersecurity, networking, Linux, code..."
        className="block min-h-12 max-h-[152px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-500"
      />
        <button type="submit" disabled={isLoading || !value.trim()} className="mb-1 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
          Send <ArrowUp aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p id="study-composer-help" className="mt-1 text-xs text-slate-500">Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</p>
    </div>
    <p className="mt-1 text-center text-xs leading-4 text-slate-500">Chat history is not saved. Messages are cleared when you leave or reload.</p>
  </form>;
}
