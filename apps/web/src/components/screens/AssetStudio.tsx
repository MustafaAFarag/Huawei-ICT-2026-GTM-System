"use client";
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
      <Empty
        title={t("Make something useful for the conversation")}
        icon={<IconFileText size={18} />}
      >
        {t(
          "Select a prospect, review its sources, and choose Make asset in a play. P1/P3 produce an offer one-pager; P4 produces a mini-audit.",
        )}
      </Empty>
    );
  const brand = data.workspace.brand;
  return (
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
