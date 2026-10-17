// Workflow packs and qualification rubrics (PRD v3.2 A1, A2; PK-01).
// A pack is data: it supplies rubric defaults now, and discovery questions,
// maturity bands and angle keys once A2 lands. No plugin system.

export const COUNTRIES = ["EG", "SA", "AE", "KW", "QA", "BH", "OM"] as const;
export type Country = (typeof COUNTRIES)[number];

// Where a provider event came from. Simulated events are excluded from results by default.
export const PROVENANCES = ["live", "simulated", "imported"] as const;
export type Provenance = (typeof PROVENANCES)[number];

// Evidence behind a contact's lawful basis (CMP-01/02): who recorded what, from where, when.
export interface BasisEvidence {
  type: "consent" | "relationship";
  source: string;
  date: string;
  recordedBy: string;
  recordedAt: string;
}

export interface Rubric {
  role: { points: number; keywords: string[] };
  size: { points: number; min: number; max: number };
  website: { points: number };
  signal: { points: number };
  tiers: { a: number; b: number };
  // Prospects below this total are disqualified and never reach enrichment.
  minimum: number;
}

// Today's fixed weights expressed as a rubric. Keywords cover English and Arabic titles.
export const DEFAULT_RUBRIC: Rubric = {
  role: {
    points: 30,
    keywords: [
      "founder",
      "ceo",
      "chief executive",
      "managing director",
      "director",
      "head",
      "manager",
      "owner",
      "مؤسس",
      "الرئيس التنفيذي",
      "المدير التنفيذي",
      "مدير",
      "رئيس",
      "مالك",
    ],
  },
  size: { points: 25, min: 1, max: 200 },
  website: { points: 20 },
  signal: { points: 25 },
  tiers: { a: 75, b: 50 },
  minimum: 50,
};

export const PACK_IDS = ["hr-services", "generic"] as const;
export type PackId = (typeof PACK_IDS)[number];

export interface Pack {
  id: PackId;
  label: { en: string; ar: string };
  rubric: Rubric;
}

export const PACKS: Record<PackId, Pack> = {
  "hr-services": {
    id: "hr-services",
    label: { en: "HR services", ar: "خدمات الموارد البشرية" },
    rubric: DEFAULT_RUBRIC,
  },
  generic: {
    id: "generic",
    label: { en: "B2B services", ar: "خدمات الشركات" },
    rubric: DEFAULT_RUBRIC,
  },
};

export function packFor(id: string | null | undefined): Pack {
  return PACKS[id as PackId] ?? PACKS["hr-services"];
}
