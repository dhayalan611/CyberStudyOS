import { apiFetch } from "./apiClient";

export type HistoryMessage = { role: "user" | "assistant"; content: string };
export type ContextSource = "learning" | "labs" | "notes" | "projects" | "certifications" | "ctf";
export type ChatRequest = { message: string; history: HistoryMessage[]; context_sources: ContextSource[] };
export type ChatResponse = { reply: string };

// Keep browser payloads small; the backend independently enforces its context limit.
const CLIENT_HISTORY_LIMIT = 20;

export function toConversationHistory(
  messages: readonly (HistoryMessage & { isError?: boolean })[],
): HistoryMessage[] {
  return messages.filter((entry) => !entry.isError)
    .slice(-CLIENT_HISTORY_LIMIT)
    .map(({ role, content }) => ({ role, content }));
}

export class AIServiceError extends Error {
  readonly unavailable: boolean;

  constructor(message: string, unavailable: boolean) {
    super(message);
    this.name = "AIServiceError";
    this.unavailable = unavailable;
  }
}

export async function sendMessage(message: string, history: HistoryMessage[] = [], contextSources: ContextSource[] = []): Promise<ChatResponse> {
  const body: ChatRequest = { message, history: toConversationHistory(history), context_sources: [...contextSources] };
  let response: Response;
  try {
    response = await apiFetch(`/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 45000);
  } catch {
    throw new AIServiceError("Sorry, I couldn't reach the AI service. Please try again.", true);
  }

  if (!response.ok) {
    // Use safe local messages rather than displaying arbitrary server bodies.
    const detail = response.status === 429
      ? "The AI service has reached its rate limit or quota. Please try again later."
      : response.status === 422
        ? "The message or conversation history exceeds the allowed limits. Shorten your message or start a new session by refreshing the page."
        : response.status === 504
          ? "The AI service took too long to respond. Please try again."
          : "Sorry, the AI service is unavailable right now. Please try again later.";
    throw new AIServiceError(detail, response.status !== 429 && response.status !== 422);
  }

  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "reply" in data &&
        typeof data.reply === "string" && data.reply.trim()) {
      return { reply: data.reply };
    }
  } catch {
    // A malformed response should never expose parser or server internals.
  }
  throw new AIServiceError("Sorry, the AI service returned no usable reply. Please try again.", true);
}
