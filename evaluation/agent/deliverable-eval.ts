// Live deliverable evaluation (17 Oct 2026): emails, carousels and flipbooks written by one
// model, checked by the format validators, judged by the stronger model, and rendered to
// PNG for visual inspection. Synthetic workspaces only.
//   EVAL_MODEL=gpt-5-4-mini tsx evaluation/agent/deliverable-eval.ts mini
//   EVAL_MODEL=gpt-6-1-sol  tsx evaluation/agent/deliverable-eval.ts sol
// Spend is recorded in results/spend-2026-10-17.json; every run stops at USD 9 in total.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { z } from "zod";
import {
  ModelGateway,
  generateDeliverable,
  lintFor,
  modelUsage,
  promptFor,
  promptVersions,
  type ContentFormat,
  type FormatContext,
} from "../../packages/backend/src/index.ts";

const label = process.argv[2] ?? "candidate";
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error("Use a short alphanumeric label.");
const model = process.env.EVAL_MODEL ?? "gpt-5-4-mini";
const judge = process.env.EVAL_JUDGE ?? "gpt-6-1-sol";
process.env.AI_DELIVERABLE_MODEL = model;
const only = process.argv[3];
const outDir = `evaluation/agent/results/deliverables-2026-10-17-${label}`;
const ledgerPath = "evaluation/agent/results/spend-2026-10-17.json";
const LIMIT = 9;

// USD per 1M tokens, Sweden Central Global Standard (Azure retail prices API, 16 Oct 2026).
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5-4-mini": { input: 0.75, output: 4.5 },
  "gpt-6-1-sol": { input: 2, output: 10 },
};
const cost = (id: string, u: { input: number; output: number }) => {
  const p = PRICES[id] ?? { input: 2, output: 10 };
  return (u.input * p.input + u.output * p.output) / 1e6;
};
type Ledger = { runs: { label: string; model: string; usd: number; at: string }[]; total: number };
const ledger: Ledger = JSON.parse(await readFile(ledgerPath, "utf8").catch(() => '{"runs":[],"total":0}'));
const spent = () => [...modelUsage.entries()].reduce((sum, [id, u]) => sum + cost(id, u), 0);
const overBudget = () => ledger.total + spent() >= LIMIT;
if (overBudget()) throw new Error(`Evaluation budget reached: USD ${ledger.total.toFixed(2)} of ${LIMIT}.`);

const qimam: FormatContext = {
  brand: { name: "Qimam People", primary: "#0f3d3e", accent: "#e0a43b", website: "https://qimam-people.example" },
  company: "An outsourced HR operations desk in Cairo for companies with 30–300 staff. Customers: growing Egyptian and Saudi companies without an in-house payroll team.",
  offer: "An outsourced HR operations desk that runs payroll and employee onboarding.",
  facts: [
    { id: "q1", claim: "Nile Logistics lists four open payroll and HR administrator vacancies on its careers page.", url: "https://nile-logistics.example/careers", date: "2026-10-05T00:00:00.000Z", kind: "fact", approved: true, source: "Careers page" },
    { id: "q2", claim: "Nile Logistics says it opened 3 new warehouses in Alexandria this year.", url: "https://nile-logistics.example/news", date: "2026-09-20T00:00:00.000Z", kind: "fact", approved: true, source: "News page" },
  ],
  snapshot: { firstName: "Mona", lastName: "Adel", email: "mona@nile-logistics.example", company: "Nile Logistics", website: "https://nile-logistics.example", title: "Head of People" },
  language: "en",
  date: "2026-10-17",
};
const nour: FormatContext = {
  brand: { name: "Nour Studio", primary: "#1f2937", accent: "#f59e0b", website: "https://nour-studio.example" },
  company: "A one-person brand and web design studio in Cairo. Customers: Egyptian clinics, cafes and boutique retailers with 5–50 staff and an outdated website.",
  offer: "A free one-page website review with three fixes you can make this week.",
  facts: [
    { id: "n1", claim: "Dar Al Shifa Clinic's booking page has no Arabic version and lists only a landline number.", url: "https://dar-alshifa.example/booking", date: "2026-10-02T00:00:00.000Z", kind: "fact", approved: true, source: "Website check" },
  ],
  language: "en",
  date: "2026-10-17",
};
const nourClinic: FormatContext = {
  ...nour,
  snapshot: { firstName: "Hany", lastName: "Fouad", email: "hany@dar-alshifa.example", company: "Dar Al Shifa Clinic", website: "https://dar-alshifa.example", title: "Clinic Manager" },
};
const nourBrand: FormatContext = { ...nour, facts: [] };

type Case = { id: string; format: ContentFormat; context: FormatContext; instructions: string; slides?: number };
const cases: Case[] = [
  { id: "gmail-en", format: "email-gmail", context: nourClinic, instructions: "Announce the free website review to clinic owners." },
  { id: "gmail-ar", format: "email-gmail", context: { ...qimam, language: "ar-EG" }, instructions: "عرّف مسؤولي الموارد البشرية بخدمة تشغيل الرواتب والتهيئة." },
  { id: "outlook-en", format: "email-outlook", context: qimam, instructions: "Follow-up email for Nile Logistics' Head of People about their payroll vacancies." },
  { id: "outlook-ar", format: "email-outlook", context: { ...nourBrand, language: "ar" }, instructions: "رسالة قصيرة لأصحاب العيادات عن المراجعة المجانية للموقع." },
  { id: "instagram-en", format: "instagram-carousel", context: nourBrand, instructions: "Why clinic websites lose bookings.", slides: 7 },
  { id: "instagram-ar", format: "instagram-carousel", context: { ...nourBrand, language: "ar-EG" }, instructions: "ليه مواقع العيادات بتخسر حجوزات.", slides: 6 },
  { id: "linkedin-en", format: "linkedin-carousel", context: { ...qimam, snapshot: undefined }, instructions: "What breaks first when a company grows past 50 staff without a payroll team.", slides: 8 },
  { id: "linkedin-ar", format: "linkedin-carousel", context: { ...qimam, snapshot: undefined, language: "ar-Gulf" }, instructions: "متى تحتاج شركتك لخدمة خارجية للرواتب؟", slides: 6 },
  { id: "flipbook-en", format: "flipbook", context: qimam, instructions: "A short guide for Nile Logistics on how the outsourced HR desk works.", slides: 8 },
  { id: "flipbook-ar", format: "flipbook", context: { ...nourClinic, language: "ar-EG" }, instructions: "دليل قصير لأصحاب العيادات عن تحسين صفحة الحجز.", slides: 6 },
];

const verdict = z.object({
  copy: z.number().int().min(1).max(5),
  grounding: z.number().int().min(1).max(5),
  structure: z.number().int().min(1).max(5),
  language: z.number().int().min(1).max(5),
  notes: z.string().max(400),
});
const JUDGE = `You review one marketing deliverable's content JSON for a MENA B2B team. Score 1-5:
copy (clear, specific, no filler or hype, fits the format's length), grounding (only uses the supplied brand, account, facts, offer and company; no invented numbers, clients or results; the brand name and brand website are supplied, not invented; 1 = any fabrication),
structure (email: one idea, one button; carousel: hook first, one idea per slide, CTA last; flipbook: cover, coherent sequence, CTA), language (correct requested language/register; natural Egyptian/Gulf/MSA when requested).
Return {"copy","grounding","structure","language","notes"} with notes naming the weakest point.`;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable" });
const results = [];
for (const c of cases.filter((c) => !only || c.id === only)) {
  if (overBudget()) {
    results.push({ id: c.id, skipped: "budget" });
    continue;
  }
  const started = Date.now();
  try {
    const out = await generateDeliverable(c.format, c.context, { instructions: c.instructions, slides: c.slides });
    const ms = Date.now() - started;
    const lint = lintFor(c.format, out.html);
    // HTML is not kept: it embeds fonts (~220 KB); JSON + PNG + report are enough to review.
    await writeFile(`${outDir}/${c.id}.json`, JSON.stringify(out.content, null, 2));
    const page = await browser.newPage({ viewport: c.format.startsWith("email") ? { width: 680, height: 1100 } : c.format === "flipbook" ? { width: 1200, height: 900 } : { width: 1080, height: 1350 } });
    await page.setContent(c.format === "flipbook" && out.printHtml ? out.printHtml : out.html, { waitUntil: "load" });
    await page.screenshot({ path: `${outDir}/${c.id}.png`, fullPage: !c.format.includes("carousel") });
    await page.close();
    const judged = await new ModelGateway().json(JUDGE, { format: c.format, contentLanguage: c.context.language, brand: c.context.brand, account: c.context.snapshot ?? null, facts: c.context.facts, offer: c.context.offer, company: c.context.company, request: c.instructions, content: out.content }, verdict, 1500, judge);
    results.push({ id: c.id, format: c.format, language: c.context.language, ok: true, ms, pages: out.pages, bytes: Buffer.byteLength(out.html), lintErrors: lint.filter((l) => l.level === "error").map((l) => l.rule), lintWarnings: lint.filter((l) => l.level === "warn").map((l) => l.rule), judge: judged });
    console.log(c.id, "ok", ms, "ms", JSON.stringify(judged));
  } catch (error) {
    results.push({ id: c.id, format: c.format, language: c.context.language, ok: false, ms: Date.now() - started, error: (error as Error).message });
    console.log(c.id, "FAIL", (error as Error).message);
  }
}
await browser.close();
const usd = spent();
ledger.runs.push({ label, model, usd, at: new Date().toISOString() });
ledger.total = Number((ledger.total + usd).toFixed(4));
await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
const ok = results.filter((r) => "ok" in r && r.ok) as { judge: z.infer<typeof verdict>; lintErrors: string[] }[];
const mean = (k: keyof z.infer<typeof verdict>) => ok.length ? Number((ok.reduce((s, r) => s + (r.judge[k] as number), 0) / ok.length).toFixed(2)) : null;
const summary = {
  label,
  model,
  judge,
  prompts: promptVersions(promptFor("email-gmail").id as "format-email", "format-carousel", "format-flipbook", "language"),
  passed: `${ok.length}/${results.length}`,
  lintClean: ok.filter((r) => !r.lintErrors.length).length,
  means: { copy: mean("copy"), grounding: mean("grounding"), structure: mean("structure"), language: mean("language") },
  usage: Object.fromEntries(modelUsage),
  usd: Number(usd.toFixed(4)),
  ledgerTotal: ledger.total,
};
await writeFile(`${outDir}/report.json`, JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
