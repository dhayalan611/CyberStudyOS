import type { Course } from "../data/courses";

import { apiFetch } from "./apiClient";

type ApiCourse = {
  id: number;
  title: string;
  category: string;
  progress: number;
  completed_topics: number;
  total_topics: number;
  created_at: string;
};

export type NewCourse = Pick<Course, "title" | "category" | "totalTopics">;

function toCourse(course: ApiCourse): Course {
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    progress: course.progress,
    completedTopics: course.completed_topics,
    totalTopics: course.total_topics,
  };
}

export async function getCourses(signal?: AbortSignal): Promise<Course[]> {
  const response = await apiFetch(`/api/courses`, { signal });
  if (!response.ok) {
    throw new Error(`Unable to load courses (${response.status}). Please try again.`);
  }
  const courses: ApiCourse[] = await response.json();
  return courses.map(toCourse);
}

export async function getCourse(courseId: number, signal?: AbortSignal): Promise<Course> {
  const response = await apiFetch(`/api/courses/${courseId}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Course not found."
      : `Unable to load course (${response.status}). Please try again.`);
  }
  return toCourse(await response.json());
}

export async function createCourse(course: NewCourse): Promise<Course> {
  const response = await apiFetch(`/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: course.title,
      category: course.category,
      total_topics: course.totalTopics,
    }),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 422
        ? "Please check the course title, category, and total topics."
        : `Unable to save course (${response.status}). Please try again.`,
    );
  }
  return toCourse(await response.json());
}
