import { NotFoundException } from "@nestjs/common";
import {
  brandSchema,
  brandMediaIdSchema,
  type Brand,
  type BrandMediaRef,
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

export type BrandRenderImage = {
  dataUri: string;
  alt: string;
  role: BrandMediaRef["role"];
  provenance: BrandMediaRef["provenance"];
};

// Bytes are resolved into a render-only value. Brand and prompt context keep only refs.
export type BrandRenderMedia = {
  logo?: BrandRenderImage;
  mark?: BrandRenderImage;
  gallery: BrandRenderImage[];
};

async function resolveReference(
  workspaceId: string,
  reference: BrandMediaRef | undefined,
  storage: Storage,
): Promise<BrandRenderImage | undefined> {
  if (!reference) return undefined;
  try {
    const bytes = await storage.get(workspaceId, reference.key);
    return {
      dataUri: `data:${reference.mimeType};base64,${bytes.toString("base64")}`,
      alt: reference.alt,
      role: reference.role,
      provenance: reference.provenance,
    };
  } catch (error) {
    if (isMissingStoredMedia(error)) return undefined;
    throw error;
  }
}

export async function resolveBrandRenderMedia(
  workspaceId: string,
  rawBrand: unknown,
  storage = new Storage(),
): Promise<BrandRenderMedia> {
  const brand = brandSchema.parse(rawBrand);
  const media = brand.media;
  if (!media) return { gallery: [] };

  const [logo, mark, ...gallery] = await Promise.all([
    resolveReference(workspaceId, media.logo, storage),
    resolveReference(workspaceId, media.mark, storage),
    ...(media.gallery ?? []).map((reference) =>
      resolveReference(workspaceId, reference, storage),
    ),
  ]);
  return {
    ...(logo ? { logo } : {}),
    ...(mark ? { mark } : {}),
    gallery: gallery.filter((image): image is BrandRenderImage => !!image),
  };
}

export const brandRenderLogo = (media?: BrandRenderMedia) =>
  media?.logo ?? media?.mark;

export function brandRenderHero(media?: BrandRenderMedia) {
  return media?.gallery.find((image) => image.role === "hero") ?? media?.gallery[0];
}

export function brandRenderSupporting(media?: BrandRenderMedia) {
  const hero = brandRenderHero(media);
  return media?.gallery.filter((image) => image !== hero) ?? [];
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
