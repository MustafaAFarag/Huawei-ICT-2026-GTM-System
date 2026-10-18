"use client";
import { useMemo, useState } from "react";
import { ASSET_FORMATS, type AssetTemplate } from "@revenue/contracts";
import { IconChevronRight, IconFileText } from "@revenue/ui";
import {
  Badge,
  Button,
  Empty,
  Input,
  Select,
  Field,
  PageTabs,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { assetLabel } from "../../lib/asset-label";
import { profileAssignmentCounts } from "../../lib/profile-assignments";
import type { Asset } from "../../lib/types";
import "../../styles/pages/deliverables.css";
import { FORMAT_ICONS } from "../chat/Conversation";

const GROUPS = [
  { id: "all", label: "All", match: () => true },
  {
    id: "documents",
    label: "Documents",
    match: (t: string) =>
      ["offer-one-pager", "mini-audit", "capability-profile"].includes(t),
  },
  {
    id: "emails",
    label: "Emails",
    match: (t: string) => t.startsWith("email"),
  },
  {
    id: "carousels",
    label: "Carousels",
    match: (t: string) => t.endsWith("carousel"),
  },
  {
    id: "flipbooks",
    label: "Flipbooks",
    match: (t: string) => t === "flipbook",
  },
] as const;

function when(date: string | undefined, language: string) {
  if (!date) return "";
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  const rtf = new Intl.RelativeTimeFormat(language === "ar" ? "ar" : "en", {
    numeric: "auto",
  });
  if (Math.abs(days) < 1) {
    const hours = Math.round((Date.now() - new Date(date).getTime()) / 3600000);
    return rtf.format(-hours, "hour");
  }
  if (days < 30) return rtf.format(-days, "day");
  return new Date(date).toLocaleDateString(
    language === "ar" ? "ar-EG" : "en-GB",
    { day: "numeric", month: "short" },
  );
}

// Deliverables (Linear-style list): everything Nabil prepared, filed by account and format.
export function AssetStudio({ onPreview }: { onPreview: (a: Asset) => void }) {
  const { data, askNabil, canWrite, busy } = useWorkspace();
  const { t, language } = usePrefs();
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<AssetTemplate>("linkedin-carousel");
  const [goal, setGoal] = useState("");
  const [contentLanguage, setContentLanguage] = useState("en");
  const [account, setAccount] = useState("");
  const rows = useMemo(
    () =>
      [...data.assets]
        .filter((a) => GROUPS.find((g) => g.id === group)!.match(a.template))
        .filter((a) =>
          [
            assetLabel(a, t),
            t(ASSET_FORMATS[a.template as AssetTemplate]?.label ?? a.template),
            data.prospects.find((p) => p.id === a.prospectId)?.snapshot.company,
          ]
            .join(" ")
            .toLocaleLowerCase(language)
            .includes(search.trim().toLocaleLowerCase(language)),
        )
        .sort((a, b) =>
          sort === "title"
            ? assetLabel(a, t).localeCompare(assetLabel(b, t), language)
            : String(b.createdAt).localeCompare(String(a.createdAt)),
        ),
    [data.assets, data.prospects, group, language, search, sort, t],
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 6) - 1),
  );
  const createButton = (
    <Button
      variant="primary"
      disabled={!canWrite || busy}
      aria-describedby={!canWrite ? "deliverable-create-permission" : undefined}
      onClick={() => {
        if (canWrite && !busy) setCreating(true);
      }}
    >
      {t("Create")}
    </Button>
  );
  if (creating)
    return (
      <section
        className="deliverables deliverable-create"
        aria-labelledby="create-deliverable-title"
      >
        <h2 id="create-deliverable-title">{t("Create a deliverable")}</h2>
        <p className="muted">
          {t("Choose the format. Nabil will use your current brand.")}
        </p>
        {!canWrite && (
          <p id="deliverable-create-permission" className="muted">
            {t(
              "You have read-only access to deliverables. Ask a workspace owner or editor to create or revise one.",
            )}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canWrite || busy || !goal.trim()) return;
            const company = data.prospects.find((p) => p.id === account)
              ?.snapshot.company;
            askNabil(
              `${t("Create a deliverable")}: ${ASSET_FORMATS[template].label} (${template}). ${t("What should this achieve?")}: ${goal.trim()}. ${t("Content language")}: ${contentLanguage}. ${t("Audience or account")}: ${company || t("Brand-level")}${account ? ` (${account})` : ""}.`,
            );
          }}
        >
          <div
            className="deliverable-format-picker"
            role="group"
            aria-label={t("Format")}
          >
            {(
              [
                "email-gmail",
                "linkedin-carousel",
                "flipbook",
                "offer-one-pager",
              ] as AssetTemplate[]
            ).map((kind) => {
              const Icon = FORMAT_ICONS[kind] ?? IconFileText;
              const selected =
                ASSET_FORMATS[template].viewer === ASSET_FORMATS[kind].viewer;
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTemplate(kind)}
                >
                  <Icon size={18} />
                  {t(
                    (
                      {
                        "email-gmail": "Email",
                        "linkedin-carousel": "Carousel",
                        flipbook: "Flipbook",
                        "offer-one-pager": "Document",
                      } as Record<string, string>
                    )[kind],
                  )}
                </button>
              );
            })}
          </div>
          <Field label={t("What should this achieve?")}>
            <Input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              required
              maxLength={1500}
              autoFocus
            />
          </Field>
          <div className="deliverable-form-grid">
            <Field label={t("Format")}>
              <Select
                value={template}
                onChange={(event) =>
                  setTemplate(event.target.value as AssetTemplate)
                }
              >
                {Object.entries(ASSET_FORMATS).map(([key, format]) => (
                  <option key={key} value={key}>
                    {t(format.label)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Content language")}>
              <Select
                value={contentLanguage}
                onChange={(event) => setContentLanguage(event.target.value)}
              >
                {["en", "ar-EG", "ar-Gulf"].map((value) => (
                  <option value={value} key={value}>
                    {t(
                      value === "en"
                        ? "English"
                        : value === "ar-EG"
                          ? "Arabic (Egypt)"
                          : "Arabic (Gulf)",
                    )}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("Audience or account")}>
            <Select
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            >
              <option value="">{t("Brand-level")}</option>
              {data.prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.snapshot.company}
                </option>
              ))}
            </Select>
          </Field>
          <p className="muted">
            {t("Uses your reviewed company facts and approved offer.")}
          </p>
          <div className="button-row">
            <Button
              type="submit"
              variant="primary"
              disabled={!canWrite || busy || !goal.trim()}
            >
              {t("Create with Nabil")}
            </Button>
            <Button onClick={() => setCreating(false)}>{t("Cancel")}</Button>
          </div>
        </form>
      </section>
    );
  return (
    <section className="deliverables" aria-label={t("Deliverables")}>
      {!canWrite && (
        <p id="deliverable-create-permission" className="muted">
          {t(
            "You have read-only access to deliverables. Ask a workspace owner or editor to create or revise one.",
          )}
        </p>
      )}
      <div className="deliverable-topline">
        <PageTabs
          label={t("Format")}
          value={group}
          tabs={GROUPS.map((g) => ({ id: g.id, label: t(g.label) }))}
          onChange={(value) => {
            setGroup(value as typeof group);
            setPage(0);
          }}
        />
        <div className="deliverable-create-desktop">{createButton}</div>
      </div>
      <div className="deliverable-toolbar">
        <Input
          type="search"
          aria-label={t("Search deliverables")}
          placeholder={t("Search deliverables…")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        <Select
          aria-label={t("Sort deliverables")}
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(0);
          }}
        >
          <option value="recent">{t("Recently updated")}</option>
          <option value="title">{t("Title")}</option>
        </Select>
      </div>
      {!rows.length ? (
        <Empty
          title={t(
            search || group !== "all"
              ? "No matching deliverables"
              : "Your first deliverable starts with an idea.",
          )}
          icon={<IconFileText size={24} />}
          action={
            search || group !== "all" ? (
              <Button
                onClick={() => {
                  setSearch("");
                  setGroup("all");
                }}
              >
                {t("Clear filters")}
              </Button>
            ) : (
              createButton
            )
          }
        >
          {t(
            search || group !== "all"
              ? "Try another search or format."
              : "Choose an email, carousel, flipbook or document. Nabil uses your brand and saves the result here.",
          )}
        </Empty>
      ) : (
        <>
          <ul className="deliverable-list">
            {rows.slice(currentPage * 6, currentPage * 6 + 6).map((a) => {
              const format = ASSET_FORMATS[a.template as AssetTemplate];
              const Icon = FORMAT_ICONS[a.template] ?? IconFileText;
              const assignments =
                a.template === "capability-profile"
                  ? profileAssignmentCounts(a.id, data)
                  : null;
              const company = data.prospects.find((p) => p.id === a.prospectId)
                ?.snapshot.company;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="deliverable-row"
                    onClick={() => onPreview(a)}
                  >
                    <Icon
                      className="deliverable-row-icon"
                      size={18}
                      aria-hidden
                    />
                    <span className="deliverable-row-main">
                      <span className="deliverable-row-title" dir="auto">
                        {assetLabel(a, t)}
                      </span>
                      <span className="deliverable-row-sub">
                        {t(format?.label ?? a.template)} ·{" "}
                        {company ? <bdi>{company}</bdi> : t("Brand-level")} ·{" "}
                        <bdi dir="ltr">
                          {a.language} · v{a.version ?? 1}
                        </bdi>
                        <span className="deliverable-phone-status">
                          {" "}
                          · {a.approvedAt ? t("Approved") : t("Needs review")}
                        </span>
                      </span>
                    </span>
                    {assignments &&
                      (assignments.total === 0 ? (
                        <Badge tone="neutral" dot={false}>
                          {t("Holdout available")}
                        </Badge>
                      ) : (
                        <>
                          <Badge tone="info" dot={false}>
                            {t("With profile")} {" "}
                            <bdi dir="ltr">{assignments.withProfile}</bdi>
                          </Badge>
                          <Badge tone="warn" dot={false}>
                            {t("Without profile")} {" "}
                            <bdi dir="ltr">{assignments.withoutProfile}</bdi>
                          </Badge>
                        </>
                      ))}
                    <span className="deliverable-status">
                      <Badge tone={a.approvedAt ? "ok" : "warn"} dot={false}>
                        {a.approvedAt ? t("Approved") : t("Needs review")}
                      </Badge>
                    </span>
                    <span className="sr-only">
                      {when(a.createdAt, language)}
                    </span>
                    <IconChevronRight
                      className="deliverable-chevron flip-rtl"
                      size={16}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="deliverable-pagination">
            <span className="muted">
              {t("Showing")}{" "}
              <bdi>
                {currentPage * 6 + 1}–
                {Math.min(currentPage * 6 + 6, rows.length)}
              </bdi>{" "}
              {t("of")} <bdi>{rows.length}</bdi> {t("deliverables")}
            </span>
            <div className="button-row">
              <Button
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                {t("Previous")}
              </Button>
              <Button
                disabled={(currentPage + 1) * 6 >= rows.length}
                onClick={() => setPage(currentPage + 1)}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </>
      )}
      <div className="deliverable-create-phone">{createButton}</div>
    </section>
  );
}
