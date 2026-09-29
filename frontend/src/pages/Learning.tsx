import { useEffect, useState } from "react";
import {
  Search,
  Plus,
} from "lucide-react";

import CourseCard from "../components/CourseCard";
import AddCourseModal from "../components/AddCourseModal";

import type { Course } from "../data/courses";
import { getCourses, createCourse, type NewCourse } from "../services/courseApi";

function Learning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getCourses(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCourses(data); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoadError(error instanceof Error && !(error instanceof TypeError) ? error.message : "Unable to reach the backend. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  function onRetry() {
    setIsLoading(true);
    setLoadError(null);
    setAttempt((value) => value + 1);
  }

    const [searchTerm, setSearchTerm] = useState("");

    const [selectedCategory, setSelectedCategory] = useState("All Categories");

    const [isModalOpen, setIsModalOpen] = useState(false);

    async function handleAddCourse(newCourse: NewCourse) {
        const course = await createCourse(newCourse);

        setCourses((currentCourses) => [
            ...currentCourses,
            course,
        ]);
    }

    const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCategory =
        selectedCategory === "All Categories" ||
        course.category === selectedCategory;

    return matchesSearch && matchesCategory;
    });
  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-cyan-400">
            Learning Center
          </p>

          <h1 className="text-3xl font-bold text-white">
            My Learning
          </h1>

          <p className="mt-2 text-slate-400">
            Manage your courses and track your learning progress.
          </p>
        </div>

        <button 
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading || !!loadError}
        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
          <Search className="h-4 w-4 text-slate-500" />

          <input
            type="text"
            placeholder="Search your courses..."
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none"
            >
          <option>All Categories</option>
          <option>Cybersecurity</option>
          <option>Networking</option>
          <option>Programming</option>
          <option>University</option>
        </select>
      </div>

        {/* Courses */}
        {isLoading && <p role="status" className="mb-6 text-slate-400">Loading courses...</p>}
        {loadError && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-500/30 bg-slate-950/60 p-4 text-rose-400">
            <p>{loadError}</p>
            <button onClick={onRetry} className="mt-3 text-sm font-semibold text-cyan-400">Try again</button>
          </div>
        )}
        {!isLoading && !loadError && filteredCourses.length === 0 && (
          <p className="mb-6 text-slate-400">
            {courses.length === 0 ? "No courses yet. Add your first course to get started." : "No courses match your search or category."}
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => (
            <CourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            category={course.category}
            progress={course.progress}
            completedTopics={course.completedTopics}
            totalTopics={course.totalTopics}
            />
        ))}
        </div>

        {/* Add Course Modal */}
        {isModalOpen && (
            <AddCourseModal
                onClose={() => setIsModalOpen(false)}
                onAddCourse={handleAddCourse}
            />
        )}
    </div>
  );
}

export default Learning;
