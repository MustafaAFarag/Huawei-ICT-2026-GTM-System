import { randomUUID } from "node:crypto";
import { generateText, Output } from "ai";
import { z } from "zod";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Actor, ProspectSnapshot } from "@revenue/contracts";
import { db, json, serializable } from "../database.js";
import { assertRole, safeError } from "../policy.js";
import { Crm } from "../providers.js";
import { aiLive, chatModel, chatModelId } from "./provider.js";
import { chargeCredits, refundCredits } from "./metering.js";
import { callDateContext } from "./call-date.js";
import { prompt, promptVersions } from "./prompts.js";

// Call outcome logging by voice (PRD GAP-08): the SDR dictates a note, the model proposes a
// structured outcome, the SDR confirms, and the outcome is written to audit and the CRM.
export const CALL_OUTCOMES = [
  "connected",
  "meeting-booked",
  "agreed",
  "call-back",
  "voicemail",
  "no-answer",
  "not-interested",
  "wrong-person",
  "opt-out",
] as const;
export const callOutcomeSchema = z.object({
  outcome: z.enum(CALL_OUTCOMES),
  nextStep: z.string().max(300),
  followUpDays: z.number().int().min(0).max(90).nullable(),
  summary: z.string().max(500),
});
export type CallOutcome = z.infer<typeof callOutcomeSchema>;

function fixtureSuggestion(note: string): CallOutcome {
  if (
    /stop contact|stop calling|do not contact|no more contact|متتصل|ماتتصل|متبعت|ماتبعت|امسحوا رقمي/i.test(
      note,
    )
  )
    return {
      outcome: "opt-out",
      nextStep: "Stop contact.",
      followUpDays: null,
      summary: note.slice(0, 300),
    };
  const outcome: CallOutcome["outcome"] = /meeting|موعد|اجتماع|demo/i.test(note)
    ? "meeting-booked"
    : /call.?back|later|بعدين|كلمني/i.test(note)
      ? "call-back"
      : /voicemail|بريد صوتي/i.test(note)
        ? "voicemail"
        : /not interested|مش مهتم|غير مهتم/i.test(note)
          ? "not-interested"
          : /no answer|ما ردش|لم يرد/i.test(note)
            ? "no-answer"
            : "connected";
  return {
    outcome,
    nextStep:
      outcome === "meeting-booked"
        ? "Send a calendar invite and a one-page agenda."
        : "Review and confirm the next step.",
    followUpDays: null,
    summary: note.slice(0, 300),
  };
}

export async function suggestCallOutcome(actor: Actor, note: string) {
  assertRole(actor, "write");
  if (!aiLive())
    return { ...fixtureSuggestion(note), model: "fixture", credits: 0 };
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: actor.workspaceId },
  });
  const reference = callDateContext(workspace.timezone);
  const versions = promptVersions("call-outcome");
  const charge = await chargeCredits(actor, "chat_turn", {
    purpose: "call_outcome",
    model: chatModelId(),
    prompts: versions,
    referenceDate: reference.today,
    timeZone: reference.timeZone,
  });
  try {
    const { output } = await generateText({
      model: chatModel(),
      output: Output.object({ schema: callOutcomeSchema }),
      system: prompt("call-outcome").text,
      prompt: JSON.stringify({
        reference,
        note: { untrusted: true, text: note },
      }),
      maxOutputTokens: 400,
      abortSignal: AbortSignal.timeout(30000),
    });
    return {
      ...output,
      ...(output.outcome === "opt-out" ? { followUpDays: null } : {}),
      model: chatModelId(),
      prompts: versions,
      referenceDate: reference.today,
      timeZone: reference.timeZone,
      credits: charge.credits,
    };
  } catch (error) {
    await refundCredits(actor, charge.usageId);
    throw new Error(`Could not classify the note: ${safeError(error)}`);
  }
}

export async function saveCallOutcome(
  actor: Actor,
  prospectId: string,
  value: unknown,
) {
  assertRole(actor, "write");
  const input = callOutcomeSchema
    .extend({ note: z.string().max(3000) })
    .parse(value);
  if (input.outcome === "opt-out" && input.followUpDays !== null)
    throw new BadRequestException(
      "An opt-out cannot include a follow-up delay.",
    );
  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, workspaceId: actor.workspaceId },
  });
  if (!prospect) throw new NotFoundException("Prospect not found.");
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: actor.workspaceId },
  });
  const snapshot = prospect.snapshot as ProspectSnapshot;
  // Persist the confirmed outcome and stop work before any fallible CRM request.
  const recorded = await serializable(async (tx) => {
    if (input.outcome === "opt-out") {
      const identity = prospect.sourceKey.toLowerCase();
      await tx.suppression.upsert({
        where: {
          workspaceId_identity: { workspaceId: actor.workspaceId, identity },
        },
        create: {
          workspaceId: actor.workspaceId,
          identity,
          reason: "Opt-out recorded on a call",
        },
        update: {},
      });
      await tx.sequence.updateMany({
        where: {
          workspaceId: actor.workspaceId,
          prospectId: prospect.id,
          state: { notIn: ["cancelled", "completed", "failed"] },
        },
        data: { state: "cancelled" },
      });
    }
    return tx.audit.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "call.outcome",
        targetId: prospect.id,
        details: json({
          ...input,
          crmTaskId: null,
          crmError: null,
          crmSync: prospect.crmPersonId ? "pending" : "not-needed",
        }),
      },
    });
  });
  let crmTaskId: string | null = null;
  let crmError: string | null = null;
  if (prospect.crmPersonId)
    try {
      crmTaskId = await new Crm(workspace).task(
        randomUUID(),
        `Call outcome: ${input.outcome} — ${snapshot.company}`,
        `**Outcome:** ${input.outcome}\n\n**Next step:** ${input.nextStep}\n\n**Summary:** ${input.summary}\n\n**Note:** ${input.note}`,
      );
    } catch (error) {
      crmError = safeError(error);
    }
  await db.audit.update({
    where: { id: recorded.id },
    data: {
      details: json({
        ...input,
        crmTaskId,
        crmError,
        crmSync: crmError ? "failed" : crmTaskId ? "synced" : "not-needed",
      }),
    },
  });
  return { saved: true, crmTaskId, crmError };
}
