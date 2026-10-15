"use client";
import { useMemo, useRef, useState } from "react";
import { IconSearch, IconUpload, IconUsers } from "@revenue/ui";
import {
  Badge,
  Button,
  Empty,
  Field,
  Input,
  Panel,
  toneFor,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";

const COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "company",
  "website",
  "title",
  "employees",
] as const;
const TIER_TONE = { A: "ok", B: "info", C: "neutral" } as const;

export function Accounts() {
  const { ws, data, busy, canWrite, action, selected, setSelected, setProspect } =
    useWorkspace();
  const { t } = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importKey, setImportKey] = useState(() => crypto.randomUUID());
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [outcomes, setOutcomes] = useState<
    { row: number; state: string; message?: string }[]
  >([]);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | "A" | "B" | "C">("all");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.prospects.filter((p) => {
      if (tier !== "all" && p.breakdown.tier !== tier) return false;
      if (!q) return true;
      const s = p.snapshot;
      return [s.firstName, s.lastName, s.company, s.title, s.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data.prospects, query, tier]);
  const allVisibleSelected =
    rows.length > 0 && rows.every((p) => selected.includes(p.id));
  return (
    <>
      <Panel
        eyebrow="CSV / XLSX"
        title={t("Import a lead list")}
        actions={<Badge>{t("Up to 1,000 rows")}</Badge>}
      >
        <p className="muted">
          {t(
            "Columns: firstName, lastName, email, company, website, title, employees. Imports retain reviewed evidence and suppression.",
          )}
        </p>
        <div className="import-row">
          <input
            ref={fileRef}
            className="file-input"
            aria-label="Lead file"
            type="file"
            accept=".csv,.xlsx"
            onChange={() => setImportKey(crypto.randomUUID())}
          />
          <Button
            variant="primary"
            startIcon={<IconUpload size={14} />}
            disabled={busy || !canWrite}
            onClick={() =>
              void action(async () => {
                const file = fileRef.current?.files?.[0];
                if (!file) throw new Error(t("Choose a CSV or XLSX file first."));
                const form = new FormData();
                form.append("file", file);
                form.append("requestKey", importKey);
                form.append(
                  "mapping",
                  JSON.stringify(
                    Object.fromEntries(
                      Object.entries(columnMapping).filter(([, source]) =>
                        source.trim(),
                      ),
                    ),
                  ),
                );
                const res = await fetch(`/api/workspaces/${ws}/imports`, {
                  method: "POST",
                  body: form,
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message);
                setOutcomes(result.outcomes);
              }, t("Import processed. Review the row outcomes below."))
            }
          >
            {busy ? t("Importing…") : t("Import list")}
          </Button>
        </div>
        <details className="disclosure">
          <summary>{t("Map differently named columns")}</summary>
          <p className="muted">
            {t(
              "Enter the exact column heading from your file. Leave blank to use the standard heading.",
            )}
          </p>
          <div className="form-grid">
            {COLUMNS.map((target) => (
              <Field key={target} label={`${t("File column for")} ${target}`}>
                <Input
                  value={columnMapping[target] ?? ""}
                  onChange={(e) => {
                    setColumnMapping((previous) => ({
                      ...previous,
                      [target]: e.target.value,
                    }));
                    setImportKey(crypto.randomUUID());
                  }}
                />
              </Field>
            ))}
          </div>
        </details>
        {outcomes.length > 0 && (
          <div className="import-results">
            {outcomes.map((o) => (
              <p key={o.row} className="import-outcome">
                Row {o.row}:{" "}
                <Badge tone={toneFor(o.state)}>{o.state}</Badge> {o.message}
              </p>
            ))}
          </div>
        )}
      </Panel>
      {!data.prospects.length ? (
        <Empty
          title={t("Your first accounts belong here")}
          icon={<IconUsers size={18} />}
        >
          {t(
            "Import a consented or synthetic lead list, then review its sources.",
          )}
        </Empty>
      ) : (
        <Panel
          className="table-panel"
          title={t("Accounts")}
          eyebrow={`${rows.length} / ${data.prospects.length}`}
          actions={
            <div className="toolbar">
              <div className="segmented" role="group" aria-label={t("Tier")}>
                {(["all", "A", "B", "C"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={tier === value}
                    onClick={() => setTier(value)}
                  >
                    {value === "all" ? t("All") : value}
                  </button>
                ))}
              </div>
              <label className="search">
                <IconSearch size={14} aria-hidden />
                <input
                  type="search"
                  aria-label={t("Search accounts")}
                  placeholder={t("Search accounts")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      aria-label={t("Select all visible")}
                      checked={allVisibleSelected}
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked
                            ? [...new Set([...old, ...rows.map((p) => p.id)])]
                            : old.filter((id) => !rows.some((p) => p.id === id)),
                        )
                      }
                    />
                  </th>
                  <th>{t("Person / company")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Fit")}</th>
                  <th>{t("Evidence")}</th>
                  <th>
                    <span className="sr-only">{t("Review")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const reviewed = p.evidence.filter((e) => e.approved).length;
                  return (
                    <tr
                      key={p.id}
                      className={selected.includes(p.id) ? "selected" : ""}
                    >
                      <td className="col-check">
                        <input
                          aria-label={`Select ${p.snapshot.firstName}`}
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={(e) =>
                            setSelected((old) =>
                              e.target.checked
                                ? [...old, p.id]
                                : old.filter((id) => id !== p.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <div className="person">
                          <span className="avatar" aria-hidden>
                            {(p.snapshot.company[0] ?? "?").toUpperCase()}
                          </span>
                          <div>
                            <strong dir="auto">
                              {p.snapshot.firstName} {p.snapshot.lastName}
                            </strong>
                            <p dir="auto">{p.snapshot.company}</p>
                          </div>
                        </div>
                      </td>
                      <td dir="auto">{p.snapshot.title}</td>
                      <td>
                        {p.score === null ? (
                          <span className="muted">{t("Not scored")}</span>
                        ) : (
                          <span className="score">
                            <span className="mono">{p.score}</span>
                            {p.breakdown.tier && (
                              <Badge
                                tone={
                                  TIER_TONE[
                                    p.breakdown.tier as keyof typeof TIER_TONE
                                  ] ?? "neutral"
                                }
                              >
                                {p.breakdown.tier}
                              </Badge>
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge tone={reviewed ? "ok" : "neutral"}>
                          {reviewed} {t("reviewed")}
                        </Badge>
                      </td>
                      <td className="col-action">
                        <Button size="sm" variant="ghost" onClick={() => setProspect(p)}>
                          {t("Open")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && (
              <p className="table-empty muted">
                {t("No accounts match this filter.")}
              </p>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}
