// Legacy demo widget; not mounted. Replace sample records with API data before reuse.
const skills = [
  { name: "Networking", level: 78 },
  { name: "Cybersecurity", level: 85 },
  { name: "Linux", level: 64 },
  { name: "Python", level: 71 },
  { name: "Web Security", level: 52 },
];

function SkillMatrix() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">
          Skill Matrix
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Your current learning progress
        </p>
      </div>

      <div className="space-y-5">
        {skills.map((skill) => (
          <div key={skill.name}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                {skill.name}
              </span>

              <span className="text-sm text-cyan-400">
                {skill.level}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: `${skill.level}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkillMatrix;