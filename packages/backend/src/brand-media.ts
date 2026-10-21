import { NotFoundException } from "@nestjs/common";
import {
  brandSchema,
  brandMediaIdSchema,
  type Brand,
  type BrandSettingsPatch,
} from "@revenue/contracts";
import type { Actor } from "@revenue/contracts";
import { db } from "./database.js";
import { Storage } from "./storage.js";

const visualBrandMetadata = new Set([
  "media",
  "palette",
  "visualDirection",
  "photoDirection",
]);

// Keep the original property order: workspace approval digests serialize with JSON.stringify.
export function brandBasisWithoutVisualMetadata(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !visualBrandMetadata.has(key)),
  );
}

export function mergeBrandSettings(
  storedValue: unknown,
  patch: BrandSettingsPatch,
): Brand {
  const current = brandSchema.parse(storedValue);
  const patchMedia = patch.media;
  const currentMedia = current.media;
  let media: Brand["media"] = currentMedia;

  if (!patchMedia) {
    media = currentMedia;
  } else if (currentMedia) {
    media = {
      ...currentMedia,
      ...patchMedia,
      gallery: patchMedia.gallery ?? currentMedia.gallery,
    };
  } else if (
    patchMedia.logo ||
    patchMedia.mark ||
    patchMedia.gallery !== undefined
  ) {
    media = {
      ...patchMedia,
      gallery: patchMedia.gallery ?? [],
    };
  }

  return brandSchema.parse({
    ...current,
    ...patch,
    media,
  });
}

function isMissingStoredMedia(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (
    "code" in error &&
    (error.code === "ENOENT" || error.code === "BlobNotFound")
  )
    return true;
  return "statusCode" in error && error.statusCode === 404;
}

export class BrandMediaService {
  constructor(private readonly storage = new Storage()) {}

  async read(actor: Actor, rawMediaId: string) {
    const parsedId = brandMediaIdSchema.safeParse(rawMediaId);
    if (!parsedId.success)
      throw new NotFoundException("Brand media not found.");

    const workspace = await db.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: { brand: true },
    });
    if (!workspace) throw new NotFoundException("Brand media not found.");

    const brand = brandSchema.parse(workspace.brand);
    const references = [
      ...(brand.media?.logo ? [brand.media.logo] : []),
      ...(brand.media?.mark ? [brand.media.mark] : []),
      ...(brand.media?.gallery ?? []),
    ];
    const reference = references.find(({ id }) => id === parsedId.data);
    if (!reference) throw new NotFoundException("Brand media not found.");

    try {
      return {
        bytes: await this.storage.get(actor.workspaceId, reference.key),
        mimeType: reference.mimeType,
      };
    } catch (error) {
      if (isMissingStoredMedia(error))
        throw new NotFoundException("Brand media not found.");
      throw error;
    }
  }
}
