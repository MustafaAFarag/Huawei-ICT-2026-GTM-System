// Renders synthetic one-pager and mini-audit samples (EN/AR) to HTML, PDF and PNG for visual review.
// Usage: tsx scripts/render-asset-samples.ts [outDir]
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { assetHtml } from "../packages/backend/src/asset-template.ts";
import { renderPdf } from "../packages/backend/src/providers.ts";

const out = process.argv[2] ?? ".local/asset-samples";
await mkdir(out, { recursive: true });
const brand = { name: "Qimam People", primary: "#14283f", accent: "#e5484d", website: "https://qimam-people.example" };
const snapshot = { firstName: "Huda", lastName: "Synthetic", email: "huda@nakheel-pay.example", company: "Nakheel Pay (synthetic)", website: "https://nakheel-pay.example", title: "Head of People" };
const evidence = [
  { id: "e1", claim: "The company lists four open HR and talent roles on its careers page.", url: "https://nakheel-pay.example/careers", date: "2026-10-02T00:00:00Z", kind: "fact" as const, approved: true, source: "Synthetic" },
  { id: "e2", claim: "A Series A round was announced in September 2026 to expand into Riyadh.", url: "https://news.example/nakheel-pay-series-a", date: "2026-09-18T00:00:00Z", kind: "fact" as const, approved: true, source: "Synthetic" },
  { id: "e3", claim: "Headcount grew from about 40 to 55 people over six months.", url: "https://nakheel-pay.example/about", date: "2026-10-05T00:00:00Z", kind: "fact" as const, approved: true, source: "Synthetic" },
];
const offer = "An outsourced HR operations desk in Cairo that runs payroll, onboarding and HR admin, so your people team can focus on hiring.";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable" });
const page = await browser.newPage({ viewport: { width: 860, height: 1200 } });
for (const template of ["offer-one-pager", "mini-audit"])
  for (const language of ["en", "ar-EG"]) {
    const html = assetHtml(brand, snapshot, evidence, template, language, true, offer);
    const name = `${out}/${template}-${language}`;
    await writeFile(`${name}.html`, html);
    await writeFile(`${name}.pdf`, await renderPdf(html));
    await page.setContent(html);
    await page.screenshot({ path: `${name}.png`, fullPage: true });
  }
await browser.close();
console.log(`Samples written to ${out}`);
