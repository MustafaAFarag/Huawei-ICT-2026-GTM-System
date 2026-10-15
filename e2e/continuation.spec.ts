import { test, expect } from "@playwright/test";

test("interview guides show bilingual questions and export PDFs without inventing answers", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Qimam People")
    .workspace.id;
  const state = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  const prospect = state.prospects.find((p: any) => !p.excluded);
  const base = `/api/workspaces/${ws}/prospects/${prospect.id}/discovery-guide`;
  for (const language of ["en", "ar"]) {
    const response = await context.request.get(`${base}?language=${language}`);
    expect(response.ok()).toBe(true);
    const guide = await response.json();
    expect(guide.language).toBe(language);
    expect(guide.questions).toHaveLength(8);
    expect(guide.method).toBe("reviewed-context-template");
    expect(guide.company).toBe(prospect.snapshot.company);
    const pdf = await context.request.get(
      `${base}?language=${language}&format=pdf`,
    );
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  }
  const other = me.workspaces.find((m: any) => m.workspace.id !== ws).workspace
    .id;
  expect(
    (
      await context.request.get(
        `/api/workspaces/${other}/prospects/${prospect.id}/discovery-guide`,
      )
    ).status(),
  ).toBe(404);
  const after = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  expect(
    after.prospects.find((p: any) => p.id === prospect.id).snapshot,
  ).toEqual(prospect.snapshot);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  const hide = page.getByRole("button", {
    name: "Hide assistant",
    exact: true,
  });
  if (await hide.isVisible()) await hide.click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByLabel("Search accounts").fill(prospect.snapshot.company);
  const row = page
    .getByRole("row")
    .filter({
      hasText: `${prospect.snapshot.firstName} ${prospect.snapshot.lastName}`,
    })
    .first();
  await row.getByRole("button", { name: "Open", exact: true }).click();
  await page
    .getByRole("button", { name: "Prepare interview guide", exact: true })
    .click();
  await expect(
    page.getByText("Interview questions", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Guide language", { exact: true }).selectOption("ar");
  await page
    .getByRole("button", { name: "Prepare interview guide", exact: true })
    .click();
  await expect(
    page.getByText("الخطوة التالية بإذن", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download interview PDF", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("discovery-guide-ar.pdf");
});
