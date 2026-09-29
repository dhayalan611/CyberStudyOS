import { ShieldCheck, UserRound } from "lucide-react";

export type StudyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};

export default function ChatMessage({ message }: { message: StudyMessage }) {
  const isUser = message.role === "user";
  const Icon = isUser ? UserRound : ShieldCheck;

  return <article className="flex min-w-0 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isUser ? "bg-slate-800 text-slate-300" : "bg-cyan-500/10 text-cyan-400"}`}>
      <Icon aria-hidden="true" className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">{isUser ? "You" : "AI Assistant"}</h3>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200 [overflow-wrap:anywhere]">{message.content}</p>
    </div>
  </article>;
}
