import {
  expect,
  test,
  type APIRequestContext,
  type Playwright,
} from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const targetSpecs = [
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

const e2eDirectory = dirname(fileURLToPath(import.meta.url));
const authState =
  process.env.BRAND_MEDIA_AUTH_STATE ??
  resolve(e2eDirectory, "../../../../.local/e2e-auth.json");

type Workspace = { id: string; name: string };
type MeWorkspaceEntry = Workspace | { workspace: Workspace };
type MeResponse = { workspaces?: MeWorkspaceEntry[] };

type MediaReference = {
  id: string;
  key: string;
  mimeType: string;
  alt: string;
  role: string;
  provenance: string;
};

type BrandMedia = {
  logo?: MediaReference;
  mark?: MediaReference;
  gallery: MediaReference[];
};

type Brand = {
  name: string;
  primary?: string;
  accent?: string;
  website?: string;
  palette?: unknown[];
  visualDirection?: string;
  photoDirection?: string;
  media?: BrandMedia;
};

type CompleteBrand = Brand & { palette: unknown[]; media: BrandMedia };

type Dashboard = {
  workspace: Workspace & { brand: Brand };
  fixture: boolean;
  modelFixture: boolean;
};

type Target = {
  workspace: Workspace;
  dashboard: Dashboard;
};

async function withFixtureTargets<T>(
  playwright: Playwright,
  run: (api: APIRequestContext, targets: Target[]) => Promise<T>,
): Promise<T> {
  const api = await playwright.request.newContext({
    baseURL: process.env.TEST_BASE_URL,
    storageState: authState,
  });
  try {
    const healthResponse = await api.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    expect(await healthResponse.json()).toMatchObject({ mode: "fixture" });

    const meResponse = await api.get("/api/me");
    expect(meResponse.status()).toBe(200);
    const me = (await meResponse.json()) as MeResponse;
    const memberships = (me.workspaces ?? []).map((entry) =>
      "workspace" in entry ? entry.workspace : entry,
    );
    const targets: Target[] = [];

    for (const spec of targetSpecs) {
      const matches = memberships.filter(
        (workspace) => workspace.name === spec.workspaceName,
      );
      expect(matches, `one membership for ${spec.workspaceName}`).toHaveLength(
        1,
      );
      const workspace = matches[0];
      const response = await api.get(`/api/workspaces/${workspace.id}`);
      expect(response.status(), `dashboard for ${spec.workspaceName}`).toBe(
        200,
      );
      const dashboard = (await response.json()) as Dashboard;
      expect(dashboard.fixture, `${spec.workspaceName} fixture guard`).toBe(
        true,
      );
      expect(
        dashboard.modelFixture,
        `${spec.workspaceName} model fixture guard`,
      ).toBe(true);
      targets.push({ workspace, dashboard });
    }

    return await run(api, targets);
  } finally {
    await api.dispose();
  }
}

function brandOf(target: Target): Brand {
  return target.dashboard.workspace.brand;
}

function requireCompleteKit(target: Target): CompleteBrand {
  const brand = brandOf(target);
  expect(Array.isArray(brand.palette)).toBe(true);
  expect(brand.media).toBeTruthy();
  if (!Array.isArray(brand.palette) || !brand.media) {
    throw new Error(
      `${target.workspace.name} does not have a saved visual kit`,
    );
  }
  return brand as CompleteBrand;
}

function referencesOf(brand: CompleteBrand): MediaReference[] {
  return [brand.media.logo, brand.media.mark, ...brand.media.gallery].filter(
    (reference): reference is MediaReference => Boolean(reference),
  );
}

function expectReferenceShape(reference: MediaReference) {
  expect(reference).toEqual(
    expect.objectContaining({
      id: expect.stringMatching(/\S/),
      key: expect.stringMatching(/\S/),
      mimeType: expect.stringMatching(/^image\/(?:png|jpeg|webp|svg\+xml)$/),
      alt: expect.stringMatching(/\S/),
      role: expect.stringMatching(/\S/),
      provenance: expect.stringMatching(/^(?:generated|uploaded|extracted)$/),
    }),
  );
  expect(reference.key).not.toMatch(/^https?:\/\//i);
}

function expectRasterImage(bytes: Buffer, mimeType: string, minimumEdge = 1) {
  let dimensions: { width: number; height: number } | undefined;

  if (mimeType === "image/png") {
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
    dimensions = {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  } else if (mimeType === "image/jpeg") {
    expect(bytes.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (
        [0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7].includes(marker)
      )
        continue;
      const segmentLength = bytes.readUInt16BE(offset);
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        dimensions = {
          height: bytes.readUInt16BE(offset + 3),
          width: bytes.readUInt16BE(offset + 5),
        };
        break;
      }
      offset += segmentLength;
    }
  } else if (mimeType === "image/webp") {
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    const chunkType = bytes.toString("ascii", 12, 16);
    if (chunkType === "VP8X") {
      dimensions = {
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    } else if (chunkType === "VP8 ") {
      dimensions = {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    } else if (chunkType === "VP8L") {
      expect(bytes[20]).toBe(0x2f);
      dimensions = {
        width: 1 + bytes[21]! + ((bytes[22]! & 0x3f) << 8),
        height:
          1 +
          (bytes[22]! >> 6) +
          (bytes[23]! << 2) +
          ((bytes[24]! & 0x0f) << 10),
      };
    }
  }

  expect(dimensions, `dimensions for ${mimeType}`).toBeDefined();
  expect(dimensions!.width).toBeGreaterThanOrEqual(minimumEdge);
  expect(dimensions!.height).toBeGreaterThanOrEqual(minimumEdge);
}

function expectCompleteKit(target: Target): CompleteBrand {
  const spec = targetSpecs.find(
    (item) => item.workspaceName === target.workspace.name,
  )!;
  const brand = requireCompleteKit(target);
  expect(brand.name.toLowerCase()).toContain(spec.brandName.toLowerCase());
  expect(Array.isArray(brand.palette)).toBe(true);
  const palette = (JSON.stringify(brand.palette) ?? "").toLowerCase();
  for (const color of spec.colors) expect(palette).toContain(color);
  const direction = brand.visualDirection ?? brand.photoDirection;
  expect(typeof direction).toBe("string");
  expect((direction ?? "").trim().length).toBeGreaterThan(20);
  expect(brand.media.logo ?? brand.media.mark).toBeTruthy();
  expect((brand.media.logo ?? brand.media.mark)!.provenance).toBe("generated");
  expect(brand.media.gallery).toHaveLength(3);
  for (const reference of referencesOf(brand)) {
    expectReferenceShape(reference);
    expect(reference.alt.trim().length).toBeGreaterThan(3);
  }
  for (const reference of brand.media.gallery) {
    expect(reference.mimeType).toMatch(/^image\/(?:png|jpeg|webp)$/);
    expect(reference.alt.trim().length).toBeGreaterThan(10);
    expect(reference.provenance).toBe("generated");
  }
  return brand;
}

function baseBrand(
  brand: Brand,
): Pick<Brand, "name" | "primary" | "accent" | "website"> {
  return {
    name: brand.name,
    primary: brand.primary,
    accent: brand.accent,
    website: brand.website,
  };
}

async function readBrand(api: APIRequestContext, workspaceId: string) {
  const response = await api.get(`/api/workspaces/${workspaceId}`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as Dashboard).workspace.brand;
}

test("the three approved Mirqab clients have stable complete saved visual kits", async ({
  playwright,
}) => {
  await withFixtureTargets(playwright, async (_api, targets) => {
    expect(targets.map((target) => target.workspace.name).sort()).toEqual(
      targetSpecs.map((spec) => spec.workspaceName).sort(),
    );
    for (const target of targets) {
      expectCompleteKit(target);
    }

    for (const target of targets) {
      const firstIds = referencesOf(requireCompleteKit(target)).map(
        (reference) => reference.id,
      );
      expect(new Set(firstIds).size).toBe(firstIds.length);
      const secondResponse = await _api.get(
        `/api/workspaces/${target.workspace.id}`,
      );
      expect(secondResponse.status()).toBe(200);
      const secondDashboard = await secondResponse.json();
      expect(secondDashboard.fixture).toBe(true);
      expect(secondDashboard.modelFixture).toBe(true);
      const repeatedTarget: Target = { ...target, dashboard: secondDashboard };
      expect(
        referencesOf(requireCompleteKit(repeatedTarget)).map(
          (reference) => reference.id,
        ),
      ).toEqual(firstIds);
    }
  });
});

test("saved company media serves private image bytes only in its workspace", async ({
  playwright,
}) => {
  await withFixtureTargets(playwright, async (api, targets) => {
    for (const target of targets) expectCompleteKit(target);

    const brands = targets.map((target) => expectCompleteKit(target));
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!;
      const brand = brands[index]!;
      for (const reference of referencesOf(brand)) {
        const response = await api.get(
          `/api/workspaces/${target.workspace.id}/brand/media/${encodeURIComponent(reference.id)}`,
        );
        expect(
          response.status(),
          `${target.workspace.name} ${reference.role}`,
        ).toBe(200);
        const headers = response.headers();
        expect(headers["content-type"]?.split(";", 1)[0]?.toLowerCase()).toBe(
          reference.mimeType,
        );
        expect(headers["cache-control"]).toMatch(/private/i);
        expect(headers["x-content-type-options"]).toBe("nosniff");
        const bytes = await response.body();
        expect(bytes.length).toBeGreaterThan(64);
        if (reference.mimeType === "image/svg+xml") {
          expect(bytes.toString("utf8")).toMatch(/<svg\b/i);
          expect(headers["content-security-policy"]).toMatch(/sandbox/i);
          expect(headers["content-security-policy"]).not.toMatch(
            /allow-scripts/i,
          );
        } else {
          expectRasterImage(
            bytes,
            reference.mimeType,
            brand.media.gallery.includes(reference) ? 256 : 1,
          );
        }
      }
    }

    const first = targets[0]!;
    const foreignId = brands[1]!.media.gallery[0]!.id;
    expect(
      referencesOf(brands[0]!).map((reference) => reference.id),
    ).not.toContain(foreignId);
    const crossWorkspace = await api.get(
      `/api/workspaces/${first.workspace.id}/brand/media/${encodeURIComponent(foreignId)}`,
    );
    expect(crossWorkspace.status()).toBe(404);

    const unknown = await api.get(
      `/api/workspaces/${first.workspace.id}/brand/media/unknown-brand-media-reference`,
    );
    expect(unknown.status()).toBe(404);

    const anonymous = await playwright.request.newContext({
      baseURL: process.env.TEST_BASE_URL,
    });
    try {
      const unauthenticated = await anonymous.get(
        `/api/workspaces/${first.workspace.id}/brand/media/${encodeURIComponent(brands[0]!.media.gallery[0]!.id)}`,
      );
      expect(unauthenticated.status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }

    const traversal = await api.get(
      `/api/workspaces/${first.workspace.id}/brand/media/${encodeURIComponent("../../../../etc/passwd")}`,
    );
    expect([400, 404]).toContain(traversal.status());
  });
});

test("ordinary brand saves preserve the kit, explicit gallery arrays replace, and invalid media is atomic", async ({
  playwright,
}) => {
  await withFixtureTargets(playwright, async (api, targets) => {
    const target = targets[0]!;
    const original = expectCompleteKit(target);
    const originalSnapshot = structuredClone(original);
    const base = `/api/workspaces/${target.workspace.id}`;
    const basic = baseBrand(original);
    let changed = false;

    try {
      const ordinarySave = await api.patch(base, { data: { brand: basic } });
      changed = ordinarySave.ok();
      expect(ordinarySave.status(), await ordinarySave.text()).toBe(200);
      const afterOrdinarySave = await readBrand(api, target.workspace.id);
      expect(afterOrdinarySave.media).toEqual(originalSnapshot.media);
      expect(afterOrdinarySave.palette).toEqual(originalSnapshot.palette);
      expect(
        afterOrdinarySave.visualDirection ?? afterOrdinarySave.photoDirection,
      ).toEqual(
        originalSnapshot.visualDirection ?? originalSnapshot.photoDirection,
      );

      const shorterGallery = [originalSnapshot.media.gallery[0]!];
      const replaceGallery = await api.patch(base, {
        data: {
          brand: {
            ...basic,
            palette: originalSnapshot.palette,
            visualDirection: originalSnapshot.visualDirection,
            photoDirection: originalSnapshot.photoDirection,
            media: { ...originalSnapshot.media, gallery: shorterGallery },
          },
        },
      });
      expect(replaceGallery.status(), await replaceGallery.text()).toBe(200);
      const afterReplace = await readBrand(api, target.workspace.id);
      expect(afterReplace.media.gallery).toEqual(shorterGallery);

      const badMimeBrand = structuredClone(originalSnapshot);
      badMimeBrand.media.gallery[0].mimeType = "text/html";
      const badMime = await api.patch(base, { data: { brand: badMimeBrand } });
      expect(badMime.status()).toBe(400);
      expect(await readBrand(api, target.workspace.id)).toEqual({
        ...originalSnapshot,
        media: { ...originalSnapshot.media, gallery: shorterGallery },
      });

      const traversalBrand = structuredClone(originalSnapshot);
      traversalBrand.media.gallery[0].key = "../../outside/private-file.png";
      const badKey = await api.patch(base, { data: { brand: traversalBrand } });
      expect(badKey.status()).toBe(400);
      expect(await readBrand(api, target.workspace.id)).toEqual({
        ...originalSnapshot,
        media: { ...originalSnapshot.media, gallery: shorterGallery },
      });
    } finally {
      if (changed) {
        const restored = await api.patch(base, {
          data: { brand: originalSnapshot },
        });
        expect(
          restored.status(),
          `restore ${target.workspace.name}: ${await restored.text()}`,
        ).toBe(200);
        expect(await readBrand(api, target.workspace.id)).toEqual(
          originalSnapshot,
        );
      }
    }
  });
});
