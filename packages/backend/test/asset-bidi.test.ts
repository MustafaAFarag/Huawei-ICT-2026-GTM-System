import { describe, expect, it } from "vitest";
import { chromium } from "playwright";
import { normalizeAssetBidi } from "../src/asset-bidi.js";

const original =
  '<!doctype html><html lang="ar" dir="rtl"><head><style>p{font-size:20px}</style></head><body><p dir="auto">Kibesh Finance تعرض 4 وظائف شاغرة، منها مدير عمليات.</p><a href="https://example.com/jobs?q=1&amp;page=2">https://example.com/jobs</a><p>قيمة +100% لا تعني نتائج</p></body></html>';
describe("mixed-script printable assets", () => {
  it("sets Arabic paragraph direction while preserving source URLs and textual content", async () => {
    const html = normalizeAssetBidi(original);
    expect(normalizeAssetBidi(html)).toBe(html);
    expect(html).toContain('<p dir="rtl"><bdi dir="ltr">Kibesh Finance');
    expect(html).toContain('<bdi dir="ltr">+100%</bdi>');
    expect(html).toContain('href="https://example.com/jobs?q=1&amp;page=2"');
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable",
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      const result = await page
        .locator("p")
        .first()
        .evaluate((p) => ({
          direction: getComputedStyle(p).direction,
          align: getComputedStyle(p).textAlign,
          content: p.textContent,
          name: getComputedStyle(p.querySelector("bdi")!).direction,
        }));
      expect(result).toEqual({
        direction: "rtl",
        align: "start",
        content: "Kibesh Finance تعرض 4 وظائف شاغرة، منها مدير عمليات.",
        name: "ltr",
      });
      expect(await page.locator("a").getAttribute("href")).toBe(
        "https://example.com/jobs?q=1&page=2",
      );
    } finally {
      await browser.close();
    }
  });
  it("normalizes a model's changed auto direction even if it copied the version marker", () => {
    const changed = normalizeAssetBidi(original).replace(
      '<p dir="rtl">',
      '<p dir="auto">',
    );
    expect(normalizeAssetBidi(changed)).not.toContain('<p dir="auto">');
    const en = normalizeAssetBidi(
      '<html dir="ltr"><p dir="auto">Finance فريق جديد</p></html>',
      "en",
    );
    expect(en).toContain('<p dir="ltr">Finance فريق جديد</p>');
  });
});
