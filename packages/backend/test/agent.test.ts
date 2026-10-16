import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Crm } from "../src/providers.js";
import { randomUUID } from "node:crypto";
import {
  db,
  json,
  month,
  runAgentTurn,
  chargeCredits,
  refundCredits,
  transcribeAudio,
  suggestCallOutcome,
  saveCallOutcome,
  prompt,
  type AgentEvent,
} from "@revenue/backend";
import type { Actor } from "@revenue/contracts";

// Harness governance in fixture mode (MODEL_MODE is not live in tests): an assistant turn
// starts requested work with reserved credits; metering respects caps; audio is validated.
const workspaceId = randomUUID(),
  userId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
let prospectId: string;

beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Agent harness test",
      crmBinding: "A",
      assetBinding: "A",
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Agent tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  const prospect = await db.prospect.create({
    data: {
      workspaceId,
      ownerId: userId,
      sourceKey: "agent@example.test",
      snapshot: json({
        firstName: "Agent",
        lastName: "Test",
        company: "Harness Co",
        email: "agent@example.test",
        website: "https://example.com",
        title: "Founder",
      }),
    },
  });
  prospectId = prospect.id;
});
afterAll(async () => {
  const runs = await db.run.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  await db.outbox.deleteMany({
    where: { runId: { in: runs.map((run) => run.id) } },
  });
  for (const model of [
    db.spendApproval,
    db.chatMessage,
    db.usage,
    db.audit,
    db.quotaReservation,
    db.quota,
    db.budget,
    db.sequence,
    db.prospect,
    db.suppression,
    db.run,
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});

describe("assistant harness", () => {
  it("opens explicit screens immediately without a model charge, quote or run", async () => {
    const events: AgentEvent[] = [];
    await runAgentTurn(
      actor,
      "Open Settings",
      { play: "P1", prospectIds: [] },
      (event) => events.push(event),
    );
    expect(events).toContainEqual({
      type: "ui_action",
      action: { kind: "navigate", screen: "Settings" },
    });
    expect(events.find((event) => event.type === "done")).toMatchObject({
      credits: 0,
    });
    expect(events.some((event) => event.type === "quote")).toBe(false);
    await db.chatMessage.deleteMany({ where: { workspaceId } });
  });
  it("starts requested work immediately and persists its run in the conversation", async () => {
    const events: AgentEvent[] = [];
    await runAgentTurn(
      actor,
      "Draft messages for this account",
      { play: "P1", prospectIds: [prospectId] },
      (e) => events.push(e),
    );
    const kinds = events.map((e) => e.type);
    expect(kinds[0]).toBe("meta");
    expect(kinds).toContain("text");
    expect(kinds.at(-1)).toBe("done");
    expect(kinds).not.toContain("quote");
    const started = events.find((e) => e.type === "run") as Extract<
      AgentEvent,
      { type: "run" }
    >;
    expect(started.tool).toBe("draft_messages");
    const run = await db.run.findUniqueOrThrow({
      where: { id: started.runId },
    });
    expect(run.workspaceId).toBe(workspaceId);
    expect(run.userId).toBe(userId);
    expect(run.state).toBe("queued");
    expect(
      await db.spendApproval.count({
        where: { workspaceId, approvedAt: null },
      }),
    ).toBe(0);
    expect(
      await db.spendApproval.count({
        where: { workspaceId, runId: started.runId, approvedAt: { not: null } },
      }),
    ).toBe(1);
    const messages = await db.chatMessage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.runId).toBe(started.runId);
    expect(
      (messages[1]!.context as { prompts: Record<string, string> }).prompts
        .system,
    ).toBe(prompt("system").version);
  });

  it("refuses chat credits above the workspace cap and refunds failed calls", async () => {
    const id = `${workspaceId}:${month()}`;
    await db.budget.upsert({
      where: { id },
      create: { id, workspaceId, month: month(), cap: 1 },
      update: { cap: 1, used: 0, reserved: 0 },
    });
    const first = await chargeCredits(actor, "chat_turn");
    await expect(chargeCredits(actor, "chat_turn")).rejects.toThrow(/cap/);
    await refundCredits(actor, first.usageId);
    expect((await db.budget.findUniqueOrThrow({ where: { id } })).used).toBe(0);
    expect(
      (await db.usage.findUniqueOrThrow({ where: { runId: first.usageId } }))
        .state,
    ).toBe("refunded");
    await expect(
      chargeCredits({ ...actor, role: "viewer" }, "chat_turn"),
    ).rejects.toThrow(/viewer/);
  });

  it("does not start an action above the credit cap or claim that it started", async () => {
    const before = await db.run.count({ where: { workspaceId } });
    const events: AgentEvent[] = [];
    await runAgentTurn(
      actor,
      "Draft messages for this account",
      { play: "P1", prospectIds: [prospectId] },
      (event) => events.push(event),
    );
    expect(
      events.some((event) => event.type === "run" || event.type === "quote"),
    ).toBe(false);
    expect(
      events
        .filter((event) => event.type === "text")
        .map((event) => event.delta)
        .join(""),
    ).toMatch(/could not prepare.*cap/i);
    expect(await db.run.count({ where: { workspaceId } })).toBe(before);
    const message = await db.chatMessage.findFirstOrThrow({
      where: { workspaceId, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    expect(message.runId).toBeNull();
  });

  it("validates audio before any transcription", async () => {
    await expect(
      transcribeAudio(actor, Buffer.alloc(0), "audio/webm"),
    ).rejects.toThrow(/empty/);
    await expect(
      transcribeAudio(actor, Buffer.alloc(10), "text/plain"),
    ).rejects.toThrow(/Unsupported/);
    await expect(
      transcribeAudio(actor, Buffer.alloc(5 * 1024 * 1024), "audio/webm"),
    ).rejects.toThrow(/60 seconds/);
    const result = await transcribeAudio(
      actor,
      Buffer.alloc(10),
      "audio/webm;codecs=opus",
      "ar",
    );
    expect(result.model).toBe("fixture");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("classifies a dictated call note and records an opt-out as suppression", async () => {
    const suggestion = await suggestCallOutcome(
      actor,
      "Booked a meeting for Tuesday at eleven",
    );
    expect(suggestion.outcome).toBe("meeting-booked");
    await saveCallOutcome(actor, prospectId, {
      outcome: "opt-out",
      nextStep: "Stop outreach",
      followUpDays: null,
      summary: "Asked not to be contacted",
      note: "please stop",
    });
    expect(
      await db.suppression.count({
        where: { workspaceId, identity: "agent@example.test" },
      }),
    ).toBe(1);
    expect(
      await db.audit.count({ where: { workspaceId, action: "call.outcome" } }),
    ).toBe(1);
  });

  it("persists a confirmed opt-out and cancels active sequences even when CRM sync fails", async () => {
    await db.prospect.update({
      where: { id: prospectId },
      data: {
        sourceKey: "source:without-email",
        crmPersonId: "test-native-person",
      },
    });
    const states = ["queued", "running", "paused", "completed"];
    for (const state of states)
      await db.sequence.create({
        data: {
          workspaceId,
          prospectId,
          draftId: randomUUID(),
          draftVersion: 1,
          approvalDigest: "test",
          sender: "test@example.test",
          steps: [],
          state,
        },
      });
    const task = vi
      .spyOn(Crm.prototype, "task")
      .mockRejectedValue(new Error("Synthetic CRM outage"));
    try {
      const input = {
        outcome: "opt-out",
        nextStep: "Stop contact",
        followUpDays: null,
        summary: "No more contact",
        note: "Stop calling",
      };
      await expect(
        saveCallOutcome(actor, prospectId, { ...input, followUpDays: 2 }),
      ).rejects.toThrow(/opt-out/);
      const result = await saveCallOutcome(actor, prospectId, input);
      expect(result).toEqual({
        saved: true,
        crmTaskId: null,
        crmError: "Synthetic CRM outage",
      });
      expect(
        await db.suppression.count({
          where: { workspaceId, identity: "source:without-email" },
        }),
      ).toBe(1);
      expect(
        await db.sequence.count({ where: { workspaceId, state: "cancelled" } }),
      ).toBe(3);
      expect(
        await db.sequence.count({ where: { workspaceId, state: "completed" } }),
      ).toBe(1);
      const audit = await db.audit.findFirstOrThrow({
        where: { workspaceId, action: "call.outcome" },
        orderBy: { createdAt: "desc" },
      });
      expect(audit.details).toMatchObject({
        outcome: "opt-out",
        crmSync: "failed",
        crmError: "Synthetic CRM outage",
      });
      expect(task).toHaveBeenCalledOnce();
    } finally {
      task.mockRestore();
    }
  });
});
