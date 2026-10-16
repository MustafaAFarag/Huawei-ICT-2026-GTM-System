import { describe, expect, it } from "vitest";
import { validateAssetContent } from "../src/asset-quality.js";
const fact = "Example Pay lists four open roles on its careers page.";
const url = "https://example.test/careers?type=hr&lang=en";
const html = (body: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><style>/* hidden original: ${fact} */</style><body><h1>مراجعة للفريق</h1>${body}<a href="https://example.test/careers?type=hr&amp;lang=en">المصدر</a></body></html>`;
describe("asset content checks", () => {
  it("rejects new visible numbers, including Arabic digits, without treating CSS dimensions as claims", () => {
    const original = html("<p>4 وظائف</p>");
    expect(() =>
      validateAssetContent(
        html("<p>4 وظائف</p><style>p{width:800px}</style>"),
        "ar",
        [fact],
        [url],
        original,
      ),
    ).not.toThrow();
    expect(() =>
      validateAssetContent(
        html("<p>خفضنا التكاليف 60%</p>"),
        "ar",
        [fact],
        [url],
        original,
      ),
    ).toThrow(/unsupported number/);
    expect(() =>
      validateAssetContent(
        html("<p>خفضنا التكاليف ٦٠%</p>"),
        "ar",
        [fact],
        [url],
        original,
      ),
    ).toThrow(/unsupported number/);
  });
  it("rejects English source sentences inside an Arabic layout", () => {
    expect(() =>
      validateAssetContent(html(`<p>${fact}</p>`), "ar-EG", [fact], [url]),
    ).toThrow(/untranslated/);
    expect(() =>
      validateAssetContent(
        html("<p>تُعلن الشركة عن أربع وظائف في صفحة التوظيف</p>"),
        "ar-EG",
        [fact],
        [url],
      ),
    ).not.toThrow();
  });
  it("requires RTL and original source links without rejecting proper names", () => {
    expect(() =>
      validateAssetContent(
        html("<p>Example Pay تُعلن عن أربع وظائف</p>"),
        "ar",
        [fact],
        [url],
      ),
    ).not.toThrow();
    expect(() =>
      validateAssetContent(
        html("مراجعة").replace('dir="rtl"', 'dir="ltr"'),
        "ar",
        [fact],
        [url],
      ),
    ).toThrow(/RTL/);
    expect(() =>
      validateAssetContent(
        html("مراجعة"),
        "ar",
        [fact],
        ["https://missing.example"],
      ),
    ).toThrow(/source link/);
  });
});
