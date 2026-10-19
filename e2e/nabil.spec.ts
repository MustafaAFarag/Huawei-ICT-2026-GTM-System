import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Caravan shell with Nabil: chat-first home, threads, floating launcher and the deliverable
// canvas. Runs against MODEL_MODE=fixture (deterministic assistant and deliverables).

async function workspace(
  page: Page,
  context: BrowserContext,
  path = "/",
  name = "Qimam People",
) {
  await page.goto(path);
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === name).workspace
    .id;
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  await expect(page.locator(".topbar")).toContainText(name);
  const data = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  return { ws, data };
}
const stream = (events: object[]) => ({
  contentType: "text/event-stream",
  body: [...events, { type: "done", credits: 0, steps: 1 }]
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join(""),
});
const markdown =
  "### حسابات للمراجعة\n\n1. **Kibesh Finance** — راجع [المصدر](https://example.com/jobs)\n2. **شركة ثانية**\n\n| الحساب | التقييم |\n| --- | --- |\n| Kibesh | 75 |\n\n`Operations Manager`\n\n<script>window.hacked=true</script>\n[unsafe](javascript:alert(1))";

test("home composer starts a thread that persists, with safe streamed Markdown", async ({
  page,
  context,
}) => {
  const { ws } = await workspace(page, context);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What would you like to prepare?",
  );
  await page.getByRole("button", { name: "More formats", exact: true }).click();
  await page
    .getByRole("button", { name: "Instagram carousel", exact: true })
    .click();
  await expect(page.locator("#assistant-input")).toHaveValue(
    /Instagram carousel about/,
  );
  await page
    .locator("#assistant-input")
    .fill("Which accounts should I contact first?");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/[?&]c=/);
  await expect(page.locator(".msg-user").last()).toContainText(
    "Which accounts should I contact first?",
  );
  await expect(
    page.locator(".msg-assistant .chat-markdown").last(),
  ).not.toBeEmpty();
  const threadId = new URL(page.url()).searchParams.get("c")!;
  const threads = await (
    await context.request.get(`/api/workspaces/${ws}/threads`)
  ).json();
  expect(threads.some((t: any) => t.id === threadId)).toBe(true);
  await page.reload();
  await expect(page.locator(".msg-user").last()).toContainText(
    "Which accounts should I contact first?",
  );
  await expect(page.locator(".recents li.active")).toContainText(
    "Which accounts should I contact first?",
  );

  // Streamed Markdown: structure renders, raw HTML and javascript: links never do.
  await page.route("**/api/workspaces/*/chat/stream", (route) =>
    route.fulfill(
      stream([
        { type: "thread", id: threadId, title: "x" },
        { type: "tool", id: "t1", name: "search_accounts", state: "result" },
        { type: "text", delta: markdown.slice(0, 30) },
        { type: "text", delta: markdown.slice(30) },
      ]),
    ),
  );
  await page.route(
    `**/api/workspaces/*/threads/${threadId}/messages`,
    (route) =>
      route.fulfill({
        json: [
          {
            id: "m1",
            role: "assistant",
            content: markdown,
            context: { tools: ["search_accounts"] },
          },
        ],
      }),
  );
  await page.locator("#assistant-input").fill("Summarise");
  await page.keyboard.press("Enter");
  const rendered = page.locator(".msg-assistant .chat-markdown").last();
  await expect(rendered.locator("ol > li")).toHaveCount(2);
  await expect(rendered.locator("table")).toHaveCount(1);
  await expect(rendered.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(rendered.locator("script")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).hacked)).toBeUndefined();
  await expect(page.locator(".step-row").last()).toContainText(
    "Searched accounts",
  );
});

test("floating launcher carries screen context, navigates visibly and expands to home", async ({
  page,
  context,
}) => {
  const { ws, data } = await workspace(page, context, "/?s=Accounts");
  const prospect = data.prospects[0];
  const thread = await (
    await context.request.post(`/api/workspaces/${ws}/threads`, {
      data: { title: "Launcher test" },
    })
  ).json();
  await page.getByRole("button", { name: "Ask Nabil" }).click();
  const panel = page.getByRole("region", { name: "Nabil assistant" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("textarea")).toBeFocused();
  let received: any;
  await page.route("**/api/workspaces/*/chat/stream", async (route) => {
    received = route.request().postDataJSON();
    await route.fulfill(
      stream([
        { type: "thread", id: thread.id, title: thread.title },
        {
          type: "ui_action",
          action: { kind: "open_account", prospectId: prospect.id },
        },
        { type: "text", delta: "Opened." },
      ]),
    );
  });
  await panel.locator("textarea").fill("Open this account");
  await panel.locator("textarea").press("Enter");
  await expect(page.locator('[data-ai-target="account-detail"]')).toBeVisible();
  expect(received.context.screen).toBe("Accounts");
  await expect(panel.locator(".context-chip").first()).toContainText(
    "1 account",
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Ask Nabil" })).toBeFocused();
  await page.getByRole("button", { name: "Ask Nabil" }).click();
  await panel.getByRole("button", { name: "Open full conversation" }).click();
  await expect(page.locator(".home-conversation")).toBeVisible();

  // Arabic: the launcher sits at the inline end, which is the left edge in RTL.
  await page.evaluate(() => localStorage.setItem("revenue-ui-language", "ar"));
  await page.goto("/?s=Accounts");
  const box = await page.locator(".launcher-bubble").boundingBox();
  expect(box!.x).toBeLessThan((page.viewportSize()?.width ?? 1280) / 2);
  await page.evaluate(() => localStorage.setItem("revenue-ui-language", "en"));
});

test("deliverables open in the canvas: carousel slides, email widths and a page-turning flipbook", async ({
  page,
  context,
}) => {
  const { ws } = await workspace(page, context);
  const base = `/api/workspaces/${ws}`;
  const make = async (template: string) => {
    const input = {
      tool: "make_asset",
      requestKey: crypto.randomUUID(),
      prospectIds: [],
      draftIds: [],
      play: "P1",
      language: "en",
      template,
      approvedSpend: false,
      holdoutPercent: 0,
      message: "Brand-level test deliverable",
    };
    const quote = await (
      await context.request.post(`${base}/quotes`, { data: input })
    ).json();
    expect(
      (await context.request.post(`${base}/quotes/${quote.id}/approve`)).ok(),
    ).toBe(true);
    const run = await (
      await context.request.post(`${base}/runs`, {
        data: { ...input, spendApprovalId: quote.id },
      })
    ).json();
    await expect
      .poll(
        async () => {
          const state = await (await context.request.get(base)).json();
          return state.runs.find((r: any) => r.id === run.id)?.state;
        },
        { timeout: 60000 },
      )
      .toBe("succeeded");
    const state = await (await context.request.get(base)).json();
    return state.runs.find((r: any) => r.id === run.id).output[0].result
      .id as string;
  };
  const carousel = await make("instagram-carousel");
  const email = await make("email-gmail");
  const flipbook = await make("flipbook");
  const meta = await (
    await context.request.get(`${base}/assets/${carousel}/meta`)
  ).json();
  expect(meta.pages).toBeGreaterThanOrEqual(5);
  expect(
    (await context.request.get(`${base}/assets/${carousel}/zip`)).status(),
  ).toBe(409);

  await page.goto("/?s=Asset+Studio");
  const canvas = page.locator(".artifact-canvas");
  const deliverables = page.getByRole("region", { name: "Deliverables" });
  await deliverables.getByRole("button", { name: "Carousels", exact: true }).click();
  await deliverables
    .getByRole("listitem")
    .filter({ hasText: "Instagram carousel" })
    .first()
    .getByRole("button")
    .click();
  await expect(canvas.locator(".slide-controls")).toContainText(
    `1/${meta.pages}`,
  );
  await canvas.getByRole("button", { name: "Next slide" }).click();
  await expect(canvas.locator(".slide-controls")).toContainText(
    `2/${meta.pages}`,
  );
  await expect(canvas.locator("iframe")).toHaveAttribute("src", /slide=2/);
  await canvas.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    canvas.getByRole("button", { name: "PNG slides (.zip)" }),
  ).toBeVisible();
  const zip = await context.request.get(`${base}/assets/${carousel}/zip`);
  expect(zip.headers()["content-type"]).toContain("application/zip");
  await canvas.getByRole("button", { name: "Close preview" }).click();

  await deliverables.getByRole("button", { name: "Emails", exact: true }).click();
  await deliverables
    .getByRole("listitem")
    .filter({ hasText: "HTML email" })
    .first()
    .getByRole("button")
    .click();
  await expect(canvas.locator(".email-frame")).toHaveCSS("width", "600px");
  await canvas.getByRole("button", { name: "Phone width" }).click();
  await expect(canvas.locator(".email-frame")).toHaveCSS("width", "375px");
  await expect(canvas.locator(".artifact-foot")).toContainText("KB");
  const html = await (
    await context.request.get(`${base}/assets/${email}/html`)
  ).text();
  expect(html).not.toMatch(/src=["']data:/);
  await canvas.getByRole("button", { name: "Close preview" }).click();

  await deliverables.getByRole("button", { name: "Flipbooks", exact: true }).click();
  await deliverables
    .getByRole("listitem")
    .filter({ hasText: "Flipbook" })
    .first()
    .getByRole("button")
    .click();
  await expect(canvas.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  const book = page.frameLocator(".artifact-canvas iframe");
  await expect(book.locator("#count")).toContainText("1 /");
  await book.getByRole("button", { name: "Next page" }).click();
  await expect(book.locator("#count")).not.toHaveText(/^1 \//);
  const csp = (
    await context.request.get(`${base}/assets/${flipbook}/html`)
  ).headers()["content-security-policy"];
  expect(csp).toContain("sandbox allow-scripts");
  expect(csp).not.toContain("allow-same-origin");
  if (process.env.E2E_CAPTURE_SCREENSHOTS === "1") {
    await page.screenshot({ path: ".local/ui-refinement/flipbook-canvas.png" });
  }
});

test("an immediate deliverable opens beside chat and long titles fit in both directions", async ({
  page,
  context,
}) => {
  const { ws } = await workspace(page, context);
  const title =
    "Introducing Qimam People’s HR operations desk — Qimam People ".repeat(3);
  await page.route(`**/api/workspaces/${ws}`, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.assets = data.assets.map((asset: any) => ({ ...asset, title }));
    await route.fulfill({ response, json: data });
  });
  await page
    .locator("#assistant-input")
    .fill("Create a Gmail HTML email introducing our HR operations desk");
  await page.locator("#assistant-input").press("Enter");
  const canvas = page.locator(".artifact-canvas");
  await expect(canvas).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".chat-run-progress")).toBeVisible();
  await expect(page.locator(".quote-card, .home-runlog, .run-log")).toHaveCount(
    0,
  );
  const conversationUrl = page.url();
  for (const language of ["en", "ar"]) {
    await page.evaluate((language) => {
      localStorage.setItem("revenue-ui-language", language);
      localStorage.setItem(
        "revenue-theme",
        language === "ar" ? "light" : "dark",
      );
    }, language);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(conversationUrl);
      await page.locator(".deliverable-card").last().click();
      await expect(canvas).toBeVisible();
      await expect(canvas.locator("#artifact-title")).toContainText(
        title.trim(),
      );
      const bounds = await canvas.locator("#artifact-title").evaluate((el) => {
        const box = el.getBoundingClientRect();
        const parent = el.closest(".artifact-canvas")!.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          parentLeft: parent.left,
          parentRight: parent.right,
          scroll: el.scrollWidth,
          width: el.clientWidth,
        };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft);
      expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight);
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
      const composer = page.locator(".conversation-dock .composer");
      expect(
        await composer.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await expect(composer.locator(".send-button")).toBeInViewport();
      await expect(
        canvas.getByRole("button", {
          name: language === "ar" ? "إغلاق المعاينة" : "Close preview",
        }),
      ).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.E2E_CAPTURE_SCREENSHOTS === "1") {
        await page.screenshot({
          path: `.local/ui-refinement/immediate-${language}-${width}.png`,
        });
      }
    }
    await page.goto("/?s=Accounts");
    await expect(page.locator(".accounts-table, table").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
