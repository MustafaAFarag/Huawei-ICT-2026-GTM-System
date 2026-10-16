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
  sections: z
    .array(
      z.object({
        heading: z.string().max(90).optional(),
        body: z.string().max(900),
        bullets: z.array(z.string().max(160)).max(4).optional(),
        sourceId: z.string().optional(),
      }),
    )
    .min(1)
    .max(4),
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
  // Outlook resolves only system fonts; Gmail can use the brand stack before falling back.
  const font = rtl
    ? "Tahoma,Arial,Helvetica,sans-serif"
    : client === "gmail"
      ? "Helvetica,Arial,sans-serif"
      : "Arial,Helvetica,sans-serif";
  const text = (size: number, color: string, extra = "") =>
    `font-family:${font};font-size:${size}px;line-height:1.6;color:${color};margin:0;${extra}`;
  const url = safeUrl(content.cta.url, context);
  // Word grows links on forward unless their line box is fixed (outlook-safe-email #1).
  const link = (color: string) =>
    `color:${color};text-decoration:underline;${client === "outlook" ? "white-space:nowrap;mso-line-height-rule:exactly;line-height:18px;" : ""}`;
  const logo =
    context.brand.logo && /^https:\/\//.test(context.brand.logo)
      ? `<img src="${esc(context.brand.logo)}" width="120" height="32" alt="${esc(context.brand.name)}" style="display:block;border:0;outline:none;text-decoration:none;height:32px;width:auto;max-width:120px;">`
      : `<span style="${text(16, c.ink, "font-weight:700;letter-spacing:-0.01em;")}">${esc(context.brand.name)}</span>`;
  const mso = (open: string, close: string) =>
    client === "outlook" ? [`<!--[if mso]>${open}<![endif]-->`, `<!--[if mso]>${close}<![endif]-->`] : ["", ""];
  const [wrapOpen, wrapClose] = mso(
    `<table role="presentation" width="536" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td>`,
    `</td></tr></table>`,
  );
  const sections = content.sections
    .map((section) => {
      const fact = factById(context, section.sourceId);
      const bullets = (section.bullets ?? [])
        .map(
          (b) =>
            `<tr><td width="18" valign="top" style="${text(15, c.primary, "font-weight:700;")}">&#8226;</td><td valign="top" style="${text(15, c.body)}">${esc(b)}</td></tr>`,
        )
        .join("");
      return `<tr><td style="padding:24px 32px 0;" dir="${dir}" align="${align}">${wrapOpen}${
        section.heading
          ? `<p style="${text(17, c.ink, "font-weight:700;line-height:1.35;margin:0 0 8px;")}">${esc(section.heading)}</p>`
          : ""
      }${paragraphs(section.body)
        .map((p) => `<p style="${text(15, c.body, "margin:0 0 12px;")}">${esc(p)}</p>`)
        .join("")}${
        bullets
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin:0 0 8px;">${bullets}</table>`
          : ""
      }${
        fact
          ? `<p style="${text(12, c.muted, "margin:4px 0 0;")}"><a href="${esc(fact.url)}" style="${link(c.muted)}">${sourceLine(fact, context.language)}</a></p>`
          : ""
      }${wrapClose}</td></tr>`;
    })
    .join("");
  // Button: 14 + 20 + 14 = 48px tall, radius 8px (well under half the height).
  const button = `<tr><td style="padding:28px 32px 4px;" align="${align}" dir="${dir}">
<table role="presentation" width="240" align="${client === "outlook" ? "center" : rtl ? "right" : "left"}" cellpadding="0" cellspacing="0" border="0" style="width:240px;"><tr>
<td align="center" height="48" bgcolor="${c.primary}" style="background-color:${c.primary};border-radius:8px;height:48px;mso-line-height-rule:exactly;line-height:1px;font-size:1px;">
<a href="${esc(url)}" target="_blank" style="display:block;height:20px;padding:14px 0;font-family:${font};font-size:15px;font-weight:700;color:${c.onPrimary};text-decoration:none;mso-line-height-rule:exactly;line-height:20px;white-space:nowrap;text-align:center;">${esc(content.cta.label)}</a>
</td></tr></table></td></tr>`;
  const head =
    client === "outlook"
      ? `<!--[if mso]><style>body,table,td,p,a,span{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->`
      : `<style>@media only screen and (max-width:620px){.container{width:100% !important;max-width:100% !important;}.pad{padding-left:20px !important;padding-right:20px !important;}.h1{font-size:24px !important;}}</style>`;
  return `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${dir}"${client === "outlook" ? ` xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"` : ""}>
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
<body style="margin:0;padding:0;background:${c.tint};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;" dir="${dir}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${c.tint};">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.tint}" style="background:${c.tint};">
<tr><td align="center" style="padding:24px 12px;" bgcolor="${c.tint}">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td height="6" bgcolor="${c.primary}" style="height:6px;background:${c.primary};font-size:1px;line-height:1px;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:24px 32px 0;" align="${align}" dir="${dir}">${logo}</td></tr>
<tr><td class="pad" style="padding:24px 32px 0;" align="${align}" dir="${dir}">${wrapOpen}
<h1 class="h1" style="${text(28, c.ink, "font-weight:700;line-height:1.25;")}">${esc(content.heading)}</h1>
${paragraphs(content.intro)
  .map((p) => `<p style="${text(16, c.body, "margin:14px 0 0;")}">${esc(p)}</p>`)
  .join("")}
${wrapClose}</td></tr>
${sections}
${button}
<tr><td class="pad" style="padding:24px 32px 28px;" align="${align}" dir="${dir}">${wrapOpen}
<p style="${text(15, c.body)}">${esc(content.signoff.name)}${content.signoff.title ? `<br><span style="color:${c.muted};">${esc(content.signoff.title)}</span>` : ""}</p>
${wrapClose}</td></tr>
<tr><td class="pad" style="padding:20px 32px 28px;border-top:1px solid ${c.line};" align="${align}" dir="${dir}">${wrapOpen}
<p style="${text(12, c.muted)}">${esc(context.brand.name)}${context.brand.website ? ` · <a href="${esc(context.brand.website)}" style="${link(c.muted)}">${esc(context.brand.website.replace(/^https?:\/\//, ""))}</a>` : ""}</p>
<p style="${text(12, c.muted, "margin:6px 0 0;")}">${rtl ? "لا تريد رسائل أخرى؟" : "Prefer not to hear from us?"} <a href="{{unsubscribe_url}}" style="${link(c.muted)}">${rtl ? "إلغاء الاشتراك" : "Unsubscribe"}</a></p>
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
