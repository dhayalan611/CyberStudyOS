import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
} from "lucide-react";

type CourseCardProps = {
  id: number;
  title: string;
  category: string;
  progress: number;
  completedTopics: number;
  totalTopics: number;
};

function CourseCard({
  id,
  title,
  category,
  progress,
  completedTopics,
  totalTopics,
}: CourseCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700">
      {/* Top */}
      <div className="mb-5 flex items-start justify-between">
        <div className="rounded-lg bg-cyan-500/10 p-3">
          <BookOpen className="h-5 w-5 text-cyan-400" />
        </div>

        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          {category}
        </span>
      </div>

      {/* Course Info */}
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {completedTopics} of {totalTopics} topics completed
      </p>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Progress
          </span>

          <span className="text-sm font-medium text-cyan-400">
            {progress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Continue */}
      <Link to={`/learning/${id}`} className="mt-6 flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300">
        Continue Learning
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default CourseCard;
