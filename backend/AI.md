# AI Study Assistant backend

The stateless `POST /api/ai/chat` endpoint uses the official `google-genai`
Python SDK. Recent conversation context is supplied by React with each request.
No database data is sent unless the user selects application context sources.
Conversations are not saved on the backend.

Requests accept optional history and context sources, both defaulting to empty lists:

```json
{
  "message": "Quiz me on that.",
  "history": [
    {"role": "user", "content": "Explain TCP and UDP."},
    {"role": "assistant", "content": "TCP is connection-oriented..."}
  ],
  "context_sources": []
}
```

Only `user` and `assistant` history roles are accepted. Each entry must contain
nonblank text of at most 32,000 characters. Requests may contain at most 100
history entries; larger requests receive HTTP 422. These bounds and the
20-message context window are defined in `app/schemas/ai.py`. The service sends
only the latest 20 history messages, in order, followed by the newest user
message once. Gemini receives structured `Content` objects with `user` and
`model` roles; the existing system instruction stays separate.

The frontend captures history before adding the newest message. It sends only
role/content pairs and excludes messages marked as frontend errors. Loading
indicators are never stored in conversation state. The browser also limits its
payload to the latest 20 eligible messages. All state is in memory and clears
when leaving or refreshing `/ai`.

`app/config.py` loads `GEMINI_API_KEY` from the backend environment or
`backend/.env` using the existing `pydantic-settings` loader. Environment
variables take precedence. The key is a `SecretStr`, is never included in
prompts or responses, and is not logged by this implementation. `.env` is
ignored by Git. Restart the backend after changing environment settings.

The model is configured once as `GEMINI_MODEL` in `app/config.py`.
The system instruction in `app/services/ai.py` covers cybersecurity,
networking, Linux, programming, cloud fundamentals, and study planning.

## Optional application context

`context_sources` accepts distinct values from `learning`, `labs`, `notes`,
`projects`, `certifications`, and `ctf`. The backend reads only the selected
sources and sends bounded snapshots to Gemini. With an empty list, no application
records are queried for the prompt. Tasks and study sessions are not context sources.

Each source is limited to eight records except notes, which are limited to five.
Text fields are bounded to 300 characters; note content excerpts are limited to
1,000 characters. These limits live in `app/services/ai_context.py`. Selected
context is supplemental data in the user turn, separate from the system instruction.
Selecting notes can send their content excerpts to Gemini; include only material
you intend to share with the provider.

## Test one request in Swagger

This manual check makes a real Gemini request. Use the mocked tests below when
you only need to verify the implementation without calling the provider.

From the project root in PowerShell:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs. Expand **AI Study Assistant → POST
/api/ai/chat**, select **Try it out**, enter the following body, and click
**Execute once**:

```json
{"message": "Explain subnetting simply"}
```

A successful response is HTTP 200 with `{"reply": "..."}`. Each valid
request makes one generation attempt, with a 30-second SDK timeout and
a 2,048-token output limit. There are no automatic retries or model fallbacks.

## Errors

Errors use FastAPI's `detail` field (validation errors contain a detail list).

| Status | Meaning |
| --- | --- |
| 422 | Invalid message, history, or context sources: blank/oversized text, invalid roles, excessive entries, duplicate/unknown sources, unexpected fields |
| 429 | Gemini rate limit or quota reached |
| 503 | Missing key, denied credentials/permissions, unavailable model, or failure to load selected context |
| 504 | Provider request timed out |
| 502 | Provider/network failure or empty text response |

Provider exception messages and request internals are not returned. Missing
Gemini credentials do not prevent other backend routes from starting.

## Offline AI tests

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_ai.py -v
```

These tests mock Gemini and do not make generation calls or database writes.

## Test multi-turn context

Start the backend as above, then run `npm run dev` from `frontend` and open
http://localhost:5173/ai. Send each prompt after the previous reply arrives:

1. "Explain TCP and UDP in two short paragraphs."
2. "Give me 3 quiz questions about what you just explained."
3. "For question 1, my answer is that TCP establishes a connection."

The second reply should quiz you on TCP/UDP, and the third should evaluate your
answer against question 1 of that quiz. In browser developer tools, the second
POST should contain two history entries and the third four; the newest prompt
belongs only in `message`. These three sends make three Gemini generation calls.

## V2 Step 2B authentication and isolation

`POST /api/ai/chat` requires a valid HttpOnly authentication cookie and a trusted
Origin, matching the other private mutations. Missing/invalid/expired cookies
return 401; untrusted origins return 403. Requests cannot select another user ID.
The context loader filters each supported source by the current user before
ordering/limiting records; NULL-owned records are excluded. Learning uses only
owned course summaries, including topic-completion counts. Raw topic text, tasks,
study sessions, and browser-local Profile are not included or selectable sources.
The existing explicit source opt-in and context size limits are unchanged.
All API responses are marked `Cache-Control: no-store`.

Isolation tests create records for two users plus unowned legacy rows and inspect
mocked Gemini payloads in both directions. No real Gemini call is needed.
