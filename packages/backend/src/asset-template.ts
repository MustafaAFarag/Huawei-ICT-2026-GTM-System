import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Brand, Evidence, ProspectSnapshot } from "@revenue/contracts";
import { escapeHtml } from "./policy.js";

// Print tokens follow design-systems/revenue/DESIGN.md §8. Fonts are embedded because
// previews are sandboxed and PDF rendering blocks every network request.
const require = createRequire(import.meta.url);
function font(pkg: string, file: string) {
  try {
    const path = require.resolve(`${pkg}/files/${file}`);
    return `data:font/woff2;base64,${readFileSync(path).toString("base64")}`;
  } catch {
    return null;
  }
}
let fontCss: string | undefined;
function fonts() {
  if (fontCss !== undefined) return fontCss;
  const faces = [
    ["Inter", "@fontsource-variable/inter", "inter-latin-wght-normal.woff2", "100 900"],
    ["Geist Mono", "@fontsource-variable/geist-mono", "geist-mono-latin-wght-normal.woff2", "100 900"],
    ["IBM Plex Sans Arabic", "@fontsource/ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-400-normal.woff2", "400"],
    ["IBM Plex Sans Arabic", "@fontsource/ibm-plex-sans-arabic", "ibm-plex-sans-arabic-arabic-600-normal.woff2", "600"],
  ] as const;
  fontCss = faces
    .map(([family, pkg, file, weight]) => {
      const src = font(pkg, file);
      return src
        ? `@font-face{font-family:"${family}";src:url(${src}) format("woff2");font-weight:${weight};font-display:block}`
        : "";
    })
    .join("");
  return fontCss;
}

const hex = (value: string | undefined, fallback: string) =>
  value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

// Picks readable text for the brand band (WCAG relative luminance).
function onColor(color: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.4 ? "#0b0c0e" : "#ffffff";
}

export function assetHtml(
  brand: Brand,
  snapshot: ProspectSnapshot,
  evidence: Evidence[],
  template: string,
  language: string,
  simulated: boolean,
  offer?: string,
) {
  const arabic = language !== "en";
  if (template === "offer-one-pager" && !offer)
    throw new Error(
      "Approve an offer in company context before generating its one-pager.",
    );
  const L = (en: string, ar: string) => (arabic ? ar : en);
  const color = hex(brand.primary, "#111214");
  const accent = hex(brand.accent, "#e5484d");
  const ink = onColor(color);
  const audit = template === "mini-audit";
  const title = audit
    ? L("A short website review", "مراجعة سريعة لموقعك")
    : L("An idea for your next stage", "فكرة تساعد فريقك ينمو");
  const facts = evidence.filter((item) => item.approved && item.kind === "fact");
  const hosts = new Set(
    facts.map((item) => {
      try {
        return new URL(item.url).hostname;
      } catch {
        return item.url;
      }
    }),
  );
  const rows = facts
    .map((item, index) => {
      let host = item.url;
      try {
        host = new URL(item.url).hostname;
      } catch {}
      return `<li class="obs"><span class="num">${String(index + 1).padStart(2, "0")}</span><div><p dir="auto">${escapeHtml(item.claim)}</p><a dir="ltr" href="${escapeHtml(item.url)}">${escapeHtml(host)} · ${escapeHtml(item.date.slice(0, 10))}</a></div></li>`;
    })
    .join("");
  const offerSection = audit
    ? `<section class="offer"><p class="eyebrow">${L("NEXT STEP", "الخطوة التالية")}</p><h3>${L("Choose two priorities", "اختاروا أولويتين")}</h3><p>${L("Review these observations and sources, then choose priorities before making changes.", "راجعوا الملاحظات والمصادر وحددوا الأولويات قبل إجراء أي تغيير.")}</p></section>`
    : `<section class="offer"><p class="eyebrow">${L("THE PROPOSED OFFER", "العرض المقترح")}</p><p class="offer-text" dir="auto">${escapeHtml(offer ?? "")}</p><p>${L("Let’s discuss whether this offer fits your team.", "نناقش مع بعض إذا كان العرض مناسبًا لفريقكم.")}</p></section>`;
  const date = new Date().toISOString().slice(0, 10);
  const css = `${fonts()}
@page{size:A4;margin:14mm 16mm}
*{box-sizing:border-box}
:root{--paper:#fff;--ink:#0b0c0e;--body:#2a2b2e;--meta:#6b6c70;--rule:#e4e4e7;--wash:#f6f6f7;--brand:${color};--brand-accent:${accent};--on-brand:${ink}}
html{background:var(--paper)}
body{margin:0;color:var(--body);font:10.5pt/1.6 "Inter","IBM Plex Sans Arabic","Noto Sans Arabic",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html[dir=rtl] body{font-family:"IBM Plex Sans Arabic","Inter","Noto Sans Arabic",Arial,sans-serif;line-height:1.85}
.sheet{max-width:780px;margin:auto;padding:32px 36px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--rule)}
.brand{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:600;font-size:11pt}
.brand i{display:block;width:14px;height:14px;border-radius:4px;background:var(--brand)}
.eyebrow{margin:0;color:var(--meta);font:500 7.5pt/1.3 "Geist Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}
html[dir=rtl] .eyebrow{letter-spacing:0;font-family:"IBM Plex Sans Arabic",sans-serif;font-size:8.5pt}
.hero{margin:28px 0 22px;padding:24px 26px;border-radius:10px;background:var(--brand);color:var(--on-brand)}
.hero .eyebrow{color:var(--on-brand);opacity:.72}
h1{margin:10px 0 4px;color:var(--on-brand);font-size:24pt;font-weight:600;line-height:1.2;letter-spacing:-.01em}
html[dir=rtl] h1{letter-spacing:0;line-height:1.5}
h2{margin:0;color:var(--on-brand);opacity:.88;font-size:13pt;font-weight:500}
h3{margin:4px 0 6px;color:var(--ink);font-size:12pt;font-weight:600}
.lede{margin:0 0 18px;color:var(--body)}
.label{display:inline-block;margin:0 0 14px;padding:3px 8px;border-radius:4px;background:#fff4e5;color:#8a4c00;font:500 7.5pt/1.4 "Geist Mono",ui-monospace,monospace}
html[dir=rtl] .label{font-family:"IBM Plex Sans Arabic",sans-serif;font-size:8.5pt}
.facts{display:flex;gap:10px;margin:0 0 18px}
.fact{flex:1;padding:10px 12px;border:1px solid var(--rule);border-radius:8px}
.fact b{display:block;color:var(--ink);font:500 16pt/1.1 "Geist Mono",ui-monospace,monospace}
.obs-list{margin:0;padding:0;list-style:none;border-top:1px solid var(--rule)}
.obs{display:grid;grid-template-columns:30px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule);break-inside:avoid}
.num{color:var(--brand-accent);font:500 8.5pt/1.9 "Geist Mono",ui-monospace,monospace}
.obs p{margin:0 0 3px;color:var(--ink)}
a{color:var(--meta);font:400 7.5pt/1.4 "Geist Mono",ui-monospace,monospace;text-decoration:none;word-break:break-all}
.offer{margin-top:20px;padding:16px 18px;border-radius:8px;background:var(--wash);border-inline-start:3px solid var(--brand-accent);break-inside:avoid}
.offer p{margin:0 0 6px}
.offer-text{color:var(--ink);font-size:11.5pt;font-weight:500}
footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:26px;padding-top:12px;border-top:1px solid var(--rule);color:var(--meta);font:400 7.5pt/1.5 "Geist Mono",ui-monospace,monospace}
html[dir=rtl] footer{font-family:"IBM Plex Sans Arabic",sans-serif;font-size:8pt}
bdi{unicode-bidi:isolate}
@media print{.sheet{padding:0}}`;
  return `<!doctype html><html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body><article class="sheet"><div class="top"><span class="brand"><i></i><span dir="auto">${escapeHtml(brand.name || "Revenue Workspace")}</span></span><p class="eyebrow">${L("Prepared for your team", "مُعد خصيصًا لفريقك")} · <bdi>${date}</bdi></p></div><header class="hero"><p class="eyebrow">${audit ? L("Website review", "مراجعة الموقع") : L("One-page idea", "فكرة في صفحة")}</p><h1>${title}</h1><h2 dir="auto">${escapeHtml(snapshot.company)}</h2></header>${simulated ? `<p class="label">${L("Synthetic demonstration data · template generation is simulated", "بيانات تجريبية مصطنعة · ليست توصية تجارية حقيقية")}</p>` : ""}<p class="lede">${L("These observations come from the reviewed sources below. Review this document before sharing it.", "الملاحظات دي مبنية على المصادر اللي راجعناها سوا ومحتاجة مراجعتك قبل المشاركة")}</p><div class="facts"><div class="fact"><p class="eyebrow">${L("Observations", "ملاحظات")}</p><b>${facts.length}</b></div><div class="fact"><p class="eyebrow">${L("Sources", "مصادر")}</p><b>${hosts.size}</b></div><div class="fact"><p class="eyebrow">${L("Reviewed", "تمت مراجعتها")}</p><b>100%</b></div></div><ol class="obs-list">${rows}</ol>${offerSection}<footer><span><span dir="auto">${escapeHtml(brand.name)}</span> · <bdi>${escapeHtml(brand.website)}</bdi></span><span>${L("Sources and dates accompany each observation", "المصدر والتاريخ موضحين تحت كل ملاحظة")}</span></footer></article></body></html>`;
}
