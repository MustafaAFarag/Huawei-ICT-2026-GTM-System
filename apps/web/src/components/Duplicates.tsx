"use client";
import { useEffect, useState } from "react";
import type { ProspectSnapshot } from "@revenue/contracts";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

type Row = {
  id: string;
  snapshot: ProspectSnapshot;
  crmPersonId: string | null;
};

// GAP-02: review near-duplicate groups side by side and keep one record per person.
// Keeping one excludes the others; nothing is deleted.
export function Duplicates({ onBack }: { onBack?: () => void }) {
  const { ws, canWrite, busy, action } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const [groups, setGroups] = useState<Row[][] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const load = async () => {
    const result = await client.workspace<Row[][]>(ws, "/duplicates");
    setGroups(result);
  };
  useEffect(() => {
    let active = true;
    setGroups(null);
    setError(false);
    void client
      .workspace<Row[][]>(ws, "/duplicates")
      .then((result) => {
        if (active) setGroups(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [ws, retry]);
  if (error)
    return (
      <ErrorState
        title={t("Duplicates could not load")}
        message={t("Could not load duplicates. Try again.")}
        onRetry={() => setRetry((v) => v + 1)}
        retryLabel={t("Retry")}
      />
    );
  if (!groups) return <LoadingState title={t("Loading duplicates…")} rows={3} />;
  if (!groups.length)
    return (
      <EmptyState
        title={t("No duplicates found")}
        text={t("Every person appears once in this workspace.")}
        action={
          onBack && <Button onClick={onBack}>{t("Back to accounts")}</Button>
        }
      />
    );
  return (
    <section className="acct-task" aria-label={t("Review possible duplicates")}>
      <div className="acct-section-head">
        <div>
          <h2>{t("Review possible duplicates")}</h2>
          <p className="muted">
            {t("Compare the records before deciding what to keep.")}
          </p>
        </div>
      </div>
      <div className="acct-dups">
        {groups.map((group) => (
          <div className="acct-dup-group" key={group.map((r) => r.id).join()}>
            <p className="eyebrow">
              {num(group.length)} {t("records look like the same person")}
            </p>
            <div className="acct-dup-cards">
              {group.map((row) => (
                <article className="acct-dup-card" key={row.id}>
                  <header>
                    <h3 dir="auto">
                      {row.snapshot.firstName} {row.snapshot.lastName}
                    </h3>
                    {row.crmPersonId && <Badge tone="info">CRM</Badge>}
                  </header>
                  <p dir="auto">{row.snapshot.company}</p>
                  <p className="muted">
                    <bdi>{row.snapshot.email || t("no email")}</bdi>
                  </p>
                  <Button
                    variant="primary"
                    disabled={!canWrite || busy}
                    onClick={() =>
                      void action(async () => {
                        await client.workspace(ws, "/duplicates/resolve", {
                          method: "POST",
                          body: JSON.stringify({
                            keepId: row.id,
                            dropIds: group
                              .filter((r) => r.id !== row.id)
                              .map((r) => r.id),
                          }),
                        });
                        await load();
                      }, t("Duplicate resolved. The other records were excluded."))
                    }
                  >
                    {t("Keep this one")}
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      {onBack && (
        <div className="button-row">
          <Button onClick={onBack}>{t("Back to accounts")}</Button>
        </div>
      )}
    </section>
  );
}
