import { z } from "zod";
import type { Actor } from "@revenue/contracts";
import { db, json, serializable } from "./database.js";
import { assertRole } from "./policy.js";
export const senderEventSchema = z.object({
  id: z.string().min(8).max(150),
  sequenceId: z.uuid(),
  kind: z.enum([
    "submitted",
    "sent",
    "delivered",
    "bounced",
    "failed",
    "replied",
    "opt_out",
  ]),
  occurredAt: z.iso.datetime(),
});
const rank: Record<string, number> = {
  queued: 0,
  simulated: 0,
  submitted: 1,
  sent: 2,
  delivered: 3,
  bounced: 4,
  failed: 4,
  replied: 5,
  opt_out: 6,
  cancelled: 7,
};
export async function senderEvent(
  actor: Actor,
  value: unknown,
  simulated = true,
) {
  assertRole(actor, "write");
  const input = senderEventSchema.parse(value);
  if (Date.parse(input.occurredAt) > Date.now() + 60000)
    throw new Error("Sender event date is in the future.");
  return serializable(async (tx) => {
    const id = `${actor.workspaceId}:${input.id}`;
    const duplicate = await tx.providerEvent.findUnique({ where: { id } });
    if (duplicate) {
      if (
        duplicate.sequenceId !== input.sequenceId ||
        duplicate.kind !== input.kind ||
        duplicate.occurredAt.toISOString() !== input.occurredAt
      )
        throw new Error(
          "This event ID was already used for different content.",
        );
      return { duplicate: true };
    }
    const sequence = await tx.sequence.findFirstOrThrow({
      where: { id: input.sequenceId, workspaceId: actor.workspaceId },
    });
    const occurredAt = new Date(input.occurredAt);
    await tx.providerEvent.create({
      data: {
        id,
        workspaceId: actor.workspaceId,
        sequenceId: sequence.id,
        kind: input.kind,
        occurredAt,
        provenance: simulated ? "simulated" : "live",
      },
    });
    if (["replied", "opt_out"].includes(input.kind)) {
      const prospect = await tx.prospect.findFirstOrThrow({
        where: { id: sequence.prospectId, workspaceId: actor.workspaceId },
      });
      await tx.sequence.updateMany({
        where: {
          workspaceId: actor.workspaceId,
          prospectId: prospect.id,
          state: { notIn: ["completed", "failed"] },
        },
        data: { state: "cancelled", nextAt: null },
      });
      if (input.kind === "opt_out")
        await tx.suppression.upsert({
          where: {
            workspaceId_identity: {
              workspaceId: actor.workspaceId,
              identity: prospect.sourceKey,
            },
          },
          create: {
            workspaceId: actor.workspaceId,
            identity: prospect.sourceKey,
            reason: "Provider opt-out",
          },
          update: { reason: "Provider opt-out" },
        });
    } else if (
      (rank[input.kind] ?? 0) >
        (rank[sequence.state.replace("simulated_", "")] ?? 0) &&
      sequence.state !== "cancelled"
    )
      await tx.sequence.update({
        where: { id: sequence.id },
        data: { state: simulated ? `simulated_${input.kind}` : input.kind },
      });
    await tx.audit.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: simulated ? "sender.simulated_event" : "sender.event",
        targetId: sequence.id,
        details: json(input),
      },
    });
    return { duplicate: false, simulated };
  });
}
