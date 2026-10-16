import type {
  Evidence,
  ProspectSnapshot,
  ResearchBrief,
} from "@revenue/contracts";
import { digest, escapeHtml } from "./policy.js";

export function researchBrief(
  snapshot: ProspectSnapshot,
  evidence: Evidence[],
  workspace: string,
  updatedAt: Date,
  language: "en" | "ar",
): ResearchBrief {
  const facts = evidence.filter(
    (item) =>
      item.kind === "fact" &&
      item.approved &&
      /^https?:\/\//i.test(item.url) &&
      Number.isFinite(Date.parse(item.date)) &&
      item.claim.trim(),
  );
  const hypotheses = evidence.filter((item) => item.kind === "hypothesis");
  const unknowns = evidence.filter((item) => item.kind === "unknown");
  return {
    language,
    workspace,
    company: snapshot.company,
    person: `${snapshot.firstName} ${snapshot.lastName}`.trim(),
    role: snapshot.title,
    segment: snapshot.segment ?? null,
    recordUpdatedAt: updatedAt.toISOString(),
    recordDigest: digest({ snapshot, evidence }),
    facts,
    hypotheses,
    unknowns,
    withheldFacts:
      evidence.filter((item) => item.kind === "fact").length - facts.length,
  };
}

export function researchBriefHtml(brief: ResearchBrief) {
  const ar = brief.language === "ar",
    e = escapeHtml;
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const section = (title: string, items: Evidence[], empty: string) =>
    `<section><h2>${e(title)} <span class="count">${items.length}</span></h2>${items.length ? items.map((item) => `<article><p dir="auto">${e(item.claim)}</p><p class="source"><bdi>${e(item.source)}</bdi>${Number.isFinite(Date.parse(item.date)) ? ` · <bdi>${e(item.date.slice(0, 10))}</bdi>` : ""}</p>${/^https?:\/\//i.test(item.url) ? `<a href="${e(item.url)}"><bdi>${e(item.url)}</bdi></a>` : ""}</article>`).join("") : `<p class="muted">${e(empty)}</p>`}</section>`;
  return `<!doctype html><html lang="${brief.language}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${e(t("Account research brief", "ملخص بحث الحساب"))}</title><style>
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#27272d;font:10pt/1.6 "Inter","IBM Plex Sans Arabic",Arial,sans-serif}h1{font-size:24pt;line-height:1.25;margin:8px 0 12px}h2{font-size:13pt;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:6px}p{margin:5px 0}article{break-inside:avoid;padding:8px 0;border-bottom:1px solid #eee}.source,.muted,.count{font-size:9pt;color:#64646c}.notice{padding:12px;background:#f3f3f5;border-inline-start:3px solid #555;margin:16px 0}a{font-size:9pt;color:#254e6a;overflow-wrap:anywhere}bdi{unicode-bidi:isolate}footer{margin-top:24px;font-size:8pt;color:#666;overflow-wrap:anywhere}</style></head><body>
<p class="muted"><bdi>${e(brief.workspace)}</bdi></p><h1>${e(t("Account research brief", "ملخص بحث الحساب"))}</h1><p><strong><bdi>${e(brief.company)}</bdi></strong> · <bdi>${e(brief.person)}</bdi></p><p dir="auto">${e(brief.role)}</p>${brief.segment ? `<p>${e(t("Segment", "الشريحة"))}: <bdi>${e(brief.segment)}</bdi></p>` : ""}
<div class="notice">${e(t("Internal research snapshot. Source wording is preserved in its original language. Only reviewed, dated and cited facts appear as facts. Hypotheses remain unverified; unknowns remain unanswered. This export does not approve outreach or refresh a source.", "نسخة داخلية من البحث تُحفظ صياغة المصادر بلغتها الأصلية لا تُعرض كحقائق إلا المعلومات المراجعة ذات التاريخ والمصدر الفرضيات غير مؤكدة والأسئلة المفتوحة لم تُحسم هذا التصدير لا يجيز التواصل ولا يحدّث المصادر."))}</div>
${section(t("Reviewed facts", "حقائق مراجعة"), brief.facts, t("No reviewed facts yet.", "لا توجد حقائق مراجعة بعد."))}
${brief.withheldFacts ? `<p class="muted">${brief.withheldFacts} ${e(t("factual claims omitted because review, citation or date is missing.", "معلومة واقعية لم تُدرج لنقص المراجعة أو المصدر أو التاريخ."))}</p>` : ""}
${section(t("Hypotheses — unverified", "فرضيات غير مؤكدة"), brief.hypotheses, t("No hypotheses recorded.", "لم تُسجّل فرضيات."))}
${section(t("Unknowns — to confirm", "أسئلة مفتوحة للتحقق"), brief.unknowns, t("No open questions recorded. This does not establish that all research is complete.", "لم تُسجّل أسئلة مفتوحة وهذا لا يثبت اكتمال البحث."))}
<footer>${e(t("Saved record updated", "آخر تحديث للسجل"))}: <bdi>${e(brief.recordUpdatedAt)}</bdi><br>${e(t("Record fingerprint", "بصمة السجل"))}: <bdi>${e(brief.recordDigest)}</bdi></footer></body></html>`;
}
