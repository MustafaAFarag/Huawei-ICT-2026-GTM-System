import { randomUUID } from "node:crypto";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { selectWorkspace } from "./workspace";

test.use({
  screenshot: "off",
  trace: "off",
  actionTimeout: 10_000,
  navigationTimeout: 30_000,
});

async function selectQimamWorkspace(page: Page, context: BrowserContext) {
  await page.goto("/");
  const meResponse = await context.request.get("/api/me");
  expect(meResponse.ok()).toBe(true);
  const me = await meResponse.json();
  const membership = me.workspaces.find(
    (item: any) => item.workspace.name === "Qimam People",
  );
  expect(membership, "The synthetic Qimam People workspace must be available").toBeTruthy();
  const ws = membership.workspace.id as string;
  await selectWorkspace(page, ws);
  const hide = page.getByRole("button", { name: "Hide assistant", exact: true });
  if (await hide.isVisible()) await hide.click();
  return { ws, base: `/api/workspaces/${ws}`, user: me.user };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function runFixtureAction(context: BrowserContext, base: string, input: Record<string, unknown>) {
  const action = { requestKey: randomUUID(), ...input };
  const quoteResponse = await context.request.post(`${base}/quotes`, { data: action });
  expect(quoteResponse.status(), await quoteResponse.text()).toBe(201);
  const quote = await quoteResponse.json();
  const approval = await context.request.post(`${base}/quotes/${quote.id}/approve`);
  expect(approval.ok(), await approval.text()).toBe(true);
  const submitted = await context.request.post(`${base}/runs`, {
    data: { ...action, spendApprovalId: quote.id },
  });
  expect(submitted.status(), await submitted.text()).toBe(201);
  const run = await submitted.json();
  await expect.poll(async () => {
    const state = await (await context.request.get(base)).json();
    const current = state.runs.find((item: any) => item.id === run.id);
    expect(current?.state === "failed", current?.error ?? "Fixture action failed").toBe(false);
    return current?.state;
  }, { timeout: 60_000 }).toBe("succeeded");
  const state = await (await context.request.get(base)).json();
  return state.runs.find((item: any) => item.id === run.id);
}

async function importAccounts(context: BrowserContext, base: string) {
  const suffix = randomUUID().replace(/[^a-z]/g, "").slice(0, 10);
  const accounts = Array.from({ length: 2 }, (_, index) => ({
    email: `v32${suffix}${index}@synthetic-demo.example`,
    company: `Synthetic V32 ${suffix} ${index}`,
  }));
  const imported = await context.request.post(`${base}/imports`, {
    multipart: {
      requestKey: randomUUID(),
      file: {
        name: `v32-profile-${suffix}.csv`,
        mimeType: "text/csv",
        buffer: Buffer.from(
          "firstName,lastName,email,company,website,title,employees\n" +
            accounts.map((account, index) =>
              `Synthetic,Profile${index},${account.email},${account.company},https://example.com,Founder,15\n`,
            ).join(""),
        ),
      },
    },
  });
  const body = await imported.text();
  expect(imported.status(), body).toBe(200);
  const state = await (await context.request.get(base)).json();
  return accounts.map((account) => {
    const prospect = state.prospects.find((item: any) => item.snapshot.email === account.email);
    expect(prospect, `Import must persist ${account.email}`).toBeTruthy();
    return prospect;
  });
}

async function openAccount(page: Page, prospect: any) {
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search accounts", exact: true }).fill(prospect.snapshot.email);
  const row = page.getByRole("row").filter({ hasText: prospect.snapshot.company });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Open", exact: true }).click();
}

async function accountTab(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Account detail" })
    .getByRole("button", { name, exact: true }).click();
}

async function prepareAssignmentAccount(page: Page, context: BrowserContext, base: string, user: any, prospect: any) {
  await openAccount(page, prospect);
  await accountTab(page, "Sources");
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Claim", { exact: true }).last().fill("Synthetic company is hiring a growth manager.");
  await page.getByLabel("I reviewed this factual claim and its dated source").last().check();
  const evidenceSaved = page.waitForResponse((response) =>
    response.url().includes(`/prospects/${prospect.id}`) &&
      ["POST", "PATCH"].includes(response.request().method()),
  );
  await page.getByRole("button", { name: "Save reviewed source", exact: true }).click();
  const evidenceResponse = await evidenceSaved;
  expect(evidenceResponse.ok(), await evidenceResponse.text()).toBe(true);
  await expect(page.getByRole("status")).toContainText("Evidence saved");

  await accountTab(page, "Fit & policy");
  await page.getByLabel("Country", { exact: true }).selectOption("EG");
  await page.getByLabel("Communication basis", { exact: true }).selectOption("consent");
  await page.getByLabel("Consent time", { exact: true }).fill("2026-10-17T12:00");
  const policySaved = page.waitForResponse((response) =>
    response.url().endsWith(`/prospects/${prospect.id}`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save policy", exact: true }).click();
  const policyResponse = await policySaved;
  expect(policyResponse.ok(), await policyResponse.text()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: /policy saved/i })).toContainText(/policy saved/i);

  await page.getByRole("button", { name: "Record basis evidence", exact: true }).click();
  const evidenceDialog = page.getByRole("dialog");
  await evidenceDialog.getByRole("button", { name: "Consent", exact: true }).click();
  await evidenceDialog.getByLabel("Source (URL or note)", { exact: true })
    .fill("Synthetic signed opt-in reference V32 capability-profile test");
  await evidenceDialog.getByLabel("Date", { exact: true }).fill("2026-10-17");
  const recorder = evidenceDialog.getByLabel("Recorded by", { exact: true });
  await expect(recorder).not.toBeEditable();
  await expect(recorder).toHaveValue(`${user.name} · automatic`);
  await evidenceDialog.getByLabel(/Consent timestamp/).fill("2026-10-17T12:00");
  const basisSaved = page.waitForResponse((response) =>
    response.url().includes(`/prospects/${prospect.id}`) &&
      ["POST", "PATCH"].includes(response.request().method()),
  );
  await evidenceDialog.getByRole("button", { name: "Save evidence", exact: true }).click();
  const basisResponse = await basisSaved;
  expect(basisResponse.ok(), await basisResponse.text()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Basis evidence recorded" }))
    .toContainText("Basis evidence recorded");

  await accountTab(page, "Triage");
  await page.getByRole("button", { name: "client", exact: true }).click();
  await page.getByRole("combobox", { name: "Segment", exact: true }).selectOption("A");
  await page.getByRole("textbox", { name: "Rationale", exact: true })
    .fill("Synthetic capability profile assignment test account.");
  const triageSaved = page.waitForResponse((response) =>
    response.url().endsWith(`/prospects/${prospect.id}/triage`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save triage", exact: true }).click();
  const triageResponse = await triageSaved;
  expect(triageResponse.ok(), await triageResponse.text()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Triage saved" })).toContainText("Triage saved");
}

async function createProfileFromUI(page: Page, context: BrowserContext, base: string) {
  const before = await (await context.request.get(base)).json();
  expect(before.fixture, "Profile assignment must use the fixture runtime").toBe(true);
  expect(before.modelFixture, "Profile assignment must use the fixture model").toBe(true);
  await page.getByRole("button", { name: "Brand & company", exact: true }).click();
  await page.getByRole("button", { name: "Workspace setup", exact: true }).click();
  await page.getByRole("button", { name: "Create English profile", exact: true }).click();
  const review = page.getByRole("dialog");
  await expect(review).toContainText("make asset");
  const runResponse = page.waitForResponse((response) =>
    response.url().endsWith(`${base}/runs`) && response.request().method() === "POST",
  );
  await review.getByRole("button", { name: "Approve cost and run", exact: true }).click();
  const submitted = await runResponse;
  expect(submitted.status(), await submitted.text()).toBe(201);
  const run = await submitted.json();
  await expect.poll(async () => {
    const state = await (await context.request.get(base)).json();
    const current = state.runs.find((item: any) => item.id === run.id);
    expect(current?.state === "failed", current?.error ?? "Capability profile run failed").toBe(false);
    return current?.state;
  }, { timeout: 60_000 }).toBe("succeeded");
  const state = await (await context.request.get(base)).json();
  const completedRun = state.runs.find((item: any) => item.id === run.id);
  const result = completedRun.output?.[0]?.result;
  expect(result?.id, "The profile run must create a saved asset").toBeTruthy();
  const profile = state.assets.find((item: any) => item.id === result.id);
  expect(profile, "The generated capability profile must be in workspace assets").toBeTruthy();
  expect(profile.template).toBe("capability-profile");
  await page.reload();
  return profile;
}

test("A6/SEQ08: capability-profile holdout badge reflects recorded assignment cohorts", async ({ page, context }) => {
  test.setTimeout(240_000);
  const { base, user } = await selectQimamWorkspace(page, context);
  let state = await (await context.request.get(base)).json();
  expect(state.fixture).toBe(true);
  expect(state.modelFixture).toBe(true);
  expect(state.workspace.company.marketingLicence).toBe(true);
  expect(state.workspace.company.references.some((item: any) => item.consent)).toBe(true);
  if (!state.workspace.preflight?.simulated) {
    await runFixtureAction(context, base, { tool: "preflight", prospectIds: [] });
    state = await (await context.request.get(base)).json();
    expect(state.workspace.preflight?.simulated).toBe(true);
  }

  const profile = await createProfileFromUI(page, context, base);
  const initialState = await (await context.request.get(base)).json();
  const profileAssignments = (current: any) => current.sequences.filter((sequence: any) => {
    const draft = current.drafts.find((item: any) => item.id === sequence.draftId);
    return draft?.assetId === profile.id;
  });
  expect(profileAssignments(initialState), "A fresh profile must have no sequence assignments")
    .toHaveLength(0);

  await page.getByRole("button", { name: "Deliverables", exact: true }).click();
  const profileCard = () => page.getByRole("button", {
    name: new RegExp(escapeRegex(profile.title)),
  }).first();
  await expect(profileCard()).toContainText("Holdout available");
  await expect(profileCard()).not.toContainText(/with profile|without profile|cohort/i);
  await profileCard().click();
  await expect(page.getByText(profile.title, { exact: true })).toBeVisible();
  const approveProfileResponse = page.waitForResponse((response) =>
    response.url().endsWith(`${base}/assets/${profile.id}/approve`) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  const approvedProfile = await approveProfileResponse;
  expect(approvedProfile.ok(), await approvedProfile.text()).toBe(true);
  state = await (await context.request.get(base)).json();
  expect(state.assets.find((item: any) => item.id === profile.id)?.approvedAt).toBeTruthy();
  await page.getByRole("button", { name: "Deliverables", exact: true }).click();
  await expect(profileCard()).toContainText("Holdout available");

  const prospects = await importAccounts(context, base);
  await page.reload();
  for (const prospect of prospects) {
    await prepareAssignmentAccount(page, context, base, user, prospect);
  }
  await runFixtureAction(context, base, {
    tool: "score_accounts",
    prospectIds: prospects.map((prospect: any) => prospect.id),
  });
  await runFixtureAction(context, base, {
    tool: "enrich_contacts",
    prospectIds: prospects.map((prospect: any) => prospect.id),
  });
  await runFixtureAction(context, base, {
    tool: "draft_messages",
    prospectIds: prospects.map((prospect: any) => prospect.id),
    play: "P1",
    language: "en",
  });

  state = await (await context.request.get(base)).json();
  const drafts = prospects.map((prospect: any) => {
    const draft = state.drafts.find((item: any) => item.prospectId === prospect.id);
    expect(draft, `A synthetic draft must exist for ${prospect.snapshot.email}`).toBeTruthy();
    const result = draft;
    return result;
  });
  for (const draft of drafts) {
    const approved = await context.request.post(`${base}/drafts/${draft.id}/approve`, {
      data: { version: draft.version },
    });
    expect(approved.status(), await approved.text()).toBe(201);
  }

  const withProfileDraft = drafts[0];
  const withoutProfileDraft = drafts[1];
  const associatedDrafts: any[] = [];
  for (const draft of [withProfileDraft, withoutProfileDraft]) {
    const attached = await context.request.post(`${base}/drafts/${draft.id}/asset`, {
      data: { assetId: profile.id, version: draft.version },
    });
    expect(attached.ok(), await attached.text()).toBe(true);
    state = await (await context.request.get(base)).json();
    const attachedDraft = state.drafts.find((item: any) => item.id === draft.id);
    expect(attachedDraft.assetId).toBe(profile.id);
    expect(attachedDraft.approvedVersion).toBeNull();
    const reapproved = await context.request.post(`${base}/drafts/${attachedDraft.id}/approve`, {
      data: { version: attachedDraft.version },
    });
    expect(reapproved.status(), await reapproved.text()).toBe(201);
    associatedDrafts.push(attachedDraft);
  }
  const [currentWithProfileDraft, currentWithoutProfileDraft] = associatedDrafts;

  const withProfileExportResponse = await context.request.post(`${base}/exports`, {
    data: { draftIds: [currentWithProfileDraft.id], holdoutPercent: 0 },
  });
  expect(withProfileExportResponse.status(), await withProfileExportResponse.text()).toBe(201);
  const withProfileExport = await withProfileExportResponse.json();
  expect(withProfileExport.export, JSON.stringify(withProfileExport.excluded)).toBeTruthy();
  const withoutProfileExportResponse = await context.request.post(`${base}/exports`, {
    data: { draftIds: [currentWithoutProfileDraft.id], holdoutPercent: 100 },
  });
  expect(withoutProfileExportResponse.status(), await withoutProfileExportResponse.text()).toBe(201);
  const withoutProfileExport = await withoutProfileExportResponse.json();
  expect(withoutProfileExport.export, JSON.stringify(withoutProfileExport.excluded)).toBeTruthy();

  const assignedState = await (await context.request.get(base)).json();
  const profileWithSequences = profileAssignments(assignedState);
  const withProfileSequences = profileWithSequences.filter((sequence: any) => sequence.holdout === false);
  const withoutProfileSequences = profileWithSequences.filter((sequence: any) => sequence.holdout === true);
  expect(withProfileSequences).toHaveLength(1);
  expect(withoutProfileSequences).toHaveLength(1);
  expect(withProfileSequences[0].batchId).toBe(withProfileExport.export.id);
  expect(withoutProfileSequences[0].batchId).toBe(withoutProfileExport.export.id);

  await page.reload();
  await page.getByRole("button", { name: "Deliverables", exact: true }).click();
  const recordedBadge = await profileCard().innerText();
  expect(recordedBadge).not.toContain("Holdout available");
  expect(recordedBadge).toMatch(/with profile\s+1/i);
  expect(recordedBadge).toMatch(/without profile\s+1/i);
  const finalState = await (await context.request.get(base)).json();
  expect(profileAssignments(finalState)).toHaveLength(2);
  expect(profileAssignments(finalState).map((sequence: any) => sequence.holdout).sort())
    .toEqual([false, true]);
  expect(finalState.sequences.find((sequence: any) => sequence.id === withoutProfileSequences[0].id)
    ?.holdout).toBe(true);
});
