# CTF Tracker frontend verification

## Start the app

From the project root, start the existing backend in one terminal:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173/ctf` (use localhost to match the existing backend CORS
configuration). The frontend shares the existing API base at
`http://127.0.0.1:8000`. No migrations or backend changes are needed.

## Browser checklist

1. Confirm the header/subtitle, Add Challenge button, and existing Web Gauntlet
   records load from PostgreSQL. Reload and confirm the same records remain.
2. Search by title, platform, category, and a word in notes. Try mixed case and
   surrounding spaces. Combine platform, category, status, and difficulty filters.
   Reset filters to restore all records. Unmatched search shows `No challenges found.`
3. Open Add Challenge. Confirm Not Started, 0 points, 0 hints, and unchecked Flag
   Captured defaults. Enter a title, platform, category, and difficulty. Set points
   to 100. Save: the modal closes and the API-returned challenge appears. Reopen Add
   Challenge to verify a fresh form, then cancel. Reload to verify persistence.
4. Edit the challenge. Change notes, category, difficulty, points, hints, URL, and
   Flag Captured. Save and reload; all changes persist. Canceling edits must not
   send PATCH or change the stored record. Empty notes/URL can be saved.
5. Use the card's Status select to move Not Started -> In Progress -> Completed.
   Each change sends one PATCH. Inspect the Network tab and reopen Edit Challenge
   to see server-returned start/completion/update times. Reopen the challenge by
   selecting In Progress; completion time clears and original start remains.
6. Confirm flag capture is independent: checking Flag Captured while Not Started
   increments Flags Captured but does not complete it or add its points. Completing
   a 100-point challenge adds 100 points and one solved count for its category.
   Reopening removes those 100 points and its solved count without clearing capture.
   Statistics and category breakdown cover the full dataset, regardless of filters.
7. A complete HTTP(S) Challenge URL displays Open Challenge and opens a new tab.
   Empty URLs show no link. The form rejects other URL schemes; unsafe pre-existing
   URL strings also do not become clickable links.
8. Try whitespace-only required text, negative/fractional points or hints, and a
   malformed URL. Validation prevents submission. No actual flag input is present.
9. Stop the backend and refresh: `Unable to load challenges.` and Try again appear.
   Restart it and retry: records recover. With records already loaded, stop the
   backend and attempt a status change: an inline error appears and the previous
   status remains. A failed modal save keeps entered values available for retry.
10. Check keyboard navigation, modal focus containment, Escape/Cancel, and focus
    returning to the invoking control. Check narrow and wide viewport layouts.

Manual POST/PATCH checks change real records; there is no DELETE action in this V1.

## Automated checks

From `frontend` with Node 24:

```powershell
node --test --test-isolation=none tests/ctfTracker.test.mjs
npm run build
npm run lint
```

To include a read-only smoke check against the running backend:

```powershell
$env:CTF_LIVE_API = '1'
node --test --test-isolation=none tests/ctfTracker.test.mjs
```

The nine tests cover completed-only totals, independent capture counts, category
counts, search, combined filters, sorting, safe URLs, snake_case/camelCase mapping,
POST payloads, partial PATCH payloads, authoritative timestamps, and error handling.
The optional live check fetches list/detail only and does not alter records. These
tests do not automate browser interactions; use the checklist above for those.
