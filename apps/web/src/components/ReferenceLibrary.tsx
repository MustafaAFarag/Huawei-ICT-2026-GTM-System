"use client";
import { useState } from "react";
import { Button, Check, Field, Input, Panel, Empty } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

export function ReferenceLibrary() {
  const { ws, data, busy, action } = useWorkspace();
  const { t } = usePrefs();
  const [references, setReferences] = useState(
    data.workspace.company.references ?? [],
  );
  const owner = data.role === "owner";
  return (
    <Panel title={t("Reference library")}>
      <p className="muted small">
        {t(
          "Only references with recorded consent can appear in generated messages.",
        )}
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void action(
            () =>
              client.workspace(ws, "", {
                method: "PATCH",
                body: JSON.stringify({ company: { references } }),
              }),
            t("References saved. Existing approvals were invalidated."),
          );
        }}
      >
        {!references.length && (
          <Empty title={t("No references yet")}>
            {t(
              "Add a customer name and record permission before using it as social proof.",
            )}
          </Empty>
        )}
        {references.map((reference, index) => (
          <div className="reference-row" key={index}>
            <Field label={`${t("Reference name")} ${index + 1}`}>
              <Input
                dir="auto"
                value={reference.name}
                maxLength={120}
                required
                disabled={!owner}
                onChange={(e) =>
                  setReferences((rows) =>
                    rows.map((row, i) =>
                      i === index ? { ...row, name: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            <Check
              label={t("Consent recorded")}
              checked={reference.consent}
              disabled={!owner}
              onChange={(e) =>
                setReferences((rows) =>
                  rows.map((row, i) =>
                    i === index ? { ...row, consent: e.target.checked } : row,
                  ),
                )
              }
            />
            <Button
              variant="danger"
              size="sm"
              disabled={!owner || busy}
              onClick={() =>
                setReferences((rows) => rows.filter((_, i) => i !== index))
              }
            >
              {t("Remove")}
            </Button>
          </div>
        ))}
        <div className="button-row">
          <Button
            disabled={!owner || busy || references.length >= 30}
            onClick={() =>
              setReferences((rows) => [...rows, { name: "", consent: false }])
            }
          >
            {t("Add reference")}
          </Button>
          <Button type="submit" variant="primary" disabled={!owner || busy}>
            {t("Save references")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export function SdrKit() {
  const { ws } = useWorkspace();
  const { t } = usePrefs();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  return (
    <Panel title={t("SDR onboarding kit")}>
      <p className="muted small">
        {t(
          "Download the current ICP, approved offers, angles, scoring rubric and outreach rules for a new teammate.",
        )}
      </p>
      <Button
        disabled={working}
        onClick={async () => {
          setWorking(true);
          setError(false);
          try {
            const response = await fetch(`/api/workspaces/${ws}/sdr-kit`);
            if (!response.ok) throw new Error("Download failed");
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = "sdr-onboarding-kit.pdf";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch {
            setError(true);
          } finally {
            setWorking(false);
          }
        }}
      >
        {t(working ? "Preparing PDF…" : "Download SDR kit")}
      </Button>
      {error && (
        <p className="error-text" role="alert">
          {t("Could not prepare the PDF. Try downloading again.")}
        </p>
      )}
    </Panel>
  );
}
