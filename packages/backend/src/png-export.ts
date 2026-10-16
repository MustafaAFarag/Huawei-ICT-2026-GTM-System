import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { digest } from "./policy.js";
import { normalizeAssetBidi } from "./asset-bidi.js";
import { renderPng, renderPdf } from "./providers.js";
import {
  isContentFormat,
  renderA4Pdf,
  renderSlidesPdf,
  renderSlidesZip,
} from "./formats/index.js";
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
type ExportAsset = { id: string; htmlKey: string; template?: string };
export const assetPng = (workspaceId: string, asset: ExportAsset) =>
  assetExport(workspaceId, asset, "png");
export const assetPdf = (workspaceId: string, asset: ExportAsset) =>
  assetExport(workspaceId, asset, "pdf");
export const assetZip = (workspaceId: string, asset: ExportAsset) =>
  assetExport(workspaceId, asset, "zip");
const SLIDES = ["instagram-carousel", "linkedin-carousel"];
async function assetExport(
  workspaceId: string,
  asset: ExportAsset,
  format: "png" | "pdf" | "zip",
) {
  const storage = new Storage();
  // Flipbook PDFs print the static page view; the interactive file carries a script.
  const source =
    asset.template === "flipbook" && format === "pdf"
      ? `${asset.id}.print.html`
      : asset.htmlKey;
  const raw = (await storage.get(workspaceId, source)).toString("utf8");
  // Format templates already isolate mixed scripts; reparsing would alter email markup.
  const html = isContentFormat(asset.template ?? "") ? raw : normalizeAssetBidi(raw);
  const key = `${asset.id}-${digest(html).slice(0, 12)}.${format}`;
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
    const slides = SLIDES.includes(asset.template ?? "");
    const bytes = Buffer.from(
      await (format === "zip"
        ? renderSlidesZip(html)
        : format === "png"
          ? renderPng(html)
          : slides
            ? renderSlidesPdf(html)
            : asset.template === "flipbook"
              ? renderA4Pdf(html)
              : renderPdf(html)),
    );
    await storage.put(
      workspaceId,
      key,
      bytes,
      format === "png"
        ? "image/png"
        : format === "zip"
          ? "application/zip"
          : "application/pdf",
    );
    return bytes;
  })();
  inFlight.set(id, rendering);
  try {
    return await rendering;
  } finally {
    inFlight.delete(id);
  }
}
