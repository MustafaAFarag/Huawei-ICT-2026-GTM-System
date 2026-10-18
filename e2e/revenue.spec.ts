import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { ToolName } from "@revenue/contracts";
const companyName = `Synthetic Test Lab ${randomUUID()
  .replace(/[0-9-]/g, "")
  .slice(0, 10)}`;
const email = `noura${randomUUID().slice(0, 8)}@synthetic-demo.example`;
async function login(page: Page) {
  // The session comes from e2e/global-setup.ts (sign-in is rate-limited).
  await page.goto("/?s=Plays");
  await expect(
    page.getByRole("heading", { name: "Campaigns", exact: true }),
  ).toBeVisible();
}
test("four plays, bilingual asset, approval invalidation, suppression and workspace isolation", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const a = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  const b = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo B",
  ).workspace.id;
  const base = `/api/workspaces/${a}`;
  await page.getByLabel("Workspace", { exact: true }).selectOption(a);
  expect(
    (
      await context.request.patch(base, {
        data: {
          plan: "Team",
          cap: 10000,
          planLimits: {
            aiCredits: 10000,
            enrichmentCredits: 1000,
            sends: 1000,
            exports: 100,
          },
          memberCaps: [{ userId: me.user.id, cap: 10000 }],
        },
      })
    ).ok(),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Brand & company", exact: true })
    .click();
  await page
    .getByLabel("I reviewed this offer; it does not claim an unverified result")
    .check();
  await page.getByLabel("Egypt electronic marketing licence recorded").check();
  await page.getByRole("button", { name: "Save company context" }).click();
  await expect(page.getByRole("status")).toContainText("Company context saved");
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  // Import is a task view: Import accounts, choose a file, match columns, review outcomes.
  await page.getByRole("button", { name: "Import accounts", exact: true }).click();
  const csv = `firstName,lastName,email,company,website,title,employees\nNoura,Demo,${email},${companyName},https://example.com,Founder,15\n`;
  await page.getByLabel("Lead file").setInputFiles({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole("button", { name: /^Import (list|\d+ rows?)$/ })
    .click();
  await expect(page.getByText("Row 2:")).toContainText("imported");
  const dashboard = await (await context.request.get(base)).json();
  const prospect = dashboard.prospects.find(
    (p: any) => p.snapshot.email === email,
  );
  expect(prospect.crmPersonId).toBeTruthy();
  await page.getByRole("button", { name: "Open accounts", exact: true }).click();
  // The list is paginated, so find the imported record by search.
  await page.getByLabel("Search accounts").fill(companyName);
  const accountRow = page
    .getByRole("row")
    .filter({ hasText: companyName })
    .last();
  await accountRow.getByRole("checkbox").check();
  await accountRow.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page
    .getByLabel("Claim", { exact: true })
    .fill(
      "Synthetic test observation: this demo company is hiring a growth manager.",
    );
  await page
    .getByLabel("I reviewed this factual claim and its dated source")
    .check();
  await page.getByRole("button", { name: "Save reviewed source" }).click();
  await expect(page.getByRole("status")).toContainText("Evidence saved");
  await page.getByRole("button", { name: "Fit & policy", exact: true }).click();
  // Imports carry no country (PRD v3.2 A3); the reviewer sets it explicitly.
  await page.locator('select[name="country"]').selectOption("EG");
  await page.getByLabel("Communication basis").selectOption("consent");
  await page.getByLabel("Consent time").fill("2026-10-13T12:00");
  await page.getByRole("button", { name: "Save policy" }).click();
  await expect(page.getByRole("status")).toContainText("Policy saved");
  // A consent basis needs recorded evidence before any contact (CMP-02); the dialog records it.
  await page.getByRole("button", { name: "Record basis evidence" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Source (URL or note)")
    .fill("Synthetic signed opt-in form, demo record 001");
  await dialog.getByLabel("Date", { exact: true }).fill("2026-10-13");
  await dialog.getByRole("button", { name: "Save evidence" }).click();
  await expect(page.getByRole("status")).toContainText("Basis evidence recorded");
  await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  async function runUi(tool: ToolName, play: string) {
    await page.getByRole("button", { name: new RegExp(`^${play} `) }).click();
    const step = page.locator(".step").filter({
      has: page.getByText(tool.replaceAll("_", " "), { exact: true }),
    });
    await step.getByRole("button", { name: "Review action" }).click();
    await expect(page.getByRole("dialog")).toContainText("credits maximum");
    const submitted = page.waitForResponse(
      (response) =>
        response.url().endsWith("/runs") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Approve cost and run" }).click();
    const response = await submitted;
    expect(response.status(), await response.text()).toBe(201);
    const created = await response.json();
    await expect
      .poll(async () => {
        const state = await (await context.request.get(base)).json();
        return state.runs.find((r: any) => r.id === created.id)?.state;
      })
      .toBe("succeeded");
    await page.reload();
    // Page refresh resets selection; reselect the same imported record.
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page.getByLabel("Search accounts").fill(companyName);
    await page
      .getByRole("row")
      .filter({ hasText: companyName })
      .last()
      .getByRole("checkbox")
      .check();
    await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  }
  await runUi("preflight", "P2");
  await runUi("score_accounts", "P1");
  await runUi("enrich_contacts", "P1");
  await runUi("draft_messages", "P1");
  let state = await (await context.request.get(base)).json();
  const draft = state.drafts.find((d: any) => d.prospectId === prospect.id);
  await page.locator(".sidebar").getByRole("button", { name: "Review", exact: true }).click();
  const review = page
    .locator("section.panel")
    .filter({ hasText: companyName })
    .first();
  await review
    .getByLabel("I reviewed all three touches and their claims")
    .check();
  await review.getByRole("button", { name: "Approve current version" }).click();
  await expect(review).toContainText("Approved");
  await page.locator(".sidebar").getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByLabel("Content language").selectOption("ar-EG");
  await runUi("make_asset", "P1");
  state = await (await context.request.get(base)).json();
  const asset = state.assets.find(
    (asset: any) => asset.prospectId === prospect.id,
  );
  expect(asset.language).toBe("ar-EG");
  expect(
    (await context.request.get(`${base}/assets/${asset.id}/pdf`)).status(),
  ).toBe(409);
  expect(
    (await context.request.get(`${base}/assets/${asset.id}/png`)).status(),
  ).toBe(409);
  await page.getByRole("button", { name: "Deliverables", exact: true }).click();
  // Deliverables is a list; a row opens the canvas with the sandboxed preview.
  const row = page.locator(".row").filter({ hasText: companyName }).first();
  await row.click();
  const canvas = page.locator(".artifact-canvas");
  const frame = page.frameLocator(".artifact-canvas iframe");
  const previewResponse = await context.request.get(
    `${base}/assets/${asset.id}/html`,
  );
  expect(previewResponse.headers()["content-security-policy"]).toContain(
    "sandbox",
  );
  expect(previewResponse.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'self'",
  );
  await expect(canvas.locator("iframe")).toHaveAttribute("sandbox", "");
  await expect(
    frame.getByRole("heading", { name: "فكرة تساعد فريقك ينمو" }),
  ).toBeVisible();
  const assetApproval = context.waitForEvent("response", {
    predicate: (response) =>
      response.url().endsWith(`${base}/assets/${asset.id}/approve`) &&
      response.request().method() === "POST",
  });
  await canvas.getByRole("button", { name: "Approve", exact: true }).click();
  expect((await assetApproval).ok()).toBe(true);
  const pdf = await context.request.get(`${base}/assets/${asset.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  const png = await context.request.get(`${base}/assets/${asset.id}/png`);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toContain("image/png");
  expect((await png.body()).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const imageDownload = page.waitForEvent("download");
  await canvas.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await imageDownload).suggestedFilename()).toBe(
    "offer-one-pager-ar-EG.png",
  );
  await canvas.getByRole("button", { name: "Close preview" }).click();
  await expect(page.getByText("Action needs attention")).toHaveCount(0);
  // Asset assignment is versioned, then current copy is approved again.
  expect(
    (
      await context.request.post(`${base}/drafts/${draft.id}/asset`, {
        data: { assetId: asset.id, version: draft.version },
      })
    ).status(),
  ).toBe(201);
  state = await (await context.request.get(base)).json();
  const revision = state.drafts.find((d: any) => d.id === draft.id);
  expect(revision.approvedVersion).toBeNull();
  expect(
    (
      await context.request.post(`${base}/drafts/${draft.id}/approve`, {
        data: { version: revision.version },
      })
    ).status(),
  ).toBe(201);
  async function runApi(tool: ToolName, extra = {}) {
    const input = {
      tool,
      requestKey: randomUUID(),
      prospectIds: [prospect.id],
      ...extra,
    };
    const quote = await (
      await context.request.post(`${base}/quotes`, { data: input })
    ).json();
    expect(
      (
        await context.request.post(`${base}/quotes/${quote.id}/approve`)
      ).status(),
    ).toBe(201);
    const response = await context.request.post(`${base}/runs`, {
      data: { ...input, spendApprovalId: quote.id },
    });
    expect(response.status()).toBe(201);
    const run = await response.json();
    await expect
      .poll(
        async () =>
          (await (await context.request.get(base)).json()).runs.find(
            (r: any) => r.id === run.id,
          )?.state,
      )
      .toBe("succeeded");
  }
  await runApi("queue_sequence", {
    draftIds: [draft.id],
    prospectIds: [],
    holdoutPercent: 20,
  });
  state = await (await context.request.get(base)).json();
  const sequence = state.sequences.find((s: any) => s.draftId === draft.id);
  expect(sequence.state).toBe("simulated");
  const reply = {
    id: randomUUID(),
    sequenceId: sequence.id,
    kind: "replied",
    occurredAt: new Date().toISOString(),
  };
  expect(
    (
      await context.request.post(`${base}/events/simulate`, { data: reply })
    ).status(),
  ).toBe(201);
  expect(
    (
      await (
        await context.request.post(`${base}/events/simulate`, { data: reply })
      ).json()
    ).duplicate,
  ).toBe(true);
  expect(
    (
      await context.request.post(`${base}/events/simulate`, {
        data: {
          id: randomUUID(),
          sequenceId: sequence.id,
          kind: "delivered",
          occurredAt: new Date(Date.now() - 10000).toISOString(),
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await (await context.request.get(base)).json()).sequences.find(
      (s: any) => s.id === sequence.id,
    ).state,
  ).toBe("cancelled");
  await runApi("find_signals", { play: "P3" });
  await runApi("mini_audit", { play: "P4" });
  state = await (await context.request.get(base)).json();
  expect(
    state.drafts.find((d: any) => d.id === draft.id).approvedVersion,
  ).toBeNull();
  expect(
    state.assets.find((current: any) => current.id === asset.id).approvedAt,
  ).toBeNull();
  expect(
    (await context.request.get(`${base}/assets/${asset.id}/png`)).status(),
  ).toBe(409);
  const researched = state.prospects.find((p: any) => p.id === prospect.id);
  expect(
    (
      await context.request.patch(`${base}/prospects/${prospect.id}`, {
        data: {
          evidence: researched.evidence.map((e: any) => ({
            ...e,
            approved: true,
          })),
        },
      })
    ).ok(),
  ).toBe(true);
  for (const play of ["P3", "P4"]) {
    await runApi("draft_messages", {
      play,
      language: play === "P4" ? "ar-EG" : "en",
    });
    await runApi("make_asset", {
      play,
      language: play === "P4" ? "ar-EG" : "en",
      template: play === "P4" ? "mini-audit" : "offer-one-pager",
    });
    state = await (await context.request.get(base)).json();
    const produced = state.assets.find(
      (current: any) => current.prospectId === prospect.id,
    );
    expect(
      (
        await context.request.post(`${base}/assets/${produced.id}/approve`)
      ).ok(),
    ).toBe(true);
    expect(
      (await context.request.get(`${base}/assets/${produced.id}/pdf`)).status(),
    ).toBe(200);
    expect(
      state.drafts.find((d: any) => d.prospectId === prospect.id).content,
    ).toHaveLength(3);
  }
  const lastAsset = state.assets.find(
    (current: any) => current.prospectId === prospect.id,
  );
  const failedQuoteInput = {
    tool: "draft_messages",
    requestKey: randomUUID(),
    prospectIds: [prospect.id],
    play: "P4",
  };
  const unreviewed = researched.evidence.map((e: any) => ({
    ...e,
    approved: false,
  }));
  await context.request.patch(`${base}/prospects/${prospect.id}`, {
    data: { evidence: unreviewed },
  });
  const failedQuote = await (
    await context.request.post(`${base}/quotes`, { data: failedQuoteInput })
  ).json();
  await context.request.post(`${base}/quotes/${failedQuote.id}/approve`);
  const failed = await (
    await context.request.post(`${base}/runs`, {
      data: { ...failedQuoteInput, spendApprovalId: failedQuote.id },
    })
  ).json();
  await expect
    .poll(
      async () =>
        (await (await context.request.get(base)).json()).runs.find(
          (r: any) => r.id === failed.id,
        )?.state,
    )
    .toBe("failed");
  state = await (await context.request.get(base)).json();
  expect(state.runs.find((r: any) => r.id === failed.id).error).toContain(
    "Review every factual claim",
  );
  expect(state.runs.find((r: any) => r.id === failed.id).actualCost).toBe(0);
  expect(
    state.assets.find((current: any) => current.id === lastAsset.id).approvedAt,
  ).toBeNull();
  expect(
    (
      await context.request.post(`/api/workspaces/${b}/quotes`, {
        data: {
          tool: "score_accounts",
          requestKey: randomUUID(),
          prospectIds: [prospect.id],
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await context.request.get(`/api/workspaces/${b}/assets/${asset.id}/html`)
    ).status(),
  ).toBe(404);
  const chatText = `Research next step ${randomUUID().slice(0, 8)}`;
  expect(
    (
      await context.request.post(`${base}/chat`, {
        data: {
          content: chatText,
          context: { play: "P3", prospectIds: [prospect.id] },
        },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(page.getByText(chatText, { exact: true })).toBeVisible();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("XLSX mapped import retries keep one native person and changed snapshots invalidate reviews", async ({
  page,
  context,
}) => {
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  const base = `/api/workspaces/${ws}`;
  const buffer = await readFile("fixtures/leads.xlsx"),
    requestKey = randomUUID();
  const multipart = {
    file: {
      name: "leads.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    },
    requestKey,
    mapping: JSON.stringify({
      firstName: "given_name",
      lastName: "family_name",
      email: "contact_email",
      company: "firm",
      website: "site",
      title: "role",
      employees: "headcount",
    }),
  };
  const result = await context.request.post(`${base}/imports`, { multipart });
  expect(result.status()).toBe(200);
  expect((await result.json()).outcomes[0].state).toBe("imported");
  const one = (await (await context.request.get(base)).json()).prospects.find(
    (p: any) => p.snapshot.email === "sami-xlsx@synthetic-demo.example",
  );
  expect(
    (await context.request.post(`${base}/imports`, { multipart })).ok(),
  ).toBe(true);
  const two = (await (await context.request.get(base)).json()).prospects.filter(
    (p: any) => p.snapshot.email === "sami-xlsx@synthetic-demo.example",
  );
  expect(two).toHaveLength(1);
  expect(two[0].crmPersonId).toBe(one.crmPersonId);
  expect(
    (
      await context.request.post(`${base}/imports`, {
        multipart: { ...multipart, mapping: "{}" },
      })
    ).status(),
  ).toBe(400);
});

test("a delayed previous-workspace response cannot replace the selected workspace", async ({
  page,
  context,
}) => {
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const a = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo A",
  ).workspace.id;
  const b = me.workspaces.find(
    (m: any) => m.workspace.name === "Revenue Demo B",
  ).workspace.id;
  await page.getByLabel("Workspace", { exact: true }).selectOption(b);
  await expect(page.locator(".topbar")).toContainText("Revenue Demo B");
  let release!: () => void;
  let captured!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const intercepted = new Promise<void>((resolve) => {
    captured = resolve;
  });
  await page.route(`**/api/workspaces/${a}`, async (route) => {
    const response = await route.fetch();
    captured();
    await delayed;
    await route.fulfill({ response });
  });
  try {
    await page.getByLabel("Workspace", { exact: true }).selectOption(a);
    await intercepted;
    await page.getByLabel("Workspace", { exact: true }).selectOption(b);
    await expect(page.locator(".topbar")).toContainText("Revenue Demo B");
    const completed = page.waitForResponse((response) =>
      response.url().endsWith(`/api/workspaces/${a}`),
    );
    release();
    await (await completed).finished();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.locator(".topbar")).toContainText("Revenue Demo B");
    await expect(page.getByLabel("Workspace", { exact: true })).toHaveValue(b);
  } finally {
    release();
    await page.unroute(`**/api/workspaces/${a}`);
  }
});
