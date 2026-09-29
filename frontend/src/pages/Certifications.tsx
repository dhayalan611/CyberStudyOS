import { useEffect, useState } from "react";
import { Award, CalendarDays, CheckCircle2, Clock3, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import AddCertificationModal from "../components/AddCertificationModal";
import { CERTIFICATION_STATUSES, createCertification, getCertifications, updateCertification, type Certification, type CertificationStatus, type NewCertification } from "../services/certificationApi";

const badgeClass: Record<CertificationStatus, string> = {
  Planned: "border-slate-700 bg-slate-900 text-slate-300",
  "In Progress": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Earned: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  Expired: "border-amber-500/20 bg-amber-500/10 text-amber-300",
};

function readableDate(value: string): string {
  // Date-only API values must not shift to the previous day in western timezones.
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function credentialLink(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function Certifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Certification | "new" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getCertifications(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCertifications(data); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  async function handleSave(data: NewCertification) {
    if (editor === "new") {
      const saved = await createCertification(data);
      setCertifications((current) => [...current, saved]);
    } else if (editor) {
      const saved = await updateCertification(editor.id, data);
      setCertifications((current) => current.map((item) => item.id === saved.id ? saved : item));
    }
  }

  const stats = [
    { label: "Total Certifications", value: certifications.length, icon: Award },
    { label: "Earned", value: certifications.filter((item) => item.status === "Earned").length, icon: CheckCircle2 },
    { label: "In Progress", value: certifications.filter((item) => item.status === "In Progress").length, icon: Clock3 },
    { label: "Planned", value: certifications.filter((item) => item.status === "Planned").length, icon: CalendarDays },
  ];
  const query = search.trim().toLowerCase();
  const filtered = certifications.filter((item) =>
    [item.name, item.issuer, item.credentialId ?? ""].some((value) => value.toLowerCase().includes(query)) &&
    (!status || item.status === status),
  ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Certifications</h1>
          <p className="mt-2 text-slate-400">Track your certifications, credentials and learning milestones.</p>
        </div>
        <button onClick={() => setEditor("new")} disabled={isLoading || loadError}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Certification
        </button>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{label}</p>
              <Icon aria-hidden="true" className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{isLoading || loadError ? "—" : value}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 focus-within:border-cyan-500">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
          <input aria-label="Search certifications" placeholder="Search name, issuer, or credential ID..." value={search} onChange={(event) => setSearch(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </div>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}
          className="min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500">
          <option value="">All Statuses</option>
          {CERTIFICATION_STATUSES.map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      {isLoading && <p role="status" className="text-slate-400">Loading certifications...</p>}
      {loadError && <div role="alert" className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-slate-300">Unable to load certifications.</p>
        <button onClick={() => { setIsLoading(true); setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }}
          className="mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300">Try again</button>
      </div>}
      {!isLoading && !loadError && (filtered.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <Award aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-cyan-400" />
          <p className="text-slate-300">No certifications found.</p>
          <p className="mt-2 text-sm text-slate-500">{certifications.length ? "Try another search or adjust your filter." : "Add your first certification to start tracking your milestones."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const url = credentialLink(item.credentialUrl);
            return (
              <article key={item.id} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-slate-700">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-cyan-500/10 p-3"><Award aria-hidden="true" className="h-5 w-5 text-cyan-400" /></div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass[item.status]}`}>{item.status}</span>
                </div>
                <h2 className="break-words text-lg font-semibold text-white">{item.name}</h2>
                <p className="mt-2 break-words text-sm text-slate-400">{item.issuer}</p>
                <dl className="my-5 space-y-3 text-sm">
                  {item.issueDate && <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Issue Date</dt><dd className="text-slate-300"><time dateTime={item.issueDate}>{readableDate(item.issueDate)}</time></dd></div>}
                  {item.expiryDate && <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Expiry Date</dt><dd className="text-slate-300"><time dateTime={item.expiryDate}>{readableDate(item.expiryDate)}</time></dd></div>}
                  {item.credentialId && <div><dt className="text-slate-500">Credential ID</dt><dd className="mt-1 break-words font-mono text-slate-300">{item.credentialId}</dd></div>}
                </dl>
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  <button onClick={() => setEditor(item)} aria-label={`Edit certification: ${item.name}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-900">
                    <Pencil aria-hidden="true" className="h-4 w-4" /> Edit Certification
                  </button>
                  {url && <a href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><ExternalLink aria-hidden="true" className="h-4 w-4" /> View Credential</a>}
                </div>
              </article>
            );
          })}
        </div>
      ))}
      {editor !== null && <AddCertificationModal key={editor === "new" ? "new" : editor.id}
        certification={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={handleSave} />}
    </div>
  );
}
