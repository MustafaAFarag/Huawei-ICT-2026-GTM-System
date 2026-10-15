import { chromium, type FullConfig } from "@playwright/test";

// Sign in once per run: the product rate-limits sign-in, so specs reuse this session.
export default async function globalSetup(config: FullConfig) {
  const use = config.projects[0]!.use;
  const browser = await chromium.launch(use.launchOptions);
  const page = await browser.newPage({ baseURL: use.baseURL });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(process.env.DEMO_EMAIL!);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Plays", exact: true }).waitFor();
  await page.context().storageState({ path: ".local/e2e-auth.json" });
  await browser.close();
}
