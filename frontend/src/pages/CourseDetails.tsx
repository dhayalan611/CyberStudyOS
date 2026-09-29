import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { Course, Topic } from "../data/courses";
import { getCourse } from "../services/courseApi";
import { createTopic, getTopics, updateTopic } from "../services/topicApi";

function errorMessage(error: unknown): string {
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "Unable to reach the backend. Check that FastAPI is running and try again.";
}

function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  return <CourseDetailsContent key={courseId} courseId={Number(courseId)} />;
}

function CourseDetailsContent({ courseId }: { courseId: number }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const active = useRef(false);
  const saving = useRef(false);

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    async function load() {
      try {
        if (!Number.isSafeInteger(courseId) || courseId <= 0) throw new Error("Course not found.");
        const [loadedCourse, loadedTopics] = await Promise.all([
          getCourse(courseId, controller.signal),
          getTopics(courseId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setCourse(loadedCourse);
        setTopics(loadedTopics);
        setNeedsRefresh(false);
      } catch (error: unknown) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [courseId, loadAttempt]);

  function retryLoad() {
    setError(null);
    setIsLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function saveTopic(topicId?: number, completed?: boolean) {
    if (saving.current || needsRefresh) return;
    saving.current = true;
    setIsSaving(true);
    setError(null);
    let saved = false;
    try {
      const topic = topicId === undefined
        ? await createTopic(courseId, title.trim())
        : await updateTopic(topicId, completed!);
      saved = true;
      if (!active.current) return;
      setTopics((current) => topicId === undefined
        ? [...current, topic]
        : current.map((item) => item.id === topic.id ? topic : item));
      if (topicId === undefined) setTitle("");
      const refreshedCourse = await getCourse(courseId);
      if (!active.current) return;
      setCourse(refreshedCourse);
    } catch (error: unknown) {
      if (!active.current) return;
      setNeedsRefresh(saved);
      setError(saved
        ? "Topic saved, but course totals could not be refreshed. Reload course data below."
        : errorMessage(error));
    } finally {
      saving.current = false;
      if (active.current) setIsSaving(false);
    }
  }

  function handleAddTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Enter a topic title.");
      return;
    }
    void saveTopic();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        to="/learning"
        className="mb-6 inline-flex items-center gap-2 rounded text-sm font-medium text-cyan-400 transition hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to My Learning
      </Link>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-500/30 bg-slate-950/60 p-4 text-rose-400">
          <p>{error}</p>
          <button onClick={retryLoad} disabled={isSaving} className="mt-3 text-sm font-semibold text-cyan-400 disabled:opacity-50">Reload course data</button>
        </div>
      )}
      {isLoading ? (
        <p role="status" className="text-slate-400">Loading course and topics...</p>
      ) : !course ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
          <h1 className="text-3xl font-bold text-white">Course unavailable</h1>
          <p className="mt-2 text-slate-400">
            This course is unavailable. Return to My Learning to view your saved courses.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="course-title" className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
            <span className="inline-block rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
              {course.category}
            </span>
            <h1 id="course-title" className="mt-4 text-3xl font-bold text-white">{course.title}</h1>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Progress</span>
                <span className="font-medium text-cyan-400">{course.progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Course progress"
                aria-valuenow={course.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-slate-800"
              >
                <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${course.progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-400" aria-live="polite">
                {course.completedTopics} / {course.totalTopics} topics completed
              </p>
            </div>
          </section>

          <section aria-labelledby="topics-title" className="mt-8">
            <h2 id="topics-title" className="text-xl font-semibold text-white">Topics</h2>
            <p className="mt-2 text-sm text-slate-400">Mark each topic complete as you learn. Your changes are saved automatically.</p>
            <form onSubmit={handleAddTopic} className="mt-5 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="topic-title" className="mb-2 block text-sm text-slate-300">Topic title</label>
                <input id="topic-title" type="text" required maxLength={255}
                  value={title} onChange={(event) => setTitle(event.target.value)}
                  disabled={isSaving || needsRefresh} placeholder="e.g. IPv4 Addressing"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-50" />
              </div>
              <button type="submit" disabled={isSaving || needsRefresh || !title.trim()}
                className="rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">Add Topic</button>
            </form>
            {isSaving && <p role="status" className="mt-3 text-sm text-cyan-400">Saving changes...</p>}
            <ul className="mt-5 space-y-3">
              {topics.map((topic) => (
                <li key={topic.id}>
                  <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      disabled={isSaving || needsRefresh}
                      onChange={(event) => void saveTopic(topic.id, event.target.checked)}
                      className="h-4 w-4 shrink-0 accent-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
                    />
                    <span className={topic.completed ? "text-sm text-slate-500 line-through" : "text-sm text-slate-200"}>
                      {topic.title}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {topics.length === 0 && <p className="mt-4 text-sm text-slate-400">No topics yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}

export default CourseDetails;
