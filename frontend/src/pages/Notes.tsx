import { useEffect, useRef, useState } from "react";
import { FileText, FolderOpen, Pin, PinOff, Plus, Search } from "lucide-react";
import AddNoteModal from "../components/AddNoteModal";
import { createNote, getNotes, updateNote, type NewNote, type Note } from "../services/noteApi";

const selectClass = "min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500";
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [editor, setEditor] = useState<Note | "new" | null>(null);
  const savingRef = useRef(new Set<number>());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    getNotes(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setNotes(data); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  function replaceNote(saved: Note) {
    setNotes((current) => current.map((note) => note.id === saved.id ? saved : note));
  }

  async function handleSave(data: NewNote) {
    if (editor === "new") {
      const saved = await createNote(data);
      setNotes((current) => [...current, saved]);
    } else if (editor) {
      replaceNote(await updateNote(editor.id, data));
    }
  }

  async function togglePin(note: Note) {
    if (savingRef.current.has(note.id)) return;
    savingRef.current.add(note.id);
    setSavingIds(new Set(savingRef.current));
    setSaveErrors((current) => ({ ...current, [note.id]: "" }));
    try {
      replaceNote(await updateNote(note.id, { pinned: !note.pinned }));
    } catch (error: unknown) {
      setSaveErrors((current) => ({ ...current, [note.id]:
        error instanceof Error && !(error instanceof TypeError)
          ? error.message : "Unable to update pin. Check that FastAPI is running and try again.",
      }));
    } finally {
      savingRef.current.delete(note.id);
      setSavingIds(new Set(savingRef.current));
    }
  }

  const categories = [...new Set(notes.map((note) => note.category))].sort((a, b) => a.localeCompare(b));
  // An edited category may remove the last note belonging to the current filter.
  const activeCategory = categories.includes(category) ? category : "";
  const stats = [
    { label: "Total Notes", value: notes.length, icon: FileText },
    { label: "Pinned Notes", value: notes.filter((note) => note.pinned).length, icon: Pin },
    { label: "Categories", value: categories.length, icon: FolderOpen },
  ];
  const query = search.trim().toLowerCase();
  const filteredNotes = notes.filter((note) =>
    [note.title, note.content, note.tags ?? ""].some((value) => value.toLowerCase().includes(query)) &&
    (!activeCategory || note.category === activeCategory) && (!pinnedOnly || note.pinned),
  ).sort((a, b) => Number(b.pinned) - Number(a.pinned) ||
    Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Notes</h1>
          <p className="mt-2 text-slate-400">Capture and organize your cybersecurity knowledge.</p>
        </div>
        <button onClick={() => setEditor("new")} disabled={isLoading || loadError}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus aria-hidden="true" className="h-4 w-4" /> New Note
        </button>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{label}</p>
              <Icon aria-hidden="true" className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{isLoading || loadError ? "—" : value}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 focus-within:border-cyan-500 sm:col-span-2 xl:col-span-1">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <input aria-label="Search notes" placeholder="Search title, content, or tags..." value={search} onChange={(event) => setSearch(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </div>
        <select aria-label="Filter by category" value={activeCategory} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {categories.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by pinned state" value={pinnedOnly ? "pinned" : "all"} onChange={(event) => setPinnedOnly(event.target.value === "pinned")} className={selectClass}>
          <option value="all">All Notes</option>
          <option value="pinned">Pinned</option>
        </select>
      </div>

      {isLoading && <p role="status" className="text-slate-400">Loading notes...</p>}
      {loadError && <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-slate-300">Unable to load notes.</p>
        <button onClick={() => { setIsLoading(true); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }}
          className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Try again</button>
      </div>}
      {!isLoading && !loadError && (filteredNotes.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <FileText aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" />
          <p className="text-slate-300">No notes found.</p>
          <p className="mt-2 text-sm text-slate-500">{notes.length ? "Try another search or adjust your filters." : "Create your first note to start building your knowledge base."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => {
            const tags = [...new Set((note.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))];
            return (
              <article key={note.id} className={`relative flex min-w-0 flex-col rounded-xl border bg-slate-950/60 transition hover:border-slate-600 ${note.pinned ? "border-cyan-500/30" : "border-slate-800"}`}>
                <button type="button" onClick={() => setEditor(note)} disabled={savingIds.has(note.id)} aria-label={`Edit note: ${note.title}`}
                  className="flex h-full min-w-0 flex-col rounded-xl p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait">
                  <span className="mb-3 flex min-h-8 items-center gap-2 pr-10 text-xs font-medium text-cyan-300">
                    <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="break-all">{note.category}</span>
                  </span>
                  <span className="line-clamp-2 break-all text-lg font-semibold text-white">{note.title}</span>
                  <span className="mb-4 mt-3 line-clamp-3 whitespace-pre-wrap break-all text-sm leading-6 text-slate-400">{note.content}</span>
                  <span className="mb-5 flex flex-wrap gap-2">
                    {tags.slice(0, 5).map((tag) => <span key={tag} className="max-w-full truncate rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-400">{tag}</span>)}
                    {tags.length > 5 && <span className="py-1 text-xs text-slate-500">+{tags.length - 5} more</span>}
                  </span>
                  <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                    <time dateTime={note.updatedAt} title={new Date(note.updatedAt).toLocaleString()}>Updated {dateFormat.format(new Date(note.updatedAt))}</time>
                    {note.pinned && <span className="text-cyan-400">Pinned</span>}
                  </span>
                </button>
                <button type="button" aria-label={`${note.pinned ? "Unpin" : "Pin"} note: ${note.title}`} aria-pressed={note.pinned}
                  disabled={savingIds.has(note.id)} onClick={() => void togglePin(note)}
                  className={`absolute right-4 top-4 rounded-lg p-2 outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-50 ${note.pinned ? "text-cyan-400" : "text-slate-500 hover:text-slate-200"}`}>
                  {note.pinned ? <PinOff aria-hidden="true" className="h-4 w-4" /> : <Pin aria-hidden="true" className="h-4 w-4" />}
                </button>
                {savingIds.has(note.id) && <p role="status" className="px-5 pb-4 text-xs text-slate-400">Saving pin...</p>}
                {saveErrors[note.id] && <p role="alert" className="px-5 pb-4 text-sm text-rose-400">{saveErrors[note.id]}</p>}
              </article>
            );
          })}
        </div>
      ))}
      {editor !== null && <AddNoteModal key={editor === "new" ? "new" : editor.id} note={editor === "new" ? undefined : editor}
        onClose={() => setEditor(null)} onSave={handleSave} />}
    </div>
  );
}
