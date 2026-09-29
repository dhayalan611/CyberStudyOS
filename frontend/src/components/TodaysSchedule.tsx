// Legacy demo widget; not mounted. Replace sample records with API data before reuse.
import {
  BookOpen,
  Network,
  Code2,
  Shield,
  FlaskConical,
  Clock,
} from "lucide-react";

const schedule = [
  {
    time: "08:30",
    title: "Computer Networks",
    type: "University",
    icon: Network,
  },
  {
    time: "11:00",
    title: "Networking Practice",
    type: "Self Study",
    icon: BookOpen,
  },
  {
    time: "14:30",
    title: "OOP",
    type: "University",
    icon: Code2,
  },
  {
    time: "18:00",
    title: "Cybersecurity Study",
    type: "Self Study",
    icon: Shield,
  },
  {
    time: "20:00",
    title: "TryHackMe Lab",
    type: "Lab",
    icon: FlaskConical,
  },
];

function TodaysSchedule() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Today's Schedule
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your learning plan for today
          </p>
        </div>

        <Clock className="h-5 w-5 text-cyan-400" />
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        {schedule.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={`${item.time}-${item.title}`}
              className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
            >
              {/* Time */}
              <div className="w-12 text-sm font-medium text-cyan-400">
                {item.time}
              </div>

              {/* Icon */}
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Icon className="h-4 w-4 text-cyan-400" />
              </div>

              {/* Information */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.type}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TodaysSchedule;