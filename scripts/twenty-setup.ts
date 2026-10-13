import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";

process.loadEnvFile(".env");
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable",
  headless: true,
});
const context = await browser.newContext({
  storageState: existsSync(".local/twenty-session.json")
    ? ".local/twenty-session.json"
    : undefined,
});
const page = await context.newPage();
const operations: { query: string; variables: string[] }[] = [];
let apiToken = "";
page.on("response", async (response) => {
  if (process.argv[2] !== "key" || !response.url().includes("/graphql")) return;
  try {
    const value = await response.json();
    const walk = (item: unknown) => {
      if (typeof item === "string" && /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(item))
        apiToken = item;
      else if (item && typeof item === "object")
        for (const child of Object.values(item)) walk(child);
    };
    walk(value);
  } catch {
    /* Non-JSON response. */
  }
});
page.on("request", (request) => {
  if (request.url().includes("/graphql") && request.method() === "POST") {
    try {
      const body = request.postDataJSON();
      operations.push({
        query: body.query,
        variables: Object.keys(body.variables ?? {}),
      });
    } catch {
      /* Non-JSON request. */
    }
  }
});
try {
  await page.goto(process.argv[3] ?? "http://localhost:3200");
  await page.waitForTimeout(1500);
  if (process.argv[2] === "choose") {
    await page.getByText("Revenue Demo A", { exact: true }).click();
  }
  if (process.argv[2] === "workspace-login") {
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("owner@revenue.local");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForTimeout(1000);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(process.env.DEMO_PASSWORD!);
    await page
      .getByRole("button", { name: /Continue|Sign in/, exact: true })
      .click();
  }
  if (process.argv[2] === "login") {
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("owner@revenue.local");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(process.env.DEMO_PASSWORD!);
    await page
      .getByRole("button", { name: /Sign in|Log in/, exact: true })
      .click();
  }
  if (process.argv[2] === "signup") {
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("owner@revenue.local");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(process.env.DEMO_PASSWORD!);
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
  }
  if (process.argv[2] === "workspace") {
    await page.getByRole("textbox").nth(0).fill("Revenue Demo A");
    await page.getByRole("textbox").nth(1).fill("revenue-a");
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
  }
  if (process.argv[2] === "workspace-b") {
    await page.getByText("Create a workspace", { exact: true }).click();
    await page.getByRole("textbox").nth(0).fill("Revenue Demo B");
    await page.getByRole("textbox").nth(1).fill("revenue-b");
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
  }
  if (process.argv[2] === "complete-profile") {
    await page.getByRole("textbox").nth(0).fill("Revenue");
    await page.getByRole("textbox").nth(1).fill("Owner");
    await page.getByRole("textbox").nth(2).fill("Demo workspace owner");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  if (process.argv[2] === "skip") {
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page
      .getByRole("button", { name: "Skip anyway", exact: true })
      .click();
  }
  if (process.argv[2] === "click")
    await page.getByText(process.argv[4]!, { exact: true }).last().click();
  if (process.argv[2] === "key") {
    await page.getByRole("textbox").first().fill("Revenue product integration");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(2000);
    const values = await page
      .locator("input")
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value),
      );
    apiToken =
      values.find((value) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) ??
      apiToken;
    if (!apiToken) {
      const text = await page.locator("body").innerText();
      apiToken = text.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)?.[0] ?? "";
    }
    if (!apiToken)
      throw new Error(
        "API token was not returned; inspect the local screenshot.",
      );
    const binding = process.argv[4] ?? "A";
    const env = await readFile(".env", "utf8");
    await writeFile(
      ".env",
      env.replace(
        new RegExp(`^TWENTY_${binding}_API_KEY=.*$`, "m"),
        `TWENTY_${binding}_API_KEY=${apiToken}`,
      ),
      { mode: 0o600 },
    );
    console.log(`Workspace ${binding} API token saved privately.`);
  }
  await page.waitForTimeout(2000);
  if (process.argv[2] === "profile") {
    const inputs = page.locator("input");
    console.log(
      "Inputs",
      await inputs.evaluateAll((elements) =>
        elements.map((element) => ({
          placeholder: element.getAttribute("placeholder"),
          name: element.getAttribute("name"),
          type: element.getAttribute("type"),
        })),
      ),
    );
  }
  await context.storageState({ path: ".local/twenty-session.json" });
  await page.screenshot({ path: ".local/twenty-setup.png", fullPage: true });
  await writeFile(
    ".local/twenty-operations.json",
    JSON.stringify(operations, null, 2),
    { mode: 0o600 },
  );
  console.log("URL", page.url());
  if (process.argv[2] !== "key")
    console.log((await page.locator("body").innerText()).slice(0, 5000));
} catch (error) {
  console.log("URL", page.url());
  if (process.argv[2] !== "key")
    console.log((await page.locator("body").innerText()).slice(0, 3000));
  await page.screenshot({ path: ".local/twenty-setup.png", fullPage: true });
  await writeFile(
    ".local/twenty-operations.json",
    JSON.stringify(operations, null, 2),
    { mode: 0o600 },
  );
  throw error;
} finally {
  await browser.close();
}
