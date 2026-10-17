import { z } from "zod";

export const roles = ["owner", "operator", "reviewer", "viewer"] as const;
export type Role = (typeof roles)[number];
export const tools = [
  "find_signals",
  "score_accounts",
  "enrich_contacts",
  "draft_messages",
  "make_asset",
  "queue_sequence",
  "preflight",
  "mini_audit",
  "onboard",
  "assistant",
] as const;
export type ToolName = (typeof tools)[number];
export type Actor = { userId: string; workspaceId: string; role: Role };
export type Evidence = {
  id: string;
  claim: string;
  url: string;
  date: string;
  kind: "fact" | "hypothesis" | "unknown";
  approved: boolean;
  source: string;
};
export type ProspectSnapshot = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  website: string;
  title: string;
  employees?: number;
  industry?: string;
  funding?: boolean;
  hiring?: boolean;
  existingClient?: boolean;
  // Optional GTM fields used by demo data, triage and the angle engine (PRD v3.1 §7.12).
  phone?: string;
  city?: string;
  segment?: string;
  bucket?: "client" | "partner" | "drop" | "existing";
  persona?: "founder" | "people-leader" | "finance" | "operations" | "sales";
  hrMaturity?: "P1a" | "P1b" | "P2";
  // "inferred" until a person confirms the band in discovery (PRD v3.2 A2); absent = inferred.
  maturitySource?: "inferred" | "confirmed";
  register?: "founder" | "leader";
  angle?: string;
  owner?: string;
  signals?: string[];
  triageNote?: string;
  discovery?: {
    headcountBand: string;
    // Only packs with a set-up field (HR) store it.
    hrSetup?: string;
    pains: Record<string, number>;
    maturity: number;
    notes: string;
    capturedAt: string;
  };
};
export type Touch = {
  channel: "email" | "linkedin" | "call";
  day: number;
  subject?: string;
  body: string;
  evidenceIds: string[];
};
export type Brand = {
  name: string;
  primary: string;
  accent: string;
  website: string;
  logo?: string;
};
export type Preflight = {
  mailbox: string;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  unsubscribe: boolean;
  warmupDays: number;
  bounceRate: number;
  complaintRate: number;
  dailyCap: number;
  checkedAt: string;
  simulated: boolean;
};

// Deliverable formats (one registry for API, worker and UI). `viewer` picks the canvas view;
// `exports` lists downloads; `size` is the CSS pixel canvas of one page or slide.
export const assetTemplates = [
  "offer-one-pager",
  "mini-audit",
  "email-gmail",
  "email-outlook",
  "instagram-carousel",
  "linkedin-carousel",
  "flipbook",
] as const;
export type AssetTemplate = (typeof assetTemplates)[number];
export type AssetExport = "pdf" | "png" | "zip" | "html";
export const ASSET_FORMATS: Record<
  AssetTemplate,
  {
    label: string;
    viewer: "document" | "email" | "slides" | "flipbook";
    size: { width: number; height: number };
    exports: AssetExport[];
    slides?: { min: number; max: number; default: number };
  }
> = {
  "offer-one-pager": {
    label: "Offer one-pager",
    viewer: "document",
    size: { width: 794, height: 1123 },
    exports: ["pdf", "png"],
  },
  "mini-audit": {
    label: "Mini-audit report",
    viewer: "document",
    size: { width: 794, height: 1123 },
    exports: ["pdf", "png"],
  },
  "email-gmail": {
    label: "HTML email · Gmail",
    viewer: "email",
    size: { width: 600, height: 1200 },
    exports: ["html"],
  },
  "email-outlook": {
    label: "HTML email · Outlook",
    viewer: "email",
    size: { width: 600, height: 1200 },
    exports: ["html"],
  },
  "instagram-carousel": {
    label: "Instagram carousel",
    viewer: "slides",
    size: { width: 1080, height: 1350 },
    exports: ["zip"],
    slides: { min: 5, max: 10, default: 7 },
  },
  "linkedin-carousel": {
    label: "LinkedIn carousel",
    viewer: "slides",
    size: { width: 1080, height: 1350 },
    exports: ["pdf", "zip"],
    slides: { min: 5, max: 12, default: 8 },
  },
  flipbook: {
    label: "Flipbook",
    viewer: "flipbook",
    size: { width: 794, height: 1123 },
    exports: ["html", "pdf"],
    slides: { min: 6, max: 12, default: 8 },
  },
};

export const toolRequest = z.object({
  tool: z.enum(tools),
  requestKey: z.string().min(8).max(150),
  prospectIds: z.array(z.uuid()).max(100).default([]),
  play: z.enum(["P1", "P2", "P3", "P4"]).default("P1"),
  language: z.enum(["en", "ar-EG", "ar-Gulf", "ar"]).default("en"),
  template: z.enum(assetTemplates).default("offer-one-pager"),
  // Per-format options: slide count for carousels, page count for flipbooks.
  slides: z.number().int().min(3).max(12).optional(),
  website: z.url().optional(),
  sourceAssetId: z.uuid().optional(),
  message: z.string().min(1).max(3000).optional(),
  draftIds: z.array(z.uuid()).max(100).default([]),
  approvedSpend: z.boolean().default(false),
  spendApprovalId: z.uuid().optional(),
  expectedEstimate: z.number().int().nonnegative().optional(),
  holdoutPercent: z.number().int().min(0).max(100).default(0),
  // The Nabil conversation that proposed this work; deliverables are filed back into it.
  threadId: z.uuid().optional(),
});
export type ToolRequest = z.infer<typeof toolRequest>;

export const COSTS: Record<ToolName, number> = {
  find_signals: 2,
  score_accounts: 0,
  enrich_contacts: 3,
  draft_messages: 4,
  make_asset: 6,
  queue_sequence: 1,
  preflight: 0,
  mini_audit: 2,
  onboard: 4,
  assistant: 2,
};
export const AI_COSTS = { chat_turn: 1, transcription: 1 } as const;
export const PLAYS = [
  {
    id: "P1",
    name: "First campaign in one chat",
    description:
      "Turn company context and a lead list into an offer and a reviewed three-step sequence.",
    steps: [
      "score_accounts",
      "enrich_contacts",
      "draft_messages",
      "make_asset",
      "queue_sequence",
    ],
  },
  {
    id: "P2",
    name: "Inbox and domain pre-flight",
    description:
      "Check domain records and sender readiness before preparing an outreach sequence.",
    steps: ["preflight"],
  },
  {
    id: "P3",
    name: "Funding or hiring outreach",
    description:
      "Find a dated company signal and prepare an evidence-backed introduction.",
    steps: [
      "find_signals",
      "score_accounts",
      "draft_messages",
      "make_asset",
      "queue_sequence",
    ],
  },
  {
    id: "P4",
    name: "Mini-audit outreach",
    description:
      "Review a public website and make an English or Arabic audit with cited findings.",
    steps: ["mini_audit", "draft_messages", "make_asset", "queue_sequence"],
  },
] as const;
export const PLANS = {
  Free: {
    price: 0,
    seats: 1,
    records: 1000,
    aiCredits: 100,
    enrichmentCredits: 25,
    sends: 100,
    exports: 5,
    sequences: 1,
  },
  Solo: {
    price: 24,
    seats: 1,
    records: 10000,
    aiCredits: 400,
    enrichmentCredits: 100,
    sends: 2000,
    exports: 50,
    sequences: 5,
  },
  Team: {
    price: 39,
    seats: 3,
    records: 50000,
    aiCredits: 1800,
    enrichmentCredits: 450,
    sends: 15000,
    exports: 600,
    sequences: 60,
  },
  Agency: {
    price: 199,
    seats: 5,
    records: 25000,
    aiCredits: 5000,
    enrichmentCredits: 1500,
    sends: 10000,
    exports: 200,
    sequences: 100,
  },
  Enterprise: {
    price: 1000,
    seats: 10,
    records: 100000,
    aiCredits: 20000,
    enrichmentCredits: 5000,
    sends: 50000,
    exports: 1000,
    sequences: 500,
  },
} as const;

export class RevenueClient {
  constructor(private base = "/api") {}
  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    const value = await response.json();
    if (!response.ok)
      throw new Error(value.message ?? "The request failed. Try again.");
    return value as T;
  }
  workspace<T>(id: string, path = "", options?: RequestInit) {
    return this.request<T>(`/workspaces/${id}${path}`, options);
  }
}
export * from "./gtm.ts";
export * from "./import-history.ts";
export * from "./schedules.ts";
export * from "./packs.ts";

export * from "./assistant.ts";
