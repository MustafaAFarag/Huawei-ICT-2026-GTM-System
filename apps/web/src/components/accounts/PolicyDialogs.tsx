"use client";
import { useMemo, useState } from "react";
import { COUNTRIES, type Country } from "@revenue/contracts";
import { IconCheck, IconShieldCheck } from "@revenue/ui";
import { Button, Field, Input, Select, Textarea } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import type { Prospect } from "../../lib/types";
import { Modal } from "./Modal";
import { BASES_FOR, COUNTRY_LABEL, holdText, holdsFor } from "./holds";
import { saveProspect, toIso, toLocalInput } from "./prospect-save";

type Basis = "consent" | "relationship";
const today = () => new Date().toISOString().slice(0, 10);

// Frame v32-05: record who supplied which evidence of the communication basis, and when.
// Sends basisEvidence {type, source, date} with the stored evidence, exclusion and consent
// time; the country is left out so the stored one stays.
export function BasisEvidenceDialog({
  prospect,
  initialType,
  onClose,
  onSaved,
}: {
  prospect: Prospect;
  initialType?: Basis;
  onClose: () => void;
  onSaved?: (updated: Prospect) => void;
}) {
  const { ws, data, userId, canApprove, busy, action } = useWorkspace();
  const { t } = usePrefs();
  const allowed = BASES_FOR(prospect.country) as Basis[];
  const firstAllowed = allowed.includes("relationship") ? "relationship" : "consent";
  const [type, setType] = useState<Basis>(
    initialType && allowed.includes(initialType)
      ? initialType
      : prospect.lawfulBasis === "consent" || prospect.lawfulBasis === "relationship"
        ? (prospect.lawfulBasis as Basis)
        : firstAllowed,
  );
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today);
  const [consentAt, setConsentAt] = useState(
    toLocalInput(prospect.consentAt) || "",
  );
  const [error, setError] = useState("");
  const s = prospect.snapshot;
  const marketingLicence = Boolean(data.workspace.company.marketingLicence);
  const me = data.members.find((m) => m.userId === userId)?.user.name;
  const after = useMemo(
    () =>
      holdsFor(
        {
          ...prospect,
          lawfulBasis: type,
          consentAt: type === "consent" ? toIso(consentAt) : prospect.consentAt,
          basisEvidence: [
            ...(prospect.basisEvidence ?? []),
            { type, source: "", date: "", recordedBy: "", recordedAt: "" },
          ],
        },
        marketingLicence,
      ),
    [prospect, type, consentAt, marketingLicence],
  );
  const valid =
    source.trim().length > 0 &&
    Boolean(date) &&
    (type !== "consent" || Boolean(consentAt));
  const country = prospect.country as Country | null;
  return (
    <Modal
      title={t("Record basis evidence")}
      subtitle={
        <>
          {s.company} · {s.firstName} {s.lastName}
          {country && country in COUNTRY_LABEL
            ? ` · ${t(COUNTRY_LABEL[country])} (${country})`
            : ""}
        </>
      }
      onClose={onClose}
    >
      <form
        className="acct-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          setError("");
          void action(
            async () => {
              try {
                const updated = await saveProspect(ws, prospect, {
                  lawfulBasis: type,
                  ...(type === "consent"
                    ? { consentAt: toIso(consentAt) }
                    : {}),
                  basisEvidence: { type, source: source.trim(), date },
                });
                onSaved?.(updated);
              } catch (e) {
                setError((e as Error).message);
                throw e;
              }
              onClose();
            },
            t("Basis evidence recorded."),
          );
        }}
      >
        <fieldset className="acct-fieldset">
          <legend>{t("Basis type")}</legend>
          <div className="acct-choice-row" role="group" aria-label={t("Basis type")}>
            {(["consent", "relationship"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={type === value}
                disabled={!canApprove || !allowed.includes(value)}
                onClick={() => setType(value)}
              >
                {type === value && <IconCheck size={14} aria-hidden />}
                {value === "consent" ? t("Consent") : t("Relationship")}
              </button>
            ))}
          </div>
          {!allowed.includes("relationship") && (
            <p className="muted small">
              {t("This country accepts recorded consent only.")}
            </p>
          )}
        </fieldset>
        <Field label={t("Source (URL or note)")}>
          <Textarea
            dir="auto"
            rows={3}
            maxLength={500}
            value={source}
            disabled={!canApprove}
            onChange={(event) => setSource(event.target.value)}
          />
        </Field>
        <div className="acct-two">
          <Field label={t("Date")}>
            <Input
              type="date"
              value={date}
              max={today()}
              disabled={!canApprove}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={t("Recorded by")}>
            <Input
              readOnly
              value={`${me ?? "—"} · ${t("automatic")}`}
              aria-readonly
            />
          </Field>
        </div>
        <Field
          label={t("Consent timestamp")}
          hint={
            type === "consent"
              ? undefined
              : t("Required for consent basis only · not needed here")
          }
        >
          <Input
            type="datetime-local"
            value={type === "consent" ? consentAt : ""}
            disabled={!canApprove || type !== "consent"}
            onChange={(event) => setConsentAt(event.target.value)}
          />
        </Field>
        <p
          className={`acct-note ${after.length ? "is-warn" : "is-ok"}`}
          role="status"
        >
          <IconShieldCheck size={16} aria-hidden />
          <span>
            {after.length
              ? `${t("This row stays held:")} ${after
                  .map((hold) => holdText(hold, prospect.country, t))
                  .join(" · ")}`
              : t(
                  "Saving moves this row to Ready (basis evidenced). Sending still waits for a person’s approval.",
                )}
          </span>
        </p>
        {error && (
          <p role="alert" className="error-text small">
            {error}
          </p>
        )}
        {!canApprove && (
          <p className="muted small">
            {t("Only owners and reviewers can record basis evidence.")}
          </p>
        )}
        <div className="acct-modal-actions">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canApprove || busy || !valid}
          >
            {t("Save evidence")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// "Country not set" rows: choose one explicitly. Caravan never assumes Egypt.
export function ChooseCountryDialog({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Prospect;
  onClose: () => void;
  onSaved?: (updated: Prospect) => void;
}) {
  const { ws, canApprove, busy, action } = useWorkspace();
  const { t } = usePrefs();
  const [country, setCountry] = useState<string>(prospect.country ?? "");
  const [error, setError] = useState("");
  const s = prospect.snapshot;
  return (
    <Modal
      title={t("Choose country")}
      subtitle={`${s.company} · ${s.firstName} ${s.lastName}`}
      onClose={onClose}
    >
      <form
        className="acct-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!country) return;
          setError("");
          void action(async () => {
            try {
              const updated = await saveProspect(ws, prospect, { country });
              onSaved?.(updated);
            } catch (e) {
              setError((e as Error).message);
              throw e;
            }
            onClose();
          }, t("Country saved."));
        }}
      >
        <Field
          label={t("Country")}
          hint={t(
            "Only Egypt, Saudi Arabia and the UAE have a reviewed channel rule; other countries stay held.",
          )}
        >
          <Select
            value={country}
            disabled={!canApprove}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">{t("Not set")}</option>
            {COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {t(COUNTRY_LABEL[code])}
              </option>
            ))}
          </Select>
        </Field>
        {error && (
          <p role="alert" className="error-text small">
            {error}
          </p>
        )}
        {!canApprove && (
          <p className="muted small">
            {t("Only owners and reviewers can change the country.")}
          </p>
        )}
        <div className="acct-modal-actions">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canApprove || busy || !country}
          >
            {t("Save country")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
