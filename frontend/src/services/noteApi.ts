import { apiFetch } from "./apiClient";

export type Note = {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewNote = Pick<Note, "title" | "content" | "category"> &
  Partial<Pick<Note, "tags" | "pinned">>;
export type NoteUpdate = Partial<NewNote>;
type ApiNote = Omit<Note, "createdAt" | "updatedAt"> & {
  created_at: string;
  updated_at: string;
};

function toNote({ created_at, updated_at, ...note }: ApiNote): Note {
  return { ...note, createdAt: created_at, updatedAt: updated_at };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`/api/notes${path}`, options);
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Note not found. Refresh the page and try again."
      : response.status === 422
        ? "Check the note fields. Title and category must be 1–255 characters."
        : `Unable to save or load notes (${response.status}). Please try again.`);
  }
  return response;
}

export async function getNotes(signal?: AbortSignal): Promise<Note[]> {
  const notes: ApiNote[] = await (await request("", { signal })).json();
  return notes.map(toNote);
}

// Retained for detail views and API consumers; current page uses the collection response.
export async function getNote(id: number, signal?: AbortSignal): Promise<Note> {
  return toNote(await (await request(`/${id}`, { signal })).json());
}

export async function createNote(data: NewNote): Promise<Note> {
  return toNote(await (await request("", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })).json());
}

export async function updateNote(id: number, data: NoteUpdate): Promise<Note> {
  return toNote(await (await request(`/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })).json());
}
