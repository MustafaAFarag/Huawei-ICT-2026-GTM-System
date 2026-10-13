import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
process.loadEnvFile(".env");
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
});
const page = await browser.newPage();
try {
  await page.goto("http://localhost:3100");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(process.env.DEMO_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Plays", exact: true }).waitFor();
  await page.screenshot({ path: ".local/product-desktop.png", fullPage: true });
  console.log("Signed in; four plays rendered.");
  for (const name of [
    "Accounts",
    "Review queue",
    "Asset Studio",
    "Sequences",
    "Company context",
    "Settings",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("heading", { name, exact: true }).waitFor();
    console.log(`${name}: rendered`);
  }
  await page
    .getByRole("button", { name: "Hide assistant", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/product-narrow.png", fullPage: true });
  console.log(
    "Narrow viewport overflow:",
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  );
} catch (error) {
  console.log((await page.locator("body").innerText()).slice(0, 2000));
  throw error;
} finally {
  await browser.close();
}
