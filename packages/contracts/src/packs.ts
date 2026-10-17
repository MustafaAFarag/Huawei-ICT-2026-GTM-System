// Workflow packs and qualification rubrics (PRD v3.2 A1, A2; PK-01).
// A pack is data: rubric defaults, discovery questions, pain topics, maturity bands and
// angle keys. No plugin system.

import type { ProspectSnapshot } from "./index.js";

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

export type Bilingual = { en: string; ar: string };

// One interview question. `variants` swaps the wording by inferred persona; `question` is the default.
export interface PackQuestion {
  id: string;
  topic: Bilingual;
  question: Bilingual;
  variants?: Partial<Record<string, Bilingual>>;
  answer: Bilingual;
  // The answer hint is the maturity scale built from `Pack.maturity.scale` (answer is ignored).
  scale?: boolean;
}

// An optional discovery field that only some packs ask about (HR set-up for the HR pack).
export interface PackSetupField {
  label: Bilingual;
  options: { value: string; label: Bilingual }[];
}

export interface MaturityBand {
  id: NonNullable<ProspectSnapshot["hrMaturity"]>;
  label: Bilingual;
  // Exclusive upper bound on employees; null = open-ended top band.
  maxEmployees: number | null;
}

export interface Pack {
  id: PackId;
  label: Bilingual;
  rubric: Rubric;
  discovery: PackQuestion[];
  // null = the pack asks no set-up question and discovery capture needs no hrSetup.
  setupField: PackSetupField | null;
  pains: { key: string; label: Bilingual }[];
  maturity: {
    dimension: Bilingual;
    bands: MaturityBand[];
    // Labels for discovery maturity scores 0–4.
    scale: Bilingual[];
  };
  // Valid keys of the angle matrix, "persona:band".
  angleKeys: string[];
}

const PERSONAS = ["founder", "people-leader", "finance", "operations", "sales"];
const angleKeysFor = (bands: MaturityBand[]) =>
  PERSONAS.flatMap((persona) => bands.map((band) => `${persona}:${band.id}`));

const SIZE_BANDS: MaturityBand[] = [
  {
    id: "P1a",
    label: { en: "Under 25 employees", ar: "أقل من 25 موظفًا" },
    maxEmployees: 25,
  },
  {
    id: "P1b",
    label: { en: "25 to 149 employees", ar: "من 25 إلى 149 موظفًا" },
    maxEmployees: 150,
  },
  {
    id: "P2",
    label: { en: "150 employees or more", ar: "150 موظفًا فأكثر" },
    maxEmployees: null,
  },
];

const MATURITY_SCALE: Bilingual[] = [
  { en: "no repeatable process", ar: "لا توجد عملية قابلة للتكرار" },
  { en: "informal/manual", ar: "عمل يدوي غير رسمي" },
  { en: "documented owner", ar: "مسؤول وخطوات موثقة" },
  { en: "integrated and tracked", ar: "أنظمة مترابطة ومتابعة" },
  { en: "measured and improved", ar: "قياس وتحسين مستمر" },
];

// Questions both packs ask in the same words.
const HEADCOUNT: PackQuestion = {
  id: "headcount",
  topic: { en: "Team", ar: "الفريق" },
  question: {
    en: "How many people work here today? What changed in the last three months?",
    ar: "كم عدد أفراد الفريق حاليًا؟ وما الذي تغيّر خلال الأشهر الثلاثة الماضية؟",
  },
  answer: {
    en: "Record the headcount band; keep plans separate from current staff.",
    ar: "سجّل فئة عدد الموظفين وافصل خطط التوظيف عن العدد الحالي.",
  },
};
const PRIORITY_ANSWER: Bilingual = {
  en: "Rate only topics they discuss: 1 = little impact, 3 = recurring friction, 5 = major operational impact. Unasked is unknown.",
  ar: "قيّم فقط ما نوقش: 1 أثر محدود و3 صعوبة متكررة و5 أثر تشغيلي كبير ما لم يُسأل عنه يبقى غير معروف.",
};
const ROLE_ANSWER: Bilingual = {
  en: "Probe relevance; the recipient's title does not prove a problem.",
  ar: "تحقق من الصلة فالمسمّى الوظيفي لا يثبت وجود مشكلة.",
};
const SYSTEMS: PackQuestion = {
  id: "systems",
  topic: { en: "Systems and maturity", ar: "الأنظمة والنضج" },
  question: {
    en: "What tools or files hold the process? Is there one owner, a written workflow and a way to track exceptions?",
    ar: "ما الأدوات أو الملفات المستخدمة؟ وهل توجد مسؤولية واضحة وخطوات مكتوبة وآلية لمتابعة الاستثناءات؟",
  },
  answer: { en: "", ar: "" },
  scale: true,
};
const DECISION: PackQuestion = {
  id: "decision",
  topic: { en: "Decision process", ar: "اتخاذ القرار" },
  question: {
    en: "If you wanted to change this process, who would evaluate it? Are there timing, security or budget constraints we should understand?",
    ar: "إذا أردتم تغيير العملية فمن يقيّم التغيير؟ وهل توجد قيود زمنية أو أمنية أو متعلقة بالميزانية؟",
  },
  answer: {
    en: "Record constraints as stated; never invent urgency or a budget.",
    ar: "سجّل القيود كما وردت ولا تفترض استعجالًا أو ميزانية.",
  },
};
const NEXT_STEP: PackQuestion = {
  id: "next-step",
  topic: { en: "Close with permission", ar: "الخطوة التالية بإذن" },
  question: {
    en: "Have I understood the situation correctly? Would a follow-up be useful, or should we leave it here?",
    ar: "هل فهمت الوضع بصورة صحيحة؟ هل ستكون المتابعة مفيدة أم نكتفي بهذا القدر؟",
  },
  answer: {
    en: "Read back the summary. Agree one next step or record no follow-up; honour any opt-out.",
    ar: "راجع الملخص مع المتحدث واتفقا على خطوة واحدة أو سجّل عدم المتابعة واحترم أي طلب بالتوقف.",
  },
};

export const PACKS: Record<PackId, Pack> = {
  "hr-services": {
    id: "hr-services",
    label: { en: "HR services", ar: "خدمات الموارد البشرية" },
    rubric: DEFAULT_RUBRIC,
    discovery: [
      HEADCOUNT,
      {
        id: "setup",
        topic: { en: "Ownership", ar: "المسؤولية" },
        question: {
          en: "Who owns HR, payroll and onboarding today? Where does a task change hands?",
          ar: "من المسؤول حاليًا عن الموارد البشرية والرواتب وتهيئة الموظفين؟ وأين تنتقل المهمة من شخص لآخر؟",
        },
        answer: {
          en: "Record HR set-up and the process owner. Do not infer ownership from a job title.",
          ar: "سجّل هيكل الموارد البشرية والمسؤول عن العملية ولا تستنتج المسؤولية من المسمّى الوظيفي.",
        },
      },
      {
        id: "recent-example",
        topic: { en: "Recent example", ar: "مثال حديث" },
        question: {
          en: "Walk me through the last payroll cycle or new hire. Which steps worked, and which needed manual follow-up?",
          ar: "احكِ لي عن آخر دورة رواتب أو موظف جديد ما الخطوات التي نجحت وما الذي احتاج إلى متابعة يدوية؟",
        },
        answer: {
          en: "Capture a concrete example in their words before suggesting a solution.",
          ar: "سجّل مثالًا محددًا بكلمات المتحدث قبل اقتراح أي حل.",
        },
      },
      {
        id: "priority",
        topic: { en: "Pain and priority", ar: "التحديات والأولوية" },
        question: {
          en: "Which, if any, is difficult: payroll, hiring, onboarding, compliance or retention? What happens when it goes wrong?",
          ar: "ما الذي يمثل تحديًا إن وُجد: الرواتب أم التوظيف أم تهيئة الموظفين أم الامتثال أم الاحتفاظ بالفريق؟ وما أثر تعثّره؟",
        },
        answer: PRIORITY_ANSWER,
      },
      {
        id: "role",
        topic: { en: "Role-specific follow-up", ar: "متابعة بحسب الدور" },
        question: {
          en: "Where does your team spend time coordinating with managers, finance or new joiners?",
          ar: "أين يقضي فريقك وقته في التنسيق مع المديرين أو المالية أو الموظفين الجدد؟",
        },
        variants: {
          finance: {
            en: "How do payroll approvals, reconciliation and exceptions reach finance? Which checks matter most?",
            ar: "كيف تصل موافقات الرواتب والتسويات والاستثناءات إلى المالية؟ وما أهم إجراءات التحقق؟",
          },
          founder: {
            en: "Which people operations decisions still need your time personally? What would you want to keep in-house?",
            ar: "ما قرارات إدارة شؤون الموظفين التي ما زالت تحتاج إلى وقتك شخصيًا؟ وما الذي تفضّل إبقاءه داخل الشركة؟",
          },
        },
        answer: ROLE_ANSWER,
      },
      SYSTEMS,
      DECISION,
      NEXT_STEP,
    ],
    setupField: {
      label: { en: "HR set-up", ar: "فريق الموارد البشرية" },
      options: [
        { value: "none", label: { en: "none", ar: "لا يوجد" } },
        { value: "founder", label: { en: "founder", ar: "مؤسّس" } },
        { value: "1-3", label: { en: "1-3", ar: "1-3" } },
        { value: "team", label: { en: "team", ar: "فريق" } },
      ],
    },
    pains: [
      { key: "payroll", label: { en: "payroll", ar: "الرواتب" } },
      { key: "hiring", label: { en: "hiring", ar: "التوظيف" } },
      { key: "onboarding", label: { en: "onboarding", ar: "تهيئة الموظفين" } },
      { key: "compliance", label: { en: "compliance", ar: "الامتثال" } },
      {
        key: "retention",
        label: { en: "retention", ar: "الاحتفاظ بالموظفين" },
      },
      { key: "training", label: { en: "training", ar: "التدريب" } },
      {
        key: "hr-admin",
        label: { en: "hr-admin", ar: "إدارة الموارد البشرية" },
      },
      { key: "cost", label: { en: "cost", ar: "التكلفة" } },
    ],
    maturity: {
      dimension: { en: "HR maturity", ar: "نضج الموارد البشرية" },
      bands: SIZE_BANDS,
      scale: MATURITY_SCALE,
    },
    angleKeys: angleKeysFor(SIZE_BANDS),
  },
  generic: {
    id: "generic",
    label: { en: "B2B services", ar: "خدمات الشركات" },
    rubric: DEFAULT_RUBRIC,
    discovery: [
      HEADCOUNT,
      {
        id: "ownership",
        topic: { en: "Ownership", ar: "المسؤولية" },
        question: {
          en: "Who owns this process today? Where does a task change hands?",
          ar: "من المسؤول حاليًا عن هذه العملية؟ وأين تنتقل المهمة من شخص لآخر؟",
        },
        answer: {
          en: "Record the process owner. Do not infer ownership from a job title.",
          ar: "سجّل المسؤول عن العملية ولا تستنتج المسؤولية من المسمّى الوظيفي.",
        },
      },
      {
        id: "recent-example",
        topic: { en: "Recent example", ar: "مثال حديث" },
        question: {
          en: "Walk me through the last deal or customer request you handled. Which steps worked, and which needed manual follow-up?",
          ar: "احكِ لي عن آخر صفقة أو طلب عميل تعاملتم معه ما الخطوات التي نجحت وما الذي احتاج إلى متابعة يدوية؟",
        },
        answer: {
          en: "Capture a concrete example in their words before suggesting a solution.",
          ar: "سجّل مثالًا محددًا بكلمات المتحدث قبل اقتراح أي حل.",
        },
      },
      {
        id: "priority",
        topic: { en: "Pain and priority", ar: "التحديات والأولوية" },
        question: {
          en: "Which, if any, is difficult: finding leads, qualifying them, follow-up, proposals or closing? What happens when it goes wrong?",
          ar: "ما الذي يمثل تحديًا إن وُجد: جذب العملاء المحتملين أم التأهيل أم المتابعة أم العروض أم إتمام الصفقات؟ وما أثر تعثّره؟",
        },
        answer: PRIORITY_ANSWER,
      },
      {
        id: "role",
        topic: { en: "Role-specific follow-up", ar: "متابعة بحسب الدور" },
        question: {
          en: "Where does your team spend time coordinating with managers, finance or customers?",
          ar: "أين يقضي فريقك وقته في التنسيق مع المديرين أو المالية أو العملاء؟",
        },
        variants: {
          finance: {
            en: "How do approvals, reconciliation and exceptions reach finance? Which checks matter most?",
            ar: "كيف تصل الموافقات والتسويات والاستثناءات إلى المالية؟ وما أهم إجراءات التحقق؟",
          },
          founder: {
            en: "Which commercial decisions still need your time personally? What would you want to keep in-house?",
            ar: "ما القرارات التجارية التي ما زالت تحتاج إلى وقتك شخصيًا؟ وما الذي تفضّل إبقاءه داخل الشركة؟",
          },
        },
        answer: ROLE_ANSWER,
      },
      SYSTEMS,
      DECISION,
      NEXT_STEP,
    ],
    setupField: null,
    pains: [
      {
        key: "lead-generation",
        label: { en: "lead generation", ar: "جذب العملاء المحتملين" },
      },
      { key: "qualification", label: { en: "qualification", ar: "التأهيل" } },
      { key: "follow-up", label: { en: "follow-up", ar: "المتابعة" } },
      { key: "proposals", label: { en: "proposals", ar: "العروض" } },
      { key: "closing", label: { en: "closing", ar: "إتمام الصفقات" } },
      {
        key: "retention",
        label: { en: "retention", ar: "الاحتفاظ بالعملاء" },
      },
      { key: "reporting", label: { en: "reporting", ar: "التقارير" } },
      { key: "cost", label: { en: "cost", ar: "التكلفة" } },
    ],
    maturity: {
      dimension: {
        en: "Sales process maturity",
        ar: "نضج عملية المبيعات",
      },
      bands: SIZE_BANDS,
      scale: MATURITY_SCALE,
    },
    angleKeys: angleKeysFor(SIZE_BANDS),
  },
};

export function packFor(id: string | null | undefined): Pack {
  return PACKS[id as PackId] ?? PACKS["hr-services"];
}
