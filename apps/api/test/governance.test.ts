import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  WorkflowService,
  WorkspaceService,
  json,
  month,
  digest,
  publicAddress,
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
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
describe("PostgreSQL-backed governance", () => {
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
  ])
    expect(publicAddress(address)).toBe(false);
});
