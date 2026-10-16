const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
const normalize = (text: string) =>
  decode(text).normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const visibleText = (html: string) =>
  normalize(
    html
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]*>/g, " "),
  );
const numbers = (text: string) =>
  (
    text
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
      .match(/\d+(?:\.\d+)?/g) ?? []
  ).map((value) => String(Number(value)));

// Catch the observed failure where an Arabic layout retained entire English
// observations/offers. This is a language/traceability check, not a semantic judge.
export function validateAssetContent(
  html: string,
  language: string,
  approvedTexts: string[],
  sourceUrls: string[],
  originalTemplate?: string,
) {
  const visible = visibleText(html);
  if (originalTemplate) {
    const allowed = new Set(numbers(visibleText(originalTemplate)));
    if (numbers(visible).some((value) => !allowed.has(value)))
      throw new Error(
        "The generated asset added an unsupported number. Review the sources and retry.",
      );
  }
  if (language !== "en") {
    if (
      !/[\u0600-\u06ff]/.test(visible) ||
      !/<html\b[^>]*\bdir\s*=\s*["']rtl["']/i.test(html)
    )
      throw new Error(
        "The Arabic asset needs Arabic content and RTL layout. Retry generation.",
      );
    const copied = approvedTexts
      .filter(
        (text) =>
          !/[\u0600-\u06ff]/.test(text) && text.trim().split(/\s+/).length >= 6,
      )
      .some((text) => visible.includes(normalize(text)));
    if (copied)
      throw new Error(
        "The Arabic asset still contains an untranslated source sentence. Retry generation before review.",
      );
  }
  const hrefs = [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(
    (match) => decode(match[1]!),
  );
  if (sourceUrls.some((url) => !hrefs.includes(url)))
    throw new Error(
      "The generated asset omitted an approved source link. Retry generation.",
    );
}
