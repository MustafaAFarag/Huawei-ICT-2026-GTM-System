import { client } from "../../lib/client";
import type { Prospect } from "../../lib/types";

// One PATCH /prospects/:id carries evidence, communication basis, consent time and exclusion.
// Every save sends the stored values for the parts a person did not change, so the Sources
// tab, the Policy tab and the basis-evidence dialog cannot overwrite each other.
export type ProspectPatch = {
  evidence?: Prospect["evidence"];
  lawfulBasis?: "consent" | "relationship" | "";
  // ISO timestamp, or null to clear.
  consentAt?: string | null;
  // Omitted keeps the stored country; null clears it.
  country?: string | null;
  excluded?: boolean;
  basisEvidence?: { type: "consent" | "relationship"; source: string; date: string };
};

export function saveProspect(
  ws: string,
  prospect: Prospect,
  patch: ProspectPatch,
): Promise<Prospect> {
  const stored = (prospect.lawfulBasis ?? "") as "consent" | "relationship" | "";
  return client.workspace<Prospect>(ws, `/prospects/${prospect.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      evidence: patch.evidence ?? prospect.evidence,
      lawfulBasis: patch.lawfulBasis ?? stored,
      consentAt:
        patch.consentAt !== undefined ? patch.consentAt : prospect.consentAt,
      excluded: patch.excluded ?? prospect.excluded,
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.basisEvidence ? { basisEvidence: patch.basisEvidence } : {}),
    }),
  });
}

// "datetime-local" value (no zone) to the ISO timestamp the API stores.
export const toIso = (local: string) =>
  local ? new Date(local).toISOString() : null;
// Stored ISO timestamp to a "datetime-local" value in the viewer's zone.
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
