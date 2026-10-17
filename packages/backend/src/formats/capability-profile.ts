import { z } from "zod";
import { injectFonts } from "../asset-template.js";
import { normalizeAssetBidi } from "../asset-bidi.js";
import { arabic, esc, fontStack, palette, sourceLine, type FormatContext } from "./shared.js";

// Capability profile (PRD v3.2 A6 / STU-09): a brand-level company profile on A4 pages, plus
// an optional account-tailored cover. The model writes only a title, a tagline, a short intro
// and an optional cover headline. This trusted template owns every other word on the page:
// services are the approved offers verbatim, proof is the references with recorded consent
// and the one approved account fact on the cover. Nothing unapproved is ever rendered.

// Share of sequences that go out without the profile when the run does not say (SEQ-08).
export const PROFILE_DEFAULT_HOLDOUT = 20;

export const profileContent = z.object({
  title: z.string().min(2).max(100),
  tagline: z.string().max(180).optional(),
  intro: z.string().max(600).optional(),
  coverHeadline: z.string().max(110).optional(),
});
export type ProfileContent = z.infer<typeof profileContent>;

const clip = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("؟ "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
};

export function profileHoldoutPercent(context: Pick<FormatContext, "holdoutPercent">) {
  const value = context.holdoutPercent;
  return value && value > 0 ? Math.min(100, Math.round(value)) : PROFILE_DEFAULT_HOLDOUT;
}

export function requireProfileInputs(context: FormatContext) {
  if (!context.offers?.length)
    throw new Error("Approve an offer in company context before generating a capability profile.");
}

// Deterministic content for fixture mode and tests: built only from approved inputs.
export function fixtureProfileContent(context: FormatContext): ProfileContent {
  const ar = arabic(context.language);
  const brand = context.brand.name;
  const account = context.snapshot?.company;
  return {
    title: ar ? `ملف قدرات ${brand}` : `${brand} capability profile`,
    tagline: clip(context.offers?.[0] ?? context.offer ?? "", 180) || undefined,
    intro: clip(context.company, 600) || undefined,
    coverHeadline: account
      ? ar
        ? `ملف قدرات ${brand} لفريق ${account}`
        : `A capability profile for ${account}`
      : undefined,
  };
}

function css(context: FormatContext) {
  const c = palette(context.brand);
  return `
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{font-family:${fontStack(context.language)};color:${c.body};font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html[dir=rtl] body{line-height:1.85}
.page{position:relative;width:794px;height:1123px;margin:0 auto;overflow:hidden;background:${c.paper};break-after:page;page-break-after:always}
.page:last-of-type{break-after:auto;page-break-after:auto}
.pg{position:absolute;inset:0;display:flex;flex-direction:column;gap:22px;padding:64px 64px 84px}
.cover{background:${c.primary}}
.cover .pg{color:${c.onPrimary};justify-content:space-between}
.eyebrow{margin:0;font:600 11px/1.3 "Geist Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:${c.primary}}
html[dir=rtl] .eyebrow{font-family:${fontStack(context.language)};letter-spacing:0;font-size:12px}
.cover .eyebrow{color:${c.onPrimary};opacity:.85}
h1{margin:0;font-size:38px;line-height:1.15;letter-spacing:-.02em;color:${c.ink}}
html[dir=rtl] h1{letter-spacing:0;line-height:1.5}
.cover h1{color:${c.onPrimary};font-size:44px}
h2{margin:0 0 8px;font:600 12px/1.3 "Geist Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${c.muted}}
html[dir=rtl] h2{font-family:${fontStack(context.language)};letter-spacing:0;font-size:14px}
p{margin:0}
.tagline{font-size:18px;line-height:1.45;color:${c.body}}
.prepared{font-size:14px;opacity:.9}
.cover-foot{display:grid;gap:14px}
.cover-fact{padding:14px 18px;border-inline-start:3px solid ${c.accent};background:rgba(255,255,255,.1);font-size:15px}
.cover-fact .src{display:block;margin-top:6px;font-size:11px;opacity:.8}
.meta{font-size:12px;opacity:.8}
.services{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.services li{padding:12px 16px;border:1px solid ${c.line};border-radius:8px;color:${c.ink};break-inside:avoid}
.proof{padding:16px 18px;border-radius:10px;background:${c.tint}}
.proof ul{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px}
.proof li{padding:4px 12px;border-radius:99px;background:#fff;border:1px solid ${c.line};color:${c.ink};font-weight:600}
.proof .note{margin-top:10px;font-size:12px;color:${c.muted}}
.trust{margin-top:auto;padding:10px 14px;border-radius:8px;background:${c.tint};font-size:12px;color:${c.deep}}
.folio{position:absolute;inset-inline:64px;bottom:34px;display:flex;justify-content:space-between;font-size:11px;color:${c.muted}}
.cover .folio{color:${c.onPrimary};opacity:.7}
.holdout-badge{position:absolute;top:18px;inset-inline-end:18px;z-index:2;padding:5px 12px;border-radius:99px;background:#e8f0fe;color:#1a4ea1;font-size:11.5px;font-weight:600;line-height:1.4}
bdi{unicode-bidi:isolate}
@page{size:A4;margin:0}
/* The holdout note is for the reviewer; the sent PDF carries no test marker. */
@media print{.holdout-badge{display:none}}
`;
}

export function renderCapabilityProfile(content: ProfileContent, context: FormatContext) {
  requireProfileInputs(context);
  const rtl = arabic(context.language);
  const L = (en: string, ar: string) => (rtl ? ar : en);
  const holdout = profileHoldoutPercent(context);
  const brand = esc(context.brand.name);
  const account = context.snapshot?.company;
  const fact = account ? context.facts[0] : undefined;
  const site = context.brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const badge = `<p class="holdout-badge" data-holdout="${holdout}">${L(
    `Holdout test: ${holdout}% of sequences get no profile`,
    `اختبار المقارنة: ${holdout}٪ من التسلسلات تُرسل بدون الملف`,
  )}</p>`;
  const refs = context.references ?? [];
  const total = account ? 2 : 1;
  let index = 0;
  const folio = () =>
    `<footer class="folio"><span>${site ? `<bdi dir="ltr">${esc(site)}</bdi> · ` : ""}${brand}</span><span>${L("Page", "صفحة")} <bdi dir="ltr">${++index} / ${total}</bdi></span></footer>`;
  const cover = account
    ? `<section class="page cover" data-page="cover"><div class="pg"><p class="eyebrow">${brand}</p><div><h1>${esc(content.coverHeadline ?? fixtureProfileContent(context).coverHeadline ?? content.title)}</h1></div><div class="cover-foot"><p class="prepared">${L("Prepared for", "مُعدّ لـ")} <bdi>${esc(account)}</bdi></p>${fact ? `<p class="cover-fact">${esc(fact.claim)}<span class="src">${sourceLine(fact, context.language)}</span></p>` : ""}<p class="meta"><bdi dir="ltr">${esc(context.date)}</bdi></p></div></div>${badge}${folio()}</section>`
    : "";
  const profile = `<section class="page profile" data-page="profile"><div class="pg"><p class="eyebrow">${brand} · ${L("Capability profile", "ملف القدرات")}</p><h1>${esc(content.title)}</h1>${content.tagline ? `<p class="tagline">${esc(content.tagline)}</p>` : ""}<div><h2>${L("What we run", "ما نقدّمه")}</h2><ul class="services">${context.offers!.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>${content.intro ? `<div><h2>${L("About us", "عنّا")}</h2><p>${esc(content.intro)}</p></div>` : ""}${refs.length ? `<div class="proof"><h2>${L("Teams that work with us", "فرق تعمل معنا")}</h2><ul>${refs.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><p class="note">${L("Named with their recorded consent.", "مذكورة بموافقتها المسجّلة.")}</p></div>` : ""}<p class="trust">${L("Every claim comes from the approved offer and proof. Nothing outside approved proof appears.", "كل ما هو مذكور مصدره العرض والإثبات المعتمدان. لا يظهر أي شيء خارج الإثبات المعتمد.")}</p></div>${account ? "" : badge}${folio()}</section>`;
  const html = injectFonts(`<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(content.title)}</title>
<style>${css(context)}</style></head><body>${cover}${profile}</body></html>`);
  return normalizeAssetBidi(html, context.language);
}

export const profilePageCount = (html: string) =>
  (html.match(/<section class="page\b/g) ?? []).length;
