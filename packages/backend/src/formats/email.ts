import { z } from "zod";
import {
  arabic,
  esc,
  factById,
  palette,
  safeUrl,
  sourceLine,
  type FormatContext,
} from "./shared.js";

// HTML email for two clients. Both are 600px table layouts with inline styles, a hidden
// preheader and a bulletproof button. Gmail: hosted images only, no data URIs, a small
// head <style> for mobile, under 102 KB. Outlook (Word engine): Arial-safe stack, MSO
// conditional wrappers, solid colours, numeric widths, radius clamped to half the height.
// Rules: ~/claude-shared/skills/gmail-safe-email and outlook-safe-email.

export const emailContent = z.object({
  subject: z.string().min(3).max(90),
  preheader: z.string().min(3).max(140),
  heading: z.string().min(3).max(110),
  intro: z.string().min(3).max(700),
  // Numbered "get started" steps right under the intro (reallygoodemails pattern).
  steps: z.array(z.string().max(120)).max(5).optional(),
  sections: z
    .array(
      z.object({
        heading: z.string().max(90).optional(),
        body: z.string().max(900),
        bullets: z.array(z.string().max(160)).max(4).optional(),
        sourceId: z.string().optional(),
      }),
    )
    .max(3)
    .default([]),
  // A tinted band of up to three cards: one idea each.
  highlights: z
    .object({
      heading: z.string().max(90),
      items: z
        .array(z.object({ title: z.string().max(70), text: z.string().max(240), sourceId: z.string().optional() }))
        .min(2)
        .max(3),
    })
    .optional(),
  // Two side-by-side cards with a secondary link each (resources, next reads).
  resources: z
    .object({
      heading: z.string().max(90),
      items: z
        .array(
          z.object({
            title: z.string().max(60),
            text: z.string().max(160),
            label: z.string().max(32),
            url: z.string().optional(),
          }),
        )
        .length(2),
    })
    .optional(),
  cta: z.object({ label: z.string().min(2).max(32), url: z.string().optional() }),
  signoff: z.object({ name: z.string().max(80), title: z.string().max(80).optional() }),
});
export type EmailContent = z.infer<typeof emailContent>;

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export function renderEmail(
  content: EmailContent,
  context: FormatContext,
  client: "gmail" | "outlook",
) {
  const c = palette(context.brand);
  const rtl = arabic(context.language);
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const outlook = client === "outlook";
  // Outlook resolves only system fonts; Gmail can use a richer stack before falling back.
  const font = rtl
    ? "Tahoma,Arial,Helvetica,sans-serif"
    : outlook
      ? "Arial,Helvetica,sans-serif"
      : "Helvetica,Arial,sans-serif";
  const text = (size: number, color: string, extra = "") =>
    `font-family:${font};font-size:${size}px;line-height:1.6;color:${color};margin:0;${extra}`;
  // Word grows links on forward unless their line box is fixed (outlook-safe-email #1).
  const link = (color: string) =>
    `color:${color};text-decoration:underline;${outlook ? "white-space:nowrap;mso-line-height-rule:exactly;line-height:18px;" : ""}`;
  const band = c.tint;
  const footerBg = c.deep;
  const onFooter = "#ffffff";
  const footerMuted = "#c9ccd1"; // light grey, readable on deep brand footers
  const logo =
    context.brand.logo && /^https:\/\//.test(context.brand.logo)
      ? `<img src="${esc(context.brand.logo)}" width="120" height="32" alt="${esc(context.brand.name)}" style="display:block;border:0;outline:none;text-decoration:none;height:32px;width:auto;max-width:120px;">`
      : `<span style="${text(18, c.ink, "font-weight:700;letter-spacing:-0.01em;")}"><span style="color:${c.accent};">&#9632;</span>&nbsp;${esc(context.brand.name)}</span>`;
  const wrap = (width: number): [string, string] =>
    outlook
      ? [
          `<!--[if mso]><table role="presentation" width="${width}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`,
          `<!--[if mso]></td></tr></table><![endif]-->`,
        ]
      : ["", ""];
  const [wrapOpen, wrapClose] = wrap(536);
  const row = (inner: string, padding = "24px 32px 0", bg?: string) =>
    `<tr><td class="pad" style="padding:${padding};${bg ? `background:${bg};` : ""}"${bg ? ` bgcolor="${bg}"` : ""} align="${align}" dir="${dir}">${wrapOpen}${inner}${wrapClose}</td></tr>`;
  const source = (id?: string) => {
    const fact = factById(context, id);
    return fact
      ? `<p style="${text(12, c.muted, "margin:6px 0 0;")}"><a href="${esc(fact.url)}" style="${link(c.muted)}">${sourceLine(fact, context.language)}</a></p>`
      : "";
  };
  // Button sized to its label; 13 + 20 + 13 = 46px tall, radius 6px.
  const button = (label: string, href: string, width: number) =>
    `<table role="presentation" width="${width}" align="${outlook ? "center" : align}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;"><tr>
<td align="center" height="46" bgcolor="${c.ink}" style="background-color:${c.ink};border-radius:6px;height:46px;mso-line-height-rule:exactly;line-height:1px;font-size:1px;">
<a href="${esc(href)}" target="_blank" style="display:block;height:20px;padding:13px 0;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;mso-line-height-rule:exactly;line-height:20px;white-space:nowrap;text-align:center;">${esc(label)}</a>
</td></tr></table>`;
  const ctaWidth = Math.min(320, Math.max(160, content.cta.label.length * 9 + 56));

  const steps = content.steps?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin:16px 0 0;">${content.steps
        .map(
          (step, i) =>
            `<tr><td width="28" valign="top" style="${text(15, c.ink, "font-weight:700;padding:0 0 8px;")}">${i + 1}.</td><td valign="top" style="${text(15, c.body, "padding:0 0 8px;")}">${esc(step)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const sections = content.sections
    .map((section) => {
      const bullets = (section.bullets ?? [])
        .map(
          (b) =>
            `<tr><td width="18" valign="top" style="${text(15, c.accent, "font-weight:700;")}">&#8226;</td><td valign="top" style="${text(15, c.body)}">${esc(b)}</td></tr>`,
        )
        .join("");
      return row(
        `${section.heading ? `<p style="${text(19, c.ink, "font-weight:700;line-height:1.35;margin:0 0 8px;")}">${esc(section.heading)}</p>` : ""}${paragraphs(section.body)
          .map((p) => `<p style="${text(15, c.body, "margin:0 0 12px;")}">${esc(p)}</p>`)
          .join("")}${bullets ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin:0 0 8px;">${bullets}</table>` : ""}${source(section.sourceId)}`,
        "28px 32px 0",
      );
    })
    .join("");
  // Highlight cards on a tinted band: number tile + title + text (no icons: Gmail strips SVG).
  const highlights = content.highlights
    ? row(
        `<p style="${text(22, c.ink, "font-weight:700;line-height:1.3;margin:0 0 16px;")}">${esc(content.highlights.heading)}</p>${content.highlights.items
          .map(
            (item, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin:0 0 12px;"><tr>
<td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${c.line};border-radius:8px;padding:18px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>
<td width="40" valign="top" style="padding-${rtl ? "left" : "right"}:14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" height="32" align="center" valign="middle" bgcolor="${c.tint}" style="width:32px;height:32px;background:${c.tint};border-radius:8px;${text(14, c.primary, "font-weight:700;line-height:32px;text-align:center;")}">${String(i + 1).padStart(2, "0")}</td></tr></table></td>
<td valign="top"><p style="${text(16, c.ink, "font-weight:700;line-height:1.35;margin:0 0 4px;")}">${esc(item.title)}</p><p style="${text(14, c.body)}">${esc(item.text)}</p>${source(item.sourceId)}</td>
</tr></table></td></tr></table>`,
          )
          .join("")}`,
        "32px 32px 20px",
        band,
      )
    : "";
  // Two cards side by side: 260 + 16 + 260 = 536. Gmail stacks them on phones.
  const resources = content.resources
    ? row(
        `<p style="${text(22, c.ink, "font-weight:700;line-height:1.3;margin:0 0 16px;")}">${esc(content.resources.heading)}</p>
<table role="presentation" width="536" cellpadding="0" cellspacing="0" border="0" dir="${dir}" class="cols" style="width:100%;max-width:536px;"><tr>${content.resources.items
          .map(
            (item, i) =>
              `${i ? `<td width="16" class="gap" style="font-size:1px;line-height:1px;">&nbsp;</td>` : ""}<td width="260" valign="top" class="col" bgcolor="#ffffff" style="width:260px;background:#ffffff;border:1px solid ${c.line};border-radius:8px;padding:18px 18px 20px;" align="center"><p style="${text(16, c.ink, "font-weight:700;line-height:1.35;margin:0 0 6px;text-align:center;")}">${esc(item.title)}</p><p style="${text(14, c.body, "margin:0 0 10px;text-align:center;")}">${esc(item.text)}</p><a href="${esc(safeUrl(item.url, context))}" target="_blank" style="${link(c.ink)}font-family:${font};font-size:14px;font-weight:700;">${esc(item.label)}</a></td>`,
          )
          .join("")}</tr></table>`,
        "32px 32px 28px",
        band,
      )
    : "";
  const head = outlook
    ? `<!--[if mso]><style>body,table,td,p,a,span{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->`
    : `<style>@media only screen and (max-width:620px){.container{width:100% !important;max-width:100% !important;}.pad{padding-left:20px !important;padding-right:20px !important;}.h1{font-size:26px !important;}.col{display:block !important;width:100% !important;box-sizing:border-box;margin:0 0 12px;}.gap{display:none !important;}.cols{width:100% !important;}}</style>`;
  return `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${dir}"${outlook ? ` xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(content.subject)}</title>
${head}
</head>
<body style="margin:0;padding:0;background:#f4f4f2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;" dir="${dir}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f2;">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f2" style="background:#f4f4f2;">
<tr><td align="center" style="padding:24px 0;" bgcolor="#f4f4f2">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;">
${row(logo, "32px 32px 0")}
${row(
  `<h1 class="h1" style="${text(30, c.ink, "font-weight:700;line-height:1.2;letter-spacing:-0.01em;")}">${esc(content.heading)}</h1>${paragraphs(content.intro)
    .map((p) => `<p style="${text(16, c.body, "margin:14px 0 0;")}">${esc(p)}</p>`)
    .join("")}${steps}`,
  "28px 32px 0",
)}
${row(button(content.cta.label, safeUrl(content.cta.url, context), ctaWidth), "24px 32px 32px")}
${sections}
${sections ? `<tr><td height="28" style="height:28px;font-size:1px;line-height:1px;">&nbsp;</td></tr>` : ""}
${highlights}
${resources}
${row(`<p style="${text(15, c.body)}">${esc(content.signoff.name)}${content.signoff.title ? `<br><span style="color:${c.muted};">${esc(content.signoff.title)}</span>` : ""}</p>`, "28px 32px 32px")}
<tr><td class="pad" bgcolor="${footerBg}" style="padding:28px 32px 32px;background:${footerBg};" align="${align}" dir="${dir}">${wrapOpen}
<p style="${text(17, onFooter, "font-weight:700;")}">${esc(context.brand.name)}</p>
${context.brand.website ? `<p style="${text(13, footerMuted, "margin:6px 0 0;")}"><a href="${esc(context.brand.website)}" style="${link(footerMuted)}">${esc(context.brand.website.replace(/^https?:\/\//, ""))}</a></p>` : ""}
<p style="${text(12, footerMuted, "margin:16px 0 0;")}">${rtl ? "وصلتك هذه الرسالة لأنك على قائمة تواصلنا." : "You received this email because you are on our contact list."} <a href="{{unsubscribe_url}}" style="${link(footerMuted)}">${rtl ? "إلغاء الاشتراك" : "Unsubscribe"}</a></p>
${wrapClose}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export type LintItem = { level: "error" | "warn"; rule: string; message: string };

const tags = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);

// Gmail-safe checks (gmail-safe-email skill). Structural only; real client tests still apply.
export function lintGmail(html: string): LintItem[] {
  const out: LintItem[] = [];
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > 102 * 1024)
    out.push({ level: "error", rule: "clip", message: "Over 102 KB: Gmail hides the rest behind “View entire message”." });
  else if (bytes > 90 * 1024)
    out.push({ level: "warn", rule: "clip", message: "Close to the 102 KB clipping limit." });
  if (/src\s*=\s*["']data:/i.test(html))
    out.push({ level: "error", rule: "data-uri", message: "Gmail blocks data-URI images. Host images on HTTPS." });
  if (/<svg\b/i.test(html)) out.push({ level: "error", rule: "svg", message: "Gmail strips inline SVG." });
  if (/<script\b|\son\w+\s*=/i.test(html)) out.push({ level: "error", rule: "script", message: "Scripts and event handlers are removed." });
  if (/<(form|input|select|textarea|button)\b/i.test(html))
    out.push({ level: "error", rule: "form", message: "Forms and buttons are not supported. Use a linked button cell." });
  for (const style of html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? []) {
    if (/#[a-z][\w-]*\s*[{,]/i.test(style.replace(/#[0-9a-f]{3,8}\b/gi, "")))
      out.push({ level: "warn", rule: "style-id", message: "Gmail ignores ID selectors in <style>." });
    if (/\[[^\]]+\]\s*[{,]/.test(style))
      out.push({ level: "warn", rule: "style-attr", message: "Attribute selectors are not supported in Gmail <style>." });
    if (Buffer.byteLength(style) > 16 * 1024)
      out.push({ level: "error", rule: "style-size", message: "Gmail drops <style> blocks over 16 KB." });
  }
  if (/display\s*:\s*(flex|grid)|position\s*:\s*(absolute|fixed)/i.test(html))
    out.push({ level: "warn", rule: "layout", message: "Use tables for layout; flex, grid and positioning are unreliable." });
  for (const img of tags(html, "img")) {
    if (!/\balt\s*=/.test(img)) out.push({ level: "error", rule: "img-alt", message: "Every image needs alt text (images are often blocked)." });
    if (!/\bwidth\s*=/.test(img)) out.push({ level: "warn", rule: "img-width", message: "Give each image a numeric width attribute." });
  }
  if (!/display:none;max-height:0/.test(html))
    out.push({ level: "warn", rule: "preheader", message: "Add a hidden preheader so the inbox preview is not random text." });
  if (!/unsubscribe/i.test(html))
    out.push({ level: "error", rule: "unsubscribe", message: "Marketing email needs a visible unsubscribe link." });
  for (const a of tags(html, "a")) {
    const href = a.match(/href\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (!href || href === "#")
      out.push({ level: "warn", rule: "link", message: "A link has no destination." });
    else if (/^http:\/\//i.test(href))
      out.push({ level: "warn", rule: "link", message: "Use HTTPS links." });
  }
  return dedupe(out);
}

// Outlook desktop (Word engine) checks ported from outlook-safe-email/audit_email.py.
export function lintOutlook(html: string): LintItem[] {
  const out: LintItem[] = [];
  const buttons = tags(html, "a").filter((a) => /display\s*:\s*block/i.test(a));
  for (const a of buttons) {
    if (!/white-space\s*:\s*nowrap/.test(a))
      out.push({ level: "error", rule: "button-wrap", message: "Button links need white-space:nowrap or they grow on forward." });
    if (!/mso-line-height-rule\s*:\s*exactly/.test(a))
      out.push({ level: "error", rule: "button-line", message: "Button links need mso-line-height-rule:exactly." });
  }
  for (const td of tags(html, "td")) {
    if (/border-radius\s*:\s*50%/.test(td))
      out.push({ level: "error", rule: "radius", message: "border-radius:50% balloons in Word; use half the height in px." });
    const r = Number(td.match(/border-radius\s*:\s*(\d+)px/)?.[1] ?? 0);
    const h = Number(td.match(/(?<!-)\bheight\s*:\s*(\d+)px/)?.[1] ?? td.match(/\bheight="(\d+)"/)?.[1] ?? 0);
    if (r > 24 && (!h || r * 2 > h))
      out.push({ level: "error", rule: "radius", message: `border-radius:${r}px is more than half the cell height.` });
  }
  if (/rgba?\(/i.test(html))
    out.push({ level: "error", rule: "rgba", message: "Word renders rgba() as black. Pre-blend to a solid hex." });
  if (/display\s*:\s*(flex|grid)|position\s*:\s*(absolute|fixed|relative)|float\s*:/i.test(html))
    out.push({ level: "error", rule: "layout", message: "Flex, grid, float and positioning do not exist in Word. Use tables." });
  if (/\d(rem|vw|vh|ch)\b/.test(html))
    out.push({ level: "error", rule: "units", message: "rem, vw, vh and ch are dropped by Word. Use px." });
  for (const img of tags(html, "img")) {
    if (!/\bwidth="\d+"/.test(img) || !/\bheight="\d+"/.test(img))
      out.push({ level: "error", rule: "img-size", message: "Images need numeric width and height attributes." });
    if (/(?<!max-)width\s*:\s*100%/.test(img))
      out.push({ level: "error", rule: "img-size", message: "Images must not size with a bare width:100%." });
  }
  if (/<svg\b/i.test(html)) out.push({ level: "error", rule: "svg", message: "Inline SVG does not render in Outlook." });
  const bodyBg = html.match(/<body[^>]*background:\s*(#[0-9a-f]{6})/i)?.[1];
  if (bodyBg && !new RegExp(`<td[^>]*bgcolor="${bodyBg}"`, "i").test(html))
    out.push({ level: "warn", rule: "backdrop", message: "Pin the backdrop colour on a <td>, not only <body>." });
  if (!/<!--\[if mso\]>/.test(html))
    out.push({ level: "warn", rule: "mso", message: "No MSO conditional font override; serif fallback may appear." });
  if (!/unsubscribe/i.test(html))
    out.push({ level: "error", rule: "unsubscribe", message: "Marketing email needs a visible unsubscribe link." });
  return dedupe(out);
}

function dedupe(items: LintItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.rule}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
