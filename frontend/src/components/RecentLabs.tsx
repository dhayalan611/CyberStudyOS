// Legacy demo widget; not mounted. Replace sample records with API data before reuse.
import {
  FlaskConical,
  CheckCircle2,
  Clock3,
  ArrowRight,
} from "lucide-react";

import { Link } from "react-router-dom";

const recentLabs = [
  {
    platform: "TryHackMe",
    lab: "Intro to LAN",
    status: "Completed",
    date: "Today",
  },
  {
    platform: "LetsDefend",
    lab: "SOC Investigation",
    status: "Completed",
    date: "Yesterday",
  },
  {
    platform: "CyberDefenders",
    lab: "Phishing Analysis",
    status: "In Progress",
    date: "2 days ago",
  },
];

function RecentLabs() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Recent Lab Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your latest cybersecurity practice
          </p>
        </div>

        <FlaskConical className="h-5 w-5 text-cyan-400" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-3 font-medium">Platform</th>
              <th className="pb-3 font-medium">Lab</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Date</th>
            </tr>
          </thead>

          <tbody>
            {recentLabs.map((lab) => (
              <tr
                key={`${lab.platform}-${lab.lab}`}
                className="border-b border-slate-800/60"
              >
                <td className="py-4 text-sm font-medium text-slate-300">
                  {lab.platform}
                </td>

                <td className="py-4 text-sm text-white">
                  {lab.lab}
                </td>

                <td className="py-4">
                  <div className="flex items-center gap-2">
                    {lab.status === "Completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-amber-400" />
                    )}

                    <span
                      className={
                        lab.status === "Completed"
                          ? "text-sm text-emerald-400"
                          : "text-sm text-amber-400"
                      }
                    >
                      {lab.status}
                    </span>
                  </div>
                </td>

                <td className="py-4 text-sm text-slate-500">
                  {lab.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View All */}
      <Link
        to="/labs"
        className="mt-5 flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
        View all labs
        <ArrowRight className="h-4 w-4" />
     </Link>
     
    </div>
  );
}

export default RecentLabs;