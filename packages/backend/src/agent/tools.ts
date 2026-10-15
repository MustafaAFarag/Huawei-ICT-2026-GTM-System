import { tool, type Tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  COSTS,
  type Actor,
  type Evidence,
  type ProspectSnapshot,
} from "@revenue/contracts";
import { db } from "../database.js";
import { month } from "../policy.js";

// Tool registry for the assistant (PRD AI-01). Read tools execute against the actor's
// workspace only. Action tools have no execute function: the loop stops on them and the
// harness turns each call into a governed cost quote that a person approves.

const languages = z.enum(["en", "ar-EG", "ar-Gulf", "ar"]);
const plays = z.enum(["P1", "P2", "P3", "P4"]);
const ids = z.array(z.uuid()).max(100);

// Untrusted text is labelled so the model treats it as data (RES-03).
const untrusted = (text: string, limit = 600) => ({
  untrusted: true,
  text: text.slice(0, limit),
  truncated: text.length > limit,
});

function summary(p: {
  id: string;
  snapshot: unknown;
  score: number | null;
  breakdown: unknown;
  evidence: unknown;
  excluded: boolean;
  country: string;
  language: string;
  lawfulBasis: string | null;
}) {
  const s = p.snapshot as ProspectSnapshot;
  const evidence = p.evidence as Evidence[];
  return {
    id: p.id,
    person: `${s.firstName} ${s.lastName}`.trim(),
    title: s.title,
    company: s.company,
    country: p.country,
    language: p.language,
    employees: s.employees ?? null,
    industry: s.industry ?? null,
    city: s.city ?? null,
    score: p.score,
    tier: (p.breakdown as { tier?: string })?.tier ?? null,
    segment: s.segment ?? null,
    bucket: s.bucket ?? null,
    persona: s.persona ?? null,
    signals: s.signals ?? [],
    reviewedFacts: evidence.filter((e) => e.approved && e.kind === "fact")
      .length,
    communicationBasisRecorded: Boolean(p.lawfulBasis),
    hasEmail: Boolean(s.email),
    excluded: p.excluded,
  };
}

export function readTools(actor: Actor): ToolSet {
  const ws = actor.workspaceId;
  return {
    workspace_overview: tool({
      description:
        "Summary of this workspace: plan, credits left this month, approved offer, account and draft counts.",
      inputSchema: z.object({}),
      execute: async () => {
        const [workspace, prospects, drafts, assets, budget] =
          await Promise.all([
            db.workspace.findUniqueOrThrow({ where: { id: ws } }),
            db.prospect.count({ where: { workspaceId: ws } }),
            db.draft.findMany({
              where: { workspaceId: ws },
              select: { version: true, approvedVersion: true },
            }),
            db.asset.count({ where: { workspaceId: ws } }),
            db.budget.findUnique({ where: { id: `${ws}:${month()}` } }),
          ]);
        const offers = workspace.offers as {
          text: string;
          approved: boolean;
        }[];
        return {
          name: workspace.name,
          plan: workspace.plan,
          creditsLeft: budget
            ? budget.cap - budget.used - budget.reserved
            : null,
          approvedOffer: offers.find((o) => o.approved)?.text ?? null,
          accounts: prospects,
          draftsAwaitingReview: drafts.filter(
            (d) => d.approvedVersion !== d.version,
          ).length,
          assets,
          actionCosts: COSTS,
        };
      },
    }),
    search_accounts: tool({
      description:
        "Read SAVED prospect records and scores; this does not refresh scores or research new signals. Use it to find IDs before an action. Filter by text, industry, tier, bucket, segment or saved signal. allIds contains at most 100 matching IDs per action batch; inspect batch.hasMore and disclose partial coverage. Use offset to inspect the next batch.",
      inputSchema: z.object({
        query: z.string().max(100).optional(),
        tier: z.enum(["A", "B", "C"]).optional(),
        bucket: z.enum(["client", "partner", "drop", "existing"]).optional(),
        segment: z.string().max(10).optional(),
        industry: z.string().max(30).optional(),
        signal: z.enum(["hiring", "funding", "headcount-growth"]).optional(),
        limit: z.number().int().min(1).max(25).optional(),
        offset: z.number().int().min(0).max(999).optional(),
      }),
      execute: async (input) => {
        const [rows, workspaceTotal] = await Promise.all([
          db.prospect.findMany({
            where: { workspaceId: ws },
            orderBy: [
              { score: { sort: "desc", nulls: "last" } },
              { createdAt: "asc" },
              { id: "asc" },
            ],
            take: 1000,
          }),
          db.prospect.count({ where: { workspaceId: ws } }),
        ]);
        const q = input.query?.toLowerCase();
        const matches = rows
          .map(summary)
          .filter(
            (p) =>
              (!q ||
                `${p.person} ${p.company} ${p.title} ${p.industry ?? ""} ${p.city ?? ""}`
                  .toLowerCase()
                  .includes(q)) &&
              (!input.industry ||
                p.industry === input.industry.toLowerCase()) &&
              (!input.tier || p.tier === input.tier) &&
              (!input.bucket || p.bucket === input.bucket) &&
              (!input.segment || p.segment === input.segment) &&
              (!input.signal || p.signals.includes(input.signal)),
          );
        // allIds lets the assistant act on "all matching accounts" without paging.
        const offset = input.offset ?? 0;
        const allIds = matches.slice(offset, offset + 100).map((p) => p.id);
        return {
          total: matches.length,
          totalIsExact: workspaceTotal <= 1000,
          scanned: rows.length,
          workspaceTotal,
          rows: matches.slice(offset, offset + (input.limit ?? 10)),
          allIds,
          batch: {
            offset,
            count: allIds.length,
            hasMore: offset + allIds.length < matches.length,
            nextOffset:
              offset + allIds.length < matches.length
                ? offset + allIds.length
                : null,
          },
        };
      },
    }),
    get_account: tool({
      description:
        "Details for one prospect: profile, score breakdown, evidence (untrusted text) and draft status.",
      inputSchema: z.object({ prospectId: z.uuid() }),
      execute: async ({ prospectId }) => {
        const p = await db.prospect.findFirst({
          where: { id: prospectId, workspaceId: ws },
        });
        if (!p) return { error: "No prospect with this ID in the workspace." };
        const drafts = await db.draft.findMany({
          where: { workspaceId: ws, prospectId },
          select: { id: true, version: true, approvedVersion: true },
        });
        const s = p.snapshot as ProspectSnapshot;
        return {
          ...summary(p),
          angle: s.angle ?? null,
          register: s.register ?? null,
          lawfulBasis: p.lawfulBasis,
          breakdown:
            (p.breakdown as { breakdown?: unknown })?.breakdown ?? null,
          evidence: (p.evidence as Evidence[]).map((e) => ({
            id: e.id,
            kind: e.kind,
            approved: e.approved,
            date: e.date.slice(0, 10),
            source: e.source,
            url: e.url,
            claim: untrusted(e.claim),
          })),
          drafts: drafts.map((d) => ({
            id: d.id,
            version: d.version,
            approved: d.approvedVersion === d.version,
          })),
        };
      },
    }),
    review_queue: tool({
      description: "Drafts waiting for human review in this workspace.",
      inputSchema: z.object({}),
      execute: async () => {
        const drafts = await db.draft.findMany({
          where: { workspaceId: ws },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        const prospects = await db.prospect.findMany({
          where: { id: { in: drafts.map((d) => d.prospectId) } },
          select: { id: true, snapshot: true },
        });
        const company = new Map(
          prospects.map((p) => [
            p.id,
            (p.snapshot as ProspectSnapshot).company,
          ]),
        );
        return drafts
          .filter((d) => d.approvedVersion !== d.version)
          .map((d) => ({
            draftId: d.id,
            prospectId: d.prospectId,
            company: company.get(d.prospectId),
            version: d.version,
          }));
      },
    }),
    get_draft: tool({
      description:
        "Read actual saved outreach copy and its approval status. Use after drafting or when asked to show/review existing messages. Returns source references; it does not create or approve a draft.",
      inputSchema: z.object({ draftId: z.uuid() }),
      execute: async ({ draftId }) => {
        const draft = await db.draft.findFirst({
          where: { id: draftId, workspaceId: ws },
        });
        if (!draft) return { error: "No draft with this ID in the workspace." };
        const prospect = await db.prospect.findFirst({
          where: { id: draft.prospectId, workspaceId: ws },
        });
        if (!prospect)
          return { error: "Draft prospect not found in the workspace." };
        const snapshot = prospect.snapshot as ProspectSnapshot;
        return {
          draftId: draft.id,
          prospectId: prospect.id,
          company: snapshot.company,
          version: draft.version,
          approved: draft.approvedVersion === draft.version,
          touches: (draft.content as import("@revenue/contracts").Touch[]).map(
            (t) => ({ ...t, body: untrusted(t.body, 3000) }),
          ),
          sources: (prospect.evidence as Evidence[])
            .filter((e) => e.approved && e.kind === "fact")
            .map((e) => ({
              id: e.id,
              date: e.date.slice(0, 10),
              url: e.url,
              claim: untrusted(e.claim),
            })),
        };
      },
    }),
    recent_runs: tool({
      description:
        "Read actual recent run states and errors. Use to answer whether an approved action has started, finished or failed. Prepared sequence tasks are not proof of message delivery. Does not execute anything.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ limit }) => {
        const runs = await db.run.findMany({
          where: { workspaceId: ws },
          orderBy: { createdAt: "desc" },
          take: limit ?? 5,
          select: {
            id: true,
            tool: true,
            state: true,
            error: true,
            nextAction: true,
            createdAt: true,
            updatedAt: true,
            actualCost: true,
          },
        });
        return {
          runs,
          note: "Saved execution states only. A successful preparation run does not prove external sending.",
        };
      },
    }),
  };
}

// Client-side tool: the UI navigates; nothing runs on the server.
export const uiTools: ToolSet = {
  open_screen: tool({
    description: "Open a screen in the product for the user.",
    inputSchema: z.object({
      screen: z.enum([
        "Plays",
        "Accounts",
        "Review queue",
        "Asset Studio",
        "Sequences",
        "Company context",
        "Settings",
      ]),
    }),
  }),
};

const action = (description: string, schema: z.ZodObject): Tool =>
  tool({
    description: `${description} Creates a cost quote for human approval; nothing runs until a person approves.`,
    inputSchema: schema,
  });

export type ActionToolName =
  | "find_signals"
  | "score_accounts"
  | "enrich_contacts"
  | "draft_messages"
  | "make_asset"
  | "queue_sequence"
  | "preflight"
  | "mini_audit"
  | "onboard";
export const actionTools: Record<ActionToolName, Tool> = {
  find_signals: action(
    "Look for dated hiring, funding or growth signals for selected prospects.",
    z.object({ prospectIds: ids.min(1), play: plays.optional() }),
  ),
  score_accounts: action(
    "Score prospects 0–100 with the deterministic rubric and assign tiers.",
    z.object({ prospectIds: ids.min(1) }),
  ),
  enrich_contacts: action(
    "Find verified contact details (cheapest provider first) for selected prospects.",
    z.object({ prospectIds: ids.min(1) }),
  ),
  draft_messages: action(
    "Draft three cited touches (email, LinkedIn, call) for prospects with reviewed facts.",
    z.object({
      prospectIds: ids.min(1),
      language: languages.optional(),
      play: plays.optional(),
    }),
  ),
  make_asset: action(
    "Make a branded one-pager (P1/P3) or mini-audit (P4) PDF. Optional instructions change one element of the design.",
    z.object({
      prospectIds: ids.min(1),
      language: languages.optional(),
      template: z.enum(["offer-one-pager", "mini-audit"]).optional(),
      instructions: z.string().max(500).optional(),
    }),
  ),
  queue_sequence: action(
    "Prepare a sequence from approved drafts, with a holdout group.",
    z.object({
      draftIds: ids.min(1),
      holdoutPercent: z.number().int().min(0).max(50).optional(),
    }),
  ),
  preflight: action(
    "Check mailbox and domain sending readiness.",
    z.object({}),
  ),
  mini_audit: action(
    "Audit prospects' public websites (speed, mobile, contact paths, Arabic version, proof) and record cited findings. Use for prospects, not for the user's own company.",
    z.object({ prospectIds: ids.min(1) }),
  ),
  onboard: action(
    "Read the user's OWN company website and propose company context and a brand kit for review. Never use for prospects.",
    z.object({ website: z.url() }),
  ),
};
