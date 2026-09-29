// Legacy demo widget; not mounted. Replace sample records with API data before reuse.
import { BarChart3 } from "lucide-react";

const activityData = [
  { day: "Mon", hours: 2.5 },
  { day: "Tue", hours: 4 },
  { day: "Wed", hours: 3 },
  { day: "Thu", hours: 5 },
  { day: "Fri", hours: 3.5 },
  { day: "Sat", hours: 6 },
  { day: "Sun", hours: 4.5 },
];

const maxHours = Math.max(...activityData.map((item) => item.hours));

function LearningActivity() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Learning Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Study hours during the last 7 days
          </p>
        </div>

        <div className="rounded-lg bg-cyan-500/10 p-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-56 items-end justify-between gap-3">
        {activityData.map((item) => {
          const barHeight = (item.hours / maxHours) * 100;

          return (
            <div
              key={item.day}
              className="flex h-full flex-1 flex-col items-center justify-end"
            >
              {/* Hours */}
              <span className="mb-2 text-xs text-slate-400">
                {item.hours}h
              </span>

              {/* Bar */}
              <div
                className="w-full max-w-10 rounded-t-md bg-cyan-500 transition hover:bg-cyan-400"
                style={{ height: `${barHeight}%` }}
              />

              {/* Day */}
              <span className="mt-3 text-xs text-slate-500">
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LearningActivity;