// Captures the main screens in both themes, both interface languages and desktop/phone widths.
// Usage: tsx scripts/screenshots.ts [outDir] [--quick]
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const out = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : "verification/screens";
const quick = process.argv.includes("--quick");
const workspace = process.env.SCREENSHOT_WORKSPACE;
const screens = [
  "Plays",
  "Accounts",
  "Review queue",
  "Asset Studio",
  "Settings",
  "Company context",
];
const viewports = quick
  ? [{ name: "desktop", width: 1440, height: 900 }]
  : [
      { name: "desktop", width: 1440, height: 900 },
      { name: "phone", width: 390, height: 844 },
    ];
const themes = quick ? ["dark"] : ["dark", "light"];
const languages = quick ? ["en"] : ["en", "ar"];

async function signIn(page: Page) {
  await page.goto(base);
  await page.locator('input[name="email"]').fill(process.env.DEMO_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.DEMO_PASSWORD!);
  await page.locator('.signin-card button[type="submit"]').click();
  await page.locator(".page-heading h1").waitFor();
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH === "playwright"
      ? undefined
      : (process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable"),
});
// Sign in once (the auth endpoint is rate limited), then switch preferences by reloading.
const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize(viewports[0]);
await signIn(page);
if (workspace) {
  const select = page.locator(".workspace-picker select");
  const value = await select
    .locator("option", { hasText: workspace })
    .first()
    .getAttribute("value");
  if (value) await select.selectOption(value);
  await page.waitForTimeout(800);
}
const NAV = ["Plays", "Accounts", "Review queue", "Asset Studio", "Sequences", "Company context", "Settings"];
for (const theme of themes)
  for (const language of languages) {
    await page.evaluate(
      ([t, l]) => {
        localStorage.setItem("revenue-theme", t);
        localStorage.setItem("revenue-ui-language", l);
      },
      [theme, language],
    );
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.reload();
      await page.locator(".page-heading h1").waitFor();
      const hide = page.locator(".assistant-head .icon-button");
      if (viewport.name === "phone" && (await hide.count())) await hide.click();
      for (const [index, screen] of screens.entries()) {
        await page.locator(".nav button").nth(NAV.indexOf(screen)).click();
        await page.waitForTimeout(350);
        await page.screenshot({
          path: `${out}/${index + 1}-${screen.replaceAll(" ", "-").toLowerCase()}-${theme}-${language}-${viewport.name}.png`,
          fullPage: viewport.name === "phone",
        });
      }
    }
  }
// Sign-in screen in each theme/language from a signed-out context.
for (const theme of themes)
  for (const language of languages) {
    const anonymous = await browser.newContext();
    await anonymous.addInitScript(
      ([t, l]) => {
        localStorage.setItem("revenue-theme", t);
        localStorage.setItem("revenue-ui-language", l);
      },
      [theme, language],
    );
    const p = await anonymous.newPage();
    await p.setViewportSize(viewports[0]);
    await p.goto(base);
    await p.locator(".signin-card").waitFor();
    await p.screenshot({ path: `${out}/signin-${theme}-${language}-desktop.png` });
    await anonymous.close();
  }
await browser.close();
console.log(`Screenshots written to ${out}`);
