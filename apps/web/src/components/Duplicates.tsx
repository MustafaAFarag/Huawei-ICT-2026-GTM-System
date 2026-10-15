"use client";
import { useEffect, useState } from "react";
import type { ProspectSnapshot } from "@revenue/contracts";
import { Badge, Button, Empty, Skeleton } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

type Row = {
  id: string;
  snapshot: ProspectSnapshot;
  crmPersonId: string | null;
};

// GAP-02: review near-duplicate groups and keep one record per person.
export function Duplicates() {
  const { ws, canWrite, busy, action } = useWorkspace();
  const { t } = usePrefs();
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
      <div role="alert">
        <p>{t("Could not load duplicates. Try again.")}</p>
        <Button onClick={() => setRetry((v) => v + 1)}>{t("Retry")}</Button>
      </div>
    );
  if (!groups) return <Skeleton rows={4} />;
  if (!groups.length)
    return (
      <Empty title={t("No duplicates found")}>
        {t("Every person appears once in this workspace.")}
      </Empty>
    );
  return (
    <div className="dup-list">
      {groups.map((group) => (
        <div className="dup-group" key={group.map((r) => r.id).join()}>
          <p className="eyebrow">
            {group.length} {t("records look like the same person")}
          </p>
          {group.map((row) => (
            <div className="dup-row" key={row.id}>
              <div>
                <strong dir="auto">
                  {row.snapshot.firstName} {row.snapshot.lastName}
                </strong>
                <p className="muted small">
                  <span dir="auto">{row.snapshot.company}</span> ·{" "}
                  <bdi>{row.snapshot.email || t("no email")}</bdi>
                </p>
              </div>
              {row.crmPersonId && <Badge tone="info">CRM</Badge>}
              <Button
                size="sm"
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
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
