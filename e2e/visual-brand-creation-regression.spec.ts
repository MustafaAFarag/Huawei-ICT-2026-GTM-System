import { test, expect, type Page, type BrowserContext } from "@playwright/test";

type WorkspaceContext = {
  workspaceId: string;
  state: WorkspaceState;
};

type WorkspaceProspect = {
  id: string;
  snapshot?: { company?: string };
};

type WorkspaceState = {
  fixture: boolean;
  modelFixture: boolean;
  prospects: WorkspaceProspect[];
};

type ChatPayload = {
  message: string;
  context: { prospectIds?: string[]; [key: string]: unknown };
};

type ChatSubmission = {
  url: string;
  body: ChatPayload;
};

type ThreadMessage = {
  role: "user" | "assistant";
  content: string;
  runId?: string;
  context?: { prospectIds?: string[]; [key: string]: unknown };
};

async function requireFixtureWorkspace(
  page: Page,
  context: BrowserContext,
): Promise<WorkspaceContext> {
  const healthResponse = await context.request.get("/api/health");
  expect(healthResponse.status(), "fixture API health must be reachable").toBe(200);
  expect((await healthResponse.json()).mode, "generation must use fixture mode").toBe(
    "fixture",
  );

  const meResponse = await context.request.get("/api/me");
  expect(meResponse.status(), "the browser session must be authenticated").toBe(200);
  await page.goto("/");
  await expect(page.locator("#assistant-input")).toBeVisible();
  const activeWorkspaceId = await page
    .getByRole("button", { name: "Workspace", exact: true })
    .getAttribute("data-value");
  expect(activeWorkspaceId, "the authenticated workspace must be selected").toBeTruthy();

  const stateResponse = await context.request.get(
    `/api/workspaces/${activeWorkspaceId}`,
  );
  expect(stateResponse.status(), "the active workspace must be available").toBe(200);
  const state = (await stateResponse.json()) as WorkspaceState;
  expect(state.fixture, "browser verification requires fixture runtime").toBe(true);
  expect(state.modelFixture, "browser verification requires fixture model").toBe(true);
  return { workspaceId: activeWorkspaceId!, state };
}

function captureChatSubmissions(page: Page): ChatSubmission[] {
  const submissions: ChatSubmission[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/chat/stream")
    ) {
      submissions.push({
        url: request.url(),
        body: request.postDataJSON() as ChatPayload,
      });
    }
  });
  return submissions;
}

async function openCreateForm(page: Page, uiLanguage: "en" | "ar" = "en") {
  if ((page.viewportSize()?.width ?? 1280) < 600) {
    await page.goto("/?s=Asset+Studio");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", {
        name: uiLanguage === "ar" ? "إنشاء" : "Create",
        exact: true,
      })
      .first()
      .click();
  } else {
    await page.getByRole("button", { name: "Deliverables", exact: true }).click();
    await expect(page.getByRole("region", { name: "Deliverables" })).toBeVisible();
    await page.getByRole("button", { name: "Create", exact: true }).first().click();
  }
  await expect(
    page.getByText(uiLanguage === "ar" ? "إنشاء مخرج" : "Create a deliverable", {
      exact: true,
    }),
  ).toBeVisible();
}

async function fillCreateForm(
  page: Page,
  brief: string,
  language: "en" | "ar-EG",
  audience: string | null,
  uiLanguage: "en" | "ar" = "en",
) {
  await page
    .getByLabel(
      uiLanguage === "ar" ? "ما الهدف من هذا المخرج؟" : "What should this achieve?",
      { exact: true },
    )
    .fill(brief);
  const formatLabel = uiLanguage === "ar" ? "النوع" : "Format";
  const contentLanguageLabel = uiLanguage === "ar" ? "لغة المحتوى" : "Content language";
  await page
    .locator("label")
    .filter({ hasText: formatLabel })
    .getByRole("combobox")
    .selectOption({ label: uiLanguage === "ar" ? "بريد HTML · Gmail" : "HTML email · Gmail" });
  await page
    .locator("label")
    .filter({ hasText: contentLanguageLabel })
    .getByRole("combobox")
    .selectOption(language);
  if (audience) {
    await page
      .locator("label")
      .filter({ hasText: uiLanguage === "ar" ? "الجمهور أو الحساب" : "Audience or account" })
      .getByRole("combobox")
      .selectOption({ label: audience });
  }
}

async function expectOnePersistedUserMessage(
  context: BrowserContext,
  workspaceId: string,
  threadId: string,
  marker: string,
) {
  let matchingMessages: ThreadMessage[] = [];
  await expect
    .poll(
      async () => {
        const response = await context.request.get(
          `/api/workspaces/${workspaceId}/threads/${threadId}/messages`,
        );
        if (!response.ok()) return 0;
        const messages = (await response.json()) as ThreadMessage[];
        matchingMessages = messages.filter(
          (message) =>
            message.role === "user" && String(message.content).includes(marker),
        );
        return matchingMessages.length;
      },
      { timeout: 15_000 },
    )
    .toBe(1);
  expect(matchingMessages).toHaveLength(1);
}

test("fixture API and authenticated active workspace are ready before generation", async ({
  page,
  context,
}) => {
  const { state } = await requireFixtureWorkspace(page, context);
  expect(state.fixture).toBe(true);
  expect(state.modelFixture).toBe(true);
});

test("Deliverables creation starts one Arabic phone turn with its selected account context", async ({
  page,
  context,
}) => {
  const { workspaceId, state } = await requireFixtureWorkspace(page, context);
  const audience = state.prospects.find(
    (prospect) => prospect.snapshot?.company === "Tirun Cloud",
  );
  expect(audience, "Tirun Cloud must be available in the active fixture workspace").toBeTruthy();
  const selectedAudience = audience!;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem("revenue-ui-language", "ar"));
  await page.reload();
  await expect(page.locator("#assistant-input")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: "المخرجات", exact: true })).toBeVisible();

  const marker = `Arabic phone handoff ${crypto.randomUUID()}`;
  const brief = `Prepare a concise follow-up email for Tirun Cloud. ${marker}.`;
  const submissions = captureChatSubmissions(page);
  await openCreateForm(page, "ar");
  await fillCreateForm(page, brief, "ar-EG", "Tirun Cloud", "ar");
  await page.getByRole("button", { name: "إنشاء مع نبيل", exact: true }).click();

  await expect
    .poll(() => submissions.length, { timeout: 5_000 })
    .toBe(1);
  await expect(page).toHaveURL(/[?&]c=/);
  const threadId = new URL(page.url()).searchParams.get("c");
  expect(threadId).toBeTruthy();
  await expect(page.locator(".msg-user").filter({ hasText: marker })).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]!.body.message).toContain(brief);
  expect(submissions[0]!.body.message).toContain("ar-EG");
  expect(submissions[0]!.body.message).toContain("Tirun Cloud");
  expect(submissions[0]!.body.context.prospectIds).toEqual([selectedAudience.id]);
  await expectOnePersistedUserMessage(context, workspaceId, threadId!, marker);
});

test("English creation double click starts once and reload does not replay the turn", async ({
  page,
  context,
}) => {
  const { workspaceId } = await requireFixtureWorkspace(page, context);
  const marker = `English desktop handoff ${crypto.randomUUID()}`;
  const brief = `Prepare a concise English follow-up email. ${marker}.`;
  const submissions = captureChatSubmissions(page);
  await openCreateForm(page);
  await fillCreateForm(page, brief, "en", null);
  await page
    .getByRole("button", { name: "Create with Nabil", exact: true })
    .dblclick();

  await expect
    .poll(() => submissions.length, { timeout: 5_000 })
    .toBe(1);
  await expect(page).toHaveURL(/[?&]c=/);
  const threadId = new URL(page.url()).searchParams.get("c");
  expect(threadId).toBeTruthy();
  await expect(page.locator(".msg-user").filter({ hasText: marker })).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]!.body.message).toContain(brief);
  await expectOnePersistedUserMessage(context, workspaceId, threadId!, marker);

  await page.reload();
  await expect(page.locator(".msg-user").filter({ hasText: marker })).toBeVisible();
  expect(submissions).toHaveLength(1);
});

test("account assistant Draft follow-up starts one turn for the active account", async ({
  page,
  context,
}) => {
  const { workspaceId, state } = await requireFixtureWorkspace(page, context);
  const account = state.prospects.find(
    (prospect) => prospect.snapshot?.company === "Tirun Cloud",
  );
  expect(account, "Tirun Cloud must be available in the active fixture workspace").toBeTruthy();
  const activeAccount = account!;

  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByText("Hisham Haddad", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tirun Cloud", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask Nabil", exact: true }).click();
  const assistant = page.getByRole("region", { name: "Nabil assistant" });
  await expect(assistant).toBeVisible();
  const submissions = captureChatSubmissions(page);

  await assistant
    .getByRole("button", { name: "Draft follow-up", exact: true })
    .click();
  await expect
    .poll(() => submissions.length, { timeout: 5_000 })
    .toBe(1);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]!.body.context.prospectIds).toEqual([activeAccount.id]);
  expect(String(submissions[0]!.body.message)).toMatch(/follow.?up/i);
  await expect(assistant.locator(".msg-user").last()).toContainText(/follow.?up/i);
});

test("failed creation reports an error, keeps controls usable, and never reports completion", async ({
  page,
  context,
}) => {
  await requireFixtureWorkspace(page, context);
  const marker = `Failure state ${crypto.randomUUID()}`;
  let failedRequests = 0;
  await page.route("**/api/workspaces/*/chat/stream", async (route) => {
    failedRequests += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "The fixture request failed." }),
    });
  });

  await openCreateForm(page);
  await fillCreateForm(
    page,
    `Prepare an English follow-up email. ${marker}.`,
    "en",
    null,
  );
  await page.getByRole("button", { name: "Create with Nabil", exact: true }).click();

  await expect.poll(() => failedRequests, { timeout: 5_000 }).toBe(1);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#assistant-input")).toBeEnabled();
  await page.locator("#assistant-input").fill("Retry the follow-up after the error.");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(0);
});
