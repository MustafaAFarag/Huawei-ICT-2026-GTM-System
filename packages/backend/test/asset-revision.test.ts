import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import {
  db,
  json,
  digest,
  Storage,
  OpenDesign,
  Crm,
  WorkflowService,
  config,
} from "@revenue/backend";
import {
  directAssetRevision,
  directNavigation,
} from "../src/agent/direct-actions.js";
import { toolRequest } from "@revenue/contracts";
const workspaceId = randomUUID(),
  userId = randomUUID(),
  prospectId = randomUUID(),
  assetId = randomUUID();
const actor = { workspaceId, userId, role: "owner" as const },
  workflows = new WorkflowService();
const evidence = [
  {
    id: randomUUID(),
    kind: "fact",
    approved: true,
    claim: "Example lists 4 open roles.",
    url: "https://example.com/jobs",
    date: "2026-10-10",
    source: "Synthetic",
  },
];
let evidenceDigest: string;
const html =
  '<!doctype html><html dir="ltr"><head></head><body><h1>Existing custom design</h1><p>Example lists 4 open roles.</p><a href="https://example.com/jobs">Source</a></body></html>';
const input = () =>
  toolRequest.parse({
    tool: "make_asset",
    requestKey: randomUUID(),
    prospectIds: [prospectId],
    sourceAssetId: assetId,
    message: "Shorten the heading",
    language: "en",
    template: "offer-one-pager",
  });
beforeAll(async () => {
  await db.user.create({
    data: {
      id: userId,
      name: "Revision tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Revision tests",
      crmBinding: "A",
      assetBinding: "A",
      offers: json([{ approved: true, text: "HR support" }]),
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  await db.prospect.create({
    data: {
      id: prospectId,
      workspaceId,
      ownerId: userId,
      sourceKey: "revision",
      snapshot: json({
        firstName: "Test",
        lastName: "Person",
        company: "Example",
        website: "https://example.com",
        title: "Founder",
      }),
      evidence: json(evidence),
    },
  });
  evidenceDigest = digest(
    (await db.prospect.findUniqueOrThrow({ where: { id: prospectId } }))
      .evidence,
  );
  await db.asset.create({
    data: {
      id: assetId,
      workspaceId,
      prospectId,
      runId: randomUUID(),
      template: "offer-one-pager",
      language: "en",
      engineVersion: "test",
      title: "Existing",
      htmlKey: `${assetId}.html`,
      pdfKey: `${assetId}.pdf`,
      evidenceDigest,
      approvedAt: new Date(),
      approvedBy: userId,
    },
  });
  await new Storage().put(workspaceId, `${assetId}.html`, html, "text/html");
});
afterAll(async () => {
  vi.restoreAllMocks();
  const runs = await db.run.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  await db.outbox.deleteMany({
    where: { runId: { in: runs.map((r) => r.id) } },
  });
  for (const model of [
    db.quotaReservation,
    db.quota,
    db.spendApproval,
    db.usage,
    db.audit,
    db.budget,
    db.asset,
    db.run,
    db.prospect,
  ])
    await (model.deleteMany as any)({ where: { workspaceId } });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
  await rm(join(config.storagePath, workspaceId), {
    recursive: true,
    force: true,
  });
});
describe("existing-asset revision governance", () => {
  it("resolves clear UI/document commands locally and leaves read requests for the model", async () => {
    expect(
      await directNavigation(
        actor,
        "Open the latest English one-pager for Test Person",
        {},
      ),
    ).toEqual({ kind: "open_asset", assetId });
    expect(await directNavigation(actor, "Open Test Person", {})).toEqual({
      kind: "open_account",
      prospectId,
    });
    expect(
      await directNavigation(actor, "Show Test Person's latest messages", {}),
    ).toBeNull();
    expect(
      await directAssetRevision(actor, "Shorten the heading", assetId),
    ).toMatchObject({
      sourceAssetId: assetId,
      prospectIds: [prospectId],
      instructions: "Shorten the heading",
      language: "en",
    });
    expect(
      await directAssetRevision(actor, "What does this heading mean?", assetId),
    ).toBeNull();
    expect(
      await directAssetRevision(
        { ...actor, workspaceId: randomUUID() },
        "Shorten the heading",
        assetId,
      ),
    ).toBeNull();
  });
  it("rejects foreign assets, changed sources, mismatched language and multi-account edits", async () => {
    await expect(
      workflows.quote(actor, { ...input(), sourceAssetId: randomUUID() }),
    ).rejects.toThrow(/must match/);
    await expect(
      workflows.quote(actor, { ...input(), language: "ar" }),
    ).rejects.toThrow(/must match/);
    await db.asset.update({
      where: { id: assetId },
      data: { evidenceDigest: "stale" },
    });
    await expect(workflows.quote(actor, input())).rejects.toThrow(
      /Evidence changed/,
    );
    await db.asset.update({ where: { id: assetId }, data: { evidenceDigest } });
  });
  it("binds the original version to cost approval and creates a new unapproved asset from its HTML", async () => {
    const stale = input(),
      quote = await workflows.quote(actor, stale);
    await workflows.approveQuote(actor, quote.id);
    await db.asset.update({
      where: { id: assetId },
      data: { version: { increment: 1 } },
    });
    await expect(
      workflows.start(actor, { ...stale, spendApprovalId: quote.id }),
    ).rejects.toThrow(/current cost and scope/);
    const request = input(),
      fresh = await workflows.quote(actor, request);
    await workflows.approveQuote(actor, fresh.id);
    const generate = vi
      .spyOn(OpenDesign.prototype, "generate")
      .mockResolvedValue({
        html: html.replace("Existing custom design", "Short heading"),
        engineProjectId: "test",
      });
    vi.spyOn(Crm.prototype, "upsertObject").mockResolvedValue({} as any);
    const run = await workflows.start(actor, {
      ...request,
      spendApprovalId: fresh.id,
    });
    await workflows.execute(run.id);
    expect(
      (await db.run.findUniqueOrThrow({ where: { id: run.id } })).state,
    ).toBe("succeeded");
    expect(generate.mock.calls[0]?.[5]).toBe(html);
    const assets = await db.asset.findMany({ where: { workspaceId } });
    expect(assets).toHaveLength(2);
    expect(assets.find((a) => a.id !== assetId)?.approvedAt).toBeNull();
    expect(assets.find((a) => a.id === assetId)?.approvedAt).not.toBeNull();
    expect(
      (await new Storage().get(workspaceId, `${assetId}.html`)).toString(),
    ).toBe(html);
  });
});
