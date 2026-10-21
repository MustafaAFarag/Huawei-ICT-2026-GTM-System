import { test, expect, type BrowserContext, type Page, type Request } from "@playwright/test";
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
  return { ws, base: `/api/workspaces/${ws}` };
}

async function openReplyBatch(page: Page, batchId: string) {
  await page.getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByRole("button", { name: "Sequences", exact: true }).click();
  await page.getByRole("button", { name: "Results", exact: true }).click();
  const batch = page.getByLabel(/^Batch/);
  await batch.selectOption(batchId);
  await expect(batch).toHaveValue(batchId);
}

test("A4: a failed reply-label save reports failure, preserves the imported label, and a retry persists", async ({ page, context }) => {
  const { base } = await selectQimamWorkspace(page, context);
  const scorecardResponse = await context.request.get(`${base}/scorecard`);
  expect(scorecardResponse.ok()).toBe(true);
  const scorecard = await scorecardResponse.json();
  const workspaceState = await (await context.request.get(base)).json();
  expect(workspaceState.fixture).toBe(true);
  expect(workspaceState.modelFixture).toBe(true);
  const ownSyntheticProspects = workspaceState.prospects.filter(
    (item: any) => /^v32.*@synthetic-demo\.example$/i.test(item.snapshot.email ?? ""),
  );
  const candidate = scorecard.replyCandidates.find(
    (item: any) => item.provenance === "imported" && item.label === "positive" &&
      ownSyntheticProspects.some((prospect: any) => prospect.id === item.prospectId),
  );
  expect(candidate, "An imported positive reply from an owned v32 synthetic account is required")
    .toBeTruthy();
  const originalLabel = candidate.label as string;
  expect(originalLabel).toBe("positive");
  const sequence = workspaceState.sequences.find(
    (item: any) => item.id === candidate.sequenceId,
  );
  expect(sequence, "The imported reply must link to its sequence").toBeTruthy();
  expect(sequence.batchId, "The imported reply must be filterable to its batch").toBeTruthy();
  const prospect = workspaceState.prospects.find(
    (item: any) => item.id === candidate.prospectId,
  );
  expect(prospect, "The imported reply must link to its account").toBeTruthy();
  expect(prospect.snapshot.email).toMatch(/^v32.*@synthetic-demo\.example$/i);

  let neutralWrite: Request | undefined;
  let savedNeutral = false;
  let routePattern: string | undefined;
  try {
    await openReplyBatch(page, sequence.batchId);
    const candidateItem = page.getByRole("listitem").filter({ hasText: prospect.snapshot.company });
    await expect(candidateItem).toHaveCount(1);
    const neutralRequest = page.waitForRequest((request) => {
      if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return false;
      try {
        return request.postDataJSON()?.label === "neutral";
      } catch {
        return false;
      }
    });
    await candidateItem.getByRole("button", { name: "Neutral", exact: true }).click();
    neutralWrite = await neutralRequest;
    const neutralSaved = await neutralWrite.response();
    expect(neutralSaved, "The label mutation must receive a response").toBeTruthy();
    expect(neutralSaved.ok(), await neutralSaved.text()).toBe(true);
    savedNeutral = true;
    const preparedScorecard = await (
      await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(sequence.batchId)}`)
    ).json();
    const preparedCandidate = preparedScorecard.replyCandidates.find(
      (item: any) => item.sequenceId === candidate.sequenceId && item.prospectId === candidate.prospectId,
    );
    expect(preparedCandidate?.label).toBe("neutral");
    const neutralPositive = candidateItem.getByRole("button", { name: "Positive", exact: true });
    await expect(neutralPositive).toHaveAttribute("aria-pressed", "false");

    routePattern = neutralWrite.url();
    const labelMethod = neutralWrite.method();
    let forcedRequest: { url: string; method: string } | undefined;
    await page.route(routePattern, async (route) => {
      const request = route.request();
      if (!forcedRequest && request.method() === labelMethod) {
        forcedRequest = { url: request.url(), method: request.method() };
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Synthetic reply-label save failure" }),
        });
        return;
      }
      await route.continue();
    });
    const failedSave = page.waitForResponse(
      (response) => response.status() === 500 && response.url() === routePattern &&
        response.request().method() === labelMethod,
    );
    await neutralPositive.click();
    expect((await failedSave).status()).toBe(500);
    await expect(neutralPositive).toHaveAttribute("aria-pressed", "false");
    expect(forcedRequest, "The label action must issue a browser API mutation").toBeTruthy();
    const alert = page.getByRole("alert").filter({ hasText: "Action needs attention" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("The request failed. Try again.");
    await expect(alert).not.toContainText(/saved|updated/i);
    await page.unroute(routePattern);

    await page.reload();
    const afterFailure = await (
      await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(sequence.batchId)}`)
    ).json();
    const unchanged = afterFailure.replyCandidates.find(
      (item: any) => item.sequenceId === candidate.sequenceId && item.prospectId === candidate.prospectId,
    );
    expect(unchanged?.label).toBe("neutral");

    await openReplyBatch(page, sequence.batchId);
    const candidateItemAfterReload = page.getByRole("listitem").filter({ hasText: prospect.snapshot.company });
    await expect(candidateItemAfterReload).toHaveCount(1);
    const positiveAfterReload = candidateItemAfterReload.getByRole("button", { name: "Positive", exact: true });
    await expect(positiveAfterReload).toHaveAttribute("aria-pressed", "false");
    const successResponse = page.waitForResponse(
      (response) =>
        response.url() === forcedRequest!.url &&
        response.request().method() === forcedRequest!.method,
    );
    await positiveAfterReload.click();
    const persistedResponse = await successResponse;
    expect(persistedResponse.ok(), await persistedResponse.text()).toBe(true);
    await expect(positiveAfterReload).toHaveAttribute("aria-pressed", "true");
    const afterSuccess = await (
      await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(sequence.batchId)}`)
    ).json();
    const positiveLabel = afterSuccess.replyCandidates.find(
      (item: any) => item.sequenceId === candidate.sequenceId && item.prospectId === candidate.prospectId,
    );
    expect(positiveLabel?.label).toBe("positive");

    await page.reload();
    const afterReload = await (
      await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(sequence.batchId)}`)
    ).json();
    const reloadedLabel = afterReload.replyCandidates.find(
      (item: any) => item.sequenceId === candidate.sequenceId && item.prospectId === candidate.prospectId,
    );
    expect(reloadedLabel?.label).toBe("positive");
  } finally {
    if (routePattern) await page.unroute(routePattern).catch(() => undefined);
    if (savedNeutral && neutralWrite) {
      const neutralBody = neutralWrite.postDataJSON() as Record<string, unknown>;
      expect(neutralBody).toMatchObject({ label: "neutral" });
      const restoreResponse = await context.request.fetch(neutralWrite.url(), {
        method: neutralWrite.method(),
        data: { ...neutralBody, label: originalLabel },
      });
      expect(restoreResponse.ok(), await restoreResponse.text()).toBe(true);
      const finalScorecard = await (
        await context.request.get(`${base}/scorecard?batch=${encodeURIComponent(sequence.batchId)}`)
      ).json();
      const restoredCandidate = finalScorecard.replyCandidates.find(
        (item: any) => item.sequenceId === candidate.sequenceId && item.prospectId === candidate.prospectId,
      );
      expect(restoredCandidate?.label ?? null).toBe(originalLabel);
    }
  }
});
