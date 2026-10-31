import { expect, test, type Page } from "@playwright/test";
import { selectWorkspace } from "./workspace";

// The three client workspaces with a saved visual kit open a full editorial brand book.
const brands = ["Sarafa Pay", "Wasla Express", "Ruwad Learning"] as const;
type Workspace = { id: string; name: string };

async function workspaceIds(page: Page) {
  const response = await page.request.get("/api/me");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    workspaces?: Array<Workspace | { workspace: Workspace }>;
  };
  const all = (body.workspaces ?? []).map((item) =>
    "workspace" in item ? item.workspace : item,
  );
  return brands.map((name) => {
    const match = all.find((workspace) => workspace.name === name);
    expect(match, `membership for ${name}`).toBeTruthy();
    return { name, id: match!.id };
  });
}

async function openBook(page: Page, id: string) {
  await page.goto("/");
  await selectWorkspace(page, id);
  await page
    .getByRole("button", { name: "Brand & company", exact: true })
    .click();
  const book = page.locator("article.bb");
  await expect(book).toBeVisible();
  return book;
}

async function loadedImages(page: Page) {
  return page.locator("article.bb img").evaluateAll(async (images) => {
    await Promise.all(
      images.map((image) =>
        (image as HTMLImageElement).decode().catch(() => null),
      ),
    );
    return images.filter(
      (image) => (image as HTMLImageElement).naturalWidth > 0,
    ).length;
  });
}

test.describe("Brand book", () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("revenue-ui-language"));
  });

  test("each client workspace shows its own complete brand book", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    for (const { name, id } of await workspaceIds(page)) {
      const book = await openBook(page, id);
      await expect(book.getByRole("heading", { level: 1, name })).toBeVisible();
      for (const chapter of [
        "Who we are",
        "The logo",
        "Colour system",
        "Type voice",
        "Pattern & motif",
        "Image direction",
        "How Caravan uses this brand",
        "Do & don’t",
      ])
        await expect(
          book.getByRole("heading", { level: 2, name: chapter }),
        ).toBeVisible();
      expect(await loadedImages(page), `${name} images`).toBeGreaterThanOrEqual(
        5,
      );
      const apps = book.locator("[data-app]");
      await expect(apps).toHaveCount(5);
      for (const app of [
        "email",
        "infographic",
        "carousel",
        "onepager",
        "deck",
      ])
        await expect(
          book.locator(`[data-app="${app}"] .bb-app-stage`),
        ).toBeVisible();
    }
  });

  test("the book reads right to left in Arabic on a phone without sideways scrolling", async ({
    page,
  }) => {
    await page.goto("/");
    for (const { id } of await workspaceIds(page)) {
      // Pick the workspace on desktop with English labels (the shared helper uses them), then go phone + Arabic.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.evaluate(() => localStorage.removeItem("revenue-ui-language"));
      await openBook(page, id);
      await page.evaluate(() =>
        localStorage.setItem("revenue-ui-language", "ar"),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      const book = page.locator("article.bb");
      await expect(book).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(
        book.getByRole("heading", {
          level: 2,
          name: "كيف يستخدم كارافان هذه الهوية",
        }),
      ).toBeVisible();
      // The book clips decoration, so check that no readable text runs past its edges.
      const clipped = await book.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return [
          ...element.querySelectorAll("h1, h2, p, li, dd, figcaption, button"),
        ]
          .filter(
            (node) =>
              !node.closest(".bb-misuse-stage") && node.textContent?.trim(),
          )
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return (
              rect.width > 0 &&
              (rect.left < box.left - 1 || rect.right > box.right + 1)
            );
          })
          .map((node) => node.textContent!.trim().slice(0, 40));
      });
      expect(clipped, "text inside the book's width").toEqual([]);
      const pageOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        pageOverflow,
        "page has no horizontal overflow",
      ).toBeLessThanOrEqual(1);
    }
  });
});
