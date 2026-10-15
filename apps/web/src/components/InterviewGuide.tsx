"use client";
import { useEffect, useRef, useState } from "react";
import type { DiscoveryGuide } from "@revenue/contracts";
import { Button, Field, Select } from "./primitives";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";

export function InterviewGuide({ prospectId }: { prospectId: string }) {
  const { ws } = useWorkspace();
  const { t, language: uiLanguage } = usePrefs();
  const [language, setLanguage] = useState<"en" | "ar">(uiLanguage);
  const [guide, setGuide] = useState<DiscoveryGuide | null>(null);
  const [working, setWorking] = useState<"guide" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [ws, prospectId]);
  const prepare = async (format: "json" | "pdf") => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setWorking(format === "pdf" ? "pdf" : "guide");
    setError("");
    const path = `/prospects/${prospectId}/discovery-guide?language=${language}&format=${format}`;
    try {
      if (format === "json") {
        const result = await client.workspace<DiscoveryGuide>(ws, path, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setGuide(result);
      } else {
        const response = await fetch(`/api/workspaces/${ws}${path}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Could not prepare the PDF. Try downloading again.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `discovery-guide-${language}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      if (!controller.signal.aborted)
        setError(t("Could not prepare the interview guide. Try again."));
    } finally {
      if (!controller.signal.aborted) setWorking(null);
    }
  };
  return (
    <div className="stack">
      <p className="muted">
        {t(
          "Prepare role-specific questions from reviewed context. Answers and scores stay empty until you confirm them.",
        )}
      </p>
      <div className="toolbar">
        <Field label={t("Guide language")}>
          <Select
            aria-label={t("Guide language")}
            value={language}
            disabled={Boolean(working)}
            onChange={(e) => {
              setLanguage(e.target.value as "en" | "ar");
              setGuide(null);
            }}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <Button
          disabled={Boolean(working)}
          onClick={() => void prepare("json")}
        >
          {working === "guide"
            ? t("Preparing guide…")
            : t("Prepare interview guide")}
        </Button>
        <Button disabled={Boolean(working)} onClick={() => void prepare("pdf")}>
          {working === "pdf"
            ? t("Preparing PDF…")
            : t("Download interview PDF")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {guide && (
        <details className="disclosure" open>
          <summary>{t("Interview questions")}</summary>
          <div
            className="stack"
            lang={guide.language}
            dir={guide.language === "ar" ? "rtl" : "ltr"}
          >
            <p>{guide.introduction}</p>
            <p className="small muted">{guide.contextNote}</p>
            <ol>
              {guide.questions.map((q) => (
                <li key={q.id}>
                  <strong>{q.topic}</strong>
                  <p>{q.question}</p>
                  <p className="small muted">{q.answer}</p>
                </li>
              ))}
            </ol>
            <p className="small muted">{guide.completion}</p>
          </div>
        </details>
      )}
    </div>
  );
}
