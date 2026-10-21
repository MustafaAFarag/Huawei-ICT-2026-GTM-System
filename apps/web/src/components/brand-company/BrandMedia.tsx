"use client";
import { useEffect, useRef, useState } from "react";
import type { BrandMediaRef } from "@revenue/contracts";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import "../../styles/pages/brand.css";

// Saved kit images are private: bytes come from the API route, never from a storage key.
export function brandMediaUrl(workspaceId: string, mediaId: string) {
  return `/api/workspaces/${workspaceId}/brand/media/${encodeURIComponent(mediaId)}`;
}

// The kit's logo (or mark) first, then the gallery. Used where a small preview is enough.
export function brandKitImages(
  media: { logo?: BrandMediaRef; mark?: BrandMediaRef; gallery?: BrandMediaRef[] } | undefined,
) {
  if (!media) return [];
  return [media.logo ?? media.mark, ...(media.gallery ?? [])].filter(
    (ref): ref is BrandMediaRef => Boolean(ref),
  );
}

// One saved brand image. If the bytes fail to load, the alt text stays visible as a named image.
export function BrandImage({
  media,
  className = "",
}: {
  media: BrandMediaRef;
  className?: string;
}) {
  const { ws } = useWorkspace();
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => setFailed(false), [ws, media.id]);
  // The request can fail before React attaches onError.
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) setFailed(true);
  }, [ws, media.id]);
  if (failed)
    return (
      <div
        className={`bc-media is-failed ${className}`}
        role="img"
        aria-label={media.alt}
      >
        <span dir="auto">{media.alt}</span>
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private route, not a static asset
    <img
      ref={image}
      className={`bc-media ${className}`}
      src={brandMediaUrl(ws, media.id)}
      alt={media.alt}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

// Labels the workspace's own client imagery as brand context, never as the account's identity.
export function BrandContext({ compact = false }: { compact?: boolean }) {
  const { data } = useWorkspace();
  const { t } = usePrefs();
  const brand = data.workspace.brand;
  const images = brandKitImages(brand.media).slice(0, compact ? 2 : 3);
  if (!images.length) return null;
  return (
    <section
      className={`bc-context ${compact ? "is-compact" : ""}`}
      aria-label={t("Client brand context")}
    >
      <div className="bc-context-text">
        <p className="bc-context-title">{t("Client brand context")}</p>
        <p className="bc-caption" dir="auto">
          {`${brand.name} · ${t("Our own brand imagery for drafts. It does not show this account.")}`}
        </p>
      </div>
      <ul className="bc-context-images">
        {images.map((media) => (
          <li key={media.id}>
            <BrandImage media={media} />
          </li>
        ))}
      </ul>
    </section>
  );
}
