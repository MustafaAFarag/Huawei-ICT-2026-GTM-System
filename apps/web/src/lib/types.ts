import type {
  Evidence,
  ProspectSnapshot,
  ToolName,
  Touch,
} from "@revenue/contracts";

export type Prospect = {
  id: string;
  snapshot: ProspectSnapshot;
  score: number | null;
  breakdown: {
    tier?: string;
    breakdown?: { rule: string; points: number; state: string }[];
  };
  evidence: Evidence[];
  country: string;
  lawfulBasis: string | null;
  consentAt: string | null;
  excluded: boolean;
  crmPersonId: string | null;
  ownerId: string;
  language: string;
};
export type Draft = {
  id: string;
  prospectId: string;
  version: number;
  content: Touch[];
  approvedVersion: number | null;
  assetId: string | null;
};
export type Asset = {
  id: string;
  prospectId: string;
  title: string;
  language: string;
  template: string;
  approvedAt: string | null;
};
export type Run = {
  id: string;
  tool: string;
  state: string;
  error: string | null;
  nextAction: string | null;
  output: unknown;
  estimate: number;
  actualCost: number;
};
export type Dashboard = {
  role: string;
  fixture: boolean;
  modelFixture: boolean;
  quotas: { kind: string; used: number; reserved: number; cap: number }[];
  members: {
    userId: string;
    role: string;
    creditCap: number | null;
    user: { name: string; email: string };
  }[];
  workspace: {
    id: string;
    name: string;
    plan: string;
    planLimits: Record<string, number>;
    company: {
      description: string;
      icp: string;
      marketingLicence: boolean;
      roundRobin?: boolean;
      ownerCaps?: Record<string, number>;
      references?: { name: string; consent: boolean }[];
      angles?: Record<string, string>;
      segments?: Record<string, string>;
    };
    brand: { name: string; website: string; primary: string; accent: string };
    offers: { id: string; text: string; approved: boolean }[];
    preflight: Record<string, unknown>;
  };
  prospects: Prospect[];
  drafts: Draft[];
  assets: Asset[];
  runs: Run[];
  sequences: {
    id: string;
    prospectId: string;
    state: string;
    holdout: boolean;
    steps: { channel: string; body: string; state: string }[];
  }[];
  connectors: {
    provider: string;
    status: string;
    mode: string;
    lastError: string | null;
  }[];
  budgets: {
    id: string;
    userId: string | null;
    cap: number;
    used: number;
    reserved: number;
  }[];
  audit: { id: number; action: string; createdAt: string }[];
  plans: Record<
    string,
    {
      price: number;
      aiCredits: number;
      records: number;
      enrichmentCredits: number;
      sends: number;
      exports: number;
    }
  >;
};
export type Membership = {
  role: string;
  workspace: { id: string; name: string };
};
export type Chat = {
  id: string;
  role: string;
  content: string;
  context?: {
    tool?: ToolName;
    tools?: string[];
    quoteId?: string;
    model?: string;
  };
};
