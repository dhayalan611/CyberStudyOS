import { apiFetch } from "./apiClient";

export const CERTIFICATION_STATUSES = ["Planned", "In Progress", "Earned", "Expired"] as const;
export type CertificationStatus = typeof CERTIFICATION_STATUSES[number];

export type Certification = {
  id: number;
  name: string;
  issuer: string;
  status: CertificationStatus;
  credentialId: string | null;
  credentialUrl: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewCertification = Pick<Certification, "name" | "issuer"> &
  Partial<Omit<Certification, "id" | "name" | "issuer" | "createdAt" | "updatedAt">>;
export type CertificationUpdate = Partial<NewCertification>;
type ApiCertification = Omit<Certification, "credentialId" | "credentialUrl" | "issueDate" | "expiryDate" | "createdAt" | "updatedAt"> & {
  credential_id: string | null;
  credential_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

function toCertification({ credential_id, credential_url, issue_date, expiry_date, created_at, updated_at, ...fields }: ApiCertification): Certification {
  return { ...fields, credentialId: credential_id, credentialUrl: credential_url,
    issueDate: issue_date, expiryDate: expiry_date, createdAt: created_at, updatedAt: updated_at };
}

function toPayload({ credentialId, credentialUrl, issueDate, expiryDate, ...fields }: CertificationUpdate) {
  return { ...fields,
    ...(credentialId !== undefined ? { credential_id: credentialId } : {}),
    ...(credentialUrl !== undefined ? { credential_url: credentialUrl } : {}),
    ...(issueDate !== undefined ? { issue_date: issueDate } : {}),
    ...(expiryDate !== undefined ? { expiry_date: expiryDate } : {}),
  };
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await apiFetch(`/api/certifications${path}`, options);
  if (!response.ok) {
    if (response.status === 422) {
      const body = await response.json().catch(() => null);
      const details: unknown = body?.detail;
      const messages = Array.isArray(details)
        ? details.flatMap((item: unknown) => {
          if (!item || typeof item !== "object" || !("msg" in item) || typeof item.msg !== "string") return [];
          if (item.msg.includes("expiry_date must not be earlier than issue_date")) {
            return ["Expiry Date must be on or after Issue Date."];
          }
          const field = "loc" in item && Array.isArray(item.loc)
            ? item.loc.filter((part: unknown) => part !== "body").join(" ").replaceAll("_", " ") : "";
          return [`${field ? `${field}: ` : ""}${item.msg.replace(/^Value error, /, "")}`];
        }) : [];
      throw new Error(messages.length ? messages.join(" ") : "Check the certification fields and dates, then try again.");
    }
    throw new Error(response.status === 404
      ? "Certification not found. Refresh the page and try again."
      : `Unable to save or load certifications (${response.status}). Please try again.`);
  }
  return response;
}

export async function getCertifications(signal?: AbortSignal): Promise<Certification[]> {
  const certifications: ApiCertification[] = await (await request("", { signal })).json();
  return certifications.map(toCertification);
}

// Retained for detail views and API consumers; current page uses the collection response.
export async function getCertification(id: number, signal?: AbortSignal): Promise<Certification> {
  return toCertification(await (await request(`/${id}`, { signal })).json());
}

export async function createCertification(data: NewCertification): Promise<Certification> {
  return toCertification(await (await request("", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(data)),
  })).json());
}

export async function updateCertification(id: number, data: CertificationUpdate): Promise<Certification> {
  return toCertification(await (await request(`/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(data)),
  })).json());
}
