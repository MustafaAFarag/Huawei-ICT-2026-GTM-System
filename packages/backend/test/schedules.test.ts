import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  json,
  ScheduleService,
  prepareDueReviews,
  WorkflowService,
} from "@revenue/backend";

const workspaceId = randomUUID(),
  userId = randomUUID();
const actor = { workspaceId, userId, role: "owner" as const };
const service = new ScheduleService();
let prospectId: string, scheduleId: string, reviewId: string;
const now = new Date();
const input = () => ({
  name: "Weekly synthetic review",
  play: "P3",
  tool: "draft_messages",
  prospectIds: [prospectId],
  language: "en",
  nextAt: new Date(now.getTime() - 1000).toISOString(),
  intervalDays: 7,
});
beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Schedule test",
      plan: "Team",
      crmBinding: "A",
      assetBinding: "A",
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Schedule owner",
      email: `${userId}@example.test`,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  const p = await db.prospect.create({
    data: {
      workspaceId,
      ownerId: userId,
      sourceKey: "scheduled@example.test",
      snapshot: json({
        firstName: "A",
        lastName: "B",
        email: "scheduled@example.test",
        company: "Scheduled Lab",
        website: "https://example.com",
        title: "Founder",
      }),
    },
  });
  prospectId = p.id;
});
afterAll(async () => {
  const runs = await db.run.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  await db.outbox.deleteMany({
    where: { runId: { in: runs.map((r) => r.id) } },
  });
  await db.schedule.deleteMany({ where: { workspaceId } });
  for (const model of [
    db.spendApproval,
    db.usage,
    db.quotaReservation,
    db.quota,
    db.audit,
    db.budget,
    db.run,
    db.prospect,
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});
describe("durable recurring play reviews", () => {
  it("validates role, time, audience and workspace before persisting", async () => {
    await expect(
      service.create({ ...actor, role: "viewer" }, input()),
    ).rejects.toThrow(/viewer/);
    await expect(
      service.create(actor, { ...input(), prospectIds: [randomUUID()] }),
    ).rejects.toThrow(/workspace/);
    await expect(
      service.create(actor, { ...input(), nextAt: "2020-01-01T00:00:00.000Z" }),
    ).rejects.toThrow(/first review/);
    await expect(
      service.create(actor, { ...input(), prospectIds: [] }),
    ).rejects.toThrow(/Select accounts/);
    const schedule = await service.create(actor, input());
    scheduleId = schedule.id;
  });
  it("creates one review under concurrent ticks, with no quote, run or spend", async () => {
    const results = await Promise.all([
      prepareDueReviews(now),
      prepareDueReviews(now),
    ]);
    expect(results.reduce((n, r) => n + r.created, 0)).toBe(1);
    const reviews = await service.reviews(actor);
    expect(reviews).toHaveLength(1);
    reviewId = reviews[0]!.id;
    expect(await db.run.count({ where: { workspaceId } })).toBe(0);
    expect(await db.spendApproval.count({ where: { workspaceId } })).toBe(0);
    expect(await db.usage.count({ where: { workspaceId } })).toBe(0);
    expect(
      (await new ScheduleService().list(actor))[0]!.nextAt.getTime(),
    ).toBeGreaterThan(now.getTime());
    const later = new Date(now.getTime() + 15 * 86400000);
    await prepareDueReviews(later);
    expect(await db.scheduledReview.count({ where: { workspaceId } })).toBe(1);
    expect((await service.list(actor))[0]!.nextAt.getTime()).toBeGreaterThan(
      later.getTime(),
    );
  });
  it("refreshes quotes from current state and starts an occurrence only once", async () => {
    const a = await service.quote(actor, reviewId),
      b = await service.quote(actor, reviewId);
    expect(a.quote.id).not.toBe(b.quote.id);
    expect(a.input.requestKey).toBe(b.input.requestKey);
    expect(await db.run.count({ where: { workspaceId } })).toBe(0);
    const workflow = new WorkflowService();
    await expect(workflow.start(actor, a.input)).rejects.toThrow(/approve/);
    await workflow.approveQuote(actor, a.quote.id);
    const run = await workflow.start(actor, {
      ...a.input,
      spendApprovalId: a.quote.id,
    });
    await workflow.approveQuote(actor, b.quote.id);
    const duplicate = await workflow.start(actor, {
      ...b.input,
      spendApprovalId: b.quote.id,
    });
    expect(duplicate.id).toBe(run.id);
    expect(await db.run.count({ where: { workspaceId } })).toBe(1);
    expect((await service.reviews(actor))[0]!.runId).toBe(run.id);
    await expect(service.quote(actor, reviewId)).rejects.toThrow(
      /already started/,
    );
  });
  it("pauses on creator permission revocation and respects workspace isolation", async () => {
    await db.schedule.update({
      where: { id: scheduleId },
      data: { nextAt: new Date(now.getTime() - 1000) },
    });
    await db.membership.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: "viewer" },
    });
    await prepareDueReviews(now);
    expect((await service.list(actor))[0]).toMatchObject({ enabled: false });
    expect((await service.list(actor))[0]!.lastError).toMatch(/permission/);
    const other = { ...actor, workspaceId: randomUUID() };
    expect(await service.list(other)).toEqual([]);
    expect(await service.reviews(other)).toEqual([]);
    await expect(service.quote(other, reviewId)).rejects.toThrow(/not found/);
    await expect(service.dismiss(other, reviewId)).rejects.toThrow(/not found/);
    await db.membership.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: "owner" },
    });
  });
  it("supports pause/resume and explicit dismissal without deleting history", async () => {
    await service.update(actor, scheduleId, { enabled: true });
    expect((await service.list(actor))[0]!.enabled).toBe(true);
    await service.update(actor, scheduleId, { enabled: false });
    await service.dismiss(actor, reviewId);
    expect(await service.reviews(actor)).toEqual([]);
    expect(await db.scheduledReview.count({ where: { workspaceId } })).toBe(1);
  });
});
