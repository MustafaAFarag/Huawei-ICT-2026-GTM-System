import { test, expect, type Page, type BrowserContext } from "@playwright/test";

async function workspace(page: Page, context: BrowserContext) {
  await page.goto("/");
  const me = await (await context.request.get("/api/me")).json();
  const ws = me.workspaces.find((m: any) => m.workspace.name === "Qimam People")
    .workspace.id;
  await page.getByLabel("Workspace", { exact: true }).selectOption(ws);
  await expect(page.locator(".topbar")).toContainText("Qimam People");
  const data = await (
    await context.request.get(`/api/workspaces/${ws}`)
  ).json();
  return { ws, data };
}
const markdown =
  "### حسابات للمراجعة\n\n1. **Kibesh Finance** — راجع [المصدر](https://example.com/jobs)\n2. **شركة ثانية**\n\n| الحساب | التقييم |\n| --- | --- |\n| Kibesh | 75 |\n\n`Operations Manager`\n\n<script>window.hacked=true</script>\n[unsafe](javascript:alert(1))";

test("saved and streamed Markdown is structured, safe and bounded in EN/AR desktop and mobile", async ({
  page,
  context,
}) => {
  let messages: any[] = [
    { id: "markdown", role: "assistant", content: markdown },
  ];
  await page.route("**/api/workspaces/*/chat", async (route) =>
    route.fulfill({ json: messages }),
  );
  await workspace(page, context);
  const rendered = page
    .locator(".chat-message.assistant .chat-markdown")
    .last();
  await expect(rendered.locator("strong").first()).toHaveText("Kibesh Finance");
  await expect(rendered.locator("ol > li")).toHaveCount(2);
  await expect(rendered.locator("table")).toHaveCount(1);
  await expect(rendered.locator("a").first()).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(rendered.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(rendered.locator("script")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).hacked)).toBeUndefined();
  for (const language of ["en", "ar"]) {
    await page.evaluate(
      (lang) => localStorage.setItem("revenue-ui-language", lang),
      language,
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      language === "ar" ? "rtl" : "ltr",
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) {
        const assistant = page.locator("aside.assistant");
        if (!(await assistant.isVisible()))
          await page.locator(".topbar-actions .btn").click();
      }
      await expect(page.locator(".chat-compose")).toBeVisible();
      const metrics = await page.evaluate(() => {
        const compose = document
          .querySelector(".chat-compose")!
          .getBoundingClientRect();
        return {
          docWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          composeBottom: compose.bottom,
          height: innerHeight,
          assistantHeight: document
            .querySelector("aside.assistant")!
            .getBoundingClientRect().height,
          docHeight: document.documentElement.scrollHeight,
        };
      });
      expect(metrics.docWidth).toBeLessThanOrEqual(metrics.viewport + 1);
      expect(metrics.composeBottom).toBeLessThanOrEqual(metrics.height + 1);
      expect(metrics.assistantHeight).toBeLessThanOrEqual(metrics.height + 1);
      if (width === 1440)
        expect(metrics.docHeight).toBeLessThanOrEqual(metrics.height + 1);
      await page.screenshot({
        path: `.local/ui-refinement/chat-${language}-${width}.png`,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    if (language === "ar") {
      await expect(page.locator(".user-meta")).toContainText(
        "مدير العرض التجريبي",
      );
      await expect(page.locator(".user-meta .badge")).toContainText("مالك");
    }
  }
  await page.route("**/api/workspaces/*/chat/stream", async (route) => {
    messages = [{ id: "streamed", role: "assistant", content: markdown }];
    await route.fulfill({
      contentType: "text/event-stream",
      body: [
        { type: "text", delta: markdown.slice(0, 20) },
        { type: "text", delta: markdown.slice(20) },
        { type: "done", credits: 0, steps: 1 },
      ]
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join(""),
    });
  });
  await page.locator("#assistant-input").fill("Show the saved summary");
  await page.locator(".chat-compose button[type=submit]").click();
  await expect(
    page.locator(".chat-message.assistant .chat-markdown ol > li"),
  ).toHaveCount(2);
});

test("assistant opens real accounts/assets beside chat, sends current document context, and requests a scoped revision", async ({
  page,
  context,
}) => {
  const { ws, data } = await workspace(page, context);
  const asset = data.assets.find((a: any) => a.language.startsWith("ar"));
  expect(asset).toBeTruthy();
  const prospect = data.prospects.find((p: any) => p.id === asset.prospectId);
  let turn = 0;
  let received: any;
  const turns: any[][] = [
    [
      {
        type: "ui_action",
        action: { kind: "open_account", prospectId: prospect.id },
      },
      { type: "text", delta: "Opened." },
    ],
    [
      { type: "ui_action", action: { kind: "open_asset", assetId: asset.id } },
      { type: "text", delta: "Opened." },
    ],
    [
      {
        type: "quote",
        input: {
          tool: "make_asset",
          requestKey: crypto.randomUUID(),
          prospectIds: [prospect.id],
          sourceAssetId: asset.id,
          language: asset.language,
          template: asset.template,
          message: "Shorten the heading",
          draftIds: [],
          play: "P1",
          approvedSpend: false,
          holdoutPercent: 0,
        },
        quote: {
          id: crypto.randomUUID(),
          estimate: 6,
          audience: 1,
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      },
    ],
  ];
  await page.route("**/api/workspaces/*/chat/stream", async (route) => {
    received = route.request().postDataJSON();
    const events = [...turns[turn++]!, { type: "done", credits: 0, steps: 1 }];
    await route.fulfill({
      contentType: "text/event-stream",
      body: events
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join(""),
    });
  });
  const send = async (text: string) => {
    await page.locator("#assistant-input").fill(text);
    await page.locator(".chat-compose button[type=submit]").click();
  };
  await send("Open this account");
  await expect(page.locator('[data-ai-target="account-detail"]')).toBeVisible();
  await expect(page.locator(".ai-cursor")).toBeVisible();
  const positions = await page.evaluate(() => ({
    main: document.querySelector(".detail-main")!.getBoundingClientRect()
      .bottom,
    side: document.querySelector(".detail-side")!.getBoundingClientRect().top,
  }));
  expect(positions.side).toBeGreaterThanOrEqual(positions.main);
  await page.screenshot({ path: ".local/ui-refinement/account-en.png" });
  await expect(page.locator(".chat-compose button[type=submit]")).toBeVisible();
  await send("Open the one-pager");
  await expect(page.locator(".asset-editor iframe")).toBeVisible();
  await expect(page.locator("aside.assistant")).not.toHaveAttribute("inert");
  await expect(
    page.frameLocator(".asset-editor iframe").locator("html"),
  ).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".chat-compose button[type=submit]")).toBeVisible();
  await send("Shorten the heading");
  await expect(
    page.getByRole("button", { name: "Review proposed action" }),
  ).toBeVisible();
  expect(received.context.activeAssetId).toBe(asset.id);
  expect(received.context.prospectIds).toEqual([prospect.id]);
  await page.getByRole("button", { name: "Review proposed action" }).click();
  await expect(page.getByRole("dialog")).toContainText("Shorten the heading");
  await expect(page.getByRole("dialog")).toContainText("original is preserved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    (await (await context.request.get(`/api/workspaces/${ws}`)).json()).runs
      .length,
  ).toBe(data.runs.length);
  await page.screenshot({
    path: ".local/ui-refinement/asset-assistant-en.png",
  });
});
