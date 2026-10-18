import { test, expect } from "@playwright/test";

test("triage, discovery, consent references and SDR PDF in both interface directions", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/?s=Plays");
  expect(await page.evaluate(() => isSecureContext)).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Campaigns", exact: true }),
  ).toBeVisible();
  const me = await (await context.request.get("/api/me")).json();
  const workspace = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  await page.getByLabel("Workspace", { exact: true }).selectOption(workspace);
  const dashboard = await (
    await context.request.get(`/api/workspaces/${workspace}`)
  ).json();
  const person = dashboard.prospects.find((p: any) => !p.excluded);
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search accounts" })
    .fill(person.snapshot.email);
  await page
    .getByRole("row")
    .filter({ hasText: person.snapshot.firstName })
    .getByRole("button", { name: "Open", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Triage", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rationale", exact: true })
    .fill("Synthetic workflow verification");
  await page.getByRole("button", { name: "Save triage", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Triage saved");
  await page.getByRole("button", { name: "Discovery", exact: true }).click();
  const discovery = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Discovery interview",
      exact: true,
    }),
  });
  if ((await discovery.locator("details").getAttribute("open")) === null)
    await discovery.locator("summary").click();
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Synthetic discovery note");
  await page
    .getByRole("button", { name: "Save interview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Discovery answers saved",
  );
  await expect(discovery.getByText("Saved", { exact: true })).toBeVisible();
  await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByRole("button", { name: "Sequences", exact: true }).click();
  await page.getByRole("button", { name: "Results", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Funnel and discovery", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Pain scores", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Brand & company", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reference library", exact: true }),
  ).toBeVisible();
  const references = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Reference library",
      exact: true,
    }),
  });
  await references
    .getByRole("button", { name: "Add reference", exact: true })
    .click();
  await references
    .getByRole("textbox", { name: /^Reference name/ })
    .last()
    .fill("Synthetic Consent Proof");
  const consent = references
    .getByRole("checkbox", { name: "Consent recorded", exact: true })
    .last();
  const saveReferences = async () => {
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/workspaces/${workspace}`) &&
        response.request().method() === "PATCH",
    );
    await references
      .getByRole("button", { name: "Save references", exact: true })
      .click();
    expect((await saved).ok()).toBe(true);
    await expect(
      references.getByRole("button", { name: "Save references", exact: true }),
    ).toBeEnabled();
  };
  await consent.check();
  await saveReferences();
  let savedContext = await (
    await context.request.get(`/api/workspaces/${workspace}`)
  ).json();
  expect(savedContext.workspace.company.references.at(-1)).toEqual({
    name: "Synthetic Consent Proof",
    consent: true,
  });
  await consent.uncheck();
  await saveReferences();
  savedContext = await (
    await context.request.get(`/api/workspaces/${workspace}`)
  ).json();
  expect(savedContext.workspace.company.references.at(-1).consent).toBe(false);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download SDR kit", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sdr-onboarding-kit.pdf");
  expect(await download.failure()).toBeNull();
  await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Launch checklist" }).click();
  await expect(
    page.getByRole("heading", { name: "Launch checklist", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".check-list")).toContainText(
    "An approved offer exists",
  );
  for (const language of ["ar", "en"]) {
    await page
      .getByRole("button", {
        name: language === "ar" ? "واجهة عربية" : "English interface",
        exact: true,
      })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", {
        name:
          language === "ar" ? "قائمة التحقق قبل الإطلاق" : "Launch checklist",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `.local/gtm-${language}-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `.local/gtm-${language}-desktop.png`,
      fullPage: true,
    });
  }
  expect(pageErrors).toEqual([]);
});
