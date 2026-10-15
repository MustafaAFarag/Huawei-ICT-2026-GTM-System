import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

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

test("import history groups filename revisions and shows changed fields after reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  const suffix = randomUUID()
    .replace(/[^a-z]/g, "")
    .slice(0, 12);
  const filename = `revision-${suffix}.csv`;
  const csv = (title: string) =>
    `firstName,lastName,email,company,website,title\nTester,${suffix},revision${suffix}@synthetic-demo.example,Revision ${suffix},https://example.com,${title}\n`;
  const upload = async (title: string) => {
    const response = await context.request.post(
      `/api/workspaces/${ws}/imports`,
      {
        multipart: {
          requestKey: randomUUID(),
          file: {
            name: filename,
            mimeType: "text/csv",
            buffer: Buffer.from(csv(title)),
          },
        },
      },
    );
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const first = await upload("Founder");
  const second = await upload("Finance Director");
  const detail = await (
    await context.request.get(`/api/workspaces/${ws}/imports/${second.id}`)
  ).json();
  expect(detail).toMatchObject({
    version: 2,
    previousId: first.id,
    counts: { changed: 1 },
  });
  expect(detail.outcomes[0].changes).toContainEqual({
    field: "title",
    before: "Founder",
    after: "Finance Director",
  });
  const other = me.workspaces.find((m: any) => m.workspace.id !== ws).workspace
    .id;
  expect(
    (
      await context.request.get(`/api/workspaces/${other}/imports/${second.id}`)
    ).status(),
  ).toBe(404);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  const hide = page.getByRole("button", {
    name: "Hide assistant",
    exact: true,
  });
  if (await hide.isVisible()) await hide.click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByText("Show import history", { exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: filename }).first();
  await row.getByRole("button", { name: "View import", exact: true }).click();
  const details = page.getByLabel("Import details", { exact: true });
  await expect(details).toContainText("Founder");
  await expect(details).toContainText("Finance Director");
  await page.getByRole("button", { name: "Changed rows", exact: true }).click();
  await expect(details.getByText("changed", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByText("Show import history", { exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: filename }).first(),
  ).toBeVisible();
});
