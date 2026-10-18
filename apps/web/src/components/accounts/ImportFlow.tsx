"use client";
import { useRef, useState } from "react";
import type { ImportHistoryDetail } from "@revenue/contracts";
import { IconFileText, IconUpload } from "@revenue/ui";
import { client } from "../../lib/client";
import { usePrefs } from "../../lib/prefs";
import { useWorkspace } from "../workspace-context";
import { Badge, Button, Check, Field, Input, toneFor } from "../primitives";
import { RowChevron } from "./parts";

// Import is a task view with three steps (Import frames): upload, match columns, review the
// outcomes. Import history is its own tab on the Accounts page.
const COLUMNS = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["email", "Email"],
  ["company", "Company"],
  ["website", "Website"],
  ["title", "Role"],
  ["employees", "Employees"],
] as const;
const MAX_BYTES = 5 * 1024 * 1024;
type Outcome = { row: number; state: string; message?: string };

// Alternative headings people commonly use for each target field.
const SYNONYMS: Record<string, string[]> = {
  firstName: ["firstname", "first", "givenname", "forename"],
  lastName: ["lastname", "last", "surname", "familyname"],
  email: ["email", "workemail", "emailaddress", "mail"],
  company: ["company", "companyname", "organisation", "organization", "account"],
  website: ["website", "companyurl", "url", "domain", "site", "web"],
  title: ["title", "jobtitle", "role", "position"],
  employees: ["employees", "headcount", "staff", "companysize", "employeecount"],
};
const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "");

// Reads a CSV the way a spreadsheet does (quotes, doubled quotes, newlines inside a quoted cell).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

// Maps a standard field to a differently named file column; "" keeps the standard heading.
function guess(target: string, headers: string[]): string {
  if (headers.includes(target)) return "";
  const wanted = SYNONYMS[target] ?? [];
  const found =
    headers.find((h) => wanted.includes(squash(h))) ??
    headers.find((h) => wanted.some((w) => w.length > 3 && squash(h).includes(w)));
  return found ?? "";
}

export function ImportFlow({
  onDone,
  onHistory,
}: {
  onDone: () => void;
  onHistory: (importId?: string) => void;
}) {
  const { ws, busy, canWrite, action } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [importKey, setImportKey] = useState(() => crypto.randomUUID());
  const [problem, setProblem] = useState("");
  const [dragging, setDragging] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [detail, setDetail] = useState<ImportHistoryDetail | null>(null);
  const [visible, setVisible] = useState(25);
  const [attentionOnly, setAttentionOnly] = useState(false);

  const choose = async (picked: File | undefined) => {
    setProblem("");
    if (!picked) return;
    if (!/\.(csv|xlsx)$/i.test(picked.name)) {
      setProblem(t("Choose a CSV or XLSX file."));
      return;
    }
    if (picked.size > MAX_BYTES) {
      setProblem(t("This file is over 5 MB. Split it and import the parts."));
      return;
    }
    let parsedHeaders: string[] = [];
    let count: number | null = null;
    if (/\.csv$/i.test(picked.name)) {
      try {
        const rows = parseCsv(await picked.text());
        parsedHeaders = (rows[0] ?? []).map((h) => h.trim());
        count = Math.max(0, rows.length - 1);
      } catch {
        parsedHeaders = [];
      }
    }
    setFile(picked);
    setHeaders(parsedHeaders);
    setRowCount(count);
    setMapping(
      Object.fromEntries(
        COLUMNS.map(([target]) => [target, guess(target, parsedHeaders)]),
      ),
    );
    setImportKey(crypto.randomUUID());
    setStep("mapping");
  };
  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRowCount(null);
    setMapping({});
    setAllowDuplicates(false);
    setOutcomes([]);
    setDetail(null);
    setVisible(25);
    setAttentionOnly(false);
    setProblem("");
    setImportKey(crypto.randomUUID());
    if (fileRef.current) fileRef.current.value = "";
    setStep("upload");
  };
  const submit = () =>
    void action(async () => {
      if (!file) throw new Error(t("Choose a CSV or XLSX file first."));
      const form = new FormData();
      form.append("file", file);
      form.append("requestKey", importKey);
      form.append(
        "mapping",
        JSON.stringify(
          Object.fromEntries([
            ...Object.entries(mapping).filter(([, source]) => source.trim()),
            ...(allowDuplicates ? [["__allowDuplicates", "true"]] : []),
          ]),
        ),
      );
      const res = await fetch(`/api/workspaces/${ws}/imports`, {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setOutcomes(result.outcomes);
      setDetail(null);
      if (result.id)
        void client
          .workspace<ImportHistoryDetail>(ws, `/imports/${result.id}`)
          .then(setDetail)
          .catch(() => {});
      setStep("results");
    }, t("Import processed. Review the row outcomes below."));

  const stepper = (
    <ol className="acct-steps" aria-label={t("Import steps")}>
      {(
        [
          ["upload", "Upload"],
          ["mapping", "Map columns"],
          ["results", "Review outcomes"],
        ] as const
      ).map(([id, label], index) => (
        <li key={id} aria-current={step === id ? "step" : undefined}>
          {t(label)}
          {index < 2 && <span aria-hidden> → </span>}
        </li>
      ))}
    </ol>
  );

  if (step === "upload")
    return (
      <section className="acct-task" aria-label={t("Import your accounts")}>
        <div className="acct-task-head">
          <h2>{t("Import your accounts")}</h2>
          {stepper}
        </div>
        <div
          className={`acct-dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void choose(event.dataTransfer.files[0]);
          }}
        >
          <IconUpload size={28} aria-hidden />
          <h3>{t("Bring your lead list")}</h3>
          <p className="muted">
            {t(
              "Upload CSV or XLSX. Existing source reviews and exclusions stay attached to the record.",
            )}
          </p>
          <input
            ref={fileRef}
            className="sr-only"
            id="lead-file"
            aria-label={t("Lead file")}
            type="file"
            accept=".csv,.xlsx"
            tabIndex={-1}
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          <Button
            variant="primary"
            size="lg"
            disabled={busy || !canWrite}
            onClick={() => fileRef.current?.click()}
          >
            {t("Choose a file")}
          </Button>
          <p className="muted small">
            {t("Up to 1,000 rows · 5 MB. Columns: firstName, lastName, email, company, website, title, employees.")}
          </p>
          {!canWrite && (
            <p className="muted small">
              {t("Your role cannot import accounts.")}
            </p>
          )}
          {problem && (
            <p role="alert" className="error-text small">
              {problem}
            </p>
          )}
        </div>
        <div className="button-row">
          <Button onClick={() => onHistory()}>{t("View import history")}</Button>
        </div>
      </section>
    );

  if (step === "mapping")
    return (
      <section className="acct-task" aria-label={t("Match your columns")}>
        <div className="acct-task-head">
          <h2>{t("Match your columns")}</h2>
          {stepper}
        </div>
        <p className="acct-file">
          <IconFileText size={16} aria-hidden />
          <bdi>{file?.name}</bdi>
          {" · "}
          {rowCount !== null
            ? `${num(rowCount)} ${t("rows")}`
            : `${num(Math.max(1, Math.round((file?.size ?? 0) / 1024)))} KB`}
        </p>
        <p className="muted">
          {t(
            "Enter the exact column heading from your file. Leave blank to use the standard heading.",
          )}
        </p>
        <datalist id="lead-columns">
          {headers.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <div className="acct-mapping">
          {COLUMNS.map(([target, label]) => (
            <Field
              key={target}
              label={`${t("File column for")} ${t(label)}`}
              className="acct-map-row"
            >
              <Input
                list="lead-columns"
                value={mapping[target] ?? ""}
                placeholder={target}
                dir="ltr"
                onChange={(event) => {
                  setMapping((previous) => ({
                    ...previous,
                    [target]: event.target.value,
                  }));
                  setImportKey(crypto.randomUUID());
                }}
              />
            </Field>
          ))}
        </div>
        <Check
          label={t("Import possible duplicates anyway")}
          checked={allowDuplicates}
          onChange={(event) => {
            setAllowDuplicates(event.target.checked);
            setImportKey(crypto.randomUUID());
          }}
        />
        <div className="button-row">
          <Button
            variant="primary"
            disabled={busy || !canWrite}
            onClick={submit}
          >
            {busy
              ? t("Importing…")
              : rowCount !== null
                ? rowCount === 1
                  ? t("Import 1 row")
                  : `${t("Import")} ${num(rowCount)} ${t("rows")}`
                : t("Import list")}
          </Button>
          <Button disabled={busy} onClick={reset}>
            {t("Back")}
          </Button>
        </div>
      </section>
    );

  // Results
  const attention = outcomes.filter((o) => o.state !== "imported");
  const counts = detail?.counts;
  const added =
    counts?.added ??
    outcomes.filter((o) => o.state === "imported" && o.message !== "Updated from the new file").length;
  const changed = counts?.changed ?? 0;
  const needAttention = counts
    ? counts.duplicate + counts.invalid + counts.retry
    : attention.length;
  const listed = attentionOnly ? attention : outcomes;
  return (
    <section className="acct-task" aria-label={t("Review the import")}>
      <div className="acct-task-head">
        <h2>{t("Review the import")}</h2>
        {stepper}
      </div>
      <p>
        <Badge tone={needAttention ? "warn" : "ok"}>
          {needAttention ? t("Import completed with rows to review") : t("Import completed")}
        </Badge>
      </p>
      <h3 className="acct-lead">{t("Your accounts are ready to review.")}</h3>
      <p className="acct-counts">
        {num(added)} {t("added")} · {num(changed)} {t("updated")}
        {counts && counts.unchanged > 0 && (
          <>
            {" · "}
            {num(counts.unchanged)} {t("unchanged")}
          </>
        )}
        {" · "}
        {num(needAttention)} {t("need attention")}
      </p>
      <ul className="acct-list">
        {needAttention > 0 && (
          <li>
            <button
              type="button"
              className="acct-list-item"
              aria-pressed={attentionOnly}
              onClick={() => setAttentionOnly((v) => !v)}
            >
              <IconFileText size={18} aria-hidden />
              <span className="acct-list-text">
                <strong>
                  {num(needAttention)} {t("rows need attention")}
                </strong>
                <span className="muted small">
                  {t("Missing email or possible duplicate. Review before continuing.")}
                </span>
              </span>
              <Badge>{t("Review")}</Badge>
              <RowChevron />
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            className="acct-list-item"
            onClick={() => onHistory(detail?.id)}
          >
            <IconFileText size={18} aria-hidden />
            <span className="acct-list-text">
              <strong>{t("Import details")}</strong>
              <span className="muted small">
                <bdi>{detail?.filename ?? file?.name}</bdi>
                {detail ? ` · ${t("Version")} ${num(detail.version)}` : ""}
              </span>
            </span>
            <Badge>{t("Saved")}</Badge>
            <RowChevron />
          </button>
        </li>
      </ul>
      <div className="acct-outcomes" aria-label={t("Row outcomes")}>
        {listed.slice(0, visible).map((o) => (
          <p key={o.row} className="import-outcome">
            {t("Row")} {o.row}: <Badge tone={toneFor(o.state)}>{o.state}</Badge>{" "}
            {o.message}
          </p>
        ))}
        {listed.length > visible && (
          <Button size="sm" onClick={() => setVisible((n) => n + 50)}>
            {t("Show more rows")}
          </Button>
        )}
      </div>
      <div className="button-row">
        <Button variant="primary" onClick={onDone}>
          {t("Open accounts")}
        </Button>
        <Button onClick={reset}>{t("Import another file")}</Button>
      </div>
    </section>
  );
}
