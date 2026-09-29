import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { NewCourse } from "../services/courseApi";

type AddCourseModalProps = {
  onClose: () => void;
  onAddCourse: (course: NewCourse) => Promise<void>;
};

function AddCourseModal({
  onClose,
  onAddCourse,
}: AddCourseModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cybersecurity");
  const [totalTopics, setTotalTopics] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("#course-name")?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (focused instanceof HTMLElement) focused.focus();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const topicCount = Number(totalTopics);
    if (!title.trim() || title.trim().length > 255 || !totalTopics ||
        !Number.isInteger(topicCount) || topicCount < 1 || topicCount > 2147483647) {
      setError("Enter a course name (up to 255 characters) and a positive whole number of topics.");
      return;
    }

    setError(null);
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await onAddCourse({ title: title.trim(), category, totalTopics: topicCount });
      onClose();
    } catch (error: unknown) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message
        : "Unable to reach the backend. Check that FastAPI is running and try again.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }
  
  return (
    <dialog ref={dialogRef} aria-labelledby="course-editor-title"
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      
      {/* Modal */}
      <form onSubmit={handleSubmit}>
        
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 id="course-editor-title" className="text-xl font-semibold text-white">
              Add New Course
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a course to your learning workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close add course modal"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5">
          
          {/* Course Name */}
          <div>
            <label htmlFor="course-name" className="mb-2 block text-sm font-medium text-slate-300">
              Course Name
            </label>

            <input
              id="course-name"
              autoFocus
              required
              type="text"
              maxLength={255}
              disabled={isSubmitting}
              placeholder="e.g. Network Security"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="course-category" className="mb-2 block text-sm font-medium text-slate-300">
              Category
            </label>

            <select id="course-category"
              disabled={isSubmitting}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500"
            >
              <option>Cybersecurity</option>
              <option>Networking</option>
              <option>Programming</option>
              <option>University</option>
            </select>
          </div>

          {/* Total Topics */}
          <div>
            <label htmlFor="course-total" className="mb-2 block text-sm font-medium text-slate-300">
              Planned Topics
            </label>

            <input
              id="course-total"
              aria-describedby="course-total-help"
              required
              type="number"
              min="1"
              max="2147483647"
              step="1"
              disabled={isSubmitting}
              placeholder="e.g. 20"
              value={totalTopics}
              onChange={(event) => setTotalTopics(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
            />
          </div>

        </div>

        <p id="course-total-help" className="mt-3 text-xs text-slate-400">Your planned total stays fixed unless you add more topics than planned.</p>

        {/* Actions */}
        {error && <p role="alert" className="mt-5 text-sm text-rose-400">{error}</p>}
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Add Course"}
          </button>
        </div>

      </form>
    </dialog>
  );
}

export default AddCourseModal;
