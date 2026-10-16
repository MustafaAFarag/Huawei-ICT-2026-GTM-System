import { chromium, expect, type FullConfig } from "@playwright/test";

// Sign in once per run: the product rate-limits sign-in, so specs reuse this session.
export default async function globalSetup(config: FullConfig) {
  const use = config.projects[0]!.use;
  const browser = await chromium.launch(use.launchOptions);
  const page = await browser.newPage({ baseURL: use.baseURL });
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get("/api/health")).status();
        } catch {
          return 0;
        }
      },
      {
        timeout: 20000,
        message: "Web proxy and API must be ready before sign-in",
      },
    )
    .toBe(200);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(process.env.DEMO_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(process.env.DEMO_PASSWORD!);
  const signIn = page.waitForResponse(
    (r) =>
      r.url().endsWith("/auth/sign-in/email") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await signIn;
  if (!response.ok())
    throw new Error(
      `Browser sign-in failed (${response.status()}); check service readiness or rate-limit cooldown.`,
    );
  // Home is the chat-first page: the composer proves the workspace loaded.
  await page.locator("#assistant-input").waitFor();
  await page.context().storageState({ path: ".local/e2e-auth.json" });
  await browser.close();
}
