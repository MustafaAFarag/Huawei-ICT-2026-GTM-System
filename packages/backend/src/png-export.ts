import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { digest } from "./policy.js";
import { renderPng } from "./providers.js";
import { Storage } from "./storage.js";

const inFlight = new Map<string, Promise<Buffer>>();
type ApprovedAsset = {
  approvedAt: Date | null;
  version: number;
  htmlKey: string | null;
  evidenceDigest: string;
};
export function assertPngApprovalUnchanged(
  before: ApprovedAsset,
  current: ApprovedAsset | null,
  evidence: unknown,
) {
  if (
    !before.approvedAt ||
    !current?.approvedAt ||
    current.approvedAt.getTime() !== before.approvedAt.getTime() ||
    current.version !== before.version ||
    current.htmlKey !== before.htmlKey ||
    current.evidenceDigest !== before.evidenceDigest ||
    current.evidenceDigest !== digest(evidence)
  )
    throw new ConflictException(
      "Asset approval changed while preparing the export. Reload and review it.",
    );
}
// Only approved callers reach this renderer. Cache by immutable HTML content and
// coalesce concurrent requests; cap new browser renders to one per API process.
export async function assetPng(
  workspaceId: string,
  asset: { id: string; htmlKey: string },
) {
  const storage = new Storage();
  const html = (await storage.get(workspaceId, asset.htmlKey)).toString("utf8");
  const key = `${asset.id}-${digest(html).slice(0, 12)}.png`;
  try {
    return await storage.get(workspaceId, key);
  } catch (error) {
    const missing = error as { code?: string; statusCode?: number };
    if (missing.code !== "ENOENT" && missing.statusCode !== 404) throw error;
  }
  const id = `${workspaceId}:${key}`;
  const existing = inFlight.get(id);
  if (existing) return existing;
  if (inFlight.size >= 1)
    throw new ServiceUnavailableException(
      "Another image export is being prepared. Try again shortly.",
    );
  const rendering = (async () => {
    const bytes = await renderPng(html);
    await storage.put(workspaceId, key, bytes, "image/png");
    return bytes;
  })();
  inFlight.set(id, rendering);
  try {
    return await rendering;
  } finally {
    inFlight.delete(id);
  }
}
