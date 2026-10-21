import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  brandMediaKeySchema,
  brandMediaRefSchema,
  brandSchema,
  type Brand,
  type BrandMediaRef,
} from "@revenue/contracts";
import { ROOT } from "./config.js";
import { db, json } from "./database.js";
import { Storage } from "./storage.js";

const kitFileSchema = z.object({
  file: z.string().min(1).max(200),
  alt: z.string().trim().min(4).max(300),
});
const kitGalleryFileSchema = kitFileSchema.extend({
  id: z.string().min(1).max(80),
  role: z.enum(["hero", "detail", "supporting"]),
  provenance: z.enum(["generated", "uploaded", "extracted"]),
  prompt: z.string().min(1).max(5000),
  generator: z.string().min(1).max(200),
  sourceId: z.string().min(1).max(100),
});
const kitSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    workspaceName: z.string().min(1).max(200),
    brandName: z.string().min(1).max(100),
    primary: z.string().regex(/^#[\da-f]{6}$/i),
    accent: z.string().regex(/^#[\da-f]{6}$/i),
    palette: z
      .array(z.string().regex(/^#[\da-f]{6}$/i))
      .min(1)
      .max(12),
    visualDirection: z.string().trim().min(1).max(2000),
    photoDirection: z.string().trim().min(1).max(2000),
    logo: kitFileSchema,
    mark: kitFileSchema,
    gallery: z.array(kitGalleryFileSchema).length(3),
  })
  .strict();
const manifestSchema = z
  .object({ version: z.literal(1), kits: z.array(kitSchema).length(3) })
  .strict()
  .superRefine(({ kits }, context) => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const kit of kits) {
      if (ids.has(kit.id))
        context.addIssue({
          code: "custom",
          message: "Duplicate brand kit ID.",
        });
      if (names.has(kit.workspaceName))
        context.addIssue({
          code: "custom",
          message: "Duplicate brand kit workspace name.",
        });
      ids.add(kit.id);
      names.add(kit.workspaceName);
      if (
        !kit.palette.some(
          (color) => color.toLowerCase() === kit.primary.toLowerCase(),
        )
      )
        context.addIssue({
          code: "custom",
          path: ["palette"],
          message: "The palette must include the primary color.",
        });
      if (
        !kit.palette.some(
          (color) => color.toLowerCase() === kit.accent.toLowerCase(),
        )
      )
        context.addIssue({
          code: "custom",
          path: ["palette"],
          message: "The palette must include the accent color.",
        });
    }
  });

const expectedWorkspaceNames = [
  "Mirqab · Fintech client (KSA)",
  "Mirqab · Logistics client (Egypt)",
  "Mirqab · EdTech client (UAE)",
] as const;
const expectedWorkspaceNameSet = new Set<string>(expectedWorkspaceNames);
const expectedWorkspaceByKitId = new Map<string, string>([
  ["sarafa-pay", "Mirqab · Fintech client (KSA)"],
  ["wasla-express", "Mirqab · Logistics client (Egypt)"],
  ["ruwad-learning", "Mirqab · EdTech client (UAE)"],
]);
const assetsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/brand-kits",
);
type ImageMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/svg+xml";
const imageTypes: Readonly<Record<string, ImageMimeType>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
const maxMediaBytes = 12 * 1024 * 1024;

type PreparedFile = {
  reference: BrandMediaRef;
  bytes: Buffer;
};
type PreparedKit = {
  id: string;
  workspaceName: string;
  palette: string[];
  visualDirection: string;
  photoDirection: string;
  files: PreparedFile[];
};

function invalidAsset(message: string): never {
  throw new Error(`Invalid brand kit asset: ${message}`);
}

function mimeForFile(file: string): ImageMimeType {
  const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
  const mimeType = imageTypes[extension];
  if (!mimeType) return invalidAsset(`unsupported file type for ${file}`);
  return mimeType;
}

function readPngDimensions(bytes: Buffer) {
  if (
    bytes.length < 24 ||
    !bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    return invalidAsset("invalid PNG bytes");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJpegDimensions(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
    return invalidAsset("invalid JPEG bytes");
  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if ([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7].includes(marker))
      continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (frameMarkers.has(marker)) {
      if (segmentLength < 7) break;
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return invalidAsset("JPEG dimensions are missing");
}

function readWebpDimensions(bytes: Buffer) {
  if (
    bytes.length < 30 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  )
    return invalidAsset("invalid WebP bytes");
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X")
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  if (chunk === "VP8 ")
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  if (chunk === "VP8L" && bytes[20] === 0x2f)
    return {
      width: 1 + bytes[21]! + ((bytes[22]! & 0x3f) << 8),
      height:
        1 + (bytes[22]! >> 6) + (bytes[23]! << 2) + ((bytes[24]! & 0x0f) << 10),
    };
  return invalidAsset("unsupported or invalid WebP image data");
}

function validateSvg(bytes: Buffer) {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return invalidAsset("SVG must be valid UTF-8");
  }
  if (!/^\uFEFF?\s*(?:<\?xml\b[^?]*\?>\s*)?<svg\b/i.test(text))
    return invalidAsset("invalid SVG document");
  if (
    /<!DOCTYPE|<!ENTITY|<script\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(
      text,
    )
  )
    return invalidAsset("SVG must not contain active or external content");
}

function validateImageBytes(
  bytes: Buffer,
  mimeType: ImageMimeType,
  isGallery: boolean,
) {
  if (bytes.length < 64 || bytes.length > maxMediaBytes)
    return invalidAsset("file size is outside the supported range");
  if (mimeType === "image/svg+xml") return validateSvg(bytes);
  const dimensions =
    mimeType === "image/png"
      ? readPngDimensions(bytes)
      : mimeType === "image/jpeg"
        ? readJpegDimensions(bytes)
        : readWebpDimensions(bytes);
  if (
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    (isGallery && (dimensions.width < 256 || dimensions.height < 256))
  )
    return invalidAsset("image dimensions are too small");
}

function safeSourcePath(file: string, kitId: string): string {
  if (
    file.includes("\\") ||
    file.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:/i.test(file) ||
    file.split("/").length !== 2 ||
    file
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..") ||
    file.split("/")[0] !== kitId
  )
    return invalidAsset("manifest path must stay inside its kit folder");
  return resolve(assetsDirectory, file);
}

async function readKitFile(
  file: string,
  kitId: string,
  alt: string,
  id: string,
  role: BrandMediaRef["role"],
  provenance: BrandMediaRef["provenance"],
  isGallery: boolean,
): Promise<PreparedFile> {
  const path = safeSourcePath(file, kitId);
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink())
    return invalidAsset("manifest entries must be regular files");
  const rootRealPath = await realpath(assetsDirectory);
  const fileRealPath = await realpath(path);
  if (!fileRealPath.startsWith(`${rootRealPath}${sep}`))
    return invalidAsset("manifest path resolves outside the kit assets");

  const mimeType = mimeForFile(file);
  const bytes = await readFile(fileRealPath);
  validateImageBytes(bytes, mimeType, isGallery);
  const key = brandMediaKeySchema.parse(`brand-${kitId}-${basename(file)}`);
  return {
    reference: brandMediaRefSchema.parse({
      id,
      key,
      mimeType,
      alt,
      role,
      provenance,
    }),
    bytes,
  };
}

async function prepareKits(): Promise<PreparedKit[]> {
  const rawManifest: unknown = JSON.parse(
    await readFile(join(assetsDirectory, "manifest.json"), "utf8"),
  );
  const manifest = manifestSchema.parse(rawManifest);
  const manifestNames = manifest.kits.map(({ workspaceName }) => workspaceName);
  if (
    expectedWorkspaceNames.some((name) => !manifestNames.includes(name)) ||
    manifestNames.some((name) => !expectedWorkspaceNameSet.has(name)) ||
    manifest.kits.some(
      (kit) => expectedWorkspaceByKitId.get(kit.id) !== kit.workspaceName,
    )
  )
    throw new Error(
      "The manifest must contain only the three approved workspaces.",
    );

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const prepared: PreparedKit[] = [];
  for (const kit of manifest.kits) {
    const logo = await readKitFile(
      kit.logo.file,
      kit.id,
      kit.logo.alt,
      `${kit.id}-logo`,
      "logo",
      "generated",
      false,
    );
    const mark = await readKitFile(
      kit.mark.file,
      kit.id,
      kit.mark.alt,
      `${kit.id}-mark`,
      "mark",
      "generated",
      false,
    );
    const gallery = await Promise.all(
      kit.gallery.map((item) =>
        readKitFile(
          item.file,
          kit.id,
          item.alt,
          item.id,
          item.role,
          item.provenance,
          true,
        ),
      ),
    );
    const files = [logo, mark, ...gallery];
    for (const { reference } of files) {
      if (seenIds.has(reference.id))
        throw new Error(`Duplicate brand media ID: ${reference.id}`);
      if (seenKeys.has(reference.key))
        throw new Error(`Duplicate brand media key: ${reference.key}`);
      seenIds.add(reference.id);
      seenKeys.add(reference.key);
    }
    brandSchema.parse({
      name: kit.brandName,
      primary: kit.primary,
      accent: kit.accent,
      website: "https://example.invalid",
      palette: kit.palette,
      visualDirection: kit.visualDirection,
      photoDirection: kit.photoDirection,
      media: {
        logo: logo.reference,
        mark: mark.reference,
        gallery: gallery.map(({ reference }) => reference),
      },
    });
    prepared.push({
      id: kit.id,
      workspaceName: kit.workspaceName,
      palette: kit.palette,
      visualDirection: kit.visualDirection,
      photoDirection: kit.photoDirection,
      files,
    });
  }
  return prepared;
}

type ImportTarget = {
  id: string;
  name: string;
  brand: unknown;
};

export type BrandKitImportResult = {
  applied: boolean;
  snapshotPath?: string;
  workspaces: Array<{ id: string; name: string; files: number }>;
};

export async function runBrandKitImport(options: {
  apply: boolean;
  storage?: Storage;
}): Promise<BrandKitImportResult> {
  const kits = await prepareKits();
  const targets = await db.workspace.findMany({
    where: { name: { in: [...expectedWorkspaceNames] } },
    select: { id: true, name: true, brand: true },
  });
  const matchedTargets: Array<{
    kit: PreparedKit;
    target: ImportTarget;
    brand: Brand;
  }> = [];
  for (const kit of kits) {
    const matches = targets.filter(({ name }) => name === kit.workspaceName);
    if (matches.length !== 1)
      throw new Error(
        `Expected exactly one existing workspace named "${kit.workspaceName}"; found ${matches.length}.`,
      );
    const target = matches[0];
    if (!target) throw new Error(`Workspace missing: ${kit.workspaceName}`);
    matchedTargets.push({
      kit,
      target,
      brand: brandSchema.parse(target.brand),
    });
  }
  if (matchedTargets.length !== expectedWorkspaceNames.length)
    throw new Error(
      "The import target set does not match the three approved workspaces.",
    );

  const result: BrandKitImportResult = {
    applied: options.apply,
    workspaces: matchedTargets.map(({ kit, target }) => ({
      id: target.id,
      name: target.name,
      files: kit.files.length,
    })),
  };
  if (!options.apply) return result;

  const snapshotDirectory = join(ROOT, ".local", "verification-20261022");
  const snapshotPath = join(snapshotDirectory, "brand-kits-before.json");
  await mkdir(snapshotDirectory, { recursive: true });
  const snapshot = JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      workspaces: matchedTargets.map(({ target }) => ({
        id: target.id,
        name: target.name,
        brand: target.brand,
      })),
    },
    null,
    2,
  );
  try {
    await writeFile(snapshotPath, `${snapshot}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "EEXIST"
    )
      throw error;
  }

  const storage = options.storage ?? new Storage();
  for (const { kit, target } of matchedTargets)
    for (const file of kit.files)
      await storage.put(
        target.id,
        file.reference.key,
        file.bytes,
        file.reference.mimeType,
      );

  await db.$transaction(async (transaction) => {
    for (const { kit, target } of matchedTargets) {
      const current = await transaction.workspace.findUniqueOrThrow({
        where: { id: target.id },
        select: { name: true, brand: true },
      });
      if (current.name !== kit.workspaceName)
        throw new Error(`Workspace target changed: ${kit.workspaceName}`);
      const brand = brandSchema.parse(current.brand);
      const files = kit.files.map(({ reference }) => reference);
      const updatedBrand = brandSchema.parse({
        ...brand,
        palette: kit.palette,
        visualDirection: kit.visualDirection,
        photoDirection: kit.photoDirection,
        media: {
          logo: files.find(({ role }) => role === "logo"),
          mark: files.find(({ role }) => role === "mark"),
          gallery: files.filter(
            ({ role }) =>
              role === "hero" || role === "detail" || role === "supporting",
          ),
        },
      });
      if (isDeepStrictEqual(updatedBrand, brand)) continue;
      await transaction.workspace.update({
        where: { id: target.id },
        data: { brand: json(updatedBrand) },
      });
    }
  });

  return { ...result, snapshotPath };
}
