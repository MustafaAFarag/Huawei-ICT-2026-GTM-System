import type { BasisEvidence, Evidence, ProspectSnapshot } from "@revenue/contracts";

// Deterministic synthetic demo data (research 11 §5). Every name, company, domain and number
// is invented: domains end in .example and phones use the 55 5xx reserved-looking pattern.
// The structure mirrors a real outbound engagement; no value is copied from it.

export const DEMO_SEED = 20261015;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rand = ReturnType<typeof rng>;
const pick = <T>(r: Rand, list: readonly T[]) => list[Math.floor(r() * list.length)]!;
const chance = (r: Rand, p: number) => r() < p;
// Deterministic UUID v4-shaped identifier so evidence IDs are stable across runs.
function uuid(r: Rand) {
  const hex = Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16));
  hex[12] = "4";
  hex[16] = "89ab"[Math.floor(r() * 4)]!;
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const FIRST = {
  m: ["Omar", "Youssef", "Khaled", "Tarek", "Hazem", "Fahad", "Saud", "Majed", "Rami", "Ziad", "Nader", "Hisham", "Adel", "Karim", "Sami", "Waleed", "Bader", "Hamza", "Talal", "Anas"],
  f: ["Huda", "Reem", "Lina", "Dana", "Noura", "Salma", "Maha", "Rana", "Hala", "Farah", "Yara", "Nada", "Dalia", "Mona", "Lama", "Haya", "Rawan", "Jana", "Malak", "Sara"],
};
const LAST = ["Al-Fahim", "Saeedi", "Mansouri", "Haddad", "Nassar", "Qasim", "Al-Rasheed", "Barakat", "Khoury", "Zahran", "Sherif", "Al-Omari", "Hamdan", "Farouk", "Al-Harbi", "Mahmoud", "Suleiman", "Al-Ameen", "Darwish", "Kamel", "Raouf", "Al-Najjar", "Saber", "Fathy"];
// Two invented syllables plus a sector word keep names readable and unlikely to match real firms.
const ROOT_A = ["Zar", "Mur", "Taw", "Sil", "Nah", "Bar", "Qam", "Rif", "Wad", "Lum", "Saf", "Dir", "Has", "Kib", "Jud", "Fal", "Tir", "Mav"];
const ROOT_B = ["dan", "oora", "eel", "ix", "aro", "ena", "ari", "un", "ova", "aq", "ima", "esh"];
const SECTORS = {
  fintech: ["Pay", "Lend", "Wallet", "Capital", "Pay Tech", "Finance"],
  banking: ["Bank", "Banking Group", "Investment Bank"],
  logistics: ["Logistics", "Freight", "Cargo", "Fleet"],
  retail: ["Retail", "Stores", "Commerce", "Market"],
  health: ["Health", "Clinics", "Care", "Diagnostics"],
  edtech: ["Learning", "Academy", "Edu", "Classroom"],
  saas: ["Cloud", "Labs", "Systems", "Software"],
  proptech: ["Homes", "Spaces", "Property Tech"],
  fnb: ["Kitchens", "Foods", "F&B Tech"],
  manufacturing: ["Industries", "Manufacturing", "Factories"],
} as const;
type Sector = keyof typeof SECTORS;
const COUNTRY = {
  SA: { cities: ["Riyadh", "Jeddah", "Dammam", "Khobar"], phone: "+966 55 5" },
  AE: { cities: ["Dubai", "Abu Dhabi", "Sharjah"], phone: "+971 55 5" },
  EG: { cities: ["Cairo", "Alexandria", "Giza"], phone: "+20 10 555" },
} as const;
type Country = keyof typeof COUNTRY;
const TITLES: Record<NonNullable<ProspectSnapshot["persona"]>, string[]> = {
  founder: ["Co-founder & CEO", "Founder", "CEO", "Managing Director"],
  "people-leader": ["Head of People", "HR Manager", "Chief People Officer", "HR Business Partner", "Talent Acquisition Lead"],
  finance: ["CFO", "Finance Manager", "Head of Finance"],
  operations: ["COO", "Operations Director", "Head of Operations"],
  sales: ["Head of Sales", "Commercial Director", "VP Growth"],
};

export type DemoPlan = "Free" | "Solo" | "Team" | "Agency" | "Enterprise";
export type DemoMember = {
  key: string;
  name: string;
  email: string;
  role: "owner" | "operator" | "reviewer" | "viewer";
  creditCap?: number;
};
export type DemoWorkspace = {
  key: string;
  name: string;
  plan: DemoPlan;
  crmBinding: "A" | "B";
  parentKey?: string;
  timezone: string;
  // Workflow pack; defaults to hr-services. Non-HR clients use the generic B2B pack.
  pack?: "hr-services" | "generic";
  company: Record<string, unknown>;
  brand: { name: string; primary: string; accent: string; website: string };
  offers: { id: string; text: string; approved: boolean }[];
  members: DemoMember[];
  budget: { cap: number; used: number; reserved: number };
  quotas: { kind: string; cap: number; used: number }[];
  planLimits?: Record<string, number>;
  prospects: DemoProspect[];
  suppressions: { identity: string; reason: string }[];
  // Number of prospects that get a seeded draft awaiting review (and how many are approved).
  drafts: { pending: number; approved: number };
};
export type DemoProspect = {
  sourceKey: string;
  snapshot: ProspectSnapshot;
  evidence: Evidence[];
  country: Country;
  language: string;
  lawfulBasis: string | null;
  consentAt: string | null;
  // Evidence behind lawfulBasis (PRD v3.2 A3). recordedBy "seed" is replaced by the seeding user.
  basisEvidence: BasisEvidence[];
  excluded: boolean;
  scored: boolean;
};

type Profile = {
  accounts: number;
  contactsPerAccount: [number, number];
  countries: [Country, number][];
  sectors: Sector[];
  sizes: [number, number];
  personas: [NonNullable<ProspectSnapshot["persona"]>, number][];
  language: (country: Country, r: Rand) => string;
  duplicates?: number;
  suppressed?: number;
  existing?: number;
  partners?: number;
  missingContactRate?: number;
  segments?: string[];
  owners?: string[];
};

const weighted = <T>(r: Rand, items: [T, number][]) => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items.at(-1)![0];
};

const ANGLES: Record<string, string> = {
  "founder:P1a": "Outsource the HR hassle so founders stop doing payroll at night",
  "founder:P1b": "Give your small HR team an operations desk behind them",
  "founder:P2": "Offshore repeatable HR work to cut cost per hire",
  "people-leader:P1a": "Set up HR operations properly before the next hiring wave",
  "people-leader:P1b": "Take admin off your team's targets so they can hire",
  "people-leader:P2": "Training and OD programmes for an established HR function",
  "finance:P1a": "Predictable HR cost per employee instead of new headcount",
  "finance:P1b": "Payroll accuracy and Nitaqat-ready records",
  "finance:P2": "Lower cost base through a Cairo offshoring desk",
  "operations:P1a": "Onboarding that keeps up with growth",
  "operations:P1b": "Onboarding and HR admin as a managed service",
  "operations:P2": "Shared-service model for HR operations",
  "sales:P1a": "Hire your first sales team faster",
  "sales:P1b": "Recruitment support for a growing sales team",
  "sales:P2": "Sales enablement training programme",
};

function makeProspects(r: Rand, wsKey: string, p: Profile, used: Set<string>) {
  const out: DemoProspect[] = [];
  for (let a = 0; a < p.accounts; a++) {
    const sector = pick(r, p.sectors);
    const country = weighted(r, p.countries);
    let company = "";
    do {
      company = `${pick(r, ROOT_A)}${pick(r, ROOT_B)} ${pick(r, SECTORS[sector])}`;
    } while (used.has(company));
    used.add(company);
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const domain = `${slug}.example`;
    const employees = Math.round(p.sizes[0] + r() * (p.sizes[1] - p.sizes[0]));
    const hrMaturity: ProspectSnapshot["hrMaturity"] =
      employees < 25 ? "P1a" : employees < 120 ? pick(r, ["P1a", "P1b", "P1b"] as const) : "P2";
    const hiring = chance(r, 0.45);
    const funding = chance(r, sector === "fintech" || sector === "saas" ? 0.35 : 0.12);
    const growth = chance(r, 0.25);
    const segment =
      p.segments?.length
        ? funding && employees < 120
          ? p.segments[0]!
          : hiring
            ? p.segments[1] ?? p.segments[0]!
            : employees > 300
              ? p.segments[3] ?? p.segments.at(-1)!
              : hrMaturity === "P2"
                ? p.segments[2] ?? p.segments.at(-1)!
                : p.segments.at(-1)!
        : undefined;
    const contacts =
      p.contactsPerAccount[0] +
      Math.floor(r() * (p.contactsPerAccount[1] - p.contactsPerAccount[0] + 1));
    const city = pick(r, COUNTRY[country].cities);
    const signals = [
      ...(hiring ? ["hiring"] : []),
      ...(funding ? ["funding"] : []),
      ...(growth ? ["headcount-growth"] : []),
    ];
    for (let c = 0; c < contacts; c++) {
      const persona = weighted(r, p.personas);
      const female = chance(r, 0.45);
      const firstName = pick(r, female ? FIRST.f : FIRST.m);
      const lastName = pick(r, LAST);
      const missing = (country !== "EG" && chance(r, p.missingContactRate ?? 0)) || false;
      const email = missing
        ? ""
        : `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@${domain}`;
      const phone =
        missing && chance(r, 0.5)
          ? undefined
          : `${COUNTRY[country].phone}${String(Math.floor(r() * 100000)).padStart(5, "0")}`;
      const register = persona === "founder" ? "founder" : "leader";
      const snapshot: ProspectSnapshot = {
        firstName,
        lastName,
        email,
        company,
        website: `https://${domain}`,
        title: pick(r, TITLES[persona]),
        employees,
        industry: sector,
        hiring,
        funding,
        phone,
        city,
        segment,
        bucket: "client",
        persona,
        hrMaturity,
        maturitySource: "inferred",
        register,
        angle: ANGLES[`${persona}:${hrMaturity}`],
        owner: p.owners ? pick(r, p.owners) : undefined,
        signals,
      };
      const evidence: Evidence[] = [];
      const date = (daysAgo: number) =>
        new Date(Date.UTC(2026, 9, 14) - daysAgo * 86400000).toISOString();
      if (hiring)
        evidence.push({
          id: uuid(r),
          claim: `${company} lists ${2 + Math.floor(r() * 5)} open roles on its careers page, including ${pick(r, ["an HR generalist", "a talent acquisition specialist", "two sales development representatives", "an operations manager", "a payroll officer"])}.`,
          url: `https://${domain}/careers`,
          date: date(3 + Math.floor(r() * 25)),
          kind: "fact",
          approved: chance(r, 0.6),
          source: "Synthetic careers page",
        });
      if (funding)
        evidence.push({
          id: uuid(r),
          claim: `${company} announced a ${pick(r, ["seed", "Series A", "Series B", "pre-Series A"])} round in ${pick(r, ["July", "August", "September"])} 2026 to expand in ${pick(r, ["Riyadh", "the UAE", "Egypt", "the GCC"])}.`,
          url: `https://news.example/${slug}-funding`,
          date: date(20 + Math.floor(r() * 70)),
          kind: "fact",
          approved: chance(r, 0.6),
          source: "Synthetic news article",
        });
      if (growth)
        evidence.push({
          id: uuid(r),
          claim: `Team size grew by about ${10 + Math.floor(r() * 15)}% over the last six months according to the company's about page.`,
          url: `https://${domain}/about`,
          date: date(10 + Math.floor(r() * 40)),
          kind: "fact",
          approved: false,
          source: "Synthetic about page",
        });
      const consent = chance(r, 0.35);
      const lawfulBasis = consent ? pick(r, ["consent", "relationship"] as const) : null;
      const consentAt = consent ? new Date(Date.UTC(2026, 8, 1 + Math.floor(r() * 40))).toISOString() : null;
      out.push({
        sourceKey: (email || `${company}:${firstName}:${lastName}`).toLowerCase(),
        snapshot,
        evidence,
        country,
        language: p.language(country, r),
        lawfulBasis,
        consentAt,
        basisEvidence:
          lawfulBasis && consentAt
            ? [
                {
                  type: lawfulBasis,
                  source:
                    lawfulBasis === "consent"
                      ? "Demo: opt-in form submission"
                      : "Demo: existing business relationship on file",
                  date: consentAt.slice(0, 10),
                  recordedBy: "seed",
                  recordedAt: consentAt,
                },
              ]
            : [],
        excluded: false,
        scored: chance(r, 0.75),
      });
    }
  }
  // Triage buckets beyond the score: existing clients, partners and drops (research 11 §2.2).
  const byCompany = [...new Set(out.map((o) => o.snapshot.company))];
  const mark = (count: number, bucket: NonNullable<ProspectSnapshot["bucket"]>) => {
    for (let i = 0; i < count && byCompany.length; i++) {
      const name = byCompany.splice(Math.floor(r() * byCompany.length), 1)[0]!;
      for (const o of out.filter((x) => x.snapshot.company === name)) {
        o.snapshot.bucket = bucket;
        if (bucket === "existing") o.snapshot.existingClient = true;
        if (bucket === "partner") o.snapshot.segment = "E";
      }
    }
  };
  mark(p.existing ?? 0, "existing");
  mark(p.partners ?? 0, "partner");
  for (const o of out)
    if (o.snapshot.bucket === "client" && (o.snapshot.employees ?? 0) > 900 && !o.snapshot.hiring)
      o.snapshot.bucket = "drop";
  // Near-duplicates for de-duplication tests: same person, different email alias or no email.
  for (let i = 0; i < (p.duplicates ?? 0); i++) {
    const base = out[Math.floor(r() * out.length)]!;
    if (!base.snapshot.email) continue;
    const [local, domain] = base.snapshot.email.split("@");
    const variant = chance(r, 0.5)
      ? `${local!.split(".")[0]}@${domain}`
      : "";
    const snapshot = { ...base.snapshot, email: variant };
    out.push({
      ...base,
      snapshot,
      evidence: [],
      sourceKey: (variant || `${snapshot.company}:${snapshot.firstName}:${snapshot.lastName}`).toLowerCase(),
      scored: false,
    });
  }
  for (let i = 0; i < (p.suppressed ?? 0); i++) out[Math.floor(r() * out.length)]!.excluded = true;
  return out.map((o) => ({ ...o, sourceKey: `${wsKey}:${o.sourceKey}` }));
}

function member(key: string, name: string, role: DemoMember["role"], creditCap?: number): DemoMember {
  return {
    key,
    name,
    email: `${key}@demo.revenue.example`,
    role,
    creditCap,
  };
}

export function generateDemo(seed = DEMO_SEED): DemoWorkspace[] {
  const r = rng(seed);
  const used = new Set<string>();
  const gulf = (c: Country, x: Rand) => (c === "EG" ? "ar-EG" : chance(x, 0.5) ? "ar-Gulf" : "en");
  const spec: [Omit<DemoWorkspace, "prospects" | "suppressions">, Profile][] = [
    [
      {
        key: "nour",
        name: "Nour Studio",
        plan: "Free",
        crmBinding: "A",
        timezone: "Africa/Cairo",
        company: {
          description: "A one-person brand and web design studio in Cairo.",
          icp: "Egyptian clinics, cafes and boutique retailers with 5–50 staff and an outdated website",
          marketingLicence: false,
          demo: { tier: "Free", story: "Hard quota stop, Made-with mark on exports, one sequence" },
        },
        brand: { name: "Nour Studio", primary: "#1f2937", accent: "#f59e0b", website: "https://nour-studio.example" },
        offers: [{ id: "growth", text: "A free one-page website review with three fixes you can make this week.", approved: true }],
        members: [],
        budget: { cap: 100, used: 92, reserved: 0 },
        quotas: [
          { kind: "aiCredits", cap: 100, used: 92 },
          { kind: "exports", cap: 5, used: 5 },
          { kind: "sends", cap: 100, used: 64 },
        ],
        drafts: { pending: 1, approved: 0 },
      },
      {
        accounts: 10,
        contactsPerAccount: [1, 2],
        countries: [["EG", 1]],
        sectors: ["health", "retail", "fnb"],
        sizes: [5, 50],
        personas: [["founder", 4], ["operations", 1]],
        language: () => "ar-EG",
        suppressed: 1,
      },
    ],
    [
      {
        key: "basma",
        name: "Basma Advisory",
        plan: "Solo",
        crmBinding: "B",
        timezone: "Asia/Riyadh",
        company: {
          description: "Independent HR and Saudization compliance advisor in Riyadh.",
          icp: "Saudi SMEs with 20–150 staff facing 2026 Nitaqat changes",
          marketingLicence: false,
          prepaidPacks: [{ credits: 200, purchasedAt: "2026-10-02", expires: null }],
          demo: { tier: "Solo", story: "Spend cap on by default, prepaid pack, Gulf Arabic content" },
        },
        brand: { name: "Basma Advisory", primary: "#0f3d3e", accent: "#c8a24a", website: "https://basma-advisory.example" },
        offers: [{ id: "growth", text: "A 30-minute Nitaqat records check that lists the gaps before your next review.", approved: true }],
        members: [],
        budget: { cap: 300, used: 182, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 400, used: 182 }],
        drafts: { pending: 2, approved: 1 },
      },
      {
        accounts: 15,
        contactsPerAccount: [1, 2],
        countries: [["SA", 1]],
        sectors: ["retail", "logistics", "health", "manufacturing"],
        sizes: [20, 150],
        personas: [["founder", 2], ["people-leader", 2], ["finance", 1]],
        language: (_c, x) => (chance(x, 0.7) ? "ar-Gulf" : "en"),
        missingContactRate: 0.15,
        suppressed: 1,
      },
    ],
    [
      {
        key: "qimam",
        name: "Qimam People",
        plan: "Team",
        crmBinding: "A",
        timezone: "Asia/Riyadh",
        company: {
          description: "Outsourced HR operations, Cairo offshoring, recruitment and OD/training for Saudi fintechs, banks and SMEs.",
          icp: "Saudi fintechs and banks; founder-led scale-ups with 11–200 staff hiring HR; established HR teams needing OD and offshoring",
          marketingLicence: true,
          segments: {
            A: "Hot scale-ups, founder voice",
            B: "Warm scale-ups, founder voice",
            C: "Has HR team, OD/training upsell, leader voice",
            D: "Large enterprise offshoring, leader voice",
            E: "Partners (channel, accelerators)",
            HOLD: "Needs contact research",
          },
          angles: ANGLES,
          references: [
            { name: "Synthetic reference client 1", consent: true },
            { name: "Synthetic reference client 2", consent: true },
            { name: "Synthetic reference client 3", consent: false },
          ],
          demo: { tier: "Team", story: "Hero demo: ABM tiers, segments A–F, partner track, approvals, per-member caps" },
        },
        brand: { name: "Qimam People", primary: "#14283f", accent: "#e5484d", website: "https://qimam-people.example" },
        offers: [
          { id: "growth", text: "An outsourced HR operations desk in Cairo that runs payroll, onboarding and HR admin, so your people team can focus on hiring.", approved: true },
        ],
        members: [
          member("qimam-sdr-1", "Hazem (SDR, synthetic)", "operator", 400),
          member("qimam-sdr-2", "Lina (SDR, synthetic)", "operator", 400),
          member("qimam-sdr-3", "Ziad (SDR, synthetic)", "operator", 300),
          member("qimam-lead", "Reem (Sales lead, synthetic)", "reviewer"),
          member("qimam-ceo", "Tarek (CEO, synthetic)", "viewer"),
        ],
        budget: { cap: 1800, used: 640, reserved: 0 },
        quotas: [
          { kind: "aiCredits", cap: 1800, used: 640 },
          { kind: "enrichmentCredits", cap: 450, used: 210 },
          { kind: "sends", cap: 15000, used: 2300 },
          { kind: "exports", cap: 600, used: 44 },
        ],
        drafts: { pending: 4, approved: 2 },
      },
      {
        accounts: 80,
        contactsPerAccount: [1, 3],
        countries: [["SA", 7], ["AE", 2], ["EG", 1]],
        sectors: ["fintech", "fintech", "banking", "saas", "retail", "logistics"],
        sizes: [11, 2000],
        personas: [["founder", 3], ["people-leader", 4], ["finance", 1], ["operations", 1]],
        language: (_c, x) => (chance(x, 0.4) ? "ar-Gulf" : "en"),
        duplicates: 6,
        suppressed: 3,
        existing: 2,
        partners: 4,
        missingContactRate: 0.18,
        segments: ["A", "B", "C", "D", "HOLD"],
        owners: ["qimam-sdr-1", "qimam-sdr-2", "qimam-sdr-3"],
      },
    ],
    [
      {
        key: "mirqab",
        name: "Mirqab Growth",
        plan: "Agency",
        crmBinding: "B",
        timezone: "Asia/Dubai",
        company: {
          description: "Dubai lead-generation agency running outbound for B2B clients across the GCC and Egypt.",
          icp: "B2B founders in the GCC who need outbound without hiring an SDR team",
          marketingLicence: false,
          agency: { clients: ["mirqab-fintech", "mirqab-logistics", "mirqab-edtech"], whiteLabelReports: true },
          demo: { tier: "Agency", story: "Parent workspace with three client workspaces, per-client caps and brand kits" },
        },
        brand: { name: "Mirqab Growth", primary: "#111214", accent: "#ff6363", website: "https://mirqab-growth.example" },
        offers: [{ id: "growth", text: "A 30-day outbound pilot with weekly reporting and no long contract.", approved: true }],
        members: [
          member("mirqab-am", "Dana (Account manager, synthetic)", "operator", 1500),
          member("mirqab-analyst", "Anas (Analyst, synthetic)", "operator", 1000),
        ],
        budget: { cap: 5000, used: 2150, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 5000, used: 2150 }],
        drafts: { pending: 0, approved: 0 },
      },
      {
        accounts: 4,
        contactsPerAccount: [1, 2],
        countries: [["AE", 2], ["SA", 1]],
        sectors: ["saas"],
        sizes: [10, 80],
        personas: [["founder", 1]],
        language: () => "en",
      },
    ],
    [
      {
        key: "mirqab-fintech",
        name: "Mirqab · Fintech client (KSA)",
        plan: "Agency",
        crmBinding: "B",
        parentKey: "mirqab",
        timezone: "Asia/Riyadh",
        pack: "generic",
        company: {
          description: "Agency client: a Saudi B2B payments API for marketplaces.",
          icp: "Saudi marketplaces and e-commerce platforms with 20–300 staff",
          marketingLicence: false,
          agencyClientOf: "mirqab",
          clientCaps: { aiCredits: 1500, sends: 4000 },
        },
        brand: { name: "Sarafa Pay (client)", primary: "#123c69", accent: "#2bb3a3", website: "https://sarafa-pay.example" },
        offers: [{ id: "growth", text: "Accept split payments for every seller with one API and same-day settlement.", approved: true }],
        members: [],
        budget: { cap: 1500, used: 610, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 1500, used: 610 }],
        drafts: { pending: 2, approved: 1 },
      },
      {
        accounts: 20,
        contactsPerAccount: [1, 3],
        countries: [["SA", 1]],
        sectors: ["retail", "saas", "fnb"],
        sizes: [20, 300],
        personas: [["founder", 2], ["finance", 2], ["operations", 1]],
        language: gulf,
        missingContactRate: 0.2,
      },
    ],
    [
      {
        key: "mirqab-logistics",
        name: "Mirqab · Logistics client (Egypt)",
        plan: "Agency",
        crmBinding: "B",
        parentKey: "mirqab",
        timezone: "Africa/Cairo",
        pack: "generic",
        company: {
          description: "Agency client: an Egyptian last-mile delivery company for SMEs.",
          icp: "Egyptian online shops and pharmacies with their own delivery problems",
          marketingLicence: true,
          agencyClientOf: "mirqab",
          clientCaps: { aiCredits: 1000, sends: 3000 },
        },
        brand: { name: "Wasla Express (client)", primary: "#f2c94c", accent: "#1d1d1f", website: "https://wasla-express.example" },
        offers: [{ id: "growth", text: "A free delivery-page audit and one week of next-day delivery at cost.", approved: true }],
        members: [],
        budget: { cap: 1000, used: 270, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 1000, used: 270 }],
        drafts: { pending: 1, approved: 0 },
      },
      {
        accounts: 15,
        contactsPerAccount: [1, 2],
        countries: [["EG", 1]],
        sectors: ["retail", "health", "fnb"],
        sizes: [5, 120],
        personas: [["founder", 3], ["operations", 2]],
        language: () => "ar-EG",
        suppressed: 1,
      },
    ],
    [
      {
        key: "mirqab-edtech",
        name: "Mirqab · EdTech client (UAE)",
        plan: "Agency",
        crmBinding: "B",
        parentKey: "mirqab",
        timezone: "Asia/Dubai",
        pack: "generic",
        company: {
          description: "Agency client: a UAE corporate-learning platform.",
          icp: "UAE companies with 50–500 staff and an L&D budget",
          marketingLicence: false,
          agencyClientOf: "mirqab",
          weeklyReport: { day: "Sunday", recipients: 2 },
          clientCaps: { aiCredits: 800, sends: 2000 },
        },
        brand: { name: "Ruwad Learning (client)", primary: "#3b1f5c", accent: "#f2994a", website: "https://ruwad-learning.example" },
        offers: [{ id: "growth", text: "A two-week pilot of role-based training paths for one team.", approved: true }],
        members: [],
        budget: { cap: 800, used: 190, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 800, used: 190 }],
        drafts: { pending: 1, approved: 1 },
      },
      {
        accounts: 10,
        contactsPerAccount: [1, 3],
        countries: [["AE", 1]],
        sectors: ["saas", "health", "retail", "banking"],
        sizes: [50, 500],
        personas: [["people-leader", 3], ["founder", 1]],
        language: () => "en",
        missingContactRate: 0.1,
      },
    ],
    [
      {
        key: "sahel",
        name: "Sahel Group",
        plan: "Enterprise",
        crmBinding: "A",
        timezone: "Asia/Riyadh",
        company: {
          description: "A 40-person Saudi industrial-services group selling maintenance contracts to factories and logistics parks.",
          icp: "Saudi factories and logistics parks with 200+ staff in the Eastern Province and Riyadh",
          marketingLicence: false,
          sso: { provider: "Microsoft Entra ID", status: "stub (not connected)" },
          residency: { region: "KSA", note: "Customer requires in-Kingdom processing before a live pilot" },
          customPlays: ["Tender follow-up"],
          demo: { tier: "Enterprise", story: "SSO stub, KSA residency flag, custom play" },
        },
        brand: { name: "Sahel Group", primary: "#0b3b2e", accent: "#d4a017", website: "https://sahel-group.example" },
        offers: [{ id: "growth", text: "A site visit and a 12-month preventive maintenance plan with a fixed monthly fee.", approved: false }],
        members: [
          member("sahel-bd", "Fahad (BD manager, synthetic)", "operator", 4000),
          member("sahel-compliance", "Maha (Compliance, synthetic)", "reviewer"),
        ],
        budget: { cap: 20000, used: 1200, reserved: 0 },
        quotas: [{ kind: "aiCredits", cap: 20000, used: 1200 }],
        drafts: { pending: 0, approved: 0 },
      },
      {
        accounts: 15,
        contactsPerAccount: [1, 3],
        countries: [["SA", 1]],
        sectors: ["manufacturing", "logistics"],
        sizes: [200, 3000],
        personas: [["operations", 3], ["finance", 1], ["founder", 1]],
        language: (_c, x) => (chance(x, 0.5) ? "ar" : "en"),
        missingContactRate: 0.25,
      },
    ],
  ];
  return spec.map(([ws, profile]) => {
    const prospects = makeProspects(r, ws.key, profile, used);
    const suppressions = prospects
      .filter((p) => p.excluded && p.snapshot.email)
      .map((p) => ({ identity: p.snapshot.email, reason: "Synthetic opt-out (demo)" }));
    return { ...ws, prospects, suppressions };
  });
}

export function demoSummary(data = generateDemo()) {
  const prospects = data.flatMap((w) => w.prospects);
  return {
    workspaces: data.length,
    accounts: new Set(prospects.map((p) => `${p.sourceKey.split(":")[0]}:${p.snapshot.company}`)).size,
    contacts: prospects.length,
    byPlan: Object.fromEntries(data.map((w) => [w.name, w.plan])),
  };
}
