import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const targetSpecs = [
  {
    workspaceName: "Mirqab · Fintech client (KSA)",
    brandName: "Sarafa Pay",
    template: "instagram-carousel",
    language: "en",
  },
  {
    workspaceName: "Mirqab · Logistics client (Egypt)",
    brandName: "Wasla Express",
    template: "flipbook",
    language: "ar-EG",
  },
  {
    workspaceName: "Mirqab · EdTech client (UAE)",
    brandName: "Ruwad Learning",
    template: "offer-one-pager",
    language: "en",
  },
] as const;

const e2eDirectory = dirname(fileURLToPath(import.meta.url));
const authState =
  process.env.BRAND_MEDIA_AUTH_STATE ??
  resolve(e2eDirectory, "../../../../.local/e2e-auth.json");

type Workspace = { id: string; name: string };
type MediaReference = {
  id: string;
  mimeType: string;
  alt: string;
  role: string;
};
type Brand = {
  name?: string;
  primary?: string;
  accent?: string;
  website?: string;
  photoDirection?: string;
  visualDirection?: string;
  media?: {
    logo?: MediaReference;
    mark?: MediaReference;
    gallery?: MediaReference[];
  };
};
type SavedImage = {
  reference: MediaReference;
  bytes: Buffer;
};
type FixtureTarget = {
  workspace: Workspace;
  brand: Brand;
  logo: SavedImage;
  gallery: SavedImage[];
};
type PublicRun = {
  id: string;
  state: string;
  output?: Array<{ result?: { id?: string } }>;
};
type PublicAsset = { id: string; approvedAt?: string | null };
type PublicProspect = {
  id: string;
  evidence?: Array<{ approved?: boolean }>;
};
type WorkspaceDashboard = {
  runs?: PublicRun[];
  assets?: PublicAsset[];
  prospects?: PublicProspect[];
};

async function readSavedImage(
  api: APIRequestContext,
  workspaceId: string,
  reference: MediaReference,
): Promise<SavedImage> {
  const response = await api.get(
    `/api/workspaces/${workspaceId}/brand/media/${encodeURIComponent(reference.id)}`,
  );
  expect(response.status(), `${reference.role} media response`).toBe(200);
  expect(
    response.headers()["content-type"]?.split(";", 1)[0]?.toLowerCase(),
  ).toBe(reference.mimeType);
  const bytes = await response.body();
  expect(bytes.length, `${reference.role} media bytes`).toBeGreaterThan(64);
  return { reference, bytes };
}

async function readFixtureBrand(
  api: APIRequestContext,
  workspace: Workspace,
): Promise<Brand> {
  const response = await api.get(`/api/workspaces/${workspace.id}`);
  expect(response.status(), `${workspace.name} dashboard`).toBe(200);
  const dashboard = await response.json();
  expect(dashboard.fixture, `${workspace.name} fixture guard`).toBe(true);
  expect(dashboard.modelFixture, `${workspace.name} model fixture guard`).toBe(
    true,
  );
  return dashboard.workspace.brand as Brand;
}

async function readTarget(
  api: APIRequestContext,
  workspace: Workspace,
  expectedBrandName: string,
): Promise<FixtureTarget> {
  const brand = await readFixtureBrand(api, workspace);
  expect(brand.name?.toLowerCase()).toContain(expectedBrandName.toLowerCase());
  const logoReference = brand.media?.logo ?? brand.media?.mark;
  const galleryReferences = brand.media?.gallery ?? [];
  expect(logoReference, `${workspace.name} saved logo`).toBeTruthy();
  expect(
    galleryReferences,
    `${workspace.name} saved gallery photos`,
  ).not.toHaveLength(0);
  if (!logoReference || galleryReferences.length === 0) {
    throw new Error(`${workspace.name} is missing saved brand media`);
  }
  for (const reference of galleryReferences) {
    expect(reference.mimeType).toMatch(/^image\/(?:png|jpeg|webp)$/);
  }

  const [logo, ...gallery] = await Promise.all([
    readSavedImage(api, workspace.id, logoReference),
    ...galleryReferences.map((reference) =>
      readSavedImage(api, workspace.id, reference),
    ),
  ]);
  return { workspace, brand, logo, gallery };
}

async function findTarget(
  api: APIRequestContext,
  workspaceName: string,
  expectedBrandName: string,
): Promise<FixtureTarget> {
  const meResponse = await api.get("/api/me");
  expect(meResponse.status()).toBe(200);
  const me = await meResponse.json();
  const memberships = (me.workspaces ?? []).map(
    (entry: { workspace?: Workspace } & Workspace) => entry.workspace ?? entry,
  );
  const matches = memberships.filter(
    (workspace: Workspace) => workspace.name === workspaceName,
  );
  expect(matches, `membership for ${workspaceName}`).toHaveLength(1);
  return readTarget(api, matches[0]!, expectedBrandName);
}

async function findWorkspace(api: APIRequestContext, workspaceName: string) {
  const meResponse = await api.get("/api/me");
  expect(meResponse.status()).toBe(200);
  const me = await meResponse.json();
  const memberships = (me.workspaces ?? []).map(
    (entry: { workspace?: Workspace } & Workspace) => entry.workspace ?? entry,
  );
  const matches = memberships.filter(
    (workspace: Workspace) => workspace.name === workspaceName,
  );
  expect(matches, `membership for ${workspaceName}`).toHaveLength(1);
  return matches[0] as Workspace;
}

async function makeAsset(
  api: APIRequestContext,
  target: Pick<FixtureTarget, "workspace">,
  options: {
    template: string;
    language: string;
    prospectIds?: string[];
  },
) {
  const base = `/api/workspaces/${target.workspace.id}`;
  const input = {
    tool: "make_asset",
    requestKey: randomUUID(),
    prospectIds: options.prospectIds ?? [],
    draftIds: [],
    play: "P1",
    language: options.language,
    template: options.template,
    approvedSpend: false,
    holdoutPercent: 0,
  };

  const quoteResponse = await api.post(`${base}/quotes`, { data: input });
  expect(quoteResponse.ok(), await quoteResponse.text()).toBe(true);
  const quote = await quoteResponse.json();
  expect(quote.id).toBeTruthy();
  const quoteApproval = await api.post(`${base}/quotes/${quote.id}/approve`);
  expect(quoteApproval.ok(), await quoteApproval.text()).toBe(true);

  const runResponse = await api.post(`${base}/runs`, {
    data: { ...input, spendApprovalId: quote.id },
  });
  expect(runResponse.status(), await runResponse.text()).toBe(201);
  const run = await runResponse.json();
  expect(run.id).toMatch(/\S/);

  let completedRun: PublicRun | undefined;
  await expect
    .poll(
      async () => {
        const dashboardResponse = await api.get(base);
        expect(dashboardResponse.status()).toBe(200);
        const dashboard =
          (await dashboardResponse.json()) as WorkspaceDashboard;
        completedRun = dashboard.runs?.find((item) => item.id === run.id);
        return completedRun?.state;
      },
      { timeout: 90000 },
    )
    .toBe("succeeded");
  expect(completedRun?.id).toBe(run.id);
  const assetId = completedRun?.output?.[0]?.result?.id;
  expect(assetId, `asset from run ${run.id}`).toMatch(/\S/);
  console.info(`[brand-render] public run ${run.id} produced asset ${assetId}`);
  return { runId: run.id as string, assetId: assetId! };
}

async function assetHtml(
  api: APIRequestContext,
  workspaceId: string,
  assetId: string,
) {
  const response = await api.get(
    `/api/workspaces/${workspaceId}/assets/${assetId}/html`,
  );
  expect(response.status(), `HTML for asset ${assetId}`).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  return response.text();
}

type DataImage = { uri: string; mimeType: string; bytes: Buffer };

function extractDataImages(html: string): DataImage[] {
  const matches = html.matchAll(
    /data:(image\/(?:png|jpeg|webp|svg\+xml))((?:;[^,;"'\s]*)*),([^"'\s)<>]+)/gi,
  );
  return [...matches].map((match) => {
    const uri = match[0];
    const mimeType = match[1]!.toLowerCase();
    const parameters = match[2] ?? "";
    const payload = match[3]!;
    const bytes = /(?:^|;)base64(?:;|$)/i.test(parameters)
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload));
    return { uri, mimeType, bytes };
  });
}

function assertSavedMediaEmbedded(html: string, target: FixtureTarget) {
  const embedded = extractDataImages(html);
  expect(
    embedded.length,
    `${target.brand.name} embedded image data`,
  ).toBeGreaterThanOrEqual(2);
  expect(
    embedded.some(
      (image) =>
        image.mimeType === target.logo.reference.mimeType &&
        image.bytes.equals(target.logo.bytes),
    ),
    `${target.brand.name} HTML contains the saved logo bytes`,
  ).toBe(true);
  expect(
    embedded.some((image) =>
      target.gallery.some(
        (photo) =>
          image.mimeType === photo.reference.mimeType &&
          image.bytes.equals(photo.bytes),
      ),
    ),
    `${target.brand.name} HTML contains bytes from a saved gallery photo`,
  ).toBe(true);
}

async function assertOfflinePhotoLoads(
  browser: Browser,
  html: string,
  target: FixtureTarget,
) {
  const galleryUris = extractDataImages(html)
    .filter((image) =>
      target.gallery.some((photo) => image.bytes.equals(photo.bytes)),
    )
    .map((image) => image.uri);
  expect(
    galleryUris,
    `${target.brand.name} saved photo data URI`,
  ).not.toHaveLength(0);
  if (galleryUris.length === 0) {
    throw new Error(`${target.brand.name} saved photo was not embedded`);
  }

  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (uris) =>
        [...document.images].some(
          (image) =>
            uris.includes(image.src) &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      galleryUris,
      { timeout: 10000 },
    );
    const loadedImage = await page.evaluate(
      (uris) =>
        [...document.images].some(
          (image) =>
            uris.includes(image.src) &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      galleryUris,
    );
    expect(loadedImage, `${target.brand.name} saved photo loads offline`).toBe(
      true,
    );
  } finally {
    await context.close();
  }
}

async function approveAsset(
  api: APIRequestContext,
  workspaceId: string,
  assetId: string,
) {
  const response = await api.post(
    `/api/workspaces/${workspaceId}/assets/${assetId}/approve`,
  );
  expect(response.ok(), await response.text()).toBe(true);
}

function hexToRgb(hex: string) {
  const value = hex.replace(/^#/, "");
  return `rgb(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)})`;
}

test.use({ trace: "off", screenshot: "off" });

test("metadata-only art direction edits preserve an approved asset snapshot", async ({
  playwright,
}) => {
  test.setTimeout(180000);
  expect(process.env.MODEL_MODE).toBe("fixture");
  expect(process.env.PROVIDER_MODE).toBe("fixture");

  const api = await playwright.request.newContext({
    baseURL: process.env.BRAND_RENDER_BASE_URL ?? process.env.TEST_BASE_URL,
    storageState: authState,
  });
  let restoreNeeded = false;
  try {
    const healthResponse = await api.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    expect(await healthResponse.json()).toMatchObject({ mode: "fixture" });

    const workspace = await findWorkspace(api, "Mirqab · Fintech client (KSA)");
    const originalBrand = structuredClone(
      await readFixtureBrand(api, workspace),
    ) as Brand;
    const directionField = originalBrand.photoDirection
      ? "photoDirection"
      : originalBrand.visualDirection
        ? "visualDirection"
        : undefined;
    expect(directionField, "saved art direction metadata").toBeTruthy();
    if (!directionField) throw new Error("No saved art direction metadata");

    const asset = await makeAsset(
      api,
      { workspace },
      {
        template: "instagram-carousel",
        language: "en",
      },
    );
    const base = `/api/workspaces/${workspace.id}/assets/${asset.assetId}`;
    const htmlBefore = await assetHtml(api, workspace.id, asset.assetId);
    expect((await api.get(`${base}/zip`)).status()).toBe(409);
    await approveAsset(api, workspace.id, asset.assetId);

    const approvedDashboardResponse = await api.get(
      `/api/workspaces/${workspace.id}`,
    );
    expect(approvedDashboardResponse.status()).toBe(200);
    const approvedDashboard = await approvedDashboardResponse.json();
    const approvedState = approvedDashboard as WorkspaceDashboard;
    const approvedAsset = approvedState.assets?.find(
      (current) => current.id === asset.assetId,
    );
    expect(approvedAsset, `approved asset ${asset.assetId}`).toBeTruthy();
    const approvedAt = approvedAsset?.approvedAt as string | null | undefined;
    expect(approvedAt, `approval timestamp for ${asset.assetId}`).toBeTruthy();

    const oldDirection = originalBrand[directionField];
    const direction = oldDirection ?? "Editorial photography";
    const replacement =
      direction.length === 0
        ? "Editorial photography"
        : `${direction.slice(0, -1)}${direction.endsWith("x") ? "y" : "x"}`;
    const changedBrand = { ...originalBrand, [directionField]: replacement };

    try {
      restoreNeeded = true;
      const edit = await api.patch(`/api/workspaces/${workspace.id}`, {
        data: { brand: changedBrand },
      });
      expect(edit.status(), await edit.text()).toBe(200);
      const editedDashboardResponse = await api.get(
        `/api/workspaces/${workspace.id}`,
      );
      expect(editedDashboardResponse.status()).toBe(200);
      const editedDashboard = await editedDashboardResponse.json();
      expect(editedDashboard.workspace.brand[directionField]).toBe(replacement);

      expect(
        await assetHtml(api, workspace.id, asset.assetId),
        "saved HTML remains the original render snapshot",
      ).toBe(htmlBefore);
      const currentDashboardResponse = await api.get(
        `/api/workspaces/${workspace.id}`,
      );
      expect(currentDashboardResponse.status()).toBe(200);
      const currentDashboard = await currentDashboardResponse.json();
      const currentState = currentDashboard as WorkspaceDashboard;
      const currentAsset = currentState.assets?.find(
        (current) => current.id === asset.assetId,
      );
      expect(currentAsset?.approvedAt).toBe(approvedAt);
      const download = await api.get(`${base}/zip`);
      expect(download.status()).toBe(200);
      expect(download.headers()["content-type"]).toContain("application/zip");
    } finally {
      if (restoreNeeded) {
        const restore = await api.patch(`/api/workspaces/${workspace.id}`, {
          data: { brand: originalBrand },
        });
        expect(restore.ok(), await restore.text()).toBe(true);
        const restoredDashboardResponse = await api.get(
          `/api/workspaces/${workspace.id}`,
        );
        expect(restoredDashboardResponse.status()).toBe(200);
        const restoredDashboard = await restoredDashboardResponse.json();
        expect(restoredDashboard.workspace.brand).toEqual(originalBrand);
      }
    }
  } finally {
    await api.dispose();
  }
});

test("generated assets embed saved brand media and remain useful offline", async ({
  playwright,
}) => {
  test.setTimeout(300000);
  expect(process.env.MODEL_MODE).toBe("fixture");
  expect(process.env.PROVIDER_MODE).toBe("fixture");

  const api = await playwright.request.newContext({
    baseURL: process.env.BRAND_RENDER_BASE_URL ?? process.env.TEST_BASE_URL,
    storageState: authState,
  });
  let browser: Browser | undefined;
  try {
    const healthResponse = await api.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    expect(await healthResponse.json()).toMatchObject({ mode: "fixture" });

    const targets = await Promise.all(
      targetSpecs.map((spec) =>
        findTarget(api, spec.workspaceName, spec.brandName),
      ),
    );
    const [sarafa, wasla, ruwad] = targets as [
      FixtureTarget,
      FixtureTarget,
      FixtureTarget,
    ];
    browser = await playwright.chromium.launch({
      executablePath:
        process.env.CHROME_PATH === "playwright"
          ? undefined
          : (process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable"),
    });

    const carousel = await makeAsset(api, sarafa, {
      template: targetSpecs[0].template,
      language: targetSpecs[0].language,
    });
    const carouselHtml = await assetHtml(
      api,
      sarafa.workspace.id,
      carousel.assetId,
    );
    assertSavedMediaEmbedded(carouselHtml, sarafa);
    await assertOfflinePhotoLoads(browser, carouselHtml, sarafa);
    await approveAsset(api, sarafa.workspace.id, carousel.assetId);

    const flipbook = await makeAsset(api, wasla, {
      template: targetSpecs[1].template,
      language: targetSpecs[1].language,
    });
    const flipbookHtml = await assetHtml(
      api,
      wasla.workspace.id,
      flipbook.assetId,
    );
    assertSavedMediaEmbedded(flipbookHtml, wasla);
    await assertOfflinePhotoLoads(browser, flipbookHtml, wasla);
    await approveAsset(api, wasla.workspace.id, flipbook.assetId);

    const ruwadDashboardResponse = await api.get(
      `/api/workspaces/${ruwad.workspace.id}`,
    );
    expect(ruwadDashboardResponse.status()).toBe(200);
    const ruwadDashboard =
      (await ruwadDashboardResponse.json()) as WorkspaceDashboard;
    const reviewedProspect = ruwadDashboard.prospects?.find((prospect) =>
      prospect.evidence?.some((item) => item.approved),
    );
    expect(
      reviewedProspect,
      "Ruwad has a public prospect with previously reviewed evidence",
    ).toBeTruthy();
    if (!reviewedProspect) {
      throw new Error("Ruwad has no prospect with reviewed evidence");
    }
    const documentAsset = await makeAsset(api, ruwad, {
      template: targetSpecs[2].template,
      language: targetSpecs[2].language,
      prospectIds: [reviewedProspect.id],
    });
    const documentHtml = await assetHtml(
      api,
      ruwad.workspace.id,
      documentAsset.assetId,
    );
    assertSavedMediaEmbedded(documentHtml, ruwad);
    await assertOfflinePhotoLoads(browser, documentHtml, ruwad);

    const base = `/api/workspaces/${ruwad.workspace.id}/assets/${documentAsset.assetId}`;
    expect((await api.get(`${base}/pdf`)).status()).toBe(409);
    expect((await api.get(`${base}/png`)).status()).toBe(409);
    await approveAsset(api, ruwad.workspace.id, documentAsset.assetId);

    const pdfResponse = await api.get(`${base}/pdf`);
    expect(pdfResponse.status()).toBe(200);
    const pdf = await pdfResponse.body();
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.toString("latin1")).toMatch(/\/Subtype\s*\/Image\b/);

    const pngResponse = await api.get(`${base}/png`);
    expect(pngResponse.status()).toBe(200);
    expect(pngResponse.headers()["content-type"]).toContain("image/png");
    const png = await pngResponse.body();
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    const pngContext = await browser.newContext();
    try {
      const page = await pngContext.newPage();
      await page.route("**/*", (route) => route.abort());
      await page.goto("about:blank");
      const pngDataUri = `data:image/png;base64,${png.toString("base64")}`;
      const pixels = await page.evaluate(async (uri) => {
        const image = new Image();
        image.src = uri;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let visible = 0;
        let nonWhite = 0;
        const colors = new Map<string, number>();
        for (let offset = 0; offset < data.length; offset += 4) {
          const red = data[offset]!;
          const green = data[offset + 1]!;
          const blue = data[offset + 2]!;
          const alpha = data[offset + 3]!;
          if (alpha > 0) visible += 1;
          if (alpha > 0 && (red < 245 || green < 245 || blue < 245))
            nonWhite += 1;
          if (alpha > 0) {
            const bucket = `${red >> 3}:${green >> 3}:${blue >> 3}`;
            colors.set(bucket, (colors.get(bucket) ?? 0) + 1);
          }
        }
        const colorCount = colors.size;
        const entropy = [...colors.values()].reduce((sum, count) => {
          const probability = count / visible;
          return sum - probability * Math.log2(probability);
        }, 0);
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          visible,
          nonWhite,
          colorCount,
          entropy,
        };
      }, pngDataUri);
      expect(pixels.width).toBeGreaterThan(1);
      expect(pixels.height).toBeGreaterThan(1);
      expect(pixels.visible).toBeGreaterThan(100);
      expect(pixels.nonWhite).toBeGreaterThan(100);
      expect(pixels.colorCount).toBeGreaterThan(160);
      console.info(
        `[brand-render] PNG diagnostic: ${pixels.colorCount} color buckets, entropy ${pixels.entropy.toFixed(2)} bits`,
      );
    } finally {
      await pngContext.close();
    }

    const email = await makeAsset(api, sarafa, {
      template: "email-gmail",
      language: "en",
    });
    const emailHtml = await assetHtml(api, sarafa.workspace.id, email.assetId);
    expect(emailHtml).not.toMatch(/data:image\//i);
    const emailImageSources = [
      ...emailHtml.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ].map((match) => match[1]!);
    expect(
      emailImageSources.every((source) => source.startsWith("https://")),
    ).toBe(true);

    const fallbackWorkspace = await findWorkspace(api, "Mirqab Growth");
    const fallbackResponse = await api.get(
      `/api/workspaces/${fallbackWorkspace.id}`,
    );
    expect(fallbackResponse.status()).toBe(200);
    const fallbackDashboard = await fallbackResponse.json();
    expect(fallbackDashboard.fixture).toBe(true);
    expect(fallbackDashboard.modelFixture).toBe(true);
    const fallback = {
      workspace: fallbackWorkspace,
      brand: fallbackDashboard.workspace.brand as Brand,
    };
    expect(
      fallbackDashboard.workspace.brand.media?.logo ??
        fallbackDashboard.workspace.brand.media?.mark,
    ).toBeFalsy();
    expect(fallbackDashboard.workspace.brand.media?.gallery ?? []).toHaveLength(
      0,
    );

    const fallbackAsset = await makeAsset(api, fallback, {
      template: "instagram-carousel",
      language: "en",
    });
    const fallbackHtml = await assetHtml(
      api,
      fallback.workspace.id,
      fallbackAsset.assetId,
    );
    const fallbackContext = await browser.newContext();
    try {
      const page = await fallbackContext.newPage();
      await page.route("**/*", (route) => route.abort());
      await page.setContent(fallbackHtml, { waitUntil: "domcontentloaded" });
      const rendered = await page.evaluate(() => ({
        text: document.body.innerText.trim(),
        colors: [...document.querySelectorAll("*")].flatMap((element) => {
          const style = getComputedStyle(element);
          return [style.color, style.backgroundColor];
        }),
      }));
      expect(rendered.text.length).toBeGreaterThan(40);
      const brandColors = [
        fallback.brand.primary,
        fallback.brand.accent,
      ].filter((value): value is string => Boolean(value));
      expect(
        rendered.colors.some((color) =>
          brandColors.some((hex) => color === hexToRgb(hex)),
        ),
      ).toBe(true);
    } finally {
      await fallbackContext.close();
    }
  } finally {
    await browser?.close();
    await api.dispose();
  }
});
