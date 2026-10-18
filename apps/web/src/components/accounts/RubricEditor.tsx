"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Rubric } from "@revenue/contracts";
import { IconCheck, IconX } from "@revenue/ui";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";

type RubricView = { pack: string; rubric: Rubric; isPackDefault: boolean };
const ARABIC = /[؀-ۿݐ-ݿ]/;

// Frame v32-03: the qualification rubric. GET /rubric returns the pack default or the
// workspace's own; PATCH (owner only) saves it, and null resets to the pack default. Scores are
// 0 to 100 and every rule explains its points; existing accounts keep their stored score until
// they are scored again.
export function RubricEditor() {
  const { ws, data, busy, action } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const owner = data.role === "owner";
  const [view, setView] = useState<RubricView | null>(null);
  const [draft, setDraft] = useState<Rubric | null>(null);
  const [failed, setFailed] = useState(false);
  const [keyword, setKeyword] = useState("");
  const load = useCallback(() => {
    setFailed(false);
    setView(null);
    return client
      .workspace<RubricView>(ws, "/rubric")
      .then((result) => {
        setView(result);
        setDraft(structuredClone(result.rubric));
      })
      .catch(() => setFailed(true));
  }, [ws]);
  useEffect(() => {
    void load();
  }, [load]);
  const problems = useMemo(() => {
    if (!draft) return [];
    const list: string[] = [];
    const total =
      draft.role.points + draft.size.points + draft.website.points + draft.signal.points;
    if (total !== 100) list.push(t("Rule weights must add up to 100."));
    if (draft.size.min > draft.size.max)
      list.push(t("The size band minimum cannot be above its maximum."));
    if (draft.tiers.a < draft.tiers.b)
      list.push(t("The Tier A threshold must be at least the Tier B threshold."));
    if (!draft.role.keywords.length)
      list.push(t("Add at least one title keyword."));
    return list;
  }, [draft, t]);
  if (failed)
    return (
      <ErrorState
        title={t("The rubric could not load")}
        message={t("Your saved work is still there. Check your connection and try again.")}
        onRetry={() => void load()}
      />
    );
  if (!view || !draft)
    return <LoadingState title={t("Loading rubric…")} rows={3} />;
  const dirty = JSON.stringify(draft) !== JSON.stringify(view.rubric);
  const total =
    draft.role.points + draft.size.points + draft.website.points + draft.signal.points;
  const setPoints = (key: "role" | "size" | "website" | "signal", value: string) =>
    setDraft({
      ...draft,
      [key]: { ...draft[key], points: clamp(value, 0, 100) },
    } as Rubric);
  const english = draft.role.keywords.filter((k) => !ARABIC.test(k));
  const arabic = draft.role.keywords.filter((k) => ARABIC.test(k));
  const addKeyword = () => {
    const value = keyword.trim();
    if (!value || draft.role.keywords.includes(value) || draft.role.keywords.length >= 60)
      return;
    setDraft({
      ...draft,
      role: { ...draft.role, keywords: [...draft.role.keywords, value] },
    });
    setKeyword("");
  };
  const removeKeyword = (value: string) =>
    setDraft({
      ...draft,
      role: {
        ...draft.role,
        keywords: draft.role.keywords.filter((k) => k !== value),
      },
    });
  const save = (rubric: Rubric | null) =>
    void action(
      async () => {
        const result = await client.workspace<RubricView>(ws, "/rubric", {
          method: "PATCH",
          body: JSON.stringify({ rubric }),
        });
        setView(result);
        setDraft(structuredClone(result.rubric));
      },
      rubric === null
        ? t("Rubric reset to the pack default.")
        : t("Rubric saved. Existing accounts keep their score until they are scored again."),
    );
  const pack = data.pack.label[language];
  const locked = !owner || busy;
  const keywordGroup = (title: string, list: string[], dir: "ltr" | "rtl") => (
    <div className="acct-keyword-group">
      <h4>{title}</h4>
      <ul className="acct-chips" dir={dir}>
        {list.map((word) => (
          <li key={word} className="acct-keyword">
            <IconCheck size={13} aria-hidden />
            <span dir="auto">{word}</span>
            {owner && (
              <button
                type="button"
                aria-label={`${t("Remove")} ${word}`}
                onClick={() => removeKeyword(word)}
              >
                <IconX size={12} />
              </button>
            )}
          </li>
        ))}
        {!list.length && <li className="muted small">{t("None yet")}</li>}
      </ul>
    </div>
  );
  return (
    <section className="acct-rubric" aria-label={t("Qualification rubric")}>
      <div className="acct-section-head">
        <div>
          <h2>{t("Qualification rubric")}</h2>
          <p className="muted">
            {pack} · {view.isPackDefault ? t("Pack default") : t("Edited for this workspace")}.{" "}
            {t("Scores run 0–100 and every rule explains its points.")}
          </p>
        </div>
        {owner && (
          <div className="button-row">
            <Button
              disabled={locked || view.isPackDefault}
              onClick={() => save(null)}
            >
              {t("Reset to pack default")}
            </Button>
            <Button
              variant="primary"
              disabled={locked || !dirty || problems.length > 0}
              onClick={() => save(draft)}
            >
              {t("Save rubric")}
            </Button>
          </div>
        )}
      </div>
      {!owner && (
        <p className="acct-note is-info" role="status">
          <span>{t("Only the workspace owner can change the rubric. You are viewing it read-only.")}</span>
        </p>
      )}
      <div className="acct-card">
        <div className="acct-card-head">
          <h3>{t("Rules and weights")}</h3>
          <Badge tone={total === 100 ? "ok" : "danger"}>
            {t("Total")} {num(total)} / 100
          </Badge>
        </div>
        <table className="acct-table acct-rules">
          <thead>
            <tr>
              <th>{t("Rule")}</th>
              <th>{t("Matches and size bands")}</th>
              <th>{t("Weight")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t("Decision-maker title")}</th>
              <td data-label={t("Matches and size bands")}>
                {num(english.length)} {t("English")} · {num(arabic.length)} {t("Arabic")}{" "}
                {t("title keywords. See below.")}
              </td>
              <td data-label={t("Weight")}>
                <WeightInput
                  label={t("Decision-maker title")}
                  value={draft.role.points}
                  disabled={locked}
                  onChange={(v) => setPoints("role", v)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">{t("Company size band")}</th>
              <td data-label={t("Matches and size bands")}>
                <span className="acct-band">
                  <Field label={t("Minimum staff")}>
                    <Input
                      type="number"
                      min={0}
                      value={draft.size.min}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          size: { ...draft.size, min: clamp(e.target.value, 0, 10_000_000) },
                        })
                      }
                    />
                  </Field>
                  <Field label={t("Maximum staff")}>
                    <Input
                      type="number"
                      min={1}
                      value={draft.size.max}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          size: { ...draft.size, max: clamp(e.target.value, 1, 10_000_000) },
                        })
                      }
                    />
                  </Field>
                </span>
              </td>
              <td data-label={t("Weight")}>
                <WeightInput
                  label={t("Company size band")}
                  value={draft.size.points}
                  disabled={locked}
                  onChange={(v) => setPoints("size", v)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">{t("Company website available")}</th>
              <td data-label={t("Matches and size bands")}>
                {t("A website is on record for the company.")}
              </td>
              <td data-label={t("Weight")}>
                <WeightInput
                  label={t("Company website available")}
                  value={draft.website.points}
                  disabled={locked}
                  onChange={(v) => setPoints("website", v)}
                />
              </td>
            </tr>
            <tr>
              <th scope="row">{t("Hiring or funding signal")}</th>
              <td data-label={t("Matches and size bands")}>
                {t("The account is hiring or has recent funding.")}
              </td>
              <td data-label={t("Weight")}>
                <WeightInput
                  label={t("Hiring or funding signal")}
                  value={draft.signal.points}
                  disabled={locked}
                  onChange={(v) => setPoints("signal", v)}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="acct-thresholds">
          <Field label={t("Tier A from")} hint={t("score or higher")}>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.tiers.a}
              disabled={locked}
              onChange={(e) =>
                setDraft({ ...draft, tiers: { ...draft.tiers, a: clamp(e.target.value, 0, 100) } })
              }
            />
          </Field>
          <Field label={t("Tier B from")} hint={t("score or higher")}>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.tiers.b}
              disabled={locked}
              onChange={(e) =>
                setDraft({ ...draft, tiers: { ...draft.tiers, b: clamp(e.target.value, 0, 100) } })
              }
            />
          </Field>
          <Field label={t("Minimum score")} hint={t("Below this an account is disqualified")}>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.minimum}
              disabled={locked}
              onChange={(e) =>
                setDraft({ ...draft, minimum: clamp(e.target.value, 0, 100) })
              }
            />
          </Field>
        </div>
        {problems.length > 0 && (
          <ul className="acct-problems" role="alert">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="acct-card">
        <div className="acct-card-head">
          <h3>{t("Title matching: equal points in English and Arabic")}</h3>
        </div>
        <p className="muted small">
          {t("A title that contains any keyword earns the full title weight, in either language. Arabic spelling variants are matched.")}
        </p>
        <div className="acct-keywords">
          {keywordGroup(t("English"), english, "ltr")}
          {keywordGroup(t("Arabic"), arabic, "rtl")}
        </div>
        {owner && (
          <form
            className="acct-keyword-add"
            onSubmit={(event) => {
              event.preventDefault();
              addKeyword();
            }}
          >
            <Input
              aria-label={t("New title keyword")}
              placeholder={t("New title keyword")}
              dir="auto"
              maxLength={60}
              value={keyword}
              disabled={locked}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button type="submit" disabled={locked || !keyword.trim()}>
              {t("Add keyword")}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

const clamp = (value: string, min: number, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

function WeightInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      className="acct-weight"
      type="number"
      min={0}
      max={100}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
