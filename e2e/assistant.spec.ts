import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Runs against the fixture assistant (MODEL_MODE not live) and the seeded demo workspaces.
async function login(page: Page) {
  // The session comes from e2e/global-setup.ts (sign-in is rate-limited).
  await page.goto("/?s=Plays");
  await expect(
    page.getByRole("heading", { name: "Campaigns", exact: true }),
  ).toBeVisible();
}

test("assistant runs requested work immediately with inline progress and no approval overlay", async ({
  page,
  context,
}) => {
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Qimam People")
    .workspace.id;
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("row").nth(1).getByRole("checkbox").check();
  const threadsBefore = await (
    await context.request.get(`/api/workspaces/${ws}/threads`)
  ).json();
  const threadIdsBefore = new Set(threadsBefore.map((thread: any) => thread.id));
  await page.getByRole("button", { name: "Ask Nabil" }).click();
  await page.locator("#launcher-input").fill("Draft messages for this account");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".chat-run-progress")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review proposed action" }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".home-runlog, .run-log")).toHaveCount(0);
  let createdThread: any;
  await expect
    .poll(async () => {
      const threads = await (
        await context.request.get(`/api/workspaces/${ws}/threads`)
      ).json();
      createdThread = threads.find((thread: any) => !threadIdsBefore.has(thread.id));
      return createdThread?.id;
    })
    .toBeTruthy();
  let request: any;
  let response: any;
  await expect
    .poll(async () => {
      const messages = await (
        await context.request.get(
          `/api/workspaces/${ws}/threads/${createdThread.id}/messages`,
        )
      ).json();
      request = messages.find(
        (message: any) =>
          message.role === "user" &&
          message.content === "Draft messages for this account",
      );
      response = messages.find(
        (message: any) =>
          message.role === "assistant" &&
          message.runId &&
          message.context?.tool === "draft_messages",
      );
      return Boolean(request && response);
    })
    .toBe(true);
  expect(request.context.prospectIds).toHaveLength(1);
  expect(response.runId).toBeTruthy();
  expect(response.context.prospectIds).toEqual(request.context.prospectIds);
  await expect(page.locator("#launcher-input")).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Ask Nabil" }).click();
  // The run is attached to the saved conversation, so its completed status survives navigation.
  await page.goto(`/?c=${createdThread.id}`);
  await expect(page.locator(".chat-run-progress")).toContainText("Completed");
});

test("voice dictation endpoint validates audio and returns a transcript", async ({
  page,
  context,
}) => {
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces[0].workspace.id;
  const ok = await context.request.post(
    `/api/workspaces/${ws}/transcribe?language=en`,
    {
      headers: { "Content-Type": "audio/webm" },
      data: Buffer.from("synthetic-audio-bytes"),
    },
  );
  expect(ok.status()).toBe(200);
  expect((await ok.json()).text.length).toBeGreaterThan(0);
  const bad = await context.request.post(`/api/workspaces/${ws}/transcribe`, {
    headers: { "Content-Type": "audio/webm" },
    data: Buffer.alloc(0),
  });
  expect(bad.status()).toBe(400);
});

test("free tier hard-stops at its export quota and the plan cap is visible", async ({
  page,
  context,
}) => {
  await login(page);
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Nour Studio")
    .workspace.id;
  const base = `/api/workspaces/${ws}`;
  const state = await (await context.request.get(base)).json();
  expect(state.workspace.plan).toBe("Free");
  const exportsQuota = state.quotas.find((q: any) => q.kind === "exports");
  expect(exportsQuota.used).toBeGreaterThanOrEqual(exportsQuota.cap);
  const prospect = state.prospects.find((p: any) => !p.excluded);
  const input = {
    tool: "make_asset",
    requestKey: randomUUID(),
    prospectIds: [prospect.id],
    play: "P4",
    template: "mini-audit",
  };
  const quote = await (
    await context.request.post(`${base}/quotes`, { data: input })
  ).json();
  await context.request.post(`${base}/quotes/${quote.id}/approve`);
  const run = await context.request.post(`${base}/runs`, {
    data: { ...input, spendApprovalId: quote.id },
  });
  expect(run.status()).toBe(403);
  expect((await run.json()).message).toMatch(/quota|cap/);
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  await expect(page.locator(".topbar")).toContainText("Nour Studio");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Quotas and member caps", exact: true })
    .click();
  await expect(page.locator(".quota-list")).toContainText("exports");
});
