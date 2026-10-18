import { ConflictException } from "@nestjs/common";
import { serializable } from "./database.js";

// Attach an approved asset to a draft. The asset must belong to the draft's account, except
// the brand-level capability profile (A6), which has no account and may go on any draft.
// Attaching resets draft approval and cancels its live sequences, as before.
export function attachAssetToDraft(
  workspaceId: string,
  draftId: string,
  input: { assetId: string | null; version: number },
) {
  return serializable(async (tx) => {
    const draft = await tx.draft.findFirstOrThrow({
      where: { id: draftId, workspaceId },
    });
    if (draft.version !== input.version)
      throw new ConflictException("This draft changed. Reload it.");
    const asset = input.assetId
      ? await tx.asset.findFirstOrThrow({
          where: {
            id: input.assetId,
            workspaceId,
            approvedAt: { not: null },
            OR: [
              { prospectId: draft.prospectId },
              { prospectId: null, template: "capability-profile" },
            ],
          },
        })
      : null;
    await tx.sequence.updateMany({
      where: {
        workspaceId,
        draftId,
        state: { notIn: ["completed", "failed", "cancelled"] },
      },
      data: { state: "cancelled" },
    });
    return tx.draft.update({
      where: { id: draftId },
      data: {
        assetId: asset?.id ?? null,
        version: { increment: 1 },
        approvedVersion: null,
        approvedAt: null,
        approvedBy: null,
      },
    });
  });
}
