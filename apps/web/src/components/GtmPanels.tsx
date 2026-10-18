"use client";
import { useEffect, useState } from "react";
import { Badge, ErrorState, Panel, Skeleton } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

type Gate = {
  ready: boolean;
  items: { id: string; label: string; ok: boolean; detail?: string }[];
};

export function LaunchGate() {
  const { ws, data } = useWorkspace();
  const { t } = usePrefs();
  const [gate, setGate] = useState<Gate | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setGate(null);
    setError(false);
    void client
      .workspace<Gate>(ws, "/launch-gate", {
        method: "POST",
        body: JSON.stringify({
          draftIds: data.drafts
            .filter((d) => d.approvedVersion === d.version)
            .map((d) => d.id),
        }),
      })
      .then((result) => {
        if (active) setGate(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [ws, data, retry]);
  return (
    <Panel
      title={t("Launch checklist")}
      actions={
        gate && (
          <Badge tone={gate.ready ? "ok" : "warn"}>
            {t(gate.ready ? "Ready" : "Needs attention")}
          </Badge>
        )
      }
    >
      <p className="muted small">
        {t(
          "Checks all approved drafts. The server checks again before preparing sequences.",
        )}
      </p>
      {error ? (
        <ErrorState
          title={t("We couldn’t load the checklist.")}
          message={t("Could not load the checklist. Try again.")}
          onRetry={() => setRetry((v) => v + 1)}
          retryLabel={t("Retry")}
        />
      ) : !gate ? (
        <Skeleton rows={3} />
      ) : (
        <ul className="check-list">
          {gate.items.map((item) => (
            <li key={item.id}>
              <Badge tone={item.ok ? "ok" : "warn"}>
                {t(item.ok ? "Passed" : "Blocked")}
              </Badge>
              <div>
                <span dir="auto">{t(item.label)}</span>
                {item.detail && (
                  <p className="muted small" dir="auto">
                    {item.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
