import type {
  Actor,
  AssistantUiAction,
  ProspectSnapshot,
} from "@revenue/contracts";
import { db } from "../database.js";

const screens: [
  string,
  Extract<AssistantUiAction, { kind: "navigate" }>["screen"],
][] = [
  ["plays|الخطط|الخطط الجاهزة", "Plays"],
  ["accounts|الحسابات", "Accounts"],
  ["review queue|قائمة المراجعة", "Review queue"],
  ["asset studio|استوديو المواد", "Asset Studio"],
  ["sequences|التسلسلات", "Sequences"],
  ["company context|سياق الشركة", "Company context"],
  ["settings|الإعدادات|الاعدادات", "Settings"],
];
const clean = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.!?؟]+$/g, "")
    .trim();
const open =
  /^(?:please\s+)?(?:open|go to|show|take me to|navigate to|افتح|اعرض|روح(?: إلى| ل)?)\s+(?:the\s+|صفحة\s+)?(.+)$/i;

// Obvious UI commands need no model inference. Ambiguous requests fall through to
// the agent, which can search/read/clarify. This path never edits or approves data.
export async function directNavigation(
  actor: Actor,
  content: string,
  context: { activeAssetId?: string; activeProspectId?: string },
): Promise<AssistantUiAction | null> {
  const target = clean(content).match(open)?.[1]?.trim();
  if (!target || /\s(?:and|then|وبعدها|ثم)\s/.test(target)) return null;
  const screen = screens.find(([aliases]) =>
    aliases.split("|").includes(target.replace(/\s+(?:page|screen)$/, "")),
  );
  if (screen) return { kind: "navigate", screen: screen[1] };
  const asset = /one[ -]?pager|\bpdf\b|one.page|صفحة|المادة|المستند/.test(
    target,
  );
  if (
    asset &&
    /^(?:this|current|هذه|هذا|الحالي|الحالية)(?:\s|$)/.test(target) &&
    context.activeAssetId
  ) {
    const record = await db.asset.findFirst({
      where: { workspaceId: actor.workspaceId, id: context.activeAssetId },
    });
    return record ? { kind: "open_asset", assetId: record.id } : null;
  }
  const prospects = await db.prospect.findMany({
    where: { workspaceId: actor.workspaceId },
    take: 1000,
    select: { id: true, snapshot: true },
  });
  const named = prospects.filter((p) => {
    const s = p.snapshot as ProspectSnapshot;
    const name = clean(`${s.firstName} ${s.lastName}`);
    return name.length >= 3 && target.includes(name);
  });
  const matches = named.length
    ? named
    : prospects.filter(
        (p) =>
          clean((p.snapshot as ProspectSnapshot).company).length >= 3 &&
          target.includes(clean((p.snapshot as ProspectSnapshot).company)),
      );
  if (!matches.length) return null;
  if (asset && /latest|newest|last|آخر|اخر|أحدث|احدث/.test(target)) {
    const language = /arabic|عربي/.test(target)
      ? { startsWith: "ar" }
      : /english|إنجليزي|انجليزي/.test(target)
        ? "en"
        : undefined;
    const record = await db.asset.findFirst({
      where: {
        workspaceId: actor.workspaceId,
        prospectId: { in: matches.map((p) => p.id) },
        ...(language ? { language } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return record ? { kind: "open_asset", assetId: record.id } : null;
  }
  if (!asset && matches.length === 1) {
    const snapshot = matches[0]!.snapshot as ProspectSnapshot;
    const name = clean(`${snapshot.firstName} ${snapshot.lastName}`),
      company = clean(snapshot.company);
    const accountTarget = target
      .replace(/^(?:account|record|حساب)\s+(?:for\s+)?/, "")
      .replace(/\s+(?:account|record)$/, "");
    if (
      [
        name,
        company,
        `${name} at ${company}`,
        `${name} from ${company}`,
      ].includes(accountTarget)
    )
      return { kind: "open_account", prospectId: matches[0]!.id };
  }
  return null;
}

export async function directAssetRevision(
  actor: Actor,
  content: string,
  assetId?: string,
) {
  if (!assetId || content.length > 1500) return null;
  const request = clean(content);
  if (
    !/^(?:please\s+)?(?:change|shorten|rewrite|replace|make|update|edit|adjust|translate|غيّر|غير|عدّل|عدل|اختصر|بدّل|بدل|خلي|خلّي|اكتب|ترجم)\s/.test(
      request,
    )
  )
    return null;
  if (
    !/heading|title|layout|colou?r|font|text|wording|paragraph|section|document|one.pager|pdf|عنوان|تصميم|لون|تنسيق|خط|صياغ|نص|فقرة|المستند|الصفحة/.test(
      request,
    )
  )
    return null;
  const asset = await db.asset.findFirst({
    where: { id: assetId, workspaceId: actor.workspaceId },
  });
  if (!asset?.prospectId) return null;
  return {
    sourceAssetId: asset.id,
    prospectIds: [asset.prospectId],
    template: asset.template,
    language: asset.language,
    instructions: content,
  };
}
