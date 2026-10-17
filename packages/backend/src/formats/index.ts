import { strToU8, zipSync } from "fflate";
import { chromium } from "playwright";
import { ASSET_FORMATS, type AssetTemplate, type Evidence } from "@revenue/contracts";
import { config } from "../config.js";
import { ModelGateway } from "../model.js";
import { prompt } from "../agent/prompts.js";
import { emailContent, lintGmail, lintOutlook, renderEmail, type EmailContent, type LintItem } from "./email.js";
import {
  carouselContent,
  normalizeCarousel,
  renderCarousel,
  slideCount,
  SLIDE,
  type CarouselContent,
} from "./slides.js";
import {
  flipbookContent,
  flipbookPageCount,
  renderFlipbook,
  renderFlipbookPrint,
  type FlipbookContent,
} from "./flipbook.js";
import {
  fixtureProfileContent,
  profileContent,
  profilePageCount,
  renderCapabilityProfile,
  requireProfileInputs,
  type ProfileContent,
} from "./capability-profile.js";
import { arabic, checkContent, type FormatContext } from "./shared.js";

export * from "./shared.js";
export { lintGmail, lintOutlook } from "./email.js";
export { oneSlide, slideCount } from "./slides.js";
export { flipbookPageCount } from "./flipbook.js";
export { PROFILE_DEFAULT_HOLDOUT, profilePageCount } from "./capability-profile.js";

// Formats whose content JSON is written by the model and rendered by trusted templates.
export const CONTENT_FORMATS = [
  "email-gmail",
  "email-outlook",
  "instagram-carousel",
  "linkedin-carousel",
  "flipbook",
  "capability-profile",
] as const satisfies readonly AssetTemplate[];
export type ContentFormat = (typeof CONTENT_FORMATS)[number];
export const isContentFormat = (template: string): template is ContentFormat =>
  (CONTENT_FORMATS as readonly string[]).includes(template);

export function deliverableModelId() {
  return process.env.AI_DELIVERABLE_MODEL ?? process.env.MODEL_ID ?? "fixture";
}

type Generated = {
  html: string;
  printHtml?: string;
  content: unknown;
  pages: number;
};

function schemaFor(template: ContentFormat) {
  return template.startsWith("email")
    ? emailContent
    : template === "flipbook"
      ? flipbookContent
      : template === "capability-profile"
        ? profileContent
        : carouselContent;
}
export function promptFor(template: ContentFormat) {
  return prompt(
    template.startsWith("email")
      ? "format-email"
      : template === "flipbook"
        ? "format-flipbook"
        : template === "capability-profile"
          ? "format-capability-profile"
          : "format-carousel",
  );
}

export function renderContent(template: ContentFormat, content: unknown, context: FormatContext): Generated {
  if (template === "email-gmail" || template === "email-outlook") {
    const html = renderEmail(content as EmailContent, context, template === "email-gmail" ? "gmail" : "outlook");
    return { html, content, pages: 1 };
  }
  if (template === "flipbook") {
    const book = content as FlipbookContent;
    const html = renderFlipbook(book, context);
    return { html, printHtml: renderFlipbookPrint(book, context), content, pages: flipbookPageCount(html) };
  }
  if (template === "capability-profile") {
    const html = renderCapabilityProfile(content as ProfileContent, context);
    return { html, content, pages: profilePageCount(html) };
  }
  const carousel = normalizeCarousel(content as CarouselContent);
  const html = renderCarousel(carousel, context, template === "instagram-carousel" ? "instagram" : "linkedin");
  return { html, content: carousel, pages: slideCount(html) };
}

// Deterministic content for fixture mode and tests: built only from approved inputs.
function fixtureContent(template: ContentFormat, context: FormatContext, slides: number): unknown {
  if (template === "capability-profile") return fixtureProfileContent(context);
  const ar = arabic(context.language);
  const fact = context.facts[0];
  const company = context.snapshot?.company ?? context.brand.name;
  const offer = context.offer ?? (ar ? "مراجعة قصيرة لما يمكن تحسينه." : "A short review of what to improve.");
  if (template.startsWith("email"))
    return {
      subject: ar ? `فكرة لـ ${company}` : `An idea for ${company}`,
      preheader: offer,
      heading: ar ? `فكرة عملية لـ ${company}` : `A practical idea for ${company}`,
      intro: ar ? "لاحظنا نقطة من مصدر تمت مراجعته وجهزنا اقتراحًا قصيرًا." : "We noticed one point from a reviewed source and prepared a short suggestion.",
      steps: [
        ar ? "رد على هذه الرسالة" : "Reply to this email",
        ar ? "اختر موعدًا قصيرًا" : "Pick a short slot",
      ],
      sections: [
        { heading: ar ? "ما لاحظناه" : "What we noticed", body: fact?.claim ?? offer, sourceId: fact?.id },
      ],
      highlights: {
        heading: ar ? "ما ستحصل عليه" : "What you get",
        items: [
          { title: ar ? "مراجعة" : "A review", text: offer },
          { title: ar ? "خطوات واضحة" : "Clear next steps", text: offer },
        ],
      },
      cta: { label: ar ? "احجز مكالمة قصيرة" : "Book a short call", url: context.brand.website },
      signoff: { name: context.brand.name },
    } satisfies EmailContent;
  if (template === "flipbook")
    return {
      title: ar ? `دليل ${context.brand.name}` : `${context.brand.name} guide`,
      subtitle: offer,
      pages: [
        { kind: "cover", heading: ar ? `دليل ${context.brand.name}` : `${context.brand.name} guide`, body: offer },
        { kind: "editorial", kicker: ar ? "السياق" : "Context", heading: ar ? "ما لاحظناه" : "What we noticed", body: fact?.claim ?? offer, sourceId: fact?.id },
        { kind: "steps", heading: ar ? "الخطوات" : "The steps", items: [
          { title: ar ? "مراجعة" : "Review", text: ar ? "نراجع الوضع الحالي." : "We review where things stand." },
          { title: ar ? "اقتراح" : "Propose", text: offer },
          { title: ar ? "تنفيذ" : "Act", text: ar ? "تختار ما يناسبك." : "You choose what fits." },
        ] },
        { kind: "cta", heading: ar ? "الخطوة التالية" : "Next step", body: offer, cta: { label: ar ? "تواصل معنا" : "Get in touch", url: context.brand.website } },
      ],
    } satisfies FlipbookContent;
  const middle = Math.max(1, slides - 2);
  return {
    title: ar ? `أفكار من ${context.brand.name}` : `Ideas from ${context.brand.name}`,
    slides: [
      { kind: "hook", heading: ar ? "فكرة واحدة تغيّر الأسبوع" : "One idea that changes your week", body: offer },
      ...Array.from({ length: middle }, (_, i) => ({
        kind: "point" as const,
        heading: i === 0 && fact ? fact.claim.slice(0, 88) : ar ? `نقطة ${i + 1}` : `Point ${i + 1}`,
        body: offer.slice(0, 230),
        sourceId: i === 0 ? fact?.id : undefined,
      })),
      { kind: "cta", heading: ar ? "عايز تجرب؟" : "Want to try it?", body: offer.slice(0, 230) },
    ],
    caption: offer,
  } satisfies CarouselContent;
}

export async function generateDeliverable(
  template: ContentFormat,
  context: FormatContext,
  options: { instructions?: string; slides?: number; previous?: unknown },
): Promise<Generated> {
  const spec = ASSET_FORMATS[template];
  if (template === "capability-profile") requireProfileInputs(context);
  const slides = Math.min(
    spec.slides?.max ?? 12,
    Math.max(spec.slides?.min ?? 3, options.slides ?? spec.slides?.default ?? 7),
  );
  let content: unknown;
  if (config.modelFixture) content = fixtureContent(template, context, slides);
  else {
    const schema = schemaFor(template);
    const system = `${promptFor(template).text}\n\n${prompt("language").text}`;
    const input = {
      format: template,
      contentLanguage: context.language,
      ...(spec.slides ? { count: slides } : {}),
      brand: { name: context.brand.name, website: context.brand.website },
      company: context.company,
      approvedOffer: context.offer ?? null,
      ...(template === "capability-profile"
        ? { approvedOffers: context.offers ?? [], consentedReferences: context.references ?? [] }
        : {}),
      account: context.snapshot
        ? {
            company: context.snapshot.company,
            firstName: context.snapshot.firstName,
            title: context.snapshot.title,
            industry: context.snapshot.industry,
          }
        : null,
      reviewedFacts: context.facts.map((f) => ({ id: f.id, claim: f.claim, url: f.url, date: f.date.slice(0, 10) })),
      previousVersion: options.previous ?? null,
      editRequest: options.instructions?.slice(0, 1500) ?? null,
      today: context.date,
    };
    // One retry with the validation error: the commonest failure is an invented number.
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parsed = await new ModelGateway().json(
          system,
          attempt ? { ...input, previousAttemptRejected: String((lastError as Error).message) } : input,
          schema,
          template === "flipbook" ? 5000 : 3200,
          deliverableModelId(),
        );
        checkContent(parsed, context, options.instructions);
        content = parsed;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!content)
      throw new Error(
        `The ${spec.label.toLowerCase()} draft failed validation: ${(lastError as Error)?.message ?? "no usable response"}`,
      );
  }
  return renderContent(template, content, context);
}

export function lintFor(template: string, html: string): LintItem[] {
  if (template === "email-gmail") return lintGmail(html);
  if (template === "email-outlook") return lintOutlook(html);
  return [];
}

export function pageCount(template: string, html: string) {
  if (template === "instagram-carousel" || template === "linkedin-carousel") return slideCount(html);
  if (template === "flipbook") return flipbookPageCount(html);
  if (template === "capability-profile") return profilePageCount(html);
  return 1;
}

async function withPage<T>(viewport: { width: number; height: number }, run: (page: import("playwright").Page) => Promise<T>) {
  const browser = await chromium.launch({
    headless: true,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", LANG: "C.UTF-8" },
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable",
  });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport, deviceScaleFactor: 1 });
    await context.route("**/*", (route) => route.abort());
    return await run(await context.newPage());
  } finally {
    await browser.close();
  }
}

// One 1080×1350 PNG per slide, zipped in order (slide-01.png …).
export async function renderSlidesZip(html: string) {
  return withPage(SLIDE, async (page) => {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const files: Record<string, Uint8Array> = {};
    const slides = await page.$$(".slide");
    for (const [i, slide] of slides.entries())
      files[`slide-${String(i + 1).padStart(2, "0")}.png`] = await slide.screenshot({ type: "png", timeout: 30000 });
    return Buffer.from(zipSync(files, { level: 0 }));
  });
}

// Multi-page PDF at the slide size, for LinkedIn document posts.
export async function renderSlidesPdf(html: string) {
  return withPage(SLIDE, async (page) => {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return page.pdf({ width: `${SLIDE.width}px`, height: `${SLIDE.height}px`, printBackground: true, preferCSSPageSize: true });
  });
}

export async function renderA4Pdf(html: string) {
  return withPage({ width: 794, height: 1123 }, async (page) => {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  });
}

export const textZip = (files: Record<string, string>) =>
  Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));

export function formatContext(input: {
  workspace: { company: unknown; brand: unknown; offers: unknown; name: string };
  snapshot?: FormatContext["snapshot"];
  evidence: Evidence[];
  language: string;
  holdoutPercent?: number;
}): FormatContext {
  const brand = input.workspace.brand as FormatContext["brand"];
  const company = input.workspace.company as {
    description?: string;
    descriptionAr?: string;
    icp?: string;
    references?: { name: string; nameAr?: string; consent: boolean }[];
  };
  const offers = input.workspace.offers as { text: string; textAr?: string; approved: boolean }[];
  // Arabic documents prefer the workspace's own Arabic fields when it has them.
  const ar = arabic(input.language);
  const offerText = (o: { text: string; textAr?: string }) => (ar && o.textAr?.trim()) || o.text;
  const description = (ar && company.descriptionAr?.trim()) || company.description;
  return {
    brand: { ...brand, name: brand.name || input.workspace.name, website: brand.website ?? "" },
    company: [description, company.icp ? `Customers: ${company.icp}` : ""].filter(Boolean).join(" "),
    offer: offers.filter((o) => o.approved).map(offerText)[0],
    offers: offers.filter((o) => o.approved).map(offerText),
    references: (company.references ?? [])
      .filter((r) => r.consent === true)
      .map((r) => (ar && r.nameAr?.trim()) || r.name),
    holdoutPercent: input.holdoutPercent,
    snapshot: input.snapshot,
    facts: input.evidence.filter((e) => e.approved && e.kind === "fact"),
    language: input.language,
    date: new Date().toISOString().slice(0, 10),
  };
}
