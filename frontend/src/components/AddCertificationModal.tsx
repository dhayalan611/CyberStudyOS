import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { CERTIFICATION_STATUSES, type Certification, type CertificationStatus, type NewCertification } from "../services/certificationApi";

type AddCertificationModalProps = {
  certification?: Certification;
  onClose: () => void;
  onSave: (data: NewCertification) => Promise<void>;
};

const inputClass = "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 [color-scheme:dark]";

export default function AddCertificationModal({ certification, onClose, onSave }: AddCertificationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    if (!value("name") || !value("issuer")) {
      setError("Enter a certification name and issuer.");
      return;
    }
    if (value("credentialUrl")) {
      try {
        const url = new URL(value("credentialUrl"));
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError("Use a complete http:// or https:// credential URL, or leave it empty.");
        return;
      }
    }
    if (value("issueDate") && value("expiryDate") && value("expiryDate") < value("issueDate")) {
      setError("Expiry Date must be on or after Issue Date.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: value("name"), issuer: value("issuer"), status: value("status") as CertificationStatus,
        credentialId: value("credentialId") || null, credentialUrl: value("credentialUrl") || null,
        issueDate: value("issueDate") || null, expiryDate: value("expiryDate") || null,
        notes: value("notes") || null,
      });
      form.reset();
      onClose();
    } catch (error: unknown) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message : "Unable to reach the backend. Check that FastAPI is running and try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="certification-modal-title"
      onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-300 shadow-2xl backdrop:bg-black/60">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="certification-modal-title" className="text-xl font-semibold text-white">{certification ? "Edit Certification" : "Add Certification"}</h2>
          <p className="mt-1 text-sm text-slate-400">Track your credentials and learning milestones.</p>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close certification modal"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white disabled:opacity-50">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">Certification Name
            <input name="name" defaultValue={certification?.name ?? ""} required maxLength={255} autoFocus placeholder="e.g. AWS Academy Cloud Foundations" className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Issuer
              <input name="issuer" defaultValue={certification?.issuer ?? ""} required maxLength={255} placeholder="e.g. AWS Academy" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">Status
              <select name="status" defaultValue={certification?.status ?? "Planned"} className={inputClass}>
                {CERTIFICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Credential ID <span className="text-slate-500">(optional)</span>
            <input name="credentialId" defaultValue={certification?.credentialId ?? ""} maxLength={255} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">Credential URL <span className="text-slate-500">(optional)</span>
            <input name="credentialUrl" type="url" defaultValue={certification?.credentialUrl ?? ""} maxLength={2048} placeholder="https://..." className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Issue Date <span className="text-slate-500">(optional)</span>
              <input name="issueDate" type="date" defaultValue={certification?.issueDate ?? ""} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">Expiry Date <span className="text-slate-500">(optional)</span>
              <input name="expiryDate" type="date" defaultValue={certification?.expiryDate ?? ""} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm font-medium">Notes <span className="text-slate-500">(optional)</span>
            <textarea name="notes" defaultValue={certification?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} />
          </label>
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-900 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Saving..." : certification ? "Save Changes" : "Add Certification"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
