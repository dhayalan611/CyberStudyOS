import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Braces, Compass, Network, Route, ShieldCheck, Terminal, Wifi, WifiOff } from "lucide-react";
import ChatComposer from "../components/ai/ChatComposer";
import ContextSelector from "../components/ai/ContextSelector";
import ChatMessage, { type StudyMessage } from "../components/ai/ChatMessage";
import { AIServiceError, sendMessage, toConversationHistory, type ContextSource } from "../services/aiApi";

const suggestions = [
  { title: "Explain a cybersecurity concept", detail: "Build a stronger security foundation", icon: ShieldCheck },
  { title: "Quiz me on networking", detail: "Check your understanding of networks", icon: Network },
  { title: "Help me understand Linux", detail: "Explore commands, permissions and processes", icon: Terminal },
  { title: "Explain this code", detail: "Break down the logic, step by step", icon: Braces },
  { title: "Create a study plan", detail: "Give your learning a clear direction", icon: Route },
  { title: "What should I learn next?", detail: "Find the next skill to work on", icon: Compass },
];

export default function AIStudyAssistant() {
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [contextSources, setContextSources] = useState<ContextSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAIStatus] = useState<"ready" | "online" | "offline">("ready");
  const requestPending = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isLoading]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || content.length > 8000 || requestPending.current) return;
    // Snapshot previous turns before appending the newest user message.
    const history = toConversationHistory(messages);
    requestPending.current = true;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content }]);
    setDraft("");
    setIsLoading(true);
    inputRef.current?.focus();
    try {
      const { reply } = await sendMessage(content, history, contextSources);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
      setAIStatus("online");
    } catch (error) {
      const message = error instanceof AIServiceError
        ? error.message
        : "Sorry, I couldn't reach the AI service. Please try again.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: message, isError: true }]);
      if (!(error instanceof AIServiceError) || error.unavailable) setAIStatus("offline");
    } finally {
      requestPending.current = false;
      setIsLoading(false);
    }
  }

  const StatusIcon = aiStatus === "online" ? Wifi : aiStatus === "offline" ? WifiOff : ShieldCheck;

  return <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col gap-3 sm:gap-4">
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Study Assistant</h1>
        <p className="mt-1 text-sm text-slate-400 sm:text-base">Your cybersecurity learning copilot.</p>
      </div>
      <span role="status" className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-medium ${aiStatus === "online" ? "text-cyan-400" : "text-slate-400"}`}><StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />AI {aiStatus === "online" ? "Online" : aiStatus === "offline" ? "Offline" : "Ready"}</span>
    </header>

    <section aria-label="Cybersecurity study workspace" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl shadow-slate-950/20">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-400"><Terminal aria-hidden="true" className="h-4 w-4 text-cyan-400" />Study workspace</span>
        <span className="font-mono text-xs text-slate-500">{messages.length ? `${messages.length} ${messages.length === 1 ? "message" : "messages"}` : "Learn / Practice / Understand"}</span>
      </div>

      <div ref={conversationRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" tabIndex={0} aria-label="Study conversation">
        {messages.length === 0 ? <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-5">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400"><ShieldCheck aria-hidden="true" className="h-7 w-7" /></div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-cyan-500">CyberStudy / Learning assistant</p>
            <h2 className="text-2xl font-semibold text-white">How can I help you study?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">A space to explore cybersecurity, networking, Linux and programming concepts. Ask a question to build your understanding.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map(({ title, detail, icon: Icon }) => <button key={title} type="button" onClick={() => { setDraft(title); inputRef.current?.focus(); }} className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400">
              <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
            </button>)}
          </div>
        </div> : <div className="mx-auto max-w-3xl space-y-4">
          <div role="log" aria-label="Messages" aria-live="polite" className="space-y-4">
            {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
          </div>
          {isLoading && <div role="status"><ChatMessage message={{ id: "thinking", role: "assistant", content: "Thinking..." }} /></div>}
        </div>}
      </div>

      <ContextSelector selected={contextSources} onChange={setContextSources} disabled={isLoading} />
      <ChatComposer value={draft} onChange={setDraft} onSend={handleSend} inputRef={inputRef} isLoading={isLoading} />
    </section>
  </div>;
}
