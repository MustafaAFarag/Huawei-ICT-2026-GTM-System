"use client";
import { useMemo, useState } from "react";
import { ASSET_FORMATS, type AssetTemplate } from "@revenue/contracts";
import { IconFileText, IconPlus } from "@revenue/ui";
import { Badge, Button, Empty } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { assetLabel } from "../../lib/asset-label";
import type { Asset } from "../../lib/types";
import { FORMAT_ICONS } from "../chat/Conversation";

const GROUPS = [
  { id: "all", label: "All", match: () => true },
  { id: "documents", label: "Documents", match: (t: string) => ["offer-one-pager", "mini-audit", "capability-profile"].includes(t) },
  { id: "emails", label: "Emails", match: (t: string) => t.startsWith("email") },
  { id: "carousels", label: "Carousels", match: (t: string) => t.endsWith("carousel") },
  { id: "flipbooks", label: "Flipbooks", match: (t: string) => t === "flipbook" },
] as const;

function when(date: string | undefined, language: string) {
  if (!date) return "";
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  const rtf = new Intl.RelativeTimeFormat(language === "ar" ? "ar" : "en", { numeric: "auto" });
  if (Math.abs(days) < 1) {
    const hours = Math.round((Date.now() - new Date(date).getTime()) / 3600000);
    return rtf.format(-hours, "hour");
  }
  if (days < 30) return rtf.format(-days, "day");
  return new Date(date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });
}

// Deliverables (Linear-style list): everything Nabil prepared, filed by account and format.
export function AssetStudio({ onPreview }: { onPreview: (a: Asset) => void }) {
  const { data, askNabil } = useWorkspace();
  const { t, language } = usePrefs();
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("all");
  const rows = useMemo(
    () =>
      [...data.assets]
        .filter((a) => GROUPS.find((g) => g.id === group)!.match(a.template))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [data.assets, group],
  );
  const counts = Object.fromEntries(
    GROUPS.map((g) => [g.id, data.assets.filter((a) => g.match(a.template)).length]),
  );
  return (
    <section className="list-screen" aria-label={t("Deliverables")}>
      <div className="list-toolbar">
        <div className="tabs-inline" role="tablist" aria-label={t("Format")}>
          {GROUPS.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              {t(g.label)}
              <span className="tab-count mono">{counts[g.id]}</span>
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="primary"
          startIcon={<IconPlus size={14} />}
          onClick={() => askNabil(t("Create an Instagram carousel about "))}
        >
          {t("New with Nabil")}
        </Button>
      </div>
      {!rows.length ? (
        <Empty title={t("Nothing here yet")} icon={<IconFileText size={18} />}>
          {t("Ask Nabil for an email, a carousel, a flipbook or a one-pager. Finished work is filed here and on the account.")}
        </Empty>
      ) : (
        <ul className="row-list">
          {rows.map((a) => {
            const format = ASSET_FORMATS[a.template as AssetTemplate];
            const Icon = FORMAT_ICONS[a.template] ?? IconFileText;
            const company = data.prospects.find((p) => p.id === a.prospectId)?.snapshot.company;
            return (
              <li key={a.id}>
                <button type="button" className="row" onClick={() => onPreview(a)}>
                  <span className="row-icon" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <span className="row-main">
                    <span className="row-title truncate" dir="auto">
                      {assetLabel(a, t)}
                    </span>
                    <span className="row-sub muted">
                      {t(format?.label ?? a.template)} ·{" "}
                      {company ? <bdi>{company}</bdi> : t("Brand-level")}
                    </span>
                  </span>
                  <span className="row-meta mono muted">
                    <bdi>{a.language}</bdi>
                  </span>
                  <span className="row-meta mono muted">v{a.version ?? 1}</span>
                  {a.template === "capability-profile" && (
                    <span title={t("Ships with an asset-vs-no-asset holdout: a share of sequences go out without this profile.")}>
                      <Badge tone="info">{t("Holdout test")}</Badge>
                    </span>
                  )}
                  <Badge tone={a.approvedAt ? "ok" : "warn"}>
                    {a.approvedAt ? t("Approved") : t("Needs review")}
                  </Badge>
                  <span className="row-date muted">{when(a.createdAt, language)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
