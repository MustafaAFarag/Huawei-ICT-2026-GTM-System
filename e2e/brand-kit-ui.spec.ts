import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { selectWorkspace } from "./workspace";

test.use({
  screenshot: "off",
  trace: "off",
  actionTimeout: 10_000,
  navigationTimeout: 30_000,
});

const clients = [
  {
    workspaceName: "Mirqab · Fintech client (KSA)",
    brandName: "Sarafa Pay",
    colors: ["#123c69", "#2bb3a3"],
  },
  {
    workspaceName: "Mirqab · Logistics client (Egypt)",
    brandName: "Wasla Express",
    colors: ["#f2c94c", "#1d1d1f"],
  },
  {
    workspaceName: "Mirqab · EdTech client (UAE)",
    brandName: "Ruwad Learning",
    colors: ["#3b1f5c", "#f2994a"],
  },
] as const;

type Workspace = { id: string; name: string };
type Membership = Workspace | { workspace: Workspace };
type MediaReference = { id: string; alt: string; role?: string };
type Brand = {
  name?: string;
  primary?: string;
  accent?: string;
  palette?: unknown[];
  visualDirection?: string;
  photoDirection?: string;
  media?: {
    logo?: MediaReference;
    mark?: MediaReference;
    gallery?: MediaReference[];
  };
};
type Dashboard = {
  fixture?: boolean;
  modelFixture?: boolean;
  workspace: { brand: Brand };
  assets?: Array<{ id: string; approvedAt?: string | null }>;
  prospects?: Array<{
    id: string;
    excluded?: boolean;
    snapshot: {
      company?: string;
      email?: string;
      firstName?: string;
      website?: string;
    };
  }>;
};

async function fixtureMemberships(context: BrowserContext) {
  const health = await context.request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ mode: "fixture" });

  const response = await context.request.get("/api/me");
  expect(response.status()).toBe(200);
  const body = await response.json();
  const memberships = (body.workspaces ?? []).map((item: Membership) =>
    "workspace" in item ? item.workspace : item,
  ) as Workspace[];
  return clients.map((client) => {
    const matches = memberships.filter(
      (workspace) => workspace.name === client.workspaceName,
    );
    expect(matches, `one membership for ${client.workspaceName}`).toHaveLength(
      1,
    );
    return { client, workspace: matches[0]! };
  });
}

async function dashboard(context: BrowserContext, workspaceId: string) {
  const response = await context.request.get(`/api/workspaces/${workspaceId}`);
  expect(response.status()).toBe(200);
  const result = (await response.json()) as Dashboard;
  expect(result.fixture).toBe(true);
  expect(result.modelFixture).toBe(true);
  return result;
}

type SavedKit = {
  primary: MediaReference;
  gallery: MediaReference[];
  references: MediaReference[];
};

function savedMedia(brand: Brand): SavedKit {
  const media = brand.media;
  expect(media, `${brand.name} saved media`).toBeTruthy();
  const primary = media?.logo ?? media?.mark;
  expect(primary, `${brand.name} saved logo or mark`).toBeTruthy();
  if (!primary) throw new Error(`${brand.name} is missing its logo or mark`);
  const gallery = media?.gallery ?? [];
  expect(gallery, `${brand.name} saved gallery`).toHaveLength(3);
  const references = [media?.logo, media?.mark, ...gallery].filter(
    (ref): ref is MediaReference => Boolean(ref),
  );
  return { primary, gallery, references };
}

async function openBrandPage(page: Page, workspaceId: string) {
  await selectWorkspace(page, workspaceId);
  await page
    .getByRole("button", { name: "Brand & company", exact: true })
    .click();
}

async function expectSavedImage(
  page: Page,
  workspace: Workspace,
  ref: MediaReference,
) {
  const image = page.getByRole("img", { name: ref.alt, exact: true });
  await expect(image, `${ref.role ?? "brand"} image ${ref.id}`).toBeVisible();
  await expect
    .poll(async () =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const source = await image.getAttribute("src");
  expect(source).toContain(
    `/api/workspaces/${workspace.id}/brand/media/${encodeURIComponent(ref.id)}`,
  );
}

async function renderedSettingValues(page: Page) {
  return page.locator("body").evaluate((body) => {
    const values = Array.from(
      body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ),
    ).map((field) => field.value);
    return `${(body as HTMLElement).innerText}\n${values.join("\n")}`.toLowerCase();
  });
}

async function ensureClientBrandLabel(root: Page | Locator) {
  await expect(
    root.getByText(/client brand|brand gallery/i).first(),
  ).toBeVisible();
}

test("Brand & company shows each workspace's saved visual kit", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  await expect(
    page.getByRole("heading", { name: "Campaigns", exact: true }),
  ).toBeVisible();
  const targets = await fixtureMemberships(context);
  const kitFingerprints = new Set<string>();

  for (const { client, workspace } of targets) {
    const state = await dashboard(context, workspace.id);
    const brand = state.workspace.brand;
    expect(brand.name?.toLowerCase()).toContain(client.brandName.toLowerCase());
    expect(brand.palette).toBeTruthy();
    const direction = brand.visualDirection ?? brand.photoDirection;
    expect(direction?.trim().length).toBeGreaterThan(20);
    const kit = savedMedia(brand);
    kitFingerprints.add(
      JSON.stringify({
        name: brand.name,
        palette: brand.palette,
        refs: kit.references.map((ref) => ref.id).sort(),
      }),
    );

    await openBrandPage(page, workspace.id);
    await expect(
      page.getByText(new RegExp(client.brandName, "i")).first(),
    ).toBeVisible();
    const visibleValues = await renderedSettingValues(page);
    for (const color of client.colors) expect(visibleValues).toContain(color);
    for (const ref of [kit.primary, ...kit.gallery]) {
      await expectSavedImage(page, workspace, ref);
    }
    expect(visibleValues).toContain(direction!.toLowerCase());
  }

  expect(kitFingerprints.size, "each confirmed client has a distinct kit").toBe(
    3,
  );
});

test("saving unchanged brand details preserves the kit and existing approvals after reload", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const target = (await fixtureMemberships(context)).find(
    ({ client }) => client.brandName === "Sarafa Pay",
  )!;
  const before = await dashboard(context, target.workspace.id);
  const initialBrand = before.workspace.brand;
  const expectedRefs = savedMedia(initialBrand).references;
  const initialApproved = new Map(
    (before.assets ?? [])
      .filter((asset) => asset.approvedAt)
      .map(({ id, approvedAt }) => [id, approvedAt] as const),
  );

  await openBrandPage(page, target.workspace.id);
  await page.getByRole("button", { name: "Update brand", exact: true }).click();
  const editor = page.getByRole("dialog");
  const save = editor.getByRole("button", { name: /save/i });
  await expect(save).toBeVisible();
  await save.click();
  await expect(editor).toBeHidden();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /saved|up to date|no changes/i })
      .first(),
  ).toBeVisible();
  await page.reload();

  const after = await dashboard(context, target.workspace.id);
  expect(after.workspace.brand.media).toEqual(initialBrand.media);
  expect(after.workspace.brand.palette).toEqual(initialBrand.palette);
  expect(
    after.workspace.brand.visualDirection ??
      after.workspace.brand.photoDirection,
  ).toEqual(initialBrand.visualDirection ?? initialBrand.photoDirection);
  const afterApproved = new Map(
    (after.assets ?? [])
      .filter((asset) => asset.approvedAt)
      .map(({ id, approvedAt }) => [id, approvedAt] as const),
  );
  for (const [assetId, approvedAt] of initialApproved) {
    expect(afterApproved.get(assetId), `approval for ${assetId}`).toBe(
      approvedAt,
    );
  }
  expect(expectedRefs.map((ref) => ref.id)).toEqual(
    savedMedia(after.workspace.brand).references.map((ref) => ref.id),
  );
});

test("account Nabil keeps the current conversation and labels client imagery as brand context", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const target = (await fixtureMemberships(context)).find(
    ({ client }) => client.brandName === "Sarafa Pay",
  )!;
  await selectWorkspace(page, target.workspace.id);
  const base = `/api/workspaces/${target.workspace.id}`;
  const state = await dashboard(context, target.workspace.id);
  const kit = savedMedia(state.workspace.brand);
  const prospect = state.prospects?.find(
    (item) => !item.excluded && item.snapshot.company?.trim(),
  );
  expect(
    prospect,
    "a fixture prospect with a company is available to select",
  ).toBeTruthy();
  if (!prospect)
    throw new Error("No fixture prospect with a company is available");
  const prospectCompany = prospect.snapshot.company!.trim();

  const homePrompt = "Keep this conversation open while I review an account.";
  const composer = page.locator("#assistant-input");
  await expect(composer).toBeVisible();
  await composer.fill(homePrompt);
  await composer.press("Enter");
  await expect(page).toHaveURL(/[?&]c=/);
  const threadId = new URL(page.url()).searchParams.get("c");
  expect(threadId).toMatch(/\S/);
  if (!threadId) throw new Error("The home prompt did not create a thread");
  await expect(
    page.getByText(homePrompt, { exact: true }).last(),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const response = await context.request.get(
        `${base}/threads/${threadId}/messages`,
      );
      if (!response.ok()) return false;
      const messages = await response.json();
      return messages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "assistant" && Boolean(message.content?.trim()),
      );
    })
    .toBe(true);

  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Search accounts",
    exact: true,
  });
  await expect(search).toBeVisible();
  expect(new URL(page.url()).searchParams.get("c")).toBe(threadId);
  await search.fill(prospect.snapshot.email ?? prospectCompany);
  const row = page.getByRole("row").filter({ hasText: prospectCompany });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Account detail" }),
  ).toBeVisible();
  await expect(
    page.getByText(homePrompt, { exact: true }).last(),
  ).toBeVisible();
  await ensureClientBrandLabel(page);

  const accountImages = await page.getByRole("img").evaluateAll((images) =>
    images.map((image) => ({
      src: (image as HTMLImageElement).src,
      alt: image.getAttribute("alt") ?? "",
    })),
  );
  const kitSources = accountImages.filter(({ src }) =>
    kit.references.some((ref) =>
      src.includes(`/brand/media/${encodeURIComponent(ref.id)}`),
    ),
  );
  expect(
    kitSources.length,
    "account details use a saved image from the active client kit",
  ).toBeGreaterThan(0);

  const submissions: Array<{
    content?: unknown;
    context?: { prospectIds?: string[]; screen?: string };
  }> = [];
  page.on("request", (request) => {
    if (
      request
        .url()
        .includes(`/api/workspaces/${target.workspace.id}/chat/stream`) &&
      request.method() === "POST"
    ) {
      submissions.push(request.postDataJSON());
    }
  });
  await page.getByRole("button", { name: "Ask Nabil" }).click();
  const panel = page.getByRole("region", { name: "Nabil assistant" });
  await expect(panel).toBeVisible();
  const draftFollowup = panel.getByRole("button", {
    name: /draft.{0,20}follow[-\s]?up/i,
  });
  await expect(draftFollowup).toBeVisible();
  await ensureClientBrandLabel(panel);
  const panelSources = await panel
    .getByRole("img")
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).src),
    );
  expect(
    panelSources.some((src) =>
      kit.references.some((ref) =>
        src.includes(`/brand/media/${encodeURIComponent(ref.id)}`),
      ),
    ),
  ).toBe(true);

  expect(
    submissions,
    "opening Nabil must not send the quick action",
  ).toHaveLength(0);
  const followupRequest = page.waitForRequest(
    (request) =>
      request
        .url()
        .includes(`/api/workspaces/${target.workspace.id}/chat/stream`) &&
      request.method() === "POST",
  );
  await draftFollowup.click();
  const request = await followupRequest;
  const response = await request.response();
  expect(response?.ok()).toBe(true);
  const payload = request.postDataJSON() as {
    content?: unknown;
    context?: { prospectIds?: string[]; screen?: string };
  };
  expect(typeof payload.content).toBe("string");
  const content = (payload.content as string).trim();
  expect(content.length).toBeGreaterThan(0);
  await expect(page.getByText(content, { exact: true }).last()).toBeVisible();
  await expect(
    page.getByText(homePrompt, { exact: true }).last(),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const messagesResponse = await context.request.get(
        `${base}/threads/${threadId}/messages`,
      );
      if (!messagesResponse.ok()) return false;
      const messages = await messagesResponse.json();
      return messages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" && message.content === content,
      );
    })
    .toBe(true);
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions).toHaveLength(1);
  expect(payload.context?.prospectIds).toContain(prospect.id);
  expect(payload.context?.screen).toBe("Accounts");
  expect(new URL(page.url()).searchParams.get("c")).toBe(threadId);
});

test("Arabic phone layout keeps the gallery usable and failed brand media has a text fallback", async ({
  page,
  context,
}) => {
  await page.goto("/?s=Plays");
  const target = (await fixtureMemberships(context)).find(
    ({ client }) => client.brandName === "Ruwad Learning",
  )!;
  await selectWorkspace(page, target.workspace.id);
  await page
    .getByRole("button", { name: "Brand & company", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Brand & company", exact: true }),
  ).toBeVisible();
  const state = await dashboard(context, target.workspace.id);
  const kit = savedMedia(state.workspace.brand);
  const failedRef = kit.gallery[0]!;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem("revenue-ui-language", "ar"));
  await page.route(
    `**/api/workspaces/${target.workspace.id}/brand/media/${encodeURIComponent(failedRef.id)}`,
    (route) => route.fulfill({ status: 404, body: "Not found" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Brand & company", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dir))
    .toBe("rtl");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  const fallback = page.getByRole("img", { name: failedRef.alt });
  await expect(fallback).toBeVisible();
  const fallbackState = await fallback.evaluate((element) => ({
    tagName: element.tagName,
    visibleText: (element as HTMLElement).innerText.trim(),
  }));
  expect(
    fallbackState.tagName,
    "a failed img alone is not a fallback",
  ).not.toBe("IMG");
  expect(fallbackState.visibleText.length).toBeGreaterThan(0);
  for (const ref of [
    kit.primary,
    ...kit.gallery.filter((item) => item.id !== failedRef.id),
  ]) {
    await expectSavedImage(page, target.workspace, ref);
  }
});
