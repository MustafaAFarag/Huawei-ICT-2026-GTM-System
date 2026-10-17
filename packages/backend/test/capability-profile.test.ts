import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Actor, Evidence, Touch } from "@revenue/contracts";
import { toolRequest } from "@revenue/contracts";
import {
  Crm,
  ExportBatchService,
  OpenDesign,
  Storage,
  WorkflowService,
  attachAssetToDraft,
  config,
  db,
  deliverableBasis,
  digest,
  formatContext,
  generateDeliverable,
  json,
  pageCount,
  renderContent,
  workspaceBasisDigest,
} from "@revenue/backend";

// Capability profile (A6 / STU-09), fixture mode: no paid model calls.
// Acceptance: built only from approved offers, references and proof; RTL in Arabic;
// attaches to the account and to the draft; holdout sequences carry no asset.
const workspaceId = randomUUID(),
  otherWorkspaceId = randomUUID(),
  userId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
const workflows = new WorkflowService();
const exporter = new ExportBatchService();
const now = new Date().toISOString();

const APPROVED_OFFER = "Payroll and HR operations run for growing teams";
const APPROVED_OFFER_AR = "تشغيل الرواتب والموارد البشرية للفرق النامية";
const UNAPPROVED_OFFER = "Guaranteed 90% cost cut on every account";
const CONSENTED_REF = "Orbit Logistics";
const CONSENTED_REF_AR = "مدار للخدمات اللوجستية";
const UNCONSENTED_REF = "Secretive Holdings";
const APPROVED_FACT = "Lumaro Pay lists 12 open payroll roles.";
const UNAPPROVED_FACT = "Lumaro Pay lost its CFO last week.";

const evidence: Evidence[] = [
  { id: "f1", claim: APPROVED_FACT, url: "https://lumaro.example/careers", date: "2026-09-01", kind: "fact", approved: true, source: "Careers page" },
  { id: "f2", claim: UNAPPROVED_FACT, url: "https://lumaro.example/news", date: "2026-09-02", kind: "fact", approved: false, source: "News" },
];
const workspaceRow = {
  name: "Caravan profile test",
  brand: { name: "Nour Studio", primary: "#1f2937", accent: "#f59e0b", website: "https://nour-studio.example" },
  company: {
    description: "A payroll and HR operations partner in Cairo.",
    descriptionAr: "شريك لتشغيل الرواتب والموارد البشرية في القاهرة.",
    references: [
      { name: CONSENTED_REF, nameAr: CONSENTED_REF_AR, consent: true },
      { name: UNCONSENTED_REF, consent: false },
    ],
  },
  offers: [
    { approved: true, text: APPROVED_OFFER, textAr: APPROVED_OFFER_AR },
    { approved: false, text: UNAPPROVED_OFFER },
  ],
};
const snapshot = {
  firstName: "Lina",
  lastName: "Hassan",
  email: "lina@lumaro.example",
  company: "Lumaro Pay",
  website: "https://lumaro.example",
  title: "Head of People",
  employees: 60,
  hiring: true,
};
const context = (language = "en", withAccount = true, holdoutPercent?: number) =>
  formatContext({
    workspace: workspaceRow,
    snapshot: withAccount ? snapshot : undefined,
    evidence,
    language,
    holdoutPercent,
  });
const profile = async (language = "en", withAccount = true, holdoutPercent?: number) =>
  generateDeliverable("capability-profile", { ...context(language, withAccount, holdoutPercent), date: "2026-10-18" }, {});

const touches = (): Touch[] => [
  { channel: "email", day: 0, subject: "An idea", body: "Hello Lina. Reply stop to opt out.", evidenceIds: ["f1"] },
  { channel: "call", day: 3, body: "Ask for a time.", evidenceIds: [] },
];

const prospectId = randomUUID(),
  holdProspectId = randomUUID(),
  otherProspectId = randomUUID();
const brandAssetId = randomUUID(),
  accountAssetId = randomUUID(),
  unapprovedAssetId = randomUUID(),
  otherAccountAssetId = randomUUID();
const draftId = randomUUID(),
  holdDraftId = randomUUID(),
  otherDraftId = randomUUID();

const makeAsset = (id: string, extra: { prospectId?: string | null; approved?: boolean; template?: string; digestOf?: string }) =>
  db.asset.create({
    data: {
      id,
      workspaceId,
      prospectId: extra.prospectId ?? null,
      runId: randomUUID(),
      template: extra.template ?? "capability-profile",
      language: "en",
      engineVersion: "test",
      title: `Asset ${id.slice(0, 4)}`,
      htmlKey: `${id}.html`,
      pdfKey: null,
      evidenceDigest: extra.digestOf ?? "test",
      approvedAt: extra.approved === false ? null : new Date(),
      approvedBy: extra.approved === false ? null : userId,
    },
  });

beforeAll(async () => {
  await db.user.create({ data: { id: userId, name: "Profile tester", email: `${userId}@example.test`, emailVerified: true } });
  for (const id of [workspaceId, otherWorkspaceId])
    await db.workspace.create({
      data: {
        id,
        name: workspaceRow.name,
        crmBinding: "A",
        assetBinding: "A",
        brand: json(workspaceRow.brand),
        company: json(workspaceRow.company),
        offers: json(workspaceRow.offers),
        preflight: json({
          mailbox: "sender@caravan.example",
          spf: true,
          dkim: true,
          dmarc: true,
          unsubscribe: true,
          warmupDays: 30,
          bounceRate: 0.005,
          complaintRate: 0.0002,
          dailyCap: 20,
          checkedAt: now,
          simulated: true,
        }),
      },
    });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (const [id, key] of [
    [prospectId, "main"],
    [holdProspectId, "hold"],
  ] as const)
    await db.prospect.create({
      data: {
        id,
        workspaceId,
        ownerId: userId,
        sourceKey: `${key}@lumaro.example`,
        country: "SA",
        lawfulBasis: "relationship",
        basisEvidence: json([{ type: "relationship", source: "CRM", date: "2026-08-01", recordedBy: "tester", recordedAt: now }]),
        language: "en",
        evidence: json(evidence.slice(0, 1)),
        snapshot: json({ ...snapshot, email: `${key}@lumaro.example` }),
      },
    });
  // A prospect in another account of the workspace: its asset must not attach here.
  await db.prospect.create({
    data: {
      id: otherProspectId,
      workspaceId,
      ownerId: userId,
      sourceKey: "other@elsewhere.example",
      language: "en",
      evidence: json(evidence.slice(0, 1)),
      snapshot: json({ ...snapshot, company: "Elsewhere", email: "other@elsewhere.example" }),
    },
  });
  for (const [id, pid] of [
    [draftId, prospectId],
    [holdDraftId, holdProspectId],
    [otherDraftId, otherProspectId],
  ] as const)
    await db.draft.create({
      data: {
        workspaceId,
        id,
        prospectId: pid,
        playVersionId: "play-v1",
        runId: randomUUID(),
        version: 1,
        content: json(touches()),
        evidenceDigest: digest((await db.prospect.findUniqueOrThrow({ where: { id: pid } })).evidence),
        approvedVersion: 1,
      },
    });
  await makeAsset(brandAssetId, {});
  await makeAsset(accountAssetId, { prospectId });
  await makeAsset(unapprovedAssetId, { approved: false });
  await makeAsset(otherAccountAssetId, { prospectId: otherProspectId, template: "offer-one-pager" });
});

afterAll(async () => {
  vi.restoreAllMocks();
  const runs = await db.run.findMany({ where: { workspaceId }, select: { id: true } });
  await db.outbox.deleteMany({ where: { runId: { in: runs.map((r) => r.id) } } });
  for (const model of [
    db.quotaReservation,
    db.quota,
    db.spendApproval,
    db.usage,
    db.providerEvent,
    db.exportBatch,
    db.audit,
    db.budget,
    db.sequence,
    db.draft,
    db.asset,
    db.run,
    db.prospect,
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({ where: { workspaceId } });
  await db.workspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } });
  await db.user.delete({ where: { id: userId } });
  await rm(join(config.storagePath, workspaceId), { recursive: true, force: true });
});

describe("capability profile content (approved sources only)", () => {
  it("renders the approved offer, the consented reference and the approved fact", async () => {
    const { html } = await profile();
    expect(html).toContain(APPROVED_OFFER);
    expect(html).toContain(CONSENTED_REF);
    expect(html).toContain(APPROVED_FACT);
    expect(html).toContain("Lumaro Pay");
  });

  it("never renders an unapproved offer, unconsented reference or unapproved fact", async () => {
    for (const language of ["en", "ar"])
      for (const withAccount of [true, false]) {
        const { html } = await profile(language, withAccount);
        expect(html).not.toContain(UNAPPROVED_OFFER);
        expect(html).not.toContain(UNCONSENTED_REF);
        expect(html).not.toContain(UNAPPROVED_FACT);
        expect(html).not.toContain("lumaro.example/news");
      }
  });

  it("filters unapproved offers, unconsented references and unapproved facts out of the context itself", () => {
    const ctx = context();
    expect(ctx.offers).toEqual([APPROVED_OFFER]);
    expect(ctx.references).toEqual([CONSENTED_REF]);
    expect(ctx.facts.map((f) => f.id)).toEqual(["f1"]);
  });

  it("renders no proof block when no reference has recorded consent", () => {
    const ctx = formatContext({
      workspace: { ...workspaceRow, company: { ...workspaceRow.company, references: [{ name: UNCONSENTED_REF, consent: false }] } },
      evidence,
      language: "en",
    });
    const { html } = renderContent("capability-profile", { title: "Nour Studio capability profile" }, ctx) as { html: string };
    expect(html).not.toContain(UNCONSENTED_REF);
    expect(html).not.toContain('class="proof"');
  });

  it("refuses to generate without an approved offer", async () => {
    const ctx = formatContext({
      workspace: { ...workspaceRow, offers: [{ approved: false, text: UNAPPROVED_OFFER }] },
      evidence,
      language: "en",
    });
    await expect(generateDeliverable("capability-profile", { ...ctx, date: "2026-10-18" }, {})).rejects.toThrow(/Approve an offer/);
  });

  it("uses a cover page only when tailored to an account", async () => {
    const tailored = await profile("en", true);
    const generic = await profile("en", false);
    expect(tailored.html).toContain('data-page="cover"');
    expect(tailored.html).toContain("Prepared for");
    expect(generic.html).not.toContain('data-page="cover"');
    expect(pageCount("capability-profile", tailored.html)).toBe(2);
    expect(pageCount("capability-profile", generic.html)).toBe(1);
  });
});

describe("capability profile in Arabic", () => {
  it("renders right to left with the Arabic offer and reference names", async () => {
    const { html } = await profile("ar-EG");
    expect(html).toMatch(/<html lang="ar" dir="rtl"/);
    expect(html).toContain("ملف القدرات");
    expect(html).toContain(APPROVED_OFFER_AR);
    expect(html).toContain(CONSENTED_REF_AR);
    expect(html).not.toContain(UNAPPROVED_OFFER);
    expect(html).not.toContain(UNCONSENTED_REF);
  });

  it("keeps English left to right", async () => {
    expect((await profile("en")).html).toMatch(/<html lang="en" dir="ltr"/);
  });
});

describe("capability profile holdout badge", () => {
  it("shows the holdout share to the reviewer and hides it from print", async () => {
    const { html } = await profile("en", true, 30);
    expect(html).toContain('data-holdout="30"');
    expect(html).toContain("Holdout test: 30% of sequences get no profile");
    expect(html).toMatch(/@media print\{\.holdout-badge\{display:none\}\}/);
  });

  it("defaults to 20% and renders the badge in Arabic too", async () => {
    expect((await profile("en", false)).html).toContain('data-holdout="20"');
    const ar = (await profile("ar", false, 10)).html;
    expect(ar).toContain('data-holdout="10"');
    expect(ar).toContain("اختبار المقارنة");
  });
});

describe("attaching the profile to the account and the draft", () => {
  it("stores a brand-level profile through the workflow and binds it to the workspace basis", async () => {
    const request = toolRequest.parse({
      tool: "make_asset",
      requestKey: randomUUID(),
      prospectIds: [],
      template: "capability-profile",
      language: "ar",
      holdoutPercent: 25,
    });
    const quote = await workflows.quote(actor, request);
    await workflows.approveQuote(actor, quote.id);
    vi.spyOn(OpenDesign.prototype, "save").mockResolvedValue(null as never);
    vi.spyOn(Crm.prototype, "upsertObject").mockResolvedValue({} as never);
    const run = await workflows.start(actor, { ...request, spendApprovalId: quote.id });
    await workflows.execute(run.id);
    expect((await db.run.findUniqueOrThrow({ where: { id: run.id } })).state).toBe("succeeded");
    const asset = await db.asset.findFirstOrThrow({ where: { workspaceId, runId: run.id } });
    expect(asset).toMatchObject({ template: "capability-profile", prospectId: null, language: "ar", approvedAt: null });
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    expect(asset.evidenceDigest).toBe(workspaceBasisDigest(workspace));
    const html = (await new Storage().get(workspaceId, asset.htmlKey)).toString("utf8");
    expect(html).toMatch(/dir="rtl"/);
    expect(html).toContain('data-holdout="25"');
    expect(html).not.toContain(UNAPPROVED_OFFER);
    expect(html).not.toContain(UNCONSENTED_REF);
  });

  it("binds a tailored profile to the workspace and the account evidence", async () => {
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const prospect = await db.prospect.findUniqueOrThrow({ where: { id: prospectId } });
    const brand = digest(deliverableBasis("capability-profile", workspace, null));
    const tailored = digest(deliverableBasis("capability-profile", workspace, prospect.evidence));
    expect(tailored).not.toBe(brand);
    // Other formats stay bound to the account evidence alone.
    expect(digest(deliverableBasis("offer-one-pager", workspace, prospect.evidence))).toBe(digest(prospect.evidence));
  });

  it("attaches the brand-level profile to any draft, resetting its approval", async () => {
    const updated = await attachAssetToDraft(workspaceId, draftId, { assetId: brandAssetId, version: 1 });
    expect(updated).toMatchObject({ assetId: brandAssetId, version: 2, approvedVersion: null, approvedAt: null });
    const again = await attachAssetToDraft(workspaceId, holdDraftId, { assetId: brandAssetId, version: 1 });
    expect(again.assetId).toBe(brandAssetId);
  });

  it("attaches an account-tailored profile only to its own account's draft", async () => {
    const current = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
    const updated = await attachAssetToDraft(workspaceId, draftId, { assetId: accountAssetId, version: current.version });
    expect(updated.assetId).toBe(accountAssetId);
    await expect(attachAssetToDraft(workspaceId, otherDraftId, { assetId: accountAssetId, version: 1 })).rejects.toThrow();
  });

  it("refuses an unapproved profile, another account's asset and a stale draft version", async () => {
    await expect(attachAssetToDraft(workspaceId, otherDraftId, { assetId: unapprovedAssetId, version: 1 })).rejects.toThrow();
    // Another account's non-profile asset is refused even with a matching version.
    await expect(attachAssetToDraft(workspaceId, draftId, { assetId: otherAccountAssetId, version: 1 })).rejects.toThrow();
    await expect(attachAssetToDraft(workspaceId, otherDraftId, { assetId: brandAssetId, version: 7 })).rejects.toThrow(/changed/);
    await expect(attachAssetToDraft(otherWorkspaceId, otherDraftId, { assetId: brandAssetId, version: 1 })).rejects.toThrow();
  });
});

describe("holdout sequences carry no profile", () => {
  it("withholds the asset from every step of a holdout sequence and keeps it otherwise", async () => {
    // Re-attach so both drafts carry the profile at their current version.
    const fresh = async (id: string) => {
      const draft = await db.draft.findUniqueOrThrow({ where: { id } });
      await attachAssetToDraft(workspaceId, id, { assetId: brandAssetId, version: draft.version });
      await db.draft.update({ where: { id }, data: { approvedVersion: draft.version + 1 } });
    };
    await fresh(draftId);
    await fresh(holdDraftId);
    const held = await exporter.create(actor, { draftIds: [holdDraftId], holdoutPercent: 100 });
    const sequence = await db.sequence.findFirstOrThrow({ where: { batchId: held.export!.id } });
    expect(sequence.holdout).toBe(true);
    const steps = sequence.steps as { assetId: string | null }[];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s) => s.assetId === null)).toBe(true);

    const sent = await exporter.create(actor, { draftIds: [draftId], holdoutPercent: 0 });
    const kept = await db.sequence.findFirstOrThrow({ where: { batchId: sent.export!.id } });
    expect(kept.holdout).toBe(false);
    expect((kept.steps as { assetId: string | null }[]).every((s) => s.assetId === brandAssetId)).toBe(true);
  });
});
