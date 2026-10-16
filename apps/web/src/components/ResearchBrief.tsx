"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Select } from "./primitives";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";

export function ResearchBrief({
  prospectId,
  hasUnsavedChanges,
}: {
  prospectId: string;
  hasUnsavedChanges: boolean;
}) {
  const { ws } = useWorkspace(),
    { t, language: uiLanguage } = usePrefs();
  const [language, setLanguage] = useState<"en" | "ar">(uiLanguage);
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [ws, prospectId]);
  const download = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/workspaces/${ws}/prospects/${prospectId}/research-brief?language=${language}&format=pdf`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("Research brief download failed.");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `research-brief-${language}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted)
        setError(t("Could not export the research brief. Try again."));
    } finally {
      if (!controller.signal.aborted) setWorking(false);
    }
  };
  return (
    <div className="stack">
      <div className="toolbar">
        <Field label={t("Brief language")}>
          <Select
            aria-label={t("Brief language")}
            value={language}
            disabled={working}
            onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <Button
          disabled={working || hasUnsavedChanges}
          onClick={() => void download()}
        >
          {working ? t("Preparing PDF…") : t("Download research brief")}
        </Button>
      </div>
      <p className="small muted">
        {hasUnsavedChanges
          ? t("Save source changes before exporting the research brief.")
          : t(
              "Exports saved research. Facts, hypotheses and unknowns stay separate; source wording keeps its original language.",
            )}
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
    </div>
  );
}
