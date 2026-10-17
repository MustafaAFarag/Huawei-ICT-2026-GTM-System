import { BadRequestException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import {
  BUCKETS,
  FUNNEL,
  PLAYS,
  angleFor,
  draftChecks,
  duplicateGroups,
  type Actor,
  type Preflight,
  type ProspectSnapshot,
  type Touch,
} from "@revenue/contracts";
import { db, json, serializable } from "./database.js";
import {
  assertRole,
  channelHolds,
  digest,
  escapeHtml,
  preflightHolds,
  score,
  validateEvidence,
} from "./policy.js";
import { injectFonts } from "./asset-template.js";
import { renderPdf } from "./providers.js";
import { discoveryGuide, discoveryGuideHtml } from "./discovery-guide.js";
import { researchBrief, researchBriefHtml } from "./research-brief.js";

// PRD v3.1 §7.14 features that sit beside the play engine: triage, duplicates, launch gate,
// scorecard, SDR onboarding kit and discovery capture.

const audit = (
  actor: Actor,
  action: string,
  targetId: string | null,
  details: unknown,
) =>
  db.audit.create({
    data: {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action,
      targetId,
      details: json(details),
    },
  });

async function prospectOf(actor: Actor, id: string) {
  const prospect = await db.prospect.findFirst({
    where: { id, workspaceId: actor.workspaceId },
  });
  if (!prospect) throw new NotFoundException("Prospect not found.");
  return prospect;
}

export class GtmService {
  async researchBrief(
    actor: Actor,
    prospectId: string,
    language: "en" | "ar",
    format: "json" | "pdf" = "json",
  ) {
    const prospect = await prospectOf(actor, prospectId);
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: actor.workspaceId },
    });
    const brief = researchBrief(
      prospect.snapshot as ProspectSnapshot,
      prospect.evidence as import("@revenue/contracts").Evidence[],
      workspace.name,
      prospect.updatedAt,
      language,
    );
    return format === "json"
      ? brief
      : renderPdf(injectFonts(researchBriefHtml(brief)));
  }

  async interviewGuide(actor: Actor, prospectId: string, language: "en" | "ar", format: "json" | "pdf" = "json") {
    const prospect = await prospectOf(actor, prospectId);
    const workspace = await db.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId } });
    const guide = discoveryGuide(prospect.snapshot as ProspectSnapshot, prospect.evidence as import("@revenue/contracts").Evidence[], workspace.name, language);
    if (format === "json") return guide;
    return renderPdf(injectFonts(discoveryGuideHtml(guide)));
  }

  // GAP-03 / GAP-13: bucket, rationale, segment and owner. Drop and existing cancel live sequences.
  async triage(actor: Actor, prospectId: string, value: unknown) {
    assertRole(actor, "write");
    const input = z
      .object({
        bucket: z.enum(BUCKETS as [string, ...string[]]).optional(),
        rationale: z.string().max(500).optional(),
        segment: z.string().max(10).optional(),
        ownerId: z.string().max(100).optional(),
      })
      .parse(value);
    const prospect = await prospectOf(actor, prospectId);
    if (input.ownerId) {
      const member = await db.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: actor.workspaceId,
            userId: input.ownerId,
          },
        },
      });
      if (!member)
        throw new BadRequestException("The owner must be a workspace member.");
    }
    const snapshot = {
      ...(prospect.snapshot as ProspectSnapshot),
      ...(input.bucket
        ? { bucket: input.bucket as ProspectSnapshot["bucket"] }
        : {}),
      ...(input.bucket === "existing" ? { existingClient: true } : {}),
      ...(input.rationale !== undefined ? { triageNote: input.rationale } : {}),
      ...(input.segment !== undefined ? { segment: input.segment } : {}),
    };
    return serializable(async (tx) => {
      if (input.bucket === "drop" || input.bucket === "existing")
        await tx.sequence.updateMany({
          where: {
            workspaceId: actor.workspaceId,
            prospectId,
            state: { notIn: ["cancelled", "completed", "failed"] },
          },
          data: { state: "cancelled" },
        });
      const updated = await tx.prospect.update({
        where: { id: prospectId },
        data: {
          snapshot: json(snapshot),
          ...(input.ownerId ? { ownerId: input.ownerId } : {}),
        },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "prospect.triaged",
          targetId: prospectId,
          details: json(input),
        },
      });
      return updated;
    });
  }

  // GAP-02: near-duplicate groups across the workspace.
  async duplicates(actor: Actor) {
    const rows = await db.prospect.findMany({
      where: { workspaceId: actor.workspaceId, excluded: false },
      select: { id: true, snapshot: true, createdAt: true, crmPersonId: true },
    });
    return duplicateGroups(
      rows.map((r) => ({ ...r, snapshot: r.snapshot as ProspectSnapshot })),
    ).map((group) =>
      group.map((r) => ({
        id: r.id,
        snapshot: r.snapshot,
        crmPersonId: r.crmPersonId,
      })),
    );
  }

  async resolveDuplicate(actor: Actor, value: unknown) {
    assertRole(actor, "write");
    const input = z
      .object({ keepId: z.uuid(), dropIds: z.array(z.uuid()).min(1).max(20) })
      .parse(value);
    if (input.dropIds.includes(input.keepId))
      throw new BadRequestException("Keep and drop must differ.");
    return serializable(async (tx) => {
      const rows = await tx.prospect.findMany({
        where: {
          workspaceId: actor.workspaceId,
          id: { in: [input.keepId, ...input.dropIds] },
        },
      });
      if (rows.length !== new Set([input.keepId, ...input.dropIds]).size)
        throw new NotFoundException("Prospect not found.");
      for (const id of input.dropIds) {
        const prospect = rows.find((row) => row.id === id)!;
        await tx.prospect.update({
          where: { id },
          data: {
            excluded: true,
            snapshot: json({
              ...(prospect.snapshot as ProspectSnapshot),
              bucket: "drop",
              triageNote: `Duplicate of ${input.keepId}`,
            }),
          },
        });
      }
      await tx.sequence.updateMany({
        where: {
          workspaceId: actor.workspaceId,
          prospectId: { in: input.dropIds },
          state: { notIn: ["cancelled", "completed", "failed"] },
        },
        data: { state: "cancelled" },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "prospect.duplicates_resolved",
          targetId: input.keepId,
          details: json(input),
        },
      });
      return { kept: input.keepId, dropped: input.dropIds.length };
    });
  }

  // GAP-06: the same holds queue_sequence enforces, shown before a quote is requested.
  async launchGate(actor: Actor, draftIds: string[]) {
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: actor.workspaceId },
    });
    const items: { id: string; label: string; ok: boolean; detail?: string }[] =
      [];
    const offers = workspace.offers as { approved: boolean }[];
    items.push({
      id: "offer",
      label: "An approved offer exists",
      ok: offers.some((o) => o.approved),
    });
    const sender = preflightHolds(workspace.preflight as Partial<Preflight>);
    items.push({
      id: "sender",
      label: "Sender pre-flight passes (P2)",
      ok: !sender.length,
      detail: sender.slice(0, 3).join("; "),
    });
    const drafts = await db.draft.findMany({
      where: { workspaceId: actor.workspaceId, id: { in: draftIds } },
    });
    items.push({
      id: "drafts",
      label: "At least one draft is selected",
      ok: drafts.length > 0,
    });
    const marketingLicence =
      (workspace.company as { marketingLicence?: boolean }).marketingLicence ===
      true;
    for (const draft of drafts) {
      const prospect = await db.prospect.findUniqueOrThrow({
        where: { id: draft.prospectId },
      });
      const snapshot = prospect.snapshot as ProspectSnapshot;
      const holds = channelHolds(prospect, marketingLicence);
      try {
        validateEvidence(
          prospect.evidence as import("@revenue/contracts").Evidence[],
        );
      } catch (error) {
        holds.push((error as Error).message);
      }
      if (
        await db.sequence.count({
          where: {
            workspaceId: actor.workspaceId,
            prospectId: prospect.id,
            state: { notIn: ["cancelled", "completed", "failed"] },
          },
        })
      )
        holds.push("This contact is already enrolled in an active sequence");
      if (
        draft.approvedVersion !== draft.version ||
        draft.evidenceDigest !== digest(prospect.evidence)
      )
        holds.push("Approve the current draft and evidence");
      if (score(snapshot).disqualified)
        holds.push("Below the qualification threshold");
      for (const check of draftChecks(
        draft.content as Touch[],
        prospect.language,
      ))
        if (check.level === "error") holds.push(check.message);
      const suppressed = await db.suppression.findUnique({
        where: {
          workspaceId_identity: {
            workspaceId: actor.workspaceId,
            identity: prospect.sourceKey,
          },
        },
      });
      if (suppressed) holds.push("Suppressed contact");
      items.push({
        id: `draft:${draft.id}`,
        label:
          `${snapshot.company} — ${snapshot.firstName} ${snapshot.lastName}`.trim(),
        ok: !holds.length,
        detail: holds.join("; "),
      });
    }
    return { ready: items.every((i) => i.ok), items };
  }

  // GAP-07: funnel from sequences, provider events and confirmed call outcomes.
  async scorecard(actor: Actor) {
    const ws = actor.workspaceId;
    const [sequences, events, calls] = await Promise.all([
      db.sequence.findMany({
        where: { workspaceId: ws },
        select: { id: true, holdout: true, prospectId: true },
      }),
      db.providerEvent.findMany({
        where: { workspaceId: ws },
        select: { kind: true, sequenceId: true },
      }),
      db.audit.findMany({
        where: { workspaceId: ws, action: "call.outcome" },
        select: { details: true, targetId: true },
      }),
    ]);
    const seqWith = (kind: string) =>
      new Set(events.filter((e) => e.kind === kind).map((e) => e.sequenceId));
    const delivered = seqWith("delivered"),
      replied = seqWith("replied");
    const outcome = (o: string) =>
      new Set(
        calls
          .filter((c) => (c.details as { outcome?: string }).outcome === o)
          .map((c) => c.targetId),
      );
    const meetings = outcome("meeting-booked");
    const counts = {
      prepared: sequences.length,
      delivered: sequences.filter(
        (s) => delivered.has(s.id) || replied.has(s.id),
      ).length,
      replied: sequences.filter((s) => replied.has(s.id)).length,
      meeting: meetings.size,
      agreed: outcome("agreed").size,
    };
    const group = (holdout: boolean) => {
      const list = sequences.filter((s) => s.holdout === holdout);
      const d = list.filter(
        (s) => delivered.has(s.id) || replied.has(s.id),
      ).length;
      const r = list.filter((s) => replied.has(s.id)).length;
      return {
        sequences: list.length,
        delivered: d,
        replied: r,
        replyRate: d ? r / d : null,
      };
    };
    return {
      stages: FUNNEL.map((stage) => ({ stage, count: counts[stage] })),
      asset: group(false),
      holdout: group(true),
      // Below this sample size no lift claim is shown (SEQ-08).
      minimumSample: 100,
      calls: calls.length,
    };
  }

  // GAP-11: SDR onboarding kit generated from workspace context.
  async sdrKit(actor: Actor) {
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: actor.workspaceId },
    });
    const company = workspace.company as {
      description?: string;
      icp?: string;
      segments?: Record<string, string>;
      angles?: Record<string, string>;
      references?: { name: string; consent: boolean }[];
    };
    const brand = workspace.brand as { name?: string; primary?: string };
    const offers = (
      workspace.offers as { text: string; approved: boolean }[]
    ).filter((o) => o.approved);
    const prospects = await db.prospect.findMany({
      where: { workspaceId: actor.workspaceId },
      select: { snapshot: true },
    });
    const personas = new Map<string, number>();
    for (const p of prospects) {
      const a = angleFor(
        p.snapshot as ProspectSnapshot,
        company.angles,
        offers[0]?.text,
      );
      personas.set(`${a.persona}`, (personas.get(a.persona) ?? 0) + 1);
    }
    const row = (cells: string[]) =>
      `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    const color = /^#[0-9a-f]{6}$/i.test(brand.primary ?? "")
      ? brand.primary!
      : "#111214";
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SDR onboarding kit</title><style>
@page{size:A4;margin:16mm}body{font:10.5pt/1.6 "Inter","IBM Plex Sans Arabic",Arial,sans-serif;color:#2a2b2e;margin:0}
h1{font-size:22pt;margin:0 0 4px;color:#0b0c0e}h2{font-size:13pt;margin:22px 0 8px;color:#0b0c0e;border-bottom:1px solid #e4e4e7;padding-bottom:4px}
.band{height:6px;background:${color};margin-bottom:18px}.meta{font:8pt "Geist Mono",monospace;color:#6b6c70;text-transform:uppercase;letter-spacing:.06em}
table{width:100%;border-collapse:collapse;font-size:9.5pt}td,th{border-bottom:1px solid #e4e4e7;padding:6px 4px;text-align:left;vertical-align:top}th{font:8pt "Geist Mono",monospace;color:#6b6c70;text-transform:uppercase}
li{margin:3px 0}section{break-inside:avoid}</style></head><body>
<div class="band"></div><p class="meta">${escapeHtml(brand.name ?? workspace.name)} · SDR onboarding kit · ${new Date().toISOString().slice(0, 10)}</p>
<h1>How we sell, on one page</h1><p>${escapeHtml(company.description ?? "")}</p>
<section><h2>Ideal customer</h2><p>${escapeHtml(company.icp ?? "Not written yet — ask the owner to complete Company context.")}</p></section>
<section><h2>Approved offers</h2><ul>${offers.map((o) => `<li>${escapeHtml(o.text)}</li>`).join("") || "<li>No approved offer yet.</li>"}</ul></section>
<section><h2>Segments</h2><table><tr><th>Code</th><th>Meaning</th></tr>${
      Object.entries(company.segments ?? {})
        .map(([k, v]) => row([escapeHtml(k), escapeHtml(v)]))
        .join("") || row(["—", "No segments defined"])
    }</table></section>
<section><h2>Angle by persona and maturity</h2><table><tr><th>Persona · maturity</th><th>Angle</th></tr>${
      Object.entries(company.angles ?? {})
        .map(([k, v]) => row([escapeHtml(k), escapeHtml(v)]))
        .join("") ||
      row(["all", escapeHtml(offers[0]?.text ?? "Use the approved offer")])
    }</table>
<p>Register: founder voice for founders and CEOs; leader voice for HR, finance and operations leaders.</p></section>
<section><h2>Who is in the list</h2><table><tr><th>Persona</th><th>Contacts</th></tr>${[...personas].map(([k, v]) => row([escapeHtml(k), String(v)])).join("")}</table></section>
<section><h2>Scoring rubric (out of 100)</h2><table><tr><th>Rule</th><th>Points</th></tr>${row(["Decision-making role", "30"])}${row(["Small or growing business (1–200 staff)", "25"])}${row(["Company website available", "20"])}${row(["Hiring or funding signal", "25"])}</table><p>Tier A ≥ 75, B ≥ 50, below 50 is disqualified and never enriched.</p></section>
<section><h2>Plays you will run</h2><ul>${PLAYS.map((p) => `<li><b>${p.id} ${escapeHtml(p.name)}</b> — ${escapeHtml(p.description)}</li>`).join("")}</ul></section>
<section><h2>References you may name</h2><ul>${(company.references ?? []).map((r) => `<li>${escapeHtml(r.name)} — ${r.consent ? "consent recorded" : "<b>do not name</b>"}</li>`).join("") || "<li>None recorded.</li>"}</ul></section>
<section><h2>Rules</h2><ul><li>Every email carries an opt-out line.</li><li>Event references stay at company level; never claim a personal meeting.</li><li>Cite only reviewed, dated facts. Generic messages get no replies.</li><li>Existing clients and dropped accounts never enter cold sequences.</li><li>Spending runs within reserved caps; sending waits for human approval.</li></ul></section>
</body></html>`;
    await audit(actor, "kit.generated", null, {});
    return renderPdf(injectFonts(html));
  }

  // GAP-12: discovery pilot capture (play P15).
  async discovery(actor: Actor, prospectId: string, value: unknown) {
    assertRole(actor, "write");
    const input = z
      .object({
        headcountBand: z.enum(["1-10", "11-25", "26-50", "51-200", "200+"]),
        hrSetup: z.enum(["none", "founder", "1-3", "team"]),
        pains: z.record(z.string().max(40), z.number().int().min(1).max(5)),
        maturity: z.number().int().min(0).max(4),
        notes: z.string().max(2000).default(""),
      })
      .parse(value);
    const prospect = await prospectOf(actor, prospectId);
    const snapshot = {
      ...(prospect.snapshot as ProspectSnapshot),
      discovery: { ...input, capturedAt: new Date().toISOString() },
    };
    await db.prospect.update({
      where: { id: prospectId },
      data: { snapshot: json(snapshot) },
    });
    await audit(actor, "discovery.captured", prospectId, {
      maturity: input.maturity,
    });
    return snapshot.discovery;
  }

  async discoverySummary(actor: Actor) {
    const rows = await db.prospect.findMany({
      where: { workspaceId: actor.workspaceId },
      select: { snapshot: true },
    });
    const bySegment = new Map<
      string,
      { n: number; maturity: number; pains: Record<string, number[]> }
    >();
    for (const r of rows) {
      const s = r.snapshot as ProspectSnapshot & {
        discovery?: { maturity: number; pains: Record<string, number> };
      };
      if (!s.discovery) continue;
      const key = s.segment ?? "—";
      const entry = bySegment.get(key) ?? { n: 0, maturity: 0, pains: {} };
      entry.n++;
      entry.maturity += s.discovery.maturity;
      for (const [pain, value] of Object.entries(s.discovery.pains))
        (entry.pains[pain] ??= []).push(value);
      bySegment.set(key, entry);
    }
    return [...bySegment].map(([segment, e]) => ({
      segment,
      interviews: e.n,
      averageMaturity: Number((e.maturity / e.n).toFixed(1)),
      pains: Object.fromEntries(
        Object.entries(e.pains).map(([k, v]) => [
          k,
          Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)),
        ]),
      ),
    }));
  }
}
