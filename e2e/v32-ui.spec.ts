import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Keep the working browser runs text-only. Final review captures are taken separately.
test.use({
  screenshot: "off",
  trace: "off",
  actionTimeout: 10_000,
  navigationTimeout: 30_000,
});

// Black-box acceptance: only documented endpoints and rendered accessible UI.
// Run against the isolated fixture database, never a live provider environment.
async function workspace(page: Page, context: BrowserContext) {
  await page.goto("/");
  const response = await context.request.get("/api/me");
  expect(response.ok()).toBe(true);
  const me = await response.json();
  console.log("Seeded workspaces:", JSON.stringify(me.workspaces.map((item: any) => item.workspace.name)));
  const membership = me.workspaces.find(
    (item: any) => item.workspace.name === "Qimam People",
  );
  expect(membership, "The synthetic Qimam People workspace must be seeded").toBeTruthy();
  const ws = membership.workspace.id as string;
  const workspacePicker = page.getByLabel("Workspace", { exact: true });
  await workspacePicker.selectOption(ws);
  await expect(workspacePicker).toHaveValue(ws);
  const hide = page.getByRole("button", { name: "Hide assistant", exact: true });
  if (await hide.isVisible()) await hide.click();
  return { ws, base: `/api/workspaces/${ws}`, me };
}

async function importAccounts(context: BrowserContext, base: string, count = 2) {
  const suffix = randomUUID().replace(/[^a-z]/g, "").slice(0, 10);
  const accounts = Array.from({ length: count }, (_, index) => ({
    email: `v32${suffix}${index}@synthetic-demo.example`,
    company: `Synthetic V32 ${suffix} ${index}`,
  }));
  const imported = await context.request.post(`${base}/imports`, {
    multipart: {
      requestKey: randomUUID(),
      file: {
        name: `v32-${suffix}.csv`,
        mimeType: "text/csv",
        buffer: Buffer.from(
          "firstName,lastName,email,company,website,title,employees\n" +
            accounts.map((account, index) =>
              `Synthetic,Tester${index},${account.email},${account.company},https://example.com,Founder,15\n`,
            ).join(""),
        ),
      },
    },
  });
  const importBody = await imported.text();
  let importOutcome: unknown = importBody;
  try {
    importOutcome = JSON.parse(importBody);
  } catch {}
  console.log("Import response row outcomes:", JSON.stringify(importOutcome));
  expect(imported.status(), importBody).toBe(200);
  const state = await (await context.request.get(base)).json();
  const persisted = accounts.map((account) => {
    const prospect = state.prospects.find((item: any) => item.snapshot.email === account.email);
    expect(prospect, `Import must persist ${account.email}`).toBeTruthy();
    return prospect;
  });
  console.log("Persisted import CRM links:", JSON.stringify(persisted.map((item: any) => ({
    email: item.snapshot.email,
    crmPersonId: item.crmPersonId,
  }))));
  return persisted;
}

async function openAccount(page: Page, prospect: any) {
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search accounts", exact: true }).fill(prospect.snapshot.email);
  // Email is searchable but the rendered row identifies the account by its displayed company.
  const row = page.getByRole("row").filter({ hasText: prospect.snapshot.company });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Open", exact: true }).click();
}

async function accountTab(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Account detail" })
    .getByRole("button", { name, exact: true }).click();
}

async function savePolicy(page: Page, id: string) {
  const saved = page.waitForResponse((response) =>
    response.url().endsWith(`/prospects/${id}`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save policy", exact: true }).click();
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: /policy saved/i }))
    .toContainText(/policy saved/i);
}

async function saveBasisEvidenceDialog(page: Page, id: string) {
  const dialog = page.getByRole("dialog");
  const saved = page.waitForResponse((response) =>
    response.url().includes(`/prospects/${id}`) &&
    ["POST", "PATCH"].includes(response.request().method()),
  );
  await dialog.getByRole("button", { name: "Save evidence", exact: true }).click();
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
}

async function recordBasisEvidence(page: Page, id: string, values: {
  basis: "Consent" | "Relationship";
  source: string;
  date: string;
  actor: { id: string; name: string };
  consentTimestamp?: string;
}) {
  await page.getByRole("button", { name: "Record basis evidence", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: values.basis, exact: true }).click();
  await dialog.getByLabel("Source (URL or note)", { exact: true }).fill(values.source);
  await dialog.getByLabel("Date", { exact: true }).fill(values.date);
  const recorder = dialog.getByLabel("Recorded by", { exact: true });
  await expect(recorder).not.toBeEditable();
  await expect(recorder).toHaveValue(`${values.actor.name} · automatic`);
  if (values.consentTimestamp) {
    await dialog.getByLabel(/Consent timestamp/).fill(values.consentTimestamp);
  }
  await saveBasisEvidenceDialog(page, id);
  await expect(page.getByRole("status").filter({ hasText: "Basis evidence recorded" }))
    .toContainText("Basis evidence recorded");
}

async function saveClientTriage(page: Page, id: string) {
  await accountTab(page, "Triage");
  await page.getByRole("button", { name: "client", exact: true }).click();
  await page.getByRole("combobox", { name: "Segment", exact: true }).selectOption("A");
  await page.getByRole("textbox", { name: "Rationale", exact: true })
    .fill("Synthetic acceptance test prospect triage.");
  const saved = page.waitForResponse((response) =>
    response.url().endsWith(`/prospects/${id}/triage`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save triage", exact: true }).click();
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Triage saved" }))
    .toContainText("Triage saved");
}

test("A3: country and basis holds stay visible until an explicit evidence save, preserving another country", async ({ page, context }) => {
  const { base, ws, me } = await workspace(page, context);
  const [missing, saudi] = await importAccounts(context, base);
  await page.reload();
  await expect(page.getByLabel("Workspace", { exact: true })).toHaveValue(ws);
  await openAccount(page, missing);
  await accountTab(page, "Fit & policy");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("");
  await expect(page.getByText(/held/i).first()).toBeVisible();
  await expect(page.getByText(/country.*(missing|required)|set.*country/i).first()).toBeVisible();

  await page.getByLabel("Country", { exact: true }).selectOption("KW");
  await page.getByLabel("Communication basis", { exact: true }).selectOption("relationship");
  await savePolicy(page, missing.id);
  await expect(page.getByText(/country blocked/i).first()).toBeVisible();
  await page.reload();
  await openAccount(page, missing);
  await accountTab(page, "Fit & policy");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("KW");
  await expect(page.getByText(/country blocked/i).first()).toBeVisible();

  await openAccount(page, saudi);
  await accountTab(page, "Fit & policy");
  await page.getByLabel("Country", { exact: true }).selectOption("SA");
  await page.getByLabel("Communication basis", { exact: true }).selectOption("relationship");
  await savePolicy(page, saudi.id);
  await expect(page.getByText(/held/i).first()).toBeVisible();
  await expect(page.getByText(/basis evidence|evidence.*(missing|required)|record.*evidence/i).first()).toBeVisible();
  const before = await (await context.request.get(base)).json();
  const savedSaudi = before.prospects.find((item: any) => item.id === saudi.id);
  await page.getByRole("button", { name: "Record basis evidence", exact: true }).click();
  const evidenceDialog = page.getByRole("dialog");
  await evidenceDialog.getByRole("button", { name: "Relationship", exact: true }).click();
  await evidenceDialog.getByLabel("Source (URL or note)", { exact: true }).fill("Synthetic existing-client contract reference SA-001");
  await evidenceDialog.getByLabel("Date", { exact: true }).fill("2026-10-17");
  const recorder = evidenceDialog.getByLabel("Recorded by", { exact: true });
  await expect(recorder).not.toBeEditable();
  await expect(recorder).toHaveValue(`${me.user.name} · automatic`);
  // Editing the source alone must not claim the hold is resolved in persisted state.
  const unsaved = await (await context.request.get(base)).json();
  expect(unsaved.prospects.find((item: any) => item.id === saudi.id)).toEqual(savedSaudi);
  await saveBasisEvidenceDialog(page, saudi.id);
  await expect(page.getByRole("status").filter({ hasText: "Basis evidence recorded" }))
    .toContainText("Basis evidence recorded");
  const afterEvidence = await (await context.request.get(base)).json();
  expect(afterEvidence.prospects.find((item: any) => item.id === saudi.id).basisEvidence)
    .toContainEqual(expect.objectContaining({
      source: "Synthetic existing-client contract reference SA-001",
      date: "2026-10-17",
      recordedBy: me.user.id,
    }));
  await page.reload();
  await openAccount(page, saudi);
  await accountTab(page, "Fit & policy");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("SA");
  await expect(page.getByText("Synthetic existing-client contract reference SA-001", { exact: true })).toBeVisible();
  await openAccount(page, missing);
  await accountTab(page, "Fit & policy");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("KW");
  await expect(page.getByText(/country blocked/i).first()).toBeVisible();
});

test("A2: generic discovery saves without HR setup and stays usable on an Arabic phone", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { base, ws } = await workspace(page, context);
  const originalPack = (await (await context.request.get(`${base}/rubric`)).json()).pack;
  const changed = await context.request.patch(`${base}/pack`, { data: { pack: "generic" } });
  expect(changed.ok(), await changed.text()).toBe(true);
  try {
    const [account] = await importAccounts(context, base, 1);
    await page.reload();
    await expect(page.getByLabel("Workspace", { exact: true })).toHaveValue(ws);
    await openAccount(page, account);
    await accountTab(page, "Discovery");
    await expect(page.getByLabel(/HR setup|payroll/i)).toHaveCount(0);
    await expect(page.getByText(/payroll|HR setup/i)).toHaveCount(0);
    const notes = page.getByRole("textbox", { name: "Notes", exact: true });
    if (!(await notes.isVisible())) {
      await page.getByText("Capture answers from a discovery call", { exact: true }).click();
    }
    await notes.fill("Synthetic consultancy confirmed budget and decision timeline.");
    const saved = page.waitForResponse((response) =>
      response.url().includes(`/prospects/${account.id}/`) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save interview", exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByRole("status")).toContainText("Discovery answers saved");
    await page.reload();
    await openAccount(page, account);
    await accountTab(page, "Discovery");
    await expect(page.getByRole("textbox", { name: "Notes", exact: true }))
      .toHaveValue("Synthetic consultancy confirmed budget and decision timeline.");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "واجهة عربية", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByLabel(/HR setup|payroll/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    const restored = await context.request.patch(`${base}/pack`, {
      data: { pack: originalPack ?? "hr-services" },
    });
    expect(restored.ok()).toBe(true);
  }
});

test("A1: owner rubric changes persist, reset returns to the pack default, and logged-out updates are refused", async ({ page, context, playwright }) => {
  const { base } = await workspace(page, context);
  const originalResponse = await context.request.get(`${base}/rubric`);
  expect(originalResponse.ok()).toBe(true);
  const original = await originalResponse.json();
  const anonymous = await playwright.request.newContext({
    baseURL: new URL(page.url()).origin,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const anonymousRead = await anonymous.get(`${base}/rubric`);
    const anonymousState = await anonymous.storageState();
    expect(anonymousState.cookies).toHaveLength(0);
    expect(anonymousState.origins).toHaveLength(0);
    expect((await anonymous.get("/api/me")).status()).toBe(401);
    expect(anonymousRead.status()).toBe(401);
    const anonymousUpdate = await anonymous.patch(`${base}/rubric`, { data: { rubric: null } });
    expect(anonymousUpdate.status()).toBe(401);
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page.getByRole("button", { name: "Rubric", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Qualification rubric", exact: true })).toBeVisible();
    const role = page.getByLabel("Decision-maker title", { exact: true });
    const website = page.getByLabel("Company website available", { exact: true });
    const transfer = original.rubric.role.points > 0 ? 1 : -1;
    const rolePoints = original.rubric.role.points - transfer;
    const websitePoints = original.rubric.website.points + transfer;
    await role.fill(String(rolePoints));
    await website.fill(String(websitePoints));
    const keyword = `synthetic-${randomUUID().slice(0, 8)}`;
    await page.getByLabel("New title keyword", { exact: true }).fill(keyword);
    await page.getByRole("button", { name: "Add keyword", exact: true }).click();
    const save = page.waitForResponse((response) => response.url().endsWith(`${base}/rubric`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save rubric", exact: true }).click();
    expect((await save).ok()).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page.getByRole("button", { name: "Rubric", exact: true }).click();
    await expect(role).toHaveValue(String(rolePoints));
    await expect(website).toHaveValue(String(websitePoints));
    await expect(page.getByText(keyword, { exact: true })).toBeVisible();
    const saved = await (await context.request.get(`${base}/rubric`)).json();
    expect(saved.isPackDefault).toBe(false);
    expect(saved.rubric.role.points).toBe(rolePoints);
    expect(saved.rubric.role.keywords).toContain(keyword);
    const reset = page.waitForResponse((response) => response.url().endsWith(`${base}/rubric`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Reset to pack default", exact: true }).click();
    expect((await reset).ok()).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page.getByRole("button", { name: "Rubric", exact: true }).click();
    const defaults = await (await context.request.get(`${base}/rubric`)).json();
    expect(defaults.isPackDefault).toBe(true);
    expect(defaults.rubric.role.keywords).not.toContain(keyword);
    await expect(role).toHaveValue(String(defaults.rubric.role.points));
    await expect(website).toHaveValue(String(defaults.rubric.website.points));
  } finally {
    await anonymous.dispose();
    const restored = await context.request.patch(`${base}/rubric`, {
      data: { rubric: original.isPackDefault ? null : original.rubric },
    });
    expect(restored.ok()).toBe(true);
  }
});

async function fixtureAction(context: BrowserContext, base: string, tool: string, prospectIds: string[]) {
  const input = { tool, prospectIds, requestKey: randomUUID(), play: "P1", language: "en" };
  const quoted = await context.request.post(`${base}/quotes`, { data: input });
  expect(quoted.ok(), await quoted.text()).toBe(true);
  const quote = await quoted.json();
  expect((await context.request.post(`${base}/quotes/${quote.id}/approve`)).ok()).toBe(true);
  const submitted = await context.request.post(`${base}/runs`, { data: { ...input, spendApprovalId: quote.id } });
  expect(submitted.status(), await submitted.text()).toBe(201);
  const run = await submitted.json();
  await expect.poll(async () => {
    const state = await (await context.request.get(base)).json();
    const current = state.runs.find((item: any) => item.id === run.id);
    expect(current?.state === "failed", current?.error ?? "Fixture action failed").toBe(false);
    return current?.state;
  }).toBe("succeeded");
}

test("A5/A4: approved batch CSV and imported outcomes reconcile to its scorecard", async ({ page, context }, testInfo) => {
  test.setTimeout(240000);
  const { base, me, ws } = await workspace(page, context);
  const before = await (await context.request.get(base)).json();
  expect(before.fixture, "A5/A4 must use the fixture runtime").toBe(true);
  expect(before.modelFixture, "A5/A4 must use the fixture model").toBe(true);
  await expect(page.getByText(
    "Fixture demo · provider results and sequences are simulated. No live outreach.",
    { exact: true },
  )).toBeVisible();
  expect(before.workspace.company.marketingLicence).toBe(true);
  expect(before.workspace.company.references.some((item: any) => item.consent)).toBe(true);
  const originalWorkspaceBudget = before.budgets.find((item: any) => !item.userId);
  const originalPreflight = before.workspace.preflight;
  const originalMemberCaps = before.budgets
    .filter((item: any) => item.userId)
    .map((item: any) => ({ userId: item.userId, cap: item.cap }));
  let bodyFailed = false;
  try {
    // Fixture-only credit caps; the caller must source the gate fixture environment.
    const limits = await context.request.patch(base, { data: {
      plan: "Team", cap: 10000,
      planLimits: { aiCredits: 10000, enrichmentCredits: 1000, sends: 1000, exports: 100 },
      memberCaps: [{ userId: me.user.id, cap: 10000 }],
    } });
    expect(limits.ok()).toBe(true);
    await fixtureAction(context, base, "preflight", []);
    const prepared = await (await context.request.get(base)).json();
    const preparedPreflight = prepared.workspace.preflight;
    expect(preparedPreflight).toMatchObject({
      spf: true,
      dkim: true,
      dmarc: true,
      unsubscribe: true,
      simulated: true,
      warmupDays: 21,
      dailyCap: 30,
    });
    console.log("Fixture sender preflight persisted:", JSON.stringify({
      initial: originalPreflight,
      prepared: preparedPreflight,
    }));
    const [eligible, unapproved] = await importAccounts(context, base);
    // Imports use the API; refresh the app's account list before selecting those records.
    await page.reload();
    await expect(page.getByLabel("Workspace", { exact: true })).toHaveValue(ws);
    for (const account of [eligible, unapproved]) {
      await openAccount(page, account);
      await accountTab(page, "Sources");
      await page.getByRole("button", { name: "Add source", exact: true }).click();
      await page.getByLabel("Claim", { exact: true }).last().fill("Synthetic company is hiring a growth manager.");
      await page.getByLabel("I reviewed this factual claim and its dated source").last().check();
      await page.getByRole("button", { name: "Save reviewed source", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Evidence saved");
      await accountTab(page, "Fit & policy");
      await page.getByLabel("Country", { exact: true }).selectOption("EG");
      await page.getByLabel("Communication basis", { exact: true }).selectOption("consent");
      await page.getByLabel("Consent time", { exact: true }).fill("2026-10-17T12:00");
      await savePolicy(page, account.id);
      await recordBasisEvidence(page, account.id, {
        basis: "Consent",
        source: "Synthetic signed opt-in reference V32",
        date: "2026-10-17",
        actor: { id: me.user.id, name: me.user.name },
        consentTimestamp: "2026-10-17T12:00",
      });
      await saveClientTriage(page, account.id);
    }
    await fixtureAction(context, base, "score_accounts", [eligible.id, unapproved.id]);
    await fixtureAction(context, base, "enrich_contacts", [eligible.id, unapproved.id]);
    await page.reload();
    await page.getByRole("button", { name: "Accounts", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search accounts", exact: true }).fill(eligible.snapshot.email);
    await expect(page.getByRole("row").filter({ hasText: eligible.snapshot.company })).toContainText("Ready");
    await fixtureAction(context, base, "draft_messages", [eligible.id, unapproved.id]);
    const state = await (await context.request.get(base)).json();
    const approvedDraft = state.drafts.find((item: any) => item.prospectId === eligible.id);
    const otherDraft = state.drafts.find((item: any) => item.prospectId === unapproved.id);
    expect(approvedDraft).toBeTruthy();
    expect(otherDraft).toBeTruthy();
    const approved = await context.request.post(`${base}/drafts/${approvedDraft.id}/approve`, { data: { version: approvedDraft.version } });
    expect(approved.status(), await approved.text()).toBe(201);
    expect(otherDraft.approvedVersion).toBeNull();

    await page.reload();
    await page.getByRole("button", { name: "Campaigns", exact: true }).click();
    await page.getByRole("button", { name: "Sequences", exact: true }).click();
    await page.getByRole("button", { name: "Export and outcomes", exact: true }).click();
    await expect(page.getByText(eligible.snapshot.company, { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: new RegExp(unapproved.snapshot.company) })).toHaveCount(0);
    const eligibleDraft = page.getByRole("checkbox", { name: new RegExp(eligible.snapshot.company) });
    await expect(eligibleDraft).toHaveCount(1);
    await eligibleDraft.check();
    await expect(eligibleDraft).toBeChecked();
    await expect(page.getByText(/^1\s*\/\s*\d+ selected$/)).toBeVisible();
    const exported = page.waitForResponse((response) => response.url().endsWith(`${base}/exports`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Export approved batch", exact: true }).click();
    const exportResponse = await exported;
    const exportBody = await exportResponse.text();
    console.log("Export response:", JSON.stringify({ status: exportResponse.status(), body: exportBody }));
    expect(exportResponse.status(), exportBody).toBe(201);
    const exportResult = JSON.parse(exportBody);
    expect(exportResult.export, `Approved export must pass sender readiness: ${JSON.stringify(exportResult.excluded)}`)
      .toBeTruthy();
    const batch = exportResult.export;
    const batchItem = page.getByRole("listitem").filter({ hasText: batch.id.slice(0, 8) });
    await expect(batchItem).toHaveCount(1);
    const downloadLink = batchItem.getByRole("link", { name: "Download CSV", exact: true });
    await expect(downloadLink).toHaveAttribute("href", `${base}/exports/${batch.id}/file.csv`);
    const csvResponse = await context.request.get(`${base}/exports/${batch.id}/file.csv`);
    const csv = await csvResponse.text();
    console.log("Export CSV response:", JSON.stringify({ url: `${base}/exports/${batch.id}/file.csv`, status: csvResponse.status(), body: csv }));
    expect(csvResponse.ok(), `CSV ${base}/exports/${batch.id}/file.csv returned ${csvResponse.status()}: ${csv}`)
      .toBe(true);
    expect(csv).toContain(eligible.snapshot.email);
    expect(csv).not.toContain(unapproved.snapshot.email);
    expect(csv).toMatch(/approval.*digest|digest.*approval/i);
    const download = page.waitForEvent("download");
    await downloadLink.click();
    expect(await (await download).failure()).toBeNull();

    // Match a documented exported sequence identifier rather than invent an account identifier.
    const afterExport = await (await context.request.get(base)).json();
    const sequence = afterExport.sequences.find((item: any) => item.draftId === approvedDraft.id && item.batchId === batch.id);
    expect(sequence, "Export must tag its sequence with the exported batch").toBeTruthy();
    const outcomes = `sequence_id,outcome,occurred_at\n${sequence.id},replied,2026-10-18T10:00:00.000Z\nnot-a-sequence,replied,not-a-date\n`;
    const imported = page.waitForResponse((response) => response.url().endsWith(`/exports/${batch.id}/outcomes`) && response.request().method() === "POST");
    await batchItem.getByLabel("Outcomes CSV", { exact: true }).setInputFiles({ name: "v32-outcomes.csv", mimeType: "text/csv", buffer: Buffer.from(outcomes) });
    const importResponse = await imported;
    expect(importResponse.ok(), await importResponse.text()).toBe(true);
    await expect(batchItem.getByText(/v32-outcomes\.csv · 2 rows · 1 imported · 0 already imported · 1 rejected/))
      .toBeVisible();
    await expect(batchItem.getByText(/occurred_at must be a valid date/)).toBeVisible();
    await expect(batchItem).toContainText(/Needs a fix/);
    await page.getByRole("button", { name: "Results", exact: true }).click();
    await page.getByLabel(/^Batch/).selectOption(batch.id);
    await expect(page.getByLabel("Include simulated", { exact: true })).not.toBeChecked();
    const scorecardResponse = await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(batch.id)}`);
    expect(scorecardResponse.ok()).toBe(true);
    const scorecard = await scorecardResponse.json();
    expect(scorecard.stages.find((item: any) => item.stage.toLowerCase().includes("repl"))?.count).toBe(1);
    expect(scorecard.positive).toBe(0);
    expect(scorecard.replyLabels.positive).toBe(0);
    expect(scorecard.batches.find((item: any) => item.batchId === batch.id)?.sequences).toBe(1);
    // The UI must expose the actual filtered batch, not silently fall back to all batches.
    await expect(page.getByLabel(/^Batch/)).toHaveValue(batch.id);
    expect(before.sequences.some((item: any) => item.batchId === batch.id)).toBe(false);
  } catch (error) {
    bodyFailed = true;
    throw error;
  } finally {
    testInfo.setTimeout(testInfo.timeout + 30_000);
    try {
      const restored = await context.request.patch(base, { data: {
        plan: before.workspace.plan,
        cap: originalWorkspaceBudget?.cap ?? null,
        planLimits: before.workspace.planLimits,
        memberCaps: originalMemberCaps,
      }, timeout: 10_000 });
      expect(restored.ok(), await restored.text()).toBe(true);
      const afterRestore = await (await context.request.get(base, { timeout: 10_000 })).json();
      expect(afterRestore.workspace.plan).toBe(before.workspace.plan);
      expect(afterRestore.workspace.planLimits).toEqual(before.workspace.planLimits);
      expect(afterRestore.budgets.find((item: any) => !item.userId)?.cap ?? null)
        .toBe(originalWorkspaceBudget?.cap ?? null);
      expect(afterRestore.budgets.filter((item: any) => item.userId)
        .map((item: any) => ({ userId: item.userId, cap: item.cap })))
        .toEqual(originalMemberCaps);
    } catch (cleanupError) {
      if (bodyFailed) {
        console.error("A5/A4 fixture settings restore failed after the test body failed:", cleanupError);
      } else {
        throw cleanupError;
      }
    }
  }
});

test("Review search with no matches clears the selected draft and approval action", async ({ page, context }) => {
  await workspace(page, context);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve current version", exact: true })).toBeVisible();
  await page.getByLabel("Search review items…", { exact: true }).fill(`no-match-${randomUUID()}`);
  await expect(page.getByText("No items match your search.", { exact: true })).toBeVisible();
  await expect(page.getByText("Nothing to review in this list.", { exact: true })).toBeVisible();
  await expect(page.getByText("Choose a message from the queue to review it.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve current version", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Back to queue", exact: true })).toHaveCount(0);
});
