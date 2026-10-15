"use client";
import { IconClock } from "@revenue/ui";
import { Badge, Button, Empty, Panel, toneFor } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";

export function Sequences() {
  const { ws, data, canWrite, busy, action } = useWorkspace();
  const { t } = usePrefs();
  if (!data.sequences.length)
    return (
      <Empty title={t("No sequences prepared yet")} icon={<IconClock size={18} />}>
        {t(
          "Approve every touch, run sender pre-flight, and resolve country and consent holds before preparing a sequence.",
        )}
      </Empty>
    );
  return (
    <div className="stack-lg">
      {data.sequences.map((s) => {
        const prospect = data.prospects.find((p) => p.id === s.prospectId);
        return (
          <Panel
            key={s.id}
            eyebrow={
              s.holdout
                ? t("No asset · holdout assignment")
                : t("Asset group assignment")
            }
            title={<span dir="auto">{prospect?.snapshot.company}</span>}
            actions={<Badge tone={toneFor(s.state)}>{s.state}</Badge>}
          >
            <ol className="touch-timeline compact">
              {s.steps.map((step, i) => (
                <li key={i} className="sequence-touch">
                  <span className="touch-marker mono" aria-hidden>
                    {i + 1}
                  </span>
                  <div className="touch-body">
                    <Badge tone={toneFor(step.state)}>
                      {step.channel} · {step.state}
                    </Badge>
                    <p dir="auto">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="button-row">
              {data.fixture && (
                <Button
                  disabled={!canWrite || busy || s.state === "cancelled"}
                  onClick={() =>
                    void action(
                      () =>
                        client.workspace(ws, "/events/simulate", {
                          method: "POST",
                          body: JSON.stringify({
                            id: crypto.randomUUID(),
                            sequenceId: s.id,
                            kind: "replied",
                            occurredAt: new Date().toISOString(),
                          }),
                        }),
                      t(
                        "Simulated reply recorded. Remaining touches across plays are cancelled.",
                      ),
                    )
                  }
                >
                  {t("Record simulated reply")}
                </Button>
              )}
              <Button
                variant="danger"
                disabled={!canWrite || busy}
                onClick={() =>
                  void action(
                    () =>
                      client.workspace(ws, "/suppressions", {
                        method: "POST",
                        body: JSON.stringify({
                          identity: prospect?.snapshot.email,
                          reason: "User-recorded opt-out",
                        }),
                      }),
                    t(
                      "Contact suppressed. Future touches across plays are cancelled.",
                    ),
                  )
                }
              >
                {t("Record opt-out")}
              </Button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
