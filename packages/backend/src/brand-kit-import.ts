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
const hex = z.string().regex(/^#[\da-f]{6}$/i);
const kitGalleryFileSchema = kitFileSchema.extend({
  id: z.string().min(1).max(80),
  role: z.enum(["hero", "photo", "texture", "cover"]),
  tags: z.array(z.string().min(1).max(40)).max(8),
  provenance: z.enum(["generated", "uploaded", "extracted"]),
  prompt: z.string().min(1).max(5000),
  generator: z.string().min(1).max(200),
  sourceId: z.string().min(1).max(100),
});
const kitVariantSchema = kitFileSchema.extend({
  id: z.string().min(1).max(80),
  variant: z.enum(["light", "dark", "symbol", "symbol-dark"]),
  lang: z.enum(["en", "ar"]).nullable(),
  scale: z.union([z.literal(2), z.literal(3)]),
});
const paletteRoleSchema = z
  .object({
    name: z.string().min(1).max(40),
    hex,
    tints: z.record(z.string().regex(/^\d{2,3}$/), hex),
  })
  .strict();
const kitSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    workspaceId: z.uuid(),
    brandName: z.string().min(1).max(100),
    brandNameAr: z.string().min(1).max(100),
    mood: z.string().min(1).max(100),
    palette: z
      .object({
        primary: paletteRoleSchema,
        secondary: paletteRoleSchema,
        tertiary: paletteRoleSchema,
        neutral: paletteRoleSchema,
      })
      .strict(),
    fonts: z.object({ headline: z.string().min(1), body: z.string().min(1) }).strict(),
    motif: z.string().min(1).max(200),
    photography: z.string().min(1).max(500),
    direction: z
      .object({
        do: z.array(z.string().min(1).max(200)).min(1).max(8),
        dont: z.array(z.string().min(1).max(200)).min(1).max(8),
      })
      .strict(),
    symbol: z
      .object({
        option: z.string().min(1),
        prompt: z.string().min(1).max(5000),
        generator: z.string().min(1).max(200),
        sourceId: z.string().min(1).max(100),
      })
      .strict(),
    logo: kitFileSchema,
    mark: kitFileSchema,
    logoVariants: z.array(kitVariantSchema).min(1).max(24),
    gallery: z.array(kitGalleryFileSchema).min(1).max(24),
  })
  .strict();
const manifestSchema = z
  .object({ version: z.literal(2), kits: z.array(kitSchema).length(3) })
  .strict()
  .superRefine(({ kits }, context) => {
    const ids = new Set<string>();
    const workspaces = new Set<string>();
    for (const kit of kits) {
      if (ids.has(kit.id))
        context.addIssue({
          code: "custom",
          message: "Duplicate brand kit ID.",
        });
      if (workspaces.has(kit.workspaceId))
        context.addIssue({
          code: "custom",
          message: "Duplicate brand kit workspace.",
        });
      ids.add(kit.id);
      workspaces.add(kit.workspaceId);
    }
  });

// The three approved client workspaces, matched by id because the owner renames them.
const expectedWorkspaceByKitId = new Map<string, string>([
  ["sarafa-pay", "8099320e-1cd4-4546-8f83-46230633158d"],
  ["wasla-express", "a14a01ac-902e-49dd-8931-89b85e24f5f5"],
  ["ruwad-learning", "4b177155-50eb-4aa0-a1b4-998a879d78fe"],
]);
const expectedWorkspaceIds = [...expectedWorkspaceByKitId.values()];
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
  workspaceId: string;
  visual: Pick<
    Brand,
    | "name"
    | "nameAr"
    | "primary"
    | "accent"
    | "palette"
    | "visualDirection"
    | "photoDirection"
    | "fonts"
    | "paletteRoles"
    | "direction"
  >;
  logo: PreparedFile;
  mark: PreparedFile;
  variants: PreparedFile[];
  gallery: PreparedFile[];
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
  if (
    manifest.kits.some(
      (kit) => expectedWorkspaceByKitId.get(kit.id) !== kit.workspaceId,
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
    // The main logo and mark are themselves 2x variants; store each file once.
    const variants = await Promise.all(
      kit.logoVariants
        .filter(({ file }) => file !== kit.logo.file && file !== kit.mark.file)
        .map((item) =>
        readKitFile(
          item.file,
          kit.id,
          item.alt,
          item.id,
          item.variant.startsWith("symbol") ? "mark" : "logo",
          "generated",
          false,
        ),
      ),
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
    for (const { reference } of [logo, mark, ...variants, ...gallery]) {
      if (seenIds.has(reference.id))
        throw new Error(`Duplicate brand media ID: ${reference.id}`);
      if (seenKeys.has(reference.key))
        throw new Error(`Duplicate brand media key: ${reference.key}`);
      seenIds.add(reference.id);
      seenKeys.add(reference.key);
    }
    const { primary, secondary, tertiary, neutral } = kit.palette;
    const visual: PreparedKit["visual"] = {
      name: kit.brandName,
      nameAr: kit.brandNameAr,
      primary: primary.hex,
      accent: secondary.hex,
      palette: [primary.hex, secondary.hex, tertiary.hex, neutral.hex],
      visualDirection: `${kit.mood}. Motif: ${kit.motif}.`,
      photoDirection: kit.photography,
      fonts: kit.fonts,
      paletteRoles: kit.palette,
      direction: kit.direction,
    };
    brandSchema.parse({
      ...visual,
      website: "https://example.invalid",
      media: {
        logo: logo.reference,
        mark: mark.reference,
        variants: variants.map(({ reference }) => reference),
        gallery: gallery.map(({ reference }) => reference),
      },
    });
    prepared.push({ id: kit.id, workspaceId: kit.workspaceId, visual, logo, mark, variants, gallery });
  }
  return prepared;
}

const filesOf = (kit: PreparedKit) => [
  kit.logo,
  kit.mark,
  ...kit.variants,
  ...kit.gallery,
];

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
    where: { id: { in: expectedWorkspaceIds } },
    select: { id: true, name: true, brand: true },
  });
  const matchedTargets: Array<{
    kit: PreparedKit;
    target: ImportTarget;
    brand: Brand;
  }> = [];
  for (const kit of kits) {
    const target = targets.find(({ id }) => id === kit.workspaceId);
    if (!target) throw new Error(`Workspace missing: ${kit.workspaceId}`);
    matchedTargets.push({
      kit,
      target,
      brand: brandSchema.parse(target.brand),
    });
  }
  if (matchedTargets.length !== expectedWorkspaceIds.length)
    throw new Error(
      "The import target set does not match the three approved workspaces.",
    );

  const result: BrandKitImportResult = {
    applied: options.apply,
    workspaces: matchedTargets.map(({ kit, target }) => ({
      id: target.id,
      name: target.name,
      files: filesOf(kit).length,
    })),
  };
  if (!options.apply) return result;

  const snapshotDirectory = join(ROOT, ".local", "verification-20261024-brand-v2");
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
    for (const file of filesOf(kit))
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
        select: { brand: true },
      });
      const brand = brandSchema.parse(current.brand);
      const updatedBrand = brandSchema.parse({
        ...brand,
        ...kit.visual,
        media: {
          logo: kit.logo.reference,
          mark: kit.mark.reference,
          variants: kit.variants.map(({ reference }) => reference),
          gallery: kit.gallery.map(({ reference }) => reference),
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
