import {
  inferPersona,
  packFor,
  type Evidence,
  type Pack,
  type ProspectSnapshot,
} from "@revenue/contracts";
import { escapeHtml } from "./policy.js";

export function discoveryGuide(
  snapshot: ProspectSnapshot,
  evidence: Evidence[],
  workspaceName: string,
  language: "en" | "ar",
  pack: Pack = packFor("hr-services"),
) {
  const ar = language === "ar";
  const text = (en: string, arabic: string) => (ar ? arabic : en);
  const persona = inferPersona(snapshot.title);
  const questions = pack.discovery.map((q) => {
    const wording = (q.variants?.[persona] ?? q.question)[language];
    // The systems question states the pack's 0–4 maturity scale.
    const answer = q.scale
      ? ar
        ? `النضج: ${pack.maturity.scale.map((s, i) => `${i} ${s.ar}`).join(" و")} أكّد الوصف قبل التقييم.`
        : `Maturity: ${pack.maturity.scale.map((s, i) => `${i} = ${s.en}`).join("; ")}. Confirm before scoring.`
      : q.answer[language];
    return { id: q.id, topic: q.topic[language], question: wording, answer };
  });
  return {
    language,
    title: text("Discovery interview guide", "دليل مقابلة الاستكشاف"),
    company: snapshot.company,
    person: `${snapshot.firstName} ${snapshot.lastName}`.trim(),
    role: snapshot.title,
    workspace: workspaceName,
    segment: snapshot.segment ?? null,
    generatedAt: new Date().toISOString(),
    method: "reviewed-context-template" as const,
    introduction: text(
      "Ask for 15–20 minutes and permission to take notes. Explain that this is a discovery conversation, not a promise of results. Do not record audio without permission.",
      "اطلب 15–20 دقيقة وإذنًا لتدوين الملاحظات ووضّح أن اللقاء لفهم الوضع وليس وعدًا بنتائج ولا تسجّل الصوت دون إذن.",
    ),
    contextNote: text(
      "Reviewed sources are conversation context, not proof of pain, budget or personal attendance. Confirm current facts with the interviewee.",
      "المصادر المراجعة سياق للنقاش وليست دليلًا على مشكلة أو ميزانية أو حضور شخصي تحقّق من الوضع الحالي مع المتحدث.",
    ),
    facts: evidence
      .filter((e) => e.approved && e.kind === "fact")
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        claim: e.claim,
        date: e.date.slice(0, 10),
        url: e.url,
      })),
    questions,
    completion: text(
      "Save confirmed answers in Discovery interview. A generated guide does not create answers, scores, outreach or a follow-up task.",
      "احفظ الإجابات المؤكدة في مقابلة الاستكشاف إعداد الدليل لا ينشئ إجابات أو تقييمات أو تواصلًا أو مهمة متابعة.",
    ),
  };
}

export function discoveryGuideHtml(guide: ReturnType<typeof discoveryGuide>) {
  const e = escapeHtml;
  const ar = guide.language === "ar";
  return `<!doctype html><html lang="${guide.language}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${e(guide.title)}</title><style>
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:10pt/1.6 "Inter","IBM Plex Sans Arabic",Arial,sans-serif;color:#26262b;margin:0}h1{font-size:22pt;line-height:1.3;margin:0 0 12px}h2{font-size:12pt;margin:18px 0 8px}p{margin:6px 0}.meta{color:#65656c;font-size:9pt}.question{break-inside:avoid;border-top:1px solid #ddd;padding-block:10px}.question p{font-weight:600}.hint{color:#65656c;font-size:9pt}a{color:#21445e;overflow-wrap:anywhere}.answer{border-bottom:1px solid #ddd;height:20px}li{margin-block:6px}bdi{unicode-bidi:isolate}</style></head><body>
<p class="meta"><bdi>${e(guide.workspace)}</bdi> · ${guide.generatedAt.slice(0, 10)}</p><h1>${e(guide.title)}</h1>
<p><bdi>${e(guide.company)}</bdi> · <bdi>${e(guide.person)}</bdi> · <bdi>${e(guide.role)}</bdi></p>
<p>${e(guide.introduction)}</p><h2>${ar ? "سياق من المصادر المراجعة" : "Reviewed context"}</h2><p class="hint">${e(guide.contextNote)}</p>
${guide.facts.length ? `<ul>${guide.facts.map((f) => `<li dir="auto">${e(f.claim)} <span class="meta"><bdi>${e(f.date)}</bdi></span><br><bdi>${e(f.url)}</bdi></li>`).join("")}</ul>` : `<p>${ar ? "لا توجد مصادر واقعية مراجعة بعد ابدأ بأسئلة مفتوحة" : "No reviewed facts yet. Start with open questions."}</p>`}
${guide.questions.map((q, i) => `<section class="question"><h2>${i + 1}. ${e(q.topic)}</h2><p>${e(q.question)}</p><div class="hint">${e(q.answer)}</div><div class="answer"></div></section>`).join("")}
<p class="hint">${e(guide.completion)}</p></body></html>`;
}
