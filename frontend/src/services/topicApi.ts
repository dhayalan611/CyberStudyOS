import type { Topic } from "../data/courses";
import { apiFetch } from "./apiClient";

type ApiTopic = {
  id: number;
  course_id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

function toTopic(topic: ApiTopic): Topic {
  return {
    id: topic.id,
    courseId: topic.course_id,
    title: topic.title,
    completed: topic.completed,
    createdAt: topic.created_at,
  };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`${path}`, options);
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "The course or topic was not found."
      : response.status === 422
        ? "Check the topic title (1–255 characters) and completion status."
        : `Topic request failed (${response.status}). Please try again.`);
  }
  return response;
}

export async function getTopics(courseId: number, signal?: AbortSignal): Promise<Topic[]> {
  const response = await request(`/api/courses/${courseId}/topics`, { signal });
  const topics: ApiTopic[] = await response.json();
  return topics.map(toTopic);
}

export async function createTopic(courseId: number, title: string): Promise<Topic> {
  const response = await request(`/api/courses/${courseId}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return toTopic(await response.json());
}

export async function updateTopic(topicId: number, completed: boolean): Promise<Topic> {
  const response = await request(`/api/topics/${topicId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  return toTopic(await response.json());
}
