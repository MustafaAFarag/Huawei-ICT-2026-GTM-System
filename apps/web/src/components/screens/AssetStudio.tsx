"use client";
import { useEffect, useRef, useState } from "react";
import { IconDownload, IconEye, IconFileText, IconCheck } from "@revenue/ui";
import { Badge, Button, Empty } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import type { Asset } from "../../lib/types";

export function AssetStudio({ onPreview }: { onPreview: (a: Asset) => void }) {
  const { ws, data, canApprove, busy, action } = useWorkspace();
  const { t } = usePrefs();
  if (!data.assets.length)
    return (
      <>
        <TemplateLibrary />
        <Empty
          title={t("Make something useful for the conversation")}
          icon={<IconFileText size={18} />}
        >
          {t(
            "Select a prospect, review its sources, and choose Make asset in a play. P1/P3 produce an offer one-pager; P4 produces a mini-audit.",
          )}
        </Empty>
      </>
    );
  const brand = data.workspace.brand;
  return (
    <>
      <TemplateLibrary />
      <div className="asset-grid">
        {data.assets.map((a) => {
          const rtl = a.language.startsWith("ar");
          const company = data.prospects.find((p) => p.id === a.prospectId)
            ?.snapshot.company;
          return (
            <article className="panel asset-card" key={a.id}>
              <div
                className="paper"
                dir={rtl ? "rtl" : "ltr"}
                style={{ ["--brand" as string]: brand.primary }}
                aria-hidden
              >
                <span className="paper-band" />
                <span className="paper-title" />
                <span className="paper-line" />
                <span className="paper-line short" />
                <span className="paper-cols">
                  <span />
                  <span />
                </span>
                <span className="paper-line" />
                <span className="paper-mark mono">
                  {a.template === "mini-audit" ? "AUDIT" : "ONE-PAGER"}
                </span>
              </div>
              <div className="asset-meta">
                <div className="badge-row">
                  <Badge>{a.language}</Badge>
                  <Badge tone={a.approvedAt ? "ok" : "warn"}>
                    {a.approvedAt ? t("approved") : t("needs review")}
                  </Badge>
                </div>
                <h2 dir="auto">{a.title}</h2>
                <p className="muted" dir="auto">
                  {company ? `${company} · ` : ""}
                  {a.approvedAt
                    ? t("Reviewed and approved")
                    : t("Awaiting human review")}
                </p>
              </div>
              <div className="button-row">
                <Button
                  size="sm"
                  startIcon={<IconEye size={14} />}
                  onClick={() => onPreview(a)}
                >
                  {t("Preview")}
                </Button>
                {!a.approvedAt && (
                  <Button
                    size="sm"
                    variant="primary"
                    startIcon={<IconCheck size={14} />}
                    disabled={!canApprove || busy}
                    onClick={() =>
                      void action(
                        () =>
                          client.workspace(ws, `/assets/${a.id}/approve`, {
                            method: "POST",
                          }),
                        t("Asset approved for PDF export."),
                      )
                    }
                  >
                    {t("Approve")}
                  </Button>
                )}
                {a.approvedAt && (
                  <a
                    className="btn btn-secondary btn-sm"
                    href={`/api/workspaces/${ws}/assets/${a.id}/pdf`}
                  >
                    <IconDownload size={14} aria-hidden />
                    {t("Download PDF")}
                  </a>
                )}
                {a.approvedAt && (
                  <PngDownload
                    assetId={a.id}
                    filename={`${a.template}-${a.language}.png`}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function PngDownload({
  assetId,
  filename,
}: {
  assetId: string;
  filename: string;
}) {
  const { ws } = useWorkspace();
  const { t } = usePrefs();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [ws, assetId]);
  return (
    <>
      <Button
        size="sm"
        disabled={busy}
        startIcon={<IconDownload size={14} />}
        onClick={async () => {
          const controller = new AbortController();
          request.current = controller;
          setBusy(true);
          setError("");
          try {
            const response = await fetch(
              `/api/workspaces/${ws}/assets/${assetId}/png`,
              { signal: controller.signal },
            );
            if (!response.ok) {
              const data = await response.json();
              throw new Error(
                data.message ?? "Could not prepare the image. Try again.",
              );
            }
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (e) {
            if (!controller.signal.aborted) setError(t((e as Error).message));
          } finally {
            if (!controller.signal.aborted) setBusy(false);
          }
        }}
      >
        {t(busy ? "Preparing image…" : "Download PNG")}
      </Button>
      {error && (
        <p role="alert" className="inline-error small">
          {error}
        </p>
      )}
    </>
  );
}

// Template library (PRD §5.4): shipped templates first; later ones are shown with their phase.
const TEMPLATES = [
  {
    id: "offer-one-pager",
    name: "Offer one-pager",
    plays: "P1 · P3",
    phase: "ready",
  },
  { id: "mini-audit", name: "Mini-audit report", plays: "P4", phase: "ready" },
  { id: "case-study", name: "Case study + carousel", plays: "P6", phase: "D+" },
  {
    id: "lead-magnet",
    name: "Checklist lead magnet",
    plays: "P5",
    phase: "D+",
  },
  {
    id: "linkedin-carousel",
    name: "LinkedIn carousel",
    plays: "P7",
    phase: "N",
  },
  { id: "proposal", name: "Short proposal", plays: "P10", phase: "N" },
  {
    id: "client-report",
    name: "Weekly client report",
    plays: "P13",
    phase: "N",
  },
] as const;

function TemplateLibrary() {
  const { setTab, setPlay } = useWorkspace();
  const { t } = usePrefs();
  return (
    <div className="template-strip" role="list" aria-label={t("Templates")}>
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          role="listitem"
          className={`template ${tpl.phase === "ready" ? "" : "soon"}`}
          disabled={tpl.phase !== "ready"}
          onClick={() => {
            setPlay(tpl.id === "mini-audit" ? "P4" : "P1");
            setTab("Plays");
          }}
        >
          <span className="template-thumb" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <strong>{t(tpl.name)}</strong>
          <span className="mono muted small">
            {tpl.plays} · {tpl.phase === "ready" ? t("ready") : tpl.phase}
          </span>
        </button>
      ))}
    </div>
  );
}
