import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { z } from "zod";
import { injectFonts } from "../asset-template.js";
import {
  arabic,
  esc,
  factById,
  fontStack,
  palette,
  safeUrl,
  sourceLine,
  type FormatContext,
} from "./shared.js";

// Flipbook: the model returns page content JSON only (no HTML or script). This trusted
// template renders A4 pages and, for the interactive view, adds StPageFlip (page-flip
// 2.0.7, MIT) — a book with page turns on laptops, sideways swipe pages on phones.
// Pattern follows the owner's FlipBook.html reference.

const page = z.object({
  kind: z.enum(["cover", "editorial", "stats", "steps", "list", "quote", "cta"]),
  kicker: z.string().max(40).optional(),
  heading: z.string().min(2).max(110),
  body: z.string().max(1100).optional(),
  items: z
    .array(z.object({ title: z.string().max(80), text: z.string().max(260) }))
    .max(4)
    .optional(),
  stats: z
    .array(
      z.object({
        value: z.string().max(12),
        label: z.string().max(90),
        sourceId: z.string().optional(),
      }),
    )
    .max(3)
    .optional(),
  quote: z.object({ text: z.string().max(260), by: z.string().max(80) }).optional(),
  cta: z.object({ label: z.string().max(40), url: z.string().optional() }).optional(),
  sourceId: z.string().optional(),
});
export const flipbookContent = z.object({
  title: z.string().min(2).max(100),
  subtitle: z.string().max(180).optional(),
  pages: z.array(page).min(4).max(12),
});
export type FlipbookContent = z.infer<typeof flipbookContent>;

const require = createRequire(import.meta.url);
let pageFlipSource: string | undefined;
function pageFlip() {
  pageFlipSource ??= readFileSync(
    require.resolve("page-flip/dist/js/page-flip.browser.js"),
    "utf8",
  ).replace(/<\/script/gi, "<\\/script");
  return pageFlipSource;
}

const paragraphs = (text = "") =>
  text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${esc(p.trim())}</p>`)
    .join("");

export function flipbookPages(content: FlipbookContent, context: FormatContext) {
  const rtl = arabic(context.language);
  const pages = content.pages[0]?.kind === "cover"
    ? content.pages
    : [{ kind: "cover" as const, heading: content.title, body: content.subtitle }, ...content.pages];
  const rendered = pages.map((p, index) => {
    const fact = factById(context, p.sourceId);
    const source = fact
      ? `<p class="source"><a href="${esc(fact.url)}">${sourceLine(fact, context.language)}</a></p>`
      : "";
    const folio = `<footer class="folio"><span>${esc(context.brand.name)}</span><bdi dir="ltr">${index + 1}</bdi></footer>`;
    if (p.kind === "cover")
      return `<div class="page cover"><div class="pg"><p class="brand">${esc(context.brand.name)}</p><div class="cover-body">${p.kicker ? `<p class="kicker">${esc(p.kicker)}</p>` : ""}<h1>${esc(p.heading || content.title)}</h1>${p.body || content.subtitle ? `<p class="lede">${esc(p.body ?? content.subtitle ?? "")}</p>` : ""}</div><p class="meta">${context.snapshot ? `${rtl ? "مُعد لـ" : "Prepared for"} <bdi>${esc(context.snapshot.company)}</bdi> · ` : ""}<bdi dir="ltr">${esc(context.date)}</bdi></p></div></div>`;
    const head = `${p.kicker ? `<p class="kicker">${esc(p.kicker)}</p>` : ""}<h2>${esc(p.heading)}</h2>`;
    let body = "";
    if (p.kind === "stats")
      body = `${paragraphs(p.body)}<div class="stats">${(p.stats ?? [])
        .map((s) => {
          const f = factById(context, s.sourceId);
          return `<div class="stat"><b><bdi dir="ltr">${esc(s.value)}</bdi></b><span>${esc(s.label)}</span>${f ? `<a class="src" href="${esc(f.url)}">${sourceLine(f, context.language)}</a>` : ""}</div>`;
        })
        .join("")}</div>`;
    else if (p.kind === "steps" || p.kind === "list")
      body = `${paragraphs(p.body)}<ol class="${p.kind}">${(p.items ?? [])
        .map(
          (item, i) =>
            `<li>${p.kind === "steps" ? `<span class="n"><bdi dir="ltr">${String(i + 1).padStart(2, "0")}</bdi></span>` : `<span class="dot"></span>`}<div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></li>`,
        )
        .join("")}</ol>`;
    else if (p.kind === "quote" && p.quote)
      body = `<blockquote>${esc(p.quote.text)}</blockquote><p class="by">${esc(p.quote.by)}</p>${paragraphs(p.body)}`;
    else if (p.kind === "cta")
      body = `${paragraphs(p.body)}${p.cta ? `<a class="button" href="${esc(safeUrl(p.cta.url, context))}">${esc(p.cta.label)}</a>` : ""}<p class="site"><bdi dir="ltr">${esc(context.brand.website.replace(/^https?:\/\//, ""))}</bdi></p>`;
    else body = `<div class="prose">${paragraphs(p.body)}</div>`;
    return `<div class="page ${p.kind === "cta" || p.kind === "quote" ? "deep" : ""} kind-${p.kind}"><div class="pg">${head}${body}${source}${folio}</div></div>`;
  });
  return rendered;
}

function css(context: FormatContext) {
  const c = palette(context.brand);
  return `
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font-family:${fontStack(context.language)};color:${c.ink};-webkit-font-smoothing:antialiased}
.page{position:relative;background:${c.paper};overflow:hidden;container-type:inline-size}
.page .pg{position:absolute;inset:0;display:flex;flex-direction:column;gap:3cqw;padding:9cqw 9cqw 12cqw;font-size:2.15cqw;line-height:1.55;color:${c.body}}
.page.cover .pg,.page.deep .pg{color:${c.onPrimary}}
.page.cover,.page.deep{background:${c.primary}}
.brand{margin:0;font-weight:700;font-size:2.4cqw;letter-spacing:.02em}
.cover-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:3cqw}
h1{margin:0;font-size:8.6cqw;line-height:1.02;letter-spacing:-.03em;color:inherit}
h2{margin:0;font-size:5.6cqw;line-height:1.08;letter-spacing:-.02em;color:${c.ink}}
.deep h2{color:${c.onPrimary}}
h3{margin:0 0 .6cqw;font-size:2.6cqw;color:${c.ink}}
p{margin:0}
.prose{display:grid;gap:2cqw;max-width:62ch}
.lede{font-size:3cqw;line-height:1.4;opacity:.9}
.kicker{margin:0;color:${c.accent};font-weight:700;font-size:1.8cqw;letter-spacing:.14em;text-transform:uppercase}
.cover .kicker,.deep .kicker{color:${c.onPrimary};opacity:.8}
.meta{font-size:1.9cqw;opacity:.8}
.stats{display:grid;gap:2.4cqw;margin-top:2cqw}
.stat{display:grid;gap:.6cqw;padding-block:2.4cqw;border-top:1px solid ${c.line}}
.stat b{font-size:9cqw;line-height:1;color:${c.primary};letter-spacing:-.03em}
.src,.source,.source a{font-size:1.6cqw;color:${c.muted};text-decoration:none}
.deep .source,.deep .source a{color:${c.onPrimary};opacity:.75}
ol{list-style:none;margin:1cqw 0 0;padding:0;display:grid;gap:3cqw}
ol li{display:grid;grid-template-columns:7cqw 1fr;gap:2.4cqw;align-items:start}
.n{font-family:"Geist Mono",monospace;font-weight:700;font-size:2.6cqw;color:${c.accent}}
.dot{width:2cqw;height:2cqw;margin-top:.8cqw;border-radius:50%;background:${c.accent}}
blockquote{margin:2cqw 0 0;font-size:4.6cqw;line-height:1.25;font-weight:600;color:${c.onPrimary}}
.by{opacity:.8}
.button{align-self:flex-start;margin-top:2cqw;padding:2cqw 4cqw;border-radius:99cqw;background:${c.accent};color:${c.onAccent};font-weight:700;text-decoration:none}
.site{opacity:.8}
.folio{position:absolute;inset-inline:9cqw;bottom:5cqw;display:flex;justify-content:space-between;font-size:1.6cqw;color:${c.muted}}
.cover .folio,.deep .folio{color:${c.onPrimary};opacity:.6}
`;
}

// Static pages, one A4 sheet each: the PDF export and the print view.
export function renderFlipbookPrint(content: FlipbookContent, context: FormatContext) {
  const rtl = arabic(context.language);
  return injectFonts(`<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(content.title)}</title>
<style>${css(context)}
@page{size:A4;margin:0}
body{background:#fff}
.page{width:210mm;height:297mm;page-break-after:always;break-after:page}
</style></head><body>${flipbookPages(content, context).join("")}</body></html>`);
}

// Interactive book: a self-contained HTML file with the page-flip runtime inlined.
export function renderFlipbook(content: FlipbookContent, context: FormatContext) {
  const rtl = arabic(context.language);
  const c = palette(context.brand);
  const pages = flipbookPages(content, context);
  return injectFonts(`<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(content.title)}</title>
<style>${css(context)}
html,body{background:${c.deep};overflow:hidden}
.app{height:100%;display:grid;grid-template-rows:minmax(0,1fr) auto}
.stage{position:relative;display:grid;place-items:center;padding:3vh 4vw;min-height:0}
#book{width:min(100%,calc((100vh - 120px) * 1.414));max-height:100%}
#book.swipe{width:100%;height:100%;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0}
#book.swipe .page{flex:0 0 100%;height:100%;scroll-snap-align:center;aspect-ratio:auto}
.bar{display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 16px 18px;color:#fff;font:500 14px/1 ${fontStack(context.language)}}
.bar button{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:18px;cursor:pointer}
.bar button:disabled{opacity:.3}
.bar .count{min-width:72px;text-align:center;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head>
<body><div class="app"><div class="stage"><div id="book">${pages.join("")}</div></div>
<nav class="bar" aria-label="${rtl ? "الصفحات" : "Pages"}"><button type="button" id="prev" aria-label="${rtl ? "الصفحة السابقة" : "Previous page"}">${rtl ? "→" : "←"}</button><span class="count" id="count" dir="ltr">1 / ${pages.length}</span><button type="button" id="next" aria-label="${rtl ? "الصفحة التالية" : "Next page"}">${rtl ? "←" : "→"}</button></nav></div>
<script>${pageFlip()}</script>
<script>
(function(){
  var book=document.getElementById("book"),count=document.getElementById("count"),prev=document.getElementById("prev"),next=document.getElementById("next");
  var pages=[].slice.call(book.querySelectorAll(".page")),total=pages.length,flip=null,rtl=document.documentElement.dir==="rtl";
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var swipe=innerWidth<700||!window.St;
  function current(){return swipe?Math.round(Math.abs(book.scrollLeft)/Math.max(1,book.clientWidth)):flip.getCurrentPageIndex();}
  function paint(){var i=current();count.textContent=(i+1)+" / "+total;prev.disabled=i<=0;next.disabled=i>=total-1;}
  function step(d){
    if(swipe){book.scrollBy({left:(rtl?-d:d)*book.clientWidth,behavior:reduce?"auto":"smooth"});return;}
    d>0?(reduce?flip.turnToNextPage():flip.flipNext()):(reduce?flip.turnToPrevPage():flip.flipPrev());
  }
  if(swipe){book.className="swipe";book.addEventListener("scroll",function(){requestAnimationFrame(paint);},{passive:true});}
  else{
    flip=new St.PageFlip(book,{width:595,height:842,size:"stretch",minWidth:260,maxWidth:1100,minHeight:360,maxHeight:1600,showCover:true,usePortrait:true,mobileScrollSupport:false,maxShadowOpacity:.35,flippingTime:reduce?1:700,showPageCorners:false,disableFlipByClick:false});
    flip.loadFromHTML(pages);
    for(var i=0;i<flip.getPageCount();i++){var pg=flip.getPage(i);pg.setDensity("soft");pg.setDrawingDensity("soft");}
    flip.on("flip",paint);
  }
  prev.addEventListener("click",function(){step(-1);});
  next.addEventListener("click",function(){step(1);});
  document.addEventListener("keydown",function(e){
    if(e.key==="ArrowRight")step(rtl?-1:1);
    if(e.key==="ArrowLeft")step(rtl?1:-1);
  });
  paint();
})();
</script></body></html>`);
}

export const flipbookPageCount = (html: string) =>
  (html.match(/<div class="page\b/g) ?? []).length;
