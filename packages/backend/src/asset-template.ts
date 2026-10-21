import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  parse,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5";
import type { Brand, Evidence, ProspectSnapshot } from "@revenue/contracts";
import {
  brandRenderHero,
  brandRenderLogo,
  type BrandRenderMedia,
} from "./brand-media.js";
import { normalizeAssetBidi } from "./asset-bidi.js";
import { escapeHtml } from "./policy.js";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlChild = DefaultTreeAdapterMap["childNode"];
type HtmlParent = DefaultTreeAdapterMap["parentNode"];
type HtmlText = Extract<HtmlNode, { nodeName: "#text" }>;
const isElement = (node: HtmlNode): node is HtmlElement => "tagName" in node;
const attribute = (node: HtmlElement, name: string) =>
  node.attrs.find((item) => item.name === name)?.value;
const classes = (node: HtmlElement) =>
  (attribute(node, "class") ?? "").split(/\s+/).filter(Boolean);
const hasClass = (node: HtmlElement, name: string) => classes(node).includes(name);
function htmlElement(tagName: string, attrs: [string, string][]): HtmlElement {
  return {
    nodeName: tagName,
    tagName,
    namespaceURI: "http://www.w3.org/1999/xhtml" as HtmlElement["namespaceURI"],
    attrs: attrs.map(([name, value]) => ({ name, value })),
    childNodes: [],
    parentNode: null,
  };
}

function htmlText(value: string, parentNode: HtmlParent): HtmlText {
  return { nodeName: "#text", value, parentNode };
}

function append(parent: HtmlElement, child: HtmlChild) {
  child.parentNode = parent;
  parent.childNodes.push(child);
}

function walk(root: HtmlNode, visit: (element: HtmlElement) => void) {
  if (isElement(root)) visit(root);
  if ("childNodes" in root)
    root.childNodes.forEach((child) => walk(child, visit));
}

function firstElement(root: HtmlNode, predicate: (element: HtmlElement) => boolean) {
  let found: HtmlElement | undefined;
  walk(root, (element) => {
    if (!found && predicate(element)) found = element;
  });
  return found;
}

function imageNode(image: NonNullable<ReturnType<typeof brandRenderLogo>>) {
  return htmlElement("img", [
    ["src", image.dataUri],
    ["alt", image.alt],
    ["class", "brand-kit-logo"],
    ["data-brand-render-media", "1"],
  ]);
}

function figureNode(
  image: NonNullable<ReturnType<typeof brandRenderHero>>,
  language: string,
) {
  const figure = htmlElement("figure", [
    ["class", "brand-kit-visual"],
    ["data-brand-render-media", "1"],
  ]);
  append(figure, imageNodeForPhoto(image));
  const caption = htmlElement("figcaption", []);
  append(
    caption,
    htmlText(
      language === "en"
        ? "Illustrative brand imagery"
        : "صور توضيحية للعلامة",
      caption,
    ),
  );
  append(figure, caption);
  return figure;
}

function imageNodeForPhoto(image: NonNullable<ReturnType<typeof brandRenderHero>>) {
  return htmlElement("img", [
    ["src", image.dataUri],
    ["alt", image.alt],
    ["data-brand-render-media", "1"],
  ]);
}

function documentElement(document: HtmlNode, tag: string) {
  return firstElement(document, (element) => element.tagName === tag);
}

// Saved brand pixels are removed before a model is given an older artifact to revise.
export function stripBrandRenderMedia(html: string) {
  const document = parse(html);
  const strip = (node: HtmlNode) => {
    if (!("childNodes" in node)) return;
    node.childNodes = node.childNodes.filter(
      (child) =>
        !isElement(child) ||
        (attribute(child, "data-brand-render-media") !== "1" &&
          !(child.tagName === "style" &&
            attribute(child, "data-brand-media-css") === "1")),
    );
    node.childNodes.forEach(strip);
  };
  strip(document);
  return serialize(document);
}

export function embedBrandMediaInAssetHtml(
  html: string,
  media: BrandRenderMedia,
  language: string,
) {
  const logo = brandRenderLogo(media);
  const hero = brandRenderHero(media);
  if (!logo && !hero) return html;

  const document = parse(stripBrandRenderMedia(html));
  const root = documentElement(document, "html");
  const head = documentElement(document, "head");
  const body = documentElement(document, "body");
  if (!root || !head || !body) return html;

  const style = htmlElement("style", [["data-brand-media-css", "1"]]);
  append(
    style,
    htmlText(
      `.brand-kit-logo{display:inline-block;width:auto;max-width:180px;height:42px;padding:5px 8px;border-radius:8px;background:#fff;object-fit:contain;vertical-align:middle}.brand-kit-visual{position:relative;width:100%;height:170px;max-height:23vh;margin:16px 0;overflow:hidden;border-radius:10px;background:#f3f4f5}.brand-kit-visual img{display:block;width:100%;height:100%;object-fit:cover}.brand-kit-visual figcaption{position:absolute;inset-inline-start:10px;bottom:8px;padding:4px 8px;border-radius:99px;background:rgba(8,12,16,.72);color:#fff;font:500 10px/1.4 Arial,sans-serif}@media(max-width:520px){.brand-kit-visual{height:130px}}`,
      style,
    ),
  );
  append(head, style);

  if (logo) {
    const brand = firstElement(document, (element) => hasClass(element, "brand"));
    if (brand) {
      const placeholder = brand.childNodes.findIndex(
        (child) => isElement(child) && child.tagName === "i",
      );
      if (placeholder >= 0) brand.childNodes.splice(placeholder, 1);
      const image = imageNode(logo);
      image.parentNode = brand;
      brand.childNodes.unshift(image);
    } else {
      const header = firstElement(document, (element) => element.tagName === "header");
      const image = imageNode(logo);
      image.parentNode = header ?? body;
      (header ?? body).childNodes.unshift(image);
    }
  }

  if (hero) {
    const figure = figureNode(hero, language);
    const heroContainer = firstElement(document, (element) => hasClass(element, "hero"));
    if (heroContainer) {
      const heading = heroContainer.childNodes.findIndex(
        (child) => isElement(child) && child.tagName === "h1",
      );
      figure.parentNode = heroContainer;
      heroContainer.childNodes.splice(heading < 0 ? 0 : heading, 0, figure);
    } else {
      const heading = firstElement(document, (element) => element.tagName === "h1");
      const parent = heading?.parentNode && "childNodes" in heading.parentNode
        ? heading.parentNode
        : body;
      const at = heading ? parent.childNodes.indexOf(heading) + 1 : 0;
      figure.parentNode = parent;
      parent.childNodes.splice(at, 0, figure);
    }
  }

  return normalizeAssetBidi(serialize(document), language);
}

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
export function fonts() {
  if (fontCss !== undefined) return fontCss;
  const faces = [
    [
      "Inter",
      "@fontsource-variable/inter",
      "inter-latin-wght-normal.woff2",
      "100 900",
    ],
    [
      "Geist Mono",
      "@fontsource-variable/geist-mono",
      "geist-mono-latin-wght-normal.woff2",
      "100 900",
    ],
    [
      "IBM Plex Sans Arabic",
      "@fontsource/ibm-plex-sans-arabic",
      "ibm-plex-sans-arabic-arabic-400-normal.woff2",
      "400",
    ],
    [
      "IBM Plex Sans Arabic",
      "@fontsource/ibm-plex-sans-arabic",
      "ibm-plex-sans-arabic-arabic-600-normal.woff2",
      "600",
    ],
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

// The model never sees the base64 fonts (they would cost tokens and cannot be reproduced);
// they are stripped from its input and put back into its output.
export const stripFonts = (html: string) =>
  html.replace(/\/\*fonts\*\/[\s\S]*?\/\*\/fonts\*\//, "");
export const injectFonts = (html: string) =>
  html.replace(/<style>/i, `<style>/*fonts*/${fonts()}/*/fonts*/`);

export const hex = (value: string | undefined, fallback: string) =>
  value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

// Picks readable text for the brand band (WCAG relative luminance).
export function onColor(color: string) {
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
  const facts = evidence.filter(
    (item) => item.approved && item.kind === "fact",
  );
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
  const css = `/*fonts*/${fonts()}/*/fonts*/
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
  return normalizeAssetBidi(
    `<!doctype html><html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body><article class="sheet"><div class="top"><span class="brand"><i></i><span dir="auto">${escapeHtml(brand.name || "Caravan")}</span></span><p class="eyebrow">${L("Prepared for your team", "مُعد خصيصًا لفريقك")} · <bdi>${date}</bdi></p></div><header class="hero"><p class="eyebrow">${audit ? L("Website review", "مراجعة الموقع") : L("One-page idea", "فكرة في صفحة")}</p><h1>${title}</h1><h2 dir="auto">${escapeHtml(snapshot.company)}</h2></header>${simulated ? `<p class="label">${L("Synthetic demonstration data · template generation is simulated", "بيانات تجريبية مصطنعة · ليست توصية تجارية حقيقية")}</p>` : ""}<p class="lede">${L("These observations come from the reviewed sources below. Review this document before sharing it.", "الملاحظات دي مبنية على المصادر اللي راجعناها سوا ومحتاجة مراجعتك قبل المشاركة")}</p><div class="facts"><div class="fact"><p class="eyebrow">${L("Observations", "ملاحظات")}</p><b>${facts.length}</b></div><div class="fact"><p class="eyebrow">${L("Sources", "مصادر")}</p><b>${hosts.size}</b></div><div class="fact"><p class="eyebrow">${L("Reviewed", "تمت مراجعتها")}</p><b>100%</b></div></div><ol class="obs-list">${rows}</ol>${offerSection}<footer><span><span dir="auto">${escapeHtml(brand.name)}</span> · <bdi>${escapeHtml(brand.website)}</bdi></span><span>${L("Sources and dates accompany each observation", "المصدر والتاريخ موضحين تحت كل ملاحظة")}</span></footer></article></body></html>`,
    language,
  );
}
