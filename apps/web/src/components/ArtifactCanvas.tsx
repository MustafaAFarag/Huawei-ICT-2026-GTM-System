"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ASSET_FORMATS,
  type AssetExport,
  type AssetTemplate,
} from "@revenue/contracts";
import {
  IconArrowsMaximize,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDownload,
  IconWand,
  IconX,
} from "@revenue/ui";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { assetLabel } from "../lib/asset-label";
import type { Asset } from "../lib/types";
import "../styles/pages/deliverables.css";
import {
  Badge,
  Button,
  ErrorPanel,
  LoadingState,
  Textarea,
} from "./primitives";
import { useWorkspace } from "./workspace-context";

type Meta = {
  pages: number;
  bytes: number;
  lint: { level: "error" | "warn"; rule: string; message: string }[];
};

function formatOf(asset: Asset) {
  return (
    ASSET_FORMATS[asset.template as AssetTemplate] ??
    ASSET_FORMATS["offer-one-pager"]
  );
}

const EXPORT_LABELS: Record<AssetExport, string> = {
  pdf: "PDF",
  png: "PNG",
  zip: "PNG slides (.zip)",
  html: "HTML file",
};

async function download(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Could not prepare the file. Try again.");
  }
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// Renders a fixed-size page (an A4 sheet, a 1080×1350 slide, a 600px email) scaled to fit
// its column, the way a design canvas does.
function ScaledFrame({
  width,
  height,
  src,
  title,
  sandbox = "",
  fit = "width",
}: {
  width: number;
  height: number;
  src: string;
  title: string;
  sandbox?: string;
  fit?: "width" | "contain";
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const byWidth = el.clientWidth / width;
      const byHeight = el.clientHeight / height;
      setScale(
        Math.min(1, fit === "contain" ? Math.min(byWidth, byHeight) : byWidth),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, fit]);
  return (
    <div className={`scaled-frame fit-${fit}`} ref={box}>
      <div
        className="scaled-frame-inner"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          title={title}
          sandbox={sandbox}
          src={src}
          style={{ width, height, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}

export function ArtifactCanvas({
  ws,
  asset,
  onClose,
  onEdit,
  onSelectVersion,
}: {
  ws: string;
  asset: Asset;
  onClose: () => void;
  onEdit: () => void;
  onSelectVersion: (asset: Asset) => void;
}) {
  const { t } = usePrefs();
  const { canApprove, canWrite, busy, action, data, askNabil, setTab } =
    useWorkspace();
  const format = formatOf(asset);
  const base = `/api/workspaces/${ws}/assets/${asset.id}`;
  const [change, setChange] = useState("");
  const [metaError, setMetaError] = useState(false);
  const [metaRetry, setMetaRetry] = useState(0);
  const [previewMode, setPreviewMode] = useState<"preview" | "edit">("preview");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [slide, setSlide] = useState(1);
  const [emailWidth, setEmailWidth] = useState<600 | 375>(600);
  const [exporting, setExporting] = useState<AssetExport | null>(null);
  const [exportError, setExportError] = useState("");
  const [copied, setCopied] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const versions = data.assets
    .filter(
      (a) =>
        a.prospectId === asset.prospectId &&
        a.template === asset.template &&
        a.language === asset.language,
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const versionIndex = versions.findIndex((a) => a.id === asset.id);

  useEffect(() => {
    setSlide(1);
    setMeta(null);
    setMetaError(false);
    setChange("");
    setExportError("");
    let cancelled = false;
    void client
      .workspace<Meta>(ws, `/assets/${asset.id}/meta`)
      .then((m) => !cancelled && setMeta(m))
      .catch(() => !cancelled && setMetaError(true));
    return () => {
      cancelled = true;
    };
  }, [ws, asset.id, metaRetry]);

  const pages = meta?.pages ?? 1;
  useEffect(() => {
    if (format.viewer !== "slides") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const rtl = document.documentElement.dir === "rtl";
      if (event.key === (rtl ? "ArrowLeft" : "ArrowRight"))
        setSlide((n) => Math.min(pages, n + 1));
      if (event.key === (rtl ? "ArrowRight" : "ArrowLeft"))
        setSlide((n) => Math.max(1, n - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [format.viewer, pages]);

  const exportFile = async (kind: AssetExport) => {
    setExporting(kind);
    setExportError("");
    try {
      const ext = kind === "zip" ? "zip" : kind;
      await download(
        kind === "html" ? `${base}/download` : `${base}/${kind}`,
        `${asset.template}-${asset.language}.${ext}`,
      );
    } catch (error) {
      setExportError(t((error as Error).message));
    } finally {
      setExporting(null);
    }
  };
  const copyHtml = async () => {
    setExportError("");
    try {
      const response = await fetch(`${base}/download`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not copy the HTML.");
      }
      await navigator.clipboard.writeText(await response.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setExportError(t((error as Error).message));
    }
  };

  let view: ReactNode;
  if (format.viewer === "slides")
    view = (
      <div className="slides-view">
        <ScaledFrame
          key={slide}
          width={format.size.width}
          height={format.size.height}
          src={`${base}/html?slide=${slide}`}
          title={`${t("Slide")} ${slide}`}
          fit="contain"
        />
        <div className="slide-controls">
          <button
            type="button"
            className="icon-button"
            aria-label={t("Previous slide")}
            disabled={slide <= 1}
            onClick={() => setSlide((n) => Math.max(1, n - 1))}
          >
            <IconChevronLeft size={16} className="flip-rtl" />
          </button>
          <div className="slide-dots" role="tablist" aria-label={t("Slides")}>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={slide === i + 1}
                aria-label={`${t("Slide")} ${i + 1}`}
                onClick={() => setSlide(i + 1)}
              />
            ))}
          </div>
          <span className="mono muted small">
            <bdi dir="ltr">
              {slide}/{pages}
            </bdi>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Next slide")}
            disabled={slide >= pages}
            onClick={() => setSlide((n) => Math.min(pages, n + 1))}
          >
            <IconChevronRight size={16} className="flip-rtl" />
          </button>
        </div>
      </div>
    );
  else if (format.viewer === "email")
    view = (
      <div className="email-view">
        <div className="email-frame" style={{ width: emailWidth }}>
          <iframe title={t("Email preview")} sandbox="" src={`${base}/html`} />
        </div>
      </div>
    );
  else if (format.viewer === "flipbook")
    view = (
      <div className="flipbook-view">
        <iframe
          title={t("Flipbook preview")}
          sandbox="allow-scripts"
          src={`${base}/html`}
        />
      </div>
    );
  else
    view = (
      <div className="document-view">
        <ScaledFrame
          width={format.size.width}
          height={format.size.height * Math.max(1, pages)}
          src={`${base}/html`}
          title={t("Document preview")}
          fit={pages > 1 ? "width" : "contain"}
        />
      </div>
    );

  const errors = meta?.lint.filter((l) => l.level === "error").length ?? 0;
  return (
    <section
      className={`artifact-canvas deliverable-canvas mode-${previewMode}`}
      aria-labelledby="artifact-title"
      data-ai-target="asset-preview"
    >
      <header className="artifact-bar">
        <div className="artifact-title">
          <h2 id="artifact-title" dir="auto" title={assetLabel(asset, t)}>
            {assetLabel(asset, t)}
          </h2>
          <span className="muted small">
            {t(format.label)} · <bdi>{asset.language}</bdi>
          </span>
        </div>
        {versions.length > 1 && (
          <label className="version-picker">
            <span className="sr-only">{t("Version")}</span>
            <select
              value={asset.id}
              onChange={(event) => {
                const next = versions.find((a) => a.id === event.target.value);
                if (next) onSelectVersion(next);
              }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={v.id}>
                  v{i + 1}
                  {v.approvedAt ? ` · ${t("approved")}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {versions.length <= 1 && versionIndex >= 0 && (
          <span className="mono muted small">v1</span>
        )}
        {asset.template === "capability-profile" && (
          <span
            title={t(
              "Ships with an asset-vs-no-asset holdout: a share of sequences go out without this profile.",
            )}
          >
            <Badge tone="info">{t("Holdout test")}</Badge>
          </span>
        )}
        <Badge tone={asset.approvedAt ? "ok" : "warn"}>
          {asset.approvedAt ? t("Approved") : t("Needs review")}
        </Badge>
        <div className="artifact-actions">
          {format.viewer === "email" && (
            <div
              className="segmented"
              role="group"
              aria-label={t("Preview width")}
            >
              <button
                type="button"
                aria-pressed={emailWidth === 600}
                aria-label={t("Desktop width")}
                onClick={() => setEmailWidth(600)}
              >
                <IconDeviceDesktop size={14} />
              </button>
              <button
                type="button"
                aria-pressed={emailWidth === 375}
                aria-label={t("Phone width")}
                onClick={() => setEmailWidth(375)}
              >
                <IconDeviceMobile size={14} />
              </button>
            </div>
          )}
          <Button
            size="sm"
            variant="ai"
            startIcon={<IconWand size={14} />}
            onClick={() => {
              if (canWrite && !busy) onEdit();
            }}
            disabled={!canWrite || busy}
            aria-describedby={
              !canWrite ? "deliverable-refine-permission" : undefined
            }
          >
            {t("Edit with Nabil")}
          </Button>
          {!asset.approvedAt ? (
            <Button
              size="sm"
              variant="primary"
              disabled={!canApprove || busy}
              onClick={() =>
                void action(
                  () =>
                    client.workspace(ws, `/assets/${asset.id}/approve`, {
                      method: "POST",
                    }),
                  t("Approved. Exports are now available."),
                )
              }
            >
              {t("Approve")}
            </Button>
          ) : (
            <>
              {format.viewer === "email" && (
                <Button
                  size="sm"
                  startIcon={
                    copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                  }
                  onClick={() => void copyHtml()}
                >
                  {copied ? t("Copied") : t("Copy HTML")}
                </Button>
              )}
              {format.exports.map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  disabled={exporting !== null}
                  startIcon={<IconDownload size={14} />}
                  onClick={() => void exportFile(kind)}
                >
                  {exporting === kind
                    ? t("Preparing…")
                    : t(EXPORT_LABELS[kind])}
                </Button>
              ))}
            </>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label={t("Present")}
            title={t("Present")}
            onClick={() => void stage.current?.requestFullscreen?.()}
          >
            <IconArrowsMaximize size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Close preview")}
            title={t("Close preview")}
            onClick={onClose}
          >
            <IconX size={16} />
          </button>
        </div>
      </header>
      {!canWrite && (
        <p id="deliverable-refine-permission" className="muted">
          {t(
            "You have read-only access to deliverables. Ask a workspace owner or editor to create or revise one.",
          )}
        </p>
      )}
      {exportError && (
        <p role="alert" className="inline-error small artifact-error">
          {exportError}
        </p>
      )}
      <div
        className="deliverable-phone-tabs"
        role="group"
        aria-label={t("Deliverable view")}
      >
        <button
          type="button"
          aria-pressed={previewMode === "preview"}
          onClick={() => setPreviewMode("preview")}
        >
          {t("Preview")}
        </button>
        <button
          type="button"
          aria-pressed={previewMode === "edit"}
          onClick={() => setPreviewMode("edit")}
        >
          {t("Edit")}
        </button>
      </div>
      <div className="deliverable-workbench">
        <div className="artifact-body">
          {!meta && !metaError && (
            <div className="deliverable-meta-loading">
              <LoadingState title={t("Loading preview…")} />
            </div>
          )}
          {metaError && (
            <ErrorPanel
              title={t("Preview details could not load")}
              actions={
                <Button onClick={() => setMetaRetry((n) => n + 1)}>
                  {t("Try again")}
                </Button>
              }
            >
              {t(
                "You can still view the deliverable. Retry to load page counts and compatibility checks.",
              )}
            </ErrorPanel>
          )}
          <div className="artifact-stage" ref={stage}>
            <div className="deliverable-stage-label">
              <span>
                {t(
                  format.viewer === "flipbook"
                    ? "Spread view"
                    : format.viewer === "email"
                      ? "Email preview"
                      : "Fit to page",
                )}
              </span>
              <bdi dir="ltr">
                {asset.language} · v
                {asset.version ?? Math.max(1, versionIndex + 1)}
              </bdi>
            </div>
            {view}
          </div>
          {meta && meta.lint.length > 0 && (
            <aside
              className="lint-panel"
              aria-label={t("Compatibility checks")}
            >
              <p className="eyebrow">
                {t("Compatibility checks")} ·{" "}
                {errors ? `${errors} ${t("to fix")}` : t("no blockers")}
              </p>
              <ul>
                {meta.lint.map((item, i) => (
                  <li key={i} className={`lint-${item.level}`}>
                    <span className="dot" aria-hidden />
                    <span>
                      <strong className="mono">{item.rule}</strong>{" "}
                      {t(item.message)}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          {format.viewer === "email" && meta && (
            <p className="artifact-foot muted small mono">
              <bdi dir="ltr">{(meta.bytes / 1024).toFixed(1)} KB</bdi>
              {asset.template === "email-gmail" &&
                ` · ${t("Gmail clips above 102 KB")}`}
            </p>
          )}
        </div>
        <aside
          className="deliverable-refine"
          aria-labelledby="deliverable-refine-title"
        >
          <h3 id="deliverable-refine-title">{t("Refine with Nabil")}</h3>
          <p className="muted">
            {t("Describe the change. Each revision is saved as a new draft.")}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canWrite && !busy && change.trim())
                askNabil(
                  `${t("Revise this deliverable")}: ${assetLabel(asset, t)} (${asset.id}). ${change.trim()}`,
                );
            }}
          >
            <label htmlFor="deliverable-change">{t("Your change")}</label>
            <Textarea
              id="deliverable-change"
              disabled={!canWrite || busy}
              aria-describedby={
                !canWrite ? "deliverable-refine-permission" : undefined
              }
              rows={4}
              value={change}
              maxLength={1500}
              onChange={(event) => setChange(event.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!canWrite || !change.trim() || busy}
            >
              {t("Apply change")}
            </Button>
          </form>
          <div className="deliverable-brand-info">
            <strong>{t("Brand & company")}</strong>
            <p className="muted">
              {t("Preview uses your saved brand version.")}
            </p>
            <Button onClick={() => setTab("Company context")}>
              {t("View brand book")}
            </Button>
          </div>
          <label className="deliverable-history">
            <span>{t("Version history")}</span>
            <select
              value={asset.id}
              onChange={(event) => {
                const next = versions.find((a) => a.id === event.target.value);
                if (next) onSelectVersion(next);
              }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={v.id}>
                  v{v.version ?? i + 1} ·{" "}
                  {v.approvedAt ? t("Approved") : t("Needs review")}
                </option>
              ))}
            </select>
          </label>
        </aside>
      </div>
    </section>
  );
}
