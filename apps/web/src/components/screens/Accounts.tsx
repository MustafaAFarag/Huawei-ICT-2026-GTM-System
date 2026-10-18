"use client";
import { useMemo, useState } from "react";
import { COUNTRIES, BUCKETS } from "@revenue/contracts";
import { IconArrowLeft, IconUsers } from "@revenue/ui";
import "../../styles/pages/accounts.css";
import { client } from "../../lib/client";
import { Duplicates } from "../Duplicates";
import { ImportHistory } from "../ImportHistory";
import { ImportFlow } from "../accounts/ImportFlow";
import { RubricEditor } from "../accounts/RubricEditor";
import { TriageView } from "../accounts/TriageView";
import {
  COUNTRY_LABEL,
  isDropped,
  needsReview,
  triageGroup,
} from "../accounts/holds";
import { Pager, RowChevron, SelectMark, usePaging } from "../accounts/parts";
import {
  Button,
  EmptyState,
  Input,
  PageTabs,
  Select,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import type { Prospect } from "../../lib/types";

type Tab =
  | "all"
  | "review"
  | "mine"
  | "triage"
  | "duplicates"
  | "history"
  | "rubric";
const PAGE_SIZE = 10;
const BUCKET_LABEL = {
  client: "Keep",
  partner: "Partner",
  drop: "Drop",
  existing: "Existing client",
} as const;

export function Accounts() {
  const {
    ws,
    userId,
    data,
    busy,
    canWrite,
    action,
    selected,
    setSelected,
    setProspect,
    setTab,
  } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const [mode, setMode] = useState<"list" | "import">("list");
  const [tab, setTabState] = useState<Tab>("all");
  const [historyOpen, setHistoryOpen] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | "A" | "B" | "C">("all");
  const [bucket, setBucket] = useState("all");
  const [country, setCountry] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const members = new Map(data.members.map((m) => [m.userId, m.user.name]));
  const licence = Boolean(data.workspace.company.marketingLicence);

  const tabRows = useMemo(
    () =>
      data.prospects.filter((p) =>
        tab === "review"
          ? needsReview(p)
          : tab === "mine"
            ? p.ownerId === userId
            : true,
      ),
    [data.prospects, tab, userId],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabRows.filter((p) => {
      if (tier !== "all" && p.breakdown.tier !== tier) return false;
      if (bucket !== "all" && (p.snapshot.bucket ?? "none") !== bucket)
        return false;
      if (country !== "all" && (p.country ?? "none") !== country) return false;
      if (!q) return true;
      const s = p.snapshot;
      return [s.firstName, s.lastName, s.company, s.title, s.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tabRows, query, tier, bucket, country]);
  const paging = usePaging(
    rows.length,
    PAGE_SIZE,
    `${tab}|${query}|${tier}|${bucket}|${country}`,
  );
  const pageRows = paging.slice(rows);
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((p) => selected.includes(p.id));
  const activeFilters =
    (bucket !== "all" ? 1 : 0) + (country !== "all" ? 1 : 0);

  const triageSelected = (value: string) =>
    void action(
      async () => {
        for (const id of selected)
          await client.workspace(ws, `/prospects/${id}/triage`, {
            method: "PATCH",
            body: JSON.stringify({ bucket: value }),
          });
        setSelected(() => []);
      },
      `${selected.length} ${t("accounts triaged as")} ${t(value)}.`,
    );
  const prepareOutreach = () => setTab("Plays");
  const statusOf = (p: Prospect) => {
    if (isDropped(p))
      return {
        tone: "muted",
        label:
          p.snapshot.bucket === "existing" || p.snapshot.existingClient
            ? t("Existing client")
            : p.snapshot.bucket === "drop"
              ? t("Dropped")
              : t("Excluded"),
      };
    if (needsReview(p)) return { tone: "", label: t("Needs review") };
    return triageGroup(p, licence) === "held"
      ? { tone: "warn", label: t("Held") }
      : { tone: "ok", label: t("Ready") };
  };

  const tabs = [
    { id: "all", label: t("All accounts") },
    {
      id: "review",
      label: t("Needs review"),
      count: num(data.prospects.filter(needsReview).length),
    },
    { id: "mine", label: t("Assigned to me") },
    { id: "triage", label: t("Ready and held") },
    { id: "duplicates", label: t("Duplicates") },
    { id: "history", label: t("Import history") },
    { id: "rubric", label: t("Rubric") },
  ] as const;

  if (mode === "import")
    return (
      <div className="acct-page acct-import">
        <Button
          variant="ghost"
          size="sm"
          className="acct-back"
          startIcon={<IconArrowLeft size={14} className="flip-rtl" />}
          onClick={() => setMode("list")}
        >
          {t("Back to accounts")}
        </Button>
        <ImportFlow
          onDone={() => {
            setMode("list");
            setTabState("all");
          }}
          onHistory={(id) => {
            setHistoryOpen(id);
            setMode("list");
            setTabState("history");
          }}
        />
      </div>
    );

  const importButton = (
    <Button
      variant="primary"
      className="acct-import-button"
      disabled={!canWrite}
      onClick={() => setMode("import")}
    >
      {t("Import accounts")}
    </Button>
  );
  const listTab = tab === "all" || tab === "review" || tab === "mine";
  return (
    <div className="acct-page" data-tab={tab}>
      <div className="acct-tabs">
        <PageTabs
          label={t("Account sections")}
          value={tab}
          onChange={(id) => {
            setTabState(id);
            if (id !== "history") setHistoryOpen(undefined);
          }}
          tabs={tabs}
        />
      </div>
      <div className="acct-action">{importButton}</div>
      <div className="acct-body">
        {listTab &&
          (!data.prospects.length ? (
            <EmptyState
              icon={<IconUsers size={18} />}
              title={t("Your first accounts belong here")}
              text={t(
                "Import a consented or synthetic lead list, then review its sources.",
              )}
              action={
                <Button
                  variant="primary"
                  disabled={!canWrite}
                  onClick={() => setMode("import")}
                >
                  {t("Import accounts")}
                </Button>
              }
            />
          ) : (
            <section className="acct-list-view" aria-label={t("Accounts")}>
              <div className="acct-toolbar">
                <Input
                  type="search"
                  className="acct-search"
                  aria-label={t("Search accounts")}
                  placeholder={t("Search name, company or email…")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Select
                  className="acct-tier"
                  aria-label={t("Tier")}
                  value={tier}
                  onChange={(event) =>
                    setTier(event.target.value as typeof tier)
                  }
                >
                  <option value="all">{t("Tier: All")}</option>
                  {["A", "B", "C"].map((value) => (
                    <option key={value} value={value}>
                      {t("Tier")} {value}
                    </option>
                  ))}
                </Select>
                <Button
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  {t("Filters")}
                  {activeFilters > 0 ? ` · ${num(activeFilters)}` : ""}
                </Button>
                <span className="acct-toolbar-end">
                  {selected.length > 0 ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setSelected(() => [])}
                      >
                        {t("Clear selection")}
                      </Button>
                      <Button variant="primary" onClick={prepareOutreach}>
                        {t("Prepare outreach")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={!pageRows.length}
                      onClick={() =>
                        setSelected((old) => [
                          ...new Set([...old, ...pageRows.map((p) => p.id)]),
                        ])
                      }
                    >
                      {t("Select accounts")}
                    </Button>
                  )}
                </span>
              </div>
              {filtersOpen && (
                <div className="acct-filters" role="group" aria-label={t("Filters")}>
                  <Select
                    aria-label={t("Triage")}
                    value={bucket}
                    onChange={(event) => setBucket(event.target.value)}
                  >
                    <option value="all">{t("Triage: All")}</option>
                    <option value="none">{t("untriaged")}</option>
                    {BUCKETS.map((value) => (
                      <option key={value} value={value}>
                        {t(BUCKET_LABEL[value])}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={t("Country")}
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
                    <option value="all">{t("Country: All")}</option>
                    <option value="none">{t("Not set")}</option>
                    {COUNTRIES.map((code) => (
                      <option key={code} value={code}>
                        {t(COUNTRY_LABEL[code])}
                      </option>
                    ))}
                  </Select>
                  {activeFilters > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBucket("all");
                        setCountry("all");
                      }}
                    >
                      {t("Clear filters")}
                    </Button>
                  )}
                </div>
              )}
              {selected.length > 0 && (
                <div className="acct-bulk" role="group" aria-label={t("Triage selected")}>
                  <span className="mono">
                    {num(selected.length)} {t("selected")}
                  </span>
                  {BUCKETS.map((value) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={value === "drop" ? "danger" : "secondary"}
                      disabled={!canWrite || busy}
                      onClick={() => triageSelected(value)}
                    >
                      {t(BUCKET_LABEL[value])}
                    </Button>
                  ))}
                </div>
              )}
              {!rows.length ? (
                <EmptyState
                  title={t("No accounts match this filter.")}
                  text={
                    tab === "mine"
                      ? t("Accounts assigned to you appear here.")
                      : undefined
                  }
                />
              ) : (
                <div className="acct-table-wrap">
                  <table className="acct-table acct-accounts">
                    <thead>
                      <tr>
                        <th className="acct-col-select">
                          <label className="sr-only">
                            <input
                              type="checkbox"
                              aria-label={t("Select all visible")}
                              checked={allPageSelected}
                              onChange={(event) =>
                                setSelected((old) =>
                                  event.target.checked
                                    ? [
                                        ...new Set([
                                          ...old,
                                          ...pageRows.map((p) => p.id),
                                        ]),
                                      ]
                                    : old.filter(
                                        (id) => !pageRows.some((p) => p.id === id),
                                      ),
                                )
                              }
                            />
                          </label>
                        </th>
                        <th>{t("Person / company")}</th>
                        <th className="acct-col-role">{t("Role")}</th>
                        <th>{t("Fit")}</th>
                        <th>{t("Status")}</th>
                        <th className="acct-col-owner">{t("Owner")}</th>
                        <th className="acct-col-open">
                          <span className="sr-only">{t("Open")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((p) => {
                        const isSelected = selected.includes(p.id);
                        const status = statusOf(p);
                        return (
                          <tr
                            key={p.id}
                            className={isSelected ? "selected" : ""}
                            onClick={(event) => {
                              if (
                                (event.target as HTMLElement).closest(
                                  "label, button, input, a",
                                )
                              )
                                return;
                              setProspect(p);
                            }}
                          >
                            <td className="acct-col-select">
                              <SelectMark
                                label={`${t("Select")} ${p.snapshot.firstName}`}
                                checked={isSelected}
                                onChange={(checked) =>
                                  setSelected((old) =>
                                    checked
                                      ? [...old, p.id]
                                      : old.filter((id) => id !== p.id),
                                  )
                                }
                              />
                            </td>
                            <td className="acct-col-person">
                              <strong dir="auto">
                                {p.snapshot.firstName} {p.snapshot.lastName}
                              </strong>
                              <p dir="auto">{p.snapshot.company}</p>
                              <p className="acct-role-inline" dir="auto">
                                {p.snapshot.title}
                              </p>
                            </td>
                            <td className="acct-col-role" dir="auto">
                              {p.snapshot.title}
                            </td>
                            <td className="acct-col-fit">
                              {p.score === null ? (
                                <span className="muted">{t("Not scored")}</span>
                              ) : (
                                <span className="acct-fit" dir="ltr">
                                  {p.breakdown.tier ? `${p.breakdown.tier} · ` : ""}
                                  {p.score}
                                </span>
                              )}
                            </td>
                            <td className="acct-col-status">
                              <span className={`acct-status ${status.tone && `is-${status.tone}`}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="acct-col-owner small" dir="auto">
                              {members.get(p.ownerId) ?? "—"}
                            </td>
                            <td className="acct-col-open">
                              <button
                                type="button"
                                className="acct-open"
                                aria-label={t("Open")}
                                onClick={() => setProspect(p)}
                              >
                                <RowChevron />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {rows.length > 0 && (
                <Pager
                  paging={paging}
                  total={rows.length}
                  summary={
                    selected.length > 0
                      ? `${num(selected.length)} ${t("selected")} · ${t("across all pages")}`
                      : `${t("Showing")} ${num(paging.from)}–${num(paging.to)} ${t("of")} ${num(rows.length)} ${t("accounts")}`
                  }
                />
              )}
            </section>
          ))}
        {tab === "triage" && <TriageView onOpen={setProspect} />}
        {tab === "duplicates" && <Duplicates onBack={() => setTabState("all")} />}
        {tab === "history" && (
          <ImportHistory
            key={ws}
            revision={historyOpen ?? ws}
            openId={historyOpen}
            onImport={() => setMode("import")}
          />
        )}
        {tab === "rubric" && <RubricEditor key={ws} />}
      </div>
    </div>
  );
}
