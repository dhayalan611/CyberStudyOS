export type Topic = {
  id: number;
  courseId: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type Course = {
  id: number;
  title: string;
  category: string;
  progress: number;
  completedTopics: number;
  totalTopics: number;
};
