import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Workspace state with at least one account. A freshly seeded database has none in
// Revenue Demo B, so import one synthetic account and the specs no longer depend on run order.
async function accountState(context: import("@playwright/test").BrowserContext, ws: string) {
  const read = async () => (await context.request.get(`/api/workspaces/${ws}`)).json();
  const state = await read();
  if (state.prospects.some((p: any) => !p.excluded)) return state;
  const suffix = randomUUID().replace(/[^a-z]/g, "").slice(0, 12);
  const imported = await context.request.post(`/api/workspaces/${ws}/imports`, {
    multipart: {
      requestKey: randomUUID(),
      file: {
        name: `seed-${suffix}.csv`,
        mimeType: "text/csv",
        buffer: Buffer.from(
          `firstName,lastName,email,company,website,title\nSeed,${suffix},seed${suffix}@synthetic-demo.example,Seed ${suffix},https://example.com,Founder\n`,
        ),
      },
    },
  });
  expect(imported.ok()).toBe(true);
  return read();
}

test("research brief exports the saved source record and holds unsaved edits", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Qimam People")
    .workspace.id;
  const state = await accountState(context, ws);
  const prospect = state.prospects.find((p: any) => !p.excluded);
  const path = `/api/workspaces/${ws}/prospects/${prospect.id}/research-brief`;
  const brief = await (await context.request.get(path)).json();
  expect(brief.facts).toEqual(
    prospect.evidence.filter(
      (item: any) =>
        item.kind === "fact" &&
        item.approved &&
        /^https?:\/\//i.test(item.url) &&
        Number.isFinite(Date.parse(item.date)) &&
        item.claim.trim(),
    ),
  );
  expect(brief.hypotheses).toEqual(
    prospect.evidence.filter((item: any) => item.kind === "hypothesis"),
  );
  for (const language of ["en", "ar"]) {
    const pdf = await context.request.get(
      `${path}?language=${language}&format=pdf`,
    );
    expect(pdf.ok()).toBe(true);
    expect(pdf.headers()["cache-control"]).toBe("private, no-store");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  }
  const other = me.workspaces.find((m: any) => m.workspace.id !== ws).workspace
    .id;
  expect(
    (
      await context.request.get(
        `/api/workspaces/${other}/prospects/${prospect.id}/research-brief`,
      )
    ).status(),
  ).toBe(404);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  const hide = page.getByRole("button", {
    name: "Hide assistant",
    exact: true,
  });
  if (await hide.isVisible()) await hide.click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByLabel("Search accounts").fill(prospect.snapshot.company);
  await page
    .getByRole("row")
    .filter({
      hasText: `${prospect.snapshot.firstName} ${prospect.snapshot.lastName}`,
    })
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page.getByLabel("Brief language", { exact: true }).selectOption("ar");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download research brief", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("research-brief-ar.pdf");
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download research brief", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Save source changes before exporting the research brief.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("call logging supports manual review and discards stale AI suggestions", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo B",
  ).workspace.id;
  const state = await accountState(context, ws);
  const prospect = state.prospects.find((p: any) => !p.excluded);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  const hide = page.getByRole("button", {
    name: "Hide assistant",
    exact: true,
  });
  if (await hide.isVisible()) await hide.click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByLabel("Search accounts").fill(prospect.snapshot.company);
  await page
    .getByRole("row")
    .filter({
      hasText: `${prospect.snapshot.firstName} ${prospect.snapshot.lastName}`,
    })
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page.getByRole("tab", { name: "Calls", exact: true }).click();
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Log a call outcome",
      exact: true,
    }),
  });
  const note = panel.getByRole("textbox").first();
  await note.fill(
    "Called the synthetic contact. Asked to call back in two days.",
  );
  await panel
    .getByRole("button", { name: "Log manually", exact: true })
    .click();
  await expect(panel.getByLabel("Call summary", { exact: true })).toContainText(
    "Called the synthetic",
  );
  await note.fill(
    "Revised synthetic call note: callback in two days, no meeting booked.",
  );
  await expect(
    panel.getByRole("button", { name: "Confirm and save", exact: true }),
  ).toHaveCount(0);
  let finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/call-outcome/suggest", async (route) => {
    await held;
    await route.fulfill({
      json: {
        outcome: "meeting-booked",
        nextStep: "Stale suggestion",
        followUpDays: null,
        summary: "Stale note",
      },
    });
  });
  await panel
    .getByRole("button", { name: "Suggest outcome", exact: true })
    .click();
  await note.fill("Latest synthetic call note: call back in two days.");
  finish();
  await page.unrouteAll({ behavior: "wait" });
  await expect(
    panel.getByRole("button", { name: "Confirm and save", exact: true }),
  ).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Log manually", exact: true })
    .click();
  await panel.getByRole("button", { name: "call back", exact: true }).click();
  await panel
    .getByLabel("Call summary", { exact: true })
    .fill("Confirmed synthetic callback; no meeting booked.");
  await panel.getByLabel("Follow-up after (days)", { exact: true }).fill("2");
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/prospects/${prospect.id}/call-outcome`) &&
      response.request().method() === "POST",
  );
  await panel
    .getByRole("button", { name: "Confirm and save", exact: true })
    .click();
  expect((await saved).ok()).toBe(true);
  await expect(
    panel.getByRole("button", { name: "Confirm and save", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Call outcome saved to this workspace.", { exact: true }),
  ).toBeVisible();
});

test("interview guides show bilingual questions and export PDFs without inventing answers", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Qimam People")
    .workspace.id;
  const state = await accountState(context, ws);
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
  await page.getByRole("tab", { name: "Discovery", exact: true }).click();
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
  await page.goto("/?s=Plays");
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
  await page.getByText("Import a lead list", { exact: true }).first().click();
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
  await page.getByText("Import a lead list", { exact: true }).first().click();
  await page.getByText("Show import history", { exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: filename }).first(),
  ).toBeVisible();
});

test("recurring plays persist a due review and require cost approval before execution", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  const before = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  const prospect = before.prospects.find((p: any) => !p.excluded);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  const hide = page.getByRole("button", {
    name: "Hide assistant",
    exact: true,
  });
  if (await hide.isVisible()) await hide.click();
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search accounts" })
    .fill(prospect.snapshot.email);
  await page
    .getByRole("row")
    .filter({ hasText: prospect.snapshot.firstName })
    .first()
    .getByRole("checkbox")
    .check();
  await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByText("Scheduled reviews", { exact: true }).click();
  await page.getByText("Schedule this play", { exact: true }).click();
  const name = `Synthetic scheduled review ${randomUUID().slice(0, 8)}`;
  await page.getByLabel("Schedule name", { exact: true }).fill(name);
  await page
    .getByLabel("Scheduled step", { exact: true })
    .selectOption("draft_messages");
  const next = new Date(Date.now() + 3000);
  const local = new Date(next.getTime() - next.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
  await page
    .getByLabel("First review (your local time)", { exact: true })
    .fill(local);
  await page
    .getByRole("button", { name: "Save recurring review", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Schedule saved");
  let review: any;
  await expect
    .poll(
      async () => {
        const rows = await (
          await context.request.get(`/api/workspaces/${ws}/scheduled-reviews`)
        ).json();
        review = rows.find((r: any) => r.name === name);
        return Boolean(review);
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const scheduled = await (
    await context.request.get(`/api/workspaces/${ws}/schedules`)
  ).json();
  const schedule = scheduled.find((s: any) => s.name === name);
  await context.request.patch(
    `/api/workspaces/${ws}/schedules/${schedule.id}`,
    { data: { enabled: false } },
  );
  await page.locator(".sidebar").getByRole("button", { name: "Review", exact: true }).click();
  const item = page.locator(".selection-bar").filter({ hasText: name });
  await item
    .getByRole("button", { name: "Review scheduled action", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("credits maximum");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const after = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  expect(after.runs.length).toBe(before.runs.length);
  // The workspace budget row exists only after spending or a cap change; absent means 0 used.
  const used = (state: any) =>
    state.budgets.find((b: any) => !b.userId)?.used ?? 0;
  expect(used(after)).toBe(used(before));
  await page.reload();
  await page.locator(".sidebar").getByRole("button", { name: "Review", exact: true }).click();
  const persisted = page.locator(".selection-bar").filter({ hasText: name });
  await expect(persisted).toBeVisible();
  await persisted
    .getByRole("button", { name: "Dismiss review", exact: true })
    .click();
  await expect(
    page.locator(".selection-bar").filter({ hasText: name }),
  ).toHaveCount(0);
});
