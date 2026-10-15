import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { assetPng, renderPng, Storage, config } from "@revenue/backend";

const workspaceId = randomUUID(),
  assetId = randomUUID();
afterAll(async () => {
  await rm(join(config.storagePath, workspaceId), {
    recursive: true,
    force: true,
  });
});
describe("PNG asset export", () => {
  it("renders readable-size PNGs without scripts or external resource requests", async () => {
    let requests = 0;
    const server = createServer((_req, res) => {
      requests++;
      res.end("unexpected");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    try {
      const png = await renderPng(
        `<!doctype html><html lang="ar" dir="rtl"><h1>دليل الفريق</h1><img src="http://127.0.0.1:${port}/tracking"><script>fetch('http://127.0.0.1:${port}/script')</script></html>`,
      );
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.readUInt32BE(16)).toBe(1588);
      expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(2246);
      expect(requests).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("coalesces identical exports, caches output and invalidates the cache for changed HTML", async () => {
    const storage = new Storage();
    const asset = { id: assetId, htmlKey: `${assetId}.html` };
    await storage.put(
      workspaceId,
      asset.htmlKey,
      "<!doctype html><h1>First version</h1>",
      "text/html",
    );
    const [a, b] = await Promise.all([
      assetPng(workspaceId, asset),
      assetPng(workspaceId, asset),
    ]);
    expect(a.equals(b)).toBe(true);
    const cached = await assetPng(workspaceId, asset);
    expect(cached.equals(a)).toBe(true);
    await storage.put(
      workspaceId,
      asset.htmlKey,
      "<!doctype html><h1>Changed version</h1>",
      "text/html",
    );
    expect((await assetPng(workspaceId, asset)).equals(a)).toBe(false);
  });
});
