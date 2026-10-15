import {
  inferPersona,
  type Evidence,
  type ProspectSnapshot,
} from "@revenue/contracts";
import { escapeHtml } from "./policy.js";

export function discoveryGuide(
  snapshot: ProspectSnapshot,
  evidence: Evidence[],
  workspaceName: string,
  language: "en" | "ar",
) {
  const ar = language === "ar";
  const text = (en: string, arabic: string) => (ar ? arabic : en);
  const persona = inferPersona(snapshot.title);
  const questions = [
    {
      id: "headcount",
      topic: text("Team", "الفريق"),
      question: text(
        "How many people work here today? What changed in the last three months?",
        "كم عدد أفراد الفريق حاليًا؟ وما الذي تغيّر خلال الأشهر الثلاثة الماضية؟",
      ),
      answer: text(
        "Record the headcount band; keep plans separate from current staff.",
        "سجّل فئة عدد الموظفين وافصل خطط التوظيف عن العدد الحالي.",
      ),
    },
    {
      id: "setup",
      topic: text("Ownership", "المسؤولية"),
      question: text(
        "Who owns HR, payroll and onboarding today? Where does a task change hands?",
        "من المسؤول حاليًا عن الموارد البشرية والرواتب وتهيئة الموظفين؟ وأين تنتقل المهمة من شخص لآخر؟",
      ),
      answer: text(
        "Record HR set-up and the process owner. Do not infer ownership from a job title.",
        "سجّل هيكل الموارد البشرية والمسؤول عن العملية ولا تستنتج المسؤولية من المسمّى الوظيفي.",
      ),
    },
    {
      id: "recent-example",
      topic: text("Recent example", "مثال حديث"),
      question: text(
        "Walk me through the last payroll cycle or new hire. Which steps worked, and which needed manual follow-up?",
        "احكِ لي عن آخر دورة رواتب أو موظف جديد ما الخطوات التي نجحت وما الذي احتاج إلى متابعة يدوية؟",
      ),
      answer: text(
        "Capture a concrete example in their words before suggesting a solution.",
        "سجّل مثالًا محددًا بكلمات المتحدث قبل اقتراح أي حل.",
      ),
    },
    {
      id: "priority",
      topic: text("Pain and priority", "التحديات والأولوية"),
      question: text(
        "Which, if any, is difficult: payroll, hiring, onboarding, compliance or retention? What happens when it goes wrong?",
        "ما الذي يمثل تحديًا إن وُجد: الرواتب أم التوظيف أم تهيئة الموظفين أم الامتثال أم الاحتفاظ بالفريق؟ وما أثر تعثّره؟",
      ),
      answer: text(
        "Rate only topics they discuss: 1 = little impact, 3 = recurring friction, 5 = major operational impact. Unasked is unknown.",
        "قيّم فقط ما نوقش: 1 أثر محدود و3 صعوبة متكررة و5 أثر تشغيلي كبير ما لم يُسأل عنه يبقى غير معروف.",
      ),
    },
    {
      id: "role",
      topic: text("Role-specific follow-up", "متابعة بحسب الدور"),
      question:
        persona === "finance"
          ? text(
              "How do payroll approvals, reconciliation and exceptions reach finance? Which checks matter most?",
              "كيف تصل موافقات الرواتب والتسويات والاستثناءات إلى المالية؟ وما أهم إجراءات التحقق؟",
            )
          : persona === "founder"
            ? text(
                "Which people operations decisions still need your time personally? What would you want to keep in-house?",
                "ما قرارات إدارة شؤون الموظفين التي ما زالت تحتاج إلى وقتك شخصيًا؟ وما الذي تفضّل إبقاءه داخل الشركة؟",
              )
            : text(
                "Where does your team spend time coordinating with managers, finance or new joiners?",
                "أين يقضي فريقك وقته في التنسيق مع المديرين أو المالية أو الموظفين الجدد؟",
              ),
      answer: text(
        "Probe relevance; the recipient's title does not prove a problem.",
        "تحقق من الصلة فالمسمّى الوظيفي لا يثبت وجود مشكلة.",
      ),
    },
    {
      id: "systems",
      topic: text("Systems and maturity", "الأنظمة والنضج"),
      question: text(
        "What tools or files hold the process? Is there one owner, a written workflow and a way to track exceptions?",
        "ما الأدوات أو الملفات المستخدمة؟ وهل توجد مسؤولية واضحة وخطوات مكتوبة وآلية لمتابعة الاستثناءات؟",
      ),
      answer: text(
        "Maturity: 0 = no repeatable process; 1 = informal/manual; 2 = documented owner; 3 = integrated and tracked; 4 = measured and improved. Confirm before scoring.",
        "النضج: 0 لا توجد عملية قابلة للتكرار و1 عمل يدوي غير رسمي و2 مسؤول وخطوات موثقة و3 أنظمة مترابطة ومتابعة و4 قياس وتحسين مستمر أكّد الوصف قبل التقييم.",
      ),
    },
    {
      id: "decision",
      topic: text("Decision process", "اتخاذ القرار"),
      question: text(
        "If you wanted to change this process, who would evaluate it? Are there timing, security or budget constraints we should understand?",
        "إذا أردتم تغيير العملية فمن يقيّم التغيير؟ وهل توجد قيود زمنية أو أمنية أو متعلقة بالميزانية؟",
      ),
      answer: text(
        "Record constraints as stated; never invent urgency or a budget.",
        "سجّل القيود كما وردت ولا تفترض استعجالًا أو ميزانية.",
      ),
    },
    {
      id: "next-step",
      topic: text("Close with permission", "الخطوة التالية بإذن"),
      question: text(
        "Have I understood the situation correctly? Would a follow-up be useful, or should we leave it here?",
        "هل فهمت الوضع بصورة صحيحة؟ هل ستكون المتابعة مفيدة أم نكتفي بهذا القدر؟",
      ),
      answer: text(
        "Read back the summary. Agree one next step or record no follow-up; honour any opt-out.",
        "راجع الملخص مع المتحدث واتفقا على خطوة واحدة أو سجّل عدم المتابعة واحترم أي طلب بالتوقف.",
      ),
    },
  ];
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
