import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import {
  checkContent,
  generateDeliverable,
  lintGmail,
  lintOutlook,
  oneSlide,
  renderContent,
  renderSlidesPdf,
  renderSlidesZip,
  type FormatContext,
} from "@revenue/backend";

// Deliverable formats in fixture mode: the trusted templates must satisfy the client
// rules (Gmail, Outlook), slide sizes and RTL whatever the content.
const context = (language = "en"): FormatContext => ({
  brand: { name: "Nour Studio", primary: "#1f2937", accent: "#f59e0b", website: "https://nour-studio.example" },
  company: "A brand and web design studio in Cairo.",
  offer: "A free one-page website review with three fixes you can make this week.",
  facts: [
    {
      id: "f1",
      claim: "The clinic lists 12 branches on its contact page.",
      url: "https://clinic.example/contact",
      date: "2026-10-01T00:00:00.000Z",
      kind: "fact",
      approved: true,
      source: "Website",
    },
  ],
  language,
  date: "2026-10-17",
});

const pngSize = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

describe("deliverable formats", () => {
  it("renders a Gmail-safe email under the clipping limit without data URIs", async () => {
    const email = await generateDeliverable("email-gmail", context(), {});
    expect(Buffer.byteLength(email.html)).toBeLessThan(102 * 1024);
    expect(email.html).not.toMatch(/src=["']data:/);
    expect(lintGmail(email.html).filter((l) => l.level === "error")).toEqual([]);
    expect(email.html).toContain("{{unsubscribe_url}}");
    expect(email.html).toContain("https://clinic.example/contact");
  });

  it("renders an Outlook-safe email that passes the Word-engine audit", async () => {
    const email = await generateDeliverable("email-outlook", context(), {});
    expect(lintOutlook(email.html)).toEqual([]);
    expect(email.html).toContain("<!--[if mso]>");
  });

  it("renders Arabic emails right to left", async () => {
    const email = await generateDeliverable("email-gmail", context("ar-EG"), {});
    expect(email.html).toMatch(/<html lang="ar" dir="rtl"/);
    expect(email.html).toMatch(/[؀-ۿ]/);
  });

  it("exports an Instagram carousel as one 1080×1350 PNG per slide", async () => {
    const deck = await generateDeliverable("instagram-carousel", context(), { slides: 6 });
    expect(deck.pages).toBe(6);
    const files = unzipSync(await renderSlidesZip(deck.html));
    expect(Object.keys(files)).toHaveLength(6);
    expect(pngSize(files["slide-01.png"]!)).toEqual({ width: 1080, height: 1350 });
    expect(oneSlide(deck.html, 2)).toContain('.slide[data-slide="2"]{display:flex!important}');
  }, 60000);

  it("exports a LinkedIn carousel as a PDF with one 1080×1350 page per slide", async () => {
    const deck = await generateDeliverable("linkedin-carousel", context("ar-EG"), { slides: 5 });
    const pdf = (await renderSlidesPdf(deck.html)).toString("latin1");
    expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(5);
    // 1080×1350 CSS px = 810×1012.5 pt (Chromium rounds the height up slightly).
    expect(pdf).toMatch(/\/MediaBox \[0 0 810 101[23](\.\d+)?\]/);
    expect(deck.html).toMatch(/dir="rtl"/);
  }, 60000);

  it("renders a flipbook with the page-turn runtime and a static print view", async () => {
    const book = await generateDeliverable("flipbook", context(), {});
    expect(book.html).toContain("St.PageFlip");
    expect(book.printHtml).not.toContain("<script");
    expect(book.pages).toBeGreaterThanOrEqual(4);
  });

  it("keeps the hook first and the CTA last whatever the model order", () => {
    const deck = renderContent(
      "instagram-carousel",
      {
        title: "T",
        caption: "c",
        slides: [
          { kind: "cta", heading: "Book now" },
          { kind: "point", heading: "One" },
          { kind: "hook", heading: "Hook" },
        ],
      },
      context(),
    );
    const kinds = [...deck.html.matchAll(/kind-(\w+)/g)].map((m) => m[1]);
    expect(kinds).toEqual(["hook", "point", "cta"]);
  });

  it("rejects numbers that are not in reviewed sources", () => {
    expect(() =>
      checkContent({ heading: "Grow 40% in 30 days" }, context()),
    ).toThrow(/unsupported numbers \(40, 30\)/);
    expect(() => checkContent({ heading: "12 branches, 3 fixes" }, context())).not.toThrow();
  });
});
