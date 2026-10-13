import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  WorkflowService,
  WorkspaceService,
  json,
  month,
  digest,
  publicAddress,
  senderEvent,
  Providers,
  preflightHolds,
  channelHolds,
  serializable,
} from "@revenue/backend";
import { toolRequest, type Actor } from "@revenue/contracts";
const workflows = new WorkflowService(),
  workspaces = new WorkspaceService();
const workspaceId = randomUUID(),
  userId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
let prospectId: string;
const input = (tool = "find_signals") =>
  toolRequest.parse({
    tool,
    requestKey: randomUUID(),
    prospectIds: [prospectId],
  });
async function approved(request: ReturnType<typeof input>) {
  const quote = await workflows.quote(actor, request);
  await workflows.approveQuote(actor, quote.id);
  return { ...request, spendApprovalId: quote.id };
}
beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Governance integration test",
      crmBinding: "A",
      assetBinding: "A",
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Integration tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  const prospect = await db.prospect.create({
    data: {
      workspaceId,
      ownerId: userId,
      sourceKey: "test@example.test",
      snapshot: json({
        firstName: "Test",
        lastName: "Person",
        company: "Test Company",
        email: "test@example.test",
        website: "https://example.com",
        title: "Founder",
      }),
    },
  });
  prospectId = prospect.id;
});
afterAll(async () => {
  const runIds = (
    await db.run.findMany({ where: { workspaceId }, select: { id: true } })
  ).map((r) => r.id);
  await db.outbox.deleteMany({ where: { runId: { in: runIds } } });
  for (const model of [
    db.quotaReservation,
    db.quota,
    db.spendApproval,
    db.usage,
    db.audit,
    db.run,
    db.prospect,
    db.budget,
    db.sequence,
    db.draft,
    db.asset,
    db.playVersion,
    db.importBatch,
    db.suppression,
    db.providerEvent,
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
describe("PostgreSQL-backed governance", () => {
  it("retries concurrent raw SQL serialization conflicts without losing updates", async () => {
    const id = randomUUID();
    await db.budget.create({
      data: { id, workspaceId, month: month(), cap: 100 },
    });
    await Promise.all(
      Array.from({ length: 4 }, () =>
        serializable(async (tx) => {
          await tx.budget.findUniqueOrThrow({ where: { id } });
          await new Promise((resolve) => setTimeout(resolve, 25));
          await tx.$executeRaw`UPDATE "Budget" SET used = used + 1 WHERE id = ${id}`;
        }),
      ),
    );
    expect((await db.budget.findUniqueOrThrow({ where: { id } })).used).toBe(4);
  });
  it("does not accept model-supplied approval flags", async () => {
    await expect(
      workflows.start(actor, { ...input(), approvedSpend: true }),
    ).rejects.toThrow("Review and approve");
  });
  it("blocks cross-workspace records and role escalation", async () => {
    await expect(
      workflows.quote({ ...actor, workspaceId: randomUUID() }, input()),
    ).rejects.toThrow("Workspace not found");
    await expect(
      workflows.start({ ...actor, role: "viewer" }, input("score_accounts")),
    ).rejects.toThrow("cannot write");
    await expect(
      workspaces.reviewProspect({ ...actor, role: "operator" }, prospectId, {}),
    ).rejects.toThrow("cannot approve");
  });
  it("rejects a stale audience/evidence approval", async () => {
    const request = await approved(input());
    await db.prospect.update({
      where: { id: prospectId },
      data: { evidence: json([{ id: randomUUID(), claim: "Changed source" }]) },
    });
    await expect(workflows.start(actor, request)).rejects.toThrow(
      "Review and approve",
    );
    await db.prospect.update({
      where: { id: prospectId },
      data: { evidence: [] },
    });
  });
  it("invalidates a cost approval when spending limits change", async () => {
    const request = await approved(input());
    await workspaces.configure(actor, { cap: 99 });
    await expect(workflows.start(actor, request)).rejects.toThrow(
      "Review and approve",
    );
  });
  it("atomically enforces caps for concurrent reservations and idempotent retries", async () => {
    await db.budget.upsert({
      where: { id: `${workspaceId}:${month()}` },
      create: {
        id: `${workspaceId}:${month()}`,
        workspaceId,
        month: month(),
        cap: 2,
      },
      update: { cap: 2 },
    });
    const requests = await Promise.all([
      approved(input()),
      approved(input()),
      approved(input()),
    ]);
    const results = await Promise.allSettled(
      requests.map((request) => workflows.start(actor, request)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const index = results.findIndex((r) => r.status === "fulfilled"),
      request = requests[index]!;
    const [one, two] = await Promise.all([
      workflows.start(actor, request),
      workflows.start(actor, request),
    ]);
    expect(one.id).toBe(two.id);
    const budget = await db.budget.findUniqueOrThrow({
      where: { id: `${workspaceId}:${month()}` },
    });
    expect(budget.reserved).toBe(2);
    expect(budget.used).toBe(0);
    await workflows.reconcile(one.id, 1);
    await workflows.reconcile(one.id, 1);
    const reconciled = await db.budget.findUniqueOrThrow({
      where: { id: budget.id },
    });
    expect(reconciled.reserved).toBe(0);
    expect(reconciled.used).toBe(1);
    await expect(
      workflows.start(actor, { ...request, tool: "make_asset" }),
    ).rejects.toThrow("different action");
  });
  it("recovers interrupted execution without repeating provider calls", async () => {
    await db.budget.update({
      where: { id: `${workspaceId}:${month()}` },
      data: { cap: 100 },
    });
    const run = await workflows.start(actor, await approved(input()));
    await db.run.update({
      where: { id: run.id },
      data: { state: "running", leaseUntil: new Date(0) },
    });
    await workflows.recoverInterrupted();
    expect(
      (await db.run.findUniqueOrThrow({ where: { id: run.id } })).state,
    ).toBe("failed");
    expect(
      (await db.usage.findUniqueOrThrow({ where: { runId: run.id } })).state,
    ).toBe("reconciled");
  });
  it("enforces member caps and concurrent resource quotas independently", async () => {
    await workspaces.configure(actor, {
      cap: 1000,
      memberCaps: [{ userId, cap: 1 }],
      planLimits: {
        aiCredits: 1000,
        enrichmentCredits: 100,
        exports: 1,
        sends: 100,
      },
    });
    await expect(
      workflows.start(actor, await approved(input())),
    ).rejects.toThrow("cap");
    await workspaces.configure(actor, { memberCaps: [{ userId, cap: 1000 }] });
    const requests = await Promise.all([
      approved(input("make_asset")),
      approved(input("make_asset")),
    ]);
    const results = await Promise.allSettled(
      requests.map((r) => workflows.start(actor, r)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const quota = await db.quota.findUniqueOrThrow({
      where: { id: `${workspaceId}:${month()}:exports` },
    });
    expect(quota.reserved).toBe(1);
    const result = results.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<{ id: string }>;
    await workflows.cancel(actor, result.value.id);
    await workflows.execute(result.value.id);
    expect(
      (await db.run.findUniqueOrThrow({ where: { id: result.value.id } }))
        .actualCost,
    ).toBe(0);
    expect(
      (await db.quota.findUniqueOrThrow({ where: { id: quota.id } })).reserved,
    ).toBe(0);
  });
  it("retains attempted provider cost on an uncertain failure without repeating the call", async () => {
    const provider = vi
      .spyOn(Providers.prototype, "enrich")
      .mockRejectedValueOnce(
        new Error("Provider is unavailable. Check its status before retrying."),
      );
    try {
      const request = await approved(input("enrich_contacts"));
      const run = await workflows.start(actor, request);
      await workflows.execute(run.id);
      await workflows.execute(run.id);
      const failed = await db.run.findUniqueOrThrow({ where: { id: run.id } });
      expect(failed.state).toBe("failed");
      expect(failed.actualCost).toBe(3);
      expect(provider).toHaveBeenCalledTimes(1);
      expect(
        (await db.usage.findUniqueOrThrow({ where: { runId: run.id } })).actual,
      ).toBe(3);
    } finally {
      provider.mockRestore();
    }
  });
  it("reconciles duplicate and out-of-order events and cancels across plays", async () => {
    const data = {
      workspaceId,
      prospectId,
      draftId: randomUUID(),
      draftVersion: 1,
      approvalDigest: "fixture",
      sender: "demo@example.test",
      steps: [],
    };
    const first = await db.sequence.create({ data }),
      second = await db.sequence.create({ data });
    const event = {
      id: randomUUID(),
      sequenceId: first.id,
      kind: "delivered",
      occurredAt: new Date().toISOString(),
    };
    await senderEvent(actor, event);
    expect((await senderEvent(actor, event)).duplicate).toBe(true);
    await expect(
      senderEvent(actor, { ...event, kind: "sent" }),
    ).rejects.toThrow("different content");
    await senderEvent(actor, {
      ...event,
      id: randomUUID(),
      kind: "sent",
      occurredAt: new Date(Date.now() - 10000).toISOString(),
    });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: first.id } })).state,
    ).toBe("simulated_delivered");
    await senderEvent(actor, { ...event, id: randomUUID(), kind: "opt_out" });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: second.id } })).state,
    ).toBe("cancelled");
    expect(await db.suppression.count({ where: { workspaceId } })).toBe(1);
    await senderEvent(actor, { ...event, id: randomUUID(), kind: "delivered" });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: first.id } })).state,
    ).toBe("cancelled");
  });
});
it("rejects private network destinations", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.1.1",
    "172.16.1.2",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "64:ff9b::a00:1",
    "2002:7f00:1::",
    "198.51.100.1",
    "203.0.113.3",
    "3fff::1",
  ])
    expect(publicAddress(address)).toBe(false);
});

it("holds unknown, stale and future sender checks and future consent", () => {
  expect(preflightHolds({ checkedAt: "invalid" })).toContain(
    "Refresh the sender check (valid for 24 hours)",
  );
  expect(
    preflightHolds({ checkedAt: new Date(Date.now() + 3600000).toISOString() }),
  ).toContain("Refresh the sender check (valid for 24 hours)");
  expect(
    channelHolds(
      {
        country: "EG",
        lawfulBasis: "consent",
        consentAt: new Date(Date.now() + 3600000),
        excluded: false,
        snapshot: { email: "demo@example.test" },
      },
      true,
    ),
  ).toContain("Record the consent timestamp");
});
