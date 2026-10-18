import type { Dashboard } from "./types";

export function profileAssignmentCounts(
  assetId: string,
  data: Pick<Dashboard, "drafts" | "sequences">,
) {
  const draftIds = new Set(
    data.drafts
      .filter((draft) => draft.assetId === assetId)
      .map((draft) => draft.id),
  );
  const assigned = data.sequences.filter(
    (sequence) => sequence.draftId && draftIds.has(sequence.draftId),
  );
  return {
    withProfile: assigned.filter((sequence) => !sequence.holdout).length,
    withoutProfile: assigned.filter((sequence) => sequence.holdout).length,
    total: assigned.length,
  };
}
