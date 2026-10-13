import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { ToolName } from "@revenue/contracts";
const email = `noura-${randomUUID().slice(0, 8)}@synthetic-demo.example`;
async function login(page: Page) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(process.env.DEMO_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Plays", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide assistant" }).click();
}
test("four plays, bilingual asset, approval invalidation, suppression and workspace isolation", async ({
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
  const base = `/api/workspaces/${a}`;
  await page
    .getByRole("button", { name: "Company context", exact: true })
    .click();
  await page
    .getByLabel("I reviewed this offer; it does not claim an unverified result")
    .check();
  await page.getByLabel("Egypt electronic marketing licence recorded").check();
  await page.getByRole("button", { name: "Save company context" }).click();
  await expect(page.getByRole("status")).toContainText("Company context saved");
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  const csv = `firstName,lastName,email,company,website,title,employees\nNoura,Demo,${email},Synthetic Test Lab,https://example.com,Founder,15\n`;
  await page.getByLabel("Lead file").setInputFiles({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Import list", exact: true }).click();
  await expect(page.getByText("Row 2:")).toContainText("imported");
  const dashboard = await (await context.request.get(base)).json();
  const prospect = dashboard.prospects.find(
    (p: any) => p.snapshot.email === email,
  );
  expect(prospect.crmPersonId).toBeTruthy();
  const row = page.getByRole("row").filter({ hasText: email }); // email is in the review screen, use selected name below.
  const accountRow = page
    .getByRole("row")
    .filter({ hasText: "Synthetic Test Lab" })
    .last();
  await accountRow.getByRole("checkbox").check();
  await accountRow.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page
    .getByLabel("Claim", { exact: true })
    .fill(
      "Synthetic test observation: this demo company is hiring a growth manager.",
    );
  await page
    .getByLabel("I reviewed this factual claim and its dated source")
    .check();
  await page.getByLabel("Communication basis").selectOption("consent");
  await page.getByLabel("Consent time").fill("2026-10-13T12:00");
  await page.getByRole("button", { name: "Save evidence and policy" }).click();
  await expect(page.getByRole("status")).toContainText("Evidence saved");
  await page.getByRole("button", { name: "Plays", exact: true }).click();
  async function runUi(tool: ToolName, play: string) {
    await page.getByRole("button", { name: new RegExp(`^${play} `) }).click();
    const step = page.locator(".step").filter({
      has: page.getByText(tool.replaceAll("_", " "), { exact: true }),
    });
    await step.getByRole("button", { name: "Review action" }).click();
    await expect(page.getByRole("dialog")).toContainText("credits maximum");
    await page.getByRole("button", { name: "Approve cost and run" }).click();
    await expect
      .poll(async () => {
        const state = await (await context.request.get(base)).json();
        return state.runs.find((r: any) => r.tool === tool)?.state;
      })
      .toBe("succeeded");
    await page.reload();
    await page
      .getByRole("button", { name: "Hide assistant", exact: true })
      .click();
    await page.getByLabel("Select Noura").last().count();
    // Page refresh resets selection; reselect the same imported record.
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page
      .getByRole("row")
      .filter({ hasText: "Synthetic Test Lab" })
      .last()
      .getByRole("checkbox")
      .check();
    await page.getByRole("button", { name: "Plays", exact: true }).click();
  }
  await runUi("preflight", "P2");
  await runUi("score_accounts", "P1");
  await runUi("enrich_contacts", "P1");
  await runUi("draft_messages", "P1");
  let state = await (await context.request.get(base)).json();
  const draft = state.drafts.find((d: any) => d.prospectId === prospect.id);
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  const review = page
    .locator("section.panel")
    .filter({ hasText: "Synthetic Test Lab" })
    .first();
  await review
    .getByLabel("I reviewed all three touches and their claims")
    .check();
  await review.getByRole("button", { name: "Approve current version" }).click();
  await expect(review).toContainText("Approved");
  await page.getByRole("button", { name: "Plays", exact: true }).click();
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
  await page.getByRole("button", { name: "Asset Studio", exact: true }).click();
  const card = page
    .locator(".asset-card")
    .filter({ hasText: "Synthetic Test Lab" })
    .first();
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "فكرة تساعد فريقك ينمو" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  const pdf = await context.request.get(`${base}/assets/${asset.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
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
  await runApi("find_signals", { play: "P3" });
  await runApi("mini_audit", { play: "P4" });
  state = await (await context.request.get(base)).json();
  expect(
    state.drafts.find((d: any) => d.id === draft.id).approvedVersion,
  ).toBeNull();
  expect(state.assets.find((asset: any) => asset.id === asset.id)).toBeTruthy();
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
  await page.reload();
  await page
    .getByRole("button", { name: "Hide assistant", exact: true })
    .click();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
