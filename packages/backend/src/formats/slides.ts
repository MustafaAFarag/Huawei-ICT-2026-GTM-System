import { z } from "zod";
import { injectFonts } from "../asset-template.js";
import {
  arabic,
  esc,
  factById,
  fontStack,
  host,
  palette,
  sourceLine,
  type FormatContext,
} from "./shared.js";

// Instagram and LinkedIn carousels: 1080×1350 (4:5) slides, one idea each. Hook first,
// CTA last, body text at least 44px, 88px safe margins and a progress marker on every
// slide. Instagram exports one PNG per slide; LinkedIn uploads a multi-page PDF document.

const slide = z.object({
  kind: z.enum(["hook", "point", "list", "stat", "quote", "cta"]),
  kicker: z.string().max(40).optional(),
  heading: z.string().min(2).max(90),
  body: z.string().max(240).optional(),
  bullets: z.array(z.string().max(80)).max(4).optional(),
  stat: z.object({ value: z.string().max(12), label: z.string().max(70) }).optional(),
  quote: z.object({ text: z.string().max(200), by: z.string().max(60) }).optional(),
  sourceId: z.string().optional(),
});
export const carouselContent = z.object({
  title: z.string().min(2).max(90),
  handle: z.string().max(40).optional(),
  slides: z.array(slide).min(3).max(12),
  caption: z.string().max(2200),
  hashtags: z.array(z.string().max(40)).max(8).optional(),
});
export type CarouselContent = z.infer<typeof carouselContent>;

export const SLIDE = { width: 1080, height: 1350 } as const;

// The hook opens and the CTA closes even if the model ordered them differently.
export function normalizeCarousel(content: CarouselContent): CarouselContent {
  const slides = [...content.slides];
  const hook = slides.findIndex((s) => s.kind === "hook");
  if (hook > 0) slides.unshift(...slides.splice(hook, 1));
  else if (hook < 0) slides[0] = { ...slides[0]!, kind: "hook" };
  const cta = slides.findIndex((s, i) => s.kind === "cta" && i > 0);
  if (cta >= 0 && cta !== slides.length - 1) slides.push(...slides.splice(cta, 1));
  else if (cta < 0) slides[slides.length - 1] = { ...slides.at(-1)!, kind: "cta" };
  return { ...content, slides };
}

export function renderCarousel(
  content: CarouselContent,
  context: FormatContext,
  platform: "instagram" | "linkedin",
) {
  const c = palette(context.brand);
  const rtl = arabic(context.language);
  const total = content.slides.length;
  // A handle is a single token; otherwise show the brand's domain.
  const handle =
    content.handle && /^@?[\w.]{2,30}$/.test(content.handle.trim())
      ? content.handle.trim().replace(/^@?/, "@")
      : context.brand.website
        ? host(context.brand.website)
        : context.brand.name;
  const next = rtl ? "←" : "→";
  const slides = content.slides
    .map((s, index) => {
      const n = index + 1;
      const dark = s.kind === "hook" || s.kind === "cta";
      const fact = factById(context, s.sourceId);
      const progress = Array.from(
        { length: total },
        (_, i) => `<i class="${i === index ? "on" : ""}"></i>`,
      ).join("");
      const inner =
        s.kind === "stat" && s.stat
          ? `<p class="stat"><bdi dir="ltr">${esc(s.stat.value)}</bdi></p><h2>${esc(s.stat.label)}</h2>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}`
          : s.kind === "quote" && s.quote
            ? `<p class="mark">“</p><blockquote>${esc(s.quote.text)}</blockquote><p class="by">${esc(s.quote.by)}</p>`
            : s.kind === "list"
              ? `<h2>${esc(s.heading)}</h2><ul>${(s.bullets ?? []).map((b) => `<li><span class="tick">✓</span><span>${esc(b)}</span></li>`).join("")}</ul>`
              : s.kind === "cta"
                ? `<h2 class="big">${esc(s.heading)}</h2>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}<p class="pill">${esc(platform === "linkedin" ? (rtl ? "تابعنا للمزيد" : "Follow for more") : rtl ? "احفظ المنشور" : "Save this post")}</p>`
                : s.kind === "hook"
                  ? `<h1>${esc(s.heading)}</h1>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}`
                  : `<p class="num"><bdi dir="ltr">${String(n - 1).padStart(2, "0")}</bdi></p><h2>${esc(s.heading)}</h2>${s.body ? `<p class="body">${esc(s.body)}</p>` : ""}`;
      return `<section class="slide ${dark ? "dark" : ""} kind-${s.kind}" data-slide="${n}">
<header><span class="brand">${esc(context.brand.name)}</span>${s.kicker ? `<span class="kicker">${esc(s.kicker)}</span>` : ""}</header>
<div class="main">${inner}</div>
<footer><span class="handle"><bdi dir="ltr">${esc(handle)}</bdi></span>${fact ? `<span class="src">${sourceLine(fact, context.language)}</span>` : ""}<span class="progress">${progress}</span><span class="count"><bdi dir="ltr">${n}/${total}</bdi>${s.kind === "hook" && platform === "instagram" ? ` ${next}` : ""}</span></footer>
</section>`;
    })
    .join("\n");
  const css = `
@page{size:${SLIDE.width}px ${SLIDE.height}px;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#e9eaee}
body{font-family:${fontStack(context.language)};-webkit-font-smoothing:antialiased}
.slide{position:relative;width:${SLIDE.width}px;height:${SLIDE.height}px;overflow:hidden;display:flex;flex-direction:column;padding:88px;background:${c.paper};color:${c.ink};page-break-after:always;break-after:page}
.slide.dark{background:${c.primary};color:${c.onPrimary}}
.slide header{display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:30px;font-weight:600;letter-spacing:.01em}
.slide .brand{display:flex;align-items:center;gap:14px}
.slide .brand::before{content:"";width:22px;height:22px;border-radius:6px;background:${c.accent}}
.slide.dark .brand::before{background:${c.onPrimary};opacity:.9}
.slide .kicker{padding:10px 20px;border-radius:999px;background:${c.tint};color:${c.primary};font-size:26px}
.slide.dark .kicker{background:${c.deep};color:${c.onPrimary}}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:36px}
h1{margin:0;font-size:104px;line-height:1.02;letter-spacing:-.03em;font-weight:700}
h2{margin:0;font-size:72px;line-height:1.08;letter-spacing:-.02em;font-weight:700}
h2.big{font-size:92px}
.body{margin:0;font-size:46px;line-height:1.35;color:${c.body};max-width:880px}
.dark .body{color:${c.onPrimary};opacity:.88}
.num{margin:0;font-size:40px;font-weight:700;color:${c.accent};font-family:"Geist Mono",monospace}
.stat{margin:0;font-size:220px;line-height:.9;font-weight:700;letter-spacing:-.04em;color:${c.primary}}
.mark{margin:0;font-size:220px;line-height:.6;color:${c.accent};font-family:Georgia,serif}
blockquote{margin:0;font-size:64px;line-height:1.2;font-weight:600;letter-spacing:-.01em}
.by{margin:0;font-size:36px;color:${c.muted}}
ul{list-style:none;margin:0;padding:0;display:grid;gap:30px}
li{display:grid;grid-template-columns:64px 1fr;gap:24px;align-items:start;font-size:48px;line-height:1.3}
.tick{display:grid;place-items:center;width:64px;height:64px;border-radius:18px;background:${c.tint};color:${c.primary};font-size:36px;font-weight:700}
.pill{align-self:flex-start;margin:0;padding:22px 40px;border-radius:999px;background:${c.accent};color:${c.onAccent};font-size:40px;font-weight:700}
.slide footer{display:flex;align-items:center;gap:28px;font-size:28px;color:${c.muted}}
.dark footer{color:${c.onPrimary};opacity:.85}
.handle{font-weight:600}
.src{flex:1;font-size:24px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.progress{display:flex;gap:10px;margin-inline-start:auto}
.src+.progress{margin-inline-start:0}
.progress i{width:14px;height:14px;border-radius:7px;background:currentColor;opacity:.25}
.progress i.on{width:44px;opacity:1}
.count{font-family:"Geist Mono",monospace;font-size:26px}
@media screen{body{display:grid;gap:40px;padding:40px;justify-content:center}}
@media print{body{background:none}}
`;
  return injectFonts(`<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=${SLIDE.width}"><title>${esc(content.title)}</title><style>${css}</style></head>
<body>
${slides}
</body>
</html>`);
}

// Preview of one slide for the canvas: hides the others and removes the gallery padding.
export function oneSlide(html: string, n: number) {
  return html.replace(
    /<\/style>/i,
    `.slide{display:none!important}.slide[data-slide="${n}"]{display:flex!important}@media screen{body{display:block;padding:0;gap:0;background:#fff}}</style>`,
  );
}

export const slideCount = (html: string) =>
  (html.match(/<section class="slide\b/g) ?? []).length;
